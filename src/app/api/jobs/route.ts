import type { NextRequest } from "next/server";
import { searchJobs } from "@/lib/jobtech";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const result = await searchJobs({
    field: params.get("field") ?? undefined,
    q: params.get("q") ?? undefined,
    page: Number(params.get("page") ?? 0),
  });
  return Response.json(result);
}
