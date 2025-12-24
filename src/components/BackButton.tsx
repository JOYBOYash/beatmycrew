'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BackButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className={cn(
        'absolute top-4 left-4 z-50 flex items-center justify-center gap-2 rounded-full px-4 py-2 text-white font-bold text-lg shadow-lg hover:scale-105 transition-transform',
        className
      )}
      style={{
        background:
          'linear-gradient(180deg, #b7341d 0%, #762112 50%, #5a1a0f 100%)',
      }}
    >
      <ArrowLeft className="h-5 w-5" />
      BACK
    </button>
  );
}
