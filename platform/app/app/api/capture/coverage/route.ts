import { coverageResponse } from "@/lib/capture-plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TODO: ohne `try` verlaesst ein kaputter Bericht die Route als Rejection — das Handy bekommt
// Next' HTML-500 statt des `{error}`-Rumpfs, den jede Schwester-Route liefert.
export function GET(request: Request) {
  return coverageResponse(request);
}
