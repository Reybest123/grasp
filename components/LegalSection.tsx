export function LegalSection({
  title,
  id,
  children,
}: {
  title: string;
  /** an anchor other pages can link to, e.g. /legal/terms#refunds */
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="mt-3 space-y-3 leading-7 text-slate-700 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}
