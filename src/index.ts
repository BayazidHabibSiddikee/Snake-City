import { initAppBootstrap } from './app/bootstrap';

/**
 * Snake City modular entry point (`src/index.ts`).
 * Delegates initialization and dynamic routing to `src/app/bootstrap.ts`,
 * ensuring zero eager initialization of heavy subsystems.
 */
function bootApp(): void {
  const root = document.getElementById('root') || document.body;
  initAppBootstrap(root);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp, { once: true });
} else {
  bootApp();
}
