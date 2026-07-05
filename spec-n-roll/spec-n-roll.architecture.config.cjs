// User-editable architecture diagram configuration.
//
// External dependencies are matched by displayed package/module name, such as
// "tslog", "commander", or "fs". Project file exclusions can be exact file
// names, exact paths relative to the package root, or glob patterns relative
// to the package root, such as "src/**/*.test.ts".
module.exports = {
  exclusions: {
    externalDependencies: [
      'module',
      'path',
      'reflect-metadata',
      'tslog',
      'tsyringe',
      'url',
    ],
    projectFiles: {
      allPackages: [],
      packages: {
        "spec-n-roll-api": ["src/index.ts"],
        "spec-n-roll-runtime": ["src/index.ts"],
        "spec-n-roll-sdk": ["src/index.ts"],
      },
    },
  },
};
