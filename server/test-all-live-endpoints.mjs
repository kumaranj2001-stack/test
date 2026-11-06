import assert from "node:assert";

async function testAllEndpoints() {
  console.log("=== Testing All Live Backend Endpoints on http://localhost:3001 ===");

  // 1. Health
  const healthRes = await fetch("http://localhost:3001/api/health");
  assert.strictEqual(healthRes.status, 200);
  const health = await healthRes.json();
  console.log("✓ GET /api/health passed:", health.status);

  // 2. Staff Plan
  const planRes = await fetch("http://localhost:3001/api/staff-plan");
  assert.strictEqual(planRes.status, 200);
  const plan = await planRes.json();
  assert.strictEqual(plan.staffPlan, 5);
  console.log("✓ GET /api/staff-plan passed (Tier 5 active)");

  // 3. Billing calculate
  const billRes = await fetch("http://localhost:3001/api/billing/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ price: 100, qty: 2 }],
      discountType: "percent",
      discountValue: 10,
    }),
  });
  assert.strictEqual(billRes.status, 200);
  const bill = await billRes.json();
  assert.strictEqual(bill.total, 180);
  console.log("✓ POST /api/billing/calculate passed (180 total)");

  // 4. Audit Log (GET & POST)
  const auditEntry = {
    id: `test_audit_${Date.now()}`,
    user: "test-runner",
    action: "SYSTEM_CHECK",
    details: "Automated verification test",
    timestamp: new Date().toISOString(),
  };
  const postAuditRes = await fetch("http://localhost:3001/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(auditEntry),
  });
  assert.strictEqual(postAuditRes.status, 201);
  console.log("✓ POST /api/audit passed");

  const getAuditRes = await fetch("http://localhost:3001/api/audit");
  assert.strictEqual(getAuditRes.status, 200);
  const audits = await getAuditRes.json();
  console.log("✓ GET /api/audit passed, count:", audits.count);

  // 5. Suppliers (POST, GET, DELETE)
  const testSupId = `sup_test_${Date.now()}`;
  const supPost = await fetch("http://localhost:3001/api/suppliers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: testSupId,
      name: "Test Pharma Ltd",
      contact: "9876543210",
      email: "test@pharma.com",
    }),
  });
  assert.strictEqual(supPost.status, 201);
  console.log("✓ POST /api/suppliers passed");

  const supGet = await fetch("http://localhost:3001/api/suppliers");
  assert.strictEqual(supGet.status, 200);
  const supList = await supGet.json();
  console.log("✓ GET /api/suppliers passed, count:", supList.count);

  const supDel = await fetch(`http://localhost:3001/api/suppliers/${testSupId}`, {
    method: "DELETE",
  });
  assert.strictEqual(supDel.status, 200);
  console.log("✓ DELETE /api/suppliers/:id passed");

  // 6. Patients (POST, GET, DELETE)
  const testPatientId = `pat_test_${Date.now()}`;
  const patPost = await fetch("http://localhost:3001/api/patients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: testPatientId,
      name: "John Doe",
      phone: "9123456780",
    }),
  });
  assert.strictEqual(patPost.status, 201);
  console.log("✓ POST /api/patients passed");

  const patGet = await fetch("http://localhost:3001/api/patients");
  assert.strictEqual(patGet.status, 200);
  console.log("✓ GET /api/patients passed");

  const patDel = await fetch(`http://localhost:3001/api/patients/${testPatientId}`, {
    method: "DELETE",
  });
  assert.strictEqual(patDel.status, 200);
  console.log("✓ DELETE /api/patients/:id passed");

  // 7. Invoices (POST, GET, DELETE)
  const testInvId = `inv_test_${Date.now()}`;
  const invPost = await fetch("http://localhost:3001/api/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: testInvId,
      number: "INV-TEST-01",
      patientName: "John Doe",
      date: new Date().toISOString(),
      items: [{ medicineId: "m1", name: "Paracetamol", qty: 1, price: 10, total: 10 }],
      subtotal: 10,
      total: 10,
      createdBy: "test",
    }),
  });
  assert.strictEqual(invPost.status, 201);
  console.log("✓ POST /api/invoices passed");

  const invGet = await fetch("http://localhost:3001/api/invoices");
  assert.strictEqual(invGet.status, 200);
  console.log("✓ GET /api/invoices passed");

  const invDel = await fetch(`http://localhost:3001/api/invoices/${testInvId}`, {
    method: "DELETE",
  });
  assert.strictEqual(invDel.status, 200);
  console.log("✓ DELETE /api/invoices/:id passed");

  console.log("\n==============================================");
  console.log("ALL LIVE BACKEND ENDPOINTS VERIFIED & WORKING!");
  console.log("==============================================");
}

testAllEndpoints().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
