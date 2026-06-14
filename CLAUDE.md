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
- **No CMS yet** — content is hand-coded; Notion CMS integration is planned

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
├── megazn/index.html                   → blog index
├── megazn/on-affective-computing/index.html   → post (placeholder)
├── megazn/on-learn-unlearn-relearn/index.html → post (scaffolded)
└── assets/
    ├── base.js                         → nav scroll + scroll reveal (shared)
    ├── images/                         → screenshots, photos (add here)
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

### Project cards (work index)
Cards have `data-categories="ld ux sys gfx"` (space-separated).
Filter JS reads this to show/hide. Card sizes: `.project-card` (span 4),
`.size-wide` (6), `.size-hero` (8), `.size-half` (6).

### Case study structure
Every case study uses: `cs-page-header` → `cs-tldr` → `cs-body`
TL;DR block: 4-cell grid (Problem / Role / Outcome / Timeframe)
Body: `.cs-layout` (2-col: `.cs-narrative` + `.cs-sidebar`)
Section variants: `.cs-section-sys` (purple), `.cs-section-ux` (blue),
`.cs-section-ld` (green)

---

## Content status

### Case studies
| Project | Status | Notes |
|---|---|---|
| YPKBI Admission Suite | ✅ Fully written | Flagship — narrative + all sections |
| NSEI Dashboard | ⬜ Stub | Awaiting your content |
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
✅ Complete — bio, interests, skills (grouped by category), languages,
education, experience, site history, acknowledgements (includes Claude credit)

---

## Project order (work index)
1. YPKBI Admission Suite (most recent, featured hero card)
2. NSEI Dashboard
3. ETHIC
4. Nexus Insight
5. Affectris
6. Cognizance

---

## Planned but not built
- Notion CMS integration for megaZN blog posts
- Photo: add to `/assets/images/zulsyika.jpg`, replace placeholder in hero
  and about page (both have commented instructions)
- Project screenshots: add to `/assets/images/`, replace `cs-img-placeholder`
  divs in case studies
- Resume: add to `/assets/resume.pdf`, linked from about page

---

## Key decisions (don't reverse without reason)
1. **No framework** — pure HTML/CSS/JS. Vercel serves it as static.
2. **Fraunces + PT Sans** — not Hanken Grotesk (that's YPKBI brand)
3. **#0063A7 Cyan Blue** — chosen because it's the color associated with
   Zulsyika's birthdate
4. **megaZN dark pages** — nav, topic bar, posts, footer all on `var(--ink)`
5. **TL;DR block is not a summary** — it's a hook for the narrative below
6. **brand-zn is uppercase ZN** — not lowercase "zn"
7. **Photo placeholder** stays until real photo is ready — do not remove
