export function formatTime12Hour(timeStr) {
    if (!timeStr) return "";
    const trimmed = String(timeStr).trim();
    if (trimmed.toLowerCase().includes("am") || trimmed.toLowerCase().includes("pm")) {
        return trimmed;
    }
    const parts = trimmed.split(":");
    if (parts.length < 2) return trimmed;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1].slice(0, 2).padStart(2, "0");
    if (isNaN(hours)) return trimmed;

    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const formattedHours = String(hours).padStart(2, "0");

    return `${formattedHours}:${minutes} ${ampm}`;
}
