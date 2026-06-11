import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Card, StatCard, Button, Input, Select, Label, TableShell, Th, Td } from "@/components/ui-kit";
import { fmtIDR, fmtDateTime, expiryStatus } from "@/lib/format";
import { useMemo, useState } from "react";
import { Printer, FileDown, Package, Boxes, AlertTriangle, CalendarClock, Receipt } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({ component: Reports });

function dayStart(d: string) { return new Date(`${d}T00:00:00`).toISOString(); }
function dayEnd(d: string) { return new Date(`${d}T23:59:59.999`).toISOString(); }

function Reports() {
  const { t } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [type, setType] = useState<"stock" | "in" | "out" | "pnl">("stock");

  const fromISO = useMemo(() => dayStart(from), [from]);
  const toISO = useMemo(() => dayEnd(to), [to]);

  const stockQ = useQuery({
    queryKey: ["rep-stock"],
    queryFn: async () => (await supabase.from("products").select("*").order("nama_barang")).data ?? [],
  });
  const inQ = useQuery({
    queryKey: ["rep-in", fromISO, toISO],
    queryFn: async () =>
      (await supabase
        .from("incoming_goods")
        .select("*, products(nama_barang, kode_barang)")
        .gte("tanggal_masuk", fromISO)
        .lte("tanggal_masuk", toISO)
        .order("tanggal_masuk", { ascending: false })).data ?? [],
  });
  const outQ = useQuery({
    queryKey: ["rep-out", fromISO, toISO],
    queryFn: async () =>
      (await supabase
        .from("outgoing_goods")
        .select("*, products(nama_barang, kode_barang)")
        .gte("tanggal_keluar", fromISO)
        .lte("tanggal_keluar", toISO)
        .order("tanggal_keluar", { ascending: false })).data ?? [],
  });

  const products = stockQ.data ?? [];
  const totalStock = products.reduce((s: number, p: any) => s + (p.stok || 0), 0);
  const lowStock = products.filter((p: any) => p.stok <= p.stok_minimum);
  const expiring = products.filter((p: any) => expiryStatus(p.tanggal_kadaluarsa) !== "ok");
  const stockValue = products.reduce((s: number, p: any) => s + (p.stok || 0) * (p.harga_jual || 0), 0);

  const handlePrint = () => window.print();
  const handleExport = () => {
    const html = document.getElementById("report-content")?.outerHTML ?? "";
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<html><head><title>${t("report_title")}</title><style>body{font-family:system-ui;padding:24px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f3f4f6}h1{margin:0 0 6px}p{color:#555;margin:0 0 16px}</style></head><body><h1>${t("report_title")}</h1><p>${t("period")}: ${from} → ${to}</p>${html}</body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div>
      <PageHeader
        title={t("reports")}
        actions={
          <>
            <Button variant="outline" onClick={handlePrint}><Printer className="size-4" /> {t("print")}</Button>
            <Button onClick={handleExport}><FileDown className="size-4" /> {t("export_pdf")}</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 mb-6">
        <StatCard label={t("total_products")} value={products.length} icon={<Package className="size-5" />} />
        <StatCard label={t("total_stock")} value={totalStock} accent="success" icon={<Boxes className="size-5" />} />
        <StatCard label={t("low_stock")} value={lowStock.length} accent="destructive" icon={<AlertTriangle className="size-5" />} />
        <StatCard label={t("expiring")} value={expiring.length} accent="warning" icon={<CalendarClock className="size-5" />} />
        <StatCard label={t("stock_value")} value={fmtIDR(stockValue)} accent="primary" icon={<Receipt className="size-5" />} />
      </div>

      <Card className="p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <Label>{t("type")}</Label>
          <Select value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="stock">{t("report_stock")}</option>
            <option value="in">{t("report_in")}</option>
            <option value="out">{t("report_out")}</option>
          </Select>
        </div>
        <div>
          <Label>{t("from")}</Label>
          <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} disabled={type === "stock"} />
        </div>
        <div>
          <Label>{t("to")}</Label>
          <Input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} disabled={type === "stock"} />
        </div>
        <div className="flex items-end">
          <Button variant="outline" className="w-full" disabled={type === "stock"} onClick={() => { setFrom(monthAgo); setTo(today); }}>{t("reset")}</Button>
        </div>
      </Card>

      {type !== "stock" && (
        <div className="text-sm text-muted-foreground mb-2">
          {t("showing")} {type === "in" ? inQ.data?.length ?? 0 : outQ.data?.length ?? 0} {t("transactions")} · {from} → {to}
        </div>
      )}

      <div id="report-content">
        {type === "stock" && (
          <TableShell>
            <thead><tr><Th>{t("code")}</Th><Th>{t("name")}</Th><Th>{t("category")}</Th><Th>{t("stock_qty")}</Th><Th>{t("price")}</Th><Th>{t("value")}</Th></tr></thead>
            <tbody>
              {products.map((p: any) => (
                <tr key={p.id}>
                  <Td className="font-mono text-xs">{p.kode_barang}</Td><Td>{p.nama_barang}</Td><Td>{p.kategori || "-"}</Td>
                  <Td className="tabular-nums">{p.stok}</Td><Td className="tabular-nums">{fmtIDR(p.harga_jual)}</Td>
                  <Td className="tabular-nums font-semibold">{fmtIDR(p.stok * p.harga_jual)}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
        {type === "in" && (
          <TableShell>
            <thead><tr><Th>{t("date")}</Th><Th>{t("name")}</Th><Th>{t("quantity")}</Th><Th>{t("buy_price")}</Th><Th>{t("value")}</Th><Th>{t("supplier")}</Th></tr></thead>
            <tbody>
              {(inQ.data ?? []).length === 0 && <tr><Td colSpan={6} className="text-center text-muted-foreground py-8">{t("no_data")}</Td></tr>}
              {inQ.data?.map((r: any) => (
                <tr key={r.id}>
                  <Td>{fmtDateTime(r.tanggal_masuk)}</Td><Td>{r.products?.nama_barang}</Td>
                  <Td className="tabular-nums">{r.jumlah}</Td><Td className="tabular-nums">{fmtIDR(r.harga_beli)}</Td>
                  <Td className="tabular-nums font-semibold">{fmtIDR(r.jumlah * r.harga_beli)}</Td><Td>{r.supplier || "-"}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
        {type === "out" && (
          <TableShell>
            <thead><tr><Th>{t("date")}</Th><Th>{t("name")}</Th><Th>{t("type")}</Th><Th>{t("quantity")}</Th><Th>{t("hpp")}</Th></tr></thead>
            <tbody>
              {(outQ.data ?? []).length === 0 && <tr><Td colSpan={5} className="text-center text-muted-foreground py-8">{t("no_data")}</Td></tr>}
              {outQ.data?.map((r: any) => {
                const jenisLabel = r.jenis_keluar === "penjualan" ? t("type_sale") : r.jenis_keluar === "internal" ? t("type_internal") : r.jenis_keluar;
                return (
                <tr key={r.id}>
                  <Td>{fmtDateTime(r.tanggal_keluar)}</Td><Td>{r.products?.nama_barang}</Td>
                  <Td>{jenisLabel}</Td><Td className="tabular-nums">{r.jumlah}</Td>
                  <Td className="tabular-nums">{fmtIDR(r.hpp)}</Td>
                </tr>
              );})}
            </tbody>
          </TableShell>
        )}
      </div>
    </div>
  );
}
