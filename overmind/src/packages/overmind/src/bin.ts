#!/usr/bin/env node
import 'reflect-metadata';

import { exit } from 'node:process';

import { buildServiceContainer } from './di/container';
import { OvermindConnectionHandler } from './service/overmind-connection-handler';
import { OvermindService } from './service/overmind-service';

const container = buildServiceContainer();

exit(
    await (
        container
            .resolve(OvermindService)
            .run(process.argv, container.resolve(OvermindConnectionHandler))
    )
);

