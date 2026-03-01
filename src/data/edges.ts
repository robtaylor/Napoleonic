/**
 * Road connections between cities.
 * Each edge is a pair of node IDs representing a bidirectional road.
 * Based on historical road networks of the Peninsular War era,
 * with geographic barriers (Pyrenees, Sierra Morena, rivers) factored in.
 */
export type EdgeDef = [string, string];

export const EDGES: EdgeDef[] = [
    // === PORTUGAL internal ===
    ["lisbon", "torres-vedras"],
    ["lisbon", "elvas"],
    ["torres-vedras", "coimbra"],
    ["torres-vedras", "figueira"],
    ["coimbra", "figueira"],
    ["coimbra", "porto"],
    ["coimbra", "almeida"],
    ["porto", "figueira"],
    ["elvas", "badajoz"],

    // === Portugal-Spain border crossings ===
    ["almeida", "ciudad-rodrigo"],
    ["porto", "vigo"],
    ["elvas", "lisbon"],

    // === Northern Spain (French axis) ===
    ["san-sebastian", "pamplona"],
    ["san-sebastian", "bilbao"],
    ["pamplona", "vitoria"],
    ["pamplona", "zaragoza"],
    ["vitoria", "bilbao"],
    ["vitoria", "burgos"],
    ["burgos", "valladolid"],
    ["burgos", "madrid"],

    // === Catalonia / Aragon ===
    ["barcelona", "tarragona"],
    ["tarragona", "tortosa"],
    ["tortosa", "valencia"],
    ["zaragoza", "tarragona"],
    ["zaragoza", "tortosa"],
    ["barcelona", "zaragoza"],

    // === Central Spain ===
    ["madrid", "valladolid"],
    ["madrid", "talavera"],
    ["madrid", "zaragoza"],
    ["madrid", "valencia"],
    ["talavera", "salamanca"],
    ["salamanca", "valladolid"],
    ["salamanca", "ciudad-rodrigo"],

    // === Southern Spain ===
    ["talavera", "cordoba"],
    ["cordoba", "seville"],
    ["cordoba", "bailen"],
    ["cordoba", "granada"],
    ["seville", "cadiz"],
    ["seville", "badajoz"],
    ["bailen", "granada"],
    ["bailen", "madrid"],
    ["granada", "valencia"],

    // === Galicia ===
    ["la-coruna", "vigo"],
    ["la-coruna", "porto"],
    ["vigo", "porto"],

    // === Cross-connections ===
    ["badajoz", "ciudad-rodrigo"],
    ["valencia", "tarragona"],
];
