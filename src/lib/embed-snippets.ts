/**
 * Embed Snippets Generator
 * Generates HTML/JS snippets for embedding various features into HTML stores
 */

/**
 * Generates affiliate tracking snippet
 */
export function getAffiliateTrackingSnippet(siteUrl: string): string {
  return `<script>
(function(){
  var ref = new URLSearchParams(window.location.search).get('ref');
  if(ref){
    fetch('${siteUrl}/api/affiliates/track/'+ref,{method:'POST'});
    document.cookie='mos_affiliate='+ref+';max-age=2592000;path=/;SameSite=Lax';
  }
})();
</script>`;
}

/**
 * Generates checkout button snippet
 */
export function getCheckoutButtonSnippet(
  productId: string,
  storeId: string,
  siteUrl: string
): string {
  return `<!-- Checkout Button -->
<button id="mos-checkout-btn" style="background:#ef4444;color:white;padding:12px 24px;border:none;border-radius:6px;font-size:16px;font-weight:600;cursor:pointer;">
  Buy Now
</button>

<script>
document.getElementById('mos-checkout-btn').addEventListener('click', async function() {
  this.disabled = true;
  this.textContent = 'Loading...';
  
  try {
    const res = await fetch('${siteUrl}/checkout/review?productId=${productId}&storeId=${storeId}');
    if (res.ok) {
      window.location.href = '${siteUrl}/checkout/review?productId=${productId}&storeId=${storeId}';
    }
  } catch(err) {
    alert('Error: ' + err.message);
    this.disabled = false;
    this.textContent = 'Buy Now';
  }
});
</script>`;
}

/**
 * Generates customer portal login snippet
 */
export function getPortalLoginSnippet(siteUrl: string): string {
  return `<!-- Customer Portal Login -->
<a href="${siteUrl}/portal/login" style="display:inline-block;padding:10px 20px;background:#3b82f6;color:white;text-decoration:none;border-radius:6px;font-weight:500;">
  Customer Login
</a>`;
}

/**
 * Generates GDPR cookie consent banner snippet
 */
export function getCookieConsentSnippet(siteUrl: string): string {
  return `<!-- Cookie Consent Banner -->
<style>
#mos-cookie-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #e5e7eb;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  padding: 20px;
  z-index: 9999;
  display: none;
}
#mos-cookie-banner.show { display: block; }
#mos-cookie-content {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
#mos-cookie-text { flex: 1; font-size: 14px; color: #374151; }
#mos-cookie-buttons { display: flex; gap: 10px; }
.mos-cookie-btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}
.mos-cookie-btn.primary {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}
@media (max-width: 640px) {
  #mos-cookie-content { flex-direction: column; align-items: stretch; }
  #mos-cookie-buttons { flex-direction: column; }
}
</style>

<div id="mos-cookie-banner">
  <div id="mos-cookie-content">
    <div id="mos-cookie-text">
      We use cookies to improve your experience and track affiliate referrals. 
      By continuing you agree to our <a href="${siteUrl}/p/privacy" target="_blank" style="color:#3b82f6;text-decoration:underline;">cookie policy</a>.
    </div>
    <div id="mos-cookie-buttons">
      <button class="mos-cookie-btn" onclick="mosCookieConsent('necessary')">Necessary Only</button>
      <button class="mos-cookie-btn primary" onclick="mosCookieConsent('all')">Accept All</button>
    </div>
  </div>
</div>

<script>
(function() {
  var consent = localStorage.getItem('mos_consent');
  if (!consent) {
    setTimeout(function() {
      document.getElementById('mos-cookie-banner').classList.add('show');
    }, 1000);
  }
})();

function mosCookieConsent(type) {
  localStorage.setItem('mos_consent', type);
  document.cookie = 'mos_consent=' + type + ';max-age=31536000;path=/;SameSite=Lax';
  document.getElementById('mos-cookie-banner').style.display = 'none';
}
</script>`;
}

/**
 * Generates tracking pixels snippet
 */
export function getPixelSnippet(
  gtmId?: string,
  fbPixelId?: string,
  tiktokPixelId?: string
): string {
  let snippet = '<!-- Tracking Pixels -->\n';

  if (gtmId) {
    snippet += `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');</script>
<!-- End Google Tag Manager -->

`;
  }

  if (fbPixelId) {
    snippet += `<!-- Facebook Pixel -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${fbPixelId}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${fbPixelId}&ev=PageView&noscript=1"
/></noscript>
<!-- End Facebook Pixel -->

`;
  }

  if (tiktokPixelId) {
    snippet += `<!-- TikTok Pixel -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  ttq.load('${tiktokPixelId}');
  ttq.page();
}(window, document, 'ttq');
</script>
<!-- End TikTok Pixel -->

`;
  }

  return snippet;
}

/**
 * Returns all snippets as a named object
 */
export function getAllSnippets(
  store: { slug: string; gtmId?: string | null; facebookPixelId?: string | null; tiktokPixelId?: string | null },
  siteUrl: string
): {
  affiliateTracking: string;
  checkoutButton: string;
  portalLogin: string;
  cookieConsent: string;
  trackingPixels: string;
  fullBundle: string;
} {
  const affiliateTracking = getAffiliateTrackingSnippet(siteUrl);
  const checkoutButton = getCheckoutButtonSnippet('PRODUCT_ID', 'STORE_ID', siteUrl);
  const portalLogin = getPortalLoginSnippet(siteUrl);
  const cookieConsent = getCookieConsentSnippet(siteUrl);
  const trackingPixels = getPixelSnippet(
    store.gtmId || undefined,
    store.facebookPixelId || undefined,
    store.tiktokPixelId || undefined
  );

  const fullBundle = `<!-- MerchantOS Full Bundle -->
<!-- Add this to your <head> tag -->
${affiliateTracking}
${trackingPixels}

<!-- Add this before </body> tag -->
${cookieConsent}`;

  return {
    affiliateTracking,
    checkoutButton,
    portalLogin,
    cookieConsent,
    trackingPixels,
    fullBundle,
  };
}
