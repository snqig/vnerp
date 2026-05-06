import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:5000';

  try {
    const response = await fetch(`${baseURL}/api/auth/reset-lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin' }),
    });
    const result = await response.json();
    console.log(`[GlobalSetup] Admin lock reset: ${result.message}`);
  } catch (e) {
    console.warn('[GlobalSetup] Failed to reset admin lock (server may not be ready yet):', e);
  }
}

export default globalSetup;
