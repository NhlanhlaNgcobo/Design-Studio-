/* AI background removal, free and in the customer's own browser.
 *
 * For photos and busy backgrounds, where "remove the solid colour" can't work.
 * The model is U²-Net (u2netp, 4.5 MB, Apache-2.0 — free for commercial use)
 * run by onnxruntime-web (MIT). Nothing is uploaded and nothing is charged:
 * the image never leaves the device, and there is no per-image API cost for
 * the shop. Both load only when a customer first asks for it.
 *
 * Licences checked for a product resold to other shops: BRIA RMBG is
 * non-commercial and img.ly's background-removal is AGPL, so neither is used.
 *
 * U²-Net finds the salient subject. It is good on a product, a person or a
 * pet against a background; fine hair and glass are soft. The proof notes
 * that the print shop redoes cut-outs from the original file.
 */

const ORT = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/";
const MODEL = new URL("../vendor/models/u2netp.onnx", import.meta.url).href;
const SIZE = 320;

let ready = null;
function load() {
  ready ??= (async () => {
    const ort = await import(/* @vite-ignore */ ORT + "ort.min.mjs");
    ort.env.wasm.wasmPaths = ORT;
    ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1;
    const session = await ort.InferenceSession.create(MODEL, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
    return { ort, session };
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

/** Whether the model has been downloaded in this visit (the first run is slower). */
export const aiLoaded = () => !!ready;

/**
 * The subject of `src` as an alpha mask the size of `w` × `h`.
 * @returns {Promise<HTMLCanvasElement>} white where the subject is, transparent elsewhere
 */
export async function subjectMask(src, w, h) {
  const { ort, session } = await load();

  // 320 × 320 RGB, normalised the way U²-Net was trained.
  const c = document.createElement("canvas"); c.width = c.height = SIZE;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(src, 0, 0, SIZE, SIZE);
  const px = g.getImageData(0, 0, SIZE, SIZE).data;
  let max = 1;
  for (let i = 0; i < px.length; i += 4) max = Math.max(max, px[i], px[i + 1], px[i + 2]);
  const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225], n = SIZE * SIZE;
  const input = new Float32Array(3 * n);
  for (let p = 0; p < n; p++) for (let ch = 0; ch < 3; ch++) input[ch * n + p] = (px[p * 4 + ch] / max - mean[ch]) / std[ch];

  const out = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, SIZE, SIZE]) });
  const m = out[session.outputNames[0]].data;
  let lo = Infinity, hi = -Infinity;
  for (const v of m) { if (v < lo) lo = v; if (v > hi) hi = v; }

  // Mask at model size, softened a little at the edge, then scaled up smoothly.
  const mc = document.createElement("canvas"); mc.width = mc.height = SIZE;
  const mg = mc.getContext("2d"), md = mg.createImageData(SIZE, SIZE);
  for (let p = 0; p < n; p++) {
    const a = (m[p] - lo) / (hi - lo || 1);
    md.data[p * 4] = md.data[p * 4 + 1] = md.data[p * 4 + 2] = 255;
    md.data[p * 4 + 3] = Math.round(255 * Math.min(1, Math.max(0, (a - 0.12) / 0.76)));
  }
  mg.putImageData(md, 0, 0);
  const big = document.createElement("canvas"); big.width = w; big.height = h;
  const bg = big.getContext("2d");
  bg.imageSmoothingQuality = "high";
  bg.drawImage(mc, 0, 0, w, h);
  return big;
}
