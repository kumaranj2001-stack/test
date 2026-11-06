declare module "./server/intelligentParser.mjs" {
  export const parseInvoiceDocument: any;
}

declare module "./server/inventoryFilter.mjs" {
  export const filterMedicines: any;
}

declare module "./server/medicineHandler.mjs" {
  export const validateMedicinePayload: any;
  export const createMedicine: any;
  export const updateMedicine: any;
  export const deleteMedicine: any;
  export const updateMedicineMinStock: any;
  export const isAuthorizedForMinStock: any;
}

declare module "./server/firebase.mjs" {
  export const db: any;
  export const COLLECTIONS: any;
  export const firebaseConfig: any;
}

declare module "./server/approvedGrnHandler.mjs" {
  export const listApprovedGrns: any;
  export const updateApprovedGrn: any;
  export const deleteApprovedGrn: any;
  export const isDeveloperRole: any;
}

declare module "./server/doctorHandler.mjs" {
  export const listDoctors: any;
  export const createDoctor: any;
  export const updateDoctor: any;
  export const deleteDoctor: any;
}
