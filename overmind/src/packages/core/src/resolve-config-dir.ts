import path from 'node:path';

export function resolveCliConfigDir(configDir: string | undefined): string {
    const explicitConfigDir = configDir?.trim();
    if (explicitConfigDir && explicitConfigDir.length > 0) {
        return path.resolve(explicitConfigDir);
    }

    const envConfigDir = process.env['OVERMIND_CONFIG_DIR']?.trim();
    if (envConfigDir && envConfigDir.length > 0) {
        return path.resolve(envConfigDir);
    }

    throw new Error('Missing Overmind config directory. Pass --config-dir or set OVERMIND_CONFIG_DIR.');
}