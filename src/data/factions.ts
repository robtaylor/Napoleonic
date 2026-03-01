import { FACTION_COLORS } from "../config/constants";

export type FactionId = "french" | "british" | "spanish" | "neutral";

export interface FactionDef {
    id: FactionId;
    name: string;
    color: number;
    textColor: string;
}

export const FACTIONS: Record<FactionId, FactionDef> = {
    french: {
        id: "french",
        name: "French Empire",
        color: FACTION_COLORS.french,
        textColor: "#4488dd",
    },
    british: {
        id: "british",
        name: "British-Portuguese",
        color: FACTION_COLORS.british,
        textColor: "#dd4444",
    },
    spanish: {
        id: "spanish",
        name: "Spanish Resistance",
        color: FACTION_COLORS.spanish,
        textColor: "#ddaa22",
    },
    neutral: {
        id: "neutral",
        name: "Neutral",
        color: FACTION_COLORS.neutral,
        textColor: "#aaaaaa",
    },
};
