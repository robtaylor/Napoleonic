import Phaser from "phaser";

/** Period-appropriate color palette — Napoleonic-era cartography tones */
export const UI_COLORS = {
    parchment: 0xd4c5a0,
    panelBorder: 0x8b7d5e,
    goldAccent: 0xddaa22,
    goldDark: 0xb8891a,
    darkBrown: 0x3d2b1f,
    inkBrown: 0x5a4a32,
    shadow: 0x1a1208,
} as const;

/**
 * Draw a parchment-style panel with double-line border and subtle drop shadow.
 * All drawing is additive to `gfx` — caller owns the Graphics object.
 */
export function drawParchmentPanel(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    alpha = 0.85,
): void {
    const r = 6;

    // Drop shadow
    gfx.fillStyle(UI_COLORS.shadow, alpha * 0.3);
    gfx.fillRoundedRect(x + 3, y + 3, w, h, r);

    // Main fill
    gfx.fillStyle(UI_COLORS.parchment, alpha);
    gfx.fillRoundedRect(x, y, w, h, r);

    // Outer border
    gfx.lineStyle(2, UI_COLORS.panelBorder, alpha);
    gfx.strokeRoundedRect(x, y, w, h, r);

    // Inner border (inset 4px)
    gfx.lineStyle(1, UI_COLORS.panelBorder, alpha * 0.5);
    gfx.strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, r > 4 ? r - 2 : 2);
}

/**
 * Draw a decorative horizontal rule with optional center diamond ornament
 * and small end dots.
 */
export function drawHorizontalRule(
    gfx: Phaser.GameObjects.Graphics,
    cx: number,
    y: number,
    width: number,
    withDiamond = true,
): void {
    const halfW = width / 2;

    // Main line
    gfx.lineStyle(1, UI_COLORS.panelBorder, 0.7);
    gfx.beginPath();
    gfx.moveTo(cx - halfW, y);
    gfx.lineTo(cx + halfW, y);
    gfx.strokePath();

    // End dots
    gfx.fillStyle(UI_COLORS.panelBorder, 0.7);
    gfx.fillCircle(cx - halfW, y, 2);
    gfx.fillCircle(cx + halfW, y, 2);

    // Center diamond ornament
    if (withDiamond) {
        gfx.fillStyle(UI_COLORS.goldAccent, 0.8);
        const s = 4;
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
 * Draw L-shaped gilt corner ornaments on all 4 corners of a rectangle.
 */
export function drawCornerOrnaments(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    size = 14,
): void {
    gfx.lineStyle(2, UI_COLORS.goldDark, 0.8);

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

    // Corner dots
    gfx.fillStyle(UI_COLORS.goldDark, 0.6);
    gfx.fillCircle(x, y, 2);
    gfx.fillCircle(x + w, y, 2);
    gfx.fillCircle(x, y + h, 2);
    gfx.fillCircle(x + w, y + h, 2);
}

/**
 * Draw a small starburst / star ornament — useful as a section divider.
 */
export function drawStarburst(
    gfx: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    radius = 6,
    points = 8,
): void {
    gfx.fillStyle(UI_COLORS.goldAccent, 0.7);
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
