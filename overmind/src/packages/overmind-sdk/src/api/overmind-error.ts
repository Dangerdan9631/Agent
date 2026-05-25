
export class OvermindError extends Error {
    constructor(code: string, message: string) {
        super(message);
        this.name = new.target.name;
    }
}

export function missingConfigDirError(): OvermindError {
    return new OvermindError(
        'MISSING_CONFIG_DIR',
        'Overmind config dir not specified.'
    );
}
