// The two tabs of a sign-up talk to each other: the one waiting on "Check your
// email", and the one the link opens. Client-only.
//
// A page cannot close a tab it did not open, so nothing here tries. The waiting
// tab moves itself on, and the link's tab is told whether one was waiting, so it
// can say "you can close this tab" only when the other tab really has moved on.

const CHANNEL = "grasp-email-confirmed";

type Message = "confirmed" | "moved-on";

function open(): BroadcastChannel | null {
  try {
    return typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL);
  } catch {
    return null;
  }
}

/** The waiting tab: `onConfirmed` runs when the link's tab announces itself. */
export function listenForConfirmation(onConfirmed: () => void): () => void {
  const channel = open();
  if (!channel) return () => undefined;
  channel.onmessage = (e: MessageEvent<Message>) => {
    if (e.data !== "confirmed") return;
    channel.postMessage("moved-on" satisfies Message);
    onConfirmed();
  };
  return () => channel.close();
}

/** The link's tab: resolves true if a waiting tab answered, false if none did. */
export function announceConfirmation(): Promise<boolean> {
  const channel = open();
  if (!channel) return Promise.resolve(false);
  return new Promise((resolve) => {
    const done = (answered: boolean) => {
      clearTimeout(timer);
      channel.close();
      resolve(answered);
    };
    const timer = setTimeout(() => done(false), 1500);
    channel.onmessage = (e: MessageEvent<Message>) => {
      if (e.data === "moved-on") done(true);
    };
    channel.postMessage("confirmed" satisfies Message);
  });
}
