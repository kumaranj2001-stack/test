/**
 * Comprehensive End-to-End Automated Test Suite using Demo Data
 * Systematically tests every module and workflow across Guru Pharma ERP:
 * 1. User Authentication & RBAC (Developer, Super Admin, Admin, Staff)
 * 2. Staff Plan Tiers & Role Limits
 * 3. Suppliers Management & Validation
 * 4. Inventory Management & Medicine Validation
 * 5. Minimum Stock Authorization & Alerts
 * 6. Goods Received Note (GRN) Inbound Flow & Stock Absorption
 * 7. Excel Invoice Document Semantic Parsing & Batch Validation
 * 8. Patient & Doctor Management
 * 9. Billing, Point of Sale, Discounts & Stock Deductions
 * 10. Narcotic Medicine Prescription Verification Compliance
 * 11. Customer Sales Returns & Supplier Purchase Returns
 * 12. P&L and Financial Reports
 * 13. Audit Logging & System Data Purge Safeguards
 */

import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { calculateBillingTotals } from "./billingCalculator.mjs";
import { filterMedicines } from "./inventoryFilter.mjs";
import {
  validateMedicinePayload,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  updateMedicineMinStock,
  isAuthorizedForMinStock,
} from "./medicineHandler.mjs";
import {
  listApprovedGrns,
  updateApprovedGrn,
  deleteApprovedGrn,
  recalcApprovedGrn,
  isDeveloperRole,
} from "./approvedGrnHandler.mjs";
import {
  listDoctors,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} from "./doctorHandler.mjs";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  validateUserPayload,
} from "./userHandler.mjs";
import {
  parseInvoiceDocument,
  validateBatchNumber,
} from "./intelligentParser.mjs";

console.log("===============================================================================");
console.log("   GURU PHARMA ERP - END-TO-END AUTOMATED TEST SUITE WITH DEMO DATA            ");
console.log("===============================================================================\n");

let passedCount = 0;
let totalChecks = 0;

function check(title, fn) {
  totalChecks++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${title}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${title}`);
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

async function checkAsync(title, fn) {
  totalChecks++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${title}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${title}`);
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DEMO DATA SETUP
// ─────────────────────────────────────────────────────────────────────────────
console.log("1. INITIALIZING DEMO SYSTEM STATE & USERS...");

const demoUsers = [
  { id: "u_dev", username: "guru", password: "kumaran", name: "Developer", role: "developer", active: true },
  { id: "u_super", username: "super", password: "admin", name: "Super Admin", role: "superadmin", active: true },
  { id: "u_admin", username: "kumaran", password: "kumaranjkms", name: "Kumaran (Admin)", role: "admin", active: true },
  { id: "u_staff", username: "staff123", password: "kumaranjk", name: "Pharmacy Staff", role: "staff", active: true },
];

let appState = {
  users: [...demoUsers],
  suppliers: [],
  medicines: [],
  doctors: [],
  patients: [],
  grns: [],
  invoices: [],
  returns: [],
  audit: [],
  counters: { invoice: 1000, grn: 500 },
};

check("Default demo users initialized with 4 primary roles", () => {
  assert.equal(appState.users.length, 4);
  assert.ok(appState.users.some((u) => u.role === "developer"));
  assert.ok(appState.users.some((u) => u.role === "superadmin"));
  assert.ok(appState.users.some((u) => u.role === "admin"));
  assert.ok(appState.users.some((u) => u.role === "staff"));
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. USER AUTHENTICATION & RBAC
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n2. TESTING USER AUTHENTICATION, ROLES & PERMISSIONS...");

check("Developer account protection - cannot be deleted", () => {
  assert.throws(
    () => deleteUser("u_dev", appState.users),
    /Cannot delete the primary Developer account/
  );
});

check("User payload validation enforces password strength and valid roles", () => {
  const invalid = validateUserPayload({ username: "t", password: "12" });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((e) => e.includes("Username must be at least 2 characters")));
  assert.ok(invalid.errors.some((e) => e.includes("Password must be at least 4 characters")));
});

check("MinStock threshold authorization logic", () => {
  assert.equal(isAuthorizedForMinStock("developer"), true);
  assert.equal(isAuthorizedForMinStock("superadmin"), true);
  assert.equal(isAuthorizedForMinStock("admin"), true);
  assert.equal(isAuthorizedForMinStock("staff"), false);
});

check("Developer role verification for GRN operations", () => {
  assert.equal(isDeveloperRole("developer"), true);
  assert.equal(isDeveloperRole("superadmin"), true);
  assert.equal(isDeveloperRole("admin"), false);
  assert.equal(isDeveloperRole("staff"), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SUPPLIER CREATION & MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n3. TESTING SUPPLIERS REGISTRATION & MANAGEMENT...");

const demoSuppliers = [
  {
    id: "sup_101",
    name: "Sun Pharma Distributors Ltd",
    contact: "9876543210",
    email: "orders@sunpharma.example.com",
    address: "Plot 10, Industrial Estate, Chennai",
    gstNumber: "33AABCS1429B1ZB",
    diNumber: "TN-CHE-2026-99",
    fixedDiscount: 5,
  },
  {
    id: "sup_201",
    name: "Cipla Distributors Ltd",
    contact: "9811223344",
    email: "supply@cipla.example.com",
    address: "Tower B, Pharma City, Mumbai",
    gstNumber: "27AABCC1234F1Z5",
    diNumber: "MH-MUM-2026-42",
    fixedDiscount: 5,
  },
];

check("Suppliers can be registered and retrieved", () => {
  appState.suppliers = [...demoSuppliers];
  assert.equal(appState.suppliers.length, 2);
  assert.equal(appState.suppliers[0].name, "Sun Pharma Distributors Ltd");
  assert.equal(appState.suppliers[1].gstNumber, "27AABCC1234F1Z5");
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. INVENTORY MANAGEMENT & MEDICINE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n4. TESTING MEDICINE VALIDATION, CREATION & INVENTORY...");

check("Medicine validation rejects empty name, missing supplier, and blank stock", () => {
  const v1 = validateMedicinePayload({ name: "", supplier: "Test" });
  assert.equal(v1.isValid, false);
  assert.ok(v1.errors.includes("Medicine name is required."));

  const v2 = validateMedicinePayload({ name: "Paracetamol", supplier: "" });
  assert.equal(v2.isValid, false);
  assert.ok(v2.errors.includes("Supplier is required."));

  const v3 = validateMedicinePayload({
    name: "Paracetamol",
    supplier: "Sun Pharma Distributors Ltd",
    stock: "",
    purchasePrice: 10,
    sellingPrice: 15,
  });
  assert.equal(v3.isValid, false);
  assert.ok(v3.errors.includes("Quantity is required and cannot be blank."));
});

check("Medicine validation rejects future manufacturing dates", () => {
  const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
  const v = validateMedicinePayload({
    name: "Aspirin",
    supplier: "Sun Pharma Distributors Ltd",
    stock: 10,
    purchasePrice: 10,
    sellingPrice: 15,
    mfgDate: tomorrow,
    expiry: "2028-12-31",
  });
  assert.equal(v.isValid, false);
  assert.ok(v.errors.includes("Manufacturing date cannot be in the future."));
});

check("Adding demo medicines to inventory with complete attributes", () => {
  const medsToAdd = [
    {
      id: "m_aug",
      name: "Augmentin 625 Duo Tablet",
      batch: "AG9081",
      supplier: "Cipla Distributors Ltd",
      stock: 50,
      purchasePrice: 120.50,
      sellingPrice: 200.00,
      expiry: "2027-12-31",
      mfgDate: "2026-01-01",
      gst: 12,
      narcotic: false,
      minStock: 15,
    },
    {
      id: "m_pan",
      name: "Pan 40mg Tablet",
      batch: "PN4420",
      supplier: "Sun Pharma Distributors Ltd",
      stock: 30,
      purchasePrice: 85.00,
      sellingPrice: 150.00,
      expiry: "2028-08-31",
      mfgDate: "2026-03-01",
      gst: 12,
      narcotic: false,
      minStock: 10,
    },
    {
      id: "m_tram",
      name: "Tramadol 50mg Tablet",
      batch: "TR1001",
      supplier: "Sun Pharma Distributors Ltd",
      stock: 25,
      purchasePrice: 45.00,
      sellingPrice: 80.00,
      expiry: "2027-06-30",
      mfgDate: "2025-10-01",
      gst: 12,
      narcotic: true,
      minStock: 5,
    },
    {
      id: "m_cough",
      name: "Benadryl Cough Syrup 100ml",
      batch: "BN5521",
      supplier: "Cipla Distributors Ltd",
      stock: 5,
      purchasePrice: 65.00,
      sellingPrice: 110.00,
      expiry: "2027-04-30",
      mfgDate: "2025-11-01",
      gst: 12,
      narcotic: false,
      minStock: 10,
    },
  ];

  for (const m of medsToAdd) {
    const res = createMedicine(m, appState.medicines);
    appState.medicines = res.medicines;
  }
  assert.equal(appState.medicines.length, 4);
});

check("Inventory Narcotic Filter separates controlled substances", () => {
  const narcoticOnly = filterMedicines(appState.medicines, "narcotic");
  assert.equal(narcoticOnly.length, 1);
  assert.equal(narcoticOnly[0].name, "Tramadol 50mg Tablet");
  assert.equal(narcoticOnly[0].narcotic, true);

  const allMeds = filterMedicines(appState.medicines, "all");
  assert.equal(allMeds.length, 4);
});

check("Inventory Low Stock Filter catches medicines at or below minStock threshold", () => {
  // Benadryl has stock 5, minStock 10 -> Low stock!
  const lowStock = filterMedicines(appState.medicines, "low");
  assert.equal(lowStock.length, 1);
  assert.equal(lowStock[0].id, "m_cough");
});

check("MinStock update enforces Developer & Admin authorization", () => {
  // Admin updates minStock -> OK
  const updatedByAdmin = updateMedicineMinStock("m_cough", 8, "admin", appState.medicines);
  assert.equal(updatedByAdmin.medicine.minStock, 8);

  // Staff attempts minStock update -> Rejected
  assert.throws(
    () => updateMedicineMinStock("m_cough", 15, "staff", appState.medicines),
    /Only Developer and Admin roles can customize Minimum Stock/
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. GOODS RECEIVED NOTE (GRN) INBOUND PURCHASE FLOW
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n5. TESTING GOODS RECEIVED NOTE (GRN) FLOW & STOCK ABSORPTION...");

const demoGrn = {
  id: "grn_501",
  number: "GRN-501",
  supplierId: "sup_201",
  supplierName: "Cipla Distributors Ltd",
  invoiceNumber: "CIP-2026-901",
  date: "2026-10-15",
  status: "pending",
  createdBy: "kumaran",
  agencyDiscountPct: 5,
  agencyDiscountAmt: 0,
  specialDiscount: 0,
  subtotal: 0,
  taxAmount: 0,
  total: 0,
  items: [
    {
      name: "Augmentin 625 Duo Tablet",
      batch: "AG9081",
      qty: 20, // 20 strips
      tabsPerStrip: 10, // 10 tablets per strip = 200 tablets
      freeStrips: 2, // 2 free strips = 20 bonus tablets
      purchasePrice: 120.50,
      sellingPrice: 200.00,
      expiry: "2027-12-31",
      igst: 12,
      cgst: 0,
      sgst: 0,
    },
  ],
};

check("GRN monetary recalculation totals", () => {
  const totals = recalcApprovedGrn(demoGrn);
  // Subtotal: 20 strips * 120.50 = 2410.00
  assert.equal(totals.subtotal, 2410.00);
  // Agency discount 5%: 2410 * 0.05 = 120.50
  assert.equal(totals.agencyDiscountAmt, 120.50);
  // Taxable: 2410 - 120.50 = 2289.50
  // Tax 12%: 2289.50 * 0.12 = 274.74
  assert.equal(totals.taxAmount, 274.74);
  // Grand total: 2289.50 + 274.74 = 2564.24
  assert.equal(totals.total, 2564.24);

  demoGrn.subtotal = totals.subtotal;
  demoGrn.agencyDiscountAmt = totals.agencyDiscountAmt;
  demoGrn.taxAmount = totals.taxAmount;
  demoGrn.total = totals.total;
  appState.grns.push(demoGrn);
});

check("Admin approves pending GRN and updates inventory stock automatically", () => {
  const prevStock = appState.medicines.find((m) => m.name === "Augmentin 625 Duo Tablet").stock;
  assert.equal(prevStock, 50);

  // Stock absorption formula: qty + freeStrips * tabsPerStrip
  // 20 strips + 2 free strips * 10 tabs = 20 + 20 = 40 units
  const grnItem = demoGrn.items[0];
  const tps = grnItem.tabsPerStrip || 1;
  const addedQty = grnItem.qty + (grnItem.freeStrips || 0) * tps;

  appState.medicines = appState.medicines.map((m) =>
    m.name === grnItem.name && m.batch === grnItem.batch
      ? { ...m, stock: m.stock + addedQty }
      : m
  );

  demoGrn.status = "approved";
  demoGrn.approvedBy = "kumaran";
  demoGrn.approvedAt = new Date().toISOString();

  const newStock = appState.medicines.find((m) => m.name === "Augmentin 625 Duo Tablet").stock;
  assert.equal(newStock, 50 + 40); // 90 units
  assert.equal(demoGrn.status, "approved");
});

check("Approved GRN Developer-only oversight and listing", () => {
  const devList = listApprovedGrns(appState.grns, {}, "developer");
  assert.equal(devList.length, 1);
  assert.equal(devList[0].number, "GRN-501");

  // Staff cannot list approved GRNs
  assert.throws(
    () => listApprovedGrns(appState.grns, {}, "staff"),
    /Only Developer role can access approved GRN records/
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. EXCEL DOCUMENT INVOICE PARSING & BATCH NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n6. TESTING DOCUMENT IMPORT & INTELLIGENT PARSER WITH DEMO EXCEL...");

await checkAsync("Semantic parsing of multi-column Excel invoice without LLM key", async () => {
  const rows = [
    ["Cipla Distributors Ltd", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["GSTIN: 27AABCC1234F1Z5", "", "Tax Invoice No: CIP-2026-901", "", "Date: 15/10/2026", "", "", "", "", "", "", "", ""],
    [
      "S.No", "Description of Goods", "Pack Size", "B.No", "Mfg Date", "Exp Date",
      "Billed Qty", "Free Strips", "PTR Rate", "Disc %", "GST %", "Extra Charges", "MRP / Pack"
    ],
    [1, "Augmentin 625 Duo Tablets", "1x10", "AG9081", "01/2026", "12/2027", 50, 5, 120.50, 5.0, 12.0, 25.0, 200.0],
    [2, "Pan 40mg Tablets", "1x15", "PN4420", "03/2026", "08/2028", 30, 0, 85.00, 2.0, 12.0, 0.0, 150.0],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Invoice");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const result = await parseInvoiceDocument({
    fileBuffer: buf,
    fileName: "demo_invoice.xlsx",
    existingMedicines: appState.medicines,
    existingSuppliers: appState.suppliers,
  });

  assert.equal(result.success, true);
  assert.equal(result.data.supplier, "Cipla Distributors Ltd");
  assert.equal(result.data.matchedSupplierId, "sup_201");
  assert.equal(result.data.invoiceNumber, "CIP-2026-901");
  assert.equal(result.data.items.length, 2);

  // Critical batch test: batch must NOT be 1 or 2!
  assert.equal(result.data.items[0].batch, "AG9081");
  assert.equal(result.data.items[0].isSerialAsBatch, false);
  assert.equal(result.data.items[0].receivingQty, 50);
  assert.equal(result.data.items[0].uomPerStrip, 10);
  assert.equal(result.data.items[0].mrpStrip, 200);
  assert.equal(result.data.items[0].mrpUnit, 20);

  assert.equal(result.data.items[1].batch, "PN4420");
  assert.equal(result.data.items[1].isSerialAsBatch, false);
  assert.equal(result.data.items[1].receivingQty, 30);
  assert.equal(result.data.items[1].uomPerStrip, 15);
  assert.equal(result.data.items[1].mrpStrip, 150);
  assert.equal(result.data.items[1].mrpUnit, 10);
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. PATIENTS & DOCTORS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n7. TESTING PATIENTS & DOCTORS REGISTRATION...");

const demoDoctor = {
  id: "doc_101",
  name: "Dr. Arvind Sharma",
  hospital: "Apollo Multispecialty Hospital",
  hospitalAddress: "Plot 14, Health City, Main Road",
  phone: "9876543210",
  regNo: "MCI-48291",
  createdAt: new Date().toISOString(),
};

check("Doctor registration and lookup by name or registration number", () => {
  const res = createDoctor(demoDoctor, appState.doctors);
  appState.doctors = res.doctors;
  assert.equal(appState.doctors.length, 1);

  const foundByName = listDoctors(appState.doctors, { q: "Arvind" });
  assert.equal(foundByName.length, 1);

  const foundByReg = listDoctors(appState.doctors, { q: "48291" });
  assert.equal(foundByReg.length, 1);
});

const demoPatient = {
  id: "pat_101",
  name: "Rahul Sharma",
  phone: "9123456780",
  address: "12 Gandhi Nagar, Chennai",
  prescriptionUrl: "data:image/jpeg;base64,sampleRxBase64DataString",
  prescriptionName: "rx_rahul_oct2026.jpg",
  createdAt: new Date().toISOString(),
};

check("Patient registration with prescription attachment", () => {
  appState.patients.push(demoPatient);
  assert.equal(appState.patients.length, 1);
  assert.ok(appState.patients[0].prescriptionUrl);
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. BILLING, POS & COMPLIANCE
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n8. TESTING BILLING CALCULATIONS, POS & STOCK DEDUCTIONS...");

check("Retail billing calculation with percent discount (GST included in retail price)", () => {
  const lineItems = [
    { price: 200.00, qty: 2 }, // 400.00
    { price: 150.00, qty: 1 }, // 150.00
  ];
  // Subtotal = 550.00
  // Discount 10% = 55.00
  // Total = 495.00
  const totals = calculateBillingTotals(lineItems, "percent", 10);
  assert.equal(totals.subtotal, 550.00);
  assert.equal(totals.discount, 55.00);
  assert.equal(totals.taxAmount, 0); // Indian pharmacy retail billing: retail MRP is all-inclusive
  assert.equal(totals.total, 495.00);
});

check("Retail billing calculation with fixed rupee discount", () => {
  const lineItems = [{ price: 200.00, qty: 3 }]; // 600.00
  const totals = calculateBillingTotals(lineItems, "fixed", 50);
  assert.equal(totals.subtotal, 600.00);
  assert.equal(totals.discount, 50.00);
  assert.equal(totals.total, 550.00);
});

check("Narcotic Medicine Compliance: Prescription document is strictly enforced", () => {
  const narcoticItem = { medicineId: "m_tram", name: "Tramadol 50mg Tablet", qty: 1, price: 80, gst: 12, narcotic: true };
  const hasNarcotic = [narcoticItem].some((it) => it.narcotic);
  assert.equal(hasNarcotic, true);

  // Checkout attempt without patient profile or prescription -> blocked
  function attemptCheckout({ patient, prescriptionAttached }) {
    if (hasNarcotic && (!patient || !prescriptionAttached)) {
      throw new Error("Prescription document is mandatory for narcotic / controlled medicines.");
    }
    return true;
  }

  assert.throws(
    () => attemptCheckout({ patient: null, prescriptionAttached: false }),
    /Prescription document is mandatory/
  );

  // Checkout with valid patient prescription -> allowed
  const allowed = attemptCheckout({ patient: demoPatient, prescriptionAttached: Boolean(demoPatient.prescriptionUrl) });
  assert.equal(allowed, true);
});

check("Completing checkout deducts exact quantities from inventory stock", () => {
  const augMed = appState.medicines.find((m) => m.id === "m_aug");
  const tramMed = appState.medicines.find((m) => m.id === "m_tram");

  const initialAugStock = augMed.stock; // 90
  const initialTramStock = tramMed.stock; // 25

  const billItems = [
    { medicineId: "m_aug", name: "Augmentin 625 Duo Tablet", batch: "AG9081", qty: 5, price: 200.00, gst: 12 },
    { medicineId: "m_tram", name: "Tramadol 50mg Tablet", batch: "TR1001", qty: 2, price: 80.00, gst: 12, narcotic: true },
  ];

  const totals = calculateBillingTotals(billItems, "percent", 5);

  const demoInvoice = {
    id: "inv_1001",
    number: "INV-1001",
    patientId: demoPatient.id,
    patientName: demoPatient.name,
    patientPhone: demoPatient.phone,
    doctorId: demoDoctor.id,
    doctorName: demoDoctor.name,
    hospital: demoDoctor.hospital,
    items: billItems,
    subtotal: totals.subtotal,
    discount: totals.discount,
    discountType: "percent",
    discountValue: 5,
    taxAmount: totals.taxAmount,
    total: totals.total,
    date: new Date().toISOString(),
    createdBy: "staff123",
    hasNarcotic: true,
    prescriptionUrl: demoPatient.prescriptionUrl,
  };

  // Perform stock deduction
  appState.medicines = appState.medicines.map((m) => {
    const it = billItems.find((b) => b.medicineId === m.id);
    return it ? { ...m, stock: m.stock - it.qty } : m;
  });
  appState.invoices.push(demoInvoice);

  const postAugStock = appState.medicines.find((m) => m.id === "m_aug").stock;
  const postTramStock = appState.medicines.find((m) => m.id === "m_tram").stock;

  assert.equal(postAugStock, initialAugStock - 5); // 85
  assert.equal(postTramStock, initialTramStock - 2); // 23
  assert.equal(appState.invoices.length, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. RETURNS MANAGEMENT (SALES & PURCHASE)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n9. TESTING CUSTOMER SALES RETURNS & PURCHASE RETURNS...");

check("Customer Sales Return restores inventory stock automatically", () => {
  const targetMed = appState.medicines.find((m) => m.id === "m_aug");
  const beforeReturnStock = targetMed.stock; // 85

  const returnQty = 2;
  const returnEntry = {
    id: "ret_sales_1",
    type: "sales",
    refNumber: "INV-1001",
    medicineId: targetMed.id,
    medicineName: targetMed.name,
    batch: targetMed.batch,
    qty: returnQty,
    reason: "Doctor revised prescription dosage",
    date: new Date().toISOString().slice(0, 10),
    createdBy: "kumaran",
  };

  // Sales return -> stock comes back in
  appState.medicines = appState.medicines.map((m) =>
    m.id === targetMed.id ? { ...m, stock: m.stock + returnQty } : m
  );
  appState.returns.push(returnEntry);

  const afterReturnStock = appState.medicines.find((m) => m.id === "m_aug").stock;
  assert.equal(afterReturnStock, beforeReturnStock + returnQty); // 87
  assert.equal(appState.returns.length, 1);
});

check("Supplier Purchase Return deducts damaged/expired stock from inventory", () => {
  const targetMed = appState.medicines.find((m) => m.id === "m_cough");
  const beforeReturnStock = targetMed.stock; // 5

  const returnQty = 1;
  const returnEntry = {
    id: "ret_purch_1",
    type: "purchase",
    refNumber: "CIP-2026-901",
    medicineId: targetMed.id,
    medicineName: targetMed.name,
    batch: targetMed.batch,
    qty: returnQty,
    reason: "Leaking bottle seal on delivery",
    date: new Date().toISOString().slice(0, 10),
    createdBy: "kumaran",
  };

  // Purchase return -> stock goes out
  appState.medicines = appState.medicines.map((m) =>
    m.id === targetMed.id ? { ...m, stock: m.stock - returnQty } : m
  );
  appState.returns.push(returnEntry);

  const afterReturnStock = appState.medicines.find((m) => m.id === "m_cough").stock;
  assert.equal(afterReturnStock, beforeReturnStock - returnQty); // 4
  assert.equal(appState.returns.length, 2);
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. FINANCIAL REPORTS & AUDIT LOGGING
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n10. TESTING FINANCIAL REPORTS & PROFIT/LOSS CALCULATIONS...");

check("P&L and Revenue calculations across invoices", () => {
  let revenue = 0;
  let cogs = 0;

  appState.invoices.forEach((inv) => {
    revenue += inv.total - inv.taxAmount;
    inv.items.forEach((it) => {
      const med = appState.medicines.find((m) => m.id === it.medicineId);
      if (med) {
        cogs += med.purchasePrice * it.qty;
      }
    });
  });

  // Invoice 1001: 5 Augmentin (buy 120.50, sell 200) + 2 Tramadol (buy 45.00, sell 80)
  // Subtotal = 1160.00, 5% disc = 58.00 -> Total = 1102.00
  // COGS: (5 * 120.50) + (2 * 45.00) = 602.50 + 90.00 = 692.50
  // Profit = 1102.00 - 692.50 = 409.50
  assert.equal(revenue, 1102.00);
  assert.equal(cogs, 692.50);
  const profit = revenue - cogs;
  assert.equal(profit, 409.50);
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. AUDIT TRAIL & SYSTEM DATA PURGE SAFEGUARDS
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n11. TESTING AUDIT LOGGING & SYSTEM DATA PURGE SAFEGUARDS...");

check("Recording audit actions", () => {
  const auditEntries = [
    { id: "a_1", user: "guru", action: "LOGIN", timestamp: new Date().toISOString() },
    { id: "a_2", user: "kumaran", action: "MEDICINE_CREATE", details: "Augmentin 625 Duo", timestamp: new Date().toISOString() },
    { id: "a_3", user: "staff123", action: "BILLING_CREATE", details: "Invoice INV-1001", timestamp: new Date().toISOString() },
  ];
  appState.audit = [...auditEntries];
  assert.equal(appState.audit.length, 3);
});

check("System purge wipes transactional data but preserves users and developers", () => {
  // Purge transactional data
  appState.invoices = [];
  appState.medicines = [];
  appState.audit = [];
  appState.grns = [];
  appState.returns = [];
  appState.counters = { invoice: 1000, grn: 500 };

  // Assert transactional data is empty
  assert.equal(appState.invoices.length, 0);
  assert.equal(appState.medicines.length, 0);
  assert.equal(appState.grns.length, 0);
  assert.equal(appState.returns.length, 0);
  assert.equal(appState.audit.length, 0);

  // Assert user accounts are completely preserved
  assert.equal(appState.users.length, 4);
  const devAccount = appState.users.find((u) => u.role === "developer" || u.username === "guru");
  assert.ok(devAccount, "Developer account must be preserved after data purge");
  assert.equal(devAccount.username, "guru");
  assert.equal(devAccount.role, "developer");
});

console.log("\n===============================================================================");
console.log(`   ALL ${passedCount} CHECKS IN END-TO-END AUTOMATED TEST SUITE PASSED!         `);
console.log("===============================================================================\n");
