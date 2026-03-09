import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { MindMapNode } from '../../types';
import { exportMindMap } from '../../utils/export';

// Simple Tree View for now (Indented List style is easiest to navigate with keyboard initially)
// Or a Canvas?
// User said "GUI system" and "Mind Map".
// Visual connection lines are nice, but for "typing repeatedly", an outliner or tree view is best.
// Let's do a hierarchical list with CSS lines.

interface Props {
    root: MindMapNode;
    updateNodeText: (id: string, text: string) => void;
    addSibling: (id: string) => void;
    addChild: (id: string) => void;
    addChildren: (id: string, texts: string[]) => void;
    removeNodes: (ids: string[]) => void;
    insertParent: (targetIds: string[], text?: string) => void;
}

export const MindMapView: React.FC<Props> = ({ root, updateNodeText, addSibling, addChild, addChildren, removeNodes, insertParent }) => {
    // Local UI state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set([root.id]));
    const [lastFocusedId, setLastFocusedId] = useState<string>(root.id); // For Shift+Click range anchor
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        // Reset selection if root changes (e.g. import)
        if (!selectedIds.has(root.id) && selectedIds.size === 0) {
            setSelectedIds(new Set([root.id]));
            setLastFocusedId(root.id);
        }
    }, [root.id]);

    // Flatten the tree for navigation order
    const getVisibleNodes = useCallback((node: MindMapNode, list: MindMapNode[] = []): MindMapNode[] => {
        list.push(node);
        if (node.isExpanded !== false && node.children) {
            node.children.forEach(c => getVisibleNodes(c, list));
        }
        return list;
    }, []);

    const handleAutoExpand = async (id: string, text: string) => {
        setIsGenerating(true);
        try {
            // Wikipedia OpenSearch API (JA)
            // limit=10 to fetch enough candidates, then we slice to 3
            const res = await fetch(`https://ja.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(text)}&limit=10&format=json&origin=*`);
            const data = await res.json();
            // data[1] contains keywords
            // Filter out the query itself to avoid duplication
            const keywords = (data[1] as string[]).filter(k => k !== text && !k.includes(text + ' '));

            // Limit to 3 items
            const limitedKeywords = keywords.slice(0, 3);

            if (limitedKeywords.length > 0) {
                addChildren(id, limitedKeywords);
            } else {
                alert('No related terms found.');
            }
        } catch (e) {
            console.error(e);
            alert('Failed to fetch related terms.');
        } finally {
            setIsGenerating(false);
        }
    };

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
            } else {
                // Clear and move
                setSelectedIds(new Set([nextId]));
            }
            setLastFocusedId(nextId);
        } else if (e.key === 'Enter') {
            if (e.shiftKey) {
                e.preventDefault();
                addSibling(id);
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            addChild(id);
        } else if ((e.key === 'Backspace' || e.key === 'Delete') && (e.ctrlKey || e.metaKey)) {
            // Delete all selected
            if (selectedIds.size > 0 && !selectedIds.has(root.id)) {
                const visible = getVisibleNodes(root);
                let safeId = root.id;
                let foundSafe = false;
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
        } else if ((e.altKey || e.metaKey) && (e.code === 'KeyP')) {
            // Insert Parent
            e.preventDefault();
            if (selectedIds.size > 0 && !selectedIds.has(root.id)) {
                insertParent(Array.from(selectedIds));
            }
        }
    };

    const handleNodeClick = (e: React.MouseEvent, id: string) => {
        if (e.shiftKey) {
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

    return (
        <div className="flex flex-col h-full w-full mx-auto p-4 gap-4">
            <div className="flex gap-4 items-center justify-between pop-card px-6 py-3 w-full max-w-4xl mx-auto">
                <div className="text-sm text-slate-500 font-bold space-x-4 flex items-center">
                    <span className="flex items-center gap-1"><kbd className="bg-slate-100 border-b-2 border-slate-300 px-2 py-1 rounded-lg text-slate-600 font-mono text-xs">Shift+Enter</kbd> Sibling</span>
                    <span className="flex items-center gap-1"><kbd className="bg-slate-100 border-b-2 border-slate-300 px-2 py-1 rounded-lg text-slate-600 font-mono text-xs">Tab</kbd> Child</span>
                    <span className="flex items-center gap-1"><kbd className="bg-slate-100 border-b-2 border-slate-300 px-2 py-1 rounded-lg text-slate-600 font-mono text-xs">Opt+P</kbd> Parent</span>
                </div>
                <button
                    onClick={copyToClipboard}
                    className="pop-btn pop-btn-neutral text-sm"
                >
                    📋 Export Text
                </button>
            </div>

            <div className="flex-1 overflow-auto p-8 popup-container relative">
                {isGenerating && (
                    <div className="absolute top-4 right-4 bg-white p-2 rounded-lg shadow-lg border border-pop-orange animate-pulse z-50 flex items-center gap-2">
                        <span className="animate-spin text-xl">✨</span>
                        <span className="text-xs font-bold text-pop-orange-dark">Generating...</span>
                    </div>
                )}
                <NodeView
                    node={root}
                    selectedIds={selectedIds}
                    lastFocusedId={lastFocusedId}
                    onSelect={handleNodeClick}
                    onUpdate={updateNodeText}
                    onKeyDown={handleKeyDown}
                    onAutoExpand={handleAutoExpand}
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
    onAutoExpand: (id: string, text: string) => void;
    depth: number;
}

const NodeView: React.FC<NodeProps> = ({ node, selectedIds, lastFocusedId, onSelect, onUpdate, onKeyDown, onAutoExpand, depth }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const isSelected = selectedIds.has(node.id);
    const isMultiSelecting = selectedIds.size > 1;
    const isFocused = isSelected && !isMultiSelecting && lastFocusedId === node.id;

    useEffect(() => {
        if (isFocused) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isFocused]);

    return (
        <div className="flex items-center">
            {/* Node Card */}
            <div className="relative group">
                <div
                    className={`relative z-10 flex items-center p-3 rounded-full border-2 transition-all duration-200 cursor-pointer shadow-sm min-w-[120px] max-w-[240px] pr-8 ${isSelected
                        ? 'bg-white border-pop-blue ring-4 ring-pop-blue-light/40 shadow-xl shadow-blue-200 scale-105'
                        : 'bg-white border-slate-200 hover:border-pop-blue-light hover:shadow-lg hover:-translate-y-0.5'
                        }`}
                    onClick={(e) => onSelect(e, node.id)}
                >
                    {isFocused ? (
                        <input
                            ref={inputRef}
                            value={node.text}
                            onChange={(e) => onUpdate(node.id, e.target.value)}
                            onKeyDown={(e) => onKeyDown(e, node.id)}
                            className="bg-transparent border-none focus:outline-none w-full text-pop-text text-center font-bold"
                        />
                    ) : (
                        <div
                            className={`w-full text-center outline-none break-words ${isSelected ? 'text-pop-blue-dark font-black' : 'text-slate-600 font-bold'}`}
                            tabIndex={isSelected ? 0 : -1}
                            onKeyDown={(e) => isSelected && onKeyDown(e, node.id)}
                            ref={(el) => { if (isSelected && lastFocusedId === node.id) el?.focus(); }}
                        >
                            {node.text}
                        </div>
                    )}
                </div>

                {/* Magic Expand Button - Visible on Hover or Selection */}
                {(isSelected || 'group-hover:opacity-100') && (
                    <button
                        className={`absolute -top-3 -right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-pop-orange to-pop-orange-dark text-white shadow-lg shadow-orange-200/50 hover:scale-110 transition-all duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onAutoExpand(node.id, node.text);
                        }}
                        title="Mind Tree Bubble: Auto-generate children"
                    >
                        ✨
                    </button>
                )}
            </div>

            {/* Children Group */}
            {node.children && node.children.length > 0 && (
                <div className="flex items-center">
                    <div className="w-8 h-[3px] bg-slate-300 rounded-full"></div>
                    <div className="flex flex-col gap-4 relative">
                        {node.children.map((child, idx) => (
                            <div key={child.id} className="relative flex items-center">
                                {node.children.length > 1 && (
                                    <div className={`absolute left-0 w-[3px] bg-slate-300 ${idx === 0 ? 'h-1/2 top-1/2 rounded-tl-full' :
                                        idx === node.children.length - 1 ? 'h-1/2 bottom-1/2 rounded-bl-full' : 'h-full'
                                        }`}></div>
                                )}
                                {node.children.length > 0 && (
                                    <div className="w-8 h-[3px] bg-slate-300 rounded-r-full"></div>
                                )}
                                <NodeView
                                    node={child}
                                    selectedIds={selectedIds}
                                    lastFocusedId={lastFocusedId}
                                    onSelect={onSelect}
                                    onUpdate={onUpdate}
                                    onKeyDown={onKeyDown}
                                    onAutoExpand={onAutoExpand}
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


