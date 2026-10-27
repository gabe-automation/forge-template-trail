import { STUDIO_IMAGE as studioProduct, VENUE_IMAGE as assemblyVenue, BLOCKS, BREAKPOINTS, type BlockStyle, type BlockType, type BoxOpts, type Theme } from "./blocks";
import { snippet as sn } from "./snippets";
import type { NodeView } from "./model";

export type TplBlock = { type: BlockType; y: number; text?: string; sub?: string; label?: string; href?: string; w?: number; h?: number; x?: number; style?: BlockStyle; box?: BoxOpts; attrs?: Record<string, string>; html?: string; css?: string; script?: string; kids?: Omit<TplBlock, "kids">[] };
export type SiteTemplate = { id: string; name: string; description: string; theme: Theme; blocks: TplBlock[]; pages?: { title: string; blocks: TplBlock[] }[] };

const stack = (items: Omit<TplBlock, "y">[], gap = 0): TplBlock[] => {
  let y = 0;
  return items.map((b) => {
    const h = b.h ?? BLOCKS[b.type].h;
    const out = { ...b, y };
    y += h + gap;
    return out;
  });
};

export const SITE_TEMPLATES: SiteTemplate[] = [
  {
    id: "landing", name: "Common Ground", description: "A product studio with bold typography, editorial imagery, and clear pricing.",
    theme: { primary: "#008A83", accent: "#183238", surface: "#F4F7F8", ink: "#183238" },
    blocks: stack([
      { type: "navbar", text: "COMMON GROUND", sub: "The platform · Our approach · Plans", label: "Explore", href: "#features", h: 84, css: sn("css", "Frosted glass") + "\n" + sn("css", "Pill buttons") },
      { type: "hero", text: "COMMON GROUND", sub: "A quieter way to bring your people, projects and ideas together.", label: "Explore the platform", href: "#features", h: 560, attrs: { "data-cover": studioProduct }, style: { font: "sans" }, css: sn("css", "Fade in") + "\n" + sn("css", "Pill buttons"), script: sn("js", "Typewriter heading") },
      { type: "heading", text: "Everything, in its right place.", h: 140, css: sn("css", "Gradient text"), script: sn("js", "Reveal on scroll") },
      { type: "flex", h: 150, w: 1080, box: { gap: 20, align: "center", justify: "between" }, css: "& { background: color-mix(in srgb, var(--wc-primary) 8%, var(--wc-surface)); border-radius: 22px; padding: 24px 32px !important; }", kids: [
        { type: "text", text: "Trusted by 2,400 small teams who make things together.", x: 0, y: 0, w: 520, h: 80 },
        { type: "button", label: "Start for free", href: "#features", x: 0, y: 0, w: 200, h: 52, css: sn("css", "Lift on hover") },
      ] },
      { type: "cards", text: "01 / Find your focus|02 / Work together|03 / Move forward", sub: "One clear space for what matters.|Good ideas deserve good company.|From the first sketch to the finish line.", h: 330, css: sn("css", "Card hover"), script: sn("js", "Reveal on scroll") },
      { type: "pricing", text: "Solo|Studio|Collective", sub: "$12|$32|$72", label: "Start building", href: "#features", h: 390, css: sn("css", "Card hover") + "\n" + sn("css", "Pill buttons"), html: sn("html", "Badge") },
      { type: "testimonial", text: "Finally, a space that feels like ours.", sub: "The people behind the work", h: 245, style: { bg: "#d8ebe5" } },
      { type: "footer", text: "COMMON GROUND / 2026", sub: "Built for people who make things together.", h: 130, html: sn("html", "Social icons") },
    ]),
    pages: [
      { title: "About", blocks: stack([
        { type: "navbar", text: "COMMON GROUND", sub: "The platform · Our approach · Plans", label: "Explore", href: "#story", h: 84, css: sn("css", "Frosted glass") + "\n" + sn("css", "Pill buttons") },
        { type: "heading", text: "Made for people who make things.", h: 140, css: sn("css", "Gradient text"), script: sn("js", "Reveal on scroll") },
        { type: "text", text: "Common Ground started with a simple observation: most tools make collaboration feel like administration. We build a quieter home for small teams — one place for the work, the people and the decisions that matter.", h: 170, css: sn("css", "Highlight words"), script: sn("js", "Reveal on scroll") },
        { type: "testimonial", text: "It feels less like software and more like our studio, online.", sub: "Mara Lindqvist, Founder at Oak & Iron", h: 245, style: { bg: "#d8ebe5" } },
        { type: "footer", text: "COMMON GROUND / 2026", sub: "Built for people who make things together.", h: 130 },
      ]) },
      { title: "Plans", blocks: stack([
        { type: "navbar", text: "COMMON GROUND", sub: "The platform · Our approach · Plans", label: "Explore", href: "#plans", h: 84, css: sn("css", "Frosted glass") + "\n" + sn("css", "Pill buttons") },
        { type: "heading", text: "Pick the plan that fits.", h: 140, css: sn("css", "Gradient text") },
        { type: "pricing", text: "Solo|Studio|Collective", sub: "$12|$32|$72", label: "Start building", href: "#signup", h: 390, css: sn("css", "Card hover") + "\n" + sn("css", "Pill buttons"), html: sn("html", "Plan note") },
        { type: "register", text: "Try it free for 14 days.", label: "Create account", href: "mailto:hello@commonground.example", w: 1080, h: 240, css: sn("css", "Card form") + "\n" + sn("css", "Pill buttons"), html: sn("html", "Terms line") },
        { type: "footer", text: "COMMON GROUND / 2026", sub: "Built for people who make things together.", h: 130 },
      ]) },
    ],
  },
  {
    id: "portfolio", name: "Alex Rivera — Portfolio", description: "A visual design portfolio with a full-width project cover and selected work.",
    theme: { primary: "#183238", accent: "#008A83", surface: "#ffffff", ink: "#183238" },
    blocks: stack([
      { type: "navbar", text: "ALEX RIVERA / DESIGN", sub: "Selected work · About · Contact", label: "View work", href: "#work", h: 84, css: sn("css", "Frosted glass") },
      { type: "hero", text: "ALEX RIVERA", sub: "Independent designer and maker creating thoughtful experiences for ambitious teams.", label: "View selected work", href: "#work", h: 520, attrs: { "data-cover": studioProduct }, style: { font: "sans" }, css: sn("css", "Fade in"), script: sn("js", "Typewriter heading") },
      { type: "heading", text: "Selected work / 2024—26", h: 140, script: sn("js", "Reveal on scroll") },
      { type: "cards", text: "01 / Fieldnotes|02 / Open House|03 / Goodform", sub: "Identity & digital experience|A fresh way to find home|Tools for everyday making", h: 340, css: sn("css", "Card hover") },
      { type: "image", text: "Goodform / Product design", attrs: { "data-image": studioProduct }, w: 1080, h: 420, style: { radius: 20, shadow: true }, css: sn("css", "Zoom image") + "\n& { overflow: hidden; }", script: sn("js", "Reveal on scroll") },
      { type: "grid", h: 280, w: 1080, box: { cols: 3, gap: 20 }, kids: [
        { type: "image", text: "", attrs: { "data-image": assemblyVenue }, x: 0, y: 0, w: 340, h: 240, style: { radius: 16 }, css: sn("css", "Zoom image") + "\n& { overflow: hidden; border-radius: 16px; }" },
        { type: "image", text: "", attrs: { "data-image": studioProduct }, x: 0, y: 0, w: 340, h: 240, style: { radius: 16 }, css: sn("css", "Zoom image") + "\n& { overflow: hidden; border-radius: 16px; }" },
        { type: "testimonial", text: "Calm, precise, generous.", sub: "Fieldnotes team", x: 0, y: 0, w: 340, h: 240, css: "& .wc-quote { padding: 24px; border-radius: 16px; }" },
      ] },
      { type: "testimonial", text: "The best projects begin with a good conversation.", sub: "Currently available for select collaborations", h: 220, style: { bg: "#f2e4e1" } },
      { type: "footer", text: "ALEX RIVERA / 2026", sub: "Made with care. Get in touch above.", h: 120 },
    ]),
    pages: [
      { title: "Work", blocks: stack([
        { type: "navbar", text: "ALEX RIVERA / DESIGN", sub: "Selected work · About · Contact", label: "View work", href: "#archive", h: 84, css: sn("css", "Frosted glass") },
        { type: "heading", text: "Archive / 2020—26", h: 140, script: sn("js", "Reveal on scroll") },
        { type: "cards", text: "Fieldnotes|Open House|Goodform|Northwind", sub: "Identity & digital experience|A fresh way to find home|Tools for everyday making|Calm software for calm teams", h: 340, css: sn("css", "Card hover") },
        { type: "image", text: "Northwind / Brand system", attrs: { "data-image": assemblyVenue }, w: 1080, h: 420, style: { radius: 20, shadow: true }, css: sn("css", "Zoom image") + "\n& { overflow: hidden; }", script: sn("js", "Reveal on scroll") },
        { type: "footer", text: "ALEX RIVERA / 2026", sub: "Made with care. Get in touch above.", h: 120 },
      ]) },
      { title: "Contact", blocks: stack([
        { type: "navbar", text: "ALEX RIVERA / DESIGN", sub: "Selected work · About · Contact", label: "View work", href: "#hello", h: 84, css: sn("css", "Frosted glass") },
        { type: "heading", text: "Say hello.", h: 140, css: sn("css", "Gradient text") },
        { type: "text", text: "Currently booking identity and digital projects for spring 2026. Tell me a little about yours and I'll reply within two working days.", h: 130, script: sn("js", "Reveal on scroll") },
        { type: "register", text: "Start the conversation.", label: "Send message", href: "mailto:studio@alexrivera.example", w: 1080, h: 260, css: sn("css", "Card form") + "\n" + sn("css", "Pill buttons"), html: sn("html", "Terms line") },
        { type: "footer", text: "ALEX RIVERA / 2026", sub: "Made with care. Get in touch above.", h: 120 },
      ]) },
    ],
  },
  {
    id: "saas", name: "Tasklight — App launch", description: "A precise software launch page with product benefits and linked account actions.",
    theme: { primary: "#008A83", accent: "#183238", surface: "#F4F7F8", ink: "#183238" },
    blocks: stack([
      { type: "navbar", text: "TASKLIGHT", sub: "Overview · How it works · Plans", label: "Sign in", href: "#signin", h: 84 },
      { type: "hero", text: "TASKLIGHT", sub: "Your team's work, in one beautifully simple place. Spend less time organizing and more time making.", label: "Create an account", href: "#signup", h: 570, style: { bg: "#DCE5E7", font: "sans" }, css: sn("css", "Gradient text") + "\n" + sn("css", "Pill buttons"), html: sn("html", "Checklist") },
      { type: "video", text: "See Tasklight in two minutes", attrs: { "data-video": "https://www.youtube.com/watch?v=aqz-KE-bpKQ" }, w: 960, h: 560, css: sn("css", "Rounded card"), script: sn("js", "Reveal on scroll") },
      { type: "heading", text: "Work that just flows.", h: 140 },
      { type: "cards", text: "See the whole picture|Keep everyone in sync|Make progress visible", sub: "One home for every project.|The right people, always in the loop.|Small steps that add up to big things.", h: 330, css: sn("css", "Card hover"), script: sn("js", "Reveal on scroll") },
      { type: "pricing", text: "Free|Team|Company", sub: "$0|$24|$68", label: "Choose plan", href: "#signup", h: 390, css: sn("css", "Pill buttons") + "\n" + sn("css", "Card hover") },
      { type: "register", text: "Ready when you are.", label: "Sign up", href: "mailto:hello@tasklight.example", h: 240, w: 1080, style: { bg: "#dceef3", radius: 18 } },
      { type: "login", text: "Welcome back.", label: "Sign in", href: "mailto:hello@tasklight.example", h: 240, w: 1080 },
      { type: "footer", text: "TASKLIGHT / 2026", sub: "A better way to work together.", h: 130 },
    ]),
    pages: [
      { title: "Features", blocks: stack([
        { type: "navbar", text: "TASKLIGHT", sub: "Overview · How it works · Plans", label: "Sign in", href: "#features", h: 84 },
        { type: "heading", text: "Everything under one roof.", h: 140, css: sn("css", "Gradient text"), script: sn("js", "Reveal on scroll") },
        { type: "cards", text: "One timeline|Shared context|Zero busywork", sub: "Every task, deadline and note in a single view.|Comments live next to the work, not in a maze of tabs.|Status updates write themselves.", h: 330, css: sn("css", "Card hover"), script: sn("js", "Reveal on scroll") },
        { type: "video", text: "Watch the tour", attrs: { "data-video": "https://www.youtube.com/watch?v=aqz-KE-bpKQ" }, w: 960, h: 500, css: sn("css", "Rounded card"), script: sn("js", "Reveal on scroll") },
        { type: "footer", text: "TASKLIGHT / 2026", sub: "A better way to work together.", h: 130 },
      ]) },
      { title: "Pricing", blocks: stack([
        { type: "navbar", text: "TASKLIGHT", sub: "Overview · How it works · Plans", label: "Sign in", href: "#plans", h: 84 },
        { type: "heading", text: "Simple pricing, no surprises.", h: 140 },
        { type: "pricing", text: "Free|Team|Company", sub: "$0|$24|$68", label: "Choose plan", href: "#signup", h: 390, css: sn("css", "Pill buttons") + "\n" + sn("css", "Card hover") },
        { type: "register", text: "Ready when you are.", label: "Create account", href: "mailto:hello@tasklight.example", w: 1080, h: 240, style: { bg: "#dceef3", radius: 18 }, css: sn("css", "Card form") + "\n" + sn("css", "Pill buttons"), html: sn("html", "Terms line") },
        { type: "footer", text: "TASKLIGHT / 2026", sub: "A better way to work together.", h: 130 },
      ]) },
    ],
  },
  {
    id: "event", name: "Assembly — Conference", description: "An architectural conference cover with a bold program and registration section.",
    theme: { primary: "#008A83", accent: "#183238", surface: "#F4F7F8", ink: "#183238" },
    blocks: stack([
      { type: "navbar", text: "ASSEMBLY / 2026", sub: "The gathering · The program · The place", label: "See program", href: "#features", h: 84 },
      { type: "hero", text: "ASSEMBLY / 2026", sub: "Two days of conversation, discovery and new perspectives. Add your date and venue here.", label: "Explore the program", href: "#features", h: 570, attrs: { "data-cover": assemblyVenue }, style: { font: "sans" }, css: sn("css", "Fade in"), html: sn("html", "Countdown text"), script: sn("js", "Countdown") },
      { type: "heading", text: "A gathering worth showing up for.", h: 140 },
      { type: "cards", text: "01 / Connect|02 / Discover|03 / Make", sub: "Meet the people behind the ideas.|Hear fresh perspectives.|Leave with something new.", h: 330, css: sn("css", "Card hover"), script: sn("js", "Reveal on scroll") },
      { type: "section", h: 260, w: 1200, style: { bg: "#e3efe1" }, box: { gap: 12 }, kids: [
        { type: "heading", text: "October 16—17 · The Glasshouse", x: 0, y: 0, w: 1040, h: 60, css: "& .wc-heading { padding: 0; }" },
        { type: "text", text: "Doors open at 9:00. Talks, workshops and a shared table run throughout both days.", x: 0, y: 0, w: 1040, h: 60 },
      ] },
      { type: "button", label: "Reserve your place", href: "https://example.com/tickets", w: 260, h: 58, style: { shadow: true }, css: sn("css", "Lift on hover") + "\n" + sn("css", "Pill buttons"), script: sn("js", "Open in new tab") },
      { type: "testimonial", text: "Come curious. Leave inspired.", sub: "Your next chapter starts here", h: 220, style: { bg: "#f4ddd7" } },
      { type: "footer", text: "ASSEMBLY / 2026", sub: "Details and tickets coming soon.", h: 130 },
    ]),
    pages: [
      { title: "Program", blocks: stack([
        { type: "navbar", text: "ASSEMBLY / 2026", sub: "The gathering · The program · The place", label: "See program", href: "#program", h: 84 },
        { type: "heading", text: "Two days, one schedule.", h: 140, script: sn("js", "Reveal on scroll") },
        { type: "cards", text: "Day 1 — Talks|Day 2 — Workshops|Evening — Salon", sub: "Openers, keynotes and honest conversations.|Small rooms, real practice, take-home skills.|Wine, questions and new friends.", h: 330, css: sn("css", "Card hover") },
        { type: "section", h: 280, w: 1200, style: { bg: "#e3efe1" }, box: { gap: 12 }, kids: [
          { type: "heading", text: "October 16—17 · The Glasshouse", x: 0, y: 0, w: 1040, h: 60, css: "& .wc-heading { padding: 0; }" },
          { type: "text", text: "Doors open at 9:00 both days. Lunch is on the terrace; the program runs until 6:00, then the salon begins.", x: 0, y: 0, w: 1040, h: 80 },
        ] },
        { type: "footer", text: "ASSEMBLY / 2026", sub: "Details and tickets coming soon.", h: 130 },
      ]) },
      { title: "Tickets", blocks: stack([
        { type: "navbar", text: "ASSEMBLY / 2026", sub: "The gathering · The program · The place", label: "See program", href: "#tickets", h: 84 },
        { type: "heading", text: "Reserve your place.", h: 140, css: sn("css", "Gradient text") },
        { type: "pricing", text: "Early bird|Standard|Patron", sub: "$89|$129|$249", label: "Reserve", href: "https://example.com/tickets", h: 390, css: sn("css", "Card hover") + "\n" + sn("css", "Pill buttons"), html: sn("html", "Plan note") },
        { type: "button", label: "Reserve your place", href: "https://example.com/tickets", w: 260, h: 58, style: { shadow: true }, css: sn("css", "Lift on hover") + "\n" + sn("css", "Pill buttons"), script: sn("js", "Open in new tab") },
        { type: "footer", text: "ASSEMBLY / 2026", sub: "Details and tickets coming soon.", h: 130 },
      ]) },
    ],
  },
];

/** Number of real pages a template creates (home + extras). */
export const templatePageCount = (t: SiteTemplate) => 1 + (t.pages?.length ?? 0);

/** Template page blocks as page nodes — used for thumbnails and for applying template geometry. */
export function blocksToViews(tplId: string, blocks: TplBlock[]): NodeView[] {
  const t = { id: tplId, blocks };
  let mobileBottom = 0;
  return blocks.flatMap((b, i) => {
    const def = BLOCKS[b.type];
    const w = Math.min(b.w ?? def.w, 1200), h = b.h ?? def.h;
    const g = { x: b.x ?? Math.round((1200 - w) / 2), y: b.y, w, h };
    const tablet = { x: Math.max(12, Math.round(g.x * BREAKPOINTS.tablet.width / BREAKPOINTS.desktop.width)), y: g.y, w: Math.min(BREAKPOINTS.tablet.width - 24, Math.round(g.w * BREAKPOINTS.tablet.width / BREAKPOINTS.desktop.width)), h: g.h };
    const mobileHeight = b.type === "pricing" ? Math.max(g.h, 720) : b.type === "cards" ? Math.max(g.h, 390) : g.h;
    const mobile = { x: 12, y: Math.max(g.y, mobileBottom), w: BREAKPOINTS.mobile.width - 24, h: mobileHeight };
    mobileBottom = mobile.y + mobile.h;
    const view: NodeView = {
      id: `${t.id}-${i}-0000-0000-000000000000`, type: b.type, parent: null, order: String(i).padStart(3, "0"),
      text: b.text ?? def.text, sub: b.sub ?? def.sub, label: b.label ?? def.label, href: b.href ?? "", page: null,
      style: b.style ?? {}, attrs: b.attrs ?? {}, script: b.script ?? "", html: b.html ?? "", css: b.css ?? "", box: b.box ?? {}, geo: { desktop: g, tablet, mobile },
    };
    const pid = `${t.id}-${i}-0000-0000-000000000000`;
    const kids: NodeView[] = (b.kids ?? []).map((k, j) => {
      const kd = BLOCKS[k.type];
      const kg = { x: k.x ?? 0, y: k.y, w: k.w ?? kd.w, h: k.h ?? kd.h };
      return {
        id: `${t.id}-${i}-${j}-k000-0000-000000000000`, type: k.type, parent: pid, order: `${String(i).padStart(3, "0")}${j}`,
        text: k.text ?? kd.text, sub: k.sub ?? kd.sub, label: k.label ?? kd.label, href: k.href ?? "", page: null,
        style: k.style ?? {}, attrs: k.attrs ?? {}, script: k.script ?? "", html: k.html ?? "", css: k.css ?? "", box: k.box ?? {},
        geo: { desktop: kg, tablet: { ...kg, w: Math.min(kg.w, tablet.w - 32) }, mobile: { ...kg, w: Math.min(kg.w, mobile.w - 32) } },
      };
    });
    return [view, ...kids];
  });
}

/** Home-page blocks of a full template, for thumbnails. */
export function templateViews(t: SiteTemplate): NodeView[] {
  return blocksToViews(t.id, t.blocks);
}
