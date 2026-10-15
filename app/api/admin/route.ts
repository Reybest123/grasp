// Changes or clears the admin override for this browser (lib/admin.ts).

import { NextRequest, NextResponse } from "next/server";
import { adminConfigured, clearAdmin, readAdmin, writeAdmin } from "@/lib/admin";
import { isBilledPlan } from "@/lib/plan";

const notFound = () => NextResponse.json({ error: "Not found." }, { status: 404 });

export async function PATCH(req: NextRequest) {
  const current = await readAdmin();
  if (!current) return notFound();

  const body = await req.json().catch(() => ({}));
  const state = {
    plan: body.plan === null ? null : isBilledPlan(body.plan) ? body.plan : current.plan,
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
