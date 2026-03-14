/** Troop generation rates per tick by node type */
export const TROOP_GEN_RATE = {
    capital: 3,
    fortress: 2,
    city: 1,
    port: 1,
} as const;

/** Milliseconds between troop generation ticks */
export const TROOP_GEN_INTERVAL_MS = 1000;

/** Fraction of troops sent on dispatch (0-1) */
export const DISPATCH_FRACTION = 0.5;

/** Troop movement speed in pixels per second */
export const TROOP_SPEED = 120;

/** Game duration in seconds (0 = no limit) */
export const GAME_DURATION_S = 300;

/** Node visual radius in pixels */
export const NODE_RADIUS = 14;

/** Minimum troops to keep at a node when dispatching */
export const MIN_GARRISON = 1;

/** Starting troops for each node type */
export const STARTING_TROOPS = {
    capital: 10,
    fortress: 6,
    city: 4,
    port: 4,
} as const;

/** Faction color definitions */
export const FACTION_COLORS = {
    french: 0x2255aa,
    british: 0xcc2222,
    spanish: 0xddaa22,
    neutral: 0x888888,
} as const;

// === Supply System ===

/** Maximum supply value for a node */
export const SUPPLY_MAX = 100;

/** Supply drain rate per second when unsupplied */
export const SUPPLY_DRAIN_PER_SEC = 3;

/** Supply restore rate per second when supplied */
export const SUPPLY_RESTORE_PER_SEC = 5;

/** Supply threshold below which troops start dying */
export const SUPPLY_ATTRITION_THRESHOLD = 30;

/** Troop loss per tick when below attrition threshold (applied at TROOP_GEN_INTERVAL_MS) */
export const SUPPLY_ATTRITION_TROOPS = 1;

/**
 * Supply sources per faction.
 * French: Madrid (capital) + Pamplona/San Sebastián (border from France)
 * British: Lisbon (capital) — ports added dynamically
 * Spanish: Seville (capital) only
 */
export const SUPPLY_SOURCES: Record<string, string[]> = {
    french: ["madrid", "pamplona", "san-sebastian"],
    british: ["lisbon"],
    spanish: ["seville", "bilbao"],
};

/** Allied factions that can share supply routes */
export const SUPPLY_ALLIES: Record<string, string[]> = {
    french: [],
    british: ["spanish"],
    spanish: ["british"],
};

// === Allied Transit ===

/** Supply drained from origin node per allied hop during gather-chain dispatch */
export const ALLIED_TRANSIT_SUPPLY_COST = 15;

// === Guerrilla Battalion System ===

/** Troop cost to deploy a guerrilla battalion */
export const GUERRILLA_DEPLOY_COST = 5;

/** Seconds between guerrilla supply drain ticks */
export const GUERRILLA_TICK_INTERVAL_S = 8;

/** Supply drained from each adjacent enemy node per tick */
export const GUERRILLA_SUPPLY_DRAIN = 15;

/** Seconds between ambushes for a single battalion */
export const GUERRILLA_AMBUSH_COOLDOWN_S = 10;

/** Min troops killed per ambush */
export const GUERRILLA_AMBUSH_DAMAGE_MIN = 1;

/** Max troops killed per ambush */
export const GUERRILLA_AMBUSH_DAMAGE_MAX = 3;

// === Fortification (Engineer Platoons) ===

/** Troop cost to start fortifying a node */
export const FORTIFY_COST = 8;

/** Time in seconds to complete fortification */
export const FORTIFY_BUILD_TIME_S = 15;

/** Damage reduction multiplier when attacking a fortified node (0.7 = 30% less damage) */
export const FORTIFY_DEFENSE_MULTIPLIER = 0.7;

// === Road Building (Engineers) ===

/** Troop cost to build a new road */
export const ROAD_BUILD_COST = 10;

/** Time in seconds to complete road construction */
export const ROAD_BUILD_TIME_S = 20;

/** Maximum hop distance for road building targets (must be exactly this many hops away) */
export const ROAD_MAX_HOP_DISTANCE = 2;

// === Scouting ===

/** Troop cost to send a scout */
export const SCOUT_COST = 3;

/** Scout speed multiplier (relative to normal troop speed) */
export const SCOUT_SPEED_MULTIPLIER = 2;

/** Duration in seconds that a scouted status lasts */
export const SCOUT_DURATION_S = 15;

/** Combat bonus multiplier when attacking a scouted node (1.15 = +15%) */
export const SCOUT_ATTACK_BONUS = 1.15;

// === Victory Conditions ===

/** French domination: hold this many nodes for FRENCH_HOLD_DURATION_S continuous seconds */
export const FRENCH_DOMINATION_NODES = 20;
export const FRENCH_HOLD_DURATION_S = 60;

/** British victory: French must drop to this many or fewer nodes */
export const BRITISH_FRENCH_MAX_NODES = 5;
/** British+Spanish must hold this many combined */
export const BRITISH_ALLIED_MIN_NODES = 20;

/** Spanish victory: activates after this many seconds of elapsed time */
export const SPANISH_VICTORY_DELAY_S = 180;
/** Spanish must hold at least this many nodes */
export const SPANISH_MIN_NODES = 5;

// === Edge Visuals ===

/** Base edge line color */
export const EDGE_COLOR = 0x6b5b3e;
/** Base edge line alpha */
export const EDGE_ALPHA = 0.5;
/** Base edge line width */
export const EDGE_WIDTH = 2.0;
/** Edge highlight color (dispatch target) */
export const EDGE_HIGHLIGHT_COLOR = 0x88ff88;
/** Edge highlight alpha */
export const EDGE_HIGHLIGHT_ALPHA = 0.6;
/** Edge highlight width */
export const EDGE_HIGHLIGHT_WIDTH = 2.5;
/** Edge construction color */
export const EDGE_CONSTRUCTION_COLOR = 0xffaa44;
/** Edge construction alpha */
export const EDGE_CONSTRUCTION_ALPHA = 0.5;
/** Edge construction width */
export const EDGE_CONSTRUCTION_WIDTH = 1.5;

// === Fog of War ===

/** Alpha for unscouted enemy nodes */
export const FOG_NODE_ALPHA = 0.45;
/** Alpha for edges between two unscouted nodes */
export const FOG_EDGE_ALPHA = 0.15;
/** Font size for "?" on unscouted nodes */
export const FOG_QUESTION_FONT_SIZE = "14px";
/** Color for "?" on unscouted nodes */
export const FOG_QUESTION_COLOR = "#8888aa";

// === Supply Route Visuals ===

/** Supply route glow color (warm amber) */
export const SUPPLY_ROUTE_COLOR = 0xc9a84c;
/** Supply route glow alpha */
export const SUPPLY_ROUTE_ALPHA = 0.5;
/** Supply route glow width */
export const SUPPLY_ROUTE_WIDTH = 2;
/** Supply route update interval in ms */
export const SUPPLY_ROUTE_UPDATE_MS = 500;

// === Combat Feedback ===

/** Combat flash duration in ms */
export const COMBAT_FLASH_DURATION_MS = 400;
/** Capture bounce scale */
export const CAPTURE_BOUNCE_SCALE = 1.25;
/** Capture bounce duration in ms */
export const CAPTURE_BOUNCE_DURATION_MS = 150;
/** Major capture camera shake duration in ms */
export const CAMERA_SHAKE_DURATION_MS = 80;
/** Major capture camera shake intensity */
export const CAMERA_SHAKE_INTENSITY = 0.003;
/** Reinforcement ring pulse duration in ms */
export const REINFORCEMENT_PULSE_DURATION_MS = 500;
/** Reinforcement ring color */
export const REINFORCEMENT_PULSE_COLOR = 0x44dd44;

// === Incoming Threat Indicators ===

/** Progress threshold (0-1) at which threat indicator appears */
export const THREAT_PROGRESS_THRESHOLD = 0.7;
/** Threat indicator pulse speed (ms per cycle, used in Math.sin) */
export const THREAT_PULSE_SPEED = 250;
/** Threat indicator color */
export const THREAT_COLOR = "#ff4444";

/** Map bounds for Iberian Peninsula (lat/lng) */
export const IBERIA_BOUNDS = {
    minLng: -10.5,
    maxLng: 4.5,
    minLat: 35.5,
    maxLat: 44.0,
} as const;

// === Terrain Palette ===

/** Traditional topographic color palette for elevation-based terrain coloring */
export const TERRAIN_PALETTE: { elevation: number; color: [number, number, number] }[] = [
    { elevation: 0, color: [90, 165, 40] },        // #5AA528 — bright green (coastal lowlands)
    { elevation: 150, color: [145, 185, 60] },      // #91B93C — yellow-green
    { elevation: 300, color: [175, 200, 80] },      // #AFC850 — light yellow-green
    { elevation: 500, color: [255, 215, 135] },     // #FFD787 — pale yellow/cream
    { elevation: 700, color: [245, 170, 90] },      // #F5AA5A — light orange/tan
    { elevation: 1000, color: [175, 120, 70] },     // #AF7846 — medium brown
    { elevation: 1500, color: [125, 85, 40] },      // #7D5528 — dark brown
    { elevation: 2500, color: [110, 70, 25] },      // #6E4619 — darkest brown (peaks)
];
