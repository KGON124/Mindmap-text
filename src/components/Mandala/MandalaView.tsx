import React, { useRef, useState, useEffect } from 'react';
import { useMandalaData } from './useMandalaData';
import type { MandalaGridData } from '../../types';
import { exportMandala } from '../../utils/export';



interface Props { }

export const MandalaView: React.FC<Props> = () => {
    const { data, updateCell } = useMandalaData();
    const [focused, setFocused] = useState<{ grid: number; cell: number } | null>({ grid: 4, cell: 4 }); // Grid 4 is Center Grid.
    // We treat the whole 9x9 as a grid of grids.
    // 0-8 are the grids. 4 is the Center Grid.
    // Cell 0-8 within that grid.

    // Helper to handle navigation
    const handleKeyDown = (e: React.KeyboardEvent, gridIndex: number, cellIndex: number) => {
        // Current Global Position
        // We can map everything to global coordinates (0-8, 0-8)
        // Grid (gx, gy) 3x3. Cell (cx, cy) 3x3.
        // Global X = gx * 3 + cx. Global Y = gy * 3 + cy.

        // Grid Index -> gx, gy
        const gx = gridIndex % 3;
        const gy = Math.floor(gridIndex / 3);

        // Cell Index -> cx, cy
        const cx = cellIndex % 3;
        const cy = Math.floor(cellIndex / 3);

        let nextGx = gx;
        let nextGy = gy;
        let nextCx = cx;
        let nextCy = cy;

        if (e.key === 'ArrowRight') {
            nextCx++;
            if (nextCx > 2) { nextCx = 0; nextGx++; }
        } else if (e.key === 'ArrowLeft') {
            nextCx--;
            if (nextCx < 0) { nextCx = 2; nextGx--; }
        } else if (e.key === 'ArrowDown') {
            nextCy++;
            if (nextCy > 2) { nextCy = 0; nextGy++; }
        } else if (e.key === 'ArrowUp') {
            nextCy--;
            if (nextCy < 0) { nextCy = 2; nextGy--; }
        } else {
            return; // Not nav
        }

        // Boundary check
        if (nextGx < 0 || nextGx > 2 || nextGy < 0 || nextGy > 2) return;

        const nextGridIndex = nextGy * 3 + nextGx;
        const nextCellIndex = nextCy * 3 + nextCx;

        e.preventDefault();
        setFocused({ grid: nextGridIndex, cell: nextCellIndex });
    };

    const copyToClipboard = () => {
        const text = exportMandala(data);
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    return (
        <div className="flex flex-col items-center h-full w-full overflow-auto p-4 gap-6">
            <div className="flex gap-4 items-center">
                <button
                    onClick={copyToClipboard}
                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-700 shadow-sm transition-all"
                >
                    Export / Copy Text
                </button>
            </div>

            <div className="grid grid-cols-3 gap-3 p-4 bg-gray-900/50 rounded-2xl border border-gray-800 shadow-2xl">
                {/* We render 9 Grids */}
                {Array.from({ length: 9 }).map((_, gridIdx) => {
                    let gridData: MandalaGridData;
                    let isCenterGrid = false;

                    if (gridIdx === 4) {
                        gridData = data.centerGrid;
                        isCenterGrid = true;
                    } else {
                        gridData = data.surroundingGrids[gridIdx];
                    }

                    return (
                        <div
                            key={gridIdx}
                            className={`grid grid-cols-3 gap-1 p-1 rounded-lg border transition-all duration-300 ${isCenterGrid
                                ? 'bg-orange-900/20 border-orange-500/30'
                                : 'bg-gray-800/40 border-gray-700/50'
                                }`}
                        >
                            {gridData.cells.map((cell, cellIdx) => {
                                // Check if this cell is the "Center" of its grid (index 4)
                                const isCenterCell = cellIdx === 4;
                                const isFocused = focused?.grid === gridIdx && focused?.cell === cellIdx;

                                // Special Styling for the Absolute Core (Center Grid + Center Cell)
                                const isAbsoluteCore = isCenterGrid && isCenterCell;

                                return (
                                    <Cell
                                        key={cellIdx}
                                        text={cell.text}
                                        isFocused={isFocused}
                                        isCenter={isCenterCell}
                                        isCore={isAbsoluteCore}
                                        onChange={(val) => updateCell(isCenterGrid ? 'center' : 'surrounding', gridIdx, cellIdx, val)}
                                        onKeyDown={(e) => handleKeyDown(e, gridIdx, cellIdx)}
                                        onFocus={() => setFocused({ grid: gridIdx, cell: cellIdx })}
                                        placeholder={isAbsoluteCore ? 'MAIN GOAL' : ''}
                                    />
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

interface CellProps {
    text: string;
    isFocused: boolean;
    isCenter: boolean;
    isCore: boolean;
    onChange: (val: string) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onFocus: () => void;
    placeholder?: string;
}

const Cell: React.FC<CellProps> = ({ text, isFocused, isCenter, isCore, onChange, onKeyDown, onFocus, placeholder }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [editMode, setEditMode] = useState(false);
    const [localText, setLocalText] = useState(text);

    // Sync local text when prop changes (only if not editing, to avoid overwrite)
    useEffect(() => {
        if (!editMode) {
            setLocalText(text);
        }
    }, [text, editMode]);

    useEffect(() => {
        if (isFocused && !editMode) {
            containerRef.current?.focus();
        } else if (isFocused && editMode) {
            inputRef.current?.focus();
        }
    }, [isFocused, editMode]);

    const commitChange = () => {
        onChange(localText);
        setEditMode(false);
    };

    const handleContainerKeyDown = (e: React.KeyboardEvent) => {
        if (editMode) return;

        if (e.key === 'Enter') {
            e.preventDefault();
            setEditMode(true);
            return;
        }

        // Pass navigation keys to parent
        onKeyDown(e);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (!e.shiftKey) {
                e.preventDefault();
                commitChange();
            }
            e.stopPropagation(); // Stop propagation to avoid triggering parent nav
        }
        // Allow default typing behavior
    };

    // Dynamic Classes
    const baseClasses = "relative w-20 h-20 md:w-24 md:h-24 flex items-center justify-center cursor-pointer text-center text-xs md:text-sm p-1 transition-all duration-200";

    let colorClasses = "bg-gray-800 text-gray-300 hover:bg-gray-700";
    if (isCore) colorClasses = "bg-orange-600 text-white font-bold shadow-lg shadow-orange-500/40 hover:bg-orange-500";
    else if (isCenter) colorClasses = "bg-orange-900/40 text-orange-100 font-medium hover:bg-orange-900/60";

    if (isFocused) {
        colorClasses += " ring-2 ring-blue-400 z-10 scale-105 shadow-xl";
    }

    return (
        <div
            className={`${baseClasses} ${colorClasses} rounded-md`}
            onClick={() => { onFocus(); setEditMode(true); }}
        >
            {editMode ? (
                <textarea
                    ref={inputRef}
                    value={localText}
                    onChange={(e) => setLocalText(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    onBlur={commitChange}
                    placeholder={placeholder}
                    className="w-full h-full bg-transparent resize-none outline-none text-center"
                />
            ) : (
                <div
                    ref={containerRef}
                    tabIndex={0}
                    className="w-full h-full flex items-center justify-center outline-none break-words whitespace-pre-wrap overflow-hidden"
                    onKeyDown={handleContainerKeyDown}
                    onFocus={onFocus}
                >
                    {text || (placeholder && <span className="opacity-50 italic">{placeholder}</span>)}
                </div>
            )}
        </div>
    );
};
