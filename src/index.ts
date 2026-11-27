import { initAppBootstrap } from './app/bootstrap';

/**
 * Snake City modular entry point (`src/index.ts`).
 * Delegates initialization and dynamic routing to `src/app/bootstrap.ts`,
 * ensuring zero eager initialization of heavy subsystems.
 */
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('root') || document.body;
  initAppBootstrap(root);
});
