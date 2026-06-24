import { ReactNode } from 'react';
import { PageBlock } from '@/lib/merchant-pages';

interface BlockRendererProps {
  block: PageBlock;
  children?: ReactNode;
}

const blockStyles = (block: PageBlock) => {
  const style = (block.style as Record<string, any>) ?? {};
  return {
    backgroundColor: style.backgroundColor ?? 'transparent',
    color: style.textColor ?? '#111827',
    borderColor: style.borderColor ?? '#e2e8f0',
    padding: block.type === 'hero' ? '2rem' : '1rem',
  };
};

export default function BlockRenderer({ block, children }: BlockRendererProps) {
  const style = blockStyles(block);
  const props = (block.props as Record<string, any>) ?? {};

  switch (block.type) {
    case 'section':
      return (
        <section className="rounded-3xl border border-slate-200 p-6" style={style}>
          {children}
        </section>
      );

    case 'container':
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" style={style}>
          {children}
        </div>
      );

    case 'row':
      return (
        <div className="grid gap-4 md:grid-cols-2" style={style}>
          {children}
        </div>
      );

    case 'column':
      return (
        <div className="flex flex-col gap-4" style={style}>
          {children}
        </div>
      );

    case 'hero':
      return (
        <section className="rounded-3xl bg-slate-950 p-10 text-white" style={style}>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-300">{props?.eyebrow}</p>
            <h1 className="mt-4 text-4xl font-semibold text-white">{props?.title ?? 'Hero Title'}</h1>
            <p className="mt-4 text-lg text-slate-300">{props?.subtitle ?? 'Hero subtitle goes here.'}</p>
            {props?.ctaText ? (
              <a href={props?.ctaUrl ?? '#'} className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950">
                {props.ctaText}
              </a>
            ) : null}
          </div>
          {children}
        </section>
      );

    case 'navbar':
      return (
        <nav className="flex flex-wrap items-center justify-between rounded-2xl bg-slate-950 px-6 py-4 text-white" style={style}>
          <span className="font-bold">{props?.brand ?? 'Brand'}</span>
          <div className="flex flex-wrap gap-4 text-sm">
            {(props?.links ?? ['Home', 'Features', 'Pricing']).map((item: string, idx: number) => (
              <a key={idx} href="#" className="text-slate-200 hover:text-white">
                {item}
              </a>
            ))}
          </div>
          {children}
        </nav>
      );

    case 'text':
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5" style={style}>
          <p>{props?.text ?? 'Editable text block content.'}</p>
        </div>
      );

    case 'image':
      return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <img src={props?.imageUrl ?? 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'} alt={props?.altText ?? 'Block image'} className="h-full w-full object-cover" />
        </div>
      );

    case 'countdown':
      return (
        <div className="rounded-3xl bg-slate-950 p-6 text-white" style={style}>
          <h3 className="text-xl font-semibold">{props?.title ?? 'Countdown to launch'}</h3>
          <p className="mt-2 text-slate-300">{props?.subtitle ?? 'A scarcity timer for conversions.'}</p>
          <div className="mt-5 grid grid-cols-4 gap-3 text-center text-2xl font-bold">
            <span>12</span>
            <span>08</span>
            <span>22</span>
            <span>13</span>
          </div>
        </div>
      );

    case 'cta':
      return (
        <div className="rounded-3xl bg-slate-950 p-6 text-white" style={style}>
          <h3 className="text-xl font-semibold">{props?.title ?? 'Call to action'}</h3>
          <p className="mt-2 text-slate-300">{props?.description ?? 'Tell your visitor what to do next.'}</p>
          <a href={props?.href ?? '#'} className="mt-4 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950">
            {props?.buttonText ?? 'Get started'}
          </a>
        </div>
      );

    case 'testimonials':
      return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6" style={style}>
          <h3 className="text-lg font-semibold">{props?.title ?? 'Testimonials'}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(props?.items ?? [{ quote: 'Great product!', author: 'Customer' }]).map((item: any, idx: number) => (
              <div key={idx} className="rounded-3xl border border-slate-200 p-4 shadow-sm">
                <p className="text-slate-700">“{item.quote}”</p>
                <p className="mt-3 text-sm font-semibold text-slate-900">{item.author}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case 'checkout':
      return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6" style={style}>
          <h3 className="text-lg font-semibold">{props?.title ?? 'Checkout Block'}</h3>
          <p className="mt-2 text-slate-500">{props?.description ?? 'Order summary, product details, and checkout action.'}</p>
          <button className="mt-4 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">{props?.buttonText ?? 'Buy now'}</button>
        </div>
      );

    case 'order_bump':
      return (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5" style={style}>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-700">Order bump</p>
          <h3 className="mt-2 text-lg font-semibold text-amber-900">{props?.title ?? 'Add this special offer'}</h3>
          <p className="mt-2 text-amber-700">{props?.description ?? 'Increase cart value with a one-click upsell.'}</p>
        </div>
      );

    case 'upsell':
      return (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6" style={style}>
          <h3 className="text-lg font-semibold">{props?.title ?? 'Upsell Offer'}</h3>
          <p className="mt-2 text-slate-600">{props?.description ?? 'Present a complementary product after checkout.'}</p>
        </div>
      );

    case 'affiliate':
      return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6" style={style}>
          <h3 className="text-lg font-semibold">{props?.title ?? 'Affiliate Signup'}</h3>
          <p className="mt-2 text-slate-500">{props?.description ?? 'Collect partner leads and build your affiliate program.'}</p>
          <div className="mt-4 grid gap-3">
            <a href={props?.signupUrl ?? '/affiliate/signup'} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
              {props?.buttonText ?? 'Join affiliate program'}
            </a>
            <p className="text-sm text-slate-500">Commission rate: {props?.commissionRate ?? 30}%</p>
          </div>
        </div>
      );

    case 'affiliate_signup':
      return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6" style={style}>
          <h3 className="text-lg font-semibold">{props?.title ?? 'Affiliate Signup'}</h3>
          <p className="mt-2 text-slate-500">{props?.subtitle ?? 'Collect partner leads and build your affiliate program.'}</p>
          <div className="mt-4 grid gap-3">
            <input className="rounded-2xl border border-slate-300 px-4 py-3" placeholder="Email address" />
            <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Join affiliate program</button>
          </div>
        </div>
      );

    case 'referral_dashboard':
      return (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6" style={style}>
          <h3 className="text-lg font-semibold">{props?.title ?? 'Referral Dashboard'}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Referrals</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{props?.referrals ?? 12}</p>
            </div>
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Earnings</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">${props?.earnings ?? 420}</p>
            </div>
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Conversions</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{props?.conversions ?? 31}</p>
            </div>
          </div>
        </div>
      );

    case 'html':
      return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6" style={style}>
          <div dangerouslySetInnerHTML={{ __html: String(props?.html ?? '<p>Custom HTML block</p>') }} />
        </div>
      );

    case 'script':
      return (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700" style={style}>
          <h3 className="text-lg font-semibold">Script Embed</h3>
          <pre className="mt-3 max-h-44 overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-slate-100">{String(props?.script ?? '// Add script here')}</pre>
        </div>
      );

    default:
      return (
        <div className="rounded-3xl border border-slate-200 bg-white p-5" style={style}>
          <p className="text-sm uppercase text-slate-500">{block.type}</p>
          <p className="mt-2 text-slate-700">{props?.text ?? 'Custom block content preview.'}</p>
          {children}
        </div>
      );
  }
}
