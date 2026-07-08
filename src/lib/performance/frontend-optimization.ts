export const PERFORMANCE_CONFIG = {
  IMAGE: {
    QUALITY: 85,
    FORMATS: ['webp', 'avif'] as const,
    SIZES: {
      THUMBNAIL: 150,
      SMALL: 300,
      MEDIUM: 600,
      LARGE: 1200,
    },
    LAZY_LOADING_THRESHOLD: '100px' as const,
  },

  TABLE: {
    VIRTUAL_SCROLL_THRESHOLD: 100,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
    DEFAULT_PAGE_SIZE: 20,
    DEBOUNCE_MS: 300,
  },

  FORM: {
    DEBOUNCE_MS: 300,
    VALIDATION_DEBOUNCE_MS: 500,
    AUTOSAVE_INTERVAL_MS: 30000,
  },

  CHART: {
    ANIMATION_DURATION: 300,
    MAX_DATA_POINTS: 1000,
    RESIZE_DEBOUNCE_MS: 200,
  },
} as const;

export const BUNDLE_ANALYSIS = {
  MAX_BUNDLE_SIZE_KB: 500,
  MAX_CHUNK_SIZE_KB: 200,
  WARN_SIZE_KB: 300,
} as const;

export const PREFETCH_CONFIG = {
  ENABLED: true,
  HOVER_DELAY_MS: 100,
  VIEWPORT_MARGIN: '100px',
  PRIORITY_ROUTES: [
    '/dashboard',
    '/orders',
    '/inventory',
    '/production',
  ],
} as const;

export function shouldPrefetch(href: string): boolean {
  if (!PREFETCH_CONFIG.ENABLED) return false;
  
  return PREFETCH_CONFIG.PRIORITY_ROUTES.some(route => 
    href.startsWith(route)
  );
}

export const LAZY_LOAD_CONFIG = {
  COMPONENTS: {
    CHARTS: true,
    TABLES: true,
    MODALS: true,
    FORMS: false,
  },
  THRESHOLD: '100px',
  ROOT_MARGIN: '50px',
} as const;

export const MEMORY_CONFIG = {
  MAX_CACHE_SIZE: 100,
  CLEANUP_INTERVAL_MS: 60000,
  WARN_THRESHOLD_MB: 100,
} as const;

export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private readonly MAX_SAMPLES = 100;

  measure(name: string, fn: () => void | Promise<void>): Promise<void> {
    return Promise.resolve().then(() => {
      const start = performance.now();
      const result = fn();
      
      if (result instanceof Promise) {
        return result.then(() => {
          this.record(name, performance.now() - start);
        });
      }
      
      this.record(name, performance.now() - start);
    });
  }

  private record(name: string, duration: number): void {
    const samples = this.metrics.get(name) || [];
    samples.push(duration);
    
    if (samples.length > this.MAX_SAMPLES) {
      samples.shift();
    }
    
    this.metrics.set(name, samples);
  }

  getStats(name: string): {
    avg: number;
    min: number;
    max: number;
    p95: number;
    count: number;
  } | null {
    const samples = this.metrics.get(name);
    if (!samples || samples.length === 0) return null;

    const sorted = [...samples].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);

    return {
      avg: samples.reduce((a, b) => a + b, 0) / samples.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[p95Index],
      count: samples.length,
    };
  }

  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const result: Record<string, ReturnType<typeof this.getStats>> = {};
    for (const name of this.metrics.keys()) {
      result[name] = this.getStats(name);
    }
    return result;
  }
}

export const performanceMonitor = new PerformanceMonitor();

export function measureRender(componentName: string) {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      if (duration > 16) {
      }
    };
  }
  
  return () => {};
}

export const DEBOUNCE_CONFIGS = {
  SEARCH: 300,
  FILTER: 300,
  SORT: 100,
  RESIZE: 200,
  SCROLL: 100,
  INPUT: 150,
} as const;

export function createDebounceCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      callback(...args);
    }, delay);
  }) as T;
}

export const WEB_VITALS_CONFIG = {
  LCP: { good: 2500, needsImprovement: 4000 },
  FID: { good: 100, needsImprovement: 300 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  TTFB: { good: 800, needsImprovement: 1800 },
  INP: { good: 200, needsImprovement: 500 },
} as const;

export function getWebVitalStatus(
  metric: keyof typeof WEB_VITALS_CONFIG,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = WEB_VITALS_CONFIG[metric];
  
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}
