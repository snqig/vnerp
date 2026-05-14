import { EventRegistry } from './EventRegistry';

let initialized = false;

export function initializeApplication(): void {
  if (initialized) {
    return;
  }

  try {
    EventRegistry.initialize();
    initialized = true;
  } catch (error) {
    console.error('Failed to initialize application:', error);
  }
}

export function getInitializationStatus(): boolean {
  return initialized;
}
