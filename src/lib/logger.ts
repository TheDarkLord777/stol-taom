export const logger = {
    info: (...args: unknown[]) => {
        // eslint-disable-next-line no-console
        console.info(...args);
    },
    warn: (...args: unknown[]) => {
        // eslint-disable-next-line no-console
        console.warn(...args);
    },
    error: (...args: unknown[]) => {
        // eslint-disable-next-line no-console
        console.error(...args);
    },
};
