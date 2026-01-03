import React, { useRef, useState, useEffect } from 'react';
import type { MandalaChartData, MandalaGridData } from '../../types';
import { exportMandala } from '../../utils/export';



interface Props {
    data: MandalaChartData;
    updateCell: (type: 'center' | 'surrounding', gridIndex: number, cellIndex: number, text: string) => void;
}

export const MandalaView: React.FC<Props> = ({ data, updateCell }) => {
    const [focused, setFocused] = useState<{ grid: number; cell: number } | null>(null);
    // We treat the whole 9x9 as a grid of grids.
    // 0-8 are the grids. 4 is the Center Grid.
    // Cell 0-8 within that grid.

    // Helper to handle navigation
    const handleKeyDown = (e: React.KeyboardEvent, gridIdx: number, cellIdx: number) => {
        // Current Global Position
        // We can map everything to global coordinates (0-8, 0-8)
        // Grid (gx, gy) 3x3. Cell (cx, cy) 3x3.
        // Global X = gx * 3 + cx. Global Y = gy * 3 + cy.

        // Grid Index -> gx, gy
        const gx = gridIdx % 3;
        const gy = Math.floor(gridIdx / 3);

        // Cell Index -> cx, cy
        const cx = cellIdx % 3;
        const cy = Math.floor(cellIdx / 3);

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
                    className="pop-btn pop-btn-neutral text-sm"
                >
                    📋 Export / Copy Text
                </button>
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 ">
                {/* We render 9 Grids. No outer decorative container, just the grids floating or in a subtle group */}
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
                            className={`grid grid-cols-3 gap-1 p-2 rounded-2xl border-4 transition-all duration-300 shadow-sm ${isCenterGrid
                                ? 'bg-orange-50 border-pop-orange shadow-orange-100'
                                : 'bg-white border-white shadow-slate-200/50'
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

    // Dynamic Classes for Pop Design
    const baseClasses = "relative w-24 h-24 flex items-center justify-center cursor-pointer text-center text-sm p-1 transition-all duration-200 rounded-xl border-2";

    let colorClasses = "bg-pop-bg border-pop-border text-pop-text hover:bg-white hover:border-pop-blue-light";

    if (isCore) {
        // Center Grid Center Cell (Main Goal)
        colorClasses = "bg-pop-orange text-white border-pop-orange-dark font-black text-lg shadow-md shadow-orange-200";
    } else if (isCenter) {
        // Surrounding Grid Center Cell (Sub Goals)
        colorClasses = "bg-orange-100 text-pop-orange-dark border-orange-200 font-bold hover:bg-orange-50";
    }

    if (isFocused) {
        colorClasses += " z-10 scale-105 shadow-xl shadow-blue-200 border-pop-blue ring-4 ring-pop-blue-light/50";
        if (isCore) colorClasses += " ring-pop-orange-light/50 border-white";
    }

    return (
        <div
            className={`${baseClasses} ${colorClasses}`}
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
                    className="w-full h-full bg-transparent resize-none outline-none text-center font-bold"
                    style={{ color: isCore ? 'white' : 'inherit' }}
                />
            ) : (
                <div
                    ref={containerRef}
                    tabIndex={0}
                    className="w-full h-full flex items-center justify-center outline-none break-words whitespace-pre-wrap overflow-hidden leading-tight font-medium"
                    onKeyDown={handleContainerKeyDown}
                    onFocus={onFocus}
                >
                    {text || (placeholder && <span className="opacity-60 italic font-normal text-xs">{placeholder}</span>)}
                </div>
            )}
        </div>
    );
};
