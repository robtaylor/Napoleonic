import type { FactionId } from "./factions";

export interface ScenarioDef {
    id: string;
    name: string;
    year: number;
    description: string;
    /** Override starting faction for specific nodes (node ID -> faction) */
    overrides: Record<string, FactionId>;
}

/**
 * Historical scenarios with different starting positions.
 * The default 1808 positions come from nodes.ts startingFaction.
 * Scenarios here provide overrides from that default.
 */
export const SCENARIOS: ScenarioDef[] = [
    {
        id: "1808",
        name: "The French Invasion",
        year: 1808,
        description:
            "Napoleon's forces occupy key Spanish cities. The British land in Portugal. Spain rises in revolt.",
        overrides: {},
    },
    {
        id: "1810",
        name: "High Tide of Empire",
        year: 1810,
        description:
            "France controls most of Spain. Wellington holds Portugal behind the Lines of Torres Vedras.",
        overrides: {
            "seville": "french",
            "cordoba": "french",
            "granada": "french",
            "salamanca": "french",
            "valencia": "french",
            "ciudad-rodrigo": "french",
            "bailen": "french",
        },
    },
    {
        id: "1812",
        name: "The Tide Turns",
        year: 1812,
        description:
            "Wellington breaks out from Portugal. The Spanish guerrillas weaken French supply lines.",
        overrides: {
            "ciudad-rodrigo": "british",
            "badajoz": "british",
            "salamanca": "british",
            "seville": "french",
            "cordoba": "french",
            "granada": "french",
            "valencia": "french",
        },
    },
];
