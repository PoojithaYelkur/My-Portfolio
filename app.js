// app.js
// Fetches public repos for user and renders portfolio UI.
// Edit USER or FEATURED arrays below as needed.
// Optional: set GITHUB_TOKEN (personal access token) for higher API rate limits.
// WARNING: If you add a token, do NOT commit it to a public repo.

const USER = "PoojithaYelkur";
const GITHUB_API = `https://api.github.com`;
const REPOS_ENDPOINT = `${GITHUB_API}/users/${USER}/repos?per_page=100&sort=updated`;

// Optional: add your PAT here for local use (string) OR set to null to remain unauthenticated.
// const GITHUB_TOKEN = "ghp_xxx"; // <-- do NOT commit a token to public repos
const GITHUB_TOKEN = null;

const FEATURED = [
  // Optional manual override: repo names to force into Featured (lowercase match)
  // "some-repo-name"
];

function headers() {
  const h = { Accept: "application/vnd.github.v3+json" };
  if (GITHUB_TOKEN) h.Authorization = `token ${GITHUB_TOKEN}`;
  return h;
}

function el(tag, opts = {}) {
  const e = document.createElement(tag);
  if (opts.className) e.className = opts.className;
  if (opts.html) e.innerHTML = opts.html;
  if (opts.text) e.textContent = opts.text;
  return e;
}

async function fetchJSON(url) {
  const res = await fetch(url, { headers: headers() });
  if (res.status === 403) {
    // likely rate-limited
    throw new Error("rate_limited");
  }
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

function mkCard(repo, readmeSnippet = "") {
  const wrapper = el('div', { className: 'card', });
  wrapper.tabIndex = 0;
  // title & click behavior
  const title = el('h3', {});
  const link = el('a', { html: repo.name });
  link.href = '#';
  link.setAttribute('role', 'link');
  link.setAttribute('aria-label', `Open project ${repo.name}`);
  // Determine click target: prefer homepage (if valid), else repo.html_url
  const homepage = (repo.homepage && repo.homepage.trim()) ? repo.homepage.trim() : null;
  const targetUrl = (homepage && isValidHttpUrl(homepage)) ? homepage : repo.html_url;
  link.addEventListener('click', (e) => {
    e.preventDefault();
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  });
  // allow Enter key on card to open
  wrapper.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  });

  title.appendChild(link);
  wrapper.appendChild(title);

  const desc = el('p', { text: repo.description || "No description available." });
  wrapper.appendChild(desc);

  if (readmeSnippet) {
    const rd = el('p', { className: 'readme-snippet', text: readmeSnippet });
    rd.style.color = 'var(--muted)';
    rd.style.fontSize = '13px';
    rd.style.marginTop = '8px';
    wrapper.appendChild(rd);
  }

  const meta = el('div', { className: 'meta' });
  const lang = el('div', { className: 'badge', text: repo.language || 'Other' });
  const stars = el('div', { html: `⭐ ${repo.stargazers_count || 0}` });
  meta.appendChild(lang);
  meta.appendChild(stars);

  if (homepage && isValidHttpUrl(homepage)) {
    const demo = el('div', { className: 'demo-badge', text: 'Live Demo' });
    meta.appendChild(demo);
  }

  const date = el('div', { text: new Date(repo.updated_at).toLocaleDateString() });
  date.style.marginLeft = 'auto';
  date.style.fontSize = '12px';
  date.style.color = 'var(--muted)';
  meta.appendChild(date);

  wrapper.appendChild(meta);
  return wrapper;
}

function isValidHttpUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

function groupByLanguage(repos) {
  const map = {};
  repos.forEach(r => {
    const k = r.language || "Other";
    if (!map[k]) map[k] = [];
    map[k].push(r);
  });
  return map;
}

function pickFeatured(repos) {
  // 1. Use FEATURED array (explicit)
  const namesLower = FEATURED.map(n => n.toLowerCase());
  let featured = repos.filter(r => namesLower.includes(r.name.toLowerCase()));
  // 2. Use topic or name containing "portfolio-featured"
  if (featured.length < 3) {
    const more = repos.filter(r => {
      const topics = r.topics || [];
      const nameMatch = (r.name && r.name.toLowerCase().includes('portfolio-featured'));
      const topicMatch = topics.some(t => t.toLowerCase().includes('portfolio-featured'));
      return (nameMatch || topicMatch);
    });
    more.forEach(m => { if (!featured.find(f => f.id === m.id)) featured.push(m); });
  }
  // 3. Fill remaining by heuristic (stars + recent)
  if (featured.length < 3) {
    const sorted = repos.slice().sort((a,b) => {
      const aScore = (a.stargazers_count * 5) + (new Date(a.updated_at).getTime() / 1000);
      const bScore = (b.stargazers_count * 5) + (new Date(b.updated_at).getTime() / 1000);
      return bScore - aScore;
    });
    for (const s of sorted) {
      if (featured.length >= 3) break;
      if (!featured.find(f => f.id === s.id)) featured.push(s);
    }
  }
  return featured.slice(0,3);
}

async function fetchReadmeSnippet(repo) {
  const readmeUrl = `${GITHUB_API}/repos/${USER}/${repo.name}/readme`;
  try {
    const data = await fetchJSON(readmeUrl);
    if (data && data.content) {
      const buff = atob(data.content.replace(/\n/g, ''));
      const text = buff.replace(/[#_*`>~\-\[\]\(\)]/g, ' ').trim(); // rough cleanup
      return text.slice(0, 200) + (text.length > 200 ? '…' : '');
    }
  } catch (err) {
    // ignore individual readme errors
  }
  return "";
}

async function renderFeatured(repos) {
  const container = document.getElementById('featured-grid');
  container.innerHTML = '';
  const featured = pickFeatured(repos);
  for (const r of featured) {
    const snippet = await fetchReadmeSnippet(r);
    container.appendChild(mkCard(r, snippet));
  }
}

function renderCategories(repos) {
  const container = document.getElementById('categories');
  container.innerHTML = '';
  const groups = groupByLanguage(repos);
  Object.keys(groups).sort().forEach(lang => {
    const wrap = el('div');
    const title = el('h3', { className: 'cat-title', text: `${lang} (${groups[lang].length})` });
    wrap.appendChild(title);
    const row = el('div', { className: 'grid' });
    groups[lang].slice(0,6).forEach(r => {
      row.appendChild(mkCard(r));
    });
    wrap.appendChild(row);
    container.appendChild(wrap);
  });
}

async function renderAll(repos) {
  const container = document.getElementById('projects');
  container.innerHTML = '';
  for (const r of repos) {
    const snippet = await fetchReadmeSnippet(r);
    container.appendChild(mkCard(r, snippet));
  }
}

function showRateLimitNotice() {
  const main = document.getElementById('main');
  const banner = el('div', { className: 'note', html: `<strong>GitHub API rate limit reached or blocked.</strong> To fix locally, create a GitHub Personal Access Token (no scopes required) and set <code>GITHUB_TOKEN</code> in <code>app.js</code>. Do not commit tokens to public repos.` });
  main.insertBefore(banner, main.firstChild);
}

async function init() {
  try {
    const repos = await fetchJSON(REPOS_ENDPOINT);
    // Ensure topics are available (GitHub v3 returns topics only with custom Accept header in some cases).
    // But topics might be empty — leave as-is.
    repos.sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));
    // Render
    await renderFeatured(repos);
    renderCategories(repos);
    await renderAll(repos);
  } catch (err) {
    console.error(err);
    if (err.message === "rate_limited") {
      showRateLimitNotice();
    } else {
      const main = document.getElementById('main');
      const banner = el('div', { className: 'note', html: `<strong>Failed to load GitHub repos.</strong> Check console for details.` });
      main.insertBefore(banner, main.firstChild);
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
