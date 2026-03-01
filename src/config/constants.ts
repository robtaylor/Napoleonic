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

/** Map bounds for Iberian Peninsula (lat/lng) */
export const IBERIA_BOUNDS = {
    minLng: -10.5,
    maxLng: 4.5,
    minLat: 35.5,
    maxLat: 44.0,
} as const;
