import { createFileRoute } from "@tanstack/react-router";
import { SiteNav, SiteFooter } from "@/components/landing/Hero";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — WebCraft" },
      { name: "description", content: "The terms and conditions for using WebCraft, the collaborative website builder." },
      { property: "og:title", content: "Terms & Conditions — WebCraft" },
      { property: "og:description", content: "Read the rules for using WebCraft accounts, projects and published sites." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
});

const SECTIONS: [string, string][] = [
  ["1. Accepting these terms", "By creating an account or using WebCraft you agree to these Terms & Conditions. If you don't agree, please don't use the service."],
  ["2. Your account", "You're responsible for keeping your login details safe and for all activity under your account. You must provide accurate information when signing up."],
  ["3. Your content", "You own the sites, text and images you create. You give WebCraft permission to store and display them so the service can work, including sharing them with collaborators you invite."],
  ["4. Acceptable use", "Don't use WebCraft to publish illegal, harmful, misleading or infringing content, or to attack, overload or misuse the service."],
  ["5. Published sites", "Sites you publish are publicly visible. We may take down content that breaks these terms."],
  ["6. Availability", "We work hard to keep WebCraft running but provide it \"as is\" without guarantees of uninterrupted availability."],
  ["7. Ending your use", "You can stop using WebCraft at any time. We may suspend accounts that break these terms."],
  ["8. Changes", "We may update these terms. Continuing to use WebCraft after changes means you accept the updated terms."],
];

function Terms() {
  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Legal</p>
        <h1 className="text-5xl">Terms & Conditions</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: October 2026</p>
        <div className="mt-10 space-y-8">
          {SECTIONS.map(([t, d]) => (
            <section key={t}><h2 className="text-xl">{t}</h2><p className="mt-2 text-muted-foreground">{d}</p></section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
