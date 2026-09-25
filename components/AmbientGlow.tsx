/**
 * The soft orange light behind every page: one warm glow top right, a fainter
 * one low on the left, and a trace of blue between them so the orange does not
 * read as a stain.
 *
 * Mounted once in the root layout, fixed to the viewport and behind everything
 * (`-z-10`, over the body's own colour, which the browser paints on the canvas
 * below all content). So it stays put as a page scrolls and does not move when
 * the page changes. A page only shows it if it leaves its own background
 * transparent — full-page wrappers should not repaint `bg-slate-50`, which the
 * body already carries.
 */
export function AmbientGlow() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -right-48 -top-40 h-[46rem] w-[56rem] rounded-full bg-[radial-gradient(closest-side,theme(colors.brand.200/.75),transparent)] blur-2xl" />
      <div className="absolute -bottom-56 -left-56 h-[40rem] w-[50rem] rounded-full bg-[radial-gradient(closest-side,theme(colors.brand.200/.5),transparent)] blur-2xl" />
      <div className="absolute -left-40 top-1/4 h-[28rem] w-[36rem] rounded-full bg-[radial-gradient(closest-side,theme(colors.sky.200/.35),transparent)] blur-2xl" />
    </div>
  );
}
