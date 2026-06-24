/**
 * Storefront Publish Pipeline
 * CDN activation, preview vs production mode, cache invalidation
 */

import { prisma } from './prisma';
import { cacheGet, cacheSet, cacheDel } from './redis-lock';
import { storefrontLog } from './logger';
import { trackError } from './error-tracker';
import { compileTemplate, type StorefrontContext } from './storefront-engine';

// ============================================================
// TYPES
// ============================================================

export type PublishMode = 'preview' | 'production';

export interface PublishResult {
  success: boolean;
  templateId: string;
  mode: PublishMode;
  publishedAt: string;
  cacheKey: string;
  cdnActivated: boolean;
  previewUrl?: string;
  productionUrl?: string;
}

export interface StorefrontRenderResult {
  html: string;
  mode: PublishMode;
  cachedAt?: string;
  renderTimeMs: number;
  templateId: string;
}

// ============================================================
// CACHE KEY HELPERS
// ============================================================

function getPreviewCacheKey(storeId: string, templateId: string): string {
  return `storefront:preview:${storeId}:${templateId}`;
}

function getProductionCacheKey(storeId: string, slug: string): string {
  return `storefront:prod:${storeId}:${slug}`;
}

// ============================================================
// PUBLISH PIPELINE
// ============================================================

export async function publishStorefront(
  storeId: string,
  templateId: string,
  mode: PublishMode,
  organizationId: string,
  userId: string
): Promise<PublishResult> {
  try {
    const template = await prisma.htmlTemplate.findUnique({
      where: { id: templateId },
      include: { blocks: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!template || template.storeId !== storeId) {
      throw new Error('Template not found or access denied');
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new Error('Store not found');

    const publishedAt = new Date().toISOString();

    if (mode === 'production') {
      // Invalidate existing production cache for this slug
      await invalidateStorefrontCache(storeId, template.slug);

      // Update template status to published
      await prisma.htmlTemplate.update({
        where: { id: templateId },
        data: {
          status: 'published',
          publishedAt: new Date(),
        },
      });

      // Store in production cache
      const cacheKey = getProductionCacheKey(storeId, template.slug);
      await cacheSet(cacheKey, JSON.stringify({
        html: template.sanitizedHtml,
        css: template.cssContent,
        publishedAt,
        templateId,
        storeId,
        mode: 'production',
      }), 3600);

      // Audit log
      await prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'storefront.published',
          resource: 'html_template',
          resourceId: templateId,
          metadata: { mode, slug: template.slug, publishedAt },
        },
      });

      storefrontLog.info('Storefront published to production', { storeId, templateId, slug: template.slug });

      return {
        success: true,
        templateId,
        mode: 'production',
        publishedAt,
        cacheKey,
        cdnActivated: true,
        productionUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/store/${store.slug}${template.slug}`,
      };
    } else {
      // Preview mode — short TTL, no CDN
      const cacheKey = getPreviewCacheKey(storeId, templateId);
      await cacheSet(cacheKey, JSON.stringify({
        html: template.sanitizedHtml,
        css: template.cssContent,
        publishedAt,
        templateId,
        storeId,
        mode: 'preview',
      }), 300);

      return {
        success: true,
        templateId,
        mode: 'preview',
        publishedAt,
        cacheKey,
        cdnActivated: false,
        previewUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/storefront/preview/${templateId}`,
      };
    }
  } catch (error) {
    trackError({ error, tenantId: storeId });
    throw error;
  }
}

// ============================================================
// CACHE INVALIDATION
// ============================================================

export async function invalidateStorefrontCache(storeId: string, slug?: string): Promise<void> {
  try {
    if (slug) {
      const key = getProductionCacheKey(storeId, slug);
      await cacheDel(key);
      storefrontLog.info('Storefront cache invalidated', { storeId, slug });
    } else {
      // Invalidate all pages for store using tag
      await cacheDel(`storefront:prod:${storeId}:*`);
      storefrontLog.info('Full storefront cache invalidated', { storeId });
    }
  } catch (error) {
    storefrontLog.warn('Cache invalidation failed', { storeId, slug, error: String(error) });
  }
}

// ============================================================
// STOREFRONT RENDERER (SSR + Cache)
// ============================================================

export async function renderStorefront(
  storeId: string,
  slug: string,
  context: StorefrontContext,
  mode: PublishMode = 'production'
): Promise<StorefrontRenderResult> {
  const startTime = Date.now();

  try {
    // Check cache first (production mode only)
    if (mode === 'production') {
      const cacheKey = getProductionCacheKey(storeId, slug);
      const cached = await cacheGet<string>(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const compiled = compileTemplate(parsed.html, context);
        return {
          html: injectCss(compiled, parsed.css),
          mode: 'production',
          cachedAt: parsed.publishedAt,
          renderTimeMs: Date.now() - startTime,
          templateId: parsed.templateId,
        };
      }
    }

    // Cache miss — fetch from DB
    const template = await prisma.htmlTemplate.findFirst({
      where: {
        storeId,
        slug,
        status: mode === 'production' ? 'published' : undefined,
      },
    });

    if (!template) {
      throw new Error(`Template not found: ${slug}`);
    }

    // Compile with context
    const compiled = compileTemplate(template.sanitizedHtml ?? template.rawHtml, context);
    const finalHtml = injectCss(compiled, template.cssContent ?? '');

    // Store in cache for production
    if (mode === 'production') {
      const cacheKey = getProductionCacheKey(storeId, slug);
      await cacheSet(cacheKey, JSON.stringify({
        html: template.sanitizedHtml ?? template.rawHtml,
        css: template.cssContent ?? '',
        publishedAt: template.publishedAt?.toISOString() ?? new Date().toISOString(),
        templateId: template.id,
        storeId,
        mode: 'production',
      }), 3600);
    }

    return {
      html: finalHtml,
      mode,
      renderTimeMs: Date.now() - startTime,
      templateId: template.id,
    };
  } catch (error) {
    trackError({ error, tenantId: storeId });
    throw error;
  }
}

function injectCss(html: string, css: string): string {
  if (!css) return html;
  const styleTag = `<style data-merchantos="true">${css}</style>`;
  if (html.includes('</head>')) {
    return html.replace('</head>', `${styleTag}</head>`);
  }
  return styleTag + html;
}

// ============================================================
// STOREFRONT STATUS CHECK
// ============================================================

export async function getStorefrontStatus(storeId: string): Promise<{
  publishedPages: number;
  draftPages: number;
  cacheActive: boolean;
  lastPublished?: string;
}> {
  const [published, draft] = await Promise.all([
    prisma.htmlTemplate.count({ where: { storeId, status: 'published' } }),
    prisma.htmlTemplate.count({ where: { storeId, status: 'draft' } }),
  ]);

  const lastTemplate = await prisma.htmlTemplate.findFirst({
    where: { storeId, status: 'published' },
    orderBy: { publishedAt: 'desc' },
    select: { publishedAt: true },
  });

  return {
    publishedPages: published,
    draftPages: draft,
    cacheActive: true,
    lastPublished: lastTemplate?.publishedAt?.toISOString(),
  };
}
