import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/repository";

export async function GET() {
  return NextResponse.json(await getDashboardData());
}
