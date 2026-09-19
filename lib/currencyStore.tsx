"use client";

// The currency the client side draws prices in (lib/currency.ts).
//
// Handed down from a server layout rather than worked out here, because the
// answer depends on request headers and on the account's stored currency,
// neither of which the browser has. Passing it in also means the plan cards
// render in the right currency on the very first paint instead of showing USD
// and correcting themselves once a fetch lands.

import { createContext, useContext } from "react";
import { DEFAULT_CURRENCY, type Currency } from "@/lib/currency";

const CurrencyContext = createContext<Currency>(DEFAULT_CURRENCY);

export function CurrencyProvider({
  currency,
  children,
}: {
  currency: Currency;
  children: React.ReactNode;
}) {
  return <CurrencyContext.Provider value={currency}>{children}</CurrencyContext.Provider>;
}

/** Falls back to the default outside a provider, so a stray caller shows a price rather than throwing. */
export function useCurrency(): Currency {
  return useContext(CurrencyContext);
}
