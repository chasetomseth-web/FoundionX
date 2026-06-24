/**
 * HTML Storefront Engine
 * Parses, sanitizes, compiles, and renders merchant-uploaded HTML templates
 * with dynamic ecommerce data binding
 */

import { prisma } from './prisma';

// ============================================================
// TYPES
// ============================================================

export interface StorefrontContext {
  store?: {
    id: string;
    name: string;
    currency: string;
    domain: string;
  };
  funnel?: {
    name: string;
    slug: string;
    step_order: number;
    total_steps: number;
    step_type: string;
    is_first: boolean;
    is_last: boolean;
    next_url: string;
    decline_url: string;
    decline_step_order: number | null;
  };
  product?: {
    id: string;
    name: string;
    price: number;
    compareAtPrice?: number;
    description?: string;
    images: string[];
    sku?: string;
    inventory?: number;
    tags?: string[];
  };
  products?: Array<{
    id: string;
    name: string;
    price: number;
    compareAtPrice?: number;
    images: string[];
    slug: string;
  }>;
  collection?: {
    id: string;
    name: string;
    description?: string;
  };
  cart?: {
    items: Array<{ name: string; quantity: number; price: number; total: number }>;
    subtotal: number;
    total: number;
    itemCount: number;
  };
  customer?: {
    name?: string;
    email?: string;
    firstName?: string;
  };
  order?: {
    orderNumber: string;
    total: number;
    status: string;
  };
  page?: {
    title: string;
    description?: string;
  };
  siteVariables?: Record<string, string>;
  siteComponents?: Record<string, string>;
}

// ============================================================
// VARIABLE LOADER — Fetches DB data for all variable types
// ============================================================

export interface VariableBundle {
  site: Record<string, string>;
  components: Record<string, string>;
  custom: Record<string, string>;
}

/**
 * Load all variable data from DB for a store. Call before rendering.
 */
export async function loadVariables(storeId: string): Promise<VariableBundle> {
  const [siteVars, components, customVars] = await Promise.all([
    prisma.siteVariable.findMany({ where: { storeId } }),
    prisma.siteComponent.findMany({ where: { storeId } }),
    prisma.customVariable.findMany({ where: { storeId } }),
  ]);

  const site: Record<string, string> = {};
  for (const v of siteVars) {
    site[v.key] = v.value;
  }

  const comps: Record<string, string> = {};
  for (const c of components) {
    comps[c.slug] = c.html;
  }

  const custom: Record<string, string> = {};
  for (const v of customVars) {
    custom[v.key] = v.value;
  }

  return { site, components: comps, custom };
}

// ============================================================
// SANITIZER
// ============================================================

// Dangerous HTML patterns to strip
const DANGEROUS_PATTERNS = [
  // Script tags (allow only whitelisted src)
  /<script(?![^>]*src=["']https:\/\/(api\.goaffpro\.com|js\.stripe\.com|cdn\.brevo\.com))[^>]*>[\s\S]*?<\/script>/gi,
  // Inline event handlers
  /\s(on\w+)=["'][^"']*["']/gi,
  // javascript: protocol
  /href=["']javascript:[^"']*["']/gi,
  // data: URIs in src/href (potential XSS)
  /(src|href)=["']data:[^"']*["']/gi,
  // Meta refresh
  /<meta[^>]*http-equiv=["']refresh["'][^>]*>/gi,
  // Base tag (can redirect all relative URLs)
  /<base[^>]*>/gi,
  // Form action to external domains (allow relative)
  /action=["']https?:\/\/(?!merchantos)[^"']*["']/gi,
];

// Allowed external script domains
const ALLOWED_SCRIPT_DOMAINS = [
  'api.goaffpro.com',
  'js.stripe.com',
  'cdn.brevo.com',
];

export function sanitizeHtml(html: string): string {
  let sanitized = html;

  // Remove dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Remove inline styles with expression() (IE XSS)
  sanitized = sanitized.replace(/style=["'][^"']*expression\([^"']*\)[^"']*["']/gi, '');

  // Remove vbscript: protocol
  sanitized = sanitized.replace(/(src|href)=["']vbscript:[^"']*["']/gi, '');

  // Ensure all external links open safely
  sanitized = sanitized.replace(
    /<a([^>]*href=["']https?:\/\/[^"']*["'][^>]*)>/gi,
    (match, attrs) => {
      if (!attrs.includes('rel=')) {
        return `<a${attrs} rel="noopener noreferrer">`;
      }
      return match;
    }
  );

  return sanitized;
}

// ============================================================
// TEMPLATE COMPILER — Dynamic Variable Binding
// ============================================================

/**
 * Supported binding syntax:
 * {{store.name}} — store name
 * {{product.name}} — product name
 * {{product.price | currency}} — formatted price
 * {{product.images[0]}} — first image
 * {{#each products}} ... {{/each}} — loop
 * {{#if customer.name}} ... {{/if}} — conditional
 * {{checkout_url}} — dynamic checkout URL
 * {{cart.total | currency}} — cart total
 */

export function compileTemplate(html: string, context: StorefrontContext): string {
  let compiled = html;

  // Process each loops first
  compiled = processEachBlocks(compiled, context);

  // Process if/unless blocks
  compiled = processConditionalBlocks(compiled, context);

  // Replace ALL variable types in a single comprehensive pass
  compiled = replaceAllVariables(compiled, context);

  // Inject {{next_url}} — resolved by funnel-router for multi-step funnels
  if (context.funnel?.next_url) {
    compiled = compiled.replace(/\{\{next_url\}\}/g, context.funnel.next_url);
  } else {
    compiled = compiled.replace(/\{\{next_url\}\}/g, generateCheckoutUrl(context));
  }

  // Inject {{decline_url}} — for "No thanks" buttons in upsell/downsell steps
  if (context.funnel?.decline_url) {
    compiled = compiled.replace(/\{\{decline_url\}\}/g, context.funnel.decline_url);
  } else {
    compiled = compiled.replace(/\{\{decline_url\}\}/g, '/checkout/success');
  }

  // Inject dynamic checkout URL
  compiled = compiled.replace(/\{\{checkout_url\}\}/g, generateCheckoutUrl(context));

  // Inject cart form if placeholder exists
  compiled = compiled.replace(/\{\{cart_form\}\}/g, generateCartForm(context));

  // Final cleanup — remove any remaining {{...}} that weren't replaced
  compiled = compiled.replace(/\{\{[\w.[\]|#/ ]+\}\}/g, '');

  return compiled;
}

function processEachBlocks(html: string, context: StorefrontContext): string {
  return html.replace(
    /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_, key, template) => {
      const collection = getNestedValue(context, key);
      if (!Array.isArray(collection)) return '';

      return collection
        .map((item) => {
          let itemHtml = template;
          itemHtml = itemHtml.replace(/\{\{(?:this\.)?(\w+(?:\.\w+)*)\}\}/g, (_: string, prop: string) => {
            const val = getNestedValue(item, prop);
            return val !== undefined ? String(val) : '';
          });
          return itemHtml;
        })
        .join('');
    }
  );
}

function processConditionalBlocks(html: string, context: StorefrontContext): string {
  return html.replace(
    /\{\{#if\s+([\w.]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g,
    (_, key, trueBlock, falseBlock = '') => {
      const value = getNestedValue(context, key);
      return value ? trueBlock : falseBlock;
    }
  );
}

/**
 * Comprehensive variable replacer. Handles ALL variable types:
 * site.*, component.*, variable.*, product.*, cart.*, customer.*, order.*,
 * funnel.*, page.*, collection.*
 */
function replaceAllVariables(html: string, context: StorefrontContext): string {
  return html.replace(/\{\{([\w.[\]]+)(?:\s*\|\s*(\w+))?\}\}/g, (match, path, filter) => {
    // Skip already-processed special URLs
    if (path === 'next_url' || path === 'decline_url' || path === 'checkout_url' || path === 'cart_form') {
      return match; // handled after this pass
    }

    let value: unknown = undefined;

    // Site variables: {{site.name}}, {{site.phone}}, etc.
    if (path.startsWith('site.')) {
      value = context.siteVariables ? context.siteVariables[path] : undefined;
    }
    // Component variables: {{component.header}}, {{component.footer}}, etc.
    else if (path.startsWith('component.')) {
      const key = path.replace('component.', '');
      value = context.siteComponents ? context.siteComponents[key] : undefined;
    }
    // Custom variables: {{variable.guarantee_length}}, {{variable.shipping_time}}, etc.
    else if (path.startsWith('variable.')) {
      value = context.siteVariables ? context.siteVariables[path] : undefined;
    }
    // Product variables
    else if (path.startsWith('product.')) {
      value = getNestedValue(context, path);
    }
    // Cart variables
    else if (path.startsWith('cart.')) {
      value = getNestedValue(context, path);
    }
    // Customer variables
    else if (path.startsWith('customer.')) {
      value = getNestedValue(context, path);
    }
    // Order variables
    else if (path.startsWith('order.')) {
      value = getNestedValue(context, path);
    }
    // Funnel variables
    else if (path.startsWith('funnel.')) {
      value = getNestedValue(context, path);
    }
    // Page variables
    else if (path.startsWith('page.')) {
      value = getNestedValue(context, path);
    }
    // Collection variables
    else if (path.startsWith('collection.')) {
      value = getNestedValue(context, path);
    }
    // Top-level shortcuts
    else {
      value = getNestedValue(context, path);
    }

    if (value === undefined || value === null) return '';

    if (filter === 'currency') {
      const num = parseFloat(String(value));
      const currency = context.store?.currency ?? 'USD';
      return isNaN(num) ? String(value) : formatCurrency(num, currency);
    }

    if (filter === 'date') {
      return new Date(String(value)).toLocaleDateString();
    }

    if (filter === 'uppercase') return String(value).toUpperCase();
    if (filter === 'lowercase') return String(value).toLowerCase();
    if (filter === 'truncate') return String(value).slice(0, 100) + '...';

    return String(value);
  });
}

function getNestedValue(obj: unknown, path: string): unknown {
  const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
  const parts = normalizedPath.split('.');

  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$',
  };
  const symbol = symbols[currency] ?? currency + ' ';
  return `${symbol}${amount.toFixed(2)}`;
}

function generateCheckoutUrl(context: StorefrontContext): string {
  const storeId = context.store?.domain ?? '';
  return `/checkout?store=${encodeURIComponent(storeId)}`;
}

function generateCartForm(context: StorefrontContext): string {
  if (!context.product) return '';
  return `
<form method="POST" action="/api/cart/add" class="merchantos-add-to-cart">
  <input type="hidden" name="productId" value="${context.product.id}">
  <input type="hidden" name="storeId" value="${context.store?.domain ?? ''}">
  <button type="submit" class="merchantos-btn-checkout">Add to Cart</button>
</form>`.trim();
}

// ============================================================
// FULL RENDER PIPELINE
// ============================================================

export interface RenderResult {
  html: string;
  css: string;
  bindings: string[];
  renderTime: number;
}

export function renderStorefrontTemplate(
  rawHtml: string,
  rawCss: string,
  context: StorefrontContext
): RenderResult {
  const startTime = Date.now();

  // Step 1: Sanitize
  const sanitizedHtml = sanitizeHtml(rawHtml);

  // Step 2: Compile with data bindings
  const compiledHtml = compileTemplate(sanitizedHtml, context);

  // Step 3: Inject GoAffPro SDK if store has it configured
  const finalHtml = injectGoAffProSdk(compiledHtml, context);

  // Step 4: Detect all bindings used
  const bindings = extractBindings(rawHtml);

  return {
    html: finalHtml,
    css: rawCss,
    bindings,
    renderTime: Date.now() - startTime,
  };
}

function injectGoAffProSdk(html: string, context: StorefrontContext): string {
  return html;
}

function extractBindings(html: string): string[] {
  const matches = html.match(/\{\{[\w.[\]|#/ ]+\}\}/g) ?? [];
  return [...new Set(matches)];
}

// ============================================================
// ASSET URL REWRITING
// ============================================================

export function rewriteAssetUrls(html: string, cdnBase: string): string {
  return html
    .replace(/src=["']\/assets\//g, `src="${cdnBase}/assets/`)
    .replace(/href=["']\/assets\//g, `href="${cdnBase}/assets/`);
}

// ============================================================
// HTML UPLOAD PROCESSOR
// ============================================================

export interface ProcessedTemplate {
  sanitizedHtml: string;
  extractedCss: string;
  extractedJs: string;
  bindings: string[];
  warnings: string[];
}

export function processUploadedHtml(rawHtml: string): ProcessedTemplate {
  const warnings: string[] = [];

  // Extract <style> blocks
  const cssBlocks: string[] = [];
  const htmlWithoutStyles = rawHtml.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
    cssBlocks.push(css);
    return '';
  });

  // Extract allowed <script> blocks (GoAffPro, Stripe, Brevo only)
  const jsBlocks: string[] = [];
  const htmlWithoutScripts = htmlWithoutStyles.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, content) => {
    const srcMatch = attrs.match(/src=["']([^"']+)["']/);
    if (srcMatch) {
      const domain = new URL(srcMatch[1]).hostname;
      if (ALLOWED_SCRIPT_DOMAINS.some((d) => domain.includes(d))) {
        jsBlocks.push(match);
        return match;
      } else {
        warnings.push(`External script from ${domain} was removed for security.`);
        return '';
      }
    }
    if (content.trim()) {
      warnings.push('Inline JavaScript was extracted and sandboxed.');
      jsBlocks.push(content);
    }
    return '';
  });

  const sanitizedHtml = sanitizeHtml(htmlWithoutScripts);
  const bindings = extractBindings(rawHtml);

  return {
    sanitizedHtml,
    extractedCss: cssBlocks.join('\n'),
    extractedJs: jsBlocks.join('\n'),
    bindings,
    warnings,
  };
}