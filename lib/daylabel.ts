type Slot = { day?: number } | null | undefined;

export function getDayLabels(slots?: Slot[]): string[] {
    const availableDays = new Set<number>();
    (slots ?? []).forEach(s => { if (s && typeof s.day === 'number') availableDays.add(s.day); });
    const map: Record<number, string> = { 1: 'Lu', 2: 'Ma', 3: 'Me', 4: 'Je', 5: 'Ve', 6: 'Sa', 7: 'Di' };
    return Array.from(availableDays).map(d => map[d] ?? String(d));
}

// Exemple d'utilisation:
// const labels = getDayLabels([{ day: 1 }, { day: 3 }, null]);