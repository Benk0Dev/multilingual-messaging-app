function startOfLocalDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayDiffFromToday(date: Date): number {
    const today = startOfLocalDay(new Date());
    const target = startOfLocalDay(date);
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((today.getTime() - target.getTime()) / msPerDay);
}

function formatWeekday(date: Date): string {
    return date.toLocaleDateString(undefined, { weekday: "long" });
}

function formatCalendarDate(date: Date): string {
    return date.toLocaleDateString("en-GB");
}

export function formatTime(date: Date): string {
    return date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

// Chat list item format: time, Yesterday, Weekday, DD/MM/YYYY
export function formatChatListDate(date: Date): string {
    const diff = dayDiffFromToday(date);

    if (diff === 0) return formatTime(date);
    if (diff === 1) return "Yesterday";
    if (diff > 1 && diff < 7) return formatWeekday(date);
    return formatCalendarDate(date);
}

// Chat screen/date-pill format: Today, Weekday, DD/MM/YYYY
export function formatChatDatePill(date: Date): string {
    const diff = dayDiffFromToday(date);

    if (diff === 0) return "Today";
    if (diff > 0 && diff < 7) return formatWeekday(date);
    return formatCalendarDate(date);
}
