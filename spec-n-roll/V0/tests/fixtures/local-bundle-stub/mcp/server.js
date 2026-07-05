#!/usr/bin/env node
/**
 * Minimal MCP bundle stub that stays alive briefly so spawn smoke tests can observe a running process.
 */
process.stdin.resume();
setTimeout(() => {
  process.exit(0);
}, 100);
