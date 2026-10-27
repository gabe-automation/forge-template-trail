import type { BlockType } from "./blocks";

export type Snippet = { name: string; hint: string; code: string; types?: BlockType[] };
export type SnippetKind = "html" | "css" | "js";

const TEXTY: BlockType[] = ["hero", "heading", "text", "section", "testimonial", "cards", "pricing", "footer"];
const BTN: BlockType[] = ["button", "hero", "navbar", "pricing", "login", "register"];
const PANELS: BlockType[] = ["flex", "grid", "stack", "absolute", "section"];
const FORMS: BlockType[] = ["login", "register", "input"];

/**
 * Ready-made snippets. Every block type gets HTML, CSS and Script options.
 * In CSS, "&" means "this block". In scripts, `el` is the block and `input` its first field.
 */
export const SNIPPETS: Record<SnippetKind, Snippet[]> = {
  html: [
    // universal
    { name: "Badge", hint: "Small label in the corner", code: `<span style="position:absolute;top:12px;right:12px;z-index:2;padding:4px 10px;border-radius:999px;background:var(--wc-primary);color:var(--wc-surface);font:600 12px system-ui">New</span>` },
    { name: "Note line", hint: "Extra line of small text", code: `<p style="margin:8px 0 0;font:13px system-ui;opacity:.65">Add a short note here.</p>` },
    // per type
    { name: "Announcement bar", hint: "Thin message across the top", code: `<div style="position:absolute;inset:0 0 auto 0;padding:4px;text-align:center;font:600 12px system-ui;background:var(--wc-accent);color:var(--wc-surface)">Free shipping this week</div>`, types: ["navbar", "hero"] },
    { name: "Social icons", hint: "Links to your profiles", code: `<p style="display:flex;gap:12px;margin:8px 0 0;font:14px system-ui"><a href="https://instagram.com" style="color:inherit">Instagram</a><a href="https://linkedin.com" style="color:inherit">LinkedIn</a></p>`, types: ["footer", "navbar", "section", "text", "testimonial"] },
    { name: "Checklist", hint: "Three ticked benefits", code: `<ul style="list-style:none;padding:0;margin:12px 0 0;font:15px/1.8 system-ui"><li>✓ Fast to set up</li><li>✓ Works on every screen</li><li>✓ Friendly support</li></ul>`, types: [...TEXTY, ...PANELS] },
    { name: "Countdown text", hint: "Filled by the Countdown script", code: `<p data-countdown="2026-12-31" style="margin:12px 0 0;font:600 18px system-ui">Loading…</p>`, types: [...TEXTY, ...PANELS] },
    { name: "Eyebrow", hint: "Small caps label above the title", code: `<p style="position:absolute;top:16px;left:80px;margin:0;font:600 12px system-ui;letter-spacing:.14em;text-transform:uppercase;color:var(--wc-primary)">Introducing</p>`, types: ["hero", "heading", "section"] },
    { name: "Second button", hint: "Outline button next to the main one", code: `<a href="#features" style="position:absolute;bottom:64px;left:300px;display:inline-flex;align-items:center;height:48px;padding:0 22px;border-radius:6px;border:1.5px solid currentColor;color:inherit;text-decoration:none;font:600 15px system-ui">Learn more</a>`, types: ["hero"] },
    { name: "Arrow icon", hint: "Adds → after the label", code: `<span aria-hidden="true" style="position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--wc-surface);font:600 16px system-ui;pointer-events:none">→</span>`, types: ["button"] },
    { name: "Photo credit", hint: "Small credit under the photo", code: `<small style="position:absolute;right:10px;bottom:30px;padding:2px 8px;border-radius:4px;background:rgba(0,0,0,.5);color:#fff;font:11px system-ui">Photo: Your name</small>`, types: ["image", "video"] },
    { name: "Star rating", hint: "Five stars above the quote", code: `<p aria-label="5 out of 5" style="margin:0 0 4px;color:#f59e0b;font-size:18px;letter-spacing:2px">★★★★★</p>`, types: ["testimonial", "cards"] },
    { name: "Plan note", hint: "Line under the pricing", code: `<p style="margin:-48px 0 0;text-align:center;font:13px system-ui;opacity:.65">All plans include a 14-day free trial.</p>`, types: ["pricing"] },
    { name: "Forgot password", hint: "Small help link", code: `<a href="#" style="display:block;margin:-16px 0 0 80px;font:13px system-ui;color:var(--wc-primary)">Forgot your password?</a>`, types: ["login"] },
    { name: "Terms line", hint: "Agreement text under the form", code: `<p style="margin:-16px 0 0 80px;font:12px system-ui;opacity:.6">By joining you agree to our terms.</p>`, types: ["register"] },
    { name: "Helper text", hint: "Hint under the field", code: `<small style="display:block;margin-top:-8px;font:12px system-ui;opacity:.6">We'll never share your email.</small>`, types: ["input"] },
    { name: "Divider label", hint: "Word in the middle of the line", code: `<span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:0 12px;background:var(--wc-surface);font:12px system-ui;opacity:.6">or</span>`, types: ["divider"] },
    { name: "Back to top", hint: "Link that jumps up", code: `<a href="#top" style="position:absolute;right:40px;top:12px;font:13px system-ui;color:inherit">Back to top ↑</a>`, types: ["footer"] },
    { name: "Panel heading", hint: "Title at the top of this layout", code: `<h3 style="margin:0 0 4px;font:600 22px Sora,system-ui">Group title</h3>`, types: PANELS },
  ],
  css: [
    // universal
    { name: "Lift on hover", hint: "Rises with a shadow when pointed at", code: `& { transition: transform .25s ease, box-shadow .25s ease; }\n&:hover { transform: translateY(-4px); box-shadow: 0 18px 40px -20px rgba(0,0,0,.35); }` },
    { name: "Fade in", hint: "Gently appears when the page opens", code: `& { animation: wc-fade .8s ease both; }\n@keyframes wc-fade { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }` },
    { name: "Frosted glass", hint: "See-through blurred background", code: `& { background: color-mix(in srgb, var(--wc-surface) 70%, transparent) !important; backdrop-filter: blur(14px); }` },
    { name: "Rounded card", hint: "Soft corners and border", code: `& { border-radius: 20px; border: 1px solid color-mix(in srgb, var(--wc-ink) 12%, transparent); overflow: hidden; }` },
    { name: "Soft gradient", hint: "Brand-colour wash behind it", code: `& { background: linear-gradient(135deg, color-mix(in srgb, var(--wc-primary) 14%, var(--wc-surface)), var(--wc-surface)) !important; }` },
    // per type
    { name: "Gradient text", hint: "Colour fade across headings", code: `& h1, & h2, & h3 { background: linear-gradient(90deg, var(--wc-primary), var(--wc-accent)); -webkit-background-clip: text; background-clip: text; color: transparent; }`, types: TEXTY },
    { name: "Pill buttons", hint: "Fully rounded buttons", code: `& .wc-btn { border-radius: 999px; padding: 0 28px; }`, types: BTN },
    { name: "Outline button", hint: "Border only, fills on hover", code: `& .wc-btn { background: transparent; color: var(--wc-primary); box-shadow: inset 0 0 0 2px var(--wc-primary); }\n& .wc-btn:hover { background: var(--wc-primary); color: var(--wc-surface); }`, types: BTN },
    { name: "Zoom image", hint: "Photo zooms slightly on hover", code: `& img { transition: transform .5s ease; }\n&:hover img { transform: scale(1.05); }`, types: ["image", "hero"] },
    { name: "Black & white", hint: "Grey photo, colour on hover", code: `& img, & video { filter: grayscale(1); transition: filter .4s; }\n&:hover img, &:hover video { filter: none; }`, types: ["image", "video", "hero"] },
    { name: "Dark overlay", hint: "Darkens the cover so text pops", code: `& .wc-hero-cover::after { content: ""; position: absolute; inset: 0; background: linear-gradient(transparent, rgba(0,0,0,.55)); }\n& .wc-hero-cover h1, & .wc-hero-cover p { background: none; color: #fff; }`, types: ["hero"] },
    { name: "Card hover", hint: "Each card highlights on hover", code: `& .wc-card, & .wc-plan { transition: background .2s, transform .2s; }\n& .wc-card:hover, & .wc-plan:hover { background: color-mix(in srgb, var(--wc-primary) 8%, transparent); transform: translateY(-3px); }`, types: ["cards", "pricing"] },
    { name: "Boxed cards", hint: "Each card in its own box", code: `& .wc-cards, & .wc-pricing { gap: 16px; }\n& .wc-card, & .wc-plan { border: 1px solid color-mix(in srgb, var(--wc-ink) 14%, transparent); border-radius: 16px; }`, types: ["cards", "pricing"] },
    { name: "Sticky top", hint: "Stays at the top while scrolling", code: `& { position: sticky !important; top: 0; z-index: 50 !important; }`, types: ["navbar"] },
    { name: "Underline links", hint: "Animated underline on menu items", code: `& li span { background: linear-gradient(currentColor, currentColor) 0 100% / 0 1px no-repeat; transition: background-size .25s; }\n& li:hover span { background-size: 100% 1px; }`, types: ["navbar", "footer"] },
    { name: "Big quote mark", hint: "Large decorative quote", code: `& .wc-quote { position: relative; }\n& .wc-quote::before { content: "“"; position: absolute; left: 24px; top: -10px; font: 120px Georgia, serif; opacity: .12; }`, types: ["testimonial"] },
    { name: "Card form", hint: "Form inside a raised card", code: `& .wc-form { background: var(--wc-surface); border-radius: 18px; box-shadow: 0 20px 50px -25px rgba(0,0,0,.4); border: 0; }`, types: FORMS },
    { name: "Focus glow", hint: "Glows while typing", code: `& input:focus { outline: none; box-shadow: 0 0 0 4px color-mix(in srgb, var(--wc-primary) 30%, transparent); border-color: var(--wc-primary); }`, types: ["input", "login", "register"] },
    { name: "Dotted line", hint: "Dotted divider", code: `& .wc-divider { border-top-style: dotted; border-top-width: 3px; }`, types: ["divider"] },
    { name: "Gradient line", hint: "Brand-colour divider", code: `& .wc-divider { border: 0; height: 2px; background: linear-gradient(90deg, transparent, var(--wc-primary), transparent); }`, types: ["divider"] },
    { name: "Dark footer", hint: "Ink background, light text", code: `& { background: var(--wc-ink); }\n& .wc-footer { color: var(--wc-surface); opacity: 1; border: 0; }`, types: ["footer"] },
    { name: "Rounded video", hint: "Soft corners and shadow", code: `& .wc-video-frame { border-radius: 24px; box-shadow: 0 30px 60px -30px rgba(0,0,0,.5); }`, types: ["video"] },
    { name: "Panel padding", hint: "More room inside the layout", code: `& { padding: 32px !important; }`, types: PANELS },
    { name: "Striped rows", hint: "Alternate backgrounds for items", code: `& > .wc-flow:nth-child(even) { background: color-mix(in srgb, var(--wc-ink) 5%, transparent); border-radius: 12px; }`, types: ["stack", "grid", "flex", "section"] },
    { name: "Highlight words", hint: "Marker-style highlight", code: `& strong, & em { background: color-mix(in srgb, var(--wc-primary) 25%, transparent); padding: 0 4px; font-style: normal; }`, types: ["text", "heading", "section"] },
  ],
  js: [
    // universal
    { name: "Reveal on scroll", hint: "Fades in when scrolled into view", code: `el.style.opacity = "0";\nel.style.transition = "opacity .7s ease, transform .7s ease";\nel.style.transform = "translateY(24px)";\nnew IntersectionObserver(([e], o) => {\n  if (!e.isIntersecting) return;\n  el.style.opacity = "1"; el.style.transform = "none"; o.disconnect();\n}).observe(el);` },
    { name: "Gentle float", hint: "Bobs up and down slowly", code: `el.animate([{ transform: "translateY(0)" }, { transform: "translateY(-8px)" }, { transform: "translateY(0)" }], { duration: 3200, iterations: Infinity, easing: "ease-in-out" });` },
    { name: "Click message", hint: "Shows a short message when clicked", code: `el.addEventListener("click", () => {\n  const live = document.getElementById("wc-live");\n  if (live) live.textContent = "Thanks for your interest!";\n  alert("Thanks for your interest!");\n});` },
    // per type
    { name: "Countdown", hint: "Fills [data-countdown] with days left", code: `const t = el.querySelector("[data-countdown]");\nif (t) {\n  const end = new Date(t.dataset.countdown);\n  const tick = () => { const d = Math.max(0, Math.ceil((end - Date.now()) / 864e5)); t.textContent = d + " days to go"; };\n  tick(); setInterval(tick, 60000);\n}`, types: [...TEXTY, ...PANELS] },
    { name: "Typewriter heading", hint: "Types the heading letter by letter", code: `const h = el.querySelector("h1, h2");\nif (h) {\n  const full = h.textContent; h.textContent = "";\n  let i = 0; const id = setInterval(() => { h.textContent = full.slice(0, ++i); if (i >= full.length) clearInterval(id); }, 45);\n}`, types: ["hero", "heading", "section"] },
    { name: "Count up numbers", hint: "Numbers count up from zero", code: `el.querySelectorAll("h1,h2,h3,p,.wc-price").forEach((n) => {\n  const m = n.textContent.match(/\\d+/); if (!m) return;\n  const end = +m[0], tpl = n.textContent; let v = 0;\n  const id = setInterval(() => { v = Math.min(end, v + Math.ceil(end / 30)); n.textContent = tpl.replace(m[0], v); if (v >= end) clearInterval(id); }, 30);\n});`, types: ["pricing", "heading", "text", "cards"] },
    { name: "Shrink on scroll", hint: "Navbar gets a shadow when scrolling", code: `addEventListener("scroll", () => {\n  el.style.boxShadow = scrollY > 10 ? "0 8px 24px -12px rgba(0,0,0,.3)" : "none";\n});`, types: ["navbar"] },
    { name: "Open in new tab", hint: "Links open in a new tab", code: `el.querySelectorAll("a").forEach((a) => { a.target = "_blank"; a.rel = "noopener"; });`, types: [...BTN, "footer", "text"] },
    { name: "Ripple click", hint: "Ripple effect on press", code: `el.querySelectorAll(".wc-btn").forEach((b) => b.addEventListener("click", (e) => {\n  b.animate([{ transform: "scale(1)" }, { transform: "scale(.94)" }, { transform: "scale(1)" }], { duration: 250 });\n}));`, types: BTN },
    { name: "Lightbox", hint: "Click the photo to view it large", code: `const img = el.querySelector("img");\nif (img) img.style.cursor = "zoom-in", img.addEventListener("click", () => {\n  const o = document.createElement("div");\n  o.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.85);display:grid;place-items:center;cursor:zoom-out";\n  o.innerHTML = '<img src="' + img.src + '" style="max-width:92vw;max-height:92vh;border-radius:12px">';\n  o.onclick = () => o.remove(); document.body.append(o);\n});`, types: ["image", "hero"] },
    { name: "Play on hover", hint: "Video plays while pointed at", code: `const v = el.querySelector("video");\nif (v) { v.muted = true; el.addEventListener("mouseenter", () => v.play()); el.addEventListener("mouseleave", () => v.pause()); }`, types: ["video"] },
    { name: "Play when visible", hint: "Starts when scrolled into view", code: `const v = el.querySelector("video");\nif (v) { v.muted = true; new IntersectionObserver(([e]) => e.isIntersecting ? v.play() : v.pause()).observe(el); }`, types: ["video"] },
    { name: "Rotate quotes", hint: "Cycles through several quotes", code: `const p = el.querySelector(".wc-quote p");\nconst quotes = [p?.textContent, "“Simply the best decision we made.”", "“Our customers noticed right away.”"];\nlet i = 0; if (p) setInterval(() => { i = (i + 1) % quotes.length; p.textContent = quotes[i]; }, 5000);`, types: ["testimonial"] },
    { name: "Email check", hint: "Warns when the email looks wrong", code: `if (input) {\n  input.type = "email";\n  input.addEventListener("input", () => {\n    el.querySelector(".wc-field-msg").textContent = input.validity.valid ? "" : "Please enter a valid email.";\n  });\n}`, types: ["input"] },
    { name: "Required field", hint: "Asks people to fill it in", code: `if (input) {\n  input.required = true;\n  input.addEventListener("blur", () => {\n    el.querySelector(".wc-field-msg").textContent = input.value.trim() ? "" : "This field is required.";\n  });\n}`, types: ["input"] },
    { name: "Character counter", hint: "Shows how many letters are typed", code: `if (input) input.addEventListener("input", () => { el.querySelector(".wc-field-msg").textContent = input.value.length + " characters"; });`, types: ["input"] },
    { name: "Welcome message", hint: "Greets people on click", code: `el.querySelector(".wc-btn")?.addEventListener("click", () => {\n  el.querySelector("p").textContent = "Welcome! Taking you there…";\n});`, types: ["login", "register"] },
    { name: "Current year", hint: "Keeps © year up to date", code: `el.querySelectorAll("span").forEach((s) => { s.textContent = s.textContent.replace(/20\\d\\d/, new Date().getFullYear()); });`, types: ["footer"] },
    { name: "Stagger children", hint: "Items appear one after another", code: `[...el.children].forEach((c, i) => c.animate([{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: 500, delay: i * 120, fill: "both" }));`, types: [...PANELS, "cards", "pricing"] },
    { name: "Grow line", hint: "Line draws in from the left", code: `const hr = el.querySelector("hr");\nif (hr) hr.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 900, easing: "ease-out", fill: "both" });`, types: ["divider"] },
  ],
};

export const snippetsFor = (kind: SnippetKind, type: BlockType) => SNIPPETS[kind].filter((s) => !s.types || s.types.includes(type));
export const snippet = (kind: SnippetKind, name: string) => SNIPPETS[kind].find((s) => s.name === name)!.code;

/** Premade look for freshly added blocks, so palette blocks feel as finished as template blocks. */
export const PRESETS: Record<BlockType, { css?: string[]; js?: string[]; html?: string[] }> = {
  navbar: { css: ["Frosted glass", "Pill buttons", "Underline links"], js: ["Shrink on scroll"] },
  hero: { css: ["Fade in", "Pill buttons"], js: ["Typewriter heading"] },
  heading: { css: ["Gradient text"], js: ["Reveal on scroll"] },
  text: { css: ["Highlight words"], js: ["Reveal on scroll"] },
  button: { css: ["Lift on hover", "Pill buttons"], js: ["Ripple click"] },
  image: { css: ["Rounded card", "Zoom image"], js: ["Lightbox"] },
  cards: { css: ["Boxed cards", "Card hover"], js: ["Stagger children"] },
  pricing: { css: ["Boxed cards", "Card hover", "Pill buttons"], html: ["Plan note"] },
  testimonial: { css: ["Big quote mark"], html: ["Star rating"], js: ["Reveal on scroll"] },
  login: { css: ["Card form", "Pill buttons"], html: ["Forgot password"] },
  register: { css: ["Card form", "Pill buttons"], html: ["Terms line"] },
  divider: { css: ["Gradient line"], js: ["Grow line"] },
  footer: { css: ["Underline links"], js: ["Current year"] },
  input: { css: ["Focus glow"], js: ["Required field"] },
  flex: { js: ["Stagger children"] },
  grid: { js: ["Stagger children"] },
  stack: { js: ["Stagger children"] },
  absolute: {},
  section: { css: ["Soft gradient"], js: ["Reveal on scroll"] },
  video: { css: ["Rounded video"], js: ["Play when visible"] },
};

export function presetFor(type: BlockType): { css: string; script: string; html: string } {
  const p = PRESETS[type];
  const join = (k: SnippetKind, names?: string[]) => (names ?? []).map((n) => snippet(k, n)).join("\n");
  return { css: join("css", p.css), script: join("js", p.js), html: join("html", p.html) };
}
