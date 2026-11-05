import test from "node:test";
import assert from "node:assert/strict";
import { customerId } from "../job.js";

test("orders are filed by WhatsApp number and name", () => {
  assert.equal(customerId({ name: "Sipho Dlamini", phone: "082 555 0101" }), "27825550101-sipho-dlamini");
  assert.equal(customerId({ name: "Thandi O'Neill-Mkhize", phone: "+27 (78) 935 6433" }), "27789356433-thandi-oneill-mkhize");
  assert.equal(customerId({ name: "../../etc", phone: "" }), "no-number-etc", "no path tricks in the folder name");
});
