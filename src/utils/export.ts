import type { MandalaChartData, MindMapNode } from '../types';

export const exportMindMap = (node: MindMapNode, depth = 0): string => {
    const indent = '  '.repeat(depth);
    const line = `${indent}- ${node.text}`;
    const childrenLines = node.children.map((child) => exportMindMap(child, depth + 1)).join('\n');
    return childrenLines ? `${line}\n${childrenLines}` : line;
};

export const exportMandala = (data: MandalaChartData): string => {
    // Center Grid
    const centerTitle = data.centerGrid.cells[4].text || 'Untitled Mandala';
    let output = `# ${centerTitle}\n\n`;

    // Main 3x3
    output += `## Main Grid (★ Center)\n`;
    data.centerGrid.cells.forEach((cell, index) => {
        output += `- [${index}] ${cell.text}${index === 4 ? ' (★ CORE)' : ''}\n`;
    });
    output += '\n';

    // Surrounding Grids
    data.surroundingGrids.forEach((grid, index) => {
        // Skip if it corresponds to the center of main grid (which is index 4 of main grid, but here we just list them)
        // Actually, usually 8 surrounding grids map to indices 0,1,2,3,5,6,7,8.
        const positionName = getPositionName(index);
        const title = grid.cells[4].text; // Center of this grid
        output += `## ${positionName} (${title})\n`;
        grid.cells.forEach((cell, cIndex) => {
            output += `  - [${cIndex}] ${cell.text}\n`;
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
