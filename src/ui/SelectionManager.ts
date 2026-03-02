import type { NodeSprite } from "./NodeSprite";
import type { EdgeLine } from "./EdgeLine";
import { EDGES } from "../data/edges";

export type DispatchMode = "troops" | "engineer" | "scout";

/**
 * Manages node selection and dispatch flow.
 * Click an owned node to select it, then click a connected node to dispatch.
 *
 * Controls:
 * - Single click: select node / dispatch troops
 * - Double click connected node: dispatch scout
 * - E key with node selected: dispatch engineer (fortify)
 * - R key with node selected: enter road-build mode (highlights 2-hop targets)
 */
export class SelectionManager {
    private selectedNodeId: string | null = null;
    private nodeSprites: Map<string, NodeSprite>;
    private edgeLines: EdgeLine[];
    /** Adjacency: node ID -> set of neighbor IDs (updated when roads are built) */
    private adjacency: Map<string, Set<string>>;

    /** Double-click detection */
    private lastClickNodeId: string | null = null;
    private lastClickTime = 0;
    private static readonly DOUBLE_CLICK_MS = 400;

    /** Road-build mode: when active, clicking a valid 2-hop target builds a road */
    private roadBuildMode = false;
    private roadBuildTargets: Set<string> = new Set();

    constructor(
        nodeSprites: Map<string, NodeSprite>,
        edgeLines: EdgeLine[],
    ) {
        this.nodeSprites = nodeSprites;
        this.edgeLines = edgeLines;

        // Build adjacency map
        this.adjacency = new Map();
        for (const [from, to] of EDGES) {
            if (!this.adjacency.has(from)) this.adjacency.set(from, new Set());
            if (!this.adjacency.has(to)) this.adjacency.set(to, new Set());
            this.adjacency.get(from)!.add(to);
            this.adjacency.get(to)!.add(from);
        }

        // Set up click handlers on all nodes
        for (const [nodeId, sprite] of this.nodeSprites) {
            sprite.on("pointerdown", () => this.onNodeClick(nodeId));
        }
    }

    getSelectedNodeId(): string | null {
        return this.selectedNodeId;
    }

    getNeighbors(nodeId: string): Set<string> {
        return this.adjacency.get(nodeId) ?? new Set();
    }

    isInRoadBuildMode(): boolean {
        return this.roadBuildMode;
    }

    /** Called when a dispatch is to be made - override in GameScene */
    onDispatch: ((fromId: string, toId: string, mode: DispatchMode) => void) | null = null;

    /** Called when fortify is requested on a selected node */
    onFortify: ((nodeId: string) => void) | null = null;

    /** Called when road build is requested: (fromId, targetId) */
    onRoadBuild: ((fromId: string, targetId: string) => void) | null = null;

    /** Called to get valid road-build targets for a node */
    getRoadTargets: ((nodeId: string) => string[]) | null = null;

    /** Notify the selection manager that a new edge has been added (keep adjacency in sync) */
    addEdge(fromId: string, toId: string): void {
        if (!this.adjacency.has(fromId)) this.adjacency.set(fromId, new Set());
        if (!this.adjacency.has(toId)) this.adjacency.set(toId, new Set());
        this.adjacency.get(fromId)!.add(toId);
        this.adjacency.get(toId)!.add(fromId);
    }

    /** Handle key presses */
    handleKeyPress(key: string): void {
        if (key === "e" || key === "E") {
            if (this.selectedNodeId && this.onFortify) {
                this.onFortify(this.selectedNodeId);
            }
        } else if (key === "r" || key === "R") {
            this.toggleRoadBuildMode();
        } else if (key === "Escape") {
            if (this.roadBuildMode) {
                this.exitRoadBuildMode();
            }
        }
    }

    private toggleRoadBuildMode(): void {
        if (!this.selectedNodeId) return;

        if (this.roadBuildMode) {
            this.exitRoadBuildMode();
            return;
        }

        // Enter road-build mode: get valid targets from GameScene
        if (!this.getRoadTargets) return;
        const targets = this.getRoadTargets(this.selectedNodeId);
        if (targets.length === 0) return;

        this.roadBuildMode = true;
        this.roadBuildTargets = new Set(targets);

        // Clear normal highlights and show road targets instead
        this.highlightNeighbors(this.selectedNodeId, false);
        for (const targetId of targets) {
            const sprite = this.nodeSprites.get(targetId);
            if (sprite) sprite.setHighlightRoadTarget(true);
        }
    }

    private exitRoadBuildMode(): void {
        // Clear road highlights
        for (const targetId of this.roadBuildTargets) {
            const sprite = this.nodeSprites.get(targetId);
            if (sprite) sprite.setHighlightRoadTarget(false);
        }
        this.roadBuildMode = false;
        this.roadBuildTargets.clear();

        // Restore normal neighbor highlights if still selected
        if (this.selectedNodeId) {
            this.highlightNeighbors(this.selectedNodeId, true);
        }
    }

    private onNodeClick(nodeId: string): void {
        const now = Date.now();
        const isDoubleClick =
            this.lastClickNodeId === nodeId &&
            (now - this.lastClickTime) < SelectionManager.DOUBLE_CLICK_MS;

        this.lastClickNodeId = nodeId;
        this.lastClickTime = now;

        // Road-build mode: clicking a valid target builds the road
        if (this.roadBuildMode && this.selectedNodeId) {
            if (this.roadBuildTargets.has(nodeId)) {
                if (this.onRoadBuild) {
                    this.onRoadBuild(this.selectedNodeId, nodeId);
                }
                this.exitRoadBuildMode();
                this.deselect();
                return;
            }
            // Clicking anything else exits road-build mode
            this.exitRoadBuildMode();
            // Fall through to normal handling
        }

        if (this.selectedNodeId === null) {
            // First click: select this node
            this.select(nodeId);
        } else if (this.selectedNodeId === nodeId) {
            // Click same node: deselect
            this.deselect();
        } else if (this.getNeighbors(this.selectedNodeId).has(nodeId)) {
            // Click connected node: dispatch
            if (this.onDispatch) {
                const mode: DispatchMode = isDoubleClick ? "scout" : "troops";
                this.onDispatch(this.selectedNodeId, nodeId, mode);
            }
            this.deselect();
        } else {
            // Click non-connected node: switch selection
            this.deselect();
            this.select(nodeId);
        }
    }

    private select(nodeId: string): void {
        this.selectedNodeId = nodeId;
        const sprite = this.nodeSprites.get(nodeId);
        if (sprite) sprite.setSelected(true);

        // Highlight connected nodes and edges
        this.highlightNeighbors(nodeId, true);
    }

    deselect(): void {
        if (this.roadBuildMode) {
            this.exitRoadBuildMode();
        }
        if (this.selectedNodeId) {
            const sprite = this.nodeSprites.get(this.selectedNodeId);
            if (sprite) sprite.setSelected(false);
            this.highlightNeighbors(this.selectedNodeId, false);
        }
        this.selectedNodeId = null;
    }

    private highlightNeighbors(nodeId: string, highlight: boolean): void {
        const neighbors = this.getNeighbors(nodeId);
        for (const neighborId of neighbors) {
            const sprite = this.nodeSprites.get(neighborId);
            if (sprite) sprite.setHighlightTarget(highlight);
        }

        // Highlight edges connected to this node
        const edgeData = EDGES;
        for (let i = 0; i < edgeData.length; i++) {
            const edge = edgeData[i]!;
            const line = this.edgeLines[i];
            if (!line) continue;
            if (edge[0] === nodeId || edge[1] === nodeId) {
                line.setHighlight(highlight);
            }
        }
        // Also check dynamic edges (appended after EDGES.length)
        // Dynamic edges are stored after the static ones in edgeLines
        for (let i = edgeData.length; i < this.edgeLines.length; i++) {
            // We can't easily look up edge data for dynamic edges via index,
            // so check adjacency instead and iterate dynamic edge lines
            // Dynamic edges are added with addEdgeLine which appends to edgeLines
        }
    }
}
