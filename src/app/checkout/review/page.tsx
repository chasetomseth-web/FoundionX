'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';

function CheckoutReviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const productId = searchParams.get('productId');
  const storeId = searchParams.get('storeId');
  const quantity = parseInt(searchParams.get('quantity') || '1');
  const variantId = searchParams.get('variantId');
  const affiliateCode = searchParams.get('ref');

  const [product, setProduct] = useState<any>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!productId || !storeId) {
      setError('Missing required parameters');
      setLoading(false);
      return;
    }

    loadProduct();
  }, [productId, storeId]);

  const loadProduct = async () => {
    try {
      const res = await fetch(`/api/products/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
      } else {
        setError('Product not found');
      }
    } catch (err) {
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!termsAccepted) {
      alert('Please accept the Terms of Service and Privacy Policy to continue');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          storeId,
          quantity,
          variantId,
          affiliateCode,
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.message || 'Failed to create checkout session');
        setProcessing(false);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const total = product?.price ? parseFloat(product.price) * quantity : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-6 text-center">Order Summary</h1>

          {product && (
            <div className="mb-6">
              {product.images?.[0]?.url && (
                <div className="mb-4 relative h-48 w-full">
                  <Image
                    src={product.images[0].url}
                    alt={product.name}
                    fill
                    className="object-contain rounded"
                  />
                </div>
              )}
              
              <h2 className="text-lg font-semibold mb-2">{product.name}</h2>
              
              {variantId && (
                <p className="text-sm text-gray-600 mb-2">
                  Variant: {product.variants?.find((v: any) => v.id === variantId)?.name}
                </p>
              )}

              <div className="flex justify-between items-center py-2 border-t border-b border-gray-200 my-4">
                <span className="text-gray-600">Quantity</span>
                <span className="font-medium">{quantity}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Price</span>
                <span className="font-medium">${product.price}</span>
              </div>

              <div className="flex justify-between items-center py-2 font-bold text-lg border-t border-gray-200 mt-2">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                I agree to the{' '}
                <a
                  href="/p/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Terms of Service
                </a>{' '}
                and{' '}
                <a
                  href="/p/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Privacy Policy
                </a>
              </span>
            </label>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleProceedToPayment}
            disabled={!termsAccepted || processing}
            className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition ${
              termsAccepted && !processing
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {processing ? 'Processing...' : 'Proceed to Payment'}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            You will be redirected to Stripe to complete your payment securely
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutReviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <CheckoutReviewContent />
    </Suspense>
  );
}
