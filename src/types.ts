export type Mode = 'mindmap' | 'mandala';

export interface MindMapNode {
  id: string;
  text: string;
  children: MindMapNode[];
  isExpanded?: boolean;
}

export interface MandalaCell {
  id: string;
  text: string;
}

// 9x9 Grid System
// We can represent it as 9 "Grids" (3x3 each).
// Center Grid is Index 4 (0-8).
// Each Grid has 9 Cells (0-8).
export interface MandalaGridData {
  id: string;
  title: string; // Title of this specific 3x3 grid (derived from center of parent usually)
  cells: MandalaCell[]; // Array of 9 cells. Index 4 is center.
}

export interface MandalaChartData {
  centerGrid: MandalaGridData; // The core 3x3
  surroundingGrids: MandalaGridData[]; // 8 surrounding grids, mapped by position index 0-8 (skipping 4)
}
