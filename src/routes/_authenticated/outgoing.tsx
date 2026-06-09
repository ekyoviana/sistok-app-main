import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, Card, Button, Input, Select, Label, TableShell, Th, Td } from "@/components/ui-kit";
import { fmtDateTime, fmtIDR } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, ScanLine } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";


export const Route = createFileRoute("/_authenticated/outgoing")({ component: Outgoing });

function Outgoing() {
  const { t } = useI18n();
  const { role } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ product_id: "", jumlah: 1, jenis_keluar: "penjualan", tanggal_keluar: new Date().toISOString().slice(0,16) });
  const [scan, setScan] = useState("");
  const [scanOpen, setScanOpen] = useState(false);


  const { data: products = [] } = useQuery({ queryKey: ["products-sel"], queryFn: async () => (await supabase.from("products").select("id,kode_barang,nama_barang,barcode,stok").order("nama_barang")).data ?? [] });
  const { data: rows = [] } = useQuery({ queryKey: ["outgoing"], queryFn: async () => (await supabase.from("outgoing_goods").select("*, products(nama_barang, kode_barang)").order("tanggal_keluar", { ascending: false }).limit(50)).data ?? [] });

  const mut = useMutation({
    mutationFn: async () => {
      if (!form.product_id) throw new Error("Pilih barang");
      const { error } = await supabase.rpc("fn_barang_keluar", { p_product_id: form.product_id, p_jumlah: form.jumlah, p_jenis: form.jenis_keluar, p_tanggal: new Date(form.tanggal_keluar).toISOString() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(t("success_saved")); setForm({ product_id: "", jumlah: 1, jenis_keluar: "penjualan", tanggal_keluar: new Date().toISOString().slice(0,16) }); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("fn_hapus_barang_keluar", { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Transaksi dihapus"); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleScan = (code?: string) => {
    const value = (code ?? scan).trim();
    if (!value) return;
    const p = products.find((x: any) => x.barcode === value || x.kode_barang === value);
    if (p) { setForm(f => ({ ...f, product_id: p.id })); toast.success(`${p.nama_barang} (stok: ${p.stok})`); }
    else toast.error("Barcode tidak ditemukan");
    setScan("");
  };

  const selected = products.find((p: any) => p.id === form.product_id);

  return (
    <div>
      <PageHeader title={t("outgoing")} subtitle={t("outgoing_subtitle")} />


      <Card className="p-5 mb-6">
        <form onSubmit={e => { e.preventDefault(); mut.mutate(); }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-3 flex gap-2">
            <Input placeholder="Scan / input barcode" value={scan} onChange={e => setScan(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleScan())} />
            <Button type="button" variant="outline" onClick={() => handleScan()}>Cek</Button>
            <Button type="button" variant="outline" onClick={() => setScanOpen(true)}><ScanLine className="size-4" /> Scan</Button>

          </div>
          <div><Label>{t("select_product")}</Label>
            <Select required value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })}>
              <option value="">—</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.kode_barang} · {p.nama_barang} (stok: {p.stok})</option>)}
            </Select>
          </div>
          <div><Label>{t("quantity")}</Label>
            <Input type="number" min={1} max={selected?.stok ?? undefined} required value={form.jumlah} onChange={e => setForm({ ...form, jumlah: +e.target.value })} />
            {selected && <div className="text-xs text-muted-foreground mt-1">Tersedia: {selected.stok}</div>}
          </div>
          <div><Label>{t("type")}</Label>
            <Select value={form.jenis_keluar} onChange={e => setForm({ ...form, jenis_keluar: e.target.value })}>
              <option value="penjualan">{t("sale")}</option>
              <option value="internal">{t("internal")}</option>
            </Select>
          </div>
          <div><Label>{t("date")}</Label><Input type="datetime-local" value={form.tanggal_keluar} onChange={e => setForm({ ...form, tanggal_keluar: e.target.value })} /></div>
          <div className="md:col-span-2 lg:col-span-3 flex justify-end"><Button type="submit" disabled={mut.isPending}>{t("submit")}</Button></div>
        </form>
      </Card>

      <TableShell>
        <thead><tr><Th>{t("date")}</Th><Th>{t("name")}</Th><Th>{t("type")}</Th><Th>{t("quantity")}</Th><Th>{t("hpp")}</Th><Th className="text-right">{t("actions")}</Th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><Td colSpan={6} className="text-center text-muted-foreground py-8">{t("no_data")}</Td></tr>}
          {rows.map((r: any) => (
            <tr key={r.id}>
              <Td>{fmtDateTime(r.tanggal_keluar)}</Td>
              <Td className="font-medium">{r.products?.nama_barang}<div className="text-xs text-muted-foreground font-mono">{r.products?.kode_barang}</div></Td>
              <Td className="capitalize">{r.jenis_keluar}</Td>
              <Td className="tabular-nums text-destructive">−{r.jumlah}</Td>
              <Td className="tabular-nums">{fmtIDR(r.hpp)}</Td>
              <Td className="text-right">
                {role === "admin" ? (
                  <Button variant="ghost" className="h-8 px-2 text-destructive hover:bg-destructive/10" onClick={() => { if (confirm("Hapus transaksi ini? Stok akan dikembalikan ke batch terbaru.")) del.mutate(r.id); }}>
                    <Trash2 className="size-4" />
                  </Button>
                ) : <span className="text-xs text-muted-foreground">—</span>}
              </Td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}
