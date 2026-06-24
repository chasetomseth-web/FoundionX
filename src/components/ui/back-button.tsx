'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  label?: string;
  className?: string;
  onClick?: () => void;
}

export default function BackButton({ label = 'Back', className = '', onClick }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-500 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${className}`}
    >
      <ArrowLeft size={16} />
      <span>{label}</span>
    </button>
  );
}
