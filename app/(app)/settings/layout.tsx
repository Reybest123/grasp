// Only here to name the browser tab; the page itself is a client component and
// cannot export metadata.
export const metadata = { title: "Settings" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
