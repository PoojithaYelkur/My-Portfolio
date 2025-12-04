/**
 * app.js — PATCHED / FINAL
 *
 * - Adds top-of-file sanity log
 * - Robust DOM existence checks to avoid fatal null errors
 * - Graceful handling when GitHub API fails (rate-limits / network)
 * - Keeps Live / Output fallback to GitHub Pages
 * - Keeps README snippet fetching but never blocks rendering
 * - IntersectionObserver safe-guarded (only runs when .reveal exist)
 *
 * Replace your existing app.js with this file.
 */

console.log("app.js loaded successfully — starting portfolio script");

/* CONFIG */
const USER = "PoojithaYelkur";
const API_BASE = "https://api.github.com";
const REPOS_URL = `${API_BASE}/users/${USER}/repos?per_page=100&sort=updated`;

/* OPTIONAL: for local dev only; never commit a token */
let GITHUB_TOKEN = null; // "ghp_xxx"

/* Manual featured override (lowercased repo names) */
const FEATURED = [
  // "My-Portfolio",
];

/* ---- Helpers ---- */
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
  // set other attributes except handled ones
  for (const k in attrs) {
    if (k !== "className" && k !== "html") e.setAttribute(k, attrs[k]);
  }
  return e;
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (e) {
    return false;
  }
}

function githubPagesFallback(repoName) {
  const encoded = encodeURIComponent(repoName);
  return `https://${USER}.github.io/${encoded}/`;
}

/* Safe fetch wrapper that surfaces rate-limits clearly */
async function fetchJSON(url) {
  const res = await fetch(url, { headers: headers() });
  if (res.status === 403) {
    // GitHub often returns 403 for rate-limited requests
    throw new Error("rate_limited");
  }
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

/* Fetch README snippet but never let it throw to caller */
async function fetchReadmeSnippet(repoName) {
  try {
    const data = await fetchJSON(`${API_BASE}/repos/${USER}/${repoName}/readme`);
    if (data && data.content) {
      const decoded = atob(data.content.replace(/\n/g, ""));
      const cleaned = decoded
        .replace(/[#_*`>~\-\[\]\(\)]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return cleaned.length > 200 ? cleaned.slice(0, 200) + "…" : cleaned;
    }
  } catch (err) {
    // swallow errors — we return empty snippet if anything goes wrong
    return "";
  }
  return "";
}

/* ---- Card / UI building ---- */
function createProjectCard(repo, readmeSnippet) {
  const card = el("article", { className: "card", tabindex: "0" });

  const title = el("h3", {}, repo.name);
  card.appendChild(title);

  card.appendChild(el("p", {}, repo.description || "No description available."));

  if (readmeSnippet) {
    card.appendChild(el("p", { className: "muted" }, readmeSnippet));
  }

  const meta = el("div", { className: "meta" });
  meta.appendChild(el("div", { className: "badge" }, repo.language || "Other"));
  meta.appendChild(el("div", {}, `⭐ ${repo.stargazers_count || 0}`));

  const updated = el(
    "div",
    { style: "margin-left:auto;font-size:12px;color:var(--muted)" },
    new Date(repo.updated_at).toLocaleDateString()
  );
  meta.appendChild(updated);
  card.appendChild(meta);

  // Live / Output target (homepage or GitHub Pages fallback)
  const hasHomepage = repo.homepage && isValidUrl(repo.homepage);
  const liveTarget = hasHomepage ? repo.homepage : githubPagesFallback(repo.name);

  const footer = el("div", { className: "card-footer" });

  const liveBtn = el(
    "a",
    {
      href: "#",
      className: "btn live",
      role: "button",
      title: liveTarget,
      "aria-label": `Open live output for ${repo.name}`,
    },
    "Live / Output"
  );

  liveBtn.addEventListener("click", (e) => {
    e.preventDefault();
    try {
      window.open(liveTarget, "_blank", "noopener,noreferrer");
    } catch (err) {
      // fallback to repo page if anything fails
      window.open(repo.html_url, "_blank", "noopener,noreferrer");
    }
  });

  const codeBtn = el(
    "a",
    {
      href: repo.html_url,
      className: "btn code",
      target: "_blank",
      rel: "noopener noreferrer",
      title: repo.html_url,
      role: "button",
      "aria-label": `Open GitHub code for ${repo.name}`,
    },
    "View Code"
  );

  footer.appendChild(liveBtn);
  footer.appendChild(codeBtn);
  card.appendChild(footer);

  // keyboard accessibility: Enter triggers Live
  card.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      liveBtn.click();
    }
  });

  return card;
}

/* ---- Featured selection ---- */
function pickFeatured(repos) {
  const manual = FEATURED.map((f) => f.toLowerCase());
  let featured = repos.filter((r) => manual.includes(r.name.toLowerCase()));

  if (featured.length < 3) {
    const byScore = [...repos].sort((a, b) => {
      const aScore = (a.stargazers_count || 0) * 5 + new Date(a.updated_at).getTime() / 1000;
      const bScore = (b.stargazers_count || 0) * 5 + new Date(b.updated_at).getTime() / 1000;
      return bScore - aScore;
    });
    for (const r of byScore) {
      if (featured.length >= 3) break;
      if (!featured.find((f) => f.id === r.id)) featured.push(r);
    }
  }

  return featured.slice(0, 3);
}

/* ---- Rendering ---- */
async function renderFeatured(repos) {
  const c = document.getElementById("featured-grid");
  if (!c) return; // safe-guard
  c.innerHTML = "";
  const featured = pickFeatured(repos);
  for (const repo of featured) {
    const snippet = await fetchReadmeSnippet(repo.name);
    c.appendChild(createProjectCard(repo, snippet));
  }
}

async function renderAllProjects(repos) {
  const c = document.getElementById("projects");
  if (!c) return; // safe-guard
  c.innerHTML = "";
  for (const repo of repos) {
    const snippet = await fetchReadmeSnippet(repo.name);
    c.appendChild(createProjectCard(repo, snippet));
  }
}

/* ---- IntersectionObserver reveal (safe) ---- */
function initRevealObserver() {
  const nodes = document.querySelectorAll(".reveal");
  if (!nodes || nodes.length === 0) return; // nothing to observe

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.remove("reveal");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  nodes.forEach((n) => observer.observe(n));
}

/* ---- INIT (with robust DOM checks) ---- */
async function init() {
  console.log("init() called — validating DOM elements");

  // Basic required elements — if missing, bail gracefully but don't crash the page
  const featuredGrid = document.getElementById("featured-grid");
  const projectsGrid = document.getElementById("projects");
  const main = document.getElementById("main");
  if (!main) {
    console.error("Missing <main id=\"main\"> element — aborting render to avoid JS crash.");
    return;
  }
  // Note: featuredGrid/projectsGrid may be intentionally omitted; we protect against that
  if (!featuredGrid) console.warn("Warning: #featured-grid not found. Featured section will be skipped.");
  if (!projectsGrid) console.warn("Warning: #projects not found. Projects list will be skipped.");

  // Try to fetch repos — but don't let fetch errors crash the page
  let repos = [];
  try {
    repos = await fetchJSON(REPOS_URL);
    if (!Array.isArray(repos)) repos = [];
  } catch (err) {
    console.error("Error fetching repos:", err);
    // show friendly banner to user explaining rate limit or network problem
    const banner = el("div", { className: "note" });
    if (err.message === "rate_limited") {
      banner.innerHTML =
        "<strong>GitHub API rate limit reached.</strong> For local testing add a Personal Access Token in app.js (GITHUB_TOKEN).";
    } else {
      banner.innerHTML = "<strong>Unable to load GitHub projects.</strong> Check console for details.";
    }
    main.prepend(banner);
    // proceed with empty repo list (page still usable)
    repos = [];
  }

  // Sort and render if we have repositories
  if (repos.length > 0) repos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  // Render sections (each render function is safe-guarded)
  try {
    await renderFeatured(repos);
    await renderAllProjects(repos);
  } catch (err) {
    console.error("Render error (non-fatal):", err);
  }

  // Init reveal animations if any
  try {
    initRevealObserver();
  } catch (err) {
    console.warn("Reveal observer failed (non-fatal):", err);
  }

  console.log("init() finished");
}

/* ---- Start when DOM is ready ---- */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  // DOM already loaded (rare if script loaded at end)
  init();
}
