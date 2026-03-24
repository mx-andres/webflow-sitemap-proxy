/**
 * Configuration settings for the sitemap proxy.
 */

// Using async functions allows fetching config from external sources later if needed.

const urlsToRemove: string[] = [
    "/work/*"
];

const urlsToAdd: string[] = [
    "/work/project-2"
];

/** When `SITEMAP_PUBLIC_ORIGIN` is unset, rewritten `<loc>` values use this origin (no trailing slash). */
const DEFAULT_SITEMAP_PUBLIC_ORIGIN = "https://www.getmaintainx.com";

export async function getUrlsToRemove(): Promise<string[]> {
    const origin = process.env.ORIGIN_DOMAIN || ''; // Use empty string if not set to avoid 'undefined' in patterns

    if (!origin) {
        throw new Error('ORIGIN_DOMAIN environment variable is not set and no fallback provided.');
    }

    return urlsToRemove.map(url => `${origin}${url}`);
}

export async function getUrlsToAdd(): Promise<string[]> {
    const origin = await getOriginDomain();
    // Add the full URLs you want to add here
    return urlsToAdd.map(url => `${url.startsWith("http") ? "" : origin}${url}`);
}

export async function getDomainToReplace(): Promise<string> {
    const raw = process.env.SITEMAP_PUBLIC_ORIGIN;
    if (raw !== undefined && raw.trim() === "") {
        return "";
    }
    const value = (raw ?? DEFAULT_SITEMAP_PUBLIC_ORIGIN).trim().replace(/\/$/, "");
    return value;
}

export async function getSourceSitemapUrl(): Promise<string> {
    const url = process.env.ORIGIN_DOMAIN ? `${process.env.ORIGIN_DOMAIN}/sitemap.xml` : null; // Fallback if env var not set

    if (!url) {
        throw new Error('ORIGIN_DOMAIN environment variable is not set and no fallback provided.');
    }

    return url;
}

export async function getOriginDomain(): Promise<string> {
    const origin = process.env.ORIGIN_DOMAIN;
    if (!origin) {
        console.warn('ORIGIN_DOMAIN environment variable is not set.');
        return ''; // Or throw an error if it's strictly required
    }
    return origin;
}

/** URL prefixes to rewrite to the public sitemap domain (longest match wins). Includes ORIGIN_DOMAIN plus optional comma-separated SITEMAP_LOC_REPLACE_PREFIXES when fetch host differs from URLs inside the sitemap. */
export async function getLocReplacePrefixes(): Promise<string[]> {
    const origin = await getOriginDomain();
    const extra = process.env.SITEMAP_LOC_REPLACE_PREFIXES;
    const extras = extra
        ? extra.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    const merged = [origin, ...extras].filter(Boolean);
    return [...new Set(merged)];
}

export async function getSitemapLimit(): Promise<number> {
    const raw = process.env.SITEMAP_LIMIT;
    if (!raw) return 45000;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 45000;
} 