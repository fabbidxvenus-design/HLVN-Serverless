# Excel Multi-Sheet Export

## Rule

Excel exports MUST use multi-sheet workbook format with consistent structure: Summary sheet (metadata + main fields), Sizes sheet (quantity table), Raw OCR sheet (full text), Image sheet (embedded image), and Billing sheet (token usage + cost).

## Sheet Structure

```typescript
// Sheet 1: Summary
// - Metadata: Title, Timestamp, Edited status
// - Main fields table: Field | Value | Confidence

// Sheet 2: Sizes
// - Quantity table: Size | Quantity

// Sheet 3: Raw OCR
// - Full OCR text output (unstructured)

// Sheet 4: Image
// - Embedded original image (resized to fit)

// Sheet 5: Billing
// - Token usage: Input tokens, Output tokens
// - Cost calculation: Per-token cost, Total cost
// - API key used
```

## Implementation

```typescript
import ExcelJS from 'exceljs';

export async function exportToExcel(scan: ScanRecord): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Field', key: 'field', width: 30 },
    { header: 'Value', key: 'value', width: 50 },
    { header: 'Confidence', key: 'confidence', width: 15 },
  ];

  // Add metadata
  summarySheet.addRow({ field: 'Title', value: scan.ocrStructured.title });
  summarySheet.addRow({ field: 'Timestamp', value: scan.timestamp.toISOString() });
  summarySheet.addRow({ field: 'Edited', value: scan.edited ? 'Yes' : 'No' });
  summarySheet.addRow({}); // Empty row

  // Add main fields
  scan.ocrStructured.fields.forEach(f => {
    summarySheet.addRow({
      field: f.field,
      value: f.value,
      confidence: f.confidence,
    });
  });

  // Style header
  styleHeader(summarySheet);

  // Sheet 2: Sizes
  const sizesSheet = workbook.addWorksheet('Sizes');
  sizesSheet.columns = [
    { header: 'Size', key: 'size', width: 20 },
    { header: 'Quantity', key: 'quantity', width: 15 },
  ];

  scan.ocrStructured.sizes.forEach(s => {
    sizesSheet.addRow({ size: s.size, quantity: s.quantity });
  });

  styleHeader(sizesSheet);

  // Sheet 3: Raw OCR
  const rawSheet = workbook.addWorksheet('Raw OCR');
  rawSheet.columns = [{ header: 'Raw Text', key: 'text', width: 100 }];
  rawSheet.addRow({ text: scan.ocrRaw });

  // Sheet 4: Image
  const imageSheet = workbook.addWorksheet('Image');
  if (scan.imageDataUrl) {
    const imageId = workbook.addImage({
      base64: scan.imageDataUrl.split(',')[1],
      extension: 'jpeg',
    });
    imageSheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 520, height: 400 }, // Max width constraint
    });
  }

  // Sheet 5: Billing
  const billingSheet = workbook.addWorksheet('Billing');
  billingSheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
  ];

  billingSheet.addRow({ metric: 'Input Tokens', value: scan.tokenUsage.input });
  billingSheet.addRow({ metric: 'Output Tokens', value: scan.tokenUsage.output });
  billingSheet.addRow({ metric: 'Total Cost', value: `$${scan.tokenUsage.cost.toFixed(4)}` });
  billingSheet.addRow({ metric: 'API Key Used', value: `Key ${scan.apiKeyIndex}` });

  styleHeader(billingSheet);

  // Generate blob
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// Helper: Style header row
function styleHeader(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }, // Blue
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;
}
```

## Why

**Problem**: Single-sheet exports lose structure. Users need both structured data (for analysis) and raw data (for verification). Images provide visual context. Billing data tracks costs.

**Solution**: Multi-sheet workbook separates concerns. Summary for quick review, Sizes for inventory, Raw OCR for debugging, Image for verification, Billing for cost tracking.

**Benefits**:
- Professional formatting (styled headers, proper column widths)
- Structured data easy to analyze (pivot tables, filters)
- Raw data preserved for verification
- Visual context with embedded image
- Cost transparency with billing sheet

## How to Apply

### Frontend (Mobile App)
1. Use ExcelJS library: `npm install exceljs`
2. Call `exportToExcel(scan)` to generate blob
3. Use Web Share API for mobile (best UX)
4. Fallback to download link for desktop

### Backend (Bulk Export)
1. Same ExcelJS library works in Node.js
2. Generate workbook for multiple scans (one sheet per scan, or aggregate)
3. Stream to S3 or return as download
4. Consider memory limits for large exports (>1000 scans)

### Styling
1. Use consistent colors: Blue headers (#2563EB), white text
2. Set column widths for readability (30-50 chars)
3. Bold headers, center alignment
4. Add empty rows between sections for clarity

## Exceptions

- **Bulk export**: Aggregate multiple scans into single Summary sheet (one row per scan)
- **No image**: Skip Image sheet if image not available
- **No sizes**: Skip Sizes sheet if no size data

---

**Source**: Adapted from `ocr-mobile-web/src/lib/excel.ts`  
**Library**: ExcelJS 4.4.0 (MIT license)  
**Last updated**: 2026-05-08
