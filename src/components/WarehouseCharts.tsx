'use client';

import { useState, useEffect } from 'react';

interface ChartProps {
  url: string;
  title?: string;
  loading?: boolean;
  onError?: (error: string) => void;
}

export function ChartImage({ url, title, loading = false, onError }: ChartProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    setHasError(false);
  }, [url]);

  const handleLoad = () => {
    setImageLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    onError?.('图表加载失败');
  };

  if (loading || !imageLoaded) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] bg-white/5 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2"></div>
          <p className="text-white/50 text-sm">加载图表中...</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] bg-red-500/10 rounded-lg">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2">图表加载失败</p>
          <button
            onClick={() => window.location.reload()}
            className="text-cyan-400 hover:text-cyan-300 text-sm underline"
          >
            点击重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={title || '图表'}
        className="w-full h-auto object-contain"
        onLoad={handleLoad}
        onError={handleError}
        style={{ minHeight: '200px' }}
      />
    </div>
  );
}

export function ChartPlaceholder({
  title: _title,
  type = 'loading',
}: {
  title?: string;
  type?: 'loading' | 'empty' | 'error';
}) {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px] bg-white/5 rounded-lg">
      <div className="text-center">
        {type === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2"></div>
            <p className="text-white/50 text-sm">加载图表中...</p>
          </>
        )}
        {type === 'empty' && (
          <>
            <div className="text-white/30 text-4xl mb-2">📊</div>
            <p className="text-white/40 text-sm">暂无数据</p>
          </>
        )}
        {type === 'error' && (
          <>
            <div className="text-red-400 text-4xl mb-2">⚠️</div>
            <p className="text-red-400 text-sm">图表加载失败</p>
          </>
        )}
      </div>
    </div>
  );
}

export function ChartGrid({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {children}
    </div>
  );
}

export function ChartCard({
  title,
  children,
  icon,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`tech-card tech-glow p-0 ${className}`}>
      <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
        {icon && (
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
        )}
        {icon}
        <span className="text-sm font-medium text-white/80">{title}</span>
      </div>
      <div className="p-4 h-[300px]">{children}</div>
    </div>
  );
}
