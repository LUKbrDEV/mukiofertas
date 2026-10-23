import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "online",
  });
}

export async function POST(req: NextRequest) {
  const update = await req.json();

  console.log(update);

  return NextResponse.json({
    ok: true,
  });
}