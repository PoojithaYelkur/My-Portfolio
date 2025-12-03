# My-Portfolio

## Key behavior
- Projects are fetched from the GitHub REST API.
- If a repository has a `homepage` field with a valid URL, clicking the project opens that *live demo* in a new tab.
- If no `homepage` exists, clicking opens the GitHub repository page.
- Featured projects are selected by: explicit `FEATURED` array (in `app.js`), repo topic/name containing `portfolio-featured`, or a heuristic (stars + recency).

## Files
- `index.html` — Single-page UI
- `styles.css` — Visual styles
- `app.js` — GitHub API fetching + rendering logic
- `Pujitha resume.pdf` — Resume file (download link on the page)

## How to publish (GitHub Pages)
1. Create a new repository (e.g., `poojitha-portfolio`) on GitHub and push these files to the `main` branch.
2. In the repository: **Settings → Pages** (or `Pages` sidebar).
3. Under "Build and deployment" choose `Deploy from a branch`.
4. Set Branch to `main` and Folder to `/ (root)`, then Save.
5. Wait 1–2 minutes and visit: `https://<your-username>.github.io/<repo-name>/`

## Handling GitHub API rate limits
Unauthenticated requests to GitHub have low rate limits. If projects do not load or you see a rate-limit warning:

### Option A — Local quick test (no token, but avoid frequent refresh)
- Run a simple local server (optional) and open `index.html` in browser. Note GitHub still rate-limits by IP.

### Option B — Use a GitHub Personal Access Token (PAT) for higher limits
1. Create a PAT: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained token (no scopes required for public data).
2. **Do not commit this token to your public repo.**
3. For a local development test: open `app.js` and set `GITHUB_TOKEN = "<your_token_here>"` (replace `null`).
4. Reload the page — higher rate limits should apply.

## Customization
- To force specific featured repos: edit the `FEATURED` array in `app.js` (use repo names).
- To change the hero text, contact emails, or LinkedIn link, edit `index.html`.
- To add analytics or a contact form, integrate a third-party service and update `index.html` accordingly.

## Notes on privacy & security
- If you add a Personal Access Token for local testing, remove it before committing.
- This project uses client-side JS to call GitHub public APIs — repository data is public.

## Contact
- College email: 23211a72c6@bvrit.ac.in  
- Personal email: 23211a72c6@gmail.com  
- LinkedIn: https://www.linkedin.com/in/yelkur-pujitha

---

**Click behaviour note:** The portfolio intentionally prioritizes `homepage` links so interviewers are directed to live demos first. If no live demo exists, the fallback is the GitHub repo.

