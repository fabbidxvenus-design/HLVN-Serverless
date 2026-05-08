/**
 * POST /api/export/excel
 * Generates and streams a multi-sheet XLSX workbook of scan records.
 * Auth: admin
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/rbac";
import { getScansForExport } from "@/lib/analytics/service";
import { buildExportWorkbook } from "@/lib/export/excel";
import { toApiError } from "@/lib/api/errors";

const MAX_EXPORT_ROWS = 1000;

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await getCurrentUser(req.headers.get("Authorization"));
  } catch {
    return NextResponse.json(
      { success: false, error: "Authentication required", code: "AUTH_FAILED" },
      { status: 401 },
    );
  }

  try {
    requireAdmin(user);
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json(
      { success: false, error: apiErr.message, code: apiErr.code },
      { status: apiErr.status },
    );
  }

  let body: { search?: string; userId?: string; from?: string; to?: string };
  try {
    body = await req.json() as { search?: string; userId?: string; from?: string; to?: string };
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  // Build filter range
  const range = {
    ...(body.from !== undefined ? { from: body.from } : {}),
    ...(body.to !== undefined ? { to: body.to } : {}),
  };

  // If userId filter provided, verify admin owns the filter intent
  // (repository already reads as admin, so this is just a logical check)

  try {
    // TODO: Apply search/userId filter in query — for MVP fetch all in range, cap at 1000
    const scans = await getScansForExport(range);
    const capped = scans.slice(0, MAX_EXPORT_ROWS);

    const buf = await buildExportWorkbook(capped);

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="hlvn-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        "Content-Length": String(buf.byteLength),
      },
    });
  } catch (err) {
    const apiErr = toApiError(err);
    return NextResponse.json(
      { success: false, error: apiErr.message, code: apiErr.code },
      { status: apiErr.status },
    );
  }
}
