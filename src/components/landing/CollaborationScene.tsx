import { useEffect, useRef } from "react";
import { ArrowUpRight, Check, Code2, Layers, MousePointer2, Plus } from "lucide-react";
import productImage from "@/assets/studio-product.jpg";

/** An illustrative, scroll-linked collaboration sequence, not a live editing session. */
export function CollaborationScene() {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const progress = media.matches ? 1 : Math.max(0, Math.min(1, (window.innerHeight * 0.2 - rect.top) / Math.max(1, rect.height - window.innerHeight * 0.8)));
      element.style.setProperty("--assembly-progress", String(progress));
      element.dataset['step'] = String(Math.min(4, Math.floor(progress * 5)));
      for (let step = 0; step < 5; step++) {
        element.style.setProperty(`--reveal-${step}`, String(Math.max(0, Math.min(1, (progress - step * 0.17) / 0.13))));
      }
      const positions = [
        [12 + progress * 50, 22 + Math.sin(progress * Math.PI * 2) * 12],
        [82 - progress * 22, 65 - Math.sin(progress * Math.PI) * 32],
        [28 + progress * 38, 78 - progress * 12],
      ];
      positions.forEach(([x, y], i) => {
        element.style.setProperty(`--cursor-${i}-x`, `${x}%`);
        element.style.setProperty(`--cursor-${i}-y`, `${y}%`);
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    media.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      media.removeEventListener("change", schedule);
    };
  }, []);

  return <section ref={section} className="collaboration-scroll" data-step="0" aria-label="Scroll-driven illustration of collaborators building a website">
    <div className="collaboration-sticky">
      <div className="assembly-caption"><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary"/>ONE CANVAS. MANY GOOD IDEAS.</span><span className="assembly-stage"><span>Start with a blank canvas</span><span>Give it a little character</span><span>Bring the picture into focus</span><span>Make every detail yours</span><span>Something great, made together</span></span></div>
      <div className="assembly-workspace">
        <div className="assembly-toolbar"><span className="flex items-center gap-2"><Layers className="size-4"/>Common Ground <span className="text-muted-foreground">/ Home</span></span><div className="flex items-center gap-3"><div className="assembly-avatars" aria-label="Three illustrative collaborators"><span>A</span><span>J</span><span>M</span></div><span className="assembly-done"><Check className="size-3"/>Ready to publish</span><Code2 className="size-4 text-muted-foreground"/></div></div>
        <div className="assembly-body">
          <aside className="assembly-layers" aria-hidden="true"><p>Layers <Plus className="size-3"/></p>{["Navigation", "Headline", "Collection image", "Product details", "Footer"].map((label, i) => <div key={label} className={`assembly-layer assembly-piece piece-${i}`}><Layers className="size-3"/>{label}</div>)}</aside>
          <div className="assembly-canvas">
            <div className="assembled-website">
              <div className="sample-nav assembly-piece piece-0"><strong>COMMON GROUND®</strong><span>Objects &nbsp; Studio &nbsp; Journal <ArrowUpRight className="inline size-3"/></span></div>
              <div className="sample-heading assembly-piece piece-1"><h2>Less noise.<br/>More presence.</h2><div><p>Thoughtful objects.<br/>A little more everyday joy.</p><span className="sample-link">Explore collection <ArrowUpRight className="size-4"/></span></div></div>
              <div className="sample-image assembly-piece piece-2"><img src={productImage} alt="Sculptural everyday objects arranged in a studio"/><span>THE EVERYDAY COLLECTION — 2026</span></div>
              <div className="sample-details assembly-piece piece-3"><span>Made with intention.</span><span>Objects worth keeping. Stories worth sharing.</span><ArrowUpRight className="size-5"/></div>
              <div className="sample-footer assembly-piece piece-4"><span>COMMON GROUND®</span><span>A considered way of living.</span></div>
            </div>
            <div className="assembly-selection" aria-hidden="true"><span/><span/><span/><span/></div>
            {["Alex", "Jamie", "Morgan"].map((name, i) => <div key={name} className={`assembly-cursor cursor-${i}`} aria-hidden="true"><MousePointer2/><span>{name}</span></div>)}
          </div>
        </div>
      </div>
      <div className="assembly-progress" aria-hidden="true"><span/></div>
    </div>
  </section>;
}