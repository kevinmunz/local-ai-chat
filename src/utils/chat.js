export function createErrorNotice(text) {
    return {
        id: crypto.randomUUID(),
        role: "app",
        text,
        createdAt: new Date().toISOString()
    };
}
