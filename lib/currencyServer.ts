// Working out a student's currency on the server (lib/currency.ts).
//
// Split from lib/currency.ts because this reaches for `next/headers`, which a
// client component cannot import — and the currency table, the country map and
// the formatting are all needed on both sides.

import { headers } from "next/headers";
import { currencyFromHeaders, isCurrency, type Currency } from "@/lib/currency";
import { currentUser, type SessionUser } from "@/lib/session";

/**
 * The currency to charge and to show, in that order of authority:
 *
 *  1. What the account is already billed in. A Stripe subscription cannot
 *     change currency once it exists, so an account that has ever checked out
 *     is committed — showing it a price in anything else would be a figure it
 *     could never actually be charged.
 *  2. Otherwise, where the request appears to come from.
 *
 * Takes the user when the caller already has one (every guarded layout does),
 * so this costs no extra query on a page render.
 */
export async function resolveCurrency(user?: SessionUser | null): Promise<Currency> {
  const known = user === undefined ? await currentUser() : user;
  if (known && isCurrency(known.currency)) return known.currency;
  return currencyFromHeaders(await headers());
}
