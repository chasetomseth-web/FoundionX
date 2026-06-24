'use client';

import { useEffect, useRef } from 'react';

interface PublishedPageHtmlProps {
  html: string;
  css?: string | null;
}

export default function PublishedPageHtml({ html, css }: PublishedPageHtmlProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = `<style>${css ?? ''}</style>${html}`;

    const scripts = Array.from(container.querySelectorAll('script'));
    for (const script of scripts) {
      const newScript = document.createElement('script');
      if (script.src) {
        newScript.src = script.src;
      } else {
        newScript.textContent = script.textContent;
      }
      if (script.async) {
        newScript.async = true;
      }
      script.parentNode?.replaceChild(newScript, script);
    }
  }, [html, css]);

  return <div ref={containerRef} />;
}
