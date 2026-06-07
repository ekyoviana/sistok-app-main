import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-xl border bg-card shadow-sm", className)}>{children}</div>;
}

export function StatCard({ label, value, accent = "primary", icon }: {
  label: string; value: ReactNode; accent?: "primary" | "destructive" | "warning" | "success" | "muted"; icon?: ReactNode;
}) {
  const accentMap = {
    primary: "bg-primary/10 text-primary",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/15 text-warning-foreground",
    success: "bg-success/10 text-success",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
        </div>
        {icon && <div className={cn("size-10 rounded-lg grid place-items-center shrink-0", accentMap[accent])}>{icon}</div>}
      </div>
    </Card>
  );
}

export function Badge({ children, variant = "default" }: { children: ReactNode; variant?: "default" | "destructive" | "warning" | "success" | "muted" }) {
  const map = {
    default: "bg-primary/10 text-primary",
    destructive: "bg-destructive/15 text-destructive",
    warning: "bg-warning/20 text-warning-foreground",
    success: "bg-success/15 text-success",
    muted: "bg-muted text-muted-foreground",
  };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium", map[variant])}>{children}</span>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring", props.className)} />;
}

export function Button({ variant = "primary", className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" | "destructive" }) {
  const v = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
    outline: "border bg-background hover:bg-accent",
    ghost: "hover:bg-accent",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  }[variant];
  return <button {...p} className={cn("inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none", v, className)} />;
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <label className={cn("text-sm font-medium text-foreground/80 mb-1.5 block", className)}>{children}</label>;
}

export function Modal({ open, onClose, title, children, size = "md" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: "md" | "lg" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/50" onClick={onClose}>
      <div className={cn("bg-card rounded-2xl shadow-2xl w-full overflow-hidden", size === "lg" ? "max-w-2xl" : "max-w-md")} onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </Card>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground px-4 py-3 bg-muted/40", className)}>{children}</th>;
}
export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 border-t", className)}>{children}</td>;
}
