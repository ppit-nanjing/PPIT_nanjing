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
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const sourceY = Math.floor(bitmap.height * (1 - heightFraction));
    const sourceHeight = bitmap.height - sourceY;
    const scale = Math.min(3, Math.max(0.5, 1800 / bitmap.width));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(sourceHeight * scale);
    const context = canvas.getContext("2d", { willReadFrequently: binary });
    if (!context) throw new Error("Canvas is unavailable");

    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.filter = "grayscale(1) contrast(1.8)";
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