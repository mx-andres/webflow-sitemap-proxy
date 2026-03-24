import { NextRequest, NextResponse } from 'next/server';
import { getMainSitemapResponse } from '@/app/sitemap.xml/handler';

export async function GET(request: NextRequest) {
    try {
        return await getMainSitemapResponse(request);
    } catch (error) {
        console.error('Error processing sitemap:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
