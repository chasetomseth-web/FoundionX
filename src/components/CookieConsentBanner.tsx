'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem('mos_consent');
    if (!consent) {
      // Show banner after 1 second delay
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConsent = (value: string) => {
    // Save to localStorage
    localStorage.setItem('mos_consent', value);
    
    // Set cookie with 1 year expiry
    const maxAge = 31536000; // 1 year in seconds
    document.cookie = `mos_consent=${value};max-age=${maxAge};path=/;SameSite=Lax`;
    
    // Hide banner
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-[800px] mx-auto px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-gray-700 flex-1">
            We use cookies to improve your experience and track affiliate referrals. By continuing you agree to our{' '}
            <Link href="/p/privacy" className="text-primary underline hover:opacity-80">
              cookie policy
            </Link>
            .
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => handleConsent('necessary')}
              className="flex-1 sm:flex-initial px-4 py-2 border border-gray-300 rounded-lg text-sm font-500 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Necessary Only
            </button>
            <button
              onClick={() => handleConsent('all')}
              className="flex-1 sm:flex-initial px-4 py-2 bg-primary text-white rounded-lg text-sm font-500 hover:opacity-90 transition-opacity"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
