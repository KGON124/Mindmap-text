import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useMindMapData } from './useMindMapData';
import type { MindMapNode } from '../../types';
import { exportMindMap } from '../../utils/export';

// Simple Tree View for now (Indented List style is easiest to navigate with keyboard initially)
// Or a Canvas?
// User said "GUI system" and "Mind Map".
// Visual connection lines are nice, but for "typing repeatedly", an outliner or tree view is best.
// Let's do a hierarchical list with CSS lines.

interface Props { }

export const MindMapView: React.FC<Props> = () => {
    const { root, updateNodeText, addSibling, addChild, removeNodes } = useMindMapData();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set([root.id]));
    const [lastFocusedId, setLastFocusedId] = useState<string>(root.id); // For Shift+Click range anchor

    // Flatten the tree for navigation order
    const getVisibleNodes = useCallback((node: MindMapNode, list: MindMapNode[] = []): MindMapNode[] => {
        list.push(node);
        if (node.isExpanded !== false && node.children) {
            node.children.forEach(c => getVisibleNodes(c, list));
        }
        return list;
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
        // Navigation
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const visible = getVisibleNodes(root);
            const idx = visible.findIndex((n: MindMapNode) => n.id === id);
            if (idx === -1) return;

            let nextId = id;
            if (e.key === 'ArrowDown' && idx < visible.length - 1) nextId = visible[idx + 1].id;
            if (e.key === 'ArrowUp' && idx > 0) nextId = visible[idx - 1].id;

            if (e.shiftKey) {
                // Add to selection
                const newSet = new Set(selectedIds);
                newSet.add(nextId);
                setSelectedIds(newSet);
                // We also want to keep 'id' selected if we are extending.
                // Simplified Logic: If Shift is held, we just toggle or add the target?
                // Standard behavior: Selection Anchor -> Target.
                // MVP: Just add nextId to selection.
            } else {
                // Clear and move
                setSelectedIds(new Set([nextId]));
            }
            setLastFocusedId(nextId);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            addSibling(id);
        } else if (e.key === 'Tab') {
            e.preventDefault();
            addChild(id);
        } else if ((e.key === 'Backspace' || e.key === 'Delete') && (e.ctrlKey || e.metaKey)) {
            // Delete all selected
            if (selectedIds.size > 0 && !selectedIds.has(root.id)) {
                // Calculate valid new focus before delete
                // If we delete what we are focused on, we need to move focus up.
                const visible = getVisibleNodes(root);
                // Find a safe node (first non-selected parent or sibling above)
                // Rough guess: find index of focused ID, go up until not in selection.
                let safeId = root.id;
                let foundSafe = false;
                // Reverse search from current index
                const currentIdx = visible.findIndex((n: MindMapNode) => n.id === lastFocusedId);
                if (currentIdx > 0) {
                    for (let i = currentIdx - 1; i >= 0; i--) {
                        if (!selectedIds.has(visible[i].id)) {
                            safeId = visible[i].id;
                            foundSafe = true;
                            break;
                        }
                    }
                }
                if (!foundSafe && visible.length > 0) safeId = visible[0].id; // root

                removeNodes(Array.from(selectedIds));
                setSelectedIds(new Set([safeId]));
                setLastFocusedId(safeId);
            }
        }
    };

    const handleNodeClick = (e: React.MouseEvent, id: string) => {
        if (e.shiftKey) {
            // Range select? Or just compatible multi-select
            // Simple toggle for now
            const newSet = new Set(selectedIds);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            setSelectedIds(newSet);
            setLastFocusedId(id);
        } else {
            setSelectedIds(new Set([id]));
            setLastFocusedId(id);
        }
    };

    const copyToClipboard = () => {
        const text = exportMindMap(root);
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    // We need to determine "focused" for input.
    // We only show input cursor if SINGLE selection?
    // Or always? If multiple selected, we probably shouldn't edit text of one easily.
    // Let's say: If size=1, show cursor/input. If size>1, show highlight only.

    return (
        <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-4 gap-4">
            <div className="flex gap-4 items-center justify-between glass-panel p-4">
                <div className="text-sm text-gray-400 space-x-4">
                    <span><kbd className="bg-gray-800 px-2 py-1 rounded">Enter</kbd> Sibling</span>
                    <span><kbd className="bg-gray-800 px-2 py-1 rounded">Tab</kbd> Child</span>
                    <span><kbd className="bg-gray-800 px-2 py-1 rounded">Shift+Arrows</kbd> Select</span>
                    <span><kbd className="bg-gray-800 px-2 py-1 rounded">Ctrl+Delete</kbd> Delete</span>
                </div>
                <button
                    onClick={copyToClipboard}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-all"
                >
                    Export Text
                </button>
            </div>

            <div className="flex-1 overflow-auto p-8 glass-panel">
                <NodeView
                    node={root}
                    selectedIds={selectedIds}
                    lastFocusedId={lastFocusedId}
                    onSelect={handleNodeClick}
                    onUpdate={updateNodeText}
                    onKeyDown={handleKeyDown}
                    depth={0}
                />
            </div>
        </div>
    );
};

interface NodeProps {
    node: MindMapNode;
    selectedIds: Set<string>;
    lastFocusedId: string;
    onSelect: (e: React.MouseEvent, id: string) => void;
    onUpdate: (id: string, text: string) => void;
    onKeyDown: (e: React.KeyboardEvent, id: string) => void;
    depth: number;
}

const NodeView: React.FC<NodeProps> = ({ node, selectedIds, lastFocusedId, onSelect, onUpdate, onKeyDown, depth }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const isSelected = selectedIds.has(node.id);
    const isMultiSelecting = selectedIds.size > 1;
    const isFocused = isSelected && !isMultiSelecting && lastFocusedId === node.id;

    useEffect(() => {
        if (isFocused) {
            inputRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <div className="flex items-center">
            {/* Node Card */}
            <div
                className={`relative z-10 flex items-center p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer shadow-lg min-w-[120px] max-w-[200px] ${isSelected
                    ? 'bg-blue-900/40 border-blue-500 shadow-blue-500/20'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                    }`}
                onClick={(e) => onSelect(e, node.id)}
            >
                {isFocused ? (
                    <input
                        ref={inputRef}
                        value={node.text}
                        onChange={(e) => onUpdate(node.id, e.target.value)}
                        onKeyDown={(e) => onKeyDown(e, node.id)}
                        className="bg-transparent border-none focus:outline-none w-full text-white text-center font-medium"
                    />
                ) : (
                    <div
                        className={`w-full text-center outline-none break-words ${isSelected ? 'text-blue-100 font-semibold' : 'text-gray-300'}`}
                        tabIndex={isSelected ? 0 : -1}
                        onKeyDown={(e) => isSelected && onKeyDown(e, node.id)}
                        ref={(el) => { if (isSelected && lastFocusedId === node.id) el?.focus(); }}
                    >
                        {node.text}
                    </div>
                )}
            </div>

            {/* Children Group */}
            {node.children && node.children.length > 0 && (
                <div className="flex items-center">
                    {/* Horizontal Connector from Parent to Children Column */}
                    <div className="w-8 h-[2px] bg-gray-700"></div>

                    {/* Children Column */}
                    <div className="flex flex-col gap-4 relative">
                        {/* Vertical Line for branching */}
                        {/* Using a pseudo-element on the column container usually doesn't work well due to height.
                    Instead, we put the vertical bar on each child to connect to top/bottom neighbor?
                    Standard trick: Vertical line on the left of children list.
                    But it needs to stop at the last child's center.
                */}

                        {/* Connector Logic:
                    We draw a vertical line on the LEFT of the children column.
                    It spans from Top of First Child to Top of Last Child.
                    Each child draws a horizontal line to the left to meet it.
                */}
                        {node.children.length > 1 && (
                            <div
                                className="absolute bg-gray-700 w-[2px]"
                                style={{
                                    left: 0,
                                    top: '50%', // Logic roughly: offset to align with child centers?
                                    // This is hard to do with dynamic heights without JS config.
                                    // Fallback: A simple vertical border on the left that spans full height? No.
                                }}
                            ></div>
                        )}

                        {/* Better CSS Tree without JS calculations:
                    Wrapper for Children: Flex-Col.
                    Each Child Wrapper: Flex-Row (Line -- Node).
                    Wait, if I just output a vertical line in each child wrapper, I can mask it.
                */}

                        {node.children.map((child, idx) => (
                            <div key={child.id} className="relative flex items-center">
                                {/* Vertical Line Segment */}
                                {/* If multiple children, we need a vertical backbone.
                            The backbone is at the left edge.
                        */}
                                {node.children.length > 1 && (
                                    <div className={`absolute left-0 w-[2px] bg-gray-700 ${idx === 0 ? 'h-1/2 top-1/2' :
                                        idx === node.children.length - 1 ? 'h-1/2 bottom-1/2' : 'h-full'
                                        }`}></div>
                                )}

                                {/* Horizontal Line to Child */}
                                {/* If single child, straight line. If multiple, it branches from the vertical backbone. */}
                                {node.children.length > 0 && (
                                    <div className="w-8 h-[2px] bg-gray-700"></div>
                                )}

                                <NodeView
                                    node={child}
                                    selectedIds={selectedIds}
                                    lastFocusedId={lastFocusedId}
                                    onSelect={onSelect}
                                    onUpdate={onUpdate}
                                    onKeyDown={onKeyDown}
                                    depth={depth + 1}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


