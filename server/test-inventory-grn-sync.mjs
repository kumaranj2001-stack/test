import assert from "node:assert";

async function testInventoryGrnSync() {
  console.log("=== Testing Inventory to GRN Sync and Search Indexing ===");

  const testName = `SyncTest Med ${Date.now()}`;
  const testId = `m_test_${Date.now()}`;

  // 1. Create a master item in Inventory with GRN mode (0 stock, 0 price)
  const createRes = await fetch("http://localhost:3001/api/inventory/medicine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      medicine: {
        id: testId,
        name: testName,
        supplier: "Apex Healthcare",
        stock: 0,
        purchasePrice: 0,
        sellingPrice: 0,
        gst: 12,
        minStock: 10,
      },
      requirePurchaseDetails: false,
    }),
  });

  assert.strictEqual(createRes.status, 201, "Should create master medicine with 201 Created");
  const createJson = await createRes.json();
  assert.strictEqual(createJson.success, true);
  assert.strictEqual(createJson.medicine.name, testName);
  assert.strictEqual(createJson.medicine.stock, 0);
  assert.ok(createJson.medicine.createdAt, "createdAt must be present");
  console.log("✓ Step 1: Master medicine successfully created via API with GRN mode");

  // 2. Search indexing endpoint test
  const searchRes = await fetch(`http://localhost:3001/api/inventory/medicines?q=${encodeURIComponent(testName)}`);
  assert.strictEqual(searchRes.status, 200);
  const searchJson = await searchRes.json();
  assert.strictEqual(searchJson.success, true);
  const found = searchJson.medicines.find((m) => m.name === testName);
  assert.ok(found, "Newly created item must be found via search indexing");
  console.log("✓ Step 2: Newly created item found in search indexing endpoint:", found.name);

  // 3. Clean up
  const delRes = await fetch(`http://localhost:3001/api/inventory/medicine/${testId}`, {
    method: "DELETE",
  });
  assert.strictEqual(delRes.status, 200);
  console.log("✓ Step 3: Test medicine cleaned up successfully");

  console.log("\n==============================================");
  console.log("INVENTORY-GRN SYNC & SEARCH INDEXING PASSED!");
  console.log("==============================================");
}

testInventoryGrnSync().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
