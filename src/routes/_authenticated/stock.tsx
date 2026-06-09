import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Card, Badge, Input, TableShell, Th, Td } from "@/components/ui-kit";
import { fmtIDR, fmtDate, expiryStatus } from "@/lib/format";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/stock")({ component: Stock });

function Stock() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: async () => (await supabase.from("products").select("*").order("nama_barang")).data ?? [] });
  const filtered = useMemo(() => products.filter((p: any) => !q || p.nama_barang.toLowerCase().includes(q.toLowerCase()) || p.kode_barang.toLowerCase().includes(q.toLowerCase())), [products, q]);

  return (
    <div>
      <PageHeader title={t("stock")} subtitle={t("stock_subtitle")} />
      <Card className="p-3 mb-4">
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t("search")} value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
        </div>
      </Card>
      <TableShell>
        <thead><tr><Th>{t("code")}</Th><Th>{t("name")}</Th><Th>{t("category")}</Th><Th>{t("stock_qty")}</Th><Th>{t("min_stock")}</Th><Th>{t("expiry")}</Th><Th>{t("price")}</Th></tr></thead>
        <tbody>
          {filtered.map((p: any) => {
            const low = p.stok <= p.stok_minimum;
            const exp = expiryStatus(p.tanggal_kadaluarsa);
            return (
              <tr key={p.id}>
                <Td className="font-mono text-xs">{p.kode_barang}</Td>
                <Td className="font-medium">{p.nama_barang}</Td>
                <Td>{p.kategori || "-"}</Td>
                <Td><span className={`tabular-nums ${low ? "text-destructive font-semibold" : ""}`}>{p.stok} {p.satuan}</span></Td>
                <Td className="tabular-nums">{p.stok_minimum}</Td>
                <Td>{p.tanggal_kadaluarsa ? <Badge variant={exp === "critical" ? "destructive" : exp === "warn" ? "warning" : "muted"}>{fmtDate(p.tanggal_kadaluarsa)}</Badge> : "-"}</Td>
                <Td className="tabular-nums">{fmtIDR(p.harga_jual)}</Td>
              </tr>
            );
          })}
        </tbody>
      </TableShell>
    </div>
  );
}
