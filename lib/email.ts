// Sending mail, through Resend. Server-side only.
//
// A raw fetch rather than Resend's SDK, the same way lib/openai.ts talks to
// OpenAI: one endpoint, and no dependency to keep up to date for it. The
// provider's response is logged here and never returned, so a failure can
// never put the API key or account details in front of a student.

type Mail = { to: string; subject: string; html: string; text: string };

/**
 * Resend's shared test sender works with no domain set up, but it only
 * delivers to the address the Resend account was made with. Real students
 * need EMAIL_FROM on a domain verified in Resend.
 */
const DEFAULT_FROM = "Grasp <onboarding@resend.dev>";

export async function sendEmail(mail: Mail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[grasp] RESEND_API_KEY is not set");
    return false;
  }

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || DEFAULT_FROM, ...mail }),
    });
  } catch (err) {
    console.error("[grasp] Resend request failed:", err);
    return false;
  }

  if (!res.ok) {
    console.error(`[grasp] Resend ${res.status}:`, await res.text());
    return false;
  }
  return true;
}

/** For putting a student's own name into email HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
