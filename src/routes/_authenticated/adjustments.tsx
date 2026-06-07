import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Card, Button, Input, Select, Label, Textarea, TableShell, Th, Td } from "@/components/ui-kit";
import { fmtDateTime } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/adjustments")({ component: Adj });

function Adj() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState({ product_id: "", jenis: "kerusakan", jumlah: -1, keterangan: "" });

  const { data: products = [] } = useQuery({ queryKey: ["products-sel"], queryFn: async () => (await supabase.from("products").select("id,kode_barang,nama_barang,stok").order("nama_barang")).data ?? [] });
  const { data: rows = [] } = useQuery({ queryKey: ["adj"], queryFn: async () => (await supabase.from("stock_adjustments").select("*, products(nama_barang, kode_barang)").order("created_at", { ascending: false }).limit(50)).data ?? [] });

  const mut = useMutation({
    mutationFn: async () => {
      if (!form.product_id) throw new Error("Pilih barang");
      const { error } = await supabase.rpc("fn_penyesuaian", { p_product_id: form.product_id, p_jenis: form.jenis, p_jumlah: form.jumlah, p_keterangan: form.keterangan });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(t("success_saved")); setForm({ product_id: "", jenis: "kerusakan", jumlah: -1, keterangan: "" }); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title={t("adjustments")} subtitle="Gunakan angka negatif untuk pengurangan stok" />

      <Card className="p-5 mb-6">
        <form onSubmit={e => { e.preventDefault(); mut.mutate(); }} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>{t("select_product")}</Label>
            <Select required value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })}>
              <option value="">—</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.kode_barang} · {p.nama_barang} (stok: {p.stok})</option>)}
            </Select>
          </div>
          <div><Label>{t("type")}</Label>
            <Select value={form.jenis} onChange={e => setForm({ ...form, jenis: e.target.value })}>
              <option value="kerusakan">{t("damage")}</option>
              <option value="kehilangan">{t("loss")}</option>
              <option value="selisih">{t("diff")}</option>
            </Select>
          </div>
          <div><Label>{t("quantity")} (+/−)</Label><Input type="number" required value={form.jumlah} onChange={e => setForm({ ...form, jumlah: +e.target.value })} /></div>
          <div className="md:col-span-2"><Label>{t("note")}</Label><Textarea rows={3} value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} /></div>
          <div className="md:col-span-2 flex justify-end"><Button type="submit" disabled={mut.isPending}>{t("submit")}</Button></div>
        </form>
      </Card>

      <TableShell>
        <thead><tr><Th>{t("date")}</Th><Th>{t("name")}</Th><Th>{t("type")}</Th><Th>{t("quantity")}</Th><Th>{t("note")}</Th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><Td colSpan={5} className="text-center text-muted-foreground py-8">{t("no_data")}</Td></tr>}
          {rows.map((r: any) => (
            <tr key={r.id}>
              <Td>{fmtDateTime(r.created_at)}</Td>
              <Td className="font-medium">{r.products?.nama_barang}</Td>
              <Td className="capitalize">{r.jenis_penyesuaian}</Td>
              <Td className={`tabular-nums ${r.jumlah < 0 ? "text-destructive" : "text-success"}`}>{r.jumlah > 0 ? "+" : ""}{r.jumlah}</Td>
              <Td className="text-sm text-muted-foreground">{r.keterangan || "-"}</Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}
