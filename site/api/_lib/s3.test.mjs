// node --test site/api/_lib/
import test from "node:test";
import assert from "node:assert/strict";
import { presign, uriEncode } from "./s3.js";
import { signToken, readToken, sniff } from "./guard.js";

test("presign matches AWS's published SigV4 example", () => {
  // docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
  const url = presign({
    method: "GET", host: "examplebucket.s3.amazonaws.com", path: "/test.txt", region: "us-east-1",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    expires: 86400, date: new Date("2013-05-24T00:00:00Z"),
  });
  assert.match(url, /X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404$/);
  assert.match(url, /X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request/);
});

test("uriEncode keeps slashes only when asked and encodes spaces as %20", () => {
  assert.equal(uriEncode("a b/c"), "a%20b%2Fc");
  assert.equal(uriEncode("a b/c", true), "a%20b/c");
  assert.equal(uriEncode("é"), "%C3%A9");
});

test("job tokens round-trip and reject tampering and expiry", () => {
  const t = signToken({ ref: "EP-261020-ABC", keys: ["x"] }, "secret", 60);
  assert.equal(readToken(t, "secret").ref, "EP-261020-ABC");
  assert.equal(readToken(t, "other"), null);
  assert.equal(readToken(t.replace(/.$/, (c) => (c === "A" ? "B" : "A")), "secret"), null);
  assert.equal(readToken(signToken({ ref: "x" }, "secret", -1), "secret"), null);
});

test("sniff identifies files by content, not by name", () => {
  assert.equal(sniff(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "png");
  assert.equal(sniff(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), "jpg");
  assert.equal(sniff(Buffer.from("%PDF-1.7")), "pdf");
  assert.equal(sniff(Buffer.from("<?xml version='1.0'?><svg")), "svg");
  assert.equal(sniff(Buffer.from("%!PS-Adobe-3.0 EPSF")), "eps");
  assert.equal(sniff(Buffer.from("MZ\x90\x00")), null);           // an .exe renamed .png
});
