export class StreamEventListener<TEvent> {
    private readonly listeners = new Set<(event: TEvent) => void>();

    subscribe(listener: (event: TEvent) => void): void {
        this.listeners.add(listener);
    }

    send(event: TEvent): void {
        this.listeners.forEach((listener) => listener(event));
    }

    unsubscribeAll(): void {
        this.listeners.clear();
    }
}

export class StreamEventListeners {
    private readonly listeners: StreamEventListener<any>[] = [];
    constructor() { }

    createListener<TEvent>(): StreamEventListener<TEvent> {
        const eventListener = new StreamEventListener<TEvent>();
        this.listeners.push(eventListener);
        return eventListener;
    }

    unsubscribeAll(): void {
        this.listeners.forEach((listener) => {
            listener.unsubscribeAll();
        });
        this.listeners.length = 0;
    }
}