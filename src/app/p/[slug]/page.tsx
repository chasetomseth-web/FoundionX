import { prisma } from '@/lib/prisma';
import type { BlockType } from '@/lib/merchant-pages/types';
import { renderTree } from '@/lib/merchant-pages/renderTree';
import PublishedPageHtml from '@/components/merchant-pages/PublishedPageHtml';

export const dynamic = 'force-dynamic';

interface PageParams {
  params: {
    slug: string;
  };
}

export default async function PublishedMerchantPage({ params }: PageParams) {
  // Handle legal pages from integration_settings
  if (params.slug === 'terms' || params.slug === 'privacy') {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data: legalSettings } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('provider', 'legal_pages')
      .single();
      
    const content = params.slug === 'terms' 
      ? (legalSettings?.credentials as { terms?: string; privacy?: string })?.terms 
      : (legalSettings?.credentials as { terms?: string; privacy?: string })?.privacy;
      
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="mx-auto max-w-4xl bg-white rounded-lg p-8 shadow-lg">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">
            {params.slug === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
          </h1>
          <div className="prose prose-slate max-w-none">
            {content ? (
              <div className="whitespace-pre-wrap">{content}</div>
            ) : (
              <p className="text-slate-600">No content available. Please configure this page in Settings.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const publishedPage = await prisma.publishedPage.findUnique({ where: { slug: params.slug } });

  if (publishedPage) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-lg">
          <PublishedPageHtml html={publishedPage.html} css={publishedPage.css} />
        </div>
      </div>
    );
  }

  const page = await prisma.merchantPage.findFirst({ where: { slug: params.slug, status: 'published' } });

  if (!page) {
    return <div className="min-h-screen bg-slate-50 py-20 text-center text-slate-700">Published page not found.</div>;
  }

  const rawBlocks = await prisma.merchantPageBlock.findMany({ where: { pageId: page.id }, orderBy: { order: 'asc' } });
  const blocks = rawBlocks.map((block) => ({
    ...block,
    type: block.type as BlockType,
    createdAt: block.createdAt.toISOString(),
    updatedAt: block.updatedAt.toISOString(),
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-lg">
        <header className="mb-10 border-b border-slate-200 pb-6">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Published Merchant Page</p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-900">{page.name}</h1>
          <p className="mt-3 text-slate-600">This page is live and powered by the Merchant Pages funnel builder.</p>
        </header>
        <div>{renderTree(blocks)}</div>
      </div>
    </main>
  );
}
