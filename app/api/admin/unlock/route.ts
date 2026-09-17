// Unlocks /admin for this browser. The password is ADMIN_PASSWORD; see lib/admin.ts.

import { NextRequest, NextResponse } from "next/server";
import { ADMIN_DEFAULT, adminConfigured, passwordMatches, readAdmin, writeAdmin } from "@/lib/admin";
import { authRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: "Admin is not set up on this server. Set ADMIN_PASSWORD and restart." },
      { status: 503 }
    );
  }

  const gate = await authRateLimit("admin", req, "admin");
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (!passwordMatches(password)) {
    await gate.record();
    return NextResponse.json({ error: "That password is incorrect." }, { status: 401 });
  }

  // Unlocking again keeps whatever was already switched on.
  const state = (await readAdmin()) ?? ADMIN_DEFAULT;
  await writeAdmin(state);
  return NextResponse.json({ state });
}
