// scripts/fetch-posts.js
// Fetches published posts from Notion and generates static HTML files for megaZN

const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

// ── Convert Notion blocks to HTML ─────────────────────────────────────────────
async function blocksToHtml(blocks, ctx) {
  let html = '';
  let listOpen = null; // 'ul' | 'ol' | null — so consecutive items share one list
  const closeList = () => { if (listOpen) { html += `</${listOpen}>\n`; listOpen = null; } };

  for (const block of blocks) {
    // Group consecutive list items into a single <ul>/<ol> (else each restarts at 1)
    if (block.type === 'bulleted_list_item') {
      if (listOpen !== 'ul') { closeList(); html += '<ul>\n'; listOpen = 'ul'; }
      html += `<li>${richTextToHtml(block.bulleted_list_item.rich_text)}</li>\n`;
      continue;
    }
    if (block.type === 'numbered_list_item') {
      if (listOpen !== 'ol') { closeList(); html += '<ol>\n'; listOpen = 'ol'; }
      html += `<li>${richTextToHtml(block.numbered_list_item.rich_text)}</li>\n`;
      continue;
    }
    closeList();

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
      case 'quote':
        html += `<blockquote><p>${richTextToHtml(block.quote.rich_text)}</p></blockquote>\n`;
        break;
      case 'callout':
        html += `<div class="post-callout"><p>${richTextToHtml(block.callout.rich_text)}</p></div>\n`;
        break;
      case 'divider':
        html += `<hr>\n`;
        break;
      case 'image': {
        const imgUrl = block.image.type === 'external'
          ? block.image.external.url
          : block.image.file.url;
        const caption = block.image.caption?.length
          ? `<p class="post-img-caption">${richTextToHtml(block.image.caption)}</p>`
          : '';
        const alt  = plainText(block.image.caption || []).replace(/"/g, '&quot;');
        const file = ctx ? await downloadImage(imgUrl, ctx.dir, `img-${++ctx.img}`) : null;
        const src  = file ? `/megazn/${ctx.slug}/${file}` : imgUrl;
        html += `<img src="${src}" class="post-img" alt="${alt}">\n${caption}`;
        break;
      }
      case 'column_list': {
        const cols = await notion.blocks.children.list({ block_id: block.id, page_size: 100 });
        let colsHtml = '';
        for (const col of cols.results) {
          const kids = await notion.blocks.children.list({ block_id: col.id, page_size: 100 });
          colsHtml += `<div class="post-column">${await blocksToHtml(kids.results, ctx)}</div>`;
        }
        html += `<div class="post-columns">${colsHtml}</div>\n`;
        break;
      }
      default:
        break;
    }
  }
  closeList();
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

// Download a Notion image to the post dir so it doesn't rot when the signed
// URL expires (~1h for uploaded files). Returns the saved filename or null.
async function downloadImage(url, destDir, baseName) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    let ext = 'png';
    if (ct.includes('jpeg') || ct.includes('jpg')) ext = 'jpg';
    else if (ct.includes('png'))  ext = 'png';
    else if (ct.includes('gif'))  ext = 'gif';
    else if (ct.includes('webp')) ext = 'webp';
    else if (ct.includes('svg'))  ext = 'svg';
    else {
      const m = new URL(url).pathname.match(/\.(png|jpe?g|gif|webp|svg)$/i);
      if (m) ext = m[1].toLowerCase().replace('jpeg', 'jpg');
    }
    const buf  = Buffer.from(await res.arrayBuffer());
    const file = `${baseName}.${ext}`;
    fs.writeFileSync(path.join(destDir, file), buf);
    return file;
  } catch (e) {
    console.warn(`  image download failed (${url.slice(0, 60)}...): ${e.message}`);
    return null;
  }
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
    `<a class="ps-tag" href="/megazn?topic=${tagToTopic(t)}">${t}</a>`
  ).join('');

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

<nav id="nav">
  <div class="nav-inner">
    <a href="/" class="nav-logo"><span class="brand-the">the</span><span class="brand-zn">ZN</span><span class="brand-projects">projects</span></a>
    <ul class="nav-links">
      <li><a href="/">Home</a></li>
      <li><a href="/work">Work</a></li>
      <li><a href="/megazn" class="active">megaZN</a></li>
      <li><a href="/about">About</a></li>
      <li class="nav-cta"><a href="/#contact">Say hi</a></li>
    </ul>
  </div>
</nav>

<header id="post-header">
  <div class="wrap">
    <div class="post-header-inner">
      <a href="/megazn" class="post-back">Back to megaZN</a>
      <div class="post-header-meta">
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
        <div class="post-like" data-slug="${post.slug}">
          <button class="post-like-btn" type="button" aria-pressed="false" aria-label="Like this post">
            <svg class="post-like-heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.716-4.297-9.428-7.01C.86 12.278.86 9.223 2.572 7.51a4.5 4.5 0 0 1 6.364 0L12 10.574l3.064-3.064a4.5 4.5 0 0 1 6.364 6.364C18.716 16.703 12 21 12 21z"/></svg>
            <span class="post-like-count" aria-hidden="true">–</span>
          </button>
          <span class="post-like-text">Found this worth reading? Give it a like.</span>
        </div>
        <div class="post-share">
          <span class="post-share-label">Share</span>
          <div class="post-share-btns">
            <a class="share-btn" id="shareX" href="#" target="_blank" rel="noopener">𝕏 / Twitter</a>
            <a class="share-btn" id="shareLinkedIn" href="#" target="_blank" rel="noopener">LinkedIn</a>
            <a class="share-btn" id="shareWhatsApp" href="#" target="_blank" rel="noopener">WhatsApp</a>
            <button class="share-btn" id="shareCopy">Copy link</button>
            <button class="share-btn" id="shareNative" style="display:none">Share ↗</button>
          </div>
        </div>
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

<footer>
  <div class="footer-inner">
    <span class="footer-logo">
      <span class="brand-the">the</span><span class="brand-zn">ZN</span><span class="brand-projects">projects</span>
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
<script src="/assets/likes.js"></script>
<script>
  const headings = document.querySelectorAll('.post-content h2[id], .post-content h3[id]');
  const tocLinks = document.querySelectorAll('.ps-toc a');
  if (headings.length) {
    window.addEventListener('scroll', () => {
      let current = '';
      headings.forEach(h => { if (window.scrollY >= h.offsetTop - 120) current = h.id; });
      tocLinks.forEach(a => { a.classList.toggle('active', a.getAttribute('href') === '#' + current); });
    }, { passive: true });
  }

  // Share buttons
  (function() {
    const url   = encodeURIComponent(location.href);
    const title = encodeURIComponent(document.title);
    document.getElementById('shareX').href         = 'https://twitter.com/intent/tweet?url=' + url + '&text=' + title;
    document.getElementById('shareLinkedIn').href  = 'https://linkedin.com/sharing/share-offsite/?url=' + url;
    document.getElementById('shareWhatsApp').href  = 'https://wa.me/?text=' + title + '%20' + url;
    const copyBtn = document.getElementById('shareCopy');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(location.href).then(() => {
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => { copyBtn.textContent = 'Copy link'; copyBtn.classList.remove('copied'); }, 2000);
      });
    });
    const nativeBtn = document.getElementById('shareNative');
    if (navigator.share) {
      nativeBtn.style.display = '';
      nativeBtn.addEventListener('click', () => navigator.share({ title: document.title, url: location.href }));
    }
  })();
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
    <a href="/megazn/${featured.slug}" class="post-featured reveal" data-topics="${(featured.tags || []).map(tagToTopic).join(' ')}">
      <div class="pf-content">
        <div class="pf-meta">
          <span class="pf-date">${featured.date}</span>
        </div>
        <h2 class="pf-title">${featured.title}</h2>
        <p class="pf-excerpt">${featured.excerpt}</p>
        <span class="pf-link">Read post</span>
      </div>
      <div class="pf-thumb">
        ${featured.cover
          ? `<img src="${featured.cover}" alt="${featured.title.replace(/"/g, '&quot;')}">`
          : `<div class="pf-thumb-placeholder">${featured.title}</div>`}
      </div>
    </a>` : '';

  const gridHtml = rest.map((post, i) => `
    <a href="/megazn/${post.slug}" class="post-card reveal${i > 0 ? ` reveal-delay-${Math.min(i, 3)}` : ''}" data-topics="${(post.tags || []).map(tagToTopic).join(' ')}">
      <div class="pc-meta">
        <span class="pc-date">${post.date}</span>
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
  'books':           'books',
};
function tagToTopic(tag) {
  return TOPIC_MAP[tag.toLowerCase()] ?? tag.toLowerCase().split(' ')[0];
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Fetching posts from Notion...');

  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: { property: 'Status', select: { equals: 'Published' } },
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
    coverUrl: page.cover ? (page.cover.type === 'external' ? page.cover.external.url : page.cover.file.url) : '',
    cover:    '',
  }));

  console.log(`Found ${posts.length} published post(s)`);

  for (const post of posts) {
    if (!post.slug) { console.warn(`Skipping "${post.title}" - no slug`); continue; }

    const dir = path.join('megazn', post.slug);
    fs.mkdirSync(dir, { recursive: true });

    // Cover image (Notion page cover) → download so the signed URL can't expire
    if (post.coverUrl) {
      const f = await downloadImage(post.coverUrl, dir, 'cover');
      post.cover = f ? `/megazn/${post.slug}/${f}` : post.coverUrl;
    }

    // Fetch + convert blocks (downloads inline images, expands column layouts)
    const blocksRes = await notion.blocks.children.list({ block_id: post.id, page_size: 100 });
    const ctx       = { slug: post.slug, dir, img: 0 };
    const content   = await blocksToHtml(blocksRes.results, ctx);
    const toc       = generateToc(blocksRes.results);

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