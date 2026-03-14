import Phaser from "phaser";

/**
 * Period-appropriate color palette — Napoleonic-era document tones.
 * Inspired by actual 1800s military documents: warm parchment background,
 * dark ink text, thin ruled lines.
 */
export const UI_COLORS = {
    /** Warm aged parchment — page background */
    parchment: 0xe8daba,
    /** Slightly darker parchment for inset panels */
    parchmentDark: 0xd4c5a0,
    /** Subtle tint for hover/selection highlights */
    parchmentLight: 0xf0e6d0,
    /** Dark ink for rules and borders */
    ink: 0x2b1d0e,
    /** Slightly lighter ink for secondary text */
    inkLight: 0x5a4a32,
    /** Ruled line color */
    rule: 0x8b7d5e,
    /** Faded rule for subtle dividers */
    ruleFaint: 0xb8a882,
    /** Shadow behind panels */
    shadow: 0x1a1208,
} as const;

/** Hex color strings matching UI_COLORS for Phaser text */
export const INK = "#2b1d0e";
export const INK_LIGHT = "#5a4a32";
export const INK_FAINT = "#8b7d5e";

/** Faction uniform colors for jacks/swatches */
export const FACTION_JACK_COLORS: Record<string, number> = {
    french: 0x2255aa,
    british: 0xcc2222,
    spanish: 0xddaa22,
    neutral: 0x888888,
};

/** Font families — Cinzel loaded via Google Fonts in index.html */
export const FONT_TITLE = "'Cinzel Decorative', Georgia, serif";
export const FONT_HEADING = "'Cinzel', Georgia, serif";
export const FONT_BODY = "'Cinzel', Georgia, serif";

/**
 * Draw a parchment-style panel with double-line border and subtle drop shadow.
 */
export function drawParchmentPanel(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    alpha = 0.85,
): void {
    const r = 4;

    // Drop shadow
    gfx.fillStyle(UI_COLORS.shadow, alpha * 0.2);
    gfx.fillRoundedRect(x + 2, y + 2, w, h, r);

    // Main fill
    gfx.fillStyle(UI_COLORS.parchmentDark, alpha);
    gfx.fillRoundedRect(x, y, w, h, r);

    // Outer border
    gfx.lineStyle(1.5, UI_COLORS.ink, alpha * 0.6);
    gfx.strokeRoundedRect(x, y, w, h, r);

    // Inner border (inset 3px) — thinner, like period document double-rule
    gfx.lineStyle(0.5, UI_COLORS.ink, alpha * 0.3);
    gfx.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, r > 3 ? r - 1 : 2);
}

/**
 * Draw a decorative horizontal rule — thin ink line with optional center diamond.
 * Inspired by the ruled dividers in Napoleonic-era documents.
 */
export function drawHorizontalRule(
    gfx: Phaser.GameObjects.Graphics,
    cx: number,
    y: number,
    width: number,
    withDiamond = true,
): void {
    const halfW = width / 2;

    // Main thin rule
    gfx.lineStyle(0.8, UI_COLORS.ink, 0.4);
    gfx.beginPath();
    gfx.moveTo(cx - halfW, y);
    gfx.lineTo(cx + halfW, y);
    gfx.strokePath();

    // Small end serifs (short vertical ticks)
    gfx.lineStyle(0.8, UI_COLORS.ink, 0.4);
    gfx.beginPath();
    gfx.moveTo(cx - halfW, y - 3);
    gfx.lineTo(cx - halfW, y + 3);
    gfx.strokePath();
    gfx.beginPath();
    gfx.moveTo(cx + halfW, y - 3);
    gfx.lineTo(cx + halfW, y + 3);
    gfx.strokePath();

    // Center diamond ornament
    if (withDiamond) {
        gfx.fillStyle(UI_COLORS.ink, 0.4);
        const s = 3;
        gfx.beginPath();
        gfx.moveTo(cx, y - s);
        gfx.lineTo(cx + s, y);
        gfx.lineTo(cx, y + s);
        gfx.lineTo(cx - s, y);
        gfx.closePath();
        gfx.fillPath();
    }
}

/**
 * Draw a double-ruled box around text — like the "CAVALERIE" framing
 * in period military documents. Outer thick rule + inner thin rule.
 */
export function drawDoubleRuleBox(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
): void {
    // Outer rule
    gfx.lineStyle(1.5, UI_COLORS.ink, 0.5);
    gfx.strokeRect(x, y, w, h);
    // Inner rule (inset 3px)
    gfx.lineStyle(0.5, UI_COLORS.ink, 0.35);
    gfx.strokeRect(x + 3, y + 3, w - 6, h - 6);
}

/**
 * Draw L-shaped corner ornaments on all 4 corners.
 */
export function drawCornerOrnaments(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    size = 14,
): void {
    gfx.lineStyle(1.5, UI_COLORS.ink, 0.4);

    // Top-left
    gfx.beginPath();
    gfx.moveTo(x, y + size);
    gfx.lineTo(x, y);
    gfx.lineTo(x + size, y);
    gfx.strokePath();

    // Top-right
    gfx.beginPath();
    gfx.moveTo(x + w - size, y);
    gfx.lineTo(x + w, y);
    gfx.lineTo(x + w, y + size);
    gfx.strokePath();

    // Bottom-left
    gfx.beginPath();
    gfx.moveTo(x, y + h - size);
    gfx.lineTo(x, y + h);
    gfx.lineTo(x + size, y + h);
    gfx.strokePath();

    // Bottom-right
    gfx.beginPath();
    gfx.moveTo(x + w - size, y + h);
    gfx.lineTo(x + w, y + h);
    gfx.lineTo(x + w, y + h - size);
    gfx.strokePath();
}

/**
 * Draw a small starburst / star ornament.
 */
export function drawStarburst(
    gfx: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    radius = 5,
    points = 6,
): void {
    gfx.fillStyle(UI_COLORS.ink, 0.35);
    const innerR = radius * 0.4;

    gfx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const r = i % 2 === 0 ? radius : innerR;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        if (i === 0) {
            gfx.moveTo(px, py);
        } else {
            gfx.lineTo(px, py);
        }
    }
    gfx.closePath();
    gfx.fillPath();
}

/**
 * Draw a faction jack — a small colored rectangle like a military
 * uniform color patch, used to identify factions instead of colored text.
 */
export function drawFactionJack(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    factionId: string,
    w = 14,
    h = 10,
): void {
    const color = FACTION_JACK_COLORS[factionId] ?? 0x888888;
    // Filled swatch
    gfx.fillStyle(color, 0.9);
    gfx.fillRect(x, y, w, h);
    // Thin border
    gfx.lineStyle(0.8, UI_COLORS.ink, 0.5);
    gfx.strokeRect(x, y, w, h);
}
