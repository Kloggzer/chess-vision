import { coverageResponse } from "@/lib/capture-plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return coverageResponse(request);
}
