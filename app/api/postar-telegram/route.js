import { exec } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

const execAsync = promisify(exec);

export async function GET() {
  try {
    const { stdout, stderr } = await execAsync(
      "node scripts/postar-telegram.mjs"
    );

    return NextResponse.json({
      ok: true,
      stdout,
      stderr,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        erro: error.message,
      },
      { status: 500 }
    );
  }
}