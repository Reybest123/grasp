// The one way Grasp shows that something went wrong: a red strip with the alert
// icon and a plain sentence. Every form, panel and tab uses this rather than
// drawing its own, so an error looks the same wherever the student meets it.
//
// Forms that use it also set `noValidate`, so the browser's own validation
// bubbles ("Please include an '@' in the email address") never appear in its
// place.

import { AlertIcon, CloseIcon } from "@/components/icons";

export function ErrorNote({
  message,
  className = "",
  onDismiss,
}: {
  message: string;
  className?: string;
  /** shows a close button when set */
  onDismiss?: () => void;
}) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700 ${className}`}
    >
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-my-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-red-400 transition hover:bg-red-100 hover:text-red-700"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
