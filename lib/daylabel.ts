type Slot = { day?: number } | null | undefined;

const DAY_MAP: Record<number, string> = { 
    0: 'Di', // Dimanche (format JavaScript Date)
    1: 'Lu', 
    2: 'Ma', 
    3: 'Me', 
    4: 'Je', 
    5: 'Ve', 
    6: 'Sa', 
    7: 'Di'  // Dimanche (format alternatif 1-7)
};

export function getDayLabels(slots?: Slot[]): string[] {
    const availableDays = new Set<number>();
    (slots ?? []).forEach(s => { 
        if (s && typeof s.day === 'number' && s.day >= 0 && s.day <= 7) {
            availableDays.add(s.day);
        }
    });
    return Array.from(availableDays).sort().map(d => DAY_MAP[d] ?? String(d));
}

export function getDayLabelById(id?: number): string {
    if (typeof id !== 'number') return '';
    return DAY_MAP[id] ?? String(id);
}