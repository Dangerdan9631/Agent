import { once } from 'node:events';
import net from 'node:net';

import { NodeIo, RPCChannel } from 'kkrpc';

type RpcApi = object;

async function _connectRpcSocket(pipePath: string): Promise<net.Socket> {
    const socket = net.createConnection(pipePath);

    try {
        await once(socket, 'connect');
        return socket;
    } catch (error) {
        socket.destroy();
        throw error;
    }
}

function _createRpcChannel<TLocalApi extends RpcApi, TRemoteApi extends RpcApi>(
    socket: net.Socket,
    localApi?: TLocalApi,
): RPCChannel<TLocalApi, TRemoteApi> {
    const io = new NodeIo(socket, socket);

    if (!localApi) {
        return new RPCChannel<TLocalApi, TRemoteApi>(io);
    }

    return new RPCChannel<TLocalApi, TRemoteApi>(io, { expose: localApi });
}

async function _closeRpcSocket(socket: net.Socket): Promise<void> {
    if (socket.destroyed) {
        return;
    }

    socket.end();

    if (!socket.destroyed) {
        await once(socket, 'close');
    }
}