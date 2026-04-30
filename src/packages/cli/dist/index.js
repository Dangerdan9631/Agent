#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var import_commander4 = require("commander");
var import_chalk6 = __toESM(require("chalk"));

// src/commands/generate.ts
var import_chalk2 = __toESM(require("chalk"));
var import_agentconfig = require("agentconfig");

// src/helpers.ts
var import_chalk = __toESM(require("chalk"));
function die(msg, code = 1) {
  console.error(import_chalk.default.red("error:"), msg);
  process.exit(code);
}
function info(verbose, msg) {
  if (verbose) console.log(import_chalk.default.gray(msg));
}
function printValidation(results, format, strict) {
  if (format === "json") {
    console.log(JSON.stringify(results, null, 2));
    return;
  }
  const errors = results.filter((r) => r.level === "error");
  const warnings = results.filter((r) => r.level === "warning");
  const infos = results.filter((r) => r.level === "info");
  for (const r of errors) {
    console.error(import_chalk.default.red(`[error] ${r.message}`) + (r.file ? import_chalk.default.gray(` (${r.file})`) : ""));
  }
  for (const r of warnings) {
    console.warn(import_chalk.default.yellow(`[warn]  ${r.message}`) + (r.file ? import_chalk.default.gray(` (${r.file})`) : ""));
  }
  for (const r of infos) {
    console.info(import_chalk.default.cyan(`[info]  ${r.message}`) + (r.file ? import_chalk.default.gray(` (${r.file})`) : ""));
  }
  if (errors.length > 0) {
    console.error(import_chalk.default.red(`
${errors.length} error(s) found.`));
  } else if (strict && warnings.length > 0) {
    console.error(import_chalk.default.yellow(`
${warnings.length} warning(s) found (--strict).`));
  } else if (results.length === 0) {
    console.log(import_chalk.default.green("No issues found."));
  }
}
function printDiff(diff, format) {
  if (format === "json") {
    console.log(JSON.stringify(diff, null, 2));
    return;
  }
  for (const entry of diff) {
    const label = entry.action === "create" ? import_chalk.default.green("+ " + entry.path) : entry.action === "update" ? import_chalk.default.yellow("~ " + entry.path) : import_chalk.default.gray("  " + entry.path);
    console.log(label);
    if (entry.diff) {
      const lines = entry.diff.split("\n");
      for (const line of lines) {
        if (line.startsWith("+")) console.log(import_chalk.default.green(line));
        else if (line.startsWith("-")) console.log(import_chalk.default.red(line));
        else console.log(import_chalk.default.gray(line));
      }
    }
  }
  if (diff.length === 0) {
    console.log(import_chalk.default.green("No changes."));
  }
}

// src/commands/generate.ts
function registerGenerate(program2) {
  program2.command("generate").alias("gen").description("Parse .agentconfig/ and write agent-native directive files.").option("--config <path>", "Path to .agentconfig/ directory (default: auto-detect)").option("--project-root <path>", "Override project root directory (replaces --out)").option("--out <path>", "Override output_dir from config (deprecated, use --project-root)").option("--target <name>", "Generate for specific target(s)", (val, prev) => [...prev || [], val]).option("-v, --verbose", "Verbose output", false).option("--no-overwrite", "Skip files that already exist on disk").option("--watch", "Watch .agentconfig/ for changes and re-generate", false).action(async (cmdOpts, cmd) => {
    const opts = cmd.opts();
    async function doGenerate() {
      const result = await (0, import_agentconfig.runGenerate)({
        configPath: opts.config,
        projectRootOverride: opts.projectRoot || opts.out,
        targets: opts.target,
        overwrite: opts.overwrite
      });
      if (result.validationErrors.length > 0) {
        for (const e of result.validationErrors) console.error(import_chalk2.default.red(`[error] ${e.message}`));
        throw new Error("Validation errors found. Fix them before generating.");
      }
      info(opts.verbose, `Using config dir: ${result.configDir}`);
      info(opts.verbose, `Targets: ${result.targets.join(", ")}`);
      console.log(import_chalk2.default.green(`Generated ${result.fileCount} file(s) \u2192 ${result.outputDir}`));
      return result.configDir;
    }
    const configDir = await doGenerate().catch(
      (err) => die(err instanceof Error ? err.message : String(err))
    );
    if (opts.watch) {
      const { default: chokidar } = await import("chokidar");
      console.log(import_chalk2.default.cyan(`
Watching ${configDir} for changes...`));
      const watcher = chokidar.watch(configDir, { ignoreInitial: true });
      let busy = false;
      const onChange = async (p) => {
        if (busy) return;
        busy = true;
        info(opts.verbose, `Change detected: ${p}`);
        try {
          await doGenerate();
        } catch (err) {
          console.error(import_chalk2.default.red("Generate error:"), err);
        } finally {
          busy = false;
        }
      };
      watcher.on("add", onChange).on("change", onChange).on("unlink", onChange);
    }
  });
}

// src/commands/validate.ts
var import_commander = require("commander");
var import_agentconfig2 = require("agentconfig");
function registerValidate(program2) {
  program2.command("validate").description("Validate .agentconfig/ without generating files.").option("--config <path>", "Path to .agentconfig/ directory (default: auto-detect)").addOption(new import_commander.Option("--format <format>", "Output format").choices(["text", "json"]).default("text")).option("--strict", "Treat warnings as errors", false).action(async (_cmdOpts, cmd) => {
    const opts = cmd.opts();
    const results = await (0, import_agentconfig2.runValidate)({ configPath: opts.config });
    printValidation(results, opts.format, opts.strict);
    const errors = results.filter((r) => r.level === "error");
    const warnings = results.filter((r) => r.level === "warning");
    if (errors.length > 0 || opts.strict && warnings.length > 0) {
      process.exit(1);
    }
  });
}

// src/commands/diff.ts
var import_commander2 = require("commander");
var import_agentconfig3 = require("agentconfig");
function registerDiff(program2) {
  program2.command("diff").description("Show diff between .agentconfig/ source and current on-disk generated files.").option("--config <path>", "Path to .agentconfig/ directory (default: auto-detect)").option("--project-root <path>", "The path to the project root where the generated files are output. Defaults to current directory ('.')").option("--target <name>", "Generate for specific target(s)", (val, prev) => [...prev || [], val]).addOption(new import_commander2.Option("--format <format>", "Output format").choices(["text", "json"]).default("text")).action(async (_cmdOpts, cmd) => {
    const opts = cmd.opts();
    const { diff } = await (0, import_agentconfig3.runDiff)({
      configPath: opts.config,
      projectRootOverride: opts.projectRoot,
      targets: opts.target
    });
    printDiff(diff, opts.format);
    if (diff.length > 0) process.exit(1);
  });
}

// src/commands/initialize.ts
var import_chalk3 = __toESM(require("chalk"));
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
var import_agentconfig4 = require("agentconfig");
function registerInitialize(program2) {
  program2.command("initialize [source-dir]").alias("init").description("Create a .agentconfig/ directory by importing from existing agent-native files.").option("-v, --verbose", "Verbose output", false).option("--from <agent>", "Import only from a specific agent", (v, p) => [...p, v], []).option("--overwrite", "Overwrite existing .agentconfig/ files", false).option("--dry-run", "Preview what would be written", false).action(async (sourceArg, cmdOpts, cmd) => {
    const opts = cmd.opts();
    const sourceDir = sourceArg ? path.resolve(sourceArg) : process.cwd();
    if (!fs.existsSync(sourceDir)) die(`Source directory not found: ${sourceDir}`);
    const result = await (0, import_agentconfig4.runInitialize)({
      sourceDir,
      from: opts.from,
      overwrite: opts.overwrite,
      dryRun: opts.dryRun
    }).catch((err) => die(err instanceof Error ? err.message : String(err)));
    if (result.detectedAgents.length === 0) {
      console.log(import_chalk3.default.yellow("No agent-native files detected in " + sourceDir));
      process.exit(0);
    }
    info(
      opts.verbose,
      "Detected agents: " + result.detectedAgents.map((a) => `${a.name} (${a.confidence})`).join(", ")
    );
    const summary = `Initialized ${result.instructionCount} instruction(s), ${result.agentCount} agent(s)`;
    if (opts.dryRun) {
      console.log(import_chalk3.default.cyan(`(dry run) ${summary} \u2192 ${result.configDir}`));
    } else {
      console.log(import_chalk3.default.green(`${summary} \u2192 ${result.configDir}`));
    }
  });
}

// src/commands/import.ts
var import_chalk4 = __toESM(require("chalk"));
var path2 = __toESM(require("path"));
var fs2 = __toESM(require("fs"));
var import_agentconfig5 = require("agentconfig");
function registerImport(program2) {
  program2.command("import <source-dir>").description("Import instructions from another .agentconfig/ directory into this project.").option("--dest <path>", "Destination directory (default: auto-detect from CWD)").option("--overwrite", "Overwrite existing instruction files", false).option("--dry-run", "Preview what would be written", false).action(async (sourceArg, cmdOpts, cmd) => {
    const opts = cmd.opts();
    const sourceDir = path2.resolve(sourceArg);
    if (!fs2.existsSync(sourceDir)) die(`Source directory not found: ${sourceDir}`);
    const result = await (0, import_agentconfig5.runImport)({
      sourceDir,
      destDir: opts.dest,
      overwrite: opts.overwrite,
      dryRun: opts.dryRun
    }).catch((err) => die(err instanceof Error ? err.message : String(err)));
    const summary = `Imported ${result.instructionCount} instruction(s), ${result.agentCount} agent(s)`;
    if (opts.dryRun) {
      console.log(import_chalk4.default.cyan(`(dry run) ${summary} \u2192 ${result.destConfigDir}`));
    } else {
      console.log(import_chalk4.default.green(`${summary} \u2192 ${result.destConfigDir}`));
    }
  });
}

// src/commands/list-targets.ts
var import_commander3 = require("commander");
var import_chalk5 = __toESM(require("chalk"));
var import_agentconfig6 = require("agentconfig");
function registerListTargets(program2) {
  program2.command("list-targets").description("List all registered generator targets.").addOption(new import_commander3.Option("--format <format>", "Output format").choices(["text", "json"]).default("text")).action(async (_cmdOpts, cmd) => {
    const opts = cmd.opts();
    const targets = await (0, import_agentconfig6.listTargets)();
    if (opts.format === "json") {
      console.log(JSON.stringify(targets, null, 2));
      return;
    }
    for (const t of targets) {
      console.log(`  ${import_chalk5.default.cyan(t.target.padEnd(20))} ${t.displayName}`);
    }
  });
}

// src/index.ts
import_commander4.program.name("agentconfig").description("Manage AI coding agent directive files from a single .agentconfig/ source of truth.").version("0.1.0");
registerGenerate(import_commander4.program);
registerValidate(import_commander4.program);
registerDiff(import_commander4.program);
registerInitialize(import_commander4.program);
registerImport(import_commander4.program);
registerListTargets(import_commander4.program);
import_commander4.program.parseAsync(process.argv).catch((err) => {
  console.error(import_chalk6.default.red("fatal:"), err instanceof Error ? err.message : err);
  process.exit(1);
});
