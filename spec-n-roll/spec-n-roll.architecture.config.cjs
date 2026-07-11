// User-editable architecture diagram configuration.
//
// External dependencies are matched by displayed package/module name, such as
// "tslog", "commander", or "fs". Collapsed dependencies render as one node;
// landscape exclusions are omitted from the landscape diagram. Project node
// exclusions are exact node names or node-name globs, such as
// "composition/**/*.test". Node names are relative to the package source root
// and omit the file extension.
//
// Folder diagrams are opt in per package. Paths are relative to the package root,
// such as "src/application". Folder collapse and exclusion settings inherit the
// workspace settings unless overridden on that folder diagram.
//
// Diagram layouts are saved automatically by the architecture viewer as checked-in
// *.layout.json files next to each generated diagram artifact.
module.exports = {
  "collapsed": {
    "externalDependencies": [
      "chalk",
      "commander",
      "fs",
      "module",
      "path",
      "reflect-metadata",
      "ts",
      "tslog",
      "tsyringe",
      "url"
    ]
  },
  "exclusions": {
    "landscape": [
      "reflect-metadata",
      "module",
      "path",
      "tslog",
      "tsyringe",
      "url"
    ],
    "projectFiles": {
      "allPackages": [
        "reflect-metadata",
        "module",
        "path",
        "tslog",
        "tsyringe",
        "url"
      ],
      "packages": {
        "spec-n-roll-api": [
          "index"
        ],
        "spec-n-roll-runtime": [
          "index"
        ],
        "spec-n-roll-sdk": [
          "index"
        ],
        "spec-n-roll": [
          "composition/dispatcher/dispatcher-container-factory",
          "composition/dispatcher/dispatcher-injection-tokens"
        ]
      }
    }
  },
  "folderDiagrams": {
    "packages": { }
  }
};
