import type { FactionId } from "./factions";

export type NodeType = "capital" | "fortress" | "city" | "port";

export interface NodeDef {
    id: string;
    name: string;
    lat: number;
    lng: number;
    type: NodeType;
    /** Default starting faction for the 1808 scenario */
    startingFaction: FactionId;
}

/**
 * ~30 historical cities of the Peninsular War.
 * Coordinates are approximate city centers.
 */
export const NODES: NodeDef[] = [
    // === PORTUGAL (British-Portuguese) ===
    { id: "lisbon", name: "Lisbon", lat: 38.7223, lng: -9.1393, type: "capital", startingFaction: "british" },
    { id: "porto", name: "Porto", lat: 41.1579, lng: -8.6291, type: "port", startingFaction: "british" },
    { id: "coimbra", name: "Coimbra", lat: 40.2033, lng: -8.4103, type: "city", startingFaction: "british" },
    { id: "torres-vedras", name: "Torres Vedras", lat: 39.0918, lng: -9.2586, type: "fortress", startingFaction: "british" },
    { id: "almeida", name: "Almeida", lat: 40.7264, lng: -6.9064, type: "fortress", startingFaction: "british" },
    { id: "elvas", name: "Elvas", lat: 38.8810, lng: -7.1630, type: "fortress", startingFaction: "british" },
    { id: "figueira", name: "Figueira da Foz", lat: 40.1508, lng: -8.8618, type: "port", startingFaction: "british" },

    // === SPAIN - French controlled (1808 scenario) ===
    { id: "madrid", name: "Madrid", lat: 40.4168, lng: -3.7038, type: "capital", startingFaction: "french" },
    { id: "barcelona", name: "Barcelona", lat: 41.3874, lng: 2.1686, type: "port", startingFaction: "french" },
    { id: "burgos", name: "Burgos", lat: 42.3440, lng: -3.6969, type: "fortress", startingFaction: "french" },
    { id: "pamplona", name: "Pamplona", lat: 42.8125, lng: -1.6458, type: "fortress", startingFaction: "french" },
    { id: "san-sebastian", name: "San Sebastián", lat: 43.3183, lng: -1.9812, type: "port", startingFaction: "french" },
    { id: "vitoria", name: "Vitoria", lat: 42.8467, lng: -2.6726, type: "city", startingFaction: "french" },
    { id: "valladolid", name: "Valladolid", lat: 41.6523, lng: -4.7245, type: "city", startingFaction: "french" },
    { id: "zaragoza", name: "Zaragoza", lat: 41.6488, lng: -0.8891, type: "fortress", startingFaction: "french" },
    { id: "tarragona", name: "Tarragona", lat: 41.1189, lng: 1.2445, type: "port", startingFaction: "french" },
    { id: "tortosa", name: "Tortosa", lat: 40.8126, lng: 0.5216, type: "city", startingFaction: "french" },

    // === SPAIN - Spanish controlled / contested ===
    { id: "seville", name: "Seville", lat: 37.3891, lng: -5.9845, type: "capital", startingFaction: "spanish" },
    { id: "cadiz", name: "Cádiz", lat: 36.5271, lng: -6.2886, type: "port", startingFaction: "spanish" },
    { id: "valencia", name: "Valencia", lat: 39.4699, lng: -0.3763, type: "port", startingFaction: "spanish" },
    { id: "badajoz", name: "Badajoz", lat: 38.8794, lng: -6.9707, type: "fortress", startingFaction: "spanish" },
    { id: "ciudad-rodrigo", name: "Ciudad Rodrigo", lat: 40.5990, lng: -6.5316, type: "fortress", startingFaction: "spanish" },
    { id: "salamanca", name: "Salamanca", lat: 40.9701, lng: -5.6635, type: "city", startingFaction: "spanish" },
    { id: "talavera", name: "Talavera", lat: 39.9635, lng: -4.8309, type: "city", startingFaction: "spanish" },
    { id: "cordoba", name: "Córdoba", lat: 37.8882, lng: -4.7794, type: "city", startingFaction: "spanish" },
    { id: "granada", name: "Granada", lat: 37.1773, lng: -3.5986, type: "city", startingFaction: "spanish" },
    { id: "la-coruna", name: "La Coruña", lat: 43.3623, lng: -8.4115, type: "port", startingFaction: "spanish" },
    { id: "vigo", name: "Vigo", lat: 42.2328, lng: -8.7226, type: "port", startingFaction: "spanish" },
    { id: "bailen", name: "Bailén", lat: 38.0932, lng: -3.7754, type: "city", startingFaction: "spanish" },
    { id: "bilbao", name: "Bilbao", lat: 43.2630, lng: -2.9350, type: "port", startingFaction: "spanish" },
];
