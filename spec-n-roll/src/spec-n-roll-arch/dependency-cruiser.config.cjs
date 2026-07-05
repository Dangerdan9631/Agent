/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'no-arch-or-test-runtime-dependency',
      severity: 'error',
      from: {
        path: '^src/spec-n-roll-(api|sdk|runtime|mcp|$)/src',
      },
      to: {
        path: '^src/spec-n-roll-(arch|test)/src',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      extensions: ['.ts', '.js'],
    },
  },
};
