import { NextResponse } from "next/server";
import { readRequestFlows } from "@mukul-escion/request-flow/viewer/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  if (process.env.REQUEST_FLOW_VIEWER_ENABLED !== "true") {
    return NextResponse.json({ message: "Request-flow viewer is disabled" }, { status: 404 });
  }
  // In production, replace this explicit flag with your application's admin/session check.
  if (process.env.NODE_ENV === "production" && process.env.REQUEST_FLOW_VIEWER_ALLOW_PRODUCTION !== "true") {
    return NextResponse.json({ message: "Request-flow viewer requires administrator authorization" }, { status: 403 });
  }
  const search = new URL(request.url).searchParams;
  const result = await readRequestFlows({
    directories: (process.env.REQUEST_FLOW_VIEW_DIRECTORIES || process.env.REQUEST_FLOW_LOG_DIRECTORY || "logs/flows").split(","),
    requestId: search.get("request_id") || undefined,
    limit: Number(search.get("limit") || 100)
  });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
