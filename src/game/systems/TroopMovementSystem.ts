import { TROOP_SPEED, SCOUT_SPEED_MULTIPLIER } from "../../config/constants";
import { distance } from "../../utils/math";
import type { GameState } from "../state/GameState";
import type { TroopDispatch } from "../state/TroopDispatch";

/**
 * Moves in-flight troop dispatches along their edges.
 * Returns list of dispatches that have arrived this frame.
 *
 * Scouts move at SCOUT_SPEED_MULTIPLIER times normal speed.
 */
export class TroopMovementSystem {
    update(state: GameState, deltaMs: number): TroopDispatch[] {
        const arrived: TroopDispatch[] = [];
        const deltaSec = deltaMs / 1000;

        for (const dispatch of state.dispatches) {
            const edgeLen = distance(
                dispatch.fromX,
                dispatch.fromY,
                dispatch.toX,
                dispatch.toY,
            );
            if (edgeLen === 0) {
                arrived.push(dispatch);
                continue;
            }

            const speedMultiplier = dispatch.dispatchType === "scout" ? SCOUT_SPEED_MULTIPLIER : 1;
            const progressPerSec = (TROOP_SPEED * speedMultiplier) / edgeLen;
            dispatch.progress += progressPerSec * deltaSec;

            if (dispatch.progress >= 1) {
                dispatch.progress = 1;
                arrived.push(dispatch);
            }
        }

        return arrived;
    }
}
