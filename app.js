/* app.js
   Portfolio script:
   - Fetches public repos for "PoojithaYelkur"
   - Renders Featured, Categories and All projects
   - Each project card shows name, description, language, stars, updated date and README snippet (~200 chars)
   - Card footer has TWO buttons:
       * Live Demo / Notebook -> repo.homepage (if valid) else falls back to repo page
       * View Code -> repo.html_url
   - IntersectionObserver used for reveal-on-scroll animations
   - Handles GitHub rate limits and suggests a PAT
*/

/* CONFIG */
const USER = "PoojithaYelkur";
const API_BASE = "https://api.github.com";
const REPOS_ENDPOINT = `${API_BASE}/users/${USER}/repos?per_page=100&sort=updated`;

/* OPTIONAL: for local testing set your token here (do NOT commit to public repos) */
let GITHUB_TOKEN = null; // e.g. "ghp_xxx"

/* FEATURED manual override: lowercase repo names */
const FEATURED = [
  // "example-repo"
];

/* Helpers */
function headers() {
  const h = { Accept: "application/vnd.github.v3+json" };
  if (GITHUB_TOKEN) h.Authorization = `token ${GITHUB_TOKEN}`;
  return h;
}
function el(tag, attrs = {}, text = "") {
  const e = document.createElement(tag);
  if (attrs.className) e.className = attrs.className;
  if (attrs.html) e.innerHTML = attrs.html;
  if (text) e.textContent = text;
  for (const k in attrs) {
    if (k !== "className" && k !== "html") e.setAttribute(k, attrs[k]);
  }
  return e;
}
function isValidHttpUrl(string) {
  try { const u = new URL(string); return u.protocol === "http:" || u.protocol === "https:"; }
  catch (e) { return false; }
}

/* Fetch utilities */
async function fetchJSON(url) {
  const res = await fetch(url, { headers: headers() });
  if (res.status === 403) throw new Error("rate_limited");
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

/* README snippet (first ~200 chars) */
async function fetchReadmeSnippet(repo) {
  const url = `${API_BASE}/repos/${USER}/${repo.name}/readme`;
  try {
    const data = await fetchJSON(url);
    if (data && data.content) {
      const decoded = atob(data.content.replace(/\n/g, ""));
      const cleaned = decoded.replace(/[#_*`>~\-\[\]\(\)]/g, " ").replace(/\s+/g, " ").trim();
      return cleaned.slice(0, 200) + (cleaned.length > 200 ? "…" : "");
    }
  } catch (err) {
    // Ignore; return empty snippet
  }
  return "";
}

/* Create a single project card element */
function createProjectCard(repo, readmeSnippet = "") {
  const card = el("article", { className: "card", role: "article", tabindex: "0" });

  // Title
  const h3 = el("h3");
  const nameLink = el("a", { href: "#", ariaLabel: `Open project ${repo.name}` }, repo.name);
  nameLink.addEventListener("click", (e) => e.preventDefault()); // buttons control navigation
  h3.appendChild(nameLink);
  card.appendChild(h3);

  // Description
  const desc = el("p", {}, repo.description || "No description provided.");
  card.appendChild(desc);

  if (readmeSnippet) {
    const sn = el("p", { className: "muted" }, readmeSnippet);
    card.appendChild(sn);
  }

  // Meta row
  const meta = el("div", { className: "meta" });
  meta.appendChild(el("div", { className: "badge" }, repo.language || "Other"));
  meta.appendChild(el("div", {}, `⭐ ${repo.stargazers_count || 0}`));
  if (repo.homepage && isValidHttpUrl(repo.homepage)) {
    meta.appendChild(el("div", { className: "demo-badge" }, "Live Demo"));
  }
  const date = el("div", {}, new Date(repo.updated_at).toLocaleDateString());
  date.style.marginLeft = "auto";
  date.style.fontSize = "12px";
  date.style.color = "var(--muted)";
  meta.appendChild(date);
  card.appendChild(meta);

  // Footer: two buttons
  const footer = el("div", { className: "card-footer" });
  const liveLabel = (repo.homepage && isValidHttpUrl(repo.homepage)) ? "Live Demo" : "Open";
  const liveBtn = el("a", { className: "btn live", role: "button", href: "#" }, liveLabel);
  const codeBtn = el("a", { className: "btn code", role: "button", href: "#", target: "_blank", rel: "noopener noreferrer" }, "View Code");

  liveBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (repo.homepage && isValidHttpUrl(repo.homepage)) {
      window.open(repo.homepage, "_blank", "noopener,noreferrer");
    } else {
      window.open(repo.html_url, "_blank", "noopener,noreferrer");
    }
  });
  codeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    window.open(repo.html_url, "_blank", "noopener,noreferrer");
  });

  liveBtn.setAttribute("aria-label", `Open live demo for ${repo.name}`);
  codeBtn.setAttribute("aria-label", `Open GitHub repo for ${repo.name}`);

  footer.appendChild(liveBtn);
  footer.appendChild(codeBtn);
  card.appendChild(footer);

  // Keyboard: Enter/Space opens Live demo
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      liveBtn.click();
    }
  });

  return card;
}

/* Grouping and featured selection */
function groupByLanguage(repos) {
  return repos.reduce((acc, r) => {
    const k = r.language || "Other";
    if (!acc[k]) acc[k] = [];
    acc[k].push(r);
    return acc;
  }, {});
}

function pickFeatured(repos) {
  const manual = FEATURED.map(s => s.toLowerCase());
  let featured = repos.filter(r => manual.includes(r.name.toLowerCase()));
  if (featured.length < 3) {
    const topicMatches = repos.filter(r => {
      const nameMatch = r.name && r.name.toLowerCase().includes("portfolio-featured");
      const topics = r.topics || [];
      const topicMatch = topics.some(t => t.toLowerCase().includes("portfolio-featured"));
      return nameMatch || topicMatch;
    });
    topicMatches.forEach(t => { if (!featured.find(f => f.id === t.id)) featured.push(t); });
  }
  if (featured.length < 3) {
    const sorted = [...repos].sort((a,b) => {
      const aScore = (a.stargazers_count * 5) + (new Date(a.updated_at).getTime()/1000);
      const bScore = (b.stargazers_count * 5) + (new Date(b.updated_at).getTime()/1000);
      return bScore - aScore;
    });
    for (const s of sorted) {
      if (featured.length >= 3) break;
      if (!featured.find(f => f.id === s.id)) featured.push(s);
    }
  }
  return featured.slice(0,3);
}

/* Rendering helpers */
async function renderFeatured(repos) {
  const container = document.getElementById("featured-grid");
  container.innerHTML = "";
  const featured = pickFeatured(repos);
  for (const r of featured) {
    const snip = await fetchReadmeSnippet(r);
    container.appendChild(createProjectCard(r, snip));
  }
}

function renderCategories(repos) {
  const container = document.getElementById("categories");
  container.innerHTML = "";
  const groups = groupByLanguage(repos);
  Object.keys(groups).sort().forEach(lang => {
    const wrap = el("div");
    wrap.appendChild(el("h3", {}, `${lang} (${groups[lang].length})`));
    const row = el("div", { className: "projects-grid" });
    groups[lang].slice(0,6).forEach(r => row.appendChild(createProjectCard(r)));
    wrap.appendChild(row);
    container.appendChild(wrap);
  });
}

async function renderAll(repos) {
  const container = document.getElementById("projects");
  container.innerHTML = "";
  for (const r of repos) {
    const snip = await fetchReadmeSnippet(r);
    container.appendChild(createProjectCard(r, snip));
  }
}

/* Rate limit banner */
function showRateLimitNotice() {
  const main = document.getElementById("main");
  const banner = el("div", { className: "note" }, "");
  banner.innerHTML = `<strong>GitHub API rate limit reached.</strong> For local development, set a Personal Access Token (PAT) in app.js (GITHUB_TOKEN). See README for instructions.`;
  main.prepend(banner);
}

/* IntersectionObserver for reveal-on-scroll */
function initRevealObserver() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove("reveal");
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(elm => obs.observe(elm));
}

/* Initialize app */
async function init() {
  try {
    const repos = await fetchJSON(REPOS_ENDPOINT);
    repos.sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));
    await renderFeatured(repos);
    renderCategories(repos);
    await renderAll(repos);
    initRevealObserver();
  } catch (err) {
    console.error(err);
    if (err.message === "rate_limited") showRateLimitNotice();
    else {
      const main = document.getElementById("main");
      const banner = el("div", { className: "note" }, "");
      banner.innerHTML = `<strong>Failed to load GitHub repos.</strong> Check console for details.`;
      main.prepend(banner);
    }
  }
}

/* Run on DOM ready */
document.addEventListener("DOMContentLoaded", init);
