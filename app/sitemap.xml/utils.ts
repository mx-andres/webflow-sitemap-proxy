import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { 
  getSourceSitemapUrl,
  getUrlsToRemove,
  getUrlsToAdd,
  getDomainToReplace,
  getOriginDomain,
  getLocReplacePrefixes,
  getSitemapLimit
} from './config';

export type UrlEntry = { loc: string } & Record<string, any>;

// One configured parser instance for both routes
export const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseAttributeValue: true,
  trimValues: true,
  isArray: (name, jpath) => jpath === 'urlset.url'
});

// One builder instance for pretty output
export const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true,
  suppressEmptyNode: true,
});

export async function readConfig() {
  const [sourceSitemapUrl, urlsToRemove, urlsToAdd, domainToReplace, originDomain, locReplacePrefixes, sitemapLimit] = await Promise.all([
    getSourceSitemapUrl(),
    getUrlsToRemove(),
    getUrlsToAdd(),
    getDomainToReplace(),
    getOriginDomain(),
    getLocReplacePrefixes(),
    getSitemapLimit()
  ]);
  return { sourceSitemapUrl, urlsToRemove, urlsToAdd, domainToReplace, originDomain, locReplacePrefixes, sitemapLimit };
}

export async function fetchAndParseSource(sourceSitemapUrl: string) {
  const response = await fetch(sourceSitemapUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch sitemap from ${sourceSitemapUrl}: ${response.statusText}`);
  }
  const xmlText = await response.text();
  const sitemapObject = parser.parse(xmlText);
  return sitemapObject;
}

export function preserveUrlsetAttrs(urlset: any): Record<string, string> {
  return Object.fromEntries(
    Object.entries(urlset)
      .filter(([key]) => key.startsWith('@_'))
      .map(([key, value]) => [key, String(value)])
  );
}

export function urlMatchesPattern(url: string, pattern: string): boolean {
  if (!pattern.includes('*') && !pattern.includes('**')) {
    return url === pattern;
  }
  let regexString = pattern
    .replace(/\*\*/g, '__GLOBSTAR__')
    .replace(/\*/g, '__WILDCARD__')
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/__GLOBSTAR__/g, '.*')
    .replace(/__WILDCARD__/g, '[^/]+');
  const finalRegexPattern = `^${regexString}$`;
  try {
    return new RegExp(finalRegexPattern).test(url);
  } catch {
    return false;
  }
}

export function applyRemovals(urls: UrlEntry[], patterns: string[]): UrlEntry[] {
  if (!Array.isArray(urls) || patterns.length === 0) return urls;
  return urls.filter(entry => entry.loc && !patterns.some(p => urlMatchesPattern(entry.loc, p)));
}

export function applyAdditions(urls: UrlEntry[], additions: string[]): UrlEntry[] {
  if (additions.length === 0) return urls;
  const extra = additions.map(u => ({ loc: u }));
  return [...urls, ...extra];
}

function replaceUrlString(s: string, sortedPrefixes: string[], replacement: string): string {
  for (const prefix of sortedPrefixes) {
    if (s.startsWith(prefix)) {
      return s.replace(prefix, replacement);
    }
  }
  return s;
}

/** Rewrites any string in the tree that starts with a replace prefix (loc, xhtml:link @_href, etc.). */
function deepReplaceUrlStrings(value: unknown, sortedPrefixes: string[], replacement: string): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return replaceUrlString(value, sortedPrefixes, replacement);
  }
  if (Array.isArray(value)) {
    return value.map((v) => deepReplaceUrlStrings(v, sortedPrefixes, replacement));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = deepReplaceUrlStrings(v, sortedPrefixes, replacement);
    }
    return out;
  }
  return value;
}

export function applyDomainReplace(urls: UrlEntry[], prefixes: string[], replacement: string): UrlEntry[] {
  if (!replacement || !prefixes.length) return urls;
  const sorted = [...prefixes].filter(Boolean).sort((a, b) => b.length - a.length);
  return urls.map((entry) => deepReplaceUrlStrings(entry, sorted, replacement) as UrlEntry);
}

export function buildUrlsetXml(urls: UrlEntry[], attrs?: Record<string, string>): string {
  const object = { urlset: { ...(attrs || {}), url: urls } };
  return builder.build(object);
}

export function buildSitemapIndexXml(indexUrls: string[]): string {
  const object = {
    sitemapindex: {
      "@_xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9",
      sitemap: indexUrls.map(loc => ({ loc }))
    }
  };
  return builder.build(object);
}

export function computeChunks(total: number, limit: number): number {
  return Math.ceil(total / limit);
}

export function sliceChunk(urls: UrlEntry[], page: number, limit: number): UrlEntry[] {
  const startIndex = (page - 1) * limit;
  const endIndex = Math.min(startIndex + limit, urls.length);
  return urls.slice(startIndex, endIndex);
}
