import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav, SiteFooter } from "@/components/landing/Hero";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — WebCraft" },
      { name: "description", content: "Why we built WebCraft: a website builder where whole teams edit the same page at the same time." },
      { property: "og:title", content: "About — WebCraft" },
      { property: "og:description", content: "The story and principles behind WebCraft's live, collaborative website builder." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: About,
});

const POINTS = [
  ["Live by default", "Every edit, cursor and chat message appears for your teammates instantly."],
  ["Element-level locks", "Only the block you're editing is reserved — never the whole page."],
  ["Real code out", "The code viewer updates as you build, and exports clean HTML, CSS and JS."],
];

function About() {
  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">About</p>
        <h1 className="text-5xl leading-tight">Websites are team work. Tools should be too.</h1>
        <p className="mt-6 text-lg text-muted-foreground">WebCraft started from a simple frustration: waiting for someone else to close the page before you could change it. We built a visual builder where designers, developers and writers work side by side — on the same canvas, in real time.</p>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {POINTS.map(([t, d]) => (
            <div key={t} className="rounded-lg border p-5"><h3 className="text-lg">{t}</h3><p className="mt-2 text-sm text-muted-foreground">{d}</p></div>
          ))}
        </div>
        <Button asChild size="lg" className="mt-12"><Link to="/auth">Start building</Link></Button>
      </main>
      <SiteFooter />
    </div>
  );
}
