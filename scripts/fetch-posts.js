// scripts/fetch-posts.js
// Fetches published posts from Notion and generates static HTML files for megaZN

const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

// ── Convert Notion blocks to HTML ─────────────────────────────────────────────
function blocksToHtml(blocks) {
  let html = '';
  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph':
        html += `<p>${richTextToHtml(block.paragraph.rich_text)}</p>\n`;
        break;
      case 'heading_1':
        html += `<h2 id="${slugify(plainText(block.heading_1.rich_text))}">${richTextToHtml(block.heading_1.rich_text)}</h2>\n`;
        break;
      case 'heading_2':
        html += `<h2 id="${slugify(plainText(block.heading_2.rich_text))}">${richTextToHtml(block.heading_2.rich_text)}</h2>\n`;
        break;
      case 'heading_3':
        html += `<h3 id="${slugify(plainText(block.heading_3.rich_text))}">${richTextToHtml(block.heading_3.rich_text)}</h3>\n`;
        break;
      case 'bulleted_list_item':
        html += `<ul><li>${richTextToHtml(block.bulleted_list_item.rich_text)}</li></ul>\n`;
        break;
      case 'numbered_list_item':
        html += `<ol><li>${richTextToHtml(block.numbered_list_item.rich_text)}</li></ol>\n`;
        break;
      case 'quote':
        html += `<blockquote><p>${richTextToHtml(block.quote.rich_text)}</p></blockquote>\n`;
        break;
      case 'callout':
        html += `<div class="post-callout"><p>${richTextToHtml(block.callout.rich_text)}</p></div>\n`;
        break;
      case 'divider':
        html += `<hr>\n`;
        break;
      case 'image':
        const imgUrl = block.image.type === 'external'
          ? block.image.external.url
          : block.image.file.url;
        const caption = block.image.caption?.length
          ? `<p class="post-img-caption">${richTextToHtml(block.image.caption)}</p>`
          : '';
        html += `<img src="${imgUrl}" class="post-img" alt="">\n${caption}`;
        break;
      default:
        break;
    }
  }
  return html;
}

function richTextToHtml(richTexts) {
  return richTexts.map(t => {
    let text = t.plain_text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    if (t.annotations.bold)          text = `<strong>${text}</strong>`;
    if (t.annotations.italic)        text = `<em>${text}</em>`;
    if (t.annotations.code)          text = `<code>${text}</code>`;
    if (t.annotations.strikethrough) text = `<s>${text}</s>`;
    if (t.href)                       text = `<a href="${t.href}">${text}</a>`;
    return text;
  }).join('');
}

function plainText(richTexts) {
  return richTexts.map(t => t.plain_text).join('');
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ── Generate TOC from headings ────────────────────────────────────────────────
function generateToc(blocks) {
  const headings = blocks.filter(b =>
    ['heading_1', 'heading_2', 'heading_3'].includes(b.type)
  );
  if (!headings.length) return '';
  return headings.map(b => {
    const type = b.type;
    const text = plainText(b[type].rich_text);
    const id   = slugify(text);
    return `<li><a href="#${id}">${text}</a></li>`;
  }).join('\n');
}

// ── Generate individual post page ─────────────────────────────────────────────
function generatePostHtml(post, content, toc, allPosts) {
  const idx   = allPosts.findIndex(p => p.slug === post.slug);
  const prev  = allPosts[idx + 1];
  const next  = allPosts[idx - 1];

  const prevNav = prev
    ? `<div class="pn-item">
        <span class="pn-dir">← Previous post</span>
        <a href="/megazn/${prev.slug}"><div class="pn-title">${prev.title}</div></a>
      </div>`
    : `<div class="pn-item"></div>`;

  const nextNav = next
    ? `<div class="pn-item next">
        <span class="pn-dir">Next post →</span>
        <a href="/megazn/${next.slug}"><div class="pn-title">${next.title}</div></a>
      </div>`
    : `<div class="pn-item next"></div>`;

  const tagsHtml = post.tags.map(t =>
    `<span class="ps-tag">${t}</span>`
  ).join('');

  const topicClass = post.tags[0]
    ? `topic-${post.tags[0].toLowerCase().replace(/\s+/g, '-')}`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${post.excerpt}">
  <title>${post.title} — megaZN</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;0,9..144,800;1,9..144,400;1,9..144,700;1,9..144,800&family=PT+Sans:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/base.css">
  <link rel="stylesheet" href="/assets/css/megazn.css">
</head>
<body>

<nav id="nav" style="background:rgba(28,28,28,0.95); border-bottom-color: rgba(255,255,255,0.08);">
  <div class="nav-inner">
    <a href="/" class="nav-logo">
      <span class="brand-the" style="color:rgba(255,255,255,0.35);">the</span><span class="brand-zn">ZN</span><span class="brand-projects" style="color:rgba(255,255,255,0.35);">projects</span>
    </a>
    <ul class="nav-links">
      <li><a href="/work" style="color:rgba(255,255,255,0.4);">Work</a></li>
      <li><a href="/megazn" style="color:rgba(255,255,255,0.4);">megaZN</a></li>
      <li><a href="/about" style="color:rgba(255,255,255,0.4);">About</a></li>
      <li class="nav-cta"><a href="/#contact">Say hi</a></li>
    </ul>
  </div>
</nav>

<header id="post-header">
  <div class="wrap">
    <div class="post-header-inner">
      <a href="/megazn" class="post-back">Back to megaZN</a>
      <div class="post-header-meta">
        <span class="post-topic ${topicClass}">${post.tags[0] || ''}</span>
        <span class="post-date-pub">${post.date}</span>
        <span class="post-read-time">· ${post.readTime}</span>
      </div>
      <h1 class="post-title">${post.title}</h1>
      <p class="post-subtitle">${post.excerpt}</p>
    </div>
  </div>
</header>

<section id="post-body">
  <div class="wrap">
    <div class="post-grid">
      <article class="post-content">
        ${content}
        <hr>
        <div class="post-author">
          <div class="post-author-photo">🧑‍💻</div>
          <div>
            <div class="post-author-name">Zulsyika Nurfaizah</div>
            <div class="post-author-bio">Learning designer by training. Systems builder by necessity. Unreasonably interested in whatever she's currently working on.</div>
          </div>
        </div>
        <nav class="post-nav" aria-label="Post navigation">
          ${prevNav}
          ${nextNav}
        </nav>
      </article>
      <aside class="post-sidebar">
        <div class="ps-section">
          <div class="ps-label">In this post</div>
          <ul class="ps-toc">${toc}</ul>
        </div>
        <div class="ps-section">
          <div class="ps-label">Tags</div>
          <div class="ps-tags">${tagsHtml}</div>
        </div>
      </aside>
    </div>
  </div>
</section>

<footer style="background:var(--ink); border-top: 1px solid rgba(255,255,255,0.07);">
  <div class="footer-inner">
    <span class="footer-logo">
      <span class="brand-the" style="color:rgba(255,255,255,0.3);">the</span><span class="brand-zn">ZN</span><span class="brand-projects" style="color:rgba(255,255,255,0.3);">projects</span>
    </span>
    <ul class="footer-links">
      <li><a href="/work">Work</a></li>
      <li><a href="/megazn">megaZN</a></li>
      <li><a href="/about">About</a></li>
      <li><a href="/#contact">Contact</a></li>
    </ul>
    <span class="footer-copy">© 2026 Zulsyika Nurfaizah</span>
  </div>
</footer>

<script src="/assets/base.js"></script>
<script>
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.style.borderBottomColor = window.scrollY > 40
      ? 'rgba(255,255,255,0.12)'
      : 'rgba(255,255,255,0.08)';
  }, { passive: true });

  const headings = document.querySelectorAll('.post-content h2[id], .post-content h3[id]');
  const tocLinks = document.querySelectorAll('.ps-toc a');
  if (headings.length) {
    window.addEventListener('scroll', () => {
      let current = '';
      headings.forEach(h => { if (window.scrollY >= h.offsetTop - 120) current = h.id; });
      tocLinks.forEach(a => { a.classList.toggle('active', a.getAttribute('href') === '#' + current); });
    }, { passive: true });
  }
</script>
</body>
</html>`;
}

// ── Generate homepage megaZN cards ───────────────────────────────────────────
function generateHomePostsHtml(posts) {
  const latest = posts.slice(0, 3);

  const cardHtml = latest.map((post, i) => `
      <a href="/megazn/${post.slug}" class="post-card reveal${i > 0 ? ` reveal-delay-${i}` : ''}">
        <div class="post-date">${post.date}</div>
        <h3 class="post-title">${post.title}</h3>
        <p class="post-excerpt">${post.excerpt}</p>
        <span class="post-link">Read post</span>
      </a>`).join('\n');

  const comingSoon = posts.length < 3
    ? `\n      <article class="post-card coming-soon reveal reveal-delay-${latest.length}">
        <div class="coming-soon-icon">megaZN</div>
        <p class="coming-soon-text">More posts incoming.<br>The yapping has only just begun.</p>
      </article>`
    : '';

  const existingHome = fs.readFileSync('index.html', 'utf8');
  return existingHome.replace(
    /<!-- HOME_POSTS_START -->[\s\S]*?<!-- HOME_POSTS_END -->/,
    `<!-- HOME_POSTS_START -->\n    <div class="posts-grid">${cardHtml}${comingSoon}\n    </div>\n    <!-- HOME_POSTS_END -->`
  );
}

// ── Generate megaZN index page ────────────────────────────────────────────────
function generateIndexHtml(posts) {
  const featured = posts[0];
  const rest     = posts.slice(1);

  const featuredHtml = featured ? `
    <a href="/megazn/${featured.slug}" class="post-featured reveal" data-topic="${featured.tags[0] ? tagToTopic(featured.tags[0]) : ''}">
      <div class="pf-content">
        <div class="pf-meta">
          <span class="pf-date">${featured.date}</span>
          <span class="pf-topic">${featured.tags[0] || ''}</span>
        </div>
        <h2 class="pf-title">${featured.title}</h2>
        <p class="pf-excerpt">${featured.excerpt}</p>
        <span class="pf-link">Read post</span>
      </div>
      <div class="pf-thumb">
        <div class="pf-thumb-placeholder">${featured.title}</div>
      </div>
    </a>` : '';

  const gridHtml = rest.map((post, i) => `
    <a href="/megazn/${post.slug}" class="post-card reveal${i > 0 ? ` reveal-delay-${Math.min(i, 3)}` : ''}" data-topic="${post.tags[0] ? tagToTopic(post.tags[0]) : ''}">
      <div class="pc-meta">
        <span class="pc-date">${post.date}</span>
        <span class="pc-topic">${post.tags[0] || ''}</span>
      </div>
      <h3 class="pc-title">${post.title}</h3>
      <p class="pc-excerpt">${post.excerpt}</p>
      <span class="pc-link">Read post</span>
    </a>`).join('\n');

  const count = `${posts.length} post${posts.length !== 1 ? 's' : ''}`;

  const postsBlock = posts.length === 0
    ? `  <div class="posts-empty">
    <p class="posts-empty-title">Nothing here yet.</p>
    <p class="posts-empty-sub">Posts are incoming. Maximum curiosity, minimal schedule.</p>
  </div>`
    : `${featuredHtml}\n<div class="posts-grid">\n${gridHtml}\n</div>`;

  // Read the existing megazn/index.html and inject the posts
  const existingIndex = fs.readFileSync(path.join('megazn', 'index.html'), 'utf8');
  return existingIndex
    .replace(/<!-- POSTS_START -->[\s\S]*?<!-- POSTS_END -->/,
      `<!-- POSTS_START -->\n${postsBlock}\n<!-- POSTS_END -->`)
    .replace(/id="topicCount">[^<]*</, `id="topicCount">${count}<`);
}

// ── Topic slug mapping (Notion tag → filter data-topic value) ─────────────────
const TOPIC_MAP = {
  'learning design': 'learning',
  'design':          'design',
  'behind the build':'build',
  'misc yapping':    'misc',
};
function tagToTopic(tag) {
  return TOPIC_MAP[tag.toLowerCase()] ?? tag.toLowerCase().split(' ')[0];
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Fetching posts from Notion...');

  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: { property: 'Status', status: { equals: 'Published' } },
    sorts: [{ property: 'Date', direction: 'descending' }]
  });

  const posts = response.results.map(page => ({
    id:       page.id,
    title:    plainText(page.properties.Title.title),
    slug:     page.properties.Slug.rich_text[0]?.plain_text || '',
    excerpt:  page.properties.Excerpt.rich_text[0]?.plain_text || '',
    date:     page.properties.Date.date?.start
                ? new Date(page.properties.Date.date.start).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                : '',
    readTime: page.properties['Read Time'].rich_text[0]?.plain_text || '',
    tags:     page.properties.Tags.multi_select.map(t => t.name),
  }));

  console.log(`Found ${posts.length} published post(s)`);

  for (const post of posts) {
    if (!post.slug) { console.warn(`Skipping "${post.title}" — no slug`); continue; }

    // Fetch blocks
    const blocksRes = await notion.blocks.children.list({ block_id: post.id, page_size: 100 });
    const content   = blocksToHtml(blocksRes.results);
    const toc       = generateToc(blocksRes.results);

    // Write post file
    const dir = path.join('megazn', post.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), generatePostHtml(post, content, toc, posts));
    fs.writeFileSync(path.join(dir, '.notion-generated'), '');
    console.log(`✓ Generated /megazn/${post.slug}/`);
  }

  // Remove generated post dirs for posts no longer published
  const publishedSlugs = new Set(posts.map(p => p.slug));
  const megaznDir = path.join('megazn');
  for (const entry of fs.readdirSync(megaznDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    const marker = path.join(megaznDir, slug, '.notion-generated');
    if (fs.existsSync(marker) && !publishedSlugs.has(slug)) {
      fs.rmSync(path.join(megaznDir, slug), { recursive: true, force: true });
      console.log(`✗ Removed stale /megazn/${slug}/`);
    }
  }

  // Update megaZN index
  fs.writeFileSync(path.join('megazn', 'index.html'), generateIndexHtml(posts));
  console.log('✓ Updated /megazn/');

  // Update homepage cards
  fs.writeFileSync('index.html', generateHomePostsHtml(posts));
  console.log('✓ Updated homepage megaZN cards');

  console.log('Done!');
}

main().catch(err => { console.error(err); process.exit(1); });