import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Card, Button, Input, Select, Label, TableShell, Th, Td } from "@/components/ui-kit";
import { fmtDateTime, fmtIDR } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/incoming")({ component: Incoming });

function Incoming() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState({ product_id: "", jumlah: 1, harga_beli: 0, supplier: "", tanggal_masuk: new Date().toISOString().slice(0,16) });
  const [scan, setScan] = useState("");

  const { data: products = [] } = useQuery({ queryKey: ["products-sel"], queryFn: async () => (await supabase.from("products").select("id,kode_barang,nama_barang,barcode").order("nama_barang")).data ?? [] });
  const { data: rows = [] } = useQuery({ queryKey: ["incoming"], queryFn: async () => (await supabase.from("incoming_goods").select("*, products(nama_barang, kode_barang)").order("tanggal_masuk", { ascending: false }).limit(50)).data ?? [] });

  const mut = useMutation({
    mutationFn: async () => {
      if (!form.product_id) throw new Error("Pilih barang");
      const { error } = await supabase.rpc("fn_barang_masuk", {
        p_product_id: form.product_id, p_jumlah: form.jumlah, p_harga: form.harga_beli, p_supplier: form.supplier, p_tanggal: new Date(form.tanggal_masuk).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("success_saved"));
      setForm({ product_id: "", jumlah: 1, harga_beli: 0, supplier: "", tanggal_masuk: new Date().toISOString().slice(0,16) });
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleScan = () => {
    const p = products.find((x: any) => x.barcode === scan || x.kode_barang === scan);
    if (p) { setForm(f => ({ ...f, product_id: p.id })); toast.success(p.nama_barang); }
    else toast.error("Barcode tidak ditemukan");
    setScan("");
  };

  return (
    <div>
      <PageHeader title={t("incoming")} subtitle="FIFO batch otomatis tercatat" />

      <Card className="p-5 mb-6">
        <form onSubmit={e => { e.preventDefault(); mut.mutate(); }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-3 flex gap-2">
            <Input placeholder="Scan / input barcode" value={scan} onChange={e => setScan(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleScan())} />
            <Button type="button" variant="outline" onClick={handleScan}>Scan</Button>
          </div>
          <div><Label>{t("select_product")}</Label>
            <Select required value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })}>
              <option value="">—</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.kode_barang} · {p.nama_barang}</option>)}
            </Select>
          </div>
          <div><Label>{t("quantity")}</Label><Input type="number" min={1} required value={form.jumlah} onChange={e => setForm({ ...form, jumlah: +e.target.value })} /></div>
          <div><Label>{t("buy_price")}</Label><Input type="number" min={0} required value={form.harga_beli} onChange={e => setForm({ ...form, harga_beli: +e.target.value })} /></div>
          <div><Label>{t("supplier")}</Label><Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></div>
          <div><Label>{t("date")}</Label><Input type="datetime-local" value={form.tanggal_masuk} onChange={e => setForm({ ...form, tanggal_masuk: e.target.value })} /></div>
          <div className="md:col-span-2 lg:col-span-3 flex justify-end"><Button type="submit" disabled={mut.isPending}>{t("submit")}</Button></div>
        </form>
      </Card>

      <TableShell>
        <thead><tr><Th>{t("date")}</Th><Th>{t("name")}</Th><Th>{t("quantity")}</Th><Th>{t("buy_price")}</Th><Th>{t("supplier")}</Th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><Td colSpan={5} className="text-center text-muted-foreground py-8">{t("no_data")}</Td></tr>}
          {rows.map((r: any) => (
            <tr key={r.id}>
              <Td>{fmtDateTime(r.tanggal_masuk)}</Td>
              <Td className="font-medium">{r.products?.nama_barang}<div className="text-xs text-muted-foreground font-mono">{r.products?.kode_barang}</div></Td>
              <Td className="tabular-nums">+{r.jumlah}</Td>
              <Td className="tabular-nums">{fmtIDR(r.harga_beli)}</Td>
              <Td>{r.supplier || "-"}</Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}
