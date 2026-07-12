#!/usr/bin/env node

// src/presentation/cli/runtime-cli.ts
import { realpathSync } from "fs";
import { resolve as resolve2 } from "path";
import { fileURLToPath } from "url";
import { Logger as Logger2 } from "tslog";

// src/infrastructure/ink/ink-runtime-ui-renderer.tsx
import { render } from "ink";

// src/presentation/ink/runtime-ui-app.tsx
import { useCallback, useEffect as useEffect3, useMemo as useMemo2, useState as useState4 } from "react";
import { Box as Box3, Text as Text3, useApp, useInput as useInput2 } from "ink";

// src/application/ui/terminal-layout-allocator.ts
var TerminalLayoutAllocator = class _TerminalLayoutAllocator {
  /** Fixed status bar height in rows. */
  static STATUS_ROWS = 3;
  /** Fixed key hint overlay height in rows. */
  static HINT_ROWS = 3;
  /** Smallest useful route content height in rows. */
  static MINIMUM_CONTENT_ROWS = 11;
  /**
   * Allocates terminal rows without allowing shell regions to overlap.
   *
   * @param terminalRows - Current stdout height; non-positive values are normalized.
   * @returns Stable shell region allocation and minimum-size state.
   */
  allocate(terminalRows) {
    const rows = Math.max(1, Math.floor(terminalRows));
    const minimumRows = _TerminalLayoutAllocator.STATUS_ROWS + _TerminalLayoutAllocator.HINT_ROWS + _TerminalLayoutAllocator.MINIMUM_CONTENT_ROWS;
    const requiresResize = rows < minimumRows;
    return {
      terminalRows: rows,
      statusRows: _TerminalLayoutAllocator.STATUS_ROWS,
      contentRows: requiresResize ? 0 : rows - _TerminalLayoutAllocator.STATUS_ROWS - _TerminalLayoutAllocator.HINT_ROWS,
      hintRows: _TerminalLayoutAllocator.HINT_ROWS,
      minimumRows,
      requiresResize
    };
  }
};

// src/presentation/ink/navigation-stack.ts
var NavigationStack = class {
  routes;
  /** @param home - Initial route that cannot be popped. */
  constructor(home) {
    this.routes = [home];
  }
  /** @returns Route currently displayed at the top of the stack. */
  current() {
    return this.routes.at(-1) ?? this.routes[0];
  }
  /** @param route - Non-home route to display. */
  push(route) {
    this.routes.push(route);
  }
  /** Removes one child route while preserving the home route. */
  pop() {
    if (this.routes.length > 1) this.routes.pop();
  }
  /** @returns True when navigation currently displays its root route. */
  isHome() {
    return this.routes.length === 1;
  }
};

// src/presentation/ink/route-screen.tsx
import { useEffect, useState as useState2 } from "react";
import { Box as Box2, Text as Text2 } from "ink";

// src/presentation/ink/menu-list.tsx
import { useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { jsx, jsxs } from "react/jsx-runtime";
function MenuList(props) {
  const enabled = useMemo(() => props.items.filter((item) => !item.disabled), [props.items]);
  const [selected, setSelected] = useState(0);
  const selectedItem = enabled[selected];
  useInput((_input, key) => {
    if (enabled.length === 0) return;
    if (key.upArrow) setSelected((value) => (value - 1 + enabled.length) % enabled.length);
    if (key.downArrow) setSelected((value) => (value + 1) % enabled.length);
    if (key.return && selectedItem != null) props.onSelect(selectedItem);
  });
  return /* @__PURE__ */ jsx(Box, { flexDirection: "column", children: props.items.map((item) => /* @__PURE__ */ jsxs(Text, { color: item.disabled ? "gray" : item === selectedItem ? "cyan" : void 0, children: [
    item === selectedItem ? "\u203A " : "  ",
    item.label,
    item.disabled ? " (disabled)" : ""
  ] }, item.id)) });
}

// src/presentation/ink/route-screen.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function RouteScreen(props) {
  if (props.route === "init") {
    return /* @__PURE__ */ jsx2(
      InitRoute,
      {
        initializeProject: props.session.initializeProject,
        rows: props.rows
      }
    );
  }
  return /* @__PURE__ */ jsx2(
    HomeRoute,
    {
      onExitRequest: props.onExitRequest,
      onNavigate: props.onNavigate,
      rows: props.rows,
      session: props.session
    }
  );
}
function HomeRoute(props) {
  const [projectFound, setProjectFound] = useState2(props.session.projectFound);
  useEffect(() => {
    setProjectFound(props.session.projectExists());
  }, [props.session]);
  const initializationItem = props.session.mode === "global" ? [
    {
      id: "init",
      label: "Initialize Project",
      disabled: projectFound
    }
  ] : [];
  const homeMenu = [
    ...initializationItem,
    { id: "exit", label: "Exit" }
  ];
  const menuRows = homeMenu.length;
  const separatorRows = 1;
  const contentRows = Math.max(1, props.rows - menuRows - separatorRows);
  return /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", height: props.rows, children: [
    /* @__PURE__ */ jsx2(Box2, { flexDirection: "column", height: contentRows, paddingX: 2, children: /* @__PURE__ */ jsx2(HomeContent, { session: props.session }) }),
    /* @__PURE__ */ jsx2(
      Box2,
      {
        borderStyle: "single",
        borderBottom: false,
        borderLeft: false,
        borderRight: false,
        height: separatorRows,
        width: "100%"
      }
    ),
    /* @__PURE__ */ jsx2(
      MenuList,
      {
        items: homeMenu,
        onSelect: (item) => {
          if (item.id === "init") props.onNavigate("init");
          if (item.id === "exit") props.onExitRequest();
        }
      }
    )
  ] });
}
function HomeContent(props) {
  const dispatcherSource = props.session.dispatcher.installSource === "local" ? "Local" : "Remote";
  const runtimeSource = props.session.runtime.projectLocal ? "Local" : "Global";
  return /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", children: [
    /* @__PURE__ */ jsxs2(Text2, { children: [
      /* @__PURE__ */ jsx2(Text2, { bold: true, color: "cyan", children: "Dispatcher:" }),
      " ",
      "(",
      dispatcherSource,
      ") ",
      props.session.dispatcher.installDirectory
    ] }),
    /* @__PURE__ */ jsxs2(Text2, { children: [
      /* @__PURE__ */ jsx2(Text2, { bold: true, color: "cyan", children: "Version:" }),
      " ",
      props.session.dispatcher.packageVersion
    ] }),
    /* @__PURE__ */ jsx2(Box2, { height: 1 }),
    /* @__PURE__ */ jsxs2(Text2, { children: [
      /* @__PURE__ */ jsx2(Text2, { bold: true, color: "cyan", children: "Runtime:" }),
      " ",
      "(",
      runtimeSource,
      ") ",
      props.session.runtime.executablePath
    ] }),
    /* @__PURE__ */ jsxs2(Text2, { children: [
      /* @__PURE__ */ jsx2(Text2, { bold: true, color: "cyan", children: "Version:" }),
      " ",
      props.session.runtime.packageVersion
    ] }),
    /* @__PURE__ */ jsxs2(Text2, { children: [
      /* @__PURE__ */ jsx2(Text2, { bold: true, color: "cyan", children: "Working Directory:" }),
      " ",
      props.session.cwd
    ] }),
    /* @__PURE__ */ jsx2(Box2, { height: 1 }),
    /* @__PURE__ */ jsxs2(Text2, { children: [
      /* @__PURE__ */ jsx2(Text2, { bold: true, color: "cyan", children: "Project Root:" }),
      " ",
      props.session.projectRoot ?? "None"
    ] })
  ] });
}
function InitRoute(props) {
  const [result, setResult] = useState2("Initializing project\u2026");
  useEffect(() => {
    try {
      props.initializeProject();
      setResult("Project initialized successfully.");
    } catch (error) {
      setResult(
        `Initialization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }, [props.initializeProject]);
  return /* @__PURE__ */ jsx2(Box2, { height: props.rows, paddingX: 2, children: /* @__PURE__ */ jsx2(Text2, { children: result }) });
}

// src/presentation/ink/use-stdout-size.ts
import { useEffect as useEffect2, useState as useState3 } from "react";
import { useStdout } from "ink";
function useStdoutSize() {
  const { stdout } = useStdout();
  const read = () => ({ columns: stdout.columns ?? 80, rows: stdout.rows ?? 24 });
  const [size, setSize] = useState3(read);
  useEffect2(() => {
    const onResize = () => setSize(read());
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);
  return size;
}

// src/presentation/ink/runtime-ui-app.tsx
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var EXIT_DIALOG_TIMEOUT_MS = 3e3;
function RuntimeUiApp(props) {
  const app = useApp();
  const size = useStdoutSize();
  const layout = useMemo2(
    () => new TerminalLayoutAllocator().allocate(size.rows),
    [size.rows]
  );
  const navigation = useMemo2(
    () => new NavigationStack(
      props.session.mode === "local" ? "local-home" : "global-home"
    ),
    [props.session.mode]
  );
  const [route, setRoute] = useState4(navigation.current());
  const routeTitle = route === "global-home" || route === "local-home" ? "Home" : route;
  const [exitConfirmationKey, setExitConfirmationKey] = useState4();
  const requestExit = useCallback(
    (confirmationKey) => setExitConfirmationKey(confirmationKey),
    []
  );
  useEffect3(() => {
    if (exitConfirmationKey == null) return;
    const timeout = setTimeout(
      () => setExitConfirmationKey(void 0),
      EXIT_DIALOG_TIMEOUT_MS
    );
    return () => clearTimeout(timeout);
  }, [exitConfirmationKey]);
  useInput2((_input, key) => {
    if (exitConfirmationKey === "escape" && key.escape) {
      app.exit();
      return;
    }
    if (exitConfirmationKey === "enter" && key.return) {
      app.exit();
      return;
    }
    if (exitConfirmationKey != null) return;
    if (!key.escape) return;
    if (navigation.isHome()) requestExit("escape");
    else {
      navigation.pop();
      setRoute(navigation.current());
    }
  });
  if (layout.requiresResize) {
    return /* @__PURE__ */ jsxs3(
      Box3,
      {
        height: layout.terminalRows,
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        children: [
          /* @__PURE__ */ jsx3(Text3, { bold: true, color: "yellow", children: "Terminal is too small" }),
          /* @__PURE__ */ jsxs3(Text3, { children: [
            "Resize to at least ",
            layout.minimumRows,
            " rows."
          ] })
        ]
      }
    );
  }
  return /* @__PURE__ */ jsxs3(
    Box3,
    {
      height: layout.terminalRows,
      width: size.columns,
      flexDirection: "column",
      children: [
        /* @__PURE__ */ jsx3(
          Box3,
          {
            height: layout.statusRows,
            flexShrink: 0,
            borderStyle: "single",
            paddingX: 1,
            children: /* @__PURE__ */ jsxs3(Text3, { bold: true, children: [
              "Spec N' Roll \xB7 ",
              routeTitle
            ] })
          }
        ),
        /* @__PURE__ */ jsxs3(Box3, { height: layout.contentRows, flexDirection: "column", children: [
          /* @__PURE__ */ jsx3(
            RouteScreen,
            {
              route,
              rows: layout.contentRows,
              onNavigate: (next) => {
                navigation.push(next);
                setRoute(navigation.current());
              },
              onExitRequest: () => requestExit("enter"),
              session: props.session
            }
          ),
          exitConfirmationKey != null ? /* @__PURE__ */ jsx3(
            Box3,
            {
              position: "absolute",
              height: layout.contentRows,
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
              children: /* @__PURE__ */ jsx3(
                Box3,
                {
                  borderStyle: "round",
                  paddingX: 2,
                  paddingY: 1,
                  backgroundColor: "black",
                  children: /* @__PURE__ */ jsxs3(Text3, { bold: true, color: "yellow", children: [
                    "Press ",
                    exitConfirmationKey,
                    " to exit"
                  ] })
                }
              )
            }
          ) : null
        ] }),
        /* @__PURE__ */ jsx3(
          Box3,
          {
            height: layout.hintRows,
            flexShrink: 0,
            borderStyle: "single",
            paddingX: 1,
            children: /* @__PURE__ */ jsx3(Text3, { color: "gray", children: "\u2191/\u2193 select \xB7 Enter open \xB7 Esc back" })
          }
        )
      ]
    }
  );
}

// src/infrastructure/ink/ink-runtime-ui-renderer.tsx
import { jsx as jsx4 } from "react/jsx-runtime";
var InkRuntimeUiRenderer = class {
  /**
   * Renders the interactive application and waits until it exits.
   *
   * @param session - Resolved mode, project state, and available commands.
   * @returns Promise fulfilled when Ink unmounts after user exit.
   */
  async render(session) {
    const instance = render(/* @__PURE__ */ jsx4(RuntimeUiApp, { session }));
    await instance.waitUntilExit();
    if (process.stdout.isTTY) process.stdout.write("\x1B[2J\x1B[H");
  }
};

// src/application/runtime/runtime-application.ts
import { Logger } from "tslog";

// src/application/ui/runtime-ui-mode-resolver.ts
var RuntimeUiModeResolver = class {
  /**
   * Resolves the initial UI mode from dispatcher-provided invocation context.
   *
   * @param invocation - Valid runtime invocation with preserved command arguments.
   * @returns Global for explicit global invocations or missing projects, otherwise local.
   */
  resolve(invocation) {
    return invocation.argv.includes("--global") || invocation.projectRoot == null ? "global" : "local";
  }
};

// src/application/init/init-command-resolver.ts
import { resolve } from "path";
var InitCommandResolver = class {
  /**
   * Resolves an init request from dispatcher-preserved arguments.
   *
   * @param argv - CLI arguments without the executable and script paths.
   * @param cwd - Working directory used when no root is supplied.
   * @param configuredRoot - Absolute dispatcher-resolved root for a root flag.
   * @returns Resolved request, or undefined when the invocation is not init.
   */
  resolve(argv, cwd, configuredRoot) {
    const initIndex = argv.indexOf("init");
    if (initIndex < 0) return void 0;
    const flaggedRoot = this.flagValue(argv, "--root");
    const positionalRoot = argv[initIndex + 1];
    if (flaggedRoot != null && configuredRoot != null) {
      return { projectRoot: configuredRoot };
    }
    const requestedRoot = flaggedRoot ?? (positionalRoot != null && !positionalRoot.startsWith("-") ? positionalRoot : ".");
    return { projectRoot: resolve(cwd, requestedRoot) };
  }
  /**
   * Reads a string option in either separated or equals form.
   *
   * @param argv - Full dispatcher-preserved argument list.
   * @param option - Long option name including its leading dashes.
   * @returns Supplied option value, otherwise undefined.
   */
  flagValue(argv, option) {
    const separatedIndex = argv.indexOf(option);
    if (separatedIndex >= 0) return argv[separatedIndex + 1];
    return argv.find((value) => value.startsWith(`${option}=`))?.slice(option.length + 1);
  }
};

// src/application/runtime/runtime-application.ts
var RuntimeApplication = class {
  /**
   * Creates a runtime application.
   *
   * @param reader - Input reader for dispatcher invocation JSON.
   * @param parser - Parser and validator for invocation payloads.
   * @param renderer - Interactive terminal UI presentation boundary.
   * @param projectInitializer - Project detection and local CLI installation boundary.
   * @param modeResolver - Resolver for global and local home selection.
   * @param initCommandResolver - Resolver for direct init command arguments.
   * @param logger - Logger used to report the invocation configuration received.
   */
  constructor(reader, parser, renderer, projectInitializer, modeResolver = new RuntimeUiModeResolver(), initCommandResolver = new InitCommandResolver(), logger = new Logger({
    name: "spec-n-roll-runtime",
    minLevel: 6
  })) {
    this.reader = reader;
    this.parser = parser;
    this.renderer = renderer;
    this.projectInitializer = projectInitializer;
    this.modeResolver = modeResolver;
    this.initCommandResolver = initCommandResolver;
    this.logger = logger;
  }
  reader;
  parser;
  renderer;
  projectInitializer;
  modeResolver;
  initCommandResolver;
  logger;
  /**
   * Executes the runtime stub by printing the dispatcher invocation.
   */
  async run() {
    const invocation = this.parser.parse(this.reader.read());
    this.logger.debug("Received dispatcher invocation.", {
      argv: invocation.argv,
      cwd: invocation.cwd,
      projectRoot: invocation.projectRoot,
      dispatcherInstallSource: invocation.dispatcher.installSource
    });
    const initRequest = this.initCommandResolver.resolve(
      invocation.argv,
      invocation.cwd,
      invocation.projectRoot
    );
    if (initRequest != null) {
      this.logger.info("Initializing Spec-N-Roll project.", {
        projectRoot: initRequest.projectRoot
      });
      this.projectInitializer.initialize(initRequest.projectRoot);
      return;
    }
    const projectOperationRoot = invocation.projectRoot ?? invocation.cwd;
    const projectFound = invocation.projectRoot != null && this.projectInitializer.projectExists(invocation.projectRoot);
    const mode = projectFound ? this.modeResolver.resolve(invocation) : "global";
    this.logger.debug("Launching interactive runtime UI.", {
      mode,
      projectRoot: invocation.projectRoot,
      projectFound
    });
    await this.renderer.render({
      mode,
      dispatcher: invocation.dispatcher,
      runtime: invocation.runtime,
      cwd: invocation.cwd,
      ...invocation.projectRoot == null ? {} : { projectRoot: invocation.projectRoot },
      projectFound,
      projectExists: () => this.projectInitializer.projectExists(projectOperationRoot),
      initializeProject: () => this.projectInitializer.initialize(projectOperationRoot)
    });
  }
};

// src/application/invocation/runtime-invocation-parser.ts
var RuntimeInvocationParser = class {
  /**
   * Parses a serialized dispatcher invocation.
   *
   * @param input - UTF-8 JSON text supplied by the dispatcher.
   * @returns Parsed runtime invocation.
   */
  parse(input) {
    if (input.trim() === "") {
      throw new Error("Runtime invocation payload was empty.");
    }
    const parsed = JSON.parse(input);
    if (!this.isRuntimeInvocation(parsed)) {
      throw new Error(
        "Runtime invocation payload did not match the dispatcher schema."
      );
    }
    return parsed;
  }
  /**
   * Checks whether an unknown value has the runtime invocation shape.
   *
   * @param value - Unknown parsed JSON value to inspect.
   * @returns true when the value satisfies the required invocation fields.
   */
  isRuntimeInvocation(value) {
    if (value == null || typeof value !== "object") {
      return false;
    }
    const candidate = value;
    return Array.isArray(candidate.argv) && candidate.argv.every((argument) => typeof argument === "string") && this.isDispatcherMetadata(candidate.dispatcher) && this.isRuntimeTarget(candidate.runtime) && typeof candidate.cwd === "string" && (candidate.projectRoot == null || typeof candidate.projectRoot === "string");
  }
  /**
   * Checks whether an unknown value has dispatcher metadata fields.
   *
   * @param value - Unknown parsed JSON value to inspect.
   * @returns true when the value satisfies dispatcher metadata fields.
   */
  isDispatcherMetadata(value) {
    if (value == null || typeof value !== "object") {
      return false;
    }
    const candidate = value;
    return (candidate.installSource === "remote" || candidate.installSource === "local") && typeof candidate.installDirectory === "string" && typeof candidate.packageVersion === "string";
  }
  /**
   * Checks whether an unknown value has selected runtime metadata fields.
   *
   * @param value - Unknown parsed JSON value to inspect.
   * @returns true when the value satisfies the required runtime fields.
   */
  isRuntimeTarget(value) {
    if (value == null || typeof value !== "object") {
      return false;
    }
    const candidate = value;
    return typeof candidate.executablePath === "string" && typeof candidate.packageVersion === "string" && typeof candidate.projectLocal === "boolean";
  }
};

// src/infrastructure/process/environment-runtime-invocation-reader.ts
import { RUNTIME_INVOCATION_ENVIRONMENT_VARIABLE } from "spec-n-roll-api";
var EnvironmentRuntimeInvocationReader = class {
  /**
   * Reads the invocation value from the private child-process environment entry.
   *
   * @returns Invocation JSON or an empty string when the dispatcher did not provide it.
   */
  read() {
    return process.env[RUNTIME_INVOCATION_ENVIRONMENT_VARIABLE] ?? "";
  }
};

// src/infrastructure/filesystem/node-project-initializer.ts
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  writeFileSync
} from "fs";
import { createRequire } from "module";
import { dirname, join } from "path";
import {
  LOCAL_CLI_RELATIVE_PATH_SEGMENTS,
  LOCAL_MCP_RELATIVE_PATH_SEGMENTS,
  SPEC_N_ROLL_CONFIG_DIRECTORY_NAME
} from "spec-n-roll-api";

// src/application/extensions/agents/codex-agent-extension-source.ts
var CodexAgentExtensionSource = class {
  /**
   * Returns the Codex extension module source.
   *
   * @returns ECMAScript module text for the Codex agent extension.
   */
  source() {
    return `import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Installs Spec-N-Roll skills and MCP configuration for Codex.
 */
export default class CodexAgentExtension {
  static defaultSkillMetadata = Object.freeze({
    author: 'spec-n-roll',
    version: '0.1.0',
  });

  /**
   * Creates Codex-native skill files for the supplied skill configurations.
   *
   * @param skills - Ordered skill configurations to write.
   * @returns A promise that resolves after all skill files are written.
   */
  async createSkills(skills) {
    for (const skill of skills) {
      const metadata = skill.metadata ?? CodexAgentExtension.defaultSkillMetadata;
      const skillPath = join(process.cwd(), '.codex', 'skills', skill.name, 'SKILL.md');
      const content = [
        '---',
        \`name: \${JSON.stringify(skill.name)}\`,
        \`description: \${JSON.stringify(skill.description)}\`,
        'metadata:',
        \`  author: \${JSON.stringify(metadata.author)}\`,
        \`  version: \${JSON.stringify(metadata.version)}\`,
        '---',
        '',
        ...skill.instructions.map((instruction) => instruction.content),
        '',
      ].join('\\n');
      await mkdir(dirname(skillPath), { recursive: true });
      await writeFile(skillPath, content, 'utf8');
    }
  }

  /**
   * Upserts the project-local Spec-N-Roll MCP server in Codex configuration.
   *
   * @returns A promise that resolves after the MCP configuration is written.
   */
  async configureMcp() {
    const configurationPath = join(process.cwd(), '.codex', 'mcp.json');
    const configuration = await CodexAgentExtension.readMcpConfiguration(configurationPath);
    await mkdir(dirname(configurationPath), { recursive: true });
    await writeFile(
      configurationPath,
      \`\${JSON.stringify({
        ...configuration,
        mcpServers: {
          ...configuration.mcpServers,
          'spec-n-roll': {
            command: 'node',
            args: ['./.spec-n-roll/cli/bin/spec-n-roll-mcp.js'],
          },
        },
      }, null, 2)}\\n\`,
      'utf8',
    );
  }

  /**
   * Reads the existing Codex MCP configuration or creates an empty server map.
   *
   * @param configurationPath - Absolute path to the Codex MCP configuration file.
   * @returns Parsed configuration with an MCP server map.
   */
  static async readMcpConfiguration(configurationPath) {
    try {
      const configuration = JSON.parse(await readFile(configurationPath, 'utf8'));
      return {
        ...configuration,
        mcpServers: configuration.mcpServers ?? {},
      };
    } catch (error) {
      if (error && error.code === 'ENOENT') return { mcpServers: {} };
      throw error;
    }
  }
}
`;
  }
};

// src/application/extensions/agents/cursor-agent-extension-source.ts
var CursorAgentExtensionSource = class {
  /**
   * Returns the Cursor extension module source.
   *
   * @returns ECMAScript module text for the Cursor agent extension.
   */
  source() {
    return `import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Installs Spec-N-Roll skills and MCP configuration for Cursor.
 */
export default class CursorAgentExtension {
  static defaultSkillMetadata = Object.freeze({
    author: 'spec-n-roll',
    version: '0.1.0',
  });

  /**
   * Creates Cursor-native skill files for the supplied skill configurations.
   *
   * @param skills - Ordered skill configurations to write.
   * @returns A promise that resolves after all skill files are written.
   */
  async createSkills(skills) {
    for (const skill of skills) {
      const metadata = skill.metadata ?? CursorAgentExtension.defaultSkillMetadata;
      const skillPath = join(process.cwd(), '.cursor', 'skills', skill.name, 'SKILL.md');
      const content = [
        '---',
        \`name: \${JSON.stringify(skill.name)}\`,
        \`description: \${JSON.stringify(skill.description)}\`,
        'metadata:',
        \`  author: \${JSON.stringify(metadata.author)}\`,
        \`  version: \${JSON.stringify(metadata.version)}\`,
        '---',
        '',
        ...skill.instructions.map((instruction) => instruction.content),
        '',
      ].join('\\n');
      await mkdir(dirname(skillPath), { recursive: true });
      await writeFile(skillPath, content, 'utf8');
    }
  }

  /**
   * Upserts the project-local Spec-N-Roll MCP server in Cursor configuration.
   *
   * @returns A promise that resolves after the MCP configuration is written.
   */
  async configureMcp() {
    const configurationPath = join(process.cwd(), '.cursor', 'mcp.json');
    const configuration = await CursorAgentExtension.readMcpConfiguration(configurationPath);
    await mkdir(dirname(configurationPath), { recursive: true });
    await writeFile(
      configurationPath,
      \`\${JSON.stringify({
        ...configuration,
        mcpServers: {
          ...configuration.mcpServers,
          'spec-n-roll': {
            command: 'node',
            args: ['./.spec-n-roll/cli/bin/spec-n-roll-mcp.js'],
          },
        },
      }, null, 2)}\\n\`,
      'utf8',
    );
  }

  /**
   * Reads the existing Cursor MCP configuration or creates an empty server map.
   *
   * @param configurationPath - Absolute path to the Cursor MCP configuration file.
   * @returns Parsed configuration with an MCP server map.
   */
  static async readMcpConfiguration(configurationPath) {
    try {
      const configuration = JSON.parse(await readFile(configurationPath, 'utf8'));
      return {
        ...configuration,
        mcpServers: configuration.mcpServers ?? {},
      };
    } catch (error) {
      if (error && error.code === 'ENOENT') return { mcpServers: {} };
      throw error;
    }
  }
}
`;
  }
};

// src/infrastructure/filesystem/node-project-initializer.ts
var NodeProjectInitializer = class {
  /**
   * Creates a Node-backed project initializer.
   *
   * @param runtimeBinaryPath - Absolute path to the running runtime binary to copy.
   * @param mcpBinaryPath - Absolute path to the bundled MCP server binary to copy.
   * @param codexAgentExtensionSource - Source provider for the bundled Codex extension module.
   * @param cursorAgentExtensionSource - Source provider for the bundled Cursor extension module.
   */
  constructor(runtimeBinaryPath = process.argv[1], mcpBinaryPath = createRequire(import.meta.url).resolve(
    "spec-n-roll-mcp/dist/index.js"
  ), codexAgentExtensionSource = new CodexAgentExtensionSource(), cursorAgentExtensionSource = new CursorAgentExtensionSource()) {
    this.runtimeBinaryPath = runtimeBinaryPath;
    this.mcpBinaryPath = mcpBinaryPath;
    this.codexAgentExtensionSource = codexAgentExtensionSource;
    this.cursorAgentExtensionSource = cursorAgentExtensionSource;
  }
  runtimeBinaryPath;
  mcpBinaryPath;
  codexAgentExtensionSource;
  cursorAgentExtensionSource;
  /**
   * Determines whether the project configuration directory exists.
   *
   * @param projectRoot - Absolute project root to inspect.
   * @returns true when `.spec-n-roll` exists.
   */
  projectExists(projectRoot) {
    return existsSync(join(projectRoot, SPEC_N_ROLL_CONFIG_DIRECTORY_NAME));
  }
  /**
   * Creates configuration storage and copies the runtime binary.
   *
   * @param projectRoot - Absolute project root receiving the installation.
   */
  initialize(projectRoot) {
    const runtimeBinaryPath = join(
      projectRoot,
      ...LOCAL_CLI_RELATIVE_PATH_SEGMENTS
    );
    mkdirSync(dirname(runtimeBinaryPath), { recursive: true });
    cpSync(this.runtimeBinaryPath, runtimeBinaryPath);
    if (process.platform !== "win32") chmodSync(runtimeBinaryPath, 493);
    this.copyMcpServer(projectRoot);
    this.writeExtensions(projectRoot);
  }
  /**
   * Copies the bundled MCP server into the project's local CLI directory.
   *
   * @param projectRoot - Absolute project root receiving the MCP server binary.
   */
  copyMcpServer(projectRoot) {
    const mcpBinaryPath = join(
      projectRoot,
      ...LOCAL_MCP_RELATIVE_PATH_SEGMENTS
    );
    mkdirSync(dirname(mcpBinaryPath), { recursive: true });
    cpSync(this.mcpBinaryPath, mcpBinaryPath);
    if (process.platform !== "win32") chmodSync(mcpBinaryPath, 493);
  }
  /**
   * Creates bundled agent extension folders and their enabled-state configuration.
   *
   * @param projectRoot - Absolute project root receiving the extension files.
   */
  writeExtensions(projectRoot) {
    const extensionsRoot = join(
      projectRoot,
      SPEC_N_ROLL_CONFIG_DIRECTORY_NAME,
      "extensions"
    );
    const agentsRoot = join(extensionsRoot, "agents");
    mkdirSync(join(agentsRoot, "codex"), { recursive: true });
    mkdirSync(join(agentsRoot, "cursor"), { recursive: true });
    writeFileSync(
      join(agentsRoot, "codex", "extension.mjs"),
      this.codexAgentExtensionSource.source(),
      "utf8"
    );
    writeFileSync(
      join(agentsRoot, "cursor", "extension.mjs"),
      this.cursorAgentExtensionSource.source(),
      "utf8"
    );
    writeFileSync(
      join(extensionsRoot, "extensions.json"),
      `${JSON.stringify({ agents: { codex: { enabled: true }, cursor: { enabled: true } } }, null, 2)}
`,
      "utf8"
    );
  }
};

// src/composition/runtime/runtime-composition-root.ts
var RuntimeCompositionRoot = class {
  /**
   * Creates the default process-backed runtime application.
   *
   * @returns Runtime application wired to process stdin and stdout.
   */
  createApplication() {
    return new RuntimeApplication(
      new EnvironmentRuntimeInvocationReader(),
      new RuntimeInvocationParser(),
      new InkRuntimeUiRenderer(),
      new NodeProjectInitializer()
    );
  }
};

// src/composition/runtime/runtime-program-factory.ts
import { Command } from "commander";
var RuntimeProgramFactory = class {
  /**
   * Creates the internal runtime command line program.
   *
   * @param application - Runtime application invoked by the command action.
   * @returns Commander program configured for the runtime executable.
   */
  create(application) {
    return new Command().name("spec-n-roll-runtime").description("Runs spec-n-roll runtime commands from dispatcher stdin.").version("0.1.0").allowUnknownOption(true).allowExcessArguments(true).action(async () => application.run());
  }
};

// src/presentation/cli/runtime-cli.ts
var RuntimeCli = class {
  /**
   * Creates runtime command-line wiring.
   *
   * @param compositionRoot - Factory for process-backed runtime dependencies.
   * @param programFactory - Factory for the Commander runtime program.
   * @param logger - Logger used to report fatal entrypoint errors.
   */
  constructor(compositionRoot = new RuntimeCompositionRoot(), programFactory = new RuntimeProgramFactory(), logger = new Logger2({
    name: "spec-n-roll-runtime",
    minLevel: 6
  })) {
    this.compositionRoot = compositionRoot;
    this.programFactory = programFactory;
    this.logger = logger;
  }
  compositionRoot;
  programFactory;
  logger;
  /**
   * Runs the internal runtime executable.
   *
   * @param argv - Process argument vector including executable and script path.
   */
  async run(argv = process.argv) {
    await this.programFactory.create(this.compositionRoot.createApplication()).parseAsync([...argv]);
  }
  /**
   * Runs the CLI when the supplied module URL is the current process entrypoint.
   *
   * @param moduleUrl - Import metadata URL for the module that owns the check.
   * @param argv - Process argument vector including executable and script path.
   */
  async runIfMain(moduleUrl, argv = process.argv) {
    if (!this.isMainModule(moduleUrl, argv)) {
      return;
    }
    try {
      await this.run(argv);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(message);
      process.exitCode = 1;
    }
  }
  /**
   * Checks whether a module is the current process entrypoint.
   *
   * @param moduleUrl - Import metadata URL for the module to inspect.
   * @param argv - Process argument vector including executable and script path.
   * @returns true when the module path matches the process script path.
   */
  isMainModule(moduleUrl, argv = process.argv) {
    if (argv[1] == null) {
      return false;
    }
    try {
      return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(resolve2(argv[1]));
    } catch {
      return false;
    }
  }
};

// src/infrastructure/process/console-runtime-output-writer.ts
var ConsoleRuntimeOutputWriter = class {
  /**
   * Writes a line of text to stdout.
   *
   * @param text - Text to write without a trailing newline.
   */
  writeLine(text) {
    process.stdout.write(`${text}
`);
  }
};

// src/infrastructure/extensions/node-extension-discoverer.ts
import { readFile } from "fs/promises";
import { join as join2 } from "path";
import {
  SPEC_N_ROLL_CONFIG_DIRECTORY_NAME as SPEC_N_ROLL_CONFIG_DIRECTORY_NAME2
} from "spec-n-roll-api";
var NodeExtensionDiscoverer = class {
  /**
   * Reads and validates the project's extension configuration without loading extensions.
   *
   * @param projectRoot - Absolute project root containing `.spec-n-roll`.
   * @returns Validated extension configuration.
   */
  async discover(projectRoot) {
    const configurationPath = join2(
      projectRoot,
      SPEC_N_ROLL_CONFIG_DIRECTORY_NAME2,
      "extensions",
      "extensions.json"
    );
    const content = await readFile(configurationPath, "utf8");
    return this.parse(JSON.parse(content), configurationPath);
  }
  /**
   * Validates the JSON shape used to control extension discovery.
   *
   * @param value - Parsed JSON document to validate.
   * @param configurationPath - Absolute file path included in validation errors.
   * @returns Validated extension configuration.
   */
  parse(value, configurationPath) {
    if (!this.isRecord(value) || !this.isRecord(value.agents)) {
      throw new Error(
        `Extension configuration at ${configurationPath} is invalid.`
      );
    }
    const agents = {};
    for (const [name, entry] of Object.entries(value.agents)) {
      if (!this.isRecord(entry) || typeof entry.enabled !== "boolean") {
        throw new Error(
          `Extension configuration at ${configurationPath} is invalid.`
        );
      }
      agents[name] = { enabled: entry.enabled };
    }
    return { agents };
  }
  /**
   * Determines whether a value is a non-array object record.
   *
   * @param value - Unknown value to inspect.
   * @returns true when the value is an object record.
   */
  isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
};

// src/index.ts
await new RuntimeCli().runIfMain(import.meta.url);
export {
  ConsoleRuntimeOutputWriter,
  EnvironmentRuntimeInvocationReader,
  InitCommandResolver,
  NodeExtensionDiscoverer,
  NodeProjectInitializer,
  RuntimeApplication,
  RuntimeCli,
  RuntimeCompositionRoot,
  RuntimeInvocationParser,
  RuntimeProgramFactory,
  RuntimeUiModeResolver,
  TerminalLayoutAllocator
};
//# sourceMappingURL=index.js.map