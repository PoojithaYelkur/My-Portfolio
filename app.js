/**
 * app.js — FINAL UPDATED VERSION
 * -----------------------------------------
 * Features:
 *  - Fetch projects from GitHub API
 *  - Featured section (auto picks top 3 or FEATURED array)
 *  - README snippet preview
 *  - "Live / Output" button → repo.homepage OR GitHub Pages fallback
 *  - "View Code" button → GitHub repo
 *  - Removed "Projects by Category"
 *  - Smooth reveal animations on scroll
 */

const USER = "PoojithaYelkur";
const API_BASE = "https://api.github.com";
const REPOS_URL = `${API_BASE}/users/${USER}/repos?per_page=100&sort=updated`;

// OPTIONAL (only for local dev rate limits) — DO NOT COMMIT TOKEN
let GITHUB_TOKEN = null; // "ghp_xxx"

const FEATURED = [
  // Add repo names you want featured manually
  // Example: "My-Portfolio"
];

// -----------------------------------------------
// Helpers
// -----------------------------------------------
function headers() {
  const h = { Accept: "application/vnd.github.v3+json" };
  if (GITHUB_TOKEN) h.Authorization = `token ${GITHUB_TOKEN}`;
  return h;
}

function el(tag, attrs = {}, text = "") {
  const e = document.createElement(tag);
  if (attrs.className) e.className = attrs.className;
  if (text) e.textContent = text;
  for (const key in attrs) {
    if (key !== "className" && key !== "html") {
      e.setAttribute(key, attrs[key]);
    }
  }
  if (attrs.html) e.innerHTML = attrs.html;
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

function fallbackLiveURL(repoName) {
  const encoded = encodeURIComponent(repoName);
  return `https://${USER}.github.io/${encoded}/`;
}

async function fetchJSON(url) {
  const res = await fetch(url, { headers: headers() });
  if (res.status === 403) throw new Error("rate_limited");
  if (!res.ok) throw new Error(`GitHub API Error: ${res.status}`);
  return res.json();
}

async function fetchReadmeSnippet(repoName) {
  try {
    const data = await fetchJSON(`${API_BASE}/repos/${USER}/${repoName}/readme`);
    const decoded = atob(data.content.replace(/\n/g, ""));
    const cleaned = decoded.replace(/[#_*`>~\-\[\]\(\)]/g, " ").replace(/\s+/g, " ").trim();
    return cleaned.length > 200 ? cleaned.slice(0, 200) + "…" : cleaned;
  } catch (e) {
    return "";
  }
}

// -----------------------------------------------
// Card Component
// -----------------------------------------------
function createProjectCard(repo, snippet) {
  const card = el("article", { className: "card", tabindex: "0" });

  // Title
  const title = el("h3");
  title.textContent = repo.name;
  card.appendChild(title);

  // Description
  card.appendChild(
    el("p", {}, repo.description || "No description available.")
  );

  // README snippet
  if (snippet) {
    card.appendChild(el("p", { className: "muted" }, snippet));
  }

  // Meta row
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

  // Determine Live link
  const hasHomepage = repo.homepage && isValidUrl(repo.homepage);
  const liveURL = hasHomepage ? repo.homepage : fallbackLiveURL(repo.name);

  // Buttons
  const footer = el("div", { className: "card-footer" });

  const liveBtn = el(
    "a",
    {
      href: "#",
      className: "btn live",
      title: liveURL,
      role: "button",
      "aria-label": `Open live output for ${repo.name}`,
    },
    "Live / Output"
  );

  liveBtn.addEventListener("click", (e) => {
    e.preventDefault();
    window.open(liveURL, "_blank", "noopener,noreferrer");
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

  // Enter key triggers Live
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      liveBtn.click();
    }
  });

  return card;
}

// -----------------------------------------------
// Featured project logic
// -----------------------------------------------
function pickFeatured(repos) {
  let featured = repos.filter((r) =>
    FEATURED.map((f) => f.toLowerCase()).includes(r.name.toLowerCase())
  );

  if (featured.length < 3) {
    const byActivity = [...repos].sort(
      (a, b) =>
        b.stargazers_count - a.stargazers_count ||
        new Date(b.updated_at) - new Date(a.updated_at)
    );
    for (const r of byActivity) {
      if (featured.length >= 3) break;
      if (!featured.find((f) => f.id === r.id)) featured.push(r);
    }
  }

  return featured.slice(0, 3);
}

// -----------------------------------------------
// Render functions
// -----------------------------------------------
async function renderFeatured(repos) {
  const container = document.getElementById("featured-grid");
  container.innerHTML = "";

  const featured = pickFeatured(repos);

  for (const repo of featured) {
    const snip = await fetchReadmeSnippet(repo.name);
    container.appendChild(createProjectCard(repo, snip));
  }
}

async function renderAllProjects(repos) {
  const container = document.getElementById("projects");
  container.innerHTML = "";

  for (const repo of repos) {
    const snip = await fetchReadmeSnippet(repo.name);
    container.appendChild(createProjectCard(repo, snip));
  }
}

// -----------------------------------------------
// Reveal animations
// -----------------------------------------------
function initRevealObserver() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.remove("reveal");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
}

// -----------------------------------------------
// Initialize
// -----------------------------------------------
async function init() {
  try {
    const repos = await fetchJSON(REPOS_URL);

    // Recent → older
    repos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    await renderFeatured(repos);
    await renderAllProjects(repos);

    initRevealObserver();
  } catch (e) {
    console.error(e);

    const main = document.getElementById("main");
    const msg = el("div", { className: "note" });

    if (e.message === "rate_limited") {
      msg.innerHTML =
        "<strong>GitHub API rate limit reached.</strong> Add a Personal Access Token in app.js for local testing.";
    } else {
      msg.innerHTML =
        "<strong>Error loading projects.</strong> Check console for details.";
    }

    main.prepend(msg);
  }
}

// -----------------------------------------------
// Start
// -----------------------------------------------
document.addEventListener("DOMContentLoaded", init);
