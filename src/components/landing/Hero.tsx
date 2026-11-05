import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUpRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CollaborationScene } from "./CollaborationScene";

export function SiteNav() {
  return <nav className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-5 sm:gap-4 sm:px-10" aria-label="Main navigation">
    <Link to="/" className="flex shrink-0 items-center gap-2 font-display text-xl font-semibold"><Layers className="size-5 text-primary"/>WebCraft<span className="-ml-2 text-primary">.</span></Link>
    <div className="flex items-center gap-2 text-sm sm:gap-6">
      <Link to="/about" className="hidden text-muted-foreground transition-colors hover:text-foreground min-[400px]:block">About</Link>
      <Link to="/terms" className="hidden text-muted-foreground transition-colors hover:text-foreground sm:block">Terms</Link>
      <ThemeToggle/>
      <Button asChild variant="outline" className="rounded-md"><Link to="/auth">Sign in <ArrowUpRight/></Link></Button>
    </div>
  </nav>;
}

export function Hero() {
  return <section className="landing-hero">
    <SiteNav/>
    <div className="relative z-10 mx-auto max-w-5xl px-6 pt-8 text-center sm:pt-10">
      <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase"><span className="size-1.5 rounded-full bg-primary"/>The collaborative website studio</p>
      <h1 className="landing-title font-semibold">WebCraft<span className="text-primary">.</span></h1>
      <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">Your ideas. One shared canvas.<br/>Build exceptional websites, together in real time.</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg" className="h-11 px-6"><Link to="/auth">Start creating <ArrowUpRight/></Link></Button>
        <Button asChild variant="outline" size="lg" className="h-11 px-6"><a href="#templates">Explore templates <ArrowDown/></a></Button>
      </div>
    </div>
    <CollaborationScene/>
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t px-6 py-5 text-xs text-muted-foreground sm:px-10"><span>FROM FIRST IDEA TO PUBLISHED WEBSITE</span><span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-primary"/>Made to work together.</span></div>
  </section>;
}

export function SiteFooter() {
  return <footer className="border-t"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-6 py-8 text-xs text-muted-foreground sm:px-10"><Link to="/" className="font-display text-base font-semibold text-foreground">WebCraft.</Link><span>© {new Date().getFullYear()} WebCraft</span><div className="flex gap-6"><Link to="/about">About</Link><Link to="/terms">Terms & Conditions</Link></div></div></footer>;
}
