#!/usr/bin/env node

import { Program } from "./Program.js";

process.exitCode = new Program().run(process.argv.slice(2));
