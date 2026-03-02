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
    spanish: ["seville"],
};

/** Allied factions that can share supply routes */
export const SUPPLY_ALLIES: Record<string, string[]> = {
    french: [],
    british: ["spanish"],
    spanish: ["british"],
};

// === Guerrilla System ===

/** Seconds between guerrilla raid checks */
export const GUERRILLA_INTERVAL_S = 8;

/** Base probability of a guerrilla raid per eligible French node */
export const GUERRILLA_BASE_CHANCE = 0.3;

/** Min/max troops killed per guerrilla raid */
export const GUERRILLA_TROOP_DAMAGE_MIN = 1;
export const GUERRILLA_TROOP_DAMAGE_MAX = 3;

/** Supply drained per guerrilla raid */
export const GUERRILLA_SUPPLY_DRAIN = 15;

/** Spanish node thresholds for guerrilla intensity scaling */
export const GUERRILLA_LOW_THRESHOLD = 4;
export const GUERRILLA_HIGH_THRESHOLD = 9;

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

/** Map bounds for Iberian Peninsula (lat/lng) */
export const IBERIA_BOUNDS = {
    minLng: -10.5,
    maxLng: 4.5,
    minLat: 35.5,
    maxLat: 44.0,
} as const;
