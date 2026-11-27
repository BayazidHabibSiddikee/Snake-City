#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

console.log('🚀 Starting Serpent Peaks Express Production Server (server/index.js)...');
import('../server.ts').catch((err) => {
  console.error('❌ Failed to start Express server:', err);
  process.exit(1);
});
