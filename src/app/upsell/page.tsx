import { Suspense } from 'react';
import UpsellFlow from './components/UpsellFlow';

export default function UpsellPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Loading offer...</p>
        </div>
      </div>
    }>
      <UpsellFlow />
    </Suspense>
  );
}
