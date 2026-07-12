import { AgentLister, SdkLoggerFactory } from 'spec-n-roll-sdk';
import { ConsoleRuntimeOutputWriter } from '#runtime/infrastructure/process/console-runtime-output-writer.js';
import { NodeExtensionDiscoverer } from '#runtime/infrastructure/extensions/node-extension-discoverer.js';
import { InkRuntimeUiRenderer } from '#runtime/infrastructure/ink/ink-runtime-ui-renderer.jsx';
import { RuntimeApplication } from '#runtime/application/runtime/runtime-application.js';
import { RuntimeInvocationParser } from '#runtime/application/invocation/runtime-invocation-parser.js';
import { EnvironmentRuntimeInvocationReader } from '#runtime/infrastructure/process/environment-runtime-invocation-reader.js';
import { NodeProjectInitializer } from '#runtime/infrastructure/filesystem/node-project-initializer.js';
import { RuntimeUiModeResolver } from '#runtime/application/ui/runtime-ui-mode-resolver.js';
import { NodeGlobalFrameworkUpdater } from '#runtime/infrastructure/update/node-global-framework-updater.js';
import { FrameworkUpdateAvailabilityResolver } from '#runtime/application/update/framework-update-availability-resolver.js';
import { NodeRuntimeReloader } from '#runtime/infrastructure/update/node-runtime-reloader.js';
import { InitCommandResolver } from '#runtime/application/init/init-command-resolver.js';

/**
 * Wires process-backed runtime dependencies.
 */
export class RuntimeCompositionRoot {
  /**
   * Creates the default process-backed runtime application.
   *
   * @returns Runtime application wired to process stdin and stdout.
   */
  createApplication(): RuntimeApplication {
    return new RuntimeApplication(
      new EnvironmentRuntimeInvocationReader(),
      new RuntimeInvocationParser(),
      new InkRuntimeUiRenderer(),
      new NodeProjectInitializer(),
      new RuntimeUiModeResolver(),
      new InitCommandResolver(),
      new AgentLister(new NodeExtensionDiscoverer(), new SdkLoggerFactory().create()),
      new ConsoleRuntimeOutputWriter(),
      new NodeGlobalFrameworkUpdater(),
      new FrameworkUpdateAvailabilityResolver(),
      new NodeRuntimeReloader(),
    );
  }
}






