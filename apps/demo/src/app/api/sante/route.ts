import { NextResponse } from "next/server";

// Health probe of the container ("santé": the path the hosting platform's
// probes expect). It only says the server process answers: the demo has no
// database or upstream to check. Never cached, so that no intermediary can
// answer "healthy" on behalf of a server that is down.
export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
