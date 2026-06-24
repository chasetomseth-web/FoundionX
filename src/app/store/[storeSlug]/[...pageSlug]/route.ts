import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFileContent } from '@/lib/supabase-storage';

/**
 * GET /store/[storeSlug]/[...pageSlug] - Serve HTML store pages
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { storeSlug: string; pageSlug?: string[] } }
) {
  try {
    // Look up the store by slug
    const store = await prisma.store.findUnique({
      where: { slug: params.storeSlug },
    });

    if (!store) {
      return new NextResponse('Store not found', { status: 404 });
    }

    // Determine which page to serve
    const pageSlugString = params.pageSlug?.join('/') || '';
    
    let page;
    if (!pageSlugString) {
      // Serve home page
      page = await prisma.htmlStorePage.findFirst({
        where: {
          storeId: store.id,
          isHomePage: true,
          isPublished: true,
        },
      });
    } else {
      // Serve specific page by slug
      page = await prisma.htmlStorePage.findFirst({
        where: {
          storeId: store.id,
          slug: pageSlugString,
          isPublished: true,
        },
      });
    }

    if (!page) {
      return new NextResponse('Page not found', { status: 404 });
    }

    // Fetch HTML content from storage
    const htmlContent = await getFileContent(page.filePath);

    // Return HTML with appropriate headers
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error: any) {
    console.error('HTML serve error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
