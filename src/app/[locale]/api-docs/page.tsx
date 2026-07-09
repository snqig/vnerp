'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Swagger UI 依赖浏览器 API，必须 ssr: false
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => <p style={{ padding: 24 }}>Loading API Docs...</p>,
});

import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<unknown>(null);

  useEffect(() => {
    fetch('/api/openapi.json')
      .then((res) => res.json())
      .then((data) => setSpec(data))
      .catch((err) => console.error('Failed to load OpenAPI spec:', err));
  }, []);

  if (!spec) {
    return (
      <div style={{ padding: 24 }}>
        <h1>API Documentation</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff' }}>
      <SwaggerUI spec={spec} docExpansion="list" filter={true} />
    </div>
  );
}
