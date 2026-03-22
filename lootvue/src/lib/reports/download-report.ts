/**
 * download-report.ts — Triggers a browser download of a generated PDF blob.
 *
 * Must be called from a "use client" context only. The heavy PDF render
 * runs in-browser so the server is never involved.
 *
 * Usage:
 *   import { downloadInvestmentMemo } from "@/lib/reports/download-report";
 *   await downloadInvestmentMemo({ address, verdict, score, metrics, generatedAt });
 */

// Import type only — the actual PDF modules are lazy-loaded at runtime to
// avoid SSR bundling issues with @react-pdf/renderer.
import type { InvestmentMemoPDFProps } from "./investment-memo-pdf";

export type { InvestmentMemoPDFProps };

/**
 * Generates and downloads a PDF investment memo as a browser file download.
 *
 * @throws If the PDF generation fails or the browser download API is unavailable.
 */
export async function downloadInvestmentMemo(props: InvestmentMemoPDFProps): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("downloadInvestmentMemo must be called in a browser context.");
  }

  // Lazy-import to keep this module out of the server bundle.
  const { generateMemoPDF } = await import("./investment-memo-pdf");

  let blob: Blob;
  try {
    blob = await generateMemoPDF(props);
  } catch (err) {
    console.error("[download-report] PDF generation failed:", err);
    throw new Error("Unable to generate PDF. Please try again.");
  }

  triggerDownload(blob, buildFilename(props));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Builds a filesystem-safe filename from the address and date.
 * Example: "LootVue_Memo_123-Main-St_2026-03-22.pdf"
 */
function buildFilename(props: InvestmentMemoPDFProps): string {
  const slug = props.address
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);

  const date = new Date(props.generatedAt).toISOString().slice(0, 10); // YYYY-MM-DD
  return `LootVue_Memo_${slug}_${date}.pdf`;
}

/**
 * Creates a temporary anchor element and programmatically clicks it to trigger
 * the browser's native file-save dialog. Cleans up immediately after.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();

  // Defer cleanup — revoking too early can abort the download on some browsers.
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
  }, 250);
}
