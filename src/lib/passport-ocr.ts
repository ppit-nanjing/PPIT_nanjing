import { createWorker, OEM, PSM, type Worker } from "tesseract.js";
import { parsePassportMrz, type PassportMrzResult } from "@/lib/mrz";

let workerPromise: Promise<Worker> | null = null;
let reportWorkerProgress: ((progress: number) => void) | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("eng", OEM.LSTM_ONLY, {
      corePath: "/ocr/core",
      langPath: "/ocr/lang",
      workerPath: "/ocr/worker.min.js",
      workerBlobURL: false,
      logger: ({ progress }) => reportWorkerProgress?.(progress),
    }, {
      load_bigram_dawg: "0",
      load_freq_dawg: "0",
      load_number_dawg: "0",
      load_punc_dawg: "0",
      load_system_dawg: "0",
      load_unambig_dawg: "0",
    })
      .then(async (worker) => {
        await worker.setParameters({
          preserve_interword_spaces: "1",
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
          tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
          user_defined_dpi: "300",
        });
        return worker;
      })
      .catch((error) => {
        workerPromise = null;
        throw error;
      });
  }
  return workerPromise;
}

async function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not prepare passport image"))),
      "image/png"
    );
  });
}

async function prepareMrzCrop(file: File, heightFraction: number, binary: boolean): Promise<Blob> {
  const decoded = await createImageBitmap(file, { imageOrientation: "from-image" });
  const targetWidth = Math.round(decoded.width * Math.min(3, Math.max(0.5, 1800 / decoded.width)));

  // Firefox downscales drawImage with a bilinear filter only (it does not
  // support imageSmoothingQuality), which blurs the thin MRZ strokes and
  // breaks OCR on photos wider than 1800px - Chromium uses a high-quality
  // resampler, which is why the same photo only failed on Firefox desktop.
  // createImageBitmap with resize options goes through a high-quality
  // resampler in every browser that supports it (Firefox 98+, Chrome 54+,
  // Safari 15+), so the downscale is delegated to it.
  let bitmap = decoded;
  let scale = 1;
  if (targetWidth < decoded.width) {
    try {
      bitmap = await createImageBitmap(decoded, {
        resizeWidth: targetWidth,
        resizeHeight: Math.round(decoded.height * (targetWidth / decoded.width)),
        resizeQuality: "high",
      });
      decoded.close();
    } catch {
      // Older browsers without resize option support: let drawImage perform
      // the downscale as before.
      bitmap = decoded;
      scale = targetWidth / decoded.width;
    }
  } else {
    scale = Math.min(3, targetWidth / decoded.width);
  }

  try {
    const sourceY = Math.floor(bitmap.height * (1 - heightFraction));
    const sourceHeight = bitmap.height - sourceY;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(sourceHeight * scale);
    const context = canvas.getContext("2d", { willReadFrequently: binary });
    if (!context) throw new Error("Canvas is unavailable");

    // Safari diam-diam mengabaikan ctx.filter - deteksi dukungan supaya
    // preprocessing grayscale+contrast tetap berjalan di iOS, dengan fallback
    // pixel manual bila tidak didukung.
    const supportsFilters = typeof context.filter === "string";
    if (supportsFilters) {
      context.filter = "grayscale(1) contrast(1.8)";
    }
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      bitmap,
      0,
      sourceY,
      bitmap.width,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );

    if (!supportsFilters) {
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = image.data;
      for (let index = 0; index < data.length; index += 4) {
        const luminance =
          0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
        const value = Math.min(255, Math.max(0, (luminance - 128) * 1.8 + 128));
        data[index] = data[index + 1] = data[index + 2] = value;
      }
      context.putImageData(image, 0, 0);
    }

    if (binary) {
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let index = 0; index < image.data.length; index += 4) {
        const value = image.data[index] < 170 ? 0 : 255;
        image.data[index] = value;
        image.data[index + 1] = value;
        image.data[index + 2] = value;
      }
      context.putImageData(image, 0, 0);
    }

    return await canvasBlob(canvas);
  } finally {
    bitmap.close();
  }
}

export async function scanPassportImage(
  file: File,
  onProgress: (progress: number) => void
): Promise<PassportMrzResult | null> {
  if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) return null;

  const worker = await getWorker();
  const attempts = [
    { heightFraction: 0.52, binary: false },
    { heightFraction: 0.32, binary: true },
  ];

  try {
    for (let attempt = 0; attempt < attempts.length; attempt++) {
      reportWorkerProgress = (progress) => onProgress((attempt + progress) / attempts.length);
      const image = await prepareMrzCrop(file, attempts[attempt].heightFraction, attempts[attempt].binary);
      const { data } = await worker.recognize(image, { rotateAuto: true });
      const parsed = parsePassportMrz(data.text);
      if (parsed) {
        onProgress(1);
        return parsed;
      }
    }
    return null;
  } finally {
    reportWorkerProgress = null;
  }
}
