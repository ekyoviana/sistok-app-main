import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, StatCard, Card, Badge, TableShell, Th, Td } from "@/components/ui-kit";
import { Package, Boxes, AlertTriangle, CalendarClock, Receipt, ArrowRight } from "lucide-react";
import { fmtIDR, fmtDate, fmtDateTime, expiryStatus } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { t } = useI18n();
  const { nama } = useAuth();

  const { data: products = [] } = useQuery({
    queryKey: ["products-all"],
    queryFn: async () => (await supabase.from("products").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: outToday = [] } = useQuery({
    queryKey: ["out-today"],
    queryFn: async () => {
      const start = new Date(); start.setHours(0,0,0,0);
      const { data } = await supabase.from("outgoing_goods").select("id").gte("tanggal_keluar", start.toISOString());
      return data ?? [];
    },
  });
  const { data: recentOut = [] } = useQuery({
    queryKey: ["recent-out"],
    queryFn: async () => (await supabase.from("outgoing_goods").select("*, products(nama_barang, kode_barang)").order("tanggal_keluar", { ascending: false }).limit(5)).data ?? [],
  });

  const totalStock = products.reduce((s, p) => s + (p.stok || 0), 0);
  const lowStock = products.filter(p => p.stok <= p.stok_minimum);
  const expiring = products.filter(p => expiryStatus(p.tanggal_kadaluarsa) !== "ok");

  return (
    <div>
      <PageHeader title={`${t("welcome")}, ${nama || "User"} 👋`} subtitle={t("app_tagline")} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        <StatCard label={t("total_products")} value={products.length} icon={<Package className="size-5" />} />
        <StatCard label={t("total_stock")} value={totalStock} accent="success" icon={<Boxes className="size-5" />} />
        <StatCard label={t("low_stock")} value={lowStock.length} accent="destructive" icon={<AlertTriangle className="size-5" />} />
        <StatCard label={t("expiring")} value={expiring.length} accent="warning" icon={<CalendarClock className="size-5" />} />
        <StatCard label={t("transactions_today")} value={outToday.length} accent="primary" icon={<Receipt className="size-5" />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">{t("recent_transactions")}</h2>
            <Badge variant="muted">{recentOut.length}</Badge>
          </div>
          {recentOut.length === 0 ? <div className="text-sm text-muted-foreground py-8 text-center">{t("no_data")}</div> : (
            <div className="space-y-2">
              {recentOut.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between text-sm border-t pt-2 first:border-0 first:pt-0">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.products?.nama_barang}</div>
                    <div className="text-xs text-muted-foreground">{fmtDateTime(r.tanggal_keluar)} · {r.jenis_keluar}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold tabular-nums">−{r.jumlah}</div>
                    <div className="text-xs text-muted-foreground">{fmtIDR(r.hpp)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">{t("low_stock")}</h2>
            <Badge variant="destructive">{lowStock.length}</Badge>
          </div>
          {lowStock.length === 0 ? <div className="text-sm text-muted-foreground py-8 text-center">{t("no_data")}</div> : (
            <div className="space-y-2">
              {lowStock.slice(0, 6).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-sm border-t pt-2 first:border-0 first:pt-0">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.nama_barang}</div>
                    <div className="text-xs text-muted-foreground">{p.kode_barang}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-destructive tabular-nums">{p.stok} / {p.stok_minimum}</div>
                    <div className="text-[10px] text-destructive">{t("low_stock_warn")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {expiring.length > 0 && (
        <Card className="mt-6 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">{t("expiring_soon")}</h2>
            <Badge variant="warning">{expiring.length}</Badge>
          </div>
          <TableShell>
            <thead><tr><Th>{t("code")}</Th><Th>{t("name")}</Th><Th>{t("expiry")}</Th><Th>{t("stock_qty")}</Th></tr></thead>
            <tbody>
              {expiring.map((p: any) => {
                const st = expiryStatus(p.tanggal_kadaluarsa);
                return (
                  <tr key={p.id}>
                    <Td className="font-mono text-xs">{p.kode_barang}</Td>
                    <Td className="font-medium">{p.nama_barang}</Td>
                    <Td><Badge variant={st === "critical" ? "destructive" : "warning"}>{t("expiry_warn")} {fmtDate(p.tanggal_kadaluarsa)}</Badge></Td>
                    <Td>{p.stok}</Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        </Card>
      )}
    </div>
  );
}
