export function formatMessageTime(createdAt) {
    if (!createdAt) return "";

    const date = new Date(createdAt.replace(" ", "T") + "Z");

    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
}

export function formatMessageDate(createdAt) {
    const date = new Date(createdAt);

    const month = date.toLocaleDateString("en-US", {
        month: "short"
    }).toUpperCase();

    return `${month} ${date.getDate()} ${date.getFullYear()}`;
}
