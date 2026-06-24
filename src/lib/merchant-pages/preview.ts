import type { PageBlock } from './types';

const safeText = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const styledWrapper = (content: string) => `
  <section style="font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height:1.5; margin:0; padding:0;">
    ${content}
  </section>
`;

const renderBlock = (block: PageBlock, children: string): string => {
  const backgroundColor = block.style?.backgroundColor ? `background:${safeText(block.style.backgroundColor)};` : '';
  const color = block.style?.textColor ? `color:${safeText(block.style.textColor)};` : '';
  const padding = block.style?.padding ? `padding:${safeText(block.style.padding)};` : '';
  const align = block.style?.align ? `text-align:${safeText(block.style.align)};` : '';
  const borderRadius = block.style?.borderRadius ? `border-radius:${safeText(block.style.borderRadius)};` : '';
  const width = block.style?.width ? `width:${safeText(block.style.width)};` : '';
  const maxWidth = block.style?.maxWidth ? `max-width:${safeText(block.style.maxWidth)};` : '';
  const style = `${backgroundColor}${color}${padding}${align}${borderRadius}${width}${maxWidth}`;

  switch (block.type) {
    case 'hero':
      return `
        <div style="${style}">
          <div style="max-width:900px;margin:0 auto;">
            <p style="font-size:0.9rem;opacity:.7;margin-bottom:.75rem;">${safeText(block.props?.eyebrow)}</p>
            <h1 style="font-size:2.5rem;margin:0 0 1rem;">${safeText(block.props?.title)}</h1>
            <p style="font-size:1.05rem;opacity:.85;margin:0 0 1.5rem;">${safeText(block.props?.subtitle)}</p>
            <a href="${safeText(block.props?.ctaUrl)}" style="display:inline-flex;padding:0.9rem 1.4rem;background:#2563eb;color:#fff;text-decoration:none;border-radius:999px;">${safeText(block.props?.ctaText)}</a>
          </div>
        </div>
      `;
    case 'text':
      return `<div style="${style}">${safeText(block.props?.text)}</div>`;
    case 'image':
      return `<div style="${style}"><img src="${safeText(block.props?.src)}" alt="${safeText(block.props?.alt)}" style="width:100%;border-radius:inherit;" /></div>`;
    case 'countdown':
      return `
        <div style="${style}">
          <h2 style="margin:0 0 .5rem;">${safeText(block.props?.title)}</h2>
          <p style="margin:0 0 1rem;opacity:.85;">${safeText(block.props?.subtitle)}</p>
        </div>
      `;
    case 'checkout':
      return `
        <div style="${style}">
          <h2 style="margin:0 0 .5rem;">${safeText(block.props?.title)}</h2>
          <p style="margin:0 0 1rem;opacity:.85;">${safeText(block.props?.description)}</p>
          <p style="font-size:1.25rem;font-weight:700;margin:0 0 1rem;">${safeText(block.props?.price)}</p>
          <a href="#" style="display:inline-flex;padding:.9rem 1.4rem;background:#111827;color:#fff;border-radius:999px;text-decoration:none;">${safeText(block.props?.buttonText)}</a>
        </div>
      `;
    case 'cta':
      return `
        <div style="${style}">
          <h2 style="margin:0 0 .5rem;">${safeText(block.props?.title)}</h2>
          <p style="margin:0 0 1rem;opacity:.85;">${safeText(block.props?.description)}</p>
          <a href="${safeText(block.props?.buttonUrl)}" style="display:inline-flex;padding:.9rem 1.4rem;background:#111827;color:#fff;border-radius:999px;text-decoration:none;">${safeText(block.props?.buttonText)}</a>
        </div>
      `;
    case 'testimonials':
      return `
        <div style="${style}">
          ${Array.isArray(block.props?.testimonials)
            ? block.props.testimonials.map((testimonial: any) => `
                <blockquote style="margin:0 0 1rem;padding:1rem;border-left:4px solid rgba(0,0,0,.12);">
                  <p style="margin:0 0 .5rem;">${safeText(testimonial.quote)}</p>
                  <footer style="font-size:.9rem;opacity:.75;">${safeText(testimonial.author)}</footer>
                </blockquote>
              `).join('')
            : ''}
        </div>
      `;
    case 'affiliate':
    case 'affiliate_signup':
      return `
        <div style="${style}">
          <h2 style="margin:0 0 .5rem;">${safeText(block.props?.title)}</h2>
          <p style="margin:0 0 1rem;opacity:.85;">${safeText(block.props?.description)}</p>
          <a href="${safeText(block.props?.ctaUrl || block.props?.buttonUrl || '#')}" style="display:inline-flex;padding:.9rem 1.4rem;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:999px;">${safeText(block.props?.ctaText || block.props?.buttonText)}</a>
        </div>
      `;
    case 'order_bump':
    case 'upsell':
      return `
        <div style="${style}">
          <h3 style="margin:0 0 .5rem;">${safeText(block.props?.title)}</h3>
          <p style="margin:0 0 1rem;opacity:.8;">${safeText(block.props?.description)}</p>
          ${block.props?.price ? `<p style="font-weight:700;margin:0 0 1rem;">${safeText(block.props.price)}</p>` : ''}
          <button style="padding:.85rem 1.2rem;background:#111827;color:#fff;border:none;border-radius:999px;">${safeText(block.props?.buttonText)}</button>
        </div>
      `;
    case 'html':
      return `<div style="${style}">${block.props?.html ?? ''}</div>`;
    case 'script':
      return `<div style="${style}"><script>${block.props?.script ?? ''}</script></div>`;
    default:
      return `<div style="${style}">${children}</div>`;
  }
};

const renderTree = (blocks: PageBlock[], parentId: string | null = null): string => {
  const children = blocks
    .filter((block) => block.parentId === parentId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((block) => renderBlock(block, renderTree(blocks, block.id)))
    .join('');

  return children;
};

export function blocksToHtml(blocks: PageBlock[]) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Live Preview</title>
  <style>
    body { margin: 0; min-height: 100vh; background: #f8fafc; }
    *, *::before, *::after { box-sizing: border-box; }
  </style>
</head>
<body>
  ${styledWrapper(renderTree(blocks))}
</body>
</html>`;
}
