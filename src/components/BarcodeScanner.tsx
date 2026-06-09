import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";

export function BarcodeScanner({ open, onClose, onDetected }: { open: boolean; onClose: () => void; onDetected: (text: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!open || !ref.current) return;
    const elId = "barcode-scanner-region";
    ref.current.id = elId;
    const scanner = new Html5Qrcode(elId, { verbose: false });
    scannerRef.current = scanner;
    let stopped = false;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decoded) => {
          if (stopped) return;
          stopped = true;
          onDetected(decoded);
          scanner.stop().then(() => scanner.clear()).catch(() => {});
          onClose();
        },
        () => {},
      )
      .catch(() => {});
    return () => {
      stopped = true;
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
      }
    };
  }, [open, onClose, onDetected]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-background rounded-2xl p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Scan Barcode</h3>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-lg hover:bg-accent"><X className="size-4" /></button>
        </div>
        <div ref={ref} className="w-full aspect-video rounded-lg overflow-hidden bg-black" />
        <p className="text-xs text-muted-foreground mt-3 text-center">Arahkan kamera ke barcode produk</p>
      </div>
    </div>
  );
}
