'use client';

import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  showHomeLink?: boolean;
}

export function ErrorFallback({ error, reset, showHomeLink = false }: ErrorFallbackProps) {
  const t = useTranslations('Common');

  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: '#f5f7fa' }}
        >
          <AlertCircle className="w-6 h-6" style={{ color: '#f5222d' }} />
        </div>
        <div>
          <h2 className="text-base font-semibold mb-1" style={{ color: '#1f2329' }}>
            {t('pageLoadFailed')}
          </h2>
          <p className="text-sm" style={{ color: '#86909c' }}>
            {error.message || t('pleaseRetry')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={reset}
            className="gap-2"
            style={{ backgroundColor: '#1677ff', borderColor: '#1677ff' }}
          >
            <RefreshCw className="w-4 h-4" />
            {t('retry')}
          </Button>
          {showHomeLink && (
            <Link href="/">
              <Button variant="outline" className="gap-2">
                <Home className="w-4 h-4" />
                {t('backToHome')}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
