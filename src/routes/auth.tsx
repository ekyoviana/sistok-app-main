import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { Boxes, Languages } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ ssr: false, component: AuthPage });

function AuthPage() {
  const { user } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("success_saved"));
    navigate({ to: "/dashboard" });
  };

  const fillDemo = (e: string) => { setEmail(e); setPwd("demo1234"); };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground relative overflow-hidden">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="size-12 rounded-2xl bg-white/15 backdrop-blur grid place-items-center">
            <Boxes className="size-6" />
          </div>
          <div>
            <div className="font-bold text-xl tracking-tight">{t("app_name")}</div>
            <div className="text-xs opacity-80">{t("app_tagline")}</div>
          </div>
        </div>
        <div className="relative">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Aplikasi Stok Barang<br />untuk Meningkatkan<br />Pengelolaan Persediaan UMKM
          </h2>
          <p className="mt-4 text-primary-foreground/80 max-w-md">
            Pantau barang masuk, keluar, penyesuaian, dan kadaluarsa dalam satu dasbor yang bersih.
          </p>
        </div>
        <div className="relative text-xs opacity-70">© {new Date().getFullYear()} SIStok · Tugas ADS</div>

      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12 relative">
        <button onClick={() => setLang(lang === "id" ? "en" : "id")}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-accent">
          <Languages className="size-3.5" /> {lang.toUpperCase()}
        </button>

        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden flex items-center gap-2 mb-2">
            <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold">SI</div>
            <span className="font-bold">{t("app_name")}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("login")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("login_subtitle")}</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("email")}</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t("password")}</label>
              <input required type="password" value={pwd} onChange={e => setPwd(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="••••••••" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90 transition disabled:opacity-50">
            {loading ? "..." : t("login_btn")}
          </button>

          <div className="rounded-xl border bg-muted/40 p-3 space-y-1.5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Akun Demo</div>
            {[
              { e: "admin@demo.com", r: t("role_admin") },
              { e: "gudang@demo.com", r: t("role_gudang") },
              { e: "kasir@demo.com", r: t("role_kasir") },
            ].map(d => (
              <button type="button" key={d.e} onClick={() => fillDemo(d.e)}
                className="w-full text-left text-xs flex items-center justify-between px-2 py-1.5 rounded hover:bg-background transition">
                <span className="font-mono">{d.e}</span>
                <span className="text-muted-foreground">{d.r}</span>
              </button>
            ))}
            <div className="text-[11px] text-muted-foreground pt-1">Password: <span className="font-mono">demo1234</span></div>
          </div>
        </form>
      </div>
    </div>
  );
}
