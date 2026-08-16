import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const contentRoot = path.join(root, 'vibe-coding');
const ignored = new Set(['.git', '.github', 'scripts', 'node_modules']);

function escapeHtml(value = '') {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character]);
}

function titleFromSlug(slug) {
  return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function descriptionFromHtml(html) {
  const metaPatterns = [
    /<meta\b[^>]*\bdescription=["']([^"']*)["']/i,
    /<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["']([^"']*)["']/i,
    /<meta\b[^>]*\bcontent=["']([^"']*)["'][^>]*\bname=["']description["']/i,
  ];
  return metaPatterns.find((pattern) => pattern.test(html))?.exec(html)?.[1]?.trim() || '';
}

async function collectSearchText(folder, entries = []) {
  const children = await readdir(folder, { withFileTypes: true });
  for (const child of children) {
    const childPath = path.join(folder, child.name);
    if (child.isDirectory()) {
      await collectSearchText(childPath, entries);
    } else {
      entries.push(child.name);
      if (/\.(html?|css|js|mjs|json|md|txt|svg|xml)$/i.test(child.name)) {
        try {
          entries.push(await readFile(childPath, 'utf8'));
        } catch {
          // Ignore files that cannot be read as text.
        }
      }
    }
  }
  return entries.join(' ');
}

async function getProjects(folder = root) {
  const entries = await readdir(folder, { withFileTypes: true });
  const projects = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || ignored.has(entry.name) || entry.name.startsWith('.')) continue;
    const projectFolder = path.join(folder, entry.name);
    const relativeFolder = path.relative(root, projectFolder).split(path.sep).join('/');

    let metadata = {};
    const metadataPath = path.join(projectFolder, 'project.json');
    if (existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
      } catch (error) {
        console.warn(`Could not parse ${metadataPath}: ${error.message}`);
      }
    }

    const files = await readdir(projectFolder, { withFileTypes: true });
    const htmlFiles = files
      .filter((file) => file.isFile() && /\.html?$/i.test(file.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (htmlFiles.length) {
      const image = files.find((file) => file.isFile() && /\.(avif|gif|jpe?g|png|webp)$/i.test(file.name));
      const pathParts = relativeFolder.split('/');
      const sectionName = pathParts[1] || pathParts[0];
      const eyebrowName = pathParts[2] || sectionName;
      const searchText = await collectSearchText(projectFolder);
      for (const htmlFile of htmlFiles) {
        const html = await readFile(path.join(projectFolder, htmlFile.name), 'utf8');
        projects.push({
          slug: relativeFolder,
          entry: htmlFile.name,
          title: titleFromSlug(path.basename(htmlFile.name, path.extname(htmlFile.name))),
          description: metadata.description || descriptionFromHtml(html) || 'A small work in progress.',
          section: titleFromSlug(sectionName),
          eyebrow: titleFromSlug(eyebrowName),
          searchText: [relativeFolder, htmlFile.name, searchText, JSON.stringify(metadata)].join(' '),
          image: image ? `${relativeFolder}/${image.name}` : null,
        });
      }
    }

    projects.push(...await getProjects(projectFolder));
  }

  return projects.sort((a, b) => a.title.localeCompare(b.title));
}

function renderCard(project, index) {
  const projectUrl = `${project.slug}/${project.entry}`;
  const preview = `<iframe src="${escapeHtml(projectUrl)}" title="Preview of ${escapeHtml(project.title)}" loading="lazy" tabindex="-1"></iframe>`;
  return `<a class="project-card" data-search="${escapeHtml(project.searchText)}" href="${escapeHtml(projectUrl)}">
      <div class="card-art">${preview}<span class="arrow" aria-hidden="true">↗</span></div>
      <div class="card-copy"><span class="eyebrow">${escapeHtml(project.eyebrow)}</span><h2>${escapeHtml(project.title)}</h2><p>${escapeHtml(project.description)}</p><span class="visit">Explore work <span aria-hidden="true">→</span></span></div>
    </a>`;
}

const projects = await getProjects(contentRoot);
const sectionFolders = (await readdir(contentRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
  .sort((a, b) => a.name.localeCompare(b.name));
const projectsBySection = new Map();
for (const project of projects) {
  const sectionProjects = projectsBySection.get(project.section) || [];
  sectionProjects.push(project);
  projectsBySection.set(project.section, sectionProjects);
}
const sections = sectionFolders.map((folder) => {
  const section = titleFromSlug(folder.name);
  const sectionProjects = projectsBySection.get(section) || [];
  const cards = sectionProjects.length
    ? sectionProjects.map((project, index) => renderCard(project, index)).join('\n')
    : `<div class="empty-state"><span class="empty-mark" aria-hidden="true">✦</span><h2>No work here yet.</h2><p>Add a folder containing any <strong>.html</strong> file to feature it in this section.</p></div>`;
  return `<section class="collection-section" aria-labelledby="section-${escapeHtml(folder.name)}"><div class="collection-head"><h2 id="section-${escapeHtml(folder.name)}">${escapeHtml(section)}</h2><span class="count">${String(sectionProjects.length).padStart(2, '0')} works</span></div><div class="grid">${cards}</div></section>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="A collection of hobby projects and small experiments.">
  <title>Hobby Works — A small collection</title>
  <style>
    :root{color-scheme:light;--ink:#3a2417;--muted:#96705b;--paper:#fffaf3;--cream:#ffffff;--accent:#ff5c38;--teal:#0e9f8a;--amber:#ffb020;--line:#f0dcc9;--serif:Georgia,'Times New Roman',serif;--sans:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased}a{color:inherit;text-decoration:none}.shell{width:min(1160px,calc(100% - 48px));margin:auto}.topbar{display:flex;justify-content:space-between;align-items:center;padding:28px 0;border-bottom:1px solid var(--line);font-size:.78rem;letter-spacing:.08em;text-transform:uppercase}.brand{color:var(--accent);font-weight:800;letter-spacing:.15em}.topbar nav{color:var(--muted)}.hero{padding:clamp(70px,13vw,150px) 0 90px;max-width:830px;background-image:radial-gradient(circle at 24% -6%,#ff5c381a 0,transparent 42%),radial-gradient(circle at 88% 12%,#ffb0202e 0,transparent 38%)}.kicker,.eyebrow{color:var(--accent);font-size:.7rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.hero h1{font:clamp(3.6rem,9vw,8.2rem)/.88 var(--serif);letter-spacing:-.07em;margin:24px 0 30px;font-weight:400;color:#5a2e1c}.hero h1 em{color:var(--accent);font-style:italic;background-image:linear-gradient(transparent 68%,#ffb02066 68%);background-repeat:no-repeat;padding:0 .07em;margin-left:-.03em}.hero p{color:#9a5f41;font-size:1.08rem;line-height:1.7;max-width:510px;margin:0}.collection-head{display:flex;justify-content:space-between;align-items:baseline;border-top:2px solid #ff5c3833;padding:26px 0 28px}.collection-head h2{font:2rem var(--serif);margin:0;font-weight:400;color:#5a2e1c}.count{color:var(--muted);font-size:.78rem;background:#ff5c3814;border:1px solid #ff5c3826;padding:5px 12px;border-radius:999px;letter-spacing:.04em}.search-wrap{display:grid;grid-template-columns:auto minmax(180px,420px) auto;gap:14px;align-items:center;margin:0 0 30px}.search-wrap label{font-size:.72rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#9a5f41}.search-wrap input{width:100%;border:1.5px solid var(--line);background:var(--cream);color:var(--ink);font:inherit;padding:13px 16px;border-radius:12px;outline:none;transition:border-color .2s ease,box-shadow .2s ease}.search-wrap input:focus{border-color:var(--accent);box-shadow:0 0 0 4px #ff5c382b}.search-wrap span{color:#9a5f41;font-size:.78rem;min-width:130px;font-weight:600}.project-card[hidden]{display:none}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;padding-bottom:100px}.project-card{background:var(--cream);border:1.5px solid var(--line);border-radius:16px;overflow:hidden;transition:border-color .2s ease,box-shadow .25s ease,transform .25s ease}.project-card:hover,.project-card:focus-visible{transform:translateY(-4px) scale(1.012);border-color:#ff5c3899;box-shadow:0 16px 34px #b3571f2e}.card-art{height:235px;background:#ffe9d6;position:relative;overflow:hidden;display:grid;place-items:center;border-bottom:1.5px solid var(--line)}.card-art iframe{width:100%;height:100%;border:0;background:#fff;pointer-events:none}.arrow{position:absolute;right:14px;top:14px;background:var(--accent);color:#fff;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-size:1.05rem;box-shadow:0 8px 18px #ff5c3859}.card-copy{padding:24px 24px 27px}.card-copy h2{font:1.75rem var(--serif);font-weight:400;margin:9px 0 10px;color:#5a2e1c;transition:color .2s ease}.project-card:hover .card-copy h2,.project-card:focus-visible .card-copy h2{color:var(--accent)}.card-copy p{color:#96705b;font-size:.9rem;line-height:1.55;min-height:44px;margin:0 0 20px}.visit{font-size:.75rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#c2531f;display:inline-flex;align-items:center}.visit span{color:var(--accent);font-size:1.1rem;margin-left:6px;transition:transform .2s ease}.project-card:hover .visit span,.project-card:focus-visible .visit span{transform:translateX(4px)}.empty-state{grid-column:1/-1;border:1.5px dashed #e8b98f;background:#fff3e4;padding:70px 30px;text-align:center;border-radius:16px}.empty-mark{color:var(--accent);font-size:2rem}.empty-state h2{font:2rem var(--serif);font-weight:400;margin:15px 0 8px;color:#5a2e1c}.empty-state p{color:#96705b;line-height:1.6}.empty-state strong{color:#3a2417}footer{border-top:1px solid var(--line);padding:26px 0 40px;color:#96705b;font-size:.78rem;display:flex;justify-content:space-between}@media(max-width:780px){.shell{width:min(100% - 32px,560px)}.topbar{padding:20px 0}.topbar nav{display:none}.hero{padding:80px 0 65px;background-image:none}.grid{grid-template-columns:1fr;gap:18px;padding-bottom:70px}.card-art{height:220px}.search-wrap{grid-template-columns:1fr;gap:8px;margin-bottom:24px}.search-wrap span{min-height:18px}footer{display:block;line-height:2}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,:before,:after{transition:none!important;animation:none!important}.project-card:hover,.project-card:focus-visible{transform:none}.visit span{transform:none}}
  </style>
</head>
<body>
  <header class="shell topbar"><a class="brand" href="./">Jezztify</a><nav>Selected hobby works · ${projects.length} ${projects.length === 1 ? 'project' : 'projects'}</nav></header>
  <main class="shell">
    <section class="hero"><span class="kicker">An evolving archive</span><h1>Made for the <em>joy</em> of making.</h1><p>A growing collection of experiments, useful little tools, and things made just because they seemed worth making.</p></section>
    <section aria-labelledby="collection-title"><div class="collection-head"><h2 id="collection-title">The collection</h2><span class="count">${String(projects.length).padStart(2, '0')} works</span></div><div class="search-wrap"><label for="project-search">Search the collection</label><input id="project-search" type="search" placeholder="Try a folder, model, or keyword…" autocomplete="off"><span id="search-status" role="status" aria-live="polite"></span></div>${sections}</section>
  </main>
  <footer class="shell"><span>© ${new Date().getFullYear()} Jezztify</span><span>Built one folder at a time.</span></footer>
  <script>
    const search = document.querySelector('#project-search');
    const status = document.querySelector('#search-status');
    const cards = [...document.querySelectorAll('.project-card')];
    let timer;
    search.addEventListener('input', () => {
      clearTimeout(timer);
      status.textContent = 'Searching in 1 second…';
      timer = setTimeout(() => {
        const query = search.value.trim().toLowerCase();
        let visible = 0;
        cards.forEach((card) => {
          const matches = !query || card.dataset.search.toLowerCase().includes(query);
          card.hidden = !matches;
          if (matches) visible += 1;
        });
        status.textContent = query ? visible + ' ' + (visible === 1 ? 'match' : 'matches') : '';
      }, 1000);
    });
  </script>
</body>
</html>`;

await writeFile(path.join(root, 'index.html'), html);
console.log(`Built gallery with ${projects.length} project${projects.length === 1 ? '' : 's'}.`);
