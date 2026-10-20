/* Presigned URLs for any S3-compatible store — Cloudflare R2, AWS S3,
 * Backblaze B2 — with no SDK.
 *
 * Why presigned uploads at all: Vercel functions cap a request body at 4.5 MB,
 * and large-format artwork is routinely bigger. The browser PUTs the file
 * straight to storage with a short-lived signed URL; the function only ever
 * handles JSON.
 *
 * AWS Signature Version 4, query-string form, UNSIGNED-PAYLOAD. Verified
 * against AWS's own published example in s3.test.mjs.
 */
import crypto from "node:crypto";

const hmac = (key, s) => crypto.createHmac("sha256", key).update(s, "utf8").digest();
const sha256hex = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex");

/** RFC 3986 encoding as SigV4 wants it: only A–Z a–z 0–9 - _ . ~ left bare. */
export const uriEncode = (s, keepSlash = false) =>
  [...Buffer.from(String(s), "utf8")].map((b) => {
    const c = String.fromCharCode(b);
    if (/[A-Za-z0-9\-_.~]/.test(c) || (keepSlash && c === "/")) return c;
    return "%" + b.toString(16).toUpperCase().padStart(2, "0");
  }).join("");

const amzDate = (d) => d.toISOString().replace(/[:-]|\.\d{3}/g, "");

/**
 * @param {object} o
 *   method, host, path ("/bucket/key" or "/key"), region, accessKeyId,
 *   secretAccessKey, expires (s, ≤ 604800), date (Date), protocol ("https")
 * @returns {string} the presigned URL
 */
export function presign({ method, host, path, region, accessKeyId, secretAccessKey, expires = 900, date = new Date(), protocol = "https", service = "s3" }) {
  const stamp = amzDate(date), day = stamp.slice(0, 8);
  const scope = `${day}/${region}/${service}/aws4_request`;
  const query = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${scope}`,
    "X-Amz-Date": stamp,
    "X-Amz-Expires": String(Math.min(604800, Math.max(1, expires | 0))),
    "X-Amz-SignedHeaders": "host",
  };
  const canonicalQuery = Object.keys(query).sort().map((k) => `${uriEncode(k)}=${uriEncode(query[k])}`).join("&");
  const canonicalUri = uriEncode(path, true);
  const canonical = [method, canonicalUri, canonicalQuery, `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const toSign = ["AWS4-HMAC-SHA256", stamp, scope, sha256hex(canonical)].join("\n");
  let key = hmac("AWS4" + secretAccessKey, day);
  key = hmac(key, region); key = hmac(key, service); key = hmac(key, "aws4_request");
  const sig = crypto.createHmac("sha256", key).update(toSign, "utf8").digest("hex");
  return `${protocol}://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${sig}`;
}

/** Storage config from the environment, or null if it isn't set up. */
export function storageFromEnv(env = process.env) {
  const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) return null;
  const u = new URL(S3_ENDPOINT);
  return { host: u.host, protocol: u.protocol.replace(":", ""), bucket: S3_BUCKET, region: env.S3_REGION || "auto",
    accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY };
}

/** Path-style URL for one object — works on R2, B2 and S3 alike. */
export function objectUrl(cfg, key, method = "GET", expires = 900) {
  return presign({ method, host: cfg.host, protocol: cfg.protocol, path: `/${cfg.bucket}/${key}`, region: cfg.region,
    accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey, expires });
}
