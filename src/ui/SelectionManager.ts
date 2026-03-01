import type { NodeSprite } from "./NodeSprite";
import type { EdgeLine } from "./EdgeLine";
import { EDGES } from "../data/edges";

/**
 * Manages node selection and dispatch flow.
 * Click an owned node to select it, then click a connected node to dispatch.
 */
export class SelectionManager {
    private selectedNodeId: string | null = null;
    private nodeSprites: Map<string, NodeSprite>;
    private edgeLines: EdgeLine[];
    /** Adjacency: node ID -> set of neighbor IDs */
    private adjacency: Map<string, Set<string>>;

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

    /** Called when a dispatch is to be made - override in GameScene */
    onDispatch: ((fromId: string, toId: string) => void) | null = null;

    private onNodeClick(nodeId: string): void {
        if (this.selectedNodeId === null) {
            // First click: select this node
            this.select(nodeId);
        } else if (this.selectedNodeId === nodeId) {
            // Click same node: deselect
            this.deselect();
        } else if (this.getNeighbors(this.selectedNodeId).has(nodeId)) {
            // Click connected node: dispatch
            if (this.onDispatch) {
                this.onDispatch(this.selectedNodeId, nodeId);
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
    }
}
