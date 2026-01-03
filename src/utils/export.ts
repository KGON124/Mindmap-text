import type { MandalaChartData, MindMapNode } from '../types';

export const exportMindMap = (node: MindMapNode, depth = 0): string => {
    const indent = '  '.repeat(depth);
    const line = `${indent}- ${node.text}`;
    const childrenLines = node.children.map((child) => exportMindMap(child, depth + 1)).join('\n');
    return childrenLines ? `${line}\n${childrenLines}` : line;
};

export const exportMandala = (data: MandalaChartData): string => {
    // Center Grid
    const centerTitle = data.centerGrid.cells[4].text || 'Untitled';
    let output = `# ${centerTitle}\n\n`;

    // Main 3x3 (Center Grid)
    // We use standard names for parsing: "Center Grid", "Top Left Grid", etc.
    output += `## Center Grid\n`;
    data.centerGrid.cells.forEach((cell, index) => {
        output += `- [${index}] ${cell.text}\n`;
    });
    output += '\n';

    // Surrounding Grids
    data.surroundingGrids.forEach((grid, index) => {
        if (index === 4) return; // Skip the center placeholder, as it is exported as Main/Center Grid above
        const positionName = getPositionName(index);
        output += `## ${positionName} Grid\n`;
        grid.cells.forEach((cell, cIndex) => {
            output += `- [${cIndex}] ${cell.text}\n`;
        });
        output += '\n';
    });

    return output;
};

const getPositionName = (index: number): string => {
    const names = [
        'Top Left', 'Top Center', 'Top Right',
        'Middle Left', 'Center', 'Middle Right',
        'Bottom Left', 'Bottom Center', 'Bottom Right'
    ];
    return names[index] || `Grid ${index}`;
};
