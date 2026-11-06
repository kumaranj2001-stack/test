import React, { useState, useMemo } from "react";
import { useStore, uid } from "../store/store";
import { Card, CardBody, Input, Label, Button, Th, Td, Modal, Badge, Select, EmptyState } from "../components/ui";
import { fmtDate, today } from "../utils/helpers";
import type { ReturnEntry } from "../store/types";
import { RotateCcw, Search } from "lucide-react";

const Returns: React.FC = () => {
  const { data, setData, currentUser, log } = useStore();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"sales" | "purchase" | "short-expiry">("sales");
  const [medicineId, setMedicineId] = useState("");
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("");
  const [refNumber, setRefNumber] = useState("");
  const [q, setQ] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const submit = () => {
    const med = data.medicines.find((m) => m.id === medicineId);
    if (!med) { alert("Select medicine"); return; }
    if (qty <= 0) { alert("Qty must be > 0"); return; }
    const r: ReturnEntry = {
      id: uid("ret"),
      type,
      refNumber: refNumber || undefined,
      medicineId: med.id,
      medicineName: med.name,
      batch: med.batch,
      qty,
      reason,
      date: today(),
      createdBy: currentUser?.username || "unknown",
    };
    
    // sales return = stock IN, purchase/short-expiry = stock OUT
    const delta = type === "sales" ? qty : -qty;
    const newStock = Math.max(0, med.stock + delta);

    setData((d) => {
      const meds = d.medicines.map((m) => m.id === med.id ? { ...m, stock: newStock } : m);
      return { ...d, returns: [r, ...d.returns], medicines: meds };
    });

    log("RETURN_CREATE", `${type} return: ${med.name} ×${qty}`);

    // Sync medicine stock update with backend
    fetch(`/api/inventory/medicine/${med.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: med.id,
        patch: { stock: newStock },
        role: currentUser?.role || "superadmin",
      }),
    }).catch(() => {});

    setOpen(false);
    setQty(1);
    setReason("");
    setRefNumber("");
    setMedicineId("");
  };

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim();
    return data.returns.filter((r) => {
      if (filterType !== "all" && r.type !== filterType) return false;
      if (!query) return true;
      return (
        r.medicineName.toLowerCase().includes(query) ||
        r.batch.toLowerCase().includes(query) ||
        (r.refNumber && r.refNumber.toLowerCase().includes(query)) ||
        (r.reason && r.reason.toLowerCase().includes(query)) ||
        r.createdBy.toLowerCase().includes(query)
      );
    });
  }, [data.returns, q, filterType]);

  const renderBadge = (entryType: "sales" | "purchase" | "short-expiry") => {
    if (entryType === "sales") return <Badge tone="green">SALES</Badge>;
    if (entryType === "purchase") return <Badge tone="blue">PURCHASE</Badge>;
    return <Badge tone="amber">SHORT EXPIRY</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              Return Management
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Sales, Purchase, and Short-expiry returns with automated stock balancing.
            </div>
          </div>
          <Button onClick={() => setOpen(true)}>+ New Return</Button>
        </CardBody>
      </Card>

      {/* Filter and Search Bar */}
      <Card>
        <CardBody className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by medicine, batch, ref no, or cashier..."
              className="pl-9"
            />
          </div>
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full sm:w-48"
          >
            <option value="all">All Return Types</option>
            <option value="sales">Sales Returns</option>
            <option value="purchase">Purchase Returns</option>
            <option value="short-expiry">Short Expiry</option>
          </Select>
        </CardBody>
      </Card>

      {/* Mobile Cards View */}
      <div className="lg:hidden space-y-3">
        {filtered.length === 0 && (
          <Card>
            <CardBody>
              <EmptyState message="No returns found" />
            </CardBody>
          </Card>
        )}
        {filtered.map((r) => (
          <Card key={r.id}>
            <CardBody className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {r.medicineName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Batch: <span className="font-mono text-slate-700 dark:text-slate-300">{r.batch}</span> · {fmtDate(r.date)}
                  </div>
                </div>
                {renderBadge(r.type)}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-700/60">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Quantity:</span>{" "}
                  <span className="font-bold text-slate-800 dark:text-slate-200">{r.qty}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Ref:</span>{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-300">{r.refNumber || "—"}</span>
                </div>
              </div>

              {r.reason && (
                <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                  <span className="text-slate-400 font-medium">Reason: </span>
                  {r.reason}
                </div>
              )}

              <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                Recorded by: <span className="font-medium text-slate-600 dark:text-slate-400">{r.createdBy}</span>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden lg:block">
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <Th>Date</Th>
                  <Th>Type</Th>
                  <Th>Medicine</Th>
                  <Th>Batch</Th>
                  <Th>Qty</Th>
                  <Th>Ref</Th>
                  <Th>Reason</Th>
                  <Th>By</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <Td>{fmtDate(r.date)}</Td>
                    <Td>{renderBadge(r.type)}</Td>
                    <Td className="font-medium text-slate-800 dark:text-slate-200">{r.medicineName}</Td>
                    <Td className="font-mono text-xs">{r.batch}</Td>
                    <Td className="font-bold">{r.qty}</Td>
                    <Td>{r.refNumber || "—"}</Td>
                    <Td className="text-slate-600 dark:text-slate-400">{r.reason || "—"}</Td>
                    <Td>{r.createdBy}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <EmptyState message="No returns found" />}
          </div>
        </CardBody>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New Return">
        <div className="space-y-3">
          <div>
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value as "sales" | "purchase" | "short-expiry")}>
              <option value="sales">Sales Return (customer → +stock)</option>
              <option value="purchase">Purchase Return (to supplier → -stock)</option>
              <option value="short-expiry">Short Expiry Return (-stock)</option>
            </Select>
          </div>
          <div>
            <Label>Medicine</Label>
            <Select value={medicineId} onChange={(e) => setMedicineId(e.target.value)}>
              <option value="">Select...</option>
              {data.medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — Batch {m.batch} (Stock {m.stock})
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity</Label>
              <Input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </div>
            <div>
              <Label>Reference (Invoice/GRN)</Label>
              <Input value={refNumber} onChange={(e) => setRefNumber(e.target.value)} placeholder="e.g. INV-1024" />
            </div>
          </div>
          <div>
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Broken seal, wrong dose" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Save Return</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Returns;
