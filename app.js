/**
 * Modified app.js
 * - Live / Output button opens repo.homepage (if valid) otherwise opens GitHub-Pages fallback:
 *     https://PoojithaYelkur.github.io/<repo-name>/
 * - "View Code" opens the GitHub repo page
 * - "Projects by Category" removed
 * - Readme snippet still fetched where possible
 * - Tooltip (title) added to Live button showing final opened URL
 */

const USER = "PoojithaYelkur";
const API_BASE = "https://api.github.com";
const REPOS_ENDPOINT = `${API_BASE}/users/${USER}/repos?per_page=100&sort=updated`;

// Optional PAT for local testing (do NOT commit token)
let GITHUB_TOKEN = null; // "ghp_xxx"

const FEATURED = [
  // e.g. "my-cool-project"
];

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

async function fetchJSON(url) {
  const res = await fetch(url, { headers: headers() });
  if (res.status === 403) throw new Error("rate_limited");
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

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
    // ignore
  }
  return "";
}

function githubPagesFallback(repoName) {
  // Construct a safe fallback URL for GitHub pages hosting pattern
  const encoded = encodeURIComponent(repoName);
  return `https://${USER}.github.io/${encoded}/`;
}

function createProjectCard(repo, readmeSnippet = "") {
  const card = el("article", { className: "card", role: "article", tabindex: "0" });

  const h3 = el("h3");
  const nameA = el("a", { href: "#", ariaLabel: `Project ${repo.name}` }, repo.name);
  nameA.addEventListener("click", (e) => e.preventDefault());
  h3.appendChild(nameA);
  card.appendChild(h3);

  card.appendChild(el("p", {}, repo.description || "No description provided."));

  if (readmeSnippet) {
    card.appendChild(el("p", { className: "muted" }, readmeSnippet));
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

  // Footer buttons
  const footer = el("div", { className: "card-footer" });

  // Determine final target for Live / Output button
  let liveTarget = null;
  if (repo.homepage && isValidHttpUrl(repo.homepage)) {
    liveTarget = repo.homepage;
  } else {
    // use fallback GitHub Pages pattern
    liveTarget = githubPagesFallback(repo.name);
  }

  const liveBtn = el("a", { className: "btn live", role: "button", href: "#", title: liveTarget }, "Live / Output");
  const codeBtn = el("a", { className: "btn code", role: "button", href: repo.html_url, target: "_blank", rel: "noopener noreferrer", title: repo.html_url }, "View Code");

  liveBtn.addEventListener("click", (e) => {
    e.preventDefault();
    // final safety: open homepage if valid, else attempt fallback; if fallback not valid, open repo
    if (isValidHttpUrl(repo.homepage)) {
      window.open(repo.homepage, "_blank", "noopener,noreferrer");
      return;
    }
    // attempt to open fallback; no need to validate because it's an https string, but try/catch for safety
    try {
      window.open(liveTarget, "_blank", "noopener,noreferrer");
    } catch (err) {
      window.open(repo.html_url, "_blank", "noopener,noreferrer");
    }
  });

  codeBtn.addEventListener("click", (e) => {
    // default anchor behavior opens repo in new tab; ensure noopener
    // no-op here; behavior set via attributes
  });

  liveBtn.setAttribute("aria-label", `Open live output for ${repo.name}`);
  codeBtn.setAttribute("aria-label", `Open GitHub repo for ${repo.name}`);

  footer.appendChild(liveBtn);
  footer.appendChild(codeBtn);
  card.appendChild(footer);

  // Keyboard: Enter triggers Live button
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      liveBtn.click();
    }
  });

  return card;
}

function pickFeatured(repos) {
  const lowered = FEATURED.map(s => s.toLowerCase());
  let featured = repos.filter(r => lowered.includes(r.name.toLowerCase()));
  if (featured.length < 3) {
    const topicMatches = repos.filter(r => {
      const nm = r.name && r.name.toLowerCase().includes("portfolio-featured");
      const topics = r.topics || [];
      const topicMatch = topics.some(t => t.toLowerCase().includes("portfolio-featured"));
      return nm || topicMatch;
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

async function renderFeatured(repos) {
  const container = document.getElementById("featured-grid");
  container.innerHTML = "";
  const featured = pickFeatured(repos);
  for (const r of featured) {
    const snip = await fetchReadmeSnippet(r);
    container.appendChild(createProjectCard(r, snip));
  }
}

async function renderAll(repos) {
  const container = document.getElementById("projects");
  container.innerHTML = "";
  for (const r of repos) {
    const snip = await fetchReadmeSnippet(r);
    container.appendChild(createProjectCard(r, snip));
  }
}

function showRateLimitNotice() {
  const main = document.getElementById("main");
  const banner = el("div", { className: "note" }, "");
  banner.innerHTML = `<strong>GitHub API rate limit reached.</strong> For local development, set a Personal Access Token (PAT) in app.js (GITHUB_TOKEN). See README.`;
  main.prepend(banner);
}

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

async function init() {
  try {
    const repos = await fetchJSON(REPOS_ENDPOINT);
    repos.sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));
    await renderFeatured(repos);
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

document.addEventListener("DOMContentLoaded", init);
