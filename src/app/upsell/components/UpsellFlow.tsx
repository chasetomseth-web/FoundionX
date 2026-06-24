'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import BackButton from '@/components/ui/back-button';

interface StepData {
  productName: string;
  productDescription: string;
  productImage: string;
  price: number;
  currency: string;
  acceptUrl: string;
  declineUrl: string;
}

export default function UpsellFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const upsellSessionId = searchParams.get('upsellSessionId');
  const stepId = searchParams.get('stepId');

  const [stepData, setStepData] = useState<StepData | null>(null);
  const [loading, setLoading] = useState(true);
  const [charging, setCharging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stepId) {
      setLoading(false);
      setError('No step ID provided');
      return;
    }
    fetch(`/api/upsell/steps/${stepId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setStepData(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [stepId]);

  const handleAccept = async () => {
    if (!upsellSessionId || !stepId) return;
    setCharging(true);
    setError(null);
    try {
      const res = await fetch('/api/upsell/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upsellSessionId, stepId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Charge failed');
      if (stepData?.acceptUrl) router.push(stepData.acceptUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Charge failed');
    } finally {
      setCharging(false);
    }
  };

  const handleDecline = () => {
    if (stepData?.declineUrl) router.push(stepData.declineUrl);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-[#e8556d] mx-auto" />
          <p className="text-gray-500 text-sm">Loading offer...</p>
        </div>
      </div>
    );
  }

  if (error || !stepData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <XCircle size={48} className="text-red-400 mx-auto" />
          <h2 className="text-lg font-600 text-gray-900">Offer Unavailable</h2>
          <p className="text-sm text-gray-500">{error || 'This offer is no longer available.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-8 px-4">
      <div className="max-w-[600px] w-full flex flex-col items-center gap-6">
        {stepData.productImage && (
          <div className="w-full rounded-xl overflow-hidden">
            <img src={stepData.productImage} alt={stepData.productName} className="w-full h-auto object-cover rounded-xl" />
          </div>
        )}
        <h1 className="text-2xl font-700 text-gray-900 text-center">{stepData.productName}</h1>
        <p className="text-3xl font-700 text-[#e8556d]">
          {stepData.currency === 'USD' ? '$' : stepData.currency} {stepData.price.toFixed(2)}
        </p>
        {stepData.productDescription && (
          <p className="text-sm text-gray-600 text-center leading-relaxed">{stepData.productDescription}</p>
        )}
        <div className="w-full flex flex-col gap-3 mt-2">
          <button onClick={handleAccept} disabled={charging}
            className="w-full flex items-center justify-center gap-2 h-12 bg-[#e8556d] text-white text-base font-600 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60">
            {charging ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {charging ? 'Processing...' : 'Yes! Add This To My Order'}
          </button>
          <button onClick={handleDecline} disabled={charging}
            className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors disabled:opacity-50">
            No thanks, I&apos;ll pass
          </button>
        </div>
        {error && (
          <div className="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={() => { setError(null); setCharging(false); }} className="mt-1 text-xs text-red-500 hover:underline">Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
}