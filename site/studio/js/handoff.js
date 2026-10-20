/* Getting the job to Eminence.
 *
 * WhatsApp is the backbone because it is the one channel that demonstrably
 * works: the site's form discards messages and its email domain has no mail
 * server (audit/AUDIT.md). Every path below ends in a WhatsApp chat with the
 * job written out, so nothing depends on the customer remembering to follow up.
 *
 * With the backend configured (site/api/job.js + S3-compatible storage), the
 * original files, proof and spec are uploaded first and the chat carries a link
 * to the proof. Uploads go STRAIGHT to storage through presigned URLs, because
 * serverless functions cap request bodies at 4.5 MB and large-format artwork
 * is routinely bigger than that.
 *
 * Without it (local, or before storage is set up), the customer saves the proof
 * and spec and the chat says so — slower for Eminence, but nothing is lost.
 */

export const WHATSAPP = "27789356433";
export const EMAIL = "eminenceprinting@gmail.com";

export function whatsappUrl(text) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
}

export function orderMessage({ spec, quoteText, customer, proofUrl, attached }) {
  const lines = [
    `Hi Eminence — I'd like to order from the Design Studio.`,
    ``,
    `Ref: ${spec.ref}`,
    `${spec.quantity} × ${spec.product_name}, ${spec.colour}, ${spec.process}`,
    spec.size_breakdown ? `Sizes: ${Object.entries(spec.size_breakdown).filter(([, n]) => +n > 0).map(([s, n]) => `${s}×${n}`).join(", ")}` : `Size: ${spec.size}`,
    ...spec.surfaces.map((s) => `• ${s.label}: ${s.design_bounds_mm ? `${Math.round(s.design_bounds_mm.width)} × ${Math.round(s.design_bounds_mm.height)} mm` : "design"}`),
    quoteText ? `Studio estimate: ${quoteText}` : "",
    customer?.needBy ? `Needed by: ${customer.needBy}` : "",
    customer?.delivery ? `${customer.delivery}` : "",
    customer?.notes ? `Notes: ${customer.notes}` : "",
    ``,
    proofUrl ? `Proof: ${proofUrl}` : attached ? `I've saved the proof (${spec.ref}-proof.png) and will send it here now.` : "",
    customer?.name ? `— ${customer.name}` : "",
  ];
  return lines.filter((l, i) => l !== "" || (i > 0 && lines[i - 1] !== "")).join("\n").trim();
}

/**
 * Upload the job. Resolves { ok:true, proofUrl } or { ok:false, reason }.
 * Never throws: a failed upload must still leave the customer a way to order.
 */
export async function uploadJob({ spec, proof, specBlob, originals, onProgress = () => {} }) {
  try {
    const files = [
      { id: "proof", name: `${spec.ref}-proof.png`, type: "image/png", size: proof.size, role: "proof", blob: proof },
      { id: "spec", name: `${spec.ref}-spec.json`, type: "application/json", size: specBlob.size, role: "spec", blob: specBlob },
      ...originals.map((a, i) => ({ id: "art" + i, name: a.name, type: a.type || "application/octet-stream", size: a.size, role: "artwork", blob: a.file })),
    ];
    const start = await fetch("/api/job", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "start", ref: spec.ref, spec, files: files.map(({ blob, ...f }) => f) }),
    });
    if (!start.ok) return { ok: false, reason: start.status === 503 ? "not-configured" : `start-${start.status}` };
    const { uploads, token } = await start.json();

    let done = 0;
    const total = files.reduce((a, f) => a + f.size, 0);
    for (const f of files) {
      const u = uploads[f.id];
      if (!u) continue;
      const put = await fetch(u.url, { method: "PUT", headers: u.headers, body: f.blob });
      if (!put.ok) return { ok: false, reason: `upload-${f.id}-${put.status}` };
      done += f.size; onProgress(done / total);
    }

    const fin = await fetch("/api/job", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "complete", ref: spec.ref, token, customer: spec.customer }),
    });
    if (!fin.ok) return { ok: false, reason: `complete-${fin.status}` };
    const j = await fin.json();
    return { ok: true, proofUrl: j.proofUrl };
  } catch (e) {
    return { ok: false, reason: "network" };
  }
}
