/**
 * app.js
 * - Fetches public repos for PoojithaYelkur
 * - Renders Featured, By Category, and All Projects
 * - Each card includes two buttons: Live Demo / Notebook (opens homepage) and View Code (opens GitHub)
 * - Implements IntersectionObserver for on-scroll reveal
 *
 * IMPORTANT:
 * - To avoid GitHub API rate limits during heavy usage, set GITHUB_TOKEN to a personal access token (see README).
 * - Do NOT commit PAT to a public repo.
 */

/* CONFIG */
const USER = "PoojithaYelkur";
const API_BASE = "https://api.github.com";
const REPOS_URL = `${API_BASE}/users/${USER}/repos?per_page=100&sort=updated`;
let GITHUB_TOKEN = null; // Set locally for higher rate limits: e.g. "ghp_xxx"

/* Optional manual featured override (lowercase repo names) */
const FEATURED = [
  // "styldex", "sawit.ai"
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
  try { const url = new URL(string); return url.protocol === "http:" || url.protocol === "https:"; }
  catch (_) { return false; }
}

/* Fetch utilities */
async function fetchJSON(url) {
  const res = await fetch(url, { headers: headers() });
  if (res.status === 403) throw new Error("rate_limited");
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

/* README snippet fetch (first ~200 chars) */
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
    // ignore readme errors (private, missing, or rate limit)
  }
  return "";
}

/* Card creation */
function createProjectCard(repo, readmeSnippet = "") {
  const card = el("article", { className: "card", role: "article", tabindex: "0" });
  const title = el("h3");
  const titleLink = el("a", { href: "#", ariaLabel: `Open project ${repo.name}` }, repo.name);
  titleLink.addEventListener("click", (e) => { e.preventDefault(); /* card buttons handle navigation */ });
  title.appendChild(titleLink);
  card.appendChild(title);

  const desc = el("p", {}, repo.description || "No description provided.");
  card.appendChild(desc);

  if (readmeSnippet) {
    const snip = el("p", { className: "muted" }, readmeSnippet);
    card.appendChild(snip);
  }

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

  // Footer with two buttons: Live Demo (if available) and View Code
  const footer = el("div", { className: "card-footer" });
  const liveBtn = el("a", { className: "btn live", role: "button", href: "#" }, repo.homepage && isValidHttpUrl(repo.homepage) ? "Live Demo" : "No Demo");
  const codeBtn = el("a", { className: "btn code", role: "button", href: "#", target: "_blank", rel: "noopener noreferrer" }, "View Code");

  // Attach behaviors
  liveBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (repo.homepage && isValidHttpUrl(repo.homepage)) {
      window.open(repo.homepage, "_blank", "noopener,noreferrer");
    } else {
      // fallback: open repo page if no homepage
      window.open(repo.html_url, "_blank", "noopener,noreferrer");
    }
  });
  codeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    window.open(repo.html_url, "_blank", "noopener,noreferrer");
  });

  // Accessibility attributes
  liveBtn.setAttribute("aria-label", `Open live demo for ${repo.name}`);
  codeBtn.setAttribute("aria-label", `Open GitHub repo for ${repo.name}`);

  footer.appendChild(liveBtn);
  footer.appendChild(codeBtn);
  card.appendChild(footer);

  return card;
}

/* Grouping and featured logic */
function groupByLanguage(repos) {
  return repos.reduce((acc, r) => {
    const k = r.language || "Other";
    if (!acc[k]) acc[k] = [];
    acc[k].push(r);
    return acc;
  }, {});
}

function pickFeatured(repos) {
  const lowered = FEATURED.map(s => s.toLowerCase());
  let featured = repos.filter(r => lowered.includes(r.name.toLowerCase()));
  if (featured.length < 3) {
    const byTopic = repos.filter(r => {
      const nameMatch = r.name && r.name.toLowerCase().includes("portfolio-featured");
      const topics = r.topics || [];
      const topicMatch = topics.some(t => t.toLowerCase().includes("portfolio-featured"));
      return nameMatch || topicMatch;
    });
    byTopic.forEach(b => { if (!featured.find(f => f.id === b.id)) featured.push(b); });
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

/* Rendering */
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
    const row = el("div", { className: "grid" });
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

/* Rate limit notice */
function showRateLimitNotice() {
  const main = document.getElementById("main");
  const banner = el("div", { className: "note" }, "");
  banner.innerHTML = `<strong>GitHub API rate limit reached.</strong> For local development, set a Personal Access Token in app.js (GITHUB_TOKEN). See README.`;
  main.prepend(banner);
}

/* IntersectionObserver for reveal on scroll */
function initObserver() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.remove("fade-in");
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(".fade-in").forEach(elm => obs.observe(elm));
}

/* Init */
async function init() {
  try {
    const repos = await fetchJSON(REPOS_URL);
    repos.sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));
    await renderFeatured(repos);
    renderCategories(repos);
    await renderAll(repos);
    initObserver();
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

document.addEventListener("DOMContentLoaded", init);
