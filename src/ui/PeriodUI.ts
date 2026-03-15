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
    ink: 0x1a1008,
    /** Slightly lighter ink for secondary text */
    inkLight: 0x3d2e1a,
    /** Ruled line color */
    rule: 0x8b7d5e,
    /** Faded rule for subtle dividers */
    ruleFaint: 0xb8a882,
    /** Shadow behind panels */
    shadow: 0x1a1208,
} as const;

/** Hex color strings matching UI_COLORS for Phaser text */
export const INK = "#1a1008";
export const INK_LIGHT = "#3d2e1a";
export const INK_FAINT = "#6b5d45";

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
 * Simple seeded pseudo-random number generator (mulberry32).
 * Returns values in [0, 1). Deterministic for consistent torn edges.
 */
function seededRandom(seed: number): () => number {
    let s = seed | 0;
    return () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Draw a rough-edged parchment page — like an old document with
 * worn/torn edges. Uses deterministic randomness so the shape is
 * stable across redraws.
 *
 * @param margin Inset from canvas edges (the rough edge lives in this margin)
 * @param roughness Max perpendicular displacement in px
 * @param segments Number of edge subdivisions per side
 */
export function drawRoughParchmentPage(
    gfx: Phaser.GameObjects.Graphics,
    canvasW: number,
    canvasH: number,
    margin = 18,
    roughness = 6,
    segments = 40,
    seed = 42,
): void {
    const rand = seededRandom(seed);

    // Generate points along each edge with perpendicular offsets
    const points: { x: number; y: number }[] = [];

    const x0 = margin;
    const y0 = margin;
    const x1 = canvasW - margin;
    const y1 = canvasH - margin;

    // Top edge (left to right)
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const jitter = (rand() - 0.5) * 2 * roughness;
        points.push({ x: x0 + t * (x1 - x0), y: y0 + jitter });
    }
    // Right edge (top to bottom), skip first (already added as last of top)
    for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const jitter = (rand() - 0.5) * 2 * roughness;
        points.push({ x: x1 + jitter, y: y0 + t * (y1 - y0) });
    }
    // Bottom edge (right to left)
    for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const jitter = (rand() - 0.5) * 2 * roughness;
        points.push({ x: x1 - t * (x1 - x0), y: y1 + jitter });
    }
    // Left edge (bottom to top)
    for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const jitter = (rand() - 0.5) * 2 * roughness;
        points.push({ x: x0 + jitter, y: y1 - t * (y1 - y0) });
    }

    // Drop shadow (offset 3px down-right)
    gfx.fillStyle(UI_COLORS.shadow, 0.25);
    gfx.beginPath();
    gfx.moveTo(points[0]!.x + 3, points[0]!.y + 3);
    for (let i = 1; i < points.length; i++) {
        gfx.lineTo(points[i]!.x + 3, points[i]!.y + 3);
    }
    gfx.closePath();
    gfx.fillPath();

    // Fill parchment
    gfx.fillStyle(UI_COLORS.parchment, 1);
    gfx.beginPath();
    gfx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
        gfx.lineTo(points[i]!.x, points[i]!.y);
    }
    gfx.closePath();
    gfx.fillPath();

    // Subtle edge darkening (draw a slightly inset stroke)
    gfx.lineStyle(1, UI_COLORS.inkLight, 0.15);
    gfx.beginPath();
    gfx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
        gfx.lineTo(points[i]!.x, points[i]!.y);
    }
    gfx.closePath();
    gfx.strokePath();
}

/**
 * Draw a HUD-style panel with rough papery edges — parchment fill
 * with torn-edge silhouette. Designed for in-game overlays over terrain.
 */
export type ScrollOrientation = "default" | "horizontal" | "vertical";

export function drawHUDPanel(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    alpha = 0.88,
    seed = 0,
    scroll: ScrollOrientation = "default",
): void {
    // Scale segments and roughness to panel size
    const perimeter = 2 * (w + h);
    const segs = Math.max(20, Math.round(perimeter / 5));
    const roughness = 2;
    const rand = seededRandom(seed || Math.round(x * 7 + y * 13));

    const x0 = x;
    const y0 = y;
    const x1 = x + w;
    const y1 = y + h;

    // Side segment counts proportional to edge length
    const topSegs = Math.max(3, Math.round(segs * w / perimeter));
    const rightSegs = Math.max(3, Math.round(segs * h / perimeter));
    const botSegs = topSegs;
    const leftSegs = rightSegs;

    // Determine which edges get rough treatment based on scroll orientation:
    // "horizontal" scroll: rough top/bottom, smooth left/right (unfurls horizontally)
    // "vertical" scroll: rough left/right, smooth top/bottom (unfurls vertically)
    // "default": rough on all edges
    const roughTop = scroll !== "vertical";
    const roughBot = scroll !== "vertical";
    const roughLeft = scroll !== "horizontal";
    const roughRight = scroll !== "horizontal";

    const points: { x: number; y: number }[] = [];

    // Top edge
    for (let i = 0; i <= topSegs; i++) {
        const t = i / topSegs;
        const jitter = roughTop ? (rand() - 0.5) * 2 * roughness : 0;
        points.push({ x: x0 + t * (x1 - x0), y: y0 + jitter });
    }
    // Right edge
    for (let i = 1; i <= rightSegs; i++) {
        const t = i / rightSegs;
        const jitter = roughRight ? (rand() - 0.5) * 2 * roughness : 0;
        points.push({ x: x1 + jitter, y: y0 + t * (y1 - y0) });
    }
    // Bottom edge
    for (let i = 1; i <= botSegs; i++) {
        const t = i / botSegs;
        const jitter = roughBot ? (rand() - 0.5) * 2 * roughness : 0;
        points.push({ x: x1 - t * (x1 - x0), y: y1 + jitter });
    }
    // Left edge
    for (let i = 1; i < leftSegs; i++) {
        const t = i / leftSegs;
        const jitter = roughLeft ? (rand() - 0.5) * 2 * roughness : 0;
        points.push({ x: x0 + jitter, y: y1 - t * (y1 - y0) });
    }

    // Drop shadow
    gfx.fillStyle(UI_COLORS.shadow, 0.2);
    gfx.beginPath();
    gfx.moveTo(points[0]!.x + 2, points[0]!.y + 2);
    for (let i = 1; i < points.length; i++) {
        gfx.lineTo(points[i]!.x + 2, points[i]!.y + 2);
    }
    gfx.closePath();
    gfx.fillPath();

    // Fill parchment
    gfx.fillStyle(UI_COLORS.parchmentDark, alpha);
    gfx.beginPath();
    gfx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
        gfx.lineTo(points[i]!.x, points[i]!.y);
    }
    gfx.closePath();
    gfx.fillPath();

    // Subtle edge stroke
    gfx.lineStyle(0.75, UI_COLORS.ink, 0.2);
    gfx.beginPath();
    gfx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
        gfx.lineTo(points[i]!.x, points[i]!.y);
    }
    gfx.closePath();
    gfx.strokePath();
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

/**
 * Draw a keyboard key-cap box — light rounded rect with ink border
 * and subtle bottom shadow, like a physical key.
 */
export function drawKeyBox(
    gfx: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w = 14,
    h = 14,
): void {
    const r = 2;
    // Bottom shadow (pressed-key effect)
    gfx.fillStyle(UI_COLORS.ink, 0.15);
    gfx.fillRoundedRect(x, y + 1, w, h, r);
    // Key face
    gfx.fillStyle(UI_COLORS.parchmentLight, 0.9);
    gfx.fillRoundedRect(x, y, w, h, r);
    // Border
    gfx.lineStyle(0.8, UI_COLORS.ink, 0.5);
    gfx.strokeRoundedRect(x, y, w, h, r);
}

/**
 * Draw a miniature node shape in neutral gray for the map legend.
 */
export function drawMiniNode(
    gfx: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    type: "capital" | "fortress" | "port" | "city",
    radius = 5,
): void {
    const gray = 0x666666;
    gfx.fillStyle(gray, 0.9);
    gfx.lineStyle(1, UI_COLORS.ink, 0.6);

    switch (type) {
        case "capital": {
            gfx.fillCircle(cx, cy, radius);
            gfx.strokeCircle(cx, cy, radius);
            // Tiny gold star
            gfx.fillStyle(0xffd700, 0.8);
            const sr = 3;
            const ir = 1.2;
            gfx.beginPath();
            for (let i = 0; i < 10; i++) {
                const angle = (i * Math.PI) / 5 - Math.PI / 2;
                const r = i % 2 === 0 ? sr : ir;
                const px = cx + Math.cos(angle) * r;
                const py = cy + Math.sin(angle) * r;
                if (i === 0) gfx.moveTo(px, py);
                else gfx.lineTo(px, py);
            }
            gfx.closePath();
            gfx.fillPath();
            break;
        }
        case "fortress": {
            const s = radius;
            gfx.fillRect(cx - s, cy - s, s * 2, s * 2);
            gfx.strokeRect(cx - s, cy - s, s * 2, s * 2);
            // Crenellation notches
            const nw = 2.5;
            const nh = 2.5;
            gfx.fillStyle(gray, 0.9);
            for (let i = 0; i < 3; i++) {
                const nx = cx - s + 1 + i * (s * 2 - 2) / 3 + (s * 2 - 2) / 6 - nw / 2;
                gfx.fillRect(nx, cy - s - nh, nw, nh);
                gfx.lineStyle(0.8, UI_COLORS.ink, 0.6);
                gfx.strokeRect(nx, cy - s - nh, nw, nh);
            }
            break;
        }
        case "port": {
            gfx.fillCircle(cx, cy, radius);
            gfx.strokeCircle(cx, cy, radius);
            // Tiny anchor hint
            gfx.lineStyle(1, 0xffffff, 0.5);
            gfx.beginPath();
            gfx.moveTo(cx, cy - 2);
            gfx.lineTo(cx, cy + 3);
            gfx.strokePath();
            gfx.beginPath();
            gfx.moveTo(cx - 2, cy);
            gfx.lineTo(cx + 2, cy);
            gfx.strokePath();
            break;
        }
        default: {
            gfx.fillCircle(cx, cy, radius);
            gfx.strokeCircle(cx, cy, radius);
            break;
        }
    }
}

/**
 * Draw a miniature dispatch unit shape in neutral gray.
 */
export function drawMiniDispatch(
    gfx: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    type: "troops" | "scout" | "engineer",
    size = 4,
): void {
    gfx.fillStyle(0x666666, 0.9);
    gfx.lineStyle(0.8, UI_COLORS.ink, 0.6);

    switch (type) {
        case "scout": {
            gfx.beginPath();
            gfx.moveTo(cx, cy - size);
            gfx.lineTo(cx + size, cy);
            gfx.lineTo(cx, cy + size);
            gfx.lineTo(cx - size, cy);
            gfx.closePath();
            gfx.fillPath();
            gfx.strokePath();
            break;
        }
        case "engineer": {
            gfx.fillRect(cx - size, cy - size, size * 2, size * 2);
            gfx.strokeRect(cx - size, cy - size, size * 2, size * 2);
            break;
        }
        default: {
            gfx.fillCircle(cx, cy, size);
            gfx.strokeCircle(cx, cy, size);
            break;
        }
    }
}

/**
 * Draw a circular parchment action button for mobile UI.
 * Filled circle with ink border; highlighted border when active.
 */
export function drawActionButton(
    gfx: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    radius: number,
    active = false,
): void {
    // Drop shadow
    gfx.fillStyle(UI_COLORS.shadow, 0.2);
    gfx.fillCircle(cx + 1, cy + 1, radius);
    // Fill
    gfx.fillStyle(UI_COLORS.parchmentDark, 0.92);
    gfx.fillCircle(cx, cy, radius);
    // Border
    const borderAlpha = active ? 0.9 : 0.5;
    const borderWidth = active ? 2 : 1;
    gfx.lineStyle(borderWidth, active ? 0xcc2222 : UI_COLORS.ink, borderAlpha);
    gfx.strokeCircle(cx, cy, radius);
}

/**
 * Draw a d-pad arrow triangle on a circular parchment button.
 * Direction: 0=up, 1=right, 2=down, 3=left.
 */
export function drawDPadArrow(
    gfx: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    direction: number,
    radius: number,
): void {
    // Button background
    drawActionButton(gfx, cx, cy, radius);

    // Arrow triangle
    const arrowSize = radius * 0.45;
    gfx.fillStyle(UI_COLORS.ink, 0.7);
    gfx.beginPath();
    const angle = (direction * Math.PI) / 2 - Math.PI / 2; // 0=up
    const tipX = cx + Math.cos(angle) * arrowSize;
    const tipY = cy + Math.sin(angle) * arrowSize;
    const baseAngle1 = angle + (Math.PI * 2) / 3;
    const baseAngle2 = angle - (Math.PI * 2) / 3;
    const baseR = arrowSize * 0.7;
    gfx.moveTo(tipX, tipY);
    gfx.lineTo(cx + Math.cos(baseAngle1) * baseR, cy + Math.sin(baseAngle1) * baseR);
    gfx.lineTo(cx + Math.cos(baseAngle2) * baseR, cy + Math.sin(baseAngle2) * baseR);
    gfx.closePath();
    gfx.fillPath();
}

/**
 * Draw a short line segment sample for edge styles.
 */
export function drawMiniEdge(
    gfx: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    style: "solid" | "dashed",
): void {
    if (style === "dashed") {
        gfx.lineStyle(2, 0xffaa44, 0.8);
        const dashLen = 4;
        const gapLen = 3;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = dx / len;
        const ny = dy / len;
        let pos = 0;
        while (pos < len) {
            const end = Math.min(pos + dashLen, len);
            gfx.beginPath();
            gfx.moveTo(x1 + nx * pos, y1 + ny * pos);
            gfx.lineTo(x1 + nx * end, y1 + ny * end);
            gfx.strokePath();
            pos = end + gapLen;
        }
    } else {
        gfx.lineStyle(2, 0x4a3c28, 0.75);
        gfx.beginPath();
        gfx.moveTo(x1, y1);
        gfx.lineTo(x2, y2);
        gfx.strokePath();
    }
}

/**
 * Draw a small supply arc sample — green to yellow to red gradient.
 */
export function drawMiniSupplyArc(
    gfx: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    radius = 6,
): void {
    const segments = 12;
    const startAngle = -Math.PI / 2;
    const totalAngle = Math.PI * 1.5;

    for (let i = 0; i < segments; i++) {
        const t = i / segments;
        // Green → Yellow → Red
        const r = t < 0.5 ? Math.floor(255 * t * 2) : 255;
        const g = t > 0.5 ? Math.floor(255 * (1 - t) * 2) : 255;
        const color = (r << 16) | (g << 8) | 0;

        gfx.lineStyle(2, color, 0.8);
        const a1 = startAngle + totalAngle * (i / segments);
        const a2 = startAngle + totalAngle * ((i + 1) / segments);
        gfx.beginPath();
        gfx.arc(cx, cy, radius, a1, a2, false);
        gfx.strokePath();
    }
}
