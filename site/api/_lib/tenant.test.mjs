import test from "node:test";
import assert from "node:assert/strict";
import { tenantFor, adminPassword, storagePrefix, inboxOf } from "./tenant.js";

test("shops come from studio/tenants, with the default when none is asked for", async () => {
  assert.equal((await tenantFor()).id, "eminence");
  assert.equal((await tenantFor("demo")).name, "Northside Print Co.");
  assert.equal(await tenantFor("no-such-shop"), null);
  assert.equal(await tenantFor("../../etc/passwd"), null, "ids can't reach outside the folder");
});

test("each shop has its own password, storage and inbox", async () => {
  const env = { STUDIO_ADMIN_PASSWORD: "main", STUDIO_ADMIN_PASSWORDS: '{"demo":"north"}' };
  const em = await tenantFor("eminence"), demo = await tenantFor("demo");
  assert.equal(adminPassword(em, env), "main");
  assert.equal(adminPassword(demo, env), "north");
  assert.equal(adminPassword(demo, { STUDIO_ADMIN_PASSWORD: "main" }), null, "the default password never opens another shop");
  assert.equal(storagePrefix(demo), "tenants/demo");
  assert.equal(inboxOf(demo), "orders@example.com");
});
