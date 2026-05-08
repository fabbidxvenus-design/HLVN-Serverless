/**
 * Excel workbook generator for scan export.
 * Produces a multi-sheet XLSX workbook via exceljs:
 *   Sheet 1 — Summary (metadata + main fields)
 *   Sheet 2 — Sizes (size | quantity)
 *   Sheet 3 — Raw OCR (full text)
 *   Sheet 4 — Image (embedded image from URL)
 *   Sheet 5 — Billing (token usage + cost)
 */

import ExcelJS from "exceljs";
import type { OCRStructured, OCRSize, TokenUsage } from "@/types/scan";

export interface ExportScanRecord {
  id: string;
  userId: string;
  userEmail: string;
  timestamp: string;
  imageUrl: string | null;
  ocrRaw: string;
  ocrStructured: OCRStructured;
  tokenUsage: TokenUsage;
  apiKeyIndex: number;
}

interface SheetRow {
  [key: string]: unknown;
}

function addSheet(
  wb: ExcelJS.Workbook,
  name: string,
  headers: string[],
  rows: SheetRow[],
) {
  const ws = wb.addWorksheet(name);
  ws.addTable({
    name: `${name}_table`,
    ref: `A1:${String.fromCharCode(64 + headers.length)}${rows.length + 1}`,
    headerRow: true,
    columns: headers.map((h) => ({ name: h })),
    rows: rows.map((r) => headers.map((h) => r[h] ?? "")),
  });
  // Auto-fit columns (best effort: 80-char cap)
  ws.columns.forEach((col) => {
    col.width = Math.min(40, Math.max(10, (col.values?.length ?? 10) * 1.2));
  });
}

/** Fetch and buffer an image from a URL. */
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

/**
 * Build a multi-sheet Excel workbook from scan records.
 * Returns a Buffer ready for streaming as a file download.
 */
export async function buildExportWorkbook(
  records: ExportScanRecord[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "HLVN";
  wb.created = new Date();

  // ── Sheet 1: Summary ──────────────────────────────────────────────────────
  addSheet(
    wb,
    "Summary",
    ["ID", "User ID", "Email", "Timestamp", "Title", "Brand", "Product Type", "API Key Index"],
    records.map((r) => {
      const fields = r.ocrStructured?.fields ?? [];
      const get = (field: string) =>
        (fields.find((f) => f.field.toLowerCase() === field.toLowerCase())?.value) ?? "";
      return {
        ID: r.id,
        "User ID": r.userId,
        Email: r.userEmail,
        Timestamp: r.timestamp,
        Title: r.ocrStructured?.title ?? "",
        Brand: get("brand"),
        "Product Type": get("product type"),
        "API Key Index": r.apiKeyIndex,
      };
    }),
  );

  // ── Sheet 2: Sizes ────────────────────────────────────────────────────────
  const sizeRows: SheetRow[] = [];
  for (const r of records) {
    const sizes: OCRSize[] = r.ocrStructured?.sizes ?? [];
    if (sizes.length === 0) {
      sizeRows.push({ "Scan ID": r.id, Size: "", Quantity: "" });
    } else {
      for (const s of sizes) {
        sizeRows.push({ "Scan ID": r.id, Size: s.size, Quantity: s.quantity });
      }
    }
  }
  addSheet(wb, "Sizes", ["Scan ID", "Size", "Quantity"], sizeRows);

  // ── Sheet 3: Raw OCR ───────────────────────────────────────────────────────
  addSheet(
    wb,
    "Raw OCR",
    ["Scan ID", "Timestamp", "Raw OCR Text"],
    records.map((r) => ({
      "Scan ID": r.id,
      Timestamp: r.timestamp,
      "Raw OCR Text": r.ocrRaw,
    })),
  );

  // ── Sheet 4: Image ──────────────────────────────────────────────────────────
  const imageSheet = wb.addWorksheet("Image");
  imageSheet.columns = [
    { header: "Scan ID", key: "id", width: 36 },
    { header: "Timestamp", key: "timestamp", width: 24 },
    { header: "Image URL", key: "imageUrl", width: 60 },
    { header: "Status", key: "status", width: 20 },
  ];

  for (const r of records) {
    const row = imageSheet.addRow({
      id: r.id,
      timestamp: r.timestamp,
      imageUrl: r.imageUrl ?? "",
      status: r.imageUrl ? "Available" : "No Image",
    });

    if (r.imageUrl) {
      const buf = await fetchImageBuffer(r.imageUrl);
      if (buf) {
        const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        const imgId = wb.addImage({
          buffer: ab as ArrayBuffer,
          extension: "png",
        });
        imageSheet.addImage(imgId, {
          tl: { col: 3, row: imageSheet.rowCount - 1 },
          ext: { width: 120, height: 120 },
        });
      }
    }
  }
  imageSheet.getColumn(1).width = 36;
  imageSheet.getColumn(2).width = 24;
  imageSheet.getColumn(3).width = 60;
  imageSheet.getColumn(4).width = 20;

  // ── Sheet 5: Billing ───────────────────────────────────────────────────────
  addSheet(
    wb,
    "Billing",
    ["Scan ID", "Timestamp", "API Key Index", "Input Tokens", "Output Tokens", "Cost ($)", "Model"],
    records.map((r) => ({
      "Scan ID": r.id,
      Timestamp: r.timestamp,
      "API Key Index": r.apiKeyIndex,
      "Input Tokens": r.tokenUsage?.input ?? 0,
      "Output Tokens": r.tokenUsage?.output ?? 0,
      "Cost ($)": r.tokenUsage?.cost ?? 0,
      Model: r.tokenUsage?.model ?? "unknown",
    })),
  );

  const buffer = await wb.xlsx.writeBuffer();
  if (!buffer || typeof buffer === "string") {
    throw new Error("Failed to generate Excel workbook buffer");
  }
  // Write to Uint8Array and convert to Buffer for cross-environment compatibility
  const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer as ArrayBuffer);
  return Buffer.from(uint8);
}
