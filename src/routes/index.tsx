import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Code2, MousePointer2, PanelsTopLeft, Search } from "lucide-react";
import { TemplateGallery } from "@/components/WorkspaceGallery";
import type { SiteTemplate } from "@/lib/siteTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Hero, SiteFooter } from "@/components/landing/Hero";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "WebCraft — Your collaborative website studio" },
    { name: "description", content: "Bring your ideas to life in WebCraft. Create websites on one shared canvas, collaborate in real time, and start with a thoughtfully designed template." },
    { property: "og:title", content: "WebCraft — Your collaborative website studio" },
    { property: "og:description", content: "Your ideas. One shared canvas. Build exceptional websites together in real time." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Landing,
});

function Landing() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const pick = (template: SiteTemplate) => {
    sessionStorage.setItem("webcraft:pending-template", template.id);
    navigate({ to: "/auth" });
  };
  return <div className="landing-page">
    <Hero/>
    <section className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4"><h2 className="text-3xl font-semibold sm:text-4xl">A better way to make.</h2><p className="max-w-sm text-sm leading-relaxed text-muted-foreground">Less back-and-forth. More room for good ideas.</p></div>
      <div className="grid gap-8 md:grid-cols-3">{[
        { icon: MousePointer2, number: "01", title: "Create in company.", text: "Work on the same page at the same time. Each person has space to make their next move." },
        { icon: PanelsTopLeft, number: "02", title: "Give ideas structure.", text: "Compose your page with flexible layouts, reusable blocks, and your own design details." },
        { icon: Code2, number: "03", title: "Keep the code close.", text: "See your design become HTML, CSS, and JavaScript as you work. Take it with you when you're ready." },
      ].map(({ icon: Icon, number, title, text }) => <div key={number} className="border-t pt-6"><div className="mb-7 flex items-center justify-between"><Icon className="size-6 text-primary"/><span className="font-mono text-xs text-muted-foreground">{number}</span></div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{text}</p></div>)}</div>
    </section>
    <section id="templates" className="landing-templates scroll-mt-6 border-y">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6"><div><p className="mb-3 text-xs font-semibold uppercase text-primary">A starting point, not a limit</p><h2 className="text-3xl font-semibold sm:text-4xl">Make it your own.</h2></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input aria-label="Search templates" placeholder="Find a template…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 bg-card pl-10"/></div></div>
        <TemplateGallery search={search} onPick={pick} featured={false}/>
      </div>
    </section>
    <section className="landing-invitation"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8 px-6 py-16 sm:px-10 sm:py-20"><div><p className="mb-4 text-xs uppercase text-muted-foreground">The next great website is yours</p><h2 className="text-3xl font-semibold sm:text-5xl">Let’s make something.</h2></div><Button asChild size="lg" className="h-12 px-6"><Link to="/auth">Open your studio <ArrowUpRight/></Link></Button></div></section>
    <SiteFooter/>
  </div>;
}
