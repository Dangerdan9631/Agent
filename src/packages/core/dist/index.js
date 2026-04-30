"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  BUILT_IN_TARGETS: () => BUILT_IN_TARGETS,
  GeneratorRegistry: () => PluginRegistry,
  PluginRegistry: () => PluginRegistry,
  clearHashCache: () => clearHashCache,
  computeDiff: () => computeDiff,
  deduplicateOutputs: () => deduplicateOutputs,
  detectAgents: () => detectAgents,
  ensureGlobalConfig: () => ensureGlobalConfig,
  findConfigDir: () => findConfigDir,
  generate: () => generate,
  getGlobalConfigDir: () => getGlobalConfigDir,
  getGlobalConfigPath: () => getGlobalConfigPath,
  importArtifacts: () => importArtifacts,
  listTargets: () => listTargets,
  loadConfig: () => loadConfig,
  loadGlobalConfig: () => loadGlobalConfig,
  loadGlobalPlugins: () => loadGlobalPlugins,
  parseArtifacts: () => parseArtifacts,
  registry: () => registry,
  resolveConfigDir: () => resolveConfigDir,
  runDiff: () => runDiff,
  runGenerate: () => runGenerate,
  runImport: () => runImport,
  runInitialize: () => runInitialize,
  runValidate: () => runValidate,
  validate: () => validate,
  write: () => write,
  writeAgentConfigDir: () => writeAgentConfigDir
});
module.exports = __toCommonJS(index_exports);

// src/registry.ts
var PluginRegistry = class {
  generators = /* @__PURE__ */ new Map();
  importers = /* @__PURE__ */ new Map();
  detectors = [];
  directiveTypes = /* @__PURE__ */ new Map();
  // ── Generator methods (primary, unchanged interface) ─────────────────────
  /** Register a generator. Overwrites any existing entry for the same target. */
  register(generator) {
    this.generators.set(generator.target, generator);
  }
  /** Look up a generator by target ID. Returns `undefined` if not registered. */
  get(target) {
    return this.generators.get(target);
  }
  /** Return all registered generators in insertion order. */
  list() {
    return Array.from(this.generators.values());
  }
  // ── Importer methods ──────────────────────────────────────────────────────
  /** Register an importer function for a target. Overwrites existing entry. */
  registerImporter(target, fn) {
    this.importers.set(target, fn);
  }
  /** Look up an importer by target ID. Returns `undefined` if not registered. */
  getImporter(target) {
    return this.importers.get(target);
  }
  /** Return all registered importer entries as an array of `[target, fn]` pairs. */
  listImporters() {
    return Array.from(this.importers.entries());
  }
  // ── Detector methods ──────────────────────────────────────────────────────
  /** Register a detector function that probes a directory for an agent's presence. */
  registerDetector(fn) {
    this.detectors.push(fn);
  }
  /** Return all registered detector functions. */
  listDetectors() {
    return [...this.detectors];
  }
  // ── Directive type methods ────────────────────────────────────────────────
  /** Register a directive type plugin. Overwrites existing entry for the same typeId. */
  registerDirectiveType(plugin) {
    this.directiveTypes.set(plugin.typeId, plugin);
  }
  /** Look up a directive type plugin by typeId. */
  getDirectiveType(typeId) {
    return this.directiveTypes.get(typeId);
  }
  /** Return all registered directive type plugins in insertion order. */
  listDirectiveTypes() {
    return Array.from(this.directiveTypes.values());
  }
  // ── Dynamic plugin loading ────────────────────────────────────────────────
  /**
   * Dynamically load a plugin module by its Node module identifier and
   * register whatever it exports. Supports:
   * - `AgentTargetPlugin` (`{ target, generate, importSource }`)
   * - `DirectiveTypePlugin` (`{ typeId, parse }`)
   * - Legacy `AgentGenerator` (`{ target, generate }`) — backward compatible
   * - An array of any of the above
   */
  async loadPlugin(moduleId) {
    const mod = await import(moduleId);
    const exported = mod.default ?? mod;
    if (Array.isArray(exported)) {
      for (const item of exported) {
        this._registerOne(item, moduleId);
      }
    } else {
      this._registerOne(exported, moduleId);
    }
  }
  _registerOne(plugin, moduleId) {
    if (typeof plugin !== "object" || plugin === null) {
      throw new Error(`Plugin "${moduleId}" does not export a valid plugin object.`);
    }
    const p = plugin;
    if (typeof p["typeId"] === "string" && typeof p["parse"] === "function") {
      this.registerDirectiveType(plugin);
      return;
    }
    if (typeof p["target"] === "string" && typeof p["generate"] === "function" && typeof p["importSource"] === "function") {
      const agentPlugin = plugin;
      this.register(agentPlugin);
      this.registerImporter(agentPlugin.target, (dir) => agentPlugin.importSource(dir));
      if (typeof agentPlugin.detect === "function") {
        const detect = agentPlugin.detect.bind(agentPlugin);
        this.registerDetector((dir) => {
          const result = detect(dir);
          return result ? [{ name: agentPlugin.target, confidence: result.confidence }] : [];
        });
      }
      return;
    }
    if (typeof p["target"] === "string" && typeof p["generate"] === "function") {
      this.register(plugin);
      return;
    }
    throw new Error(
      `Plugin "${moduleId}" does not export a valid plugin. Expected AgentTargetPlugin ({ target, generate, importSource }), DirectiveTypePlugin ({ typeId, parse }), or AgentGenerator ({ target, generate }).`
    );
  }
};
var registry = new PluginRegistry();

// src/generators/base.ts
function filterForTarget(items, target) {
  return items.filter((item) => {
    if (item.targets && item.targets.length > 0 && !item.targets.includes(target)) return false;
    if (item.excludedTargets && item.excludedTargets.includes(target)) return false;
    return true;
  });
}
function buildFrontmatter(fields) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(fields)) {
    if (value === void 0 || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${JSON.stringify(String(item))}`);
        }
      }
    } else if (typeof value === "boolean") {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === "number") {
      lines.push(`${key}: ${value}`);
    } else {
      const str = String(value);
      const needsQuoting = /[:#\[\]{}&*!|>'"@`]/.test(str) || str.includes("\n") || str.startsWith(" ") || str.endsWith(" ") || str === "" || str === "true" || str === "false" || str === "null";
      lines.push(`${key}: ${needsQuoting ? JSON.stringify(str) : str}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}
function buildInTextCondition(description, body) {
  return `> **Apply only when:** ${description}

${body}`;
}
var HOOK_EVENT_MAPS = {
  cursor: {
    SessionStart: "sessionStart",
    SessionEnd: "sessionEnd",
    PreToolUse: "preToolUse",
    PostToolUse: "postToolUse",
    SubagentStart: "subagentStart",
    SubagentStop: "subagentStop",
    PreCompact: "preCompact",
    UserPromptSubmit: "beforeSubmitPrompt"
  },
  "claude-code": {
    SessionStart: "SessionStart",
    SessionEnd: "SessionEnd",
    PreToolUse: "PreToolUse",
    PostToolUse: "PostToolUse",
    SubagentStart: "SubagentStart",
    SubagentStop: "SubagentStop",
    PreCompact: "PreCompact",
    UserPromptSubmit: "UserPromptSubmit",
    PermissionRequest: "PermissionRequest"
  },
  "gemini-cli": {
    SessionStart: "SessionStart",
    SessionEnd: "SessionEnd",
    PreToolUse: "BeforeTool",
    PostToolUse: "AfterTool",
    SubagentStart: "BeforeAgent",
    SubagentStop: "AfterAgent",
    PreCompact: "PreCompress"
  },
  codex: {
    SessionStart: "SessionStart",
    SessionEnd: "Stop",
    PreToolUse: "PreToolUse",
    PostToolUse: "PostToolUse",
    UserPromptSubmit: "UserPromptSubmit",
    PermissionRequest: "PermissionRequest"
  },
  cline: {
    SessionStart: "TaskStart",
    SessionEnd: "TaskComplete",
    PreToolUse: "PreToolUse",
    PostToolUse: "PostToolUse",
    PreCompact: "PreCompact",
    UserPromptSubmit: "UserPromptSubmit"
  }
};

// src/generators/copilot.ts
var CopilotGeneratorImpl = class {
  target = "copilot";
  displayName = "GitHub Copilot";
  generate({ ir, target }) {
    const outputs = [];
    const instructions = filterForTarget(ir.instructions, target);
    const always = instructions.filter((i) => i.activation === "always");
    if (always.length > 0) {
      outputs.push({
        path: ".github/copilot-instructions.md",
        content: always.map((i) => i.body).join("\n\n")
      });
    }
    for (const inst of instructions.filter((i) => i.activation === "scoped")) {
      const applyTo = (inst.globs ?? ["**/*"]).join(", ");
      const fm = buildFrontmatter({ applyTo });
      outputs.push({
        path: `.github/instructions/${inst.slug}.instructions.md`,
        content: `${fm}

${inst.body}`
      });
    }
    for (const inst of instructions.filter((i) => i.activation === "ai-decided")) {
      const fm = buildFrontmatter({ applyTo: "**/*" });
      const body = inst.description ? buildInTextCondition(inst.description, inst.body) : inst.body;
      outputs.push({
        path: `.github/instructions/${inst.slug}.instructions.md`,
        content: `${fm}

${body}`
      });
    }
    for (const inst of instructions.filter((i) => i.activation === "manual")) {
      outputs.push({
        path: `.github/prompts/${inst.slug}.prompt.md`,
        content: inst.body
      });
    }
    for (const cmd of filterForTarget(ir.commands, target)) {
      outputs.push({
        path: `.github/prompts/${cmd.slug}.prompt.md`,
        content: cmd.body
      });
    }
    for (const skill of ir.skills) {
      for (const file of skill.files) {
        outputs.push({
          path: `.agents/skills/${skill.name}/${file.relativePath}`,
          content: file.content
        });
      }
    }
    return outputs;
  }
};
var CopilotGenerator = new CopilotGeneratorImpl();

// src/generators/copilot-cli.ts
var CopilotCLIGeneratorImpl = class {
  target = "copilot-cli";
  displayName = "GitHub Copilot CLI";
  generate({ ir, target }) {
    const outputs = [];
    const instructions = filterForTarget(ir.instructions, target);
    const always = instructions.filter((i) => i.activation === "always");
    if (always.length > 0) {
      outputs.push({
        path: ".github/copilot-instructions.md",
        content: always.map((i) => i.body).join("\n\n")
      });
    }
    for (const inst of instructions.filter((i) => i.activation === "scoped")) {
      const applyTo = (inst.globs ?? ["**/*"]).join(", ");
      const fm = buildFrontmatter({ applyTo });
      outputs.push({
        path: `.github/instructions/${inst.slug}.instructions.md`,
        content: `${fm}

${inst.body}`
      });
    }
    for (const inst of instructions.filter((i) => i.activation === "ai-decided")) {
      const fm = buildFrontmatter({ applyTo: "**/*" });
      const body = inst.description ? buildInTextCondition(inst.description, inst.body) : inst.body;
      outputs.push({
        path: `.github/instructions/${inst.slug}.instructions.md`,
        content: `${fm}

${body}`
      });
    }
    for (const inst of instructions.filter((i) => i.activation === "manual")) {
      outputs.push({
        path: `.github/prompts/${inst.slug}.prompt.md`,
        content: inst.body
      });
    }
    for (const cmd of filterForTarget(ir.commands, target)) {
      outputs.push({
        path: `.github/prompts/${cmd.slug}.prompt.md`,
        content: cmd.body
      });
    }
    for (const skill of ir.skills) {
      for (const file of skill.files) {
        outputs.push({
          path: `.agents/skills/${skill.name}/${file.relativePath}`,
          content: file.content
        });
      }
    }
    return outputs;
  }
};
var CopilotCLIGenerator = new CopilotCLIGeneratorImpl();

// src/generators/cursor.ts
var CursorGeneratorImpl = class {
  constructor(target, displayName) {
    this.target = target;
    this.displayName = displayName;
  }
  target;
  displayName;
  generate({ ir, target }) {
    const outputs = [];
    const hookMap = HOOK_EVENT_MAPS[target] ?? HOOK_EVENT_MAPS["cursor"];
    const instructions = filterForTarget(ir.instructions, target);
    for (const inst of instructions) {
      let content;
      switch (inst.activation) {
        case "always": {
          const fm = buildFrontmatter({ alwaysApply: true });
          content = `${fm}

${inst.body}`;
          break;
        }
        case "scoped": {
          const fm = buildFrontmatter({
            globs: (inst.globs ?? []).join(", "),
            alwaysApply: false
          });
          content = `${fm}

${inst.body}`;
          break;
        }
        case "ai-decided": {
          const fm = buildFrontmatter({
            description: inst.description ?? "",
            alwaysApply: false
          });
          content = `${fm}

${inst.body}`;
          break;
        }
        case "manual":
        default:
          content = inst.body;
          break;
      }
      outputs.push({ path: `.cursor/rules/${inst.slug}.mdc`, content });
    }
    for (const cmd of filterForTarget(ir.commands, target)) {
      const skillMd = `---
name: ${cmd.slug}
disable-model-invocation: true
---

${cmd.body}`;
      outputs.push({ path: `.cursor/skills/${cmd.slug}/SKILL.md`, content: skillMd });
    }
    for (const skill of ir.skills) {
      for (const file of skill.files) {
        outputs.push({
          path: `.agents/skills/${skill.name}/${file.relativePath}`,
          content: file.content
        });
      }
    }
    const hooks = filterForTarget(ir.hooks, target);
    if (hooks.length > 0) {
      const hooksObj = {};
      for (const hook of hooks) {
        const eventName = hookMap[hook.event];
        if (!eventName) continue;
        if (!hooksObj[eventName]) hooksObj[eventName] = [];
        const entry = { command: hook.command };
        if (hook.matcher) entry.matcher = hook.matcher;
        if (hook.timeout !== void 0) entry.timeout = hook.timeout;
        if (hook.blocking !== void 0) entry.failClosed = hook.blocking;
        hooksObj[eventName].push(entry);
      }
      outputs.push({
        path: ".cursor/hooks.json",
        content: JSON.stringify({ version: 1, hooks: hooksObj }, null, 2)
      });
    }
    return outputs;
  }
};
var CursorGenerator = new CursorGeneratorImpl("cursor", "Cursor");

// src/generators/claude-code.ts
function buildNestedHooksObject(hooks, hookMap) {
  const result = {};
  for (const hook of hooks) {
    const eventName = hookMap[hook.event];
    if (!eventName) continue;
    if (!result[eventName]) result[eventName] = [];
    const hookEntry = { type: hook.type };
    if (hook.command) hookEntry.command = hook.command;
    if (hook.timeout !== void 0) hookEntry.timeout = hook.timeout;
    if (hook.async !== void 0) hookEntry.async = hook.async;
    const entry = { hooks: [hookEntry] };
    if (hook.matcher) entry.matcher = hook.matcher;
    result[eventName].push(entry);
  }
  return result;
}
var ClaudeCodeGenerator = {
  target: "claude-code",
  displayName: "Claude Code",
  generate({ ir, target }) {
    const outputs = [];
    const hookMap = HOOK_EVENT_MAPS["claude-code"];
    const instructions = filterForTarget(ir.instructions, target);
    const always = instructions.filter((i) => i.activation === "always");
    if (always.length > 0) {
      outputs.push({
        path: ".claude/CLAUDE.md",
        content: always.map((i) => i.body).join("\n\n")
      });
    }
    for (const inst of instructions.filter((i) => i.activation === "scoped")) {
      const fm = buildFrontmatter({ paths: inst.globs ?? [] });
      outputs.push({
        path: `.claude/rules/${inst.slug}.md`,
        content: `${fm}

${inst.body}`
      });
    }
    for (const inst of instructions.filter((i) => i.activation === "ai-decided")) {
      const body = inst.description ? buildInTextCondition(inst.description, inst.body) : inst.body;
      outputs.push({ path: `.claude/rules/${inst.slug}.md`, content: body });
    }
    for (const inst of instructions.filter((i) => i.activation === "manual")) {
      const fm = buildFrontmatter({ paths: [] });
      outputs.push({
        path: `.claude/rules/${inst.slug}.md`,
        content: `${fm}

${inst.body}`
      });
    }
    for (const cmd of filterForTarget(ir.commands, target)) {
      outputs.push({
        path: `.claude/agents/${cmd.slug}.md`,
        content: `---
name: ${cmd.slug}
---

${cmd.body}`
      });
    }
    for (const agent of filterForTarget(ir.agents, target)) {
      const fmFields = { name: agent.name };
      if (agent.description) fmFields.description = agent.description;
      if (agent.model) fmFields.model = agent.model;
      if (agent.tools && agent.tools.length > 0) fmFields.tools = agent.tools;
      if (agent.isolation) fmFields.isolation = agent.isolation;
      const fm = buildFrontmatter(fmFields);
      outputs.push({
        path: `.claude/agents/${agent.name}.md`,
        content: `${fm}

${agent.body}`
      });
    }
    for (const skill of ir.skills) {
      for (const file of skill.files) {
        outputs.push({
          path: `.agents/skills/${skill.name}/${file.relativePath}`,
          content: file.content
        });
      }
    }
    const hooks = filterForTarget(ir.hooks, target);
    if (hooks.length > 0) {
      const hooksObj = buildNestedHooksObject(hooks, hookMap);
      outputs.push({
        path: ".claude/settings.json",
        content: JSON.stringify({ hooks: hooksObj }, null, 2)
      });
    }
    return outputs;
  }
};

// src/generators/gemini-cli.ts
function buildGeminiHooksObject(hooks, hookMap) {
  const result = {};
  for (const hook of hooks) {
    const eventName = hookMap[hook.event];
    if (!eventName) continue;
    if (!result[eventName]) result[eventName] = [];
    const hookEntry = {
      type: hook.type,
      command: hook.command
    };
    if (hook.timeout !== void 0) hookEntry.timeout = hook.timeout * 1e3;
    if (hook.matcher) hookEntry.matcher = hook.matcher;
    result[eventName].push({ hooks: [hookEntry] });
  }
  return result;
}
var GeminiCliGenerator = {
  target: "gemini-cli",
  displayName: "Gemini CLI",
  generate({ ir, target }) {
    const outputs = [];
    const hookMap = HOOK_EVENT_MAPS["gemini-cli"];
    const instructions = filterForTarget(ir.instructions, target);
    const always = instructions.filter((i) => i.activation === "always");
    const aiDecided = instructions.filter((i) => i.activation === "ai-decided");
    const geminiParts = [
      ...always.map((i) => i.body),
      ...aiDecided.map(
        (i) => i.description ? buildInTextCondition(i.description, i.body) : i.body
      )
    ];
    if (geminiParts.length > 0) {
      outputs.push({ path: "GEMINI.md", content: geminiParts.join("\n\n") });
    }
    for (const inst of instructions.filter((i) => i.activation === "manual")) {
      outputs.push({
        path: `.gemini/instructions/${inst.slug}.md`,
        content: inst.body
      });
    }
    for (const cmd of filterForTarget(ir.commands, target)) {
      const skillMd = `---
name: ${cmd.slug}
disable-model-invocation: true
---

${cmd.body}`;
      outputs.push({ path: `.gemini/skills/${cmd.slug}/SKILL.md`, content: skillMd });
    }
    for (const skill of ir.skills) {
      for (const file of skill.files) {
        outputs.push({
          path: `.gemini/skills/${skill.name}/${file.relativePath}`,
          content: file.content
        });
      }
    }
    const hooks = filterForTarget(ir.hooks, target);
    if (hooks.length > 0) {
      const hooksObj = buildGeminiHooksObject(hooks, hookMap);
      outputs.push({
        path: ".gemini/settings.json",
        content: JSON.stringify({ hooks: hooksObj }, null, 2)
      });
    }
    return outputs;
  }
};

// src/generators/antigravity.ts
var AntigravityGenerator = {
  target: "antigravity",
  displayName: "Google Antigravity",
  generate({ ir, target }) {
    const outputs = [];
    const instructions = filterForTarget(ir.instructions, target);
    for (const inst of instructions) {
      let fmFields;
      switch (inst.activation) {
        case "always":
          fmFields = { activation: "always" };
          break;
        case "scoped":
          fmFields = { activation: "glob", glob: inst.globs?.[0] ?? "**/*" };
          break;
        case "ai-decided":
          fmFields = { activation: "model", description: inst.description ?? "" };
          break;
        case "manual":
          fmFields = { activation: "manual" };
          break;
      }
      const fm = buildFrontmatter(fmFields);
      outputs.push({
        path: `.agents/rules/${inst.slug}.md`,
        content: `${fm}

${inst.body}`
      });
    }
    for (const cmd of filterForTarget(ir.commands, target)) {
      outputs.push({
        path: `.agents/workflows/${cmd.slug}.md`,
        content: cmd.body
      });
    }
    for (const skill of ir.skills) {
      for (const file of skill.files) {
        outputs.push({
          path: `.agents/skills/${skill.name}/${file.relativePath}`,
          content: file.content
        });
      }
    }
    return outputs;
  }
};

// src/generators/codex.ts
function buildCodexToml(agent) {
  const escape = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const lines = [];
  lines.push(`name = "${escape(agent.name)}"`);
  if (agent.description) lines.push(`description = "${escape(agent.description)}"`);
  if (agent.model) lines.push(`model = "${escape(agent.model)}"`);
  if (agent.reasoning_effort) lines.push(`model_reasoning_effort = "${agent.reasoning_effort}"`);
  if (agent.sandbox_mode) lines.push(`sandbox_mode = "${agent.sandbox_mode}"`);
  if (agent.tools && agent.tools.length > 0) {
    const toolList = agent.tools.map((t) => `"${escape(t)}"`).join(", ");
    lines.push(`tools = [${toolList}]`);
  }
  if (agent.body) {
    lines.push("");
    lines.push(`developer_instructions = """`);
    lines.push(agent.body);
    lines.push(`"""`);
  }
  return lines.join("\n");
}
function buildCodexHooksObject(hooks, hookMap) {
  const result = {};
  for (const hook of hooks) {
    const eventName = hookMap[hook.event];
    if (!eventName) continue;
    if (!result[eventName]) result[eventName] = [];
    const hookEntry = { type: hook.type };
    if (hook.command) hookEntry.command = hook.command;
    if (hook.timeout !== void 0) hookEntry.timeout = hook.timeout;
    const entry = { hooks: [hookEntry] };
    if (hook.matcher) entry.matcher = hook.matcher;
    result[eventName].push(entry);
  }
  return result;
}
var CodexGeneratorImpl = class {
  constructor(target, displayName) {
    this.target = target;
    this.displayName = displayName;
  }
  target;
  displayName;
  generate({ ir, target }) {
    const outputs = [];
    const hookMap = HOOK_EVENT_MAPS[target] ?? HOOK_EVENT_MAPS["codex"];
    const instructions = filterForTarget(ir.instructions, target);
    const always = instructions.filter((i) => i.activation === "always");
    const aiDecided = instructions.filter((i) => i.activation === "ai-decided");
    const agentsParts = [
      ...always.map((i) => i.body),
      ...aiDecided.map(
        (i) => i.description ? buildInTextCondition(i.description, i.body) : i.body
      )
    ];
    if (agentsParts.length > 0) {
      outputs.push({ path: "AGENTS.md", content: agentsParts.join("\n\n") });
    }
    for (const inst of instructions.filter((i) => i.activation === "manual")) {
      outputs.push({
        path: `.codex/instructions/${inst.slug}.md`,
        content: inst.body
      });
    }
    for (const cmd of filterForTarget(ir.commands, target)) {
      const skillMd = `---
name: ${cmd.slug}
disable-model-invocation: true
---

${cmd.body}`;
      outputs.push({ path: `.agents/skills/${cmd.slug}/SKILL.md`, content: skillMd });
    }
    for (const agent of filterForTarget(ir.agents, target)) {
      outputs.push({
        path: `.codex/agents/${agent.name}.toml`,
        content: buildCodexToml(agent)
      });
    }
    for (const skill of ir.skills) {
      for (const file of skill.files) {
        outputs.push({
          path: `.agents/skills/${skill.name}/${file.relativePath}`,
          content: file.content
        });
      }
    }
    const hooks = filterForTarget(ir.hooks, target);
    if (hooks.length > 0) {
      const hooksObj = buildCodexHooksObject(hooks, hookMap);
      outputs.push({
        path: ".codex/hooks.json",
        content: JSON.stringify({ hooks: hooksObj }, null, 2)
      });
    }
    return outputs;
  }
};
var CodexGenerator = new CodexGeneratorImpl("codex", "Codex");

// src/generators/windsurf.ts
var WindsurfGenerator = {
  target: "windsurf",
  displayName: "Windsurf",
  generate({ ir, target }) {
    const outputs = [];
    const instructions = filterForTarget(ir.instructions, target);
    for (const inst of instructions) {
      let fmFields;
      switch (inst.activation) {
        case "always":
          fmFields = { trigger: "always_on" };
          break;
        case "scoped":
          fmFields = { trigger: "glob", globs: (inst.globs ?? []).join(", ") };
          break;
        case "ai-decided":
          fmFields = { trigger: "model_decision", description: inst.description ?? "" };
          break;
        case "manual":
          fmFields = { trigger: "manual" };
          break;
      }
      const fm = buildFrontmatter(fmFields);
      outputs.push({
        path: `.windsurf/rules/${inst.slug}.md`,
        content: `${fm}

${inst.body}`
      });
    }
    for (const cmd of filterForTarget(ir.commands, target)) {
      outputs.push({
        path: `.windsurf/workflows/${cmd.slug}.md`,
        content: cmd.body
      });
    }
    for (const skill of ir.skills) {
      for (const file of skill.files) {
        outputs.push({
          path: `.agents/skills/${skill.name}/${file.relativePath}`,
          content: file.content
        });
      }
    }
    return outputs;
  }
};

// src/generators/windsurf-cli.ts
var WindsurfCLIGenerator = {
  target: "windsurf-cli",
  displayName: "Windsurf CLI",
  generate({ ir, target }) {
    const outputs = [];
    const instructions = filterForTarget(ir.instructions, target);
    for (const inst of instructions) {
      let fmFields;
      switch (inst.activation) {
        case "always":
          fmFields = { trigger: "always_on" };
          break;
        case "scoped":
          fmFields = { trigger: "glob", globs: (inst.globs ?? []).join(", ") };
          break;
        case "ai-decided":
          fmFields = { trigger: "model_decision", description: inst.description ?? "" };
          break;
        case "manual":
          fmFields = { trigger: "manual" };
          break;
      }
      const fm = buildFrontmatter(fmFields);
      outputs.push({
        path: `.windsurf/rules/${inst.slug}.md`,
        content: `${fm}

${inst.body}`
      });
    }
    for (const cmd of filterForTarget(ir.commands, target)) {
      outputs.push({
        path: `.windsurf/workflows/${cmd.slug}.md`,
        content: cmd.body
      });
    }
    for (const skill of ir.skills) {
      for (const file of skill.files) {
        outputs.push({
          path: `.agents/skills/${skill.name}/${file.relativePath}`,
          content: file.content
        });
      }
    }
    return outputs;
  }
};

// src/generators/cline.ts
var ClineGenerator = {
  target: "cline",
  displayName: "Cline",
  generate({ ir, target }) {
    const outputs = [];
    const hookMap = HOOK_EVENT_MAPS["cline"];
    const instructions = filterForTarget(ir.instructions, target);
    for (const inst of instructions) {
      let content;
      switch (inst.activation) {
        case "always":
          content = inst.body;
          break;
        case "scoped":
          content = `${buildFrontmatter({ paths: inst.globs ?? [] })}

${inst.body}`;
          break;
        case "ai-decided":
          content = inst.description ? buildInTextCondition(inst.description, inst.body) : inst.body;
          break;
        case "manual":
          content = inst.body;
          break;
      }
      outputs.push({ path: `.clinerules/${inst.slug}.md`, content });
    }
    for (const cmd of filterForTarget(ir.commands, target)) {
      outputs.push({
        path: `.clinerules/workflows/${cmd.slug}.md`,
        content: cmd.body
      });
    }
    for (const skill of ir.skills) {
      for (const file of skill.files) {
        outputs.push({
          path: `.cline/skills/${skill.name}/${file.relativePath}`,
          content: file.content
        });
      }
    }
    for (const hook of filterForTarget(ir.hooks, target)) {
      const clineEvent = hookMap[hook.event];
      if (!clineEvent) continue;
      const cmd = hook.command ?? "true";
      const bashContent = [
        "#!/usr/bin/env bash",
        `# agentconfig-generated hook: ${hook.name} (${hook.event} \u2192 ${clineEvent})`,
        `exec ${cmd}`
      ].join("\n");
      const psContent = [
        "#!/usr/bin/env pwsh",
        `# agentconfig-generated hook: ${hook.name} (${hook.event} \u2192 ${clineEvent})`,
        `& ${cmd}`
      ].join("\n");
      outputs.push({ path: `.clinerules/hooks/${clineEvent}`, content: bashContent });
      outputs.push({ path: `.clinerules/hooks/${clineEvent}.ps1`, content: psContent });
    }
    return outputs;
  }
};

// src/generators/index.ts
registry.register(CopilotGenerator);
registry.register(CopilotCLIGenerator);
registry.register(CursorGenerator);
registry.register(ClaudeCodeGenerator);
registry.register(GeminiCliGenerator);
registry.register(AntigravityGenerator);
registry.register(CodexGenerator);
registry.register(WindsurfGenerator);
registry.register(WindsurfCLIGenerator);
registry.register(ClineGenerator);

// src/importers/index.ts
var fs11 = __toESM(require("fs"));
var path11 = __toESM(require("path"));
var import_js_yaml = __toESM(require("js-yaml"));

// src/importers/copilot.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));

// src/utils.ts
var import_gray_matter = __toESM(require("gray-matter"));
function fixUnquotedColons(raw) {
  return raw.replace(
    // Match frontmatter block at the very start of the file (no `m` flag → `^` = start of string)
    /^(---[ \t]*\r?\n)([\s\S]*?)(\n---(?:[ \t]*)(?:\r?\n|$))/,
    (_, open, block, close) => {
      const fixed = block.replace(
        // Match "key: value-that-contains-a-colon" lines where value is not already quoted/structured
        /^([ \t]*[\w-]+:[ \t]+)([^'"\[{|>\r\n][^\r\n]*:[^\r\n]*)$/gm,
        (_2, prefix, val) => `${prefix}'${val.trimEnd().replace(/'/g, "''")}'`
      );
      return `${open}${fixed}${close}`;
    }
  );
}
function safeMatter(raw) {
  try {
    const { data, content } = (0, import_gray_matter.default)(raw);
    return { data, content };
  } catch {
  }
  try {
    const { data, content } = (0, import_gray_matter.default)(fixUnquotedColons(raw));
    return { data, content };
  } catch {
  }
  const body = raw.replace(/^---[ \t]*\r?\n[\s\S]*?\n---[ \t]*(?:\r?\n|$)/, "").trimStart();
  return {
    data: {},
    content: body,
    parseWarning: "# TODO: verify activation \u2014 YAML frontmatter could not be parsed; check source file"
  };
}
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

// src/importers/copilot.ts
var import_fast_glob = __toESM(require("fast-glob"));
function detectCopilot(dir) {
  if (fs.existsSync(path.join(dir, ".github", "copilot-instructions.md")) || fs.existsSync(path.join(dir, ".github", "instructions"))) {
    return [{ name: "copilot", confidence: "high" }];
  }
  return [];
}
var IN_TEXT_PREFIX = "> **Apply only when:**";
function isAiDecidedBody(body) {
  return body.trimStart().startsWith(IN_TEXT_PREFIX);
}
function extractDescriptionFromBody(body) {
  const line = body.trimStart().split("\n")[0] ?? "";
  return line.replace(/^>\s*\*\*Apply only when:\*\*\s*/, "").trim();
}
function stripInTextCondition(body) {
  const lines = body.trimStart().split("\n");
  return lines.slice(2).join("\n").trimStart();
}
async function importCopilot(sourceDir) {
  const instructions = [];
  const globalFile = path.join(sourceDir, ".github", "copilot-instructions.md");
  if (fs.existsSync(globalFile)) {
    const body = fs.readFileSync(globalFile, "utf8").trim();
    if (body) {
      instructions.push({
        name: "copilot-instructions",
        sourcePath: globalFile,
        activation: "always",
        slug: "copilot-instructions",
        body
      });
    }
  }
  const instrDir = path.join(sourceDir, ".github", "instructions");
  if (fs.existsSync(instrDir)) {
    const files = await (0, import_fast_glob.default)("**/*.instructions.md", { cwd: instrDir, absolute: true });
    for (const filePath of files.sort()) {
      const raw = fs.readFileSync(filePath, "utf8");
      const { data, content, parseWarning } = safeMatter(raw);
      const body = content.trim();
      const stem = path.basename(filePath, ".instructions.md");
      const applyTo = typeof data.applyTo === "string" ? data.applyTo : "**/*";
      if (applyTo === "**/*") {
        if (isAiDecidedBody(body)) {
          const description = extractDescriptionFromBody(body);
          const cleanBody = stripInTextCondition(body);
          instructions.push({
            name: stem,
            sourcePath: filePath,
            activation: "ai-decided",
            slug: stem,
            description,
            body: cleanBody,
            importNote: "activation inferred from applyTo: **/* + in-text condition"
          });
        } else {
          instructions.push({
            name: stem,
            sourcePath: filePath,
            activation: "always",
            slug: stem,
            body,
            importNote: parseWarning ?? "activation inferred from applyTo: **/*; verify if scoped was intended"
          });
        }
      } else {
        const globs = applyTo.split(",").map((g) => g.trim()).filter(Boolean);
        instructions.push({
          name: stem,
          sourcePath: filePath,
          activation: "scoped",
          globs,
          slug: stem,
          body
        });
      }
    }
  }
  const promptsDir = path.join(sourceDir, ".github", "prompts");
  if (fs.existsSync(promptsDir)) {
    const files = await (0, import_fast_glob.default)("**/*.prompt.md", { cwd: promptsDir, absolute: true });
    for (const filePath of files.sort()) {
      const raw = fs.readFileSync(filePath, "utf8");
      const { content } = safeMatter(raw);
      const stem = path.basename(filePath, ".prompt.md");
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: "manual",
        slug: stem,
        body: content.trim()
      });
    }
  }
  return { instructions };
}

// src/importers/copilot-cli.ts
var fs2 = __toESM(require("fs"));
var path2 = __toESM(require("path"));
var import_fast_glob2 = __toESM(require("fast-glob"));
function detectCopilotCli(dir) {
  if (fs2.existsSync(path2.join(dir, ".github", "copilot-instructions.md")) || fs2.existsSync(path2.join(dir, ".github", "instructions"))) {
    return [{ name: "copilot-cli", confidence: "high" }];
  }
  return [];
}
var IN_TEXT_PREFIX2 = "> **Apply only when:**";
function isAiDecidedBody2(body) {
  return body.trimStart().startsWith(IN_TEXT_PREFIX2);
}
function extractDescriptionFromBody2(body) {
  const line = body.trimStart().split("\n")[0] ?? "";
  return line.replace(/^>\s*\*\*Apply only when:\*\*\s*/, "").trim();
}
function stripInTextCondition2(body) {
  const lines = body.trimStart().split("\n");
  return lines.slice(2).join("\n").trimStart();
}
async function importCopilotCli(sourceDir) {
  const instructions = [];
  const globalFile = path2.join(sourceDir, ".github", "copilot-instructions.md");
  if (fs2.existsSync(globalFile)) {
    const body = fs2.readFileSync(globalFile, "utf8").trim();
    if (body) {
      instructions.push({
        name: "copilot-instructions",
        sourcePath: globalFile,
        activation: "always",
        slug: "copilot-instructions",
        body
      });
    }
  }
  const instrDir = path2.join(sourceDir, ".github", "instructions");
  if (fs2.existsSync(instrDir)) {
    const files = await (0, import_fast_glob2.default)("**/*.instructions.md", { cwd: instrDir, absolute: true });
    for (const filePath of files.sort()) {
      const raw = fs2.readFileSync(filePath, "utf8");
      const { data, content, parseWarning } = safeMatter(raw);
      const body = content.trim();
      const stem = path2.basename(filePath, ".instructions.md");
      const applyTo = typeof data.applyTo === "string" ? data.applyTo : "**/*";
      if (applyTo === "**/*") {
        if (isAiDecidedBody2(body)) {
          const description = extractDescriptionFromBody2(body);
          const cleanBody = stripInTextCondition2(body);
          instructions.push({
            name: stem,
            sourcePath: filePath,
            activation: "ai-decided",
            slug: stem,
            description,
            body: cleanBody,
            importNote: "activation inferred from applyTo: **/* + in-text condition"
          });
        } else {
          instructions.push({
            name: stem,
            sourcePath: filePath,
            activation: "always",
            slug: stem,
            body,
            importNote: parseWarning ?? "activation inferred from applyTo: **/*; verify if scoped was intended"
          });
        }
      } else {
        const globs = applyTo.split(",").map((g) => g.trim()).filter(Boolean);
        instructions.push({
          name: stem,
          sourcePath: filePath,
          activation: "scoped",
          globs,
          slug: stem,
          body
        });
      }
    }
  }
  const promptsDir = path2.join(sourceDir, ".github", "prompts");
  if (fs2.existsSync(promptsDir)) {
    const files = await (0, import_fast_glob2.default)("**/*.prompt.md", { cwd: promptsDir, absolute: true });
    for (const filePath of files.sort()) {
      const raw = fs2.readFileSync(filePath, "utf8");
      const { content } = safeMatter(raw);
      const stem = path2.basename(filePath, ".prompt.md");
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: "manual",
        slug: stem,
        body: content.trim()
      });
    }
  }
  return { instructions };
}

// src/importers/cursor.ts
var fs3 = __toESM(require("fs"));
var path3 = __toESM(require("path"));
var import_fast_glob3 = __toESM(require("fast-glob"));
function detectCursor(dir) {
  if (fs3.existsSync(path3.join(dir, ".cursor", "rules"))) {
    return [{ name: "cursor", confidence: "high" }];
  }
  return [];
}
async function importCursor(sourceDir) {
  const instructions = [];
  const rulesDir = path3.join(sourceDir, ".cursor", "rules");
  if (!fs3.existsSync(rulesDir)) return { instructions };
  const files = await (0, import_fast_glob3.default)("**/*.{mdc,md}", { cwd: rulesDir, absolute: true });
  for (const filePath of files.sort()) {
    const raw = fs3.readFileSync(filePath, "utf8");
    const { data, content, parseWarning } = safeMatter(raw);
    const stem = path3.basename(filePath).replace(/\.(mdc|md)$/, "");
    const body = content.trim();
    const hasFrontmatter = Object.keys(data).length > 0 || !!parseWarning;
    if (!hasFrontmatter) {
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: "manual",
        slug: stem,
        body
      });
      continue;
    }
    if (data.alwaysApply === true) {
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: "always",
        slug: stem,
        body
      });
    } else if (data.globs !== void 0 && data.globs !== "") {
      const rawGlobs = typeof data.globs === "string" ? data.globs : String(data.globs);
      const globs = rawGlobs.split(",").map((g) => g.trim()).filter(Boolean);
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: "scoped",
        globs,
        slug: stem,
        body
      });
    } else if (typeof data.description === "string" && data.description) {
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: "ai-decided",
        description: data.description,
        slug: stem,
        body
      });
    } else {
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: "always",
        slug: stem,
        body,
        importNote: parseWarning ?? "# TODO: verify activation \u2014 could not determine from Cursor frontmatter"
      });
    }
  }
  return { instructions };
}

// src/importers/claude-code.ts
var fs4 = __toESM(require("fs"));
var path4 = __toESM(require("path"));
var import_fast_glob4 = __toESM(require("fast-glob"));
function detectClaudeCode(dir) {
  if (fs4.existsSync(path4.join(dir, ".claude"))) {
    return [{ name: "claude-code", confidence: "high" }];
  }
  if (fs4.existsSync(path4.join(dir, "CLAUDE.md"))) {
    return [{ name: "claude-code", confidence: "low" }];
  }
  return [];
}
var IN_TEXT_PREFIX3 = "> **Apply only when:**";
function isAiDecidedBody3(body) {
  return body.trimStart().startsWith(IN_TEXT_PREFIX3);
}
function extractDescription(body) {
  return (body.trimStart().split("\n")[0] ?? "").replace(/^>\s*\*\*Apply only when:\*\*\s*/, "").trim();
}
function stripInTextCondition3(body) {
  return body.trimStart().split("\n").slice(2).join("\n").trimStart();
}
async function importClaudeCode(sourceDir) {
  const instructions = [];
  const agents = [];
  for (const p of [
    path4.join(sourceDir, ".claude", "CLAUDE.md"),
    path4.join(sourceDir, "CLAUDE.md")
  ]) {
    if (fs4.existsSync(p)) {
      const body = fs4.readFileSync(p, "utf8").trim();
      if (body && !body.startsWith("@")) {
        const stem = p.includes(".claude") ? "claude-always" : "claude-root";
        instructions.push({
          name: stem,
          sourcePath: p,
          activation: "always",
          slug: stem,
          body
        });
      }
      break;
    }
  }
  const rulesDir = path4.join(sourceDir, ".claude", "rules");
  if (fs4.existsSync(rulesDir)) {
    const files = await (0, import_fast_glob4.default)("**/*.md", { cwd: rulesDir, absolute: true });
    for (const filePath of files.sort()) {
      const raw = fs4.readFileSync(filePath, "utf8");
      const { data, content, parseWarning } = safeMatter(raw);
      const stem = path4.basename(filePath, ".md");
      const body = content.trim();
      const paths = Array.isArray(data.paths) ? data.paths : [];
      if (Array.isArray(data.paths) && paths.length === 0) {
        instructions.push({
          name: stem,
          sourcePath: filePath,
          activation: "manual",
          slug: stem,
          body
        });
      } else if (paths.length > 0) {
        instructions.push({
          name: stem,
          sourcePath: filePath,
          activation: "scoped",
          globs: paths,
          slug: stem,
          body
        });
      } else if (isAiDecidedBody3(body)) {
        const description = extractDescription(body);
        instructions.push({
          name: stem,
          sourcePath: filePath,
          activation: "ai-decided",
          description,
          slug: stem,
          body: stripInTextCondition3(body)
        });
      } else {
        instructions.push({
          name: stem,
          sourcePath: filePath,
          activation: "always",
          slug: stem,
          body,
          ...parseWarning ? { importNote: parseWarning } : {}
        });
      }
    }
  }
  const agentsDir = path4.join(sourceDir, ".claude", "agents");
  if (fs4.existsSync(agentsDir)) {
    const files = await (0, import_fast_glob4.default)("**/*.md", { cwd: agentsDir, absolute: true });
    for (const filePath of files.sort()) {
      const raw = fs4.readFileSync(filePath, "utf8");
      const { data, content } = safeMatter(raw);
      const name = typeof data.name === "string" ? data.name : path4.basename(filePath, ".md");
      agents.push({
        name,
        sourcePath: filePath,
        description: typeof data.description === "string" ? data.description : void 0,
        model: typeof data.model === "string" ? data.model : void 0,
        tools: Array.isArray(data.tools) ? data.tools : void 0,
        targets: ["claude-code"],
        body: content.trim()
      });
    }
  }
  return { instructions, agents };
}

// src/importers/gemini-cli.ts
var fs5 = __toESM(require("fs"));
var path5 = __toESM(require("path"));
var import_fast_glob5 = __toESM(require("fast-glob"));
function detectGeminiCli(dir) {
  if (fs5.existsSync(path5.join(dir, ".gemini")) || fs5.existsSync(path5.join(dir, "GEMINI.md"))) {
    return [{ name: "gemini-cli", confidence: "high" }];
  }
  return [];
}
async function importGeminiCli(sourceDir) {
  const instructions = [];
  const geminiMd = path5.join(sourceDir, "GEMINI.md");
  if (fs5.existsSync(geminiMd)) {
    const body = fs5.readFileSync(geminiMd, "utf8").trim();
    if (body) {
      instructions.push({
        name: "gemini",
        sourcePath: geminiMd,
        activation: "always",
        slug: "gemini",
        body,
        importNote: "# TODO: verify activation \u2014 GEMINI.md may contain mixed always + ai-decided sections"
      });
    }
  }
  const instrDir = path5.join(sourceDir, ".gemini", "instructions");
  if (fs5.existsSync(instrDir)) {
    const files = await (0, import_fast_glob5.default)("**/*.md", { cwd: instrDir, absolute: true });
    for (const filePath of files.sort()) {
      const body = fs5.readFileSync(filePath, "utf8").trim();
      const stem = path5.basename(filePath, ".md");
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: "manual",
        slug: stem,
        body
      });
    }
  }
  return { instructions };
}

// src/importers/antigravity.ts
var fs6 = __toESM(require("fs"));
var path6 = __toESM(require("path"));
var import_fast_glob6 = __toESM(require("fast-glob"));
function detectAntigravity(dir) {
  if (fs6.existsSync(path6.join(dir, ".agents", "rules"))) {
    return [{ name: "antigravity", confidence: "high" }];
  }
  return [];
}
var ACTIVATION_MAP = {
  always: "always",
  glob: "scoped",
  model: "ai-decided",
  manual: "manual"
};
async function importAntigravity(sourceDir) {
  const instructions = [];
  const rulesDir = path6.join(sourceDir, ".agents", "rules");
  if (!fs6.existsSync(rulesDir)) return { instructions };
  const files = await (0, import_fast_glob6.default)("**/*.md", { cwd: rulesDir, absolute: true });
  for (const filePath of files.sort()) {
    const raw = fs6.readFileSync(filePath, "utf8");
    const { data, content, parseWarning } = safeMatter(raw);
    const stem = path6.basename(filePath, ".md");
    const body = content.trim();
    const rawActivation = typeof data.activation === "string" ? data.activation : "always";
    const activation = ACTIVATION_MAP[rawActivation] ?? "always";
    const inst = {
      name: stem,
      sourcePath: filePath,
      activation,
      slug: stem,
      body
    };
    if (activation === "scoped") {
      const glob = typeof data.glob === "string" ? data.glob : "**/*";
      inst.globs = [glob];
    } else if (activation === "ai-decided") {
      inst.description = typeof data.description === "string" ? data.description : void 0;
      if (!inst.description) {
        inst.importNote = "# TODO: verify activation \u2014 ai-decided inferred from activation: model but no description found";
      }
    }
    if (parseWarning && !inst.importNote) inst.importNote = parseWarning;
    instructions.push(inst);
  }
  return { instructions };
}

// src/importers/codex.ts
var fs7 = __toESM(require("fs"));
var path7 = __toESM(require("path"));
var import_fast_glob7 = __toESM(require("fast-glob"));
function detectCodex(dir) {
  if (fs7.existsSync(path7.join(dir, ".codex"))) {
    return [{ name: "codex", confidence: "high" }];
  }
  if (fs7.existsSync(path7.join(dir, "AGENTS.md"))) {
    return [{ name: "codex", confidence: "low" }];
  }
  return [];
}
function parseTOMLSimple(content) {
  const result = {};
  const lines = content.split("\n");
  let multilineKey = null;
  const multilineLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (multilineKey !== null) {
      if (trimmed === '"""') {
        result[multilineKey] = multilineLines.join("\n");
        multilineKey = null;
        multilineLines.length = 0;
      } else {
        multilineLines.push(line);
      }
      continue;
    }
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("[")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (val === '"""') {
      multilineKey = key;
      continue;
    }
    if (val.startsWith('"') && val.endsWith('"')) {
      result[key] = val.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    } else if (val.startsWith("[") && val.endsWith("]")) {
      const inner = val.slice(1, -1);
      result[key] = inner.split(",").map((s) => s.trim().replace(/^"|"$/g, "")).filter(Boolean);
    } else if (val === "true") {
      result[key] = true;
    } else if (val === "false") {
      result[key] = false;
    } else if (!isNaN(Number(val))) {
      result[key] = Number(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}
async function importCodex(sourceDir) {
  const instructions = [];
  const agents = [];
  const agentsMd = path7.join(sourceDir, "AGENTS.md");
  if (fs7.existsSync(agentsMd)) {
    const body = fs7.readFileSync(agentsMd, "utf8").trim();
    if (body) {
      instructions.push({
        name: "agents",
        sourcePath: agentsMd,
        activation: "always",
        slug: "agents",
        body,
        importNote: "# TODO: verify activation \u2014 AGENTS.md may contain mixed always + ai-decided sections"
      });
    }
  }
  const instrDir = path7.join(sourceDir, ".codex", "instructions");
  if (fs7.existsSync(instrDir)) {
    const files = await (0, import_fast_glob7.default)("**/*.md", { cwd: instrDir, absolute: true });
    for (const filePath of files.sort()) {
      const body = fs7.readFileSync(filePath, "utf8").trim();
      const stem = path7.basename(filePath, ".md");
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: "manual",
        slug: stem,
        body
      });
    }
  }
  const agentsDir = path7.join(sourceDir, ".codex", "agents");
  if (fs7.existsSync(agentsDir)) {
    const files = await (0, import_fast_glob7.default)("**/*.toml", { cwd: agentsDir, absolute: true });
    for (const filePath of files.sort()) {
      const raw = fs7.readFileSync(filePath, "utf8");
      const data = parseTOMLSimple(raw);
      const name = typeof data.name === "string" ? data.name : path7.basename(filePath, ".toml");
      agents.push({
        name,
        sourcePath: filePath,
        description: typeof data.description === "string" ? data.description : void 0,
        model: typeof data.model === "string" ? data.model : void 0,
        reasoning_effort: ["low", "medium", "high"].includes(data.model_reasoning_effort) ? data.model_reasoning_effort : void 0,
        sandbox_mode: ["read-only", "workspace-write", "danger-full-access"].includes(data.sandbox_mode) ? data.sandbox_mode : void 0,
        targets: ["codex"],
        body: typeof data.developer_instructions === "string" ? data.developer_instructions : ""
      });
    }
  }
  return { instructions, agents };
}

// src/importers/windsurf.ts
var fs8 = __toESM(require("fs"));
var path8 = __toESM(require("path"));
var import_fast_glob8 = __toESM(require("fast-glob"));
function detectWindsurf(dir) {
  if (fs8.existsSync(path8.join(dir, ".windsurf", "rules"))) {
    return [{ name: "windsurf", confidence: "high" }];
  }
  return [];
}
var TRIGGER_MAP = {
  always_on: "always",
  glob: "scoped",
  model_decision: "ai-decided",
  manual: "manual"
};
async function importWindsurf(sourceDir) {
  const instructions = [];
  const rulesDir = path8.join(sourceDir, ".windsurf", "rules");
  if (!fs8.existsSync(rulesDir)) return { instructions };
  const files = await (0, import_fast_glob8.default)("**/*.md", { cwd: rulesDir, absolute: true });
  for (const filePath of files.sort()) {
    const raw = fs8.readFileSync(filePath, "utf8");
    const { data, content, parseWarning } = safeMatter(raw);
    const stem = path8.basename(filePath, ".md");
    const body = content.trim();
    const trigger = typeof data.trigger === "string" ? data.trigger : "always_on";
    const activation = TRIGGER_MAP[trigger] ?? "always";
    const inst = {
      name: stem,
      sourcePath: filePath,
      activation,
      slug: stem,
      body
    };
    if (activation === "scoped") {
      const rawGlobs = typeof data.globs === "string" ? data.globs : "";
      inst.globs = rawGlobs.split(",").map((g) => g.trim()).filter(Boolean);
    } else if (activation === "ai-decided") {
      inst.description = typeof data.description === "string" ? data.description : void 0;
    }
    if (!TRIGGER_MAP[trigger]) {
      inst.importNote = `# TODO: verify activation \u2014 unknown Windsurf trigger "${trigger}"`;
    }
    if (parseWarning && !inst.importNote) inst.importNote = parseWarning;
    instructions.push(inst);
  }
  return { instructions };
}

// src/importers/windsurf-cli.ts
var fs9 = __toESM(require("fs"));
var path9 = __toESM(require("path"));
var import_fast_glob9 = __toESM(require("fast-glob"));
function detectWindsurfCli(dir) {
  if (fs9.existsSync(path9.join(dir, ".devin"))) {
    return [{ name: "windsurf-cli", confidence: "low" }];
  }
  return [];
}
var TRIGGER_MAP2 = {
  always_on: "always",
  glob: "scoped",
  model_decision: "ai-decided",
  manual: "manual"
};
async function importWindsurfCli(sourceDir) {
  const instructions = [];
  const rulesDir = path9.join(sourceDir, ".devin", "rules");
  if (!fs9.existsSync(rulesDir)) return { instructions };
  const files = await (0, import_fast_glob9.default)("**/*.md", { cwd: rulesDir, absolute: true });
  for (const filePath of files.sort()) {
    const raw = fs9.readFileSync(filePath, "utf8");
    const { data, content, parseWarning } = safeMatter(raw);
    const stem = path9.basename(filePath, ".md");
    const body = content.trim();
    const trigger = typeof data.trigger === "string" ? data.trigger : "always_on";
    const activation = TRIGGER_MAP2[trigger] ?? "always";
    const inst = {
      name: stem,
      sourcePath: filePath,
      activation,
      slug: stem,
      body
    };
    if (activation === "scoped") {
      const rawGlobs = typeof data.globs === "string" ? data.globs : "";
      inst.globs = rawGlobs.split(",").map((g) => g.trim()).filter(Boolean);
    } else if (activation === "ai-decided") {
      inst.description = typeof data.description === "string" ? data.description : void 0;
    }
    if (!TRIGGER_MAP2[trigger]) {
      inst.importNote = `# TODO: verify activation \u2014 unknown Windsurf CLI trigger "${trigger}"`;
    }
    if (parseWarning && !inst.importNote) inst.importNote = parseWarning;
    instructions.push(inst);
  }
  return { instructions };
}

// src/importers/cline.ts
var fs10 = __toESM(require("fs"));
var path10 = __toESM(require("path"));
var import_fast_glob10 = __toESM(require("fast-glob"));
function detectCline(dir) {
  if (fs10.existsSync(path10.join(dir, ".clinerules"))) {
    return [{ name: "cline", confidence: "high" }];
  }
  return [];
}
var IN_TEXT_PREFIX4 = "> **Apply only when:**";
function isAiDecidedBody4(body) {
  return body.trimStart().startsWith(IN_TEXT_PREFIX4);
}
function extractDescription2(body) {
  return (body.trimStart().split("\n")[0] ?? "").replace(/^>\s*\*\*Apply only when:\*\*\s*/, "").trim();
}
function stripInTextCondition4(body) {
  return body.trimStart().split("\n").slice(2).join("\n").trimStart();
}
async function importCline(sourceDir) {
  const instructions = [];
  const rulesDir = path10.join(sourceDir, ".clinerules");
  if (!fs10.existsSync(rulesDir)) return { instructions };
  const files = await (0, import_fast_glob10.default)("**/*.{md,txt}", { cwd: rulesDir, absolute: true });
  for (const filePath of files.sort()) {
    const rel = path10.relative(rulesDir, filePath).replace(/\\/g, "/");
    if (rel.startsWith("workflows/") || rel.startsWith("hooks/")) continue;
    const raw = fs10.readFileSync(filePath, "utf8");
    const { data, content, parseWarning } = safeMatter(raw);
    const stem = path10.basename(filePath).replace(/\.(md|txt)$/, "");
    const body = content.trim();
    const hasFrontmatter = Object.keys(data).length > 0 || !!parseWarning;
    if (!hasFrontmatter) {
      if (isAiDecidedBody4(body)) {
        const description = extractDescription2(body);
        instructions.push({
          name: stem,
          sourcePath: filePath,
          activation: "ai-decided",
          description,
          slug: stem,
          body: stripInTextCondition4(body),
          importNote: "# TODO: verify activation \u2014 ai-decided inferred from in-text condition prefix"
        });
      } else {
        instructions.push({
          name: stem,
          sourcePath: filePath,
          activation: "always",
          slug: stem,
          body
        });
      }
    } else if (Array.isArray(data.paths)) {
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: "scoped",
        globs: data.paths,
        slug: stem,
        body
      });
    } else {
      instructions.push({
        name: stem,
        sourcePath: filePath,
        activation: "always",
        slug: stem,
        body,
        importNote: parseWarning ?? "# TODO: verify activation \u2014 unrecognized Cline frontmatter"
      });
    }
  }
  return { instructions };
}

// src/importers/index.ts
registry.registerImporter("copilot", importCopilot);
registry.registerImporter("copilot-cli", importCopilotCli);
registry.registerDetector(detectCopilot);
registry.registerDetector(detectCopilotCli);
registry.registerImporter("cursor", importCursor);
registry.registerDetector(detectCursor);
registry.registerImporter("claude-code", importClaudeCode);
registry.registerDetector(detectClaudeCode);
registry.registerImporter("gemini-cli", importGeminiCli);
registry.registerDetector(detectGeminiCli);
registry.registerImporter("antigravity", importAntigravity);
registry.registerDetector(detectAntigravity);
registry.registerImporter("codex", importCodex);
registry.registerDetector(detectCodex);
registry.registerImporter("windsurf", importWindsurf);
registry.registerDetector(detectWindsurf);
registry.registerImporter("windsurf-cli", importWindsurfCli);
registry.registerDetector(detectWindsurfCli);
registry.registerImporter("cline", importCline);
registry.registerDetector(detectCline);
function detectAgents(dir) {
  return registry.listDetectors().flatMap((fn) => fn(dir));
}
function normalizeBody(body) {
  return body.split("\n").map((l) => l.trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function deduplicateInstructions(instructions) {
  const exactMap = /* @__PURE__ */ new Map();
  const normalMap = /* @__PURE__ */ new Map();
  const result = [];
  for (const inst of instructions) {
    const exact = inst.body;
    const normalized = normalizeBody(inst.body);
    if (exactMap.has(exact)) continue;
    if (normalMap.has(normalized)) continue;
    exactMap.set(exact, inst);
    normalMap.set(normalized, inst);
    result.push(inst);
  }
  return result;
}
async function importArtifacts(sourceDir, opts) {
  const detected = detectAgents(sourceDir);
  const targetAgents = opts?.from && opts.from.length > 0 ? opts.from : detected.map((a) => a.name);
  const allInstructions = [];
  const allAgents = [];
  for (const agentName of targetAgents) {
    const importer = registry.getImporter(agentName);
    if (!importer) continue;
    const result = await importer(sourceDir);
    allInstructions.push(...result.instructions);
    if (result.agents) allAgents.push(...result.agents);
  }
  return {
    instructions: deduplicateInstructions(allInstructions),
    agents: allAgents,
    skills: [],
    commands: [],
    hooks: [],
    extensions: {}
  };
}
async function writeAgentConfigDir(ir, config, configDir, opts) {
  if (!opts?.dryRun) {
    fs11.mkdirSync(configDir, { recursive: true });
  }
  const configYaml = import_js_yaml.default.dump({
    version: 1,
    targets: config.targets,
    options: config.options
  });
  writeFile(path11.join(configDir, "config.yaml"), configYaml, opts);
  for (const inst of ir.instructions) {
    const fm = { activation: inst.activation };
    if (inst.globs && inst.globs.length > 0) fm.globs = inst.globs;
    if (inst.description) fm.description = inst.description;
    if (inst.slug !== inst.name) fm.name = inst.slug;
    if (inst.targets && inst.targets.length > 0) fm.targets = inst.targets;
    if (inst.excludedTargets && inst.excludedTargets.length > 0)
      fm.excludedTargets = inst.excludedTargets;
    let fmStr = "---\n" + import_js_yaml.default.dump(fm).trimEnd() + "\n---";
    if (inst.importNote) {
      fmStr = `${inst.importNote}
${fmStr}`;
    }
    const content = `${fmStr}

${inst.body}
`;
    writeFile(path11.join(configDir, "instructions", `${inst.name}.md`), content, opts);
  }
  for (const agent of ir.agents) {
    const fm = { name: agent.name };
    if (agent.description) fm.description = agent.description;
    if (agent.model) fm.model = agent.model;
    if (agent.tools && agent.tools.length > 0) fm.tools = agent.tools;
    if (agent.targets && agent.targets.length > 0) fm.targets = agent.targets;
    if (agent.isolation) fm.isolation = agent.isolation;
    if (agent.sandbox_mode) fm.sandbox_mode = agent.sandbox_mode;
    if (agent.reasoning_effort) fm.reasoning_effort = agent.reasoning_effort;
    const fmStr = "---\n" + import_js_yaml.default.dump(fm).trimEnd() + "\n---";
    const content = `${fmStr}

${agent.body}
`;
    writeFile(path11.join(configDir, "agents", `${agent.name}.md`), content, opts);
  }
  for (const skill of ir.skills) {
    for (const file of skill.files) {
      writeFile(
        path11.join(configDir, "skills", skill.name, file.relativePath),
        file.content,
        opts
      );
    }
  }
  for (const cmd of ir.commands) {
    writeFile(path11.join(configDir, "commands", `${cmd.name}.md`), cmd.body + "\n", opts);
  }
  if (ir.hooks.length > 0) {
    const hooksData = { hooks: ir.hooks };
    const hooksYaml = import_js_yaml.default.dump(hooksData);
    writeFile(path11.join(configDir, "hooks", "hooks.yaml"), hooksYaml, opts);
  }
  for (const [typeId, items] of Object.entries(ir.extensions)) {
    const plugin = registry.getDirectiveType(typeId);
    if (plugin?.write) {
      plugin.write(items, configDir, opts);
    }
  }
}
function writeFile(filePath, content, opts) {
  if (opts?.overwrite === false && fs11.existsSync(filePath)) return;
  if (!opts?.dryRun) {
    fs11.mkdirSync(path11.dirname(filePath), { recursive: true });
    fs11.writeFileSync(filePath, content, "utf8");
  }
}

// src/operations.ts
var path20 = __toESM(require("path"));
var fs20 = __toESM(require("fs"));

// src/config.ts
var fs12 = __toESM(require("fs"));
var path12 = __toESM(require("path"));
var import_js_yaml2 = __toESM(require("js-yaml"));

// src/types/config.ts
var import_zod = require("zod");
var AgentConfigSchema = import_zod.z.object({
  version: import_zod.z.number().int().positive().default(1),
  targets: import_zod.z.array(import_zod.z.string()).default([]),
  options: import_zod.z.object({
    overwrite: import_zod.z.boolean().default(true),
    output_dir: import_zod.z.string().default(".")
  }).default({})
});

// src/config.ts
function findConfigDir(startDir) {
  let current = path12.resolve(startDir);
  const { root } = path12.parse(current);
  while (true) {
    const candidate = path12.join(current, ".agentconfig");
    if (fs12.existsSync(candidate) && fs12.statSync(candidate).isDirectory()) {
      return candidate;
    }
    if (current === root) return null;
    const parent = path12.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}
function resolveConfigDir(startDir) {
  const from = startDir ?? process.cwd();
  const dir = findConfigDir(from);
  if (!dir) {
    throw new Error(
      `No .agentconfig/ directory found starting from ${from}.
Run in a directory that contains .agentconfig/ or use --config <path>.`
    );
  }
  return dir;
}
async function loadConfig(configDir, overrides) {
  const configPath = path12.join(configDir, "config.yaml");
  let raw = {};
  if (fs12.existsSync(configPath)) {
    raw = import_js_yaml2.default.load(fs12.readFileSync(configPath, "utf8")) ?? {};
  }
  return AgentConfigSchema.parse({ ...raw, ...overrides });
}

// src/global-config.ts
var fs13 = __toESM(require("fs"));
var os = __toESM(require("os"));
var path13 = __toESM(require("path"));
var import_js_yaml3 = __toESM(require("js-yaml"));
var import_zod2 = require("zod");
var BUILT_IN_TARGETS = [
  "copilot",
  "copilot-cli",
  "cursor",
  "claude-code",
  "gemini-cli",
  "antigravity",
  "codex",
  "windsurf",
  "windsurf-cli",
  "cline"
];
var GlobalToolConfigSchema = import_zod2.z.object({
  version: import_zod2.z.number().int().positive().default(1),
  /**
   * Plugin IDs to register. Built-in target names (e.g. `copilot`, `cursor`)
   * are listed here for reference — they are auto-registered and do not need
   * to be imported. Any other entry is treated as a module path or npm package
   * name and loaded via dynamic import.
   */
  plugins: import_zod2.z.array(import_zod2.z.string()).default([...BUILT_IN_TARGETS])
});
function getGlobalConfigDir() {
  return path13.join(os.homedir(), ".agentconfig");
}
function getGlobalConfigPath() {
  return path13.join(getGlobalConfigDir(), "config.yaml");
}
async function loadGlobalConfig() {
  ensureGlobalConfig();
  const configPath = getGlobalConfigPath();
  let raw = {};
  if (fs13.existsSync(configPath)) {
    raw = import_js_yaml3.default.load(fs13.readFileSync(configPath, "utf8")) ?? {};
  }
  return GlobalToolConfigSchema.parse(raw);
}
function buildDefaultGlobalConfigContent() {
  const pluginLines = BUILT_IN_TARGETS.map((t) => `  - ${t}`).join("\n");
  return [
    "version: 1",
    "",
    "# Plugins registered with agentconfig.",
    "# Built-in plugin IDs are listed below. Remove any you do not need.",
    "# To add an external plugin, append its npm package name or file path.",
    "plugins:",
    pluginLines,
    ""
  ].join("\n");
}
function ensureGlobalConfig() {
  const configDir = getGlobalConfigDir();
  const configPath = getGlobalConfigPath();
  if (fs13.existsSync(configPath)) return;
  fs13.mkdirSync(configDir, { recursive: true });
  fs13.writeFileSync(configPath, buildDefaultGlobalConfigContent(), "utf8");
}
async function loadGlobalPlugins() {
  const config = await loadGlobalConfig();
  const builtInSet = new Set(BUILT_IN_TARGETS);
  for (const plugin of config.plugins) {
    if (builtInSet.has(plugin)) continue;
    await registry.loadPlugin(plugin);
  }
}

// src/parsers/instruction.ts
var fs14 = __toESM(require("fs"));
var path14 = __toESM(require("path"));
var import_gray_matter2 = __toESM(require("gray-matter"));
var import_fast_glob11 = __toESM(require("fast-glob"));
var VALID_ACTIVATIONS = /* @__PURE__ */ new Set(["always", "scoped", "ai-decided", "manual"]);
async function parseInstructions(configDir) {
  const dir = path14.join(configDir, "instructions");
  if (!fs14.existsSync(dir)) return [];
  const filePaths = await (0, import_fast_glob11.default)("**/*.md", { cwd: dir, absolute: true });
  filePaths.sort();
  return filePaths.map((filePath) => {
    const raw = fs14.readFileSync(filePath, "utf8");
    const { data, content } = (0, import_gray_matter2.default)(raw);
    const name = path14.basename(filePath, ".md");
    const activation = VALID_ACTIVATIONS.has(data.activation) ? data.activation : "always";
    return {
      name,
      sourcePath: filePath,
      activation,
      globs: Array.isArray(data.globs) ? data.globs : void 0,
      description: typeof data.description === "string" ? data.description : void 0,
      slug: typeof data.name === "string" ? data.name : name,
      targets: Array.isArray(data.targets) ? data.targets : void 0,
      excludedTargets: Array.isArray(data.excludedTargets) ? data.excludedTargets : void 0,
      body: content.trim()
    };
  });
}

// src/parsers/agent.ts
var fs15 = __toESM(require("fs"));
var path15 = __toESM(require("path"));
var import_gray_matter3 = __toESM(require("gray-matter"));
var import_fast_glob12 = __toESM(require("fast-glob"));
var VALID_SANDBOX_MODES = /* @__PURE__ */ new Set(["read-only", "workspace-write", "danger-full-access"]);
var VALID_REASONING = /* @__PURE__ */ new Set(["low", "medium", "high"]);
async function parseAgents(configDir) {
  const dir = path15.join(configDir, "agents");
  if (!fs15.existsSync(dir)) return [];
  const filePaths = await (0, import_fast_glob12.default)("**/*.md", { cwd: dir, absolute: true });
  filePaths.sort();
  return filePaths.map((filePath) => {
    const raw = fs15.readFileSync(filePath, "utf8");
    const { data, content } = (0, import_gray_matter3.default)(raw);
    const {
      name: nameField,
      description,
      model,
      tools,
      targets,
      excludedTargets,
      isolation,
      sandbox_mode,
      reasoning_effort,
      ...rest
    } = data;
    const name = typeof nameField === "string" ? nameField : path15.basename(filePath, ".md");
    return {
      name,
      sourcePath: filePath,
      description: typeof description === "string" ? description : void 0,
      model: typeof model === "string" ? model : void 0,
      tools: Array.isArray(tools) ? tools : void 0,
      targets: Array.isArray(targets) ? targets : void 0,
      excludedTargets: Array.isArray(excludedTargets) ? excludedTargets : void 0,
      isolation: isolation === "worktree" ? "worktree" : null,
      sandbox_mode: VALID_SANDBOX_MODES.has(sandbox_mode) ? sandbox_mode : void 0,
      reasoning_effort: VALID_REASONING.has(reasoning_effort) ? reasoning_effort : void 0,
      body: content.trim(),
      extra: Object.keys(rest).length > 0 ? rest : void 0
    };
  });
}

// src/parsers/skill.ts
var fs16 = __toESM(require("fs"));
var path16 = __toESM(require("path"));
function readDirRecursive(dir, baseDir) {
  const files = [];
  let entries;
  try {
    entries = fs16.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const fullPath = path16.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...readDirRecursive(fullPath, baseDir));
    } else {
      const relativePath = path16.relative(baseDir, fullPath).replace(/\\/g, "/");
      try {
        const content = fs16.readFileSync(fullPath, "utf8");
        if (!content.includes("\0")) {
          files.push({ relativePath, content });
        }
      } catch {
      }
    }
  }
  return files;
}
function parseSkills(configDir) {
  const dir = path16.join(configDir, "skills");
  if (!fs16.existsSync(dir)) return [];
  const skills = [];
  let entries;
  try {
    entries = fs16.readdirSync(dir, { withFileTypes: true });
  } catch {
    return skills;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = path16.join(dir, entry.name);
    const files = readDirRecursive(skillPath, skillPath);
    skills.push({ name: entry.name, sourcePath: skillPath, files });
  }
  return skills;
}

// src/parsers/command.ts
var fs17 = __toESM(require("fs"));
var path17 = __toESM(require("path"));
var import_gray_matter4 = __toESM(require("gray-matter"));
var import_fast_glob13 = __toESM(require("fast-glob"));
async function parseCommands(configDir) {
  const dir = path17.join(configDir, "commands");
  if (!fs17.existsSync(dir)) return [];
  const filePaths = await (0, import_fast_glob13.default)("**/*.md", { cwd: dir, absolute: true });
  filePaths.sort();
  return filePaths.map((filePath) => {
    const raw = fs17.readFileSync(filePath, "utf8");
    const { data, content } = (0, import_gray_matter4.default)(raw);
    const name = path17.basename(filePath, ".md");
    const slug = typeof data.name === "string" ? slugify(data.name) : slugify(name);
    return {
      name,
      slug,
      sourcePath: filePath,
      body: content.trim(),
      targets: Array.isArray(data.targets) ? data.targets : void 0,
      excludedTargets: Array.isArray(data.excludedTargets) ? data.excludedTargets : void 0
    };
  });
}

// src/parsers/hook.ts
var fs18 = __toESM(require("fs"));
var path18 = __toESM(require("path"));
var import_js_yaml4 = __toESM(require("js-yaml"));
var import_zod3 = require("zod");
var HOOK_EVENTS = [
  "SessionStart",
  "SessionEnd",
  "PreToolUse",
  "PostToolUse",
  "SubagentStart",
  "SubagentStop",
  "PreCompact",
  "UserPromptSubmit",
  "PermissionRequest"
];
var HookSchema = import_zod3.z.object({
  name: import_zod3.z.string(),
  event: import_zod3.z.enum(HOOK_EVENTS),
  matcher: import_zod3.z.string().optional(),
  type: import_zod3.z.enum(["command", "http", "prompt", "agent"]).default("command"),
  command: import_zod3.z.string().optional(),
  timeout: import_zod3.z.number().optional(),
  blocking: import_zod3.z.boolean().optional(),
  async: import_zod3.z.boolean().optional(),
  targets: import_zod3.z.array(import_zod3.z.string()).optional(),
  excludedTargets: import_zod3.z.array(import_zod3.z.string()).optional()
});
var HooksYamlSchema = import_zod3.z.object({
  hooks: import_zod3.z.array(HookSchema).default([])
});
function parseHooks(configDir) {
  const hooksFile = path18.join(configDir, "hooks", "hooks.yaml");
  if (!fs18.existsSync(hooksFile)) return [];
  const raw = import_js_yaml4.default.load(fs18.readFileSync(hooksFile, "utf8"));
  const parsed = HooksYamlSchema.parse(raw);
  return parsed.hooks;
}

// src/parsers/index.ts
async function parseArtifacts(configDir, _config) {
  const [instructions, agents, commands] = await Promise.all([
    parseInstructions(configDir),
    parseAgents(configDir),
    parseCommands(configDir)
  ]);
  const skills = parseSkills(configDir);
  const hooks = parseHooks(configDir);
  const extensions = {};
  for (const plugin of registry.listDirectiveTypes()) {
    extensions[plugin.typeId] = await Promise.resolve(plugin.parse(configDir));
  }
  return { instructions, agents, skills, commands, hooks, extensions };
}

// src/validator.ts
var VALID_ACTIVATIONS2 = /* @__PURE__ */ new Set(["always", "scoped", "ai-decided", "manual"]);
function validate(ir, config) {
  const results = [];
  for (const inst of ir.instructions) {
    if (!VALID_ACTIVATIONS2.has(inst.activation)) {
      results.push({
        level: "error",
        message: `Invalid activation "${inst.activation}". Must be one of: always, scoped, ai-decided, manual.`,
        file: inst.sourcePath
      });
    }
    if (inst.activation === "scoped" && (!inst.globs || inst.globs.length === 0)) {
      results.push({
        level: "error",
        message: '"globs" is required when activation is "scoped".',
        file: inst.sourcePath
      });
    }
    if (inst.activation === "ai-decided" && !inst.description) {
      results.push({
        level: "error",
        message: '"description" is required when activation is "ai-decided".',
        file: inst.sourcePath
      });
    }
    const effectiveTargets = config.targets.filter((t) => {
      if (inst.targets && inst.targets.length > 0 && !inst.targets.includes(t)) return false;
      if (inst.excludedTargets && inst.excludedTargets.includes(t)) return false;
      return true;
    });
    const bodyLen = inst.body.length;
    if (effectiveTargets.includes("antigravity") && bodyLen > 12e3) {
      results.push({
        level: "warning",
        message: `Antigravity rule file exceeds 12,000 character limit (${bodyLen} chars).`,
        file: inst.sourcePath
      });
    }
    if (effectiveTargets.includes("windsurf") && bodyLen > 12e3) {
      results.push({
        level: "warning",
        message: `Windsurf rule file exceeds 12,000 character limit (${bodyLen} chars).`,
        file: inst.sourcePath
      });
    }
    if (effectiveTargets.includes("cursor")) {
      if (inst.activation === "always" && bodyLen > 6e3) {
        results.push({
          level: "warning",
          message: `Cursor always-on rule exceeds the 6,000-character global limit (${bodyLen} chars). Consider splitting or using activation: scoped.`,
          file: inst.sourcePath
        });
      } else if (bodyLen > 12e3) {
        results.push({
          level: "warning",
          message: `Cursor rule file exceeds 12,000 character limit (${bodyLen} chars).`,
          file: inst.sourcePath
        });
      }
    }
  }
  const hasCodex = config.targets.includes("codex");
  if (hasCodex && ir.hooks.length > 0) {
    if (process.platform === "win32") {
      results.push({
        level: "warning",
        message: "Codex hooks are disabled on Windows. Hook files will be generated but will not execute."
      });
    }
    results.push({
      level: "info",
      message: "Codex hooks require `codex_hooks = true` in ~/.codex/config.toml to be activated."
    });
  }
  if (config.targets.includes("claude-code") && config.targets.includes("codex")) {
    results.push({
      level: "warning",
      message: `Both claude-code and codex targets are active. If "CLAUDE.md" is listed in Codex's project_doc_fallback_filenames, Claude Code's always-on instructions may be double-loaded by Codex.`
    });
  }
  for (const plugin of registry.listDirectiveTypes()) {
    if (plugin.validate) {
      const items = ir.extensions[plugin.typeId] ?? [];
      results.push(...plugin.validate(items, config));
    }
  }
  return results;
}

// src/writer.ts
var fs19 = __toESM(require("fs"));
var path19 = __toESM(require("path"));
var crypto = __toESM(require("crypto"));
var import_diff = require("diff");
var contentHashCache = /* @__PURE__ */ new Map();
function hashContent(content) {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}
function clearHashCache() {
  contentHashCache.clear();
}
function deduplicateOutputs(files) {
  const seen = /* @__PURE__ */ new Set();
  const deduped = [];
  for (const f of files) {
    if (!seen.has(f.path)) {
      seen.add(f.path);
      deduped.push(f);
    }
  }
  return deduped;
}
function computeDiff(files, outputDir) {
  return deduplicateOutputs(files).map((file) => {
    const abs = path19.resolve(outputDir, file.path);
    if (!fs19.existsSync(abs)) {
      return { path: file.path, action: "create", diff: file.content };
    }
    const existing = fs19.readFileSync(abs, "utf8");
    if (existing === file.content) {
      return { path: file.path, action: "unchanged" };
    }
    return {
      path: file.path,
      action: "update",
      diff: (0, import_diff.createPatch)(file.path, existing, file.content, "current", "generated")
    };
  });
}
async function write(files, opts) {
  const deduped = deduplicateOutputs(files);
  for (const file of deduped) {
    const abs = path19.resolve(opts.outputDir, file.path);
    if (opts.overwrite === false && fs19.existsSync(abs)) continue;
    const hash = hashContent(file.content);
    if (contentHashCache.get(abs) === hash) continue;
    if (!opts.dryRun) {
      fs19.mkdirSync(path19.dirname(abs), { recursive: true });
      fs19.writeFileSync(abs, file.content, "utf8");
    }
    contentHashCache.set(abs, hash);
  }
}

// src/operations.ts
function buildFiles(ir, config, targetFilter) {
  const targets = targetFilter && targetFilter.length > 0 ? targetFilter : config.targets;
  const outputs = [];
  for (const target of targets) {
    const gen = registry.get(target);
    if (!gen) continue;
    outputs.push(...gen.generate({ ir, config, target }));
  }
  return deduplicateOutputs(outputs);
}
async function runGenerate(options) {
  const configDir = resolveConfigDir(options.configPath);
  const overrides = options.projectRootOverride ? { options: { output_dir: options.projectRootOverride, overwrite: options.overwrite ?? true } } : void 0;
  const config = await loadConfig(configDir, overrides);
  await loadGlobalPlugins();
  const ir = await parseArtifacts(configDir, config);
  const validationErrors = validate(ir, config).filter((r) => r.level === "error");
  const outputDir = path20.resolve(path20.dirname(configDir), config.options.output_dir);
  const targets = options.targets?.length ? options.targets : config.targets;
  if (validationErrors.length > 0) {
    return { configDir, outputDir, targets, validationErrors, fileCount: 0 };
  }
  const files = buildFiles(ir, config, options.targets);
  await write(files, { outputDir, overwrite: options.overwrite ?? true, dryRun: false });
  return { configDir, outputDir, targets, validationErrors: [], fileCount: files.length };
}
async function runValidate(options) {
  const configDir = resolveConfigDir(options.configPath);
  const config = await loadConfig(configDir);
  const ir = await parseArtifacts(configDir, config);
  return validate(ir, config);
}
async function runDiff(options) {
  const configDir = resolveConfigDir(options.configPath);
  const overrides = options.projectRootOverride ? { options: { output_dir: options.projectRootOverride, overwrite: false } } : void 0;
  const config = await loadConfig(configDir, overrides);
  await loadGlobalPlugins();
  const ir = await parseArtifacts(configDir, config);
  const files = buildFiles(ir, config, options.targets);
  const outputDir = path20.resolve(path20.dirname(configDir), config.options.output_dir);
  const diff = computeDiff(files, outputDir);
  return { diff, outputDir };
}
async function runInitialize(options) {
  const { sourceDir, from, overwrite = false, dryRun = false } = options;
  const configDir = path20.join(sourceDir, ".agentconfig");
  const detectedAgents = detectAgents(sourceDir);
  if (detectedAgents.length === 0) {
    return { configDir, detectedAgents: [], instructionCount: 0, agentCount: 0 };
  }
  if (fs20.existsSync(configDir) && !overwrite && !dryRun) {
    throw new Error(
      `.agentconfig/ already exists at ${configDir}. Use --overwrite to replace or --dry-run to preview.`
    );
  }
  const ir = await importArtifacts(sourceDir, { from: from?.length ? from : void 0 });
  const config = {
    version: 1,
    targets: detectedAgents.map((a) => a.name),
    options: { overwrite, output_dir: "." }
  };
  await writeAgentConfigDir(ir, config, configDir, { overwrite, dryRun });
  return {
    configDir,
    detectedAgents,
    instructionCount: ir.instructions.length,
    agentCount: ir.agents.length
  };
}
async function runImport(options) {
  const { sourceDir, overwrite = false, dryRun = false } = options;
  const destRoot = options.destDir ? path20.resolve(options.destDir) : process.cwd();
  const sourceConfigDir = resolveConfigDir(sourceDir);
  const sourceConfig = await loadConfig(sourceConfigDir);
  const sourceIr = await parseArtifacts(sourceConfigDir, sourceConfig);
  const existingDestConfigDir = findConfigDir(destRoot);
  const destConfigDir = existingDestConfigDir ?? path20.join(destRoot, ".agentconfig");
  let mergedTargets = sourceConfig.targets;
  if (existingDestConfigDir) {
    const destConfig = await loadConfig(existingDestConfigDir).catch(() => null);
    if (destConfig) {
      mergedTargets = Array.from(/* @__PURE__ */ new Set([...destConfig.targets, ...sourceConfig.targets]));
    }
  }
  const mergedConfig = {
    version: 1,
    targets: mergedTargets,
    options: { overwrite, output_dir: "." }
  };
  await writeAgentConfigDir(sourceIr, mergedConfig, destConfigDir, { overwrite, dryRun });
  return {
    sourceConfigDir,
    destConfigDir,
    instructionCount: sourceIr.instructions.length,
    agentCount: sourceIr.agents.length
  };
}
async function listTargets(configPath) {
  await loadGlobalPlugins();
  return registry.list();
}

// src/index.ts
function generate(ir, config, targetFilter) {
  const targets = targetFilter && targetFilter.length > 0 ? targetFilter : config.targets;
  const outputs = [];
  for (const target of targets) {
    const gen = registry.get(target);
    if (!gen) continue;
    outputs.push(...gen.generate({ ir, config, target }));
  }
  return deduplicateOutputs(outputs);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BUILT_IN_TARGETS,
  GeneratorRegistry,
  PluginRegistry,
  clearHashCache,
  computeDiff,
  deduplicateOutputs,
  detectAgents,
  ensureGlobalConfig,
  findConfigDir,
  generate,
  getGlobalConfigDir,
  getGlobalConfigPath,
  importArtifacts,
  listTargets,
  loadConfig,
  loadGlobalConfig,
  loadGlobalPlugins,
  parseArtifacts,
  registry,
  resolveConfigDir,
  runDiff,
  runGenerate,
  runImport,
  runInitialize,
  runValidate,
  validate,
  write,
  writeAgentConfigDir
});
//# sourceMappingURL=index.js.map