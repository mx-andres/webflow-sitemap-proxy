import { NextRequest, NextResponse } from 'next/server';
import {
    readConfig,
    fetchAndParseSource,
    preserveUrlsetAttrs,
    applyRemovals,
    applyAdditions,
    applyDomainReplace,
    buildUrlsetXml,
    buildSitemapIndexXml,
    computeChunks
} from './utils';
import config from '@/next.config';

export async function getMainSitemapResponse(request: NextRequest) {
    const { sourceSitemapUrl, urlsToRemove, urlsToAdd, domainToReplace, originDomain, sitemapLimit } = await readConfig();

    const sitemapObject = await fetchAndParseSource(sourceSitemapUrl);

    if (!(sitemapObject.urlset && sitemapObject.urlset.url)) {
        console.warn('Sitemap structure might be unexpected or empty.');
    }

    const urlsetAttrs = sitemapObject.urlset ? preserveUrlsetAttrs(sitemapObject.urlset) : {};

    let urls = (sitemapObject.urlset && sitemapObject.urlset.url) ? sitemapObject.urlset.url : [];
    urls = applyRemovals(urls, urlsToRemove);
    urls = applyAdditions(urls, urlsToAdd);
    urls = applyDomainReplace(urls, originDomain, domainToReplace);

    const totalUrls = Array.isArray(urls) ? urls.length : 0;

    if (totalUrls > sitemapLimit) {
        const numSitemaps = computeChunks(totalUrls, sitemapLimit);
        const origin = request.nextUrl.origin;
        const base = config.basePath ?? '';
        const indexUrls = Array.from({ length: numSitemaps }, (_, i) => `${origin}${base}/sitemap/${i + 1}.xml`);
        const indexXml = buildSitemapIndexXml(indexUrls);
        return new NextResponse(indexXml, {
            status: 200,
        });
    }

    const modifiedXml = buildUrlsetXml(urls, urlsetAttrs);

    return new NextResponse(modifiedXml, {
        status: 200,
    });
}
