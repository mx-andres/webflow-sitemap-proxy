# Sitemap Proxy (Next.js)

A minimal Next.js app that proxies a Webflow sitemap, applies custom rules, and serves a final sitemap or a sitemap index if the number of URLs exceeds a configurable limit.

- Proxies from your Webflow site’s auto-generated `sitemap.xml`
- Removes entries that match glob patterns (supports `*` and `**`)
- Optionally adds extra URLs
- Optionally rewrites the domain of all URLs
- Splits the final set into multiple sub-sitemaps when the total exceeds the limit (default 45,000)
- Serves the sitemap at `/sitemap.xml` (root) when `BASE_PATH=root`, or under a custom path like `/config` if configured

## How it works
1. Fetches the source sitemap from your Webflow site (`ORIGIN_DOMAIN`), parses it, and materializes entries.
2. Applies modifications in this order:
   - Remove URLs matching configured patterns
   - Add custom URLs
   - Replace URL prefixes (see `SITEMAP_LOC_REPLACE_PREFIXES`) with the public origin (`SITEMAP_PUBLIC_ORIGIN`), unless disabled
3. Strips `xhtml:link` hreflang nodes from each entry (output is a plain urlset suitable for the public host).
4. If the final URL count is greater than the configured limit, returns a sitemap index listing chunked sub-sitemaps.

### Routes
With `BASE_PATH=root` (default for MaintainX):
- Sitemap index or single sitemap: `/sitemap.xml`
- Sub-sitemaps (when needed): `/sitemap/[n].xml` (e.g. `/sitemap/1.xml`)


## Configuration

### Environment variables
- `ORIGIN_DOMAIN` (required): Origin used to fetch the source sitemap (`{ORIGIN_DOMAIN}/sitemap.xml`) and as the default prefix for remove patterns. Example: `https://webflow.yourdomain.com`
- `SITEMAP_PUBLIC_ORIGIN` (optional): Canonical origin written into `<loc>` after rewriting (no trailing slash). Default in this repo: `https://www.getmaintainx.com`. Set to an empty string to disable domain rewriting.
- `SITEMAP_LOC_REPLACE_PREFIXES` (optional): Comma-separated URL prefixes that should be rewritten to `SITEMAP_PUBLIC_ORIGIN` when they differ from `ORIGIN_DOMAIN` (for example when Webflow’s XML uses a custom domain while you fetch from `*.webflow.io`). `ORIGIN_DOMAIN` is always included as a prefix.
- `SITEMAP_LIMIT` (optional): Integer; maximum URLs per sitemap file. Default: `45000`

### App configuration file
Edit `app/sitemap.xml/config.ts`:

- `getUrlsToRemove()`
  - Returns glob patterns to exclude from the sitemap
  - Patterns are combined with `ORIGIN_DOMAIN`
  - Glob syntax:
    - `*` matches any single path segment (no `/`)
    - `**` matches across segments (including `/`)
  - Examples (assuming `ORIGIN_DOMAIN=https://example.com`):
    - `"/work/*"` → matches `https://example.com/work/anything` (one segment)
    - `"/**/blog"` → matches any URL ending in `/blog` at any depth

- `getUrlsToAdd()`
  - Returns absolute or path-based URLs to add
  - Path-based URLs will be prefixed with `ORIGIN_DOMAIN`

- `getDomainToReplace()`
  - Reads `SITEMAP_PUBLIC_ORIGIN` (see environment variables). Override the default by setting that variable in your host; set it to empty to disable rewriting.

- `getSourceSitemapUrl()` / `getOriginDomain()` / `getSitemapLimit()`
  - Internal helpers that read from env and provide defaults

## Local development
```bash
npm install
npm run dev
```

Visit (with `BASE_PATH=root`):
- `http://localhost:3000/sitemap.xml` → sitemap or sitemap index
- `http://localhost:3000/sitemap/1.xml` → first chunk (only if index is returned)

## Deploying
You can deploy wherever you host Next.js apps. To deploy alongside your Webflow site on Webflow Cloud:
- Set **Path** to `/` so the sitemap is served at `/sitemap.xml` (root)
- See: https://developers.webflow.com/webflow-cloud/intro

**Important:** Browsers and crawlers must receive *this app’s* response for `https://your-public-domain/sitemap.xml`. If that URL still returns Webflow’s raw sitemap (with `webflow.` hosts and `xhtml:link` blocks), your reverse proxy, DNS, or Webflow routing is not sending `/sitemap.xml` to this deployment. Fix routing first; env vars only affect output once traffic hits this app.

## Webflow project settings and robots.txt
- Keep Webflow’s auto-generated sitemap enabled (so the source `sitemap.xml` remains available at `ORIGIN_DOMAIN`).
- Disable the setting that auto-inserts the Webflow sitemap into `robots.txt`.
- Manually add a `robots.txt` line that points to this app’s sitemap. With `BASE_PATH=root`: `https://yourdomain.com/sitemap.xml`. For example:
  ```
  Sitemap: https://www.getmaintainx.com/sitemap.xml
  ```

## License
MIT — see `LICENSE.md`.
