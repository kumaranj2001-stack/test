import React, { useEffect, useMemo, useState } from "react";
import { useStore } from "../store/store";
import { FileDown, Eye, Trash2, Receipt } from "lucide-react";
import { Card, CardBody, Input, Th, Td, Button, EmptyState } from "../components/ui";
import { fmtCurrency, fmtDateTime, downloadPDF } from "../utils/helpers";
import type { Invoice } from "../store/types";
import InvoicePrint from "../components/InvoicePrint";

const Invoices: React.FC<{ focusId?: string | null; onConsumeFocus?: () => void }> = ({ focusId, onConsumeFocus }) => {
  const { data, setData, flags, currentUser, log } = useStore();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [view, setView] = useState<Invoice | null>(null);

  const canDeleteInvoice = currentUser?.role === "superadmin" || currentUser?.role === "developer";

  // Deep link: open a specific invoice when navigated from the dashboard
  useEffect(() => {
    if (!focusId) return;
    const target = data.invoices.find((i) => i.id === focusId);
    if (target) setView(target);
    onConsumeFocus?.();
  }, [focusId, data.invoices, onConsumeFocus]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return data.invoices.filter((i) => {
      if (q && !(i.number.toLowerCase().includes(ql) || i.patientName.toLowerCase().includes(ql))) return false;
      if (from && i.date.slice(0, 10) < from) return false;
      if (to && i.date.slice(0, 10) > to) return false;
      return true;
    });
  }, [data.invoices, q, from, to]);

  const removeInvoice = (inv: Invoice) => {
    if (!canDeleteInvoice) {
      alert("Access restricted: Only Super Admin and Developer accounts can delete invoices.");
      return;
    }
    if (!confirm(`Are you sure you want to delete invoice ${inv.number}?`)) return;

    setData((d) => ({
      ...d,
      invoices: d.invoices.filter((x) => x.id !== inv.id),
    }));
    log("INVOICE_DELETE", `Invoice ${inv.number} deleted by ${currentUser?.username || "unknown"}`);

    fetch(`/api/invoices/${inv.id}`, {
      method: "DELETE",
    }).catch(() => {});
  };

  const exportPDF = () => {
    const totals = filtered.reduce((s, i) => ({ total: s.total + i.total }), { total: 0 });
    downloadPDF({
      filename: `invoices-${Date.now()}.pdf`,
      title: "Sales Invoices",
      subtitle: `${filtered.length} invoice(s)${from ? ` from ${from}` : ""}${to ? ` to ${to}` : ""}`,
      columns: ["Invoice", "Date", "Patient", "Phone", "Items", "Subtotal", "Discount", "Total", "Cashier"],
      rows: filtered.map((i) => [i.number, fmtDateTime(i.date), i.patientName, i.patientPhone || "", i.items.length, fmtCurrency(i.subtotal), fmtCurrency(i.discount), fmtCurrency(i.total), i.createdBy]),
      footer: [
        { label: "Total Collected", value: fmtCurrency(totals.total) },
      ],
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input placeholder="Search invoice/patient..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          {flags.pdfInvoices && (
            <Button variant="secondary" onClick={exportPDF} className="w-full">
              <FileDown className="w-4 h-4" /> Download PDF
            </Button>
          )}
        </CardBody>
      </Card>

      {/* Mobile Card List */}
      <div className="lg:hidden space-y-3">
        {filtered.length === 0 && (
          <Card>
            <CardBody>
              <EmptyState message="No invoices found" />
            </CardBody>
          </Card>
        )}
        {filtered.map((i) => (
          <Card key={i.id}>
            <CardBody className="space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sky-700 dark:text-sky-300 truncate">{i.number}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{fmtDateTime(i.date)}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-slate-900 dark:text-slate-100">{fmtCurrency(i.total)}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{i.items.length} item{i.items.length === 1 ? "" : "s"}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Patient: </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{i.patientName}</span>
                  {i.patientPhone && <span className="text-slate-400"> ({i.patientPhone})</span>}
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  Cashier: <span className="font-medium text-slate-700 dark:text-slate-300">{i.createdBy}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                {canDeleteInvoice && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeInvoice(i)}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                    title="Delete invoice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => setView(i)}>
                  <Eye className="w-4 h-4" /> View Invoice
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Desktop Table */}
      <Card className="hidden lg:block">
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <Th>Invoice</Th>
                  <Th>Date</Th>
                  <Th>Patient</Th>
                  <Th>Items</Th>
                  <Th>Total</Th>
                  <Th>Cashier</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filtered.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <Td className="font-semibold text-sky-700 dark:text-sky-300">{i.number}</Td>
                    <Td>{fmtDateTime(i.date)}</Td>
                    <Td>
                      <div className="font-medium text-slate-800 dark:text-slate-200">{i.patientName}</div>
                      {i.patientPhone && <div className="text-xs text-slate-500 dark:text-slate-400">{i.patientPhone}</div>}
                    </Td>
                    <Td>{i.items.length}</Td>
                    <Td className="font-bold text-slate-800 dark:text-slate-100">{fmtCurrency(i.total)}</Td>
                    <Td>{i.createdBy}</Td>
                    <Td className="space-x-1 text-right">
                      <Button size="sm" variant="secondary" onClick={() => setView(i)}>
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>
                      {canDeleteInvoice && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeInvoice(i)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          title="Delete invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <EmptyState message="No invoices found" />}
          </div>
        </CardBody>
      </Card>

      {view && <InvoicePrint invoice={view} onClose={() => setView(null)} />}
    </div>
  );
};

export default Invoices;
