#!/usr/bin/env node

import { AtlasCompositionRoot } from '#composition/AtlasCompositionRoot.js';

/**
 * Runs the Atlas executable with arguments supplied by the Node.js process.
 */
const exitCode = await new AtlasCompositionRoot().createCli().run(process.argv.slice(2));

process.exitCode = exitCode;
