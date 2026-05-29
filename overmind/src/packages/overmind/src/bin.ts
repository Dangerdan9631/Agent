#!/usr/bin/env node
import 'reflect-metadata';

import { exit } from 'node:process';
import { buildServiceContainer } from './di/container';
import { OvermindService } from './service/overmind-service';

exit(
    await (
        buildServiceContainer()
            .resolve(OvermindService)
            .run(process.argv)
    )
);

