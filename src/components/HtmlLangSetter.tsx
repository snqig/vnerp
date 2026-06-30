'use client';

import { useEffect } from 'react';

export function HtmlLangSetter({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
