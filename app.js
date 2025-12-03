// app.js — fetches repos for the username and renders them
const USER = "PoojithaYelkur";
const API = `https://api.github.com/users/${USER}/repos?per_page=100&sort=updated`;

async function fetchRepos() {
  const res = await fetch(API);
  if (!res.ok) throw new Error("GitHub API error: " + res.status);
  return res.json();
}

function mkCard(repo) {
  const el = document.createElement('div');
  el.className = 'card';
  const name = repo.name;
  const desc = repo.description || "No description";
  const lang = repo.language || "—";
  const stars = repo.stargazers_count || 0;
  const homepage = repo.homepage;
  const repoUrl = repo.html_url;

  el.innerHTML = `
    <h3><a href="${repoUrl}" target="_blank" rel="noreferrer">${name}</a></h3>
    <p>${desc}</p>
    <div class="meta">
      <div class="badge">${lang}</div>
      <div>⭐ ${stars}</div>
      ${ homepage ? `<div><a href="${homepage}" target="_blank" rel="noreferrer">demo</a></div>` : '' }
      <div style="margin-left:auto;font-size:12px;color:var(--muted)">${new Date(repo.updated_at).toLocaleDateString()}</div>
    </div>
  `;
  return el;
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

function renderFeatured(repos) {
  const container = document.getElementById('featured-grid');
  container.innerHTML = '';
  // simple heuristic: most recently updated + highest stars
  const sorted = repos.slice().sort((a,b) => (b.stargazers_count*5 + new Date(b.updated_at)) - (a.stargazers_count*5 + new Date(a.updated_at)));
  const featured = sorted.slice(0,3);
  featured.forEach(r => container.appendChild(mkCard(r)));
}

function renderCategories(repos) {
  const container = document.getElementById('categories');
  container.innerHTML = '';
  const groups = groupByLanguage(repos);
  Object.keys(groups).sort().forEach(lang => {
    const wrap = document.createElement('div');
    const title = document.createElement('h4');
    title.className = 'cat-title';
    title.textContent = `${lang} (${groups[lang].length})`;
    wrap.appendChild(title);
    const row = document.createElement('div');
    row.className = 'grid';
    groups[lang].slice(0,6).forEach(r => row.appendChild(mkCard(r)));
    wrap.appendChild(row);
    container.appendChild(wrap);
  });
}

function renderAll(repos) {
  const container = document.getElementById('projects');
  container.innerHTML = '';
  repos.forEach(r => container.appendChild(mkCard(r)));
}

async function init() {
  try {
    const repos = await fetchRepos();
    repos.sort((a,b)=> new Date(b.updated_at) - new Date(a.updated_at));
    renderFeatured(repos);
    renderCategories(repos);
    renderAll(repos);
  } catch (err) {
    console.error(err);
    document.body.insertAdjacentHTML('afterbegin','<div style="padding:12px;background:#7c2ce8;color:white;text-align:center">Failed to load GitHub repos — check API limits or try again later.</div>');
  }
}

init();
