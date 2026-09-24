// Unlocks /admin for this browser. The password is ADMIN_PASSWORD; see lib/admin.ts.

import { NextRequest, NextResponse } from "next/server";
import { ADMIN_DEFAULT, adminConfigured, passwordMatches, readAdmin, writeAdmin } from "@/lib/admin";
import { authRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // Not on graspstudy.com: ADMIN_PASSWORD is only set on the staging site.
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const gate = await authRateLimit("admin", req, "admin");
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (!passwordMatches(password)) {
    await gate.record();
    return NextResponse.json({ error: "That password is incorrect." }, { status: 401 });
  }

  await gate.release();
  // Unlocking again keeps whatever was already switched on.
  const state = (await readAdmin()) ?? ADMIN_DEFAULT;
  await writeAdmin(state);
  return NextResponse.json({ state });
}
