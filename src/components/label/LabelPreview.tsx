'use client';

import { useMemo } from 'react';

interface LabelPreviewProps {
  htmlTemplate: string;
  data: Record<string, string | number>;
  widthMm?: number;
  heightMm?: number;
}

function fillTemplate(template: string, data: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key) => {
    const val = data[key];
    return val !== undefined ? String(val) : `{${key}}`;
  });
}

export function LabelPreview({ htmlTemplate, data, widthMm = 60, heightMm = 40 }: LabelPreviewProps) {
  const html = useMemo(() => fillTemplate(htmlTemplate, data), [htmlTemplate, data]);

  return (
    <div
      className="border rounded bg-white overflow-hidden"
      style={{ width: `${widthMm * 2}px`, minHeight: `${heightMm * 2}px` }}
    >
      <div
        className="label-preview-content"
        style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
