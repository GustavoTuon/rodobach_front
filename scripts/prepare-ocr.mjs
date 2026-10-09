import { mkdir, readdir, copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "public/ocr");
await mkdir(target, {recursive:true});
const tesseract = path.dirname(require.resolve("tesseract.js/package.json"));
const core = path.dirname(require.resolve("tesseract.js-core/package.json"));
const language = path.dirname(require.resolve("@tesseract.js-data/por/package.json"));
await copyFile(path.join(tesseract,"dist/worker.min.js"),path.join(target,"worker.min.js"));
for (const file of await readdir(core)) {
  if (file.endsWith(".wasm") || file.endsWith(".wasm.js") || file === "LICENSE") await copyFile(path.join(core,file),path.join(target,file));
}
await copyFile(path.join(language,"4.0.0/por.traineddata.gz"),path.join(target,"por.traineddata.gz"));
await copyFile(path.join(tesseract,"LICENSE.md"),path.join(target,"TESSERACT-LICENSE"));
console.log("OCR local: worker, motor e idioma preparados.");
