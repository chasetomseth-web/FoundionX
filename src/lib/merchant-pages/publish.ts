import type { PageBlock } from './types';

const safeText = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const buildInlineStyle = (style: Record<string, unknown> | undefined) => {
  if (!style || typeof style !== 'object') return '';

  const styleEntries = Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim().length > 0)
    .map(([key, value]) => {
      const kebab = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${kebab}:${safeText(value)};`;
    });

  return styleEntries.join('');
};

const renderCheckoutBlock = (block: PageBlock) => {
  const props = block.props as Record<string, unknown>;
  const title = safeText(props.title ?? 'Complete your order');
  const description = safeText(props.description ?? 'Purchase the product below and complete checkout.');
  const buttonText = safeText(props.buttonText ?? 'Complete purchase');
  const priceText = safeText(props.price ?? '');
  const productId = safeText(props.productId ?? '');
  const offerId = safeText(props.offerId ?? '');
  const mode = safeText(props.mode ?? 'payment');
  const successUrl = safeText(props.successUrl ?? `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`);
  const cancelUrl = safeText(props.cancelUrl ?? `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/cancel`);
  const imageUrl = safeText(props.imageUrl ?? '');
  const hideQuantity = props.disableQuantity === true || props.disableQuantity === 'true';
  const showCoupon = props.showCoupon === true || props.showCoupon === 'true';
  const showEmail = props.collectEmail !== false;
  const productName = safeText(props.name ?? props.title ?? 'Order item');

  return `
    <div class="merchantos-block merchantos-block-checkout" data-block-id="${safeText(block.id)}">
      <h2>${title}</h2>
      <p>${description}</p>
      ${priceText ? `<div class="merchantos-checkout-price">${priceText}</div>` : ''}
      <form class="merchantos-checkout-form" data-page-id="${safeText(block.pageId ?? '')}" data-store-id="${safeText(props.storeId ?? '')}" data-product-id="${productId}" data-offer-id="${offerId}" data-mode="${mode}" data-success-url="${successUrl}" data-cancel-url="${cancelUrl}" data-item-name="${productName}" data-item-description="${description}" data-item-price="${priceText}" data-image-url="${imageUrl}">
        <input type="hidden" name="affiliateCode" value="" />
        <input type="hidden" name="pageId" value="${safeText(block.pageId ?? '')}" />
        ${showEmail ? '<label>Email <input type="email" name="email" required placeholder="you@example.com" /></label>' : ''}
        ${showCoupon ? '<label>Coupon code <input type="text" name="couponCode" placeholder="COUPON" /></label>' : '<input type="hidden" name="couponCode" value="" />'}
        ${hideQuantity ? '<input type="hidden" name="quantity" value="1" />' : '<label>Quantity <input type="number" name="quantity" min="1" value="1" /></label>'}
        <button type="submit">${buttonText}</button>
        <div class="merchantos-checkout-feedback" aria-live="polite"></div>
      </form>
    </div>
  `;
};

const renderBlock = (block: PageBlock, children: string): string => {
  const style = buildInlineStyle(block.style as Record<string, unknown>);
  const props = block.props as Record<string, unknown>;

  switch (block.type) {
    case 'hero':
      return `
        <section class="merchantos-block merchantos-block-hero" style="${style}">
          <div class="merchantos-hero-inner">
            <p class="merchantos-hero-eyebrow">${safeText(props.eyebrow)}</p>
            <h1>${safeText(props.title)}</h1>
            <p>${safeText(props.subtitle)}</p>
            <a class="merchantos-hero-button" href="${safeText(props.ctaUrl)}">${safeText(props.ctaText)}</a>
          </div>
        </section>
      `;
    case 'text':
      return `<section class="merchantos-block merchantos-block-text" style="${style}">${safeText(props.text)}</section>`;
    case 'image':
      return `
        <section class="merchantos-block merchantos-block-image" style="${style}">
          <img src="${safeText(props.src)}" alt="${safeText(props.alt)}" />
        </section>
      `;
    case 'checkout':
      return `<section class="merchantos-block merchantos-block-checkout" style="${style}">${renderCheckoutBlock(block)}</section>`;
    case 'cta':
      return `
        <section class="merchantos-block merchantos-block-cta" style="${style}">
          <h2>${safeText(props.title)}</h2>
          <p>${safeText(props.description)}</p>
          <a class="merchantos-cta-button" href="${safeText(props.buttonUrl)}">${safeText(props.buttonText)}</a>
        </section>
      `;
    case 'affiliate':
    case 'affiliate_signup':
      return `
        <section class="merchantos-block merchantos-block-affiliate" style="${style}">
          <h2>${safeText(props.title)}</h2>
          <p>${safeText(props.description)}</p>
          <a class="merchantos-affiliate-button" href="${safeText(props.ctaUrl ?? props.buttonUrl ?? '#')}">${safeText(props.ctaText ?? props.buttonText)}</a>
        </section>
      `;
    case 'order_bump':
    case 'upsell':
      return `
        <section class="merchantos-block merchantos-block-upsell" style="${style}">
          <h3>${safeText(props.title)}</h3>
          <p>${safeText(props.description)}</p>
          ${props.price ? `<p class="merchantos-upsell-price">${safeText(props.price)}</p>` : ''}
          <button type="button" class="merchantos-upsell-button">${safeText(props.buttonText)}</button>
        </section>
      `;
    case 'html':
      return `<section class="merchantos-block merchantos-block-html" style="${style}">${props.html ?? ''}</section>`;
    case 'script':
      return `<section class="merchantos-block merchantos-block-script" style="${style}"><script>${props.script ?? ''}</script></section>`;
    default:
      return `<section class="merchantos-block merchantos-block-default" style="${style}">${children}</section>`;
  }
};

const renderTree = (blocks: PageBlock[], parentId: string | null = null): string =>
  blocks
    .filter((block) => block.parentId === parentId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((block) => renderBlock(block, renderTree(blocks, block.id)))
    .join('');

const pageScript = `
(function() {
  const cookieName = 'merchantos_affiliate_code';

  function getQueryStringValue(key) {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
  }

  function setCookie(name, value, days) {
    if (!value) return;
    const expires = new Date(Date.now() + (days || 30) * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + ';path=/;expires=' + expires;
  }

  function getAffiliateCode() {
    const queryRef = getQueryStringValue('ref');
    const stored = localStorage.getItem(cookieName);
    const cookie = document.cookie.split('; ').find((cookie) => cookie.startsWith(cookieName + '='));
    const cookieValue = cookie ? cookie.split('=')[1] : '';
    return queryRef || stored || decodeURIComponent(cookieValue || '');
  }

  function saveAffiliateCode(code) {
    if (!code) return;
    localStorage.setItem(cookieName, code);
    setCookie(cookieName, code, 30);
  }

  function parseNumber(value) {
    if (!value) return 0;
    return Number(String(value).replace(/[^0-9.-]+/g, '')) || 0;
  }

  async function createCheckoutSession(payload) {
    const response = await fetch('/api/checkout/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.json();
  }

  function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const feedback = form.querySelector('.merchantos-checkout-feedback');
    if (feedback) feedback.textContent = 'Creating checkout session…';

    const offerId = form.dataset.offerId;
    const productId = form.dataset.productId;
    const mode = form.dataset.mode || 'payment';
    const successUrl = form.dataset.successUrl;
    const cancelUrl = form.dataset.cancelUrl;
    const itemName = form.dataset.itemName || 'Order Item';
    const itemDescription = form.dataset.itemDescription || '';
    const imageUrl = form.dataset.imageUrl || '';
    const quantity = Math.max(1, parseNumber(form.querySelector('[name="quantity"]')?.value || '1'));
    const couponCode = form.querySelector('[name="couponCode"]')?.value?.trim();
    const email = form.querySelector('[name="email"]')?.value?.trim();
    const affiliateCode = getAffiliateCode();

    const lineItem = {
      name: itemName,
      description: itemDescription,
      price: parseNumber(form.dataset.itemPrice),
      quantity,
      images: imageUrl ? [imageUrl] : undefined,
      productId: productId || undefined,
      offerId: offerId || undefined,
    };

    const payload = {
      items: [lineItem],
      affiliateCode: affiliateCode || undefined,
      couponCode: couponCode || undefined,
      successUrl,
      cancelUrl,
      mode,
      metadata: {
        pageId: form.querySelector('[name="pageId"]')?.value,
        email: email || undefined,
      },
    };

    createCheckoutSession(payload).then((result) => {
      if (result?.url) {
        if (affiliateCode) saveAffiliateCode(affiliateCode);
        window.location.href = result.url;
      } else {
        if (feedback) feedback.textContent = result?.error || 'Unable to create checkout session.';
      }
    }).catch((error) => {
      if (feedback) feedback.textContent = 'Unable to create checkout session.';
      console.error('[MerchantOS] Checkout error', error);
    });
  }

  document.querySelectorAll('.merchantos-checkout-form').forEach((form) => {
    const ref = getQueryStringValue('ref');
    if (ref) {
      saveAffiliateCode(ref);
      const affiliateInput = form.querySelector('[name="affiliateCode"]');
      if (affiliateInput) affiliateInput.value = ref;
    }

    const storedAffiliate = getAffiliateCode();
    if (storedAffiliate) {
      const affiliateInput = form.querySelector('[name="affiliateCode"]');
      if (affiliateInput) affiliateInput.value = storedAffiliate;
    }

    form.addEventListener('submit', handleFormSubmit);
  });
})();
`;

const buildPageCss = () => `
  body { margin: 0; min-height: 100vh; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #111827; }
  .merchantos-page { width: 100%; }
  .merchantos-block { margin: 0 auto 24px; padding: 24px; max-width: 960px; background: #ffffff; border-radius: 20px; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.06); }
  .merchantos-hero-inner { max-width: 920px; margin: 0 auto; }
  .merchantos-hero-eyebrow { margin: 0 0 12px; color: #3b82f6; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.14em; }
  .merchantos-hero-button, .merchantos-cta-button, .merchantos-affiliate-button, .merchantos-upsell-button, .merchantos-checkout-form button { display: inline-flex; align-items: center; justify-content: center; padding: 14px 22px; border-radius: 999px; background: #111827; color: #ffffff; text-decoration: none; border: none; cursor: pointer; }
  .merchantos-checkout-price { margin: 18px 0; font-size: 1.75rem; font-weight: 700; }
  .merchantos-checkout-form { display: grid; gap: 16px; width: 100%; max-width: 560px; }
  .merchantos-checkout-form label { display: grid; gap: 8px; font-size: 0.95rem; }
  .merchantos-checkout-form input { width: 100%; min-height: 44px; padding: 0 14px; border: 1px solid #d1d5db; border-radius: 12px; }
  .merchantos-checkout-feedback { color: #dc2626; min-height: 24px; font-size: 0.95rem; }
  img { max-width: 100%; height: auto; display: block; border-radius: 14px; }
`;

export type PixelTrackingIds = {
  gtmId?: string | null;
  facebookPixelId?: string | null;
  tiktokPixelId?: string | null;
};

function buildPixelHeadHtml(ids: PixelTrackingIds): string {
  const parts: string[] = [];

  if (ids.gtmId) {
    parts.push(`<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${ids.gtmId}');</script>`);
  }

  if (ids.facebookPixelId) {
    parts.push(`<!-- Meta Pixel -->
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${ids.facebookPixelId}');fbq('track','PageView');</script>`);
  }

  if (ids.tiktokPixelId) {
    parts.push(`<!-- TikTok Pixel -->
<script>!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];
ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};
var a=document.createElement("script");a.type="text/javascript";a.async=!0;a.src=r+"?sdkid="+e+"&lib="+t;var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(a,s)};
ttq.load('${ids.tiktokPixelId}');ttq.page()}(window,document,'ttq');</script>`);
  }

  return parts.join('\n');
}

export function buildPublishedPageHtml(blocks: PageBlock[], pixelIds?: PixelTrackingIds) {
  const pixelHead = pixelIds ? buildPixelHeadHtml(pixelIds) : '';
  return {
    html: `${pixelHead}<main class="merchantos-page">${renderTree(blocks)}<script>${pageScript}</script></main>`,
    css: buildPageCss(),
  };
}
