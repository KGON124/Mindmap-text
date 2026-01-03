import { v4 as uuidv4 } from 'uuid';
import type { MindMapNode, MandalaChartData, MandalaGridData } from '../types';

// =========================================================
// MIND MAP PARSER
// =========================================================

export const parseMindMap = (text: string): MindMapNode => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
        return { id: uuidv4(), text: 'Root', children: [] };
    }

    // Heuristic: Detect indentation (Tab or Spaces)
    // We assume the first line is Root (depth 0).
    // If multiple roots appear top-level, we wrap them in a synthetic root or pick the first.
    // Let's create a synthetic root if input has multiple top-level items.

    // Calculate depth for each line
    const parsedLines = lines.map(line => {
        // Remove bullet points like "- ", "* ", "+ "
        // Match whitespace at start
        const match = line.match(/^(\s*)([-+*]\s+)?(.*)/);
        if (!match) return { depth: 0, text: line.trim() };

        const headerIndent = match[1];
        const content = match[3];

        // Depth calc: Assume 2 spaces or 1 tab = 1 level
        const depth = headerIndent.replace(/\t/g, '  ').length / 2;
        return { depth: Math.floor(depth), text: content };
    });

    // Create Root
    // If the first line has depth 0, use it. Otherwise create meaningful root.
    let root: MindMapNode;
    let startIndex = 0;

    if (parsedLines[0].depth === 0) {
        root = { id: uuidv4(), text: parsedLines[0].text, children: [] };
        startIndex = 1;
    } else {
        root = { id: uuidv4(), text: 'Root', children: [] };
    }

    const stack: { node: MindMapNode; depth: number }[] = [{ node: root, depth: root === lines[0] as any ? 0 : -1 }];
    // Fix logic: if we created explicit root from first line, stack starts with it at depth 0.
    // If synthetic root, it effectively has depth -1.

    if (parsedLines[0].depth === 0) {
        // Root is already set
    } else {
        // Using synthetic root (depth -1 for calculation purposes to accept depth 0 or more as children)
        stack[0].depth = -1;
    }

    for (let i = startIndex; i < parsedLines.length; i++) {
        const { depth, text } = parsedLines[i];
        const newNode: MindMapNode = { id: uuidv4(), text: text, children: [] };

        // Find parent: The last node in stack with depth < current depth
        while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
            stack.pop();
        }

        const parentWrapper = stack[stack.length - 1];
        if (parentWrapper) {
            parentWrapper.node.children.push(newNode);
        } else {
            // Should not happen if logic is correct for single root, 
            // but if multiple roots, this attaches to nothing. Fallback: attach to root?
            // If stack is empty, it means this node is top level or weird indentation.
            // But we enforced a root at start.
        }

        stack.push({ node: newNode, depth });
    }

    return root;
};


// =========================================================
// MANDALA CHART PARSER
// =========================================================

export const parseMandala = (text: string): MandalaChartData => {
    // Initialize empty data
    const data: MandalaChartData = {
        centerGrid: createEmptyGrid(),
        surroundingGrids: Array(9).fill(null).map(() => createEmptyGrid())
    };

    // Split by sections headers (## Name)
    // Regex to split but keep delimiters is tricky.
    // Easier: Split by newlines and state machine.

    const lines = text.split('\n');
    let gridTarget: MandalaGridData | null = null;
    let processedCenterGrid = false; // Flag to prevent overwriting center grid with legacy duplicate headers

    // We expect headers: "# Title", "## Center Grid", "## Top Left Grid" etc.
    // Standard names from export.ts
    const positionMap: Record<string, number> = {
        'top left': 0, 'top center': 1, 'top right': 2,
        'middle left': 3, 'center': 4, 'middle right': 5,
        'bottom left': 6, 'bottom center': 7, 'bottom right': 8
    };

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Check for Header
        if (trimmed.startsWith('# ')) {
            // Main Title, ignore or set to center center?
            // Ideally set to Center Grid's center cell if empty?
            continue;
        }

        if (trimmed.startsWith('## ')) {
            // Section Header
            const headerText = trimmed.replace(/^##\s+/, '').toLowerCase();

            // Determine grid
            // Support both new "Center Grid" and old "Main Grid" formats.
            // MUST use startsWith because "Top Center Grid" includes "center grid"!
            if (headerText.startsWith('center grid') || headerText.startsWith('main grid')) {
                if (processedCenterGrid) {
                    // We already processed the main center grid.
                    // This is likely a legacy export containing a duplicate "Center Grid" placeholder.
                    // Ignore it to prevent overwriting real data with empty cells.
                    gridTarget = null;
                } else {
                    gridTarget = data.centerGrid;
                    processedCenterGrid = true;
                }
            } else {
                // Find position
                // Use strict matching order: Longest keys first to avoid partial matches
                // e.g. "Bottom Center" (contains "Center") should match "Bottom Center" first.
                let foundIndex = -1;
                const sortedKeys = Object.keys(positionMap).sort((a, b) => b.length - a.length);

                for (const key of sortedKeys) {
                    if (headerText.includes(key)) {
                        foundIndex = positionMap[key];
                        break;
                    }
                }

                // Special case: "Center" key in positionMap maps to 4 which is center grid?
                // No, surroundingGrids[4] is logically the "Middle Center" surrounding grid... 
                // BUT in Mandala logic, the absolute Center is `centerGrid`. 
                // Index 4 of surroundingGrids is usually unused or hidden behind the main center grid.
                // Our implementation:
                // Grid Index 4 in surroundingGrids IS the Center Grid data?
                // Look at MandalaView: 
                // if (gridIdx === 4) gridData = data.centerGrid; else gridData = data.surroundingGrids[gridIdx];
                // So `data.centerGrid` IS INDEPENDENT. `data.surroundingGrids[4]` is unused/ignored.

                if (foundIndex !== -1) {
                    // to prevent overwriting the real Center Grid with empty placeholder data.
                    if (foundIndex === 4) {
                        gridTarget = null;
                    } else {
                        gridTarget = data.surroundingGrids[foundIndex];
                    }
                } else {
                    gridTarget = null;
                }
            }
            continue;
        }

        // List Item
        if (gridTarget && trimmed.match(/^[-*]\s+/)) {
            // "- [0] text" or "- (0) text" or just "- text"
            // Parse index if present
            const match = trimmed.match(/^[-*]\s+(?:\[(\d+)\]|\((\d+)\))?\s*(.*)/);
            if (match) {
                const indexStr = match[1] || match[2];
                const content = match[3];

                if (indexStr) {
                    const idx = parseInt(indexStr, 10);
                    if (idx >= 0 && idx < 9) {
                        gridTarget.cells[idx].text = content;
                    }
                } else {
                    // No index provided?
                    // We could auto-increment if we tracked it, but standard export provides index.
                    // If manual input, maybe fill empty slots?
                    // For now, strict mode: require index or ignore? 
                    // Let's retry: simple fill first empty slot? 
                    // Or just ignore without index to ensure accuracy?
                    // User said "Review rules: [index] or (index) is optional".
                    // If optional, we fill sequentially 0..8
                    // But we need to know current fill count for this grid.
                    // Let's implement sequential fill.
                    const firstEmpty = gridTarget.cells.findIndex(c => c.text === '');
                    if (firstEmpty !== -1) {
                        gridTarget.cells[firstEmpty].text = content;
                    }
                }
            }
        }
    }

    return data;
};

const createEmptyGrid = (): MandalaGridData => ({
    id: uuidv4(),
    title: '',
    cells: Array(9).fill(null).map(() => ({ id: uuidv4(), text: '' }))
});
