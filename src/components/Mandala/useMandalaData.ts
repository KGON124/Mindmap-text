import { useState, useCallback } from 'react';
import type { MandalaChartData, MandalaGridData } from '../../types';

const INITIAL_GRID_TITLES = [
    'Top Left', 'Top Center', 'Top Right',
    'Middle Left', 'Center', 'Middle Right',
    'Bottom Left', 'Bottom Center', 'Bottom Right'
];

const createEmptyGrid = (idPrefix: string, title: string): MandalaGridData => {
    return {
        id: `grid-${idPrefix}`,
        title,
        cells: Array.from({ length: 9 }).map((_, i) => ({
            id: `cell-${idPrefix}-${i}`,
            text: ''
        }))
    };
};

export const useMandalaData = () => {
    const [data, setData] = useState<MandalaChartData>(() => {
        const centerGrid = createEmptyGrid('center', 'Main Goal');
        // Initialize 9 surrounding grids. Index 4 will be unused/null in the array logic usually
        // or we just have 8 and map them.
        // Let's use 9 for easier indexing, and ignore index 4 (center).
        const surroundingGrids = Array.from({ length: 9 }).map((_, i) => {
            if (i === 4) return createEmptyGrid('center-placeholder', 'Center'); // Placeholder
            return createEmptyGrid(`surrounding-${i}`, INITIAL_GRID_TITLES[i]);
        });

        return { centerGrid, surroundingGrids };
    });

    // Sync logic: When Center Grid's outer cells change, update Surrounding Grid's center (index 4).
    // When Surrounding Grid's center changes, update Center Grid's outer cell.

    const updateCell = useCallback((gridType: 'center' | 'surrounding', gridIndex: number, cellIndex: number, newText: string) => {
        setData(prev => {
            const next = { ...prev };

            if (gridType === 'center') {
                // Update Center Grid
                const newCells = [...next.centerGrid.cells];
                newCells[cellIndex] = { ...newCells[cellIndex], text: newText };
                next.centerGrid = { ...next.centerGrid, cells: newCells };

                // If it's not the absolute center (index 4), sync with surrounding grid
                if (cellIndex !== 4) {
                    const surroundingGrid = { ...next.surroundingGrids[cellIndex] };
                    const sCells = [...surroundingGrid.cells];
                    sCells[4] = { ...sCells[4], text: newText }; // Center of surrounding grid
                    surroundingGrid.cells = sCells;

                    const newSurrounding = [...next.surroundingGrids];
                    newSurrounding[cellIndex] = surroundingGrid;
                    next.surroundingGrids = newSurrounding;
                }
            } else {
                // Update Surrounding Grid
                const surroundingGrid = { ...next.surroundingGrids[gridIndex] };
                const sCells = [...surroundingGrid.cells];
                sCells[cellIndex] = { ...sCells[cellIndex], text: newText };
                surroundingGrid.cells = sCells;

                const newSurrounding = [...next.surroundingGrids];
                newSurrounding[gridIndex] = surroundingGrid;

                next.surroundingGrids = newSurrounding;

                // If updated cell was the center (4) of a surrounding grid, sync to Main Grid
                if (cellIndex === 4) {
                    const mainCells = [...next.centerGrid.cells];
                    mainCells[gridIndex] = { ...mainCells[gridIndex], text: newText };
                    next.centerGrid = { ...next.centerGrid, cells: mainCells };
                }
            }

            return next;
        });
    }, []);

    const setFullData = (newData: MandalaChartData) => {
        setData(newData);
    };

    return {
        data,
        updateCell,
        setFullData
    };
};
