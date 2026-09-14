import { ErrorScreen } from "@/components/ErrorScreen";

export const metadata = { title: "Page not found — Grasp" };

/** Any URL that matches no route, in place of Next's bare "404" page. */
export default function NotFound() {
  return (
    <ErrorScreen
      framed
      kind="missing"
      title="This page does not exist"
      body="The link may be old or mistyped. Your notebooks are all still on your home page."
    />
  );
}
