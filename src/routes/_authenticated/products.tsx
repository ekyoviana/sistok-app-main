import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, Card, Badge, Button, Input, Modal, Label, TableShell, Th, Td, Select } from "@/components/ui-kit";
import { Plus, Pencil, Trash2, Search, ImagePlus } from "lucide-react";
import { fmtIDR, fmtDate, expiryStatus } from "@/lib/format";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/products")({ component: Products });

const empty = {
  kode_barang: "", nama_barang: "", barcode: "", kategori: "", harga_jual: 0,
  stok: 0, satuan: "pcs", stok_minimum: 0, stok_maksimum: 0, tanggal_kadaluarsa: "" as string | null,
  gambar_barang: "" as string | null,
};

function Products() {
  const { t } = useI18n();
  const { role } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...empty });
  const [imgFile, setImgFile] = useState<File | null>(null);

  const canEdit = role === "admin" || role === "gudang";
  const canDelete = role === "admin";

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await supabase.from("products").select("*").order("nama_barang")).data ?? [],
  });

  const filtered = useMemo(() => products.filter((p: any) =>
    !q || p.nama_barang.toLowerCase().includes(q.toLowerCase()) || p.kode_barang.toLowerCase().includes(q.toLowerCase()) || (p.barcode ?? "").includes(q)
  ), [products, q]);

  const save = useMutation({
    mutationFn: async () => {
      let gambar = form.gambar_barang;
      if (imgFile) {
        const path = `${Date.now()}-${imgFile.name}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, imgFile);
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        gambar = signed?.signedUrl ?? null;
      }
      const payload = { ...form, gambar_barang: gambar, tanggal_kadaluarsa: form.tanggal_kadaluarsa || null };
      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(t("success_saved")); setOpen(false); setEditing(null); setImgFile(null); setForm({ ...empty }); qc.invalidateQueries({ queryKey: ["products"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("products").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success(t("success_saved")); qc.invalidateQueries({ queryKey: ["products"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const openAdd = () => { setEditing(null); setForm({ ...empty }); setImgFile(null); setOpen(true); };
  const openEdit = (p: any) => { setEditing(p); setForm({ ...p, tanggal_kadaluarsa: p.tanggal_kadaluarsa ?? "" }); setImgFile(null); setOpen(true); };

  return (
    <div>
      <PageHeader title={t("products")} subtitle={`${products.length} ${t("products").toLowerCase()}`} actions={
        canEdit ? <Button onClick={openAdd}><Plus className="size-4" /> {t("add")}</Button> : undefined
      } />

      <Card className="p-3 mb-4">
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t("search")} value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
        </div>
      </Card>

      <TableShell>
        <thead>
          <tr>
            <Th>{t("image")}</Th><Th>{t("code")}</Th><Th>{t("name")}</Th><Th>{t("category")}</Th>
            <Th>{t("price")}</Th><Th>{t("stock_qty")}</Th><Th>{t("expiry")}</Th><Th className="text-right">{t("actions")}</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && <tr><Td className="text-center text-muted-foreground py-10">{t("no_data")}</Td><Td/><Td/><Td/><Td/><Td/><Td/><Td/></tr>}
          {filtered.map((p: any) => {
            const low = p.stok <= p.stok_minimum;
            const exp = expiryStatus(p.tanggal_kadaluarsa);
            return (
              <tr key={p.id}>
                <Td>
                  {p.gambar_barang
                    ? <img src={p.gambar_barang} alt="" className="size-10 rounded-lg object-cover border" />
                    : <div className="size-10 rounded-lg bg-muted grid place-items-center text-muted-foreground"><ImagePlus className="size-4" /></div>}
                </Td>
                <Td className="font-mono text-xs">{p.kode_barang}</Td>
                <Td className="font-medium">{p.nama_barang}<div className="text-xs text-muted-foreground font-mono">{p.barcode}</div></Td>
                <Td>{p.kategori || "-"}</Td>
                <Td className="tabular-nums">{fmtIDR(p.harga_jual)}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums">{p.stok} {p.satuan}</span>
                    {low && <Badge variant="destructive">Low</Badge>}
                  </div>
                </Td>
                <Td>
                  {p.tanggal_kadaluarsa
                    ? <Badge variant={exp === "critical" ? "destructive" : exp === "warn" ? "warning" : "muted"}>{fmtDate(p.tanggal_kadaluarsa)}</Badge>
                    : <span className="text-muted-foreground">-</span>}
                </Td>
                <Td className="text-right">
                  <div className="inline-flex gap-1">
                    {canEdit && <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-accent"><Pencil className="size-4" /></button>}
                    {canDelete && <button onClick={() => { if (confirm(t("confirm_delete"))) del.mutate(p.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="size-4" /></button>}
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </TableShell>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t("edit") : t("add")} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label>{t("code")}</Label><Input required value={form.kode_barang} onChange={e => setForm({ ...form, kode_barang: e.target.value })} /></div>
          <div><Label>{t("name")}</Label><Input required value={form.nama_barang} onChange={e => setForm({ ...form, nama_barang: e.target.value })} /></div>
          <div><Label>{t("barcode")}</Label><Input value={form.barcode ?? ""} onChange={e => setForm({ ...form, barcode: e.target.value })} /></div>
          <div><Label>{t("category")}</Label><Input value={form.kategori ?? ""} onChange={e => setForm({ ...form, kategori: e.target.value })} /></div>
          <div><Label>{t("price")}</Label><Input type="number" min={0} required value={form.harga_jual} onChange={e => setForm({ ...form, harga_jual: +e.target.value })} /></div>
          <div><Label>{t("unit")}</Label><Input value={form.satuan} onChange={e => setForm({ ...form, satuan: e.target.value })} /></div>
          <div><Label>{t("stock_qty")}</Label><Input type="number" min={0} value={form.stok} onChange={e => setForm({ ...form, stok: +e.target.value })} disabled={!!editing} /></div>
          <div><Label>{t("min_stock")}</Label><Input type="number" min={0} value={form.stok_minimum} onChange={e => setForm({ ...form, stok_minimum: +e.target.value })} /></div>
          <div><Label>{t("max_stock")}</Label><Input type="number" min={0} value={form.stok_maksimum} onChange={e => setForm({ ...form, stok_maksimum: +e.target.value })} /></div>
          <div><Label>{t("expiry")}</Label><Input type="date" value={form.tanggal_kadaluarsa ?? ""} onChange={e => setForm({ ...form, tanggal_kadaluarsa: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <Label>{t("upload_image")}</Label>
            <Input type="file" accept="image/*" onChange={e => setImgFile(e.target.files?.[0] ?? null)} />
            {(imgFile || form.gambar_barang) && (
              <div className="mt-2">
                <img src={imgFile ? URL.createObjectURL(imgFile) : form.gambar_barang!} className="size-20 rounded-lg object-cover border" alt="" />
              </div>
            )}
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "..." : t("save")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Suppress unused import warning
void Select;
