// Changes or ends the admin override for this browser (lib/admin.ts). Only a
// browser that has already unlocked /admin can change it.

import { NextRequest, NextResponse } from "next/server";
import { adminConfigured, clearAdmin, readAdmin, writeAdmin } from "@/lib/admin";
import { isPlan } from "@/lib/plan";

const notFound = () => NextResponse.json({ error: "Not found." }, { status: 404 });

export async function PATCH(req: NextRequest) {
  if (!adminConfigured()) return notFound();
  const current = await readAdmin();
  if (!current) {
    return NextResponse.json({ error: "Admin is locked. Enter the password again." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const state = {
    plan: body.plan === null ? null : isPlan(body.plan) ? body.plan : current.plan,
    unlimited: typeof body.unlimited === "boolean" ? body.unlimited : current.unlimited,
  };
  await writeAdmin(state);
  return NextResponse.json({ state });
}

export async function DELETE() {
  if (!adminConfigured()) return notFound();
  await clearAdmin();
  return NextResponse.json({ ok: true });
}
