// User-editable architecture diagram configuration.
//
// External dependencies are matched by displayed package/module name, such as
// "tslog", "commander", or "fs". Project file exclusions can be exact file
// names, exact paths relative to the package root, or glob patterns relative
// to the package root, such as "src/**/*.test.ts".
//
// Folder diagrams are opt in per package. Paths are relative to the package root,
// such as "src/application". Folder exclusions inherit the containing package
// exclusions unless overridden on that folder diagram.
//
// Diagram layouts are saved automatically by the architecture viewer as checked-in
// *.layout.json files next to each generated diagram artifact.
module.exports = {
  exclusions: {
    externalDependencies: [
      'module',
      'path',
      'reflect-metadata',
      'ts',
      'tslog',
      'tsyringe',
      'url',
    ],
    projectFiles: {
      allPackages: [],
      packages: {
        'spec-n-roll-api': ['src/index.ts'],
        'spec-n-roll-runtime': ['src/index.ts'],
        'spec-n-roll-sdk': ['src/index.ts'],
      },
    },
  },
  folderDiagrams: {
    packages: {},
  },
};
