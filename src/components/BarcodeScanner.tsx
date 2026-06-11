import { useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function BarcodeScanner({ open, onClose, onDetected }: { open: boolean; onClose: () => void; onDetected: (text: string) => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const detectedRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onDetectedRef.current = onDetected; }, [onDetected]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open || !ref.current) return;
    detectedRef.current = false;
    const elId = `barcode-scanner-${Date.now()}`;
    ref.current.id = elId;

    const formats = [
      Html5QrcodeSupportedFormats.QR_CODE,
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.CODE_93,
      Html5QrcodeSupportedFormats.ITF,
      Html5QrcodeSupportedFormats.CODABAR,
    ];

    const scanner = new Html5Qrcode(elId, { verbose: false, formatsToSupport: formats });
    scannerRef.current = scanner;

    const stopAndClear = async () => {
      try {
        if (scanner.isScanning) await scanner.stop();
      } catch {}
      try { scanner.clear(); } catch {}
    };

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decoded) => {
          if (detectedRef.current) return;
          detectedRef.current = true;
          const text = (decoded ?? "").trim();
          stopAndClear().finally(() => {
            onDetectedRef.current(text);
            onCloseRef.current();
          });
        },
        () => {},
      )
      .catch((err) => {
        console.error("Scanner start failed:", err);
      });

    return () => {
      detectedRef.current = true;
      stopAndClear();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-background rounded-2xl p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">{t("scan_barcode")}</h3>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-lg hover:bg-accent"><X className="size-4" /></button>
        </div>
        <div ref={ref} className="w-full aspect-video rounded-lg overflow-hidden bg-black" />
        <p className="text-xs text-muted-foreground mt-3 text-center">{t("aim_camera")}</p>
      </div>
    </div>
  );
}
