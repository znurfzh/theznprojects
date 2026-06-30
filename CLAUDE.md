# theznprojects — Claude Context

## Who I am
Zulsyika Nurfaizah (ZN), learning designer and systems builder based in
Jakarta, Indonesia. M.A. LTED from NYU, B.Ed. EdTech from UNJ. Currently
Digital Transformation Specialist at YPKBI.

---

## What this repo is
Personal portfolio + blog site. Deployed on Vercel as a static site.
No frameworks, no build step — pure HTML/CSS/JS.
URL: theznprojects.com (or theznprojects.vercel.app)

---

## Stack
- **Frontend:** Vanilla HTML / CSS / JS
- **Hosting:** Vercel (static)
- **Fonts:** Fraunces (display/headings, variable opsz) + PT Sans (body)
- **CMS:** Notion — posts fetched via `scripts/fetch-posts.js` (Node, run by Vercel build)
- **Publish flow:** Notion automation → Vercel Deploy Hook → Vercel runs `npm run build`
  - GitHub Actions workflow exists (`fetch-notion-posts.yml`) but schedule is removed;
    only `workflow_dispatch` remains. Primary publish path is the Deploy Hook.

---

## Design tokens (base.css)
```css
--ink:       #1C1C1C   /* Eerie Black — primary text */
--ink-2:     #3D3D3D   /* secondary text */
--muted:     #6B7280   /* captions, labels */
--border:    #E5E7EB
--warm:      #F7F5F2   /* off-white section backgrounds */
--blue:      #0063A7   /* Cyan Blue — brand primary */
--blue-dk:   #004F86
--blue-lt:   #E8F2FA
--blue-mid:  #B3D4EC
--white:     #FFFFFF
--radius-sm: 4px  --radius-md: 8px  --radius-lg: 16px
--shadow-sm / --shadow / --shadow-md / --shadow-lg
--t:         0.22s
--display:   'Fraunces', Georgia, serif
--body:      'PT Sans', system-ui, sans-serif
--max:       1120px   /* max content width */
```

---

## Brand identity
- Name: **theznprojects** — pronounced "design projects" (ZN = initials)
- Logo concept: ZN negative space, "The" and "Projects" on the Z
- Logo font: **LEIXO** (installed at `~/Library/Fonts/LEIXO-DEMO.ttf`)
- Logo files: `assets/images/logo-blue.png` (blue bg), `assets/images/logo-dark.png` (dark bg)
  — Design B (large ZN mark). Use `logo-blue.png` on light pages, `logo-dark.png` on dark.
- Favicon: `assets/images/favicon.svg` — blue rounded square (#0063A7), bold sans-serif "ZN"
- Brand treatment in HTML:
  ```html
  <span class="brand-the">the</span>
  <span class="brand-zn">ZN</span>
  <span class="brand-projects">projects</span>
  ```
  `.brand-the` and `.brand-projects` → muted/light weight
  `.brand-zn` → bold 800, `var(--blue)`, slightly larger
- **megaZN** — the blog sub-brand. Dark background sections.
- Tagline (hero): *"Learning designer by training. Systems builder by
  necessity. Curious about everything by default."*
- Tagline (about bio): *"I design learning experiences and build the systems
  that deliver them."*

---

## File structure
```
/
├── index.html                          → homepage
├── about/index.html                    → about page
├── work/index.html                     → work index (filterable)
├── work/ypkbi-admission-suite/index.html  → case study (FULLY WRITTEN)
├── work/nsei-dashboard/index.html         → case study (stub)
├── work/ethic/index.html                  → case study (stub)
├── work/nexus-insight/index.html          → case study (stub)
├── work/affectris/index.html              → case study (stub)
├── work/cognizance/index.html             → case study (stub)
├── megazn/index.html                   → blog index (auto-generated between POSTS_START/END markers)
├── megazn/on-affective-computing/index.html   → post (placeholder, manual)
├── megazn/on-learn-unlearn-relearn/index.html → post (scaffolded, manual)
├── scripts/
│   └── fetch-posts.js                  → Notion → static HTML generator (run by Vercel build)
├── .github/workflows/
│   └── fetch-notion-posts.yml          → manual dispatch only (no schedule)
└── assets/
    ├── base.js                         → nav scroll + scroll reveal (shared)
    ├── images/
    │   ├── zulsyika.jpeg               → headshot photo (used in hero + about)
    │   ├── logo-blue.png               → Design B logo, white on blue bg
    │   ├── logo-dark.png               → Design B logo, white on dark bg
    │   ├── favicon.svg                 → site favicon (all 13 pages)
    │   └── favicon-64.png              → fallback (unused, kept for reference)
    └── css/
        ├── base.css    → tokens, reset, nav, footer, buttons, reveal, tags
        ├── home.css    → hero, featured work, about strip, megaZN, contact
        ├── work.css    → work index grid + base case study layout
        ├── case-study.css → TL;DR block, narrative, section variants, sidebar
        ├── about.css   → all about page sections
        └── megazn.css  → blog index + individual post pages
```

---

## CSS architecture
Each page links `base.css` + its own CSS file. No duplication.
- `base.css` — everything shared (tokens, nav, footer, buttons, `.tag-*`,
  `.page-header`, `.cta-strip`, scroll reveal, base responsive)
- Page-specific CSS files contain only what that page needs

**Adding a new page:** link `base.css` + relevant page CSS (or create new).
**Editing nav/footer/buttons:** only edit `base.css`.

---

## Shared JS (`assets/base.js`)
Two things only:
1. Nav scroll state: adds `.scrolled` class to `#nav` after 40px scroll
2. Scroll reveal: `IntersectionObserver` on `.reveal` elements, adds
   `.visible` class. Stagger via `.reveal-delay-1/2/3`.

All page-specific JS is inline in each HTML file.

**Note:** Hero elements on the homepage use CSS `@keyframes hero-fade-up`
animation instead of scroll reveal (they're above the fold so IntersectionObserver
never fires on first paint).

---

## Key components

### Nav (all pages)
```html
<nav id="nav">
  <div class="nav-inner">
    <a href="/" class="nav-logo">
      <span class="brand-the">the</span>
      <span class="brand-zn">ZN</span>
      <span class="brand-projects">projects</span>
    </a>
    <ul class="nav-links">
      <li><a href="/work">Work</a></li>
      <li><a href="/megazn">megaZN</a></li>
      <li><a href="/about">About</a></li>
      <li class="nav-cta"><a href="/#contact">Say hi</a></li>
    </ul>
  </div>
</nav>
```
Add `class="active"` to the current page's nav link.
megaZN pages use a dark nav variant (inline style overrides).

### Footer (all pages)
```html
<footer>
  <div class="footer-inner">
    <span class="footer-logo">
      <span class="brand-the">the</span>
      <span class="brand-zn">ZN</span>
      <span class="brand-projects">projects</span>
    </span>
    <ul class="footer-links">...</ul>
    <span class="footer-copy">© 2026 Zulsyika Nurfaizah</span>
  </div>
</footer>
```
megaZN dark pages add inline: `style="background:var(--ink); border-top: 1px solid rgba(255,255,255,0.1);"`

### Hero photo (homepage)
Photo sits inside `.photo-placeholder` div (white mat frame, 16px padding, no shadow).
`.photo-placeholder img` fills the inner area with `object-fit: cover; object-position: top`.
Outer frame: `width: 160px; height: 172px` — height chosen to align bottom with "Nurfaizah." baseline.

### About page photo
Photo sits inside `.bio-photo-mat` div (same white mat treatment as hero, 16px padding).
`.bio-photo-img` fills with `aspect-ratio: 4/5; object-fit: cover; object-position: top`.

### Project cards (work index)
Cards have `data-categories="ld ux sys gfx"` (space-separated).
Filter JS reads this to show/hide. Card sizes: `.project-card` (span 4),
`.size-wide` (6), `.size-hero` (8), `.size-half` (6).
Stub case study cards use `<span class="card-status">Case study in progress</span>`
instead of `<span class="card-link">Read case study</span>`.

### Case study structure
Every case study uses: `cs-page-header` → `cs-tldr` → `cs-body`
TL;DR block: 4-cell grid (Problem / Role / Outcome / Timeframe)
Body: `.cs-layout` (2-col: `.cs-narrative` + `.cs-sidebar`)
Section variants: `.cs-section-sys` (purple), `.cs-section-ux` (blue),
`.cs-section-ld` (green)

### megaZN post pages
Every post (manual or Notion-generated) includes:
- Share bar (`.post-share`) above the author card: X/Twitter, LinkedIn, WhatsApp,
  Copy link (shows "Copied!" for 2s), native Web Share API button (mobile only)
- Author card (`.post-author`)
- Post navigation (`.post-nav`)
- Sidebar with TOC, tags, related links

### Notion CMS post generation (`scripts/fetch-posts.js`)
- Filters Notion DB for `Status = Published` (Select property, not Status property)
- TOPIC_MAP normalises tags: "Learning Design" → "learning", "Design" → "design",
  "Behind the Build" → "build", "Misc Yapping" → "misc", "Books" → "books"
- Writes `.notion-generated` marker in each post dir; cleanup loop removes stale dirs
- Generates `megazn/index.html` between `<!-- POSTS_START -->` and `<!-- POSTS_END -->`
- Shows `.posts-empty` state when 0 published posts

---

## Content status

### Case studies
| Project | Status | Notes |
|---|---|---|
| YPKBI Admission Suite | ✅ Fully written | Flagship — narrative + all sections |
| NSEI Dashboard | 🚫 Removed from index | Project not a done deal (Danantara); stub page still exists at /work/nsei-dashboard but not linked |
| ETHIC | ⬜ Stub | Awaiting your content |
| Nexus Insight | ⬜ Stub | Awaiting your content |
| Affectris | ⬜ Stub | Awaiting your content |
| Cognizance | ⬜ Stub | Awaiting your content |

### Blog posts (megaZN)
| Post | Status | Notes |
|---|---|---|
| on-affective-computing | ⬜ Placeholder | Structure set, awaiting writing |
| on-learn-unlearn-relearn | ⬜ Scaffolded | Full section briefs, awaiting writing |

### About page
✅ Complete — bio, photo, interests, skills (grouped by category), languages,
education, experience, site history (incl. logo display), acknowledgements

---

## Project order (work index)
1. YPKBI Admission Suite (most recent, featured hero card)
2. ETHIC
3. Nexus Insight
4. Affectris
5. Cognizance
(NSEI removed — project not confirmed, can be re-added later)

---

## Still to build
- **Case study content** — write the 4 stub case studies (ETHIC, Nexus Insight,
  Affectris, Cognizance) and replace `cs-img-placeholder` divs with real screenshots
- **Resume** — add to `/assets/resume.pdf`; linked from about page (link exists, file missing)
- **megaZN post writing** — write the two scaffolded manual posts
- **Likes** — planned: Google Sheets + Apps Script as backend. One Sheet tab for
  like counts (keyed by post slug), Apps Script `doGet`/`doPost` web endpoint,
  small JS snippet per post to fetch and increment count.
- **Comments** — planned: same Google Sheets + Apps Script backend. Separate tab
  for comments (slug, name, text, timestamp). Needs spam/validation consideration.
  Discussed Disqus (general audience, has ads) vs Giscus (GitHub users only, clean).
  Decision deferred until readership is clearer.

---

## Key decisions (don't reverse without reason)
1. **No framework** — pure HTML/CSS/JS. Vercel serves it as static.
2. **Fraunces + PT Sans** — not Hanken Grotesk (that's YPKBI brand)
3. **#0063A7 Cyan Blue** — chosen because it's the color associated with
   Zulsyika's birthdate
4. **megaZN dark pages** — nav, topic bar, posts, footer all on `var(--ink)`
5. **TL;DR block is not a summary** — it's a hook for the narrative below
6. **brand-zn is uppercase ZN** — not lowercase "zn"
7. **Logo: Design B** — large ZN mark, preferred over Design A (text-only wordmark).
   `logo-blue.png` for light pages, `logo-dark.png` for dark pages.
8. **Favicon: SVG with system sans-serif** — embedded LEIXO font fails silently in
   browser favicon context; PNG at 64px was blurry. SVG + Arial renders sharp at all sizes.
9. **Nav/footer: wordmark only** — no logo mark beside the wordmark. Wordmark already
   carries the brand identity; adding the mark would be redundant.
10. **Hero photo: white mat frame** — `.photo-placeholder` wrapper with 16px padding,
    solid border, no shadow. Chosen over bleeding the photo to the frame edges.
11. **Notion publish via Deploy Hook** — Notion automation triggers Vercel Deploy Hook
    directly. GitHub Actions schedule removed (was redundant and caused failure emails).
