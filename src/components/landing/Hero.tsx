import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowDown, ArrowUpRight, Layers, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroScene = lazy(() => import("./HeroScene"));

export function SiteNav() {
  return <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-6 sm:px-10" aria-label="Main navigation">
    <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold"><Layers className="size-6 text-primary"/>WebCraft</Link>
    <div className="flex items-center gap-5 text-sm sm:gap-8">
      <Link to="/about" className="text-muted-foreground transition-colors hover:text-foreground">About</Link>
      <Link to="/terms" className="hidden text-muted-foreground transition-colors hover:text-foreground sm:block">Terms</Link>
      <Button asChild variant="outline" className="rounded-md"><Link to="/auth">Sign in <ArrowUpRight/></Link></Button>
    </div>
  </nav>;
}

export function Hero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <section className="landing-hero overflow-hidden">
    <SiteNav/>
    <div className="relative z-10 mx-auto max-w-5xl px-6 pt-8 text-center sm:pt-10">
      <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]"><span className="size-1.5 rounded-full bg-primary"/>The collaborative website studio</p>
      <h1 className="landing-title font-semibold">WebCraft<span className="text-primary">.</span></h1>
      <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">Your ideas. One shared canvas.<br/>Build exceptional websites, together in real time.</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg" className="h-11 px-6"><Link to="/auth">Start creating <ArrowUpRight/></Link></Button>
        <Button asChild variant="outline" size="lg" className="h-11 px-6"><a href="#templates">Explore templates <ArrowDown/></a></Button>
      </div>
    </div>
    <div className="landing-scene relative mx-auto w-full max-w-6xl" role="img" aria-label="A dimensional preview of a website built with WebCraft">
      {mounted && <Suspense fallback={null}><HeroScene/></Suspense>}
      <span className="landing-cursor pointer-events-none absolute left-[18%] top-[38%] hidden items-center gap-1 text-primary sm:flex"><MousePointer2 className="size-5 fill-primary"/><span className="rounded-sm bg-primary px-2 py-1 text-xs text-primary-foreground">Designer</span></span>
      <span className="landing-cursor pointer-events-none absolute bottom-[22%] right-[14%] hidden items-center gap-1 text-foreground sm:flex"><MousePointer2 className="size-5 fill-foreground"/><span className="rounded-sm bg-foreground px-2 py-1 text-xs text-background">Developer</span></span>
    </div>
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t px-6 py-5 text-xs text-muted-foreground sm:px-10"><span>FROM FIRST IDEA TO PUBLISHED WEBSITE</span><span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-primary"/>Made to work together.</span></div>
  </section>;
}

export function SiteFooter() {
  return <footer className="border-t"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-6 py-8 text-xs text-muted-foreground sm:px-10"><Link to="/" className="font-display text-base font-semibold text-foreground">WebCraft.</Link><span>© {new Date().getFullYear()} WebCraft</span><div className="flex gap-6"><Link to="/about">About</Link><Link to="/terms">Terms & Conditions</Link></div></div></footer>;
}
