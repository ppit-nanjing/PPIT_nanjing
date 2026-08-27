import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const coreDirectory = dirname(require.resolve("tesseract.js-core"));
const language = require("@tesseract.js-data/eng");
const outputDirectory = resolve("public/ocr");

const files = [
  [require.resolve("tesseract.js/dist/worker.min.js"), "worker.min.js"],
  [require.resolve("tesseract.js/dist/worker.min.js.LICENSE.txt"), "worker.LICENSE.txt"],
  [join(coreDirectory, "LICENSE"), "core.LICENSE.txt"],
  [join(coreDirectory, "tesseract-core-lstm.wasm.js"), "core/tesseract-core-lstm.wasm.js"],
  [join(coreDirectory, "tesseract-core-simd-lstm.wasm.js"), "core/tesseract-core-simd-lstm.wasm.js"],
  [
    join(coreDirectory, "tesseract-core-relaxedsimd-lstm.wasm.js"),
    "core/tesseract-core-relaxedsimd-lstm.wasm.js",
  ],
  [join(language.langPath, "eng.traineddata.gz"), "lang/eng.traineddata.gz"],
];

await Promise.all(
  files.map(async ([source, destination]) => {
    const output = join(outputDirectory, destination);
    await mkdir(dirname(output), { recursive: true });
    await copyFile(source, output);
  })
);