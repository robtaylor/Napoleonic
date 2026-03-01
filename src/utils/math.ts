/** Linear interpolation between a and b by factor t (0..1) */
export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

/** Euclidean distance between two points */
export function distance(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/** Clamp value between min and max */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}
