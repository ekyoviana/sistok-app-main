import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Card, Button, Input, Select, Label, TableShell, Th, Td } from "@/components/ui-kit";
import { fmtIDR, fmtDateTime } from "@/lib/format";
import { useState } from "react";
import { Printer, FileDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({ component: Reports });

function Reports() {
  const { t } = useI18n();
  const today = new Date().toISOString().slice(0,10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0,10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [type, setType] = useState<"stock" | "in" | "out">("stock");

  const stockQ = useQuery({ queryKey: ["rep-stock"], queryFn: async () => (await supabase.from("products").select("*").order("nama_barang")).data ?? [] });
  const inQ = useQuery({
    queryKey: ["rep-in", from, to],
    queryFn: async () => (await supabase.from("incoming_goods").select("*, products(nama_barang, kode_barang)").gte("tanggal_masuk", from).lte("tanggal_masuk", `${to}T23:59:59`).order("tanggal_masuk", { ascending: false })).data ?? [],
  });
  const outQ = useQuery({
    queryKey: ["rep-out", from, to],
    queryFn: async () => (await supabase.from("outgoing_goods").select("*, products(nama_barang, kode_barang)").gte("tanggal_keluar", from).lte("tanggal_keluar", `${to}T23:59:59`).order("tanggal_keluar", { ascending: false })).data ?? [],
  });

  const handlePrint = () => window.print();
  const handleExport = () => {
    const html = document.getElementById("report-content")?.outerHTML ?? "";
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Laporan</title><style>body{font-family:system-ui;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f3f4f6}</style></head><body><h1>Laporan SIPB</h1><p>Periode: ${from} s/d ${to}</p>${html}</body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  return (
    <div>
      <PageHeader title={t("reports")} actions={
        <>
          <Button variant="outline" onClick={handlePrint}><Printer className="size-4" /> {t("print")}</Button>
          <Button onClick={handleExport}><FileDown className="size-4" /> {t("export_pdf")}</Button>
        </>
      } />

      <Card className="p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div><Label>{t("type")}</Label>
          <Select value={type} onChange={e => setType(e.target.value as any)}>
            <option value="stock">{t("report_stock")}</option>
            <option value="in">{t("report_in")}</option>
            <option value="out">{t("report_out")}</option>
          </Select>
        </div>
        <div><Label>{t("from")}</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} disabled={type === "stock"} /></div>
        <div><Label>{t("to")}</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} disabled={type === "stock"} /></div>
      </Card>

      <div id="report-content">
        {type === "stock" && (
          <TableShell>
            <thead><tr><Th>{t("code")}</Th><Th>{t("name")}</Th><Th>{t("category")}</Th><Th>{t("stock_qty")}</Th><Th>{t("price")}</Th><Th>Nilai</Th></tr></thead>
            <tbody>
              {stockQ.data?.map((p: any) => (
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
            <thead><tr><Th>{t("date")}</Th><Th>{t("name")}</Th><Th>{t("quantity")}</Th><Th>{t("buy_price")}</Th><Th>Total</Th><Th>{t("supplier")}</Th></tr></thead>
            <tbody>
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
              {outQ.data?.map((r: any) => (
                <tr key={r.id}>
                  <Td>{fmtDateTime(r.tanggal_keluar)}</Td><Td>{r.products?.nama_barang}</Td>
                  <Td className="capitalize">{r.jenis_keluar}</Td><Td className="tabular-nums">{r.jumlah}</Td>
                  <Td className="tabular-nums">{fmtIDR(r.hpp)}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </div>
    </div>
  );
}
