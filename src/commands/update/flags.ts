export interface UpdateFlags {
    check: boolean;
    yes: boolean;
}

export function parseFlags(options: any): UpdateFlags {
    return {
        check: !!options.check,
        yes: !!options.yes,
    };
}
