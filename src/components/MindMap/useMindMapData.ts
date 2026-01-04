import { useState, useCallback } from 'react';
import type { MindMapNode } from '../../types';
import { v4 as uuidv4 } from 'uuid';

const INITIAL_TREE: MindMapNode = {
    id: 'root',
    text: 'Central Topic',
    children: [],
    isExpanded: true,
};

export const useMindMapData = () => {
    const [root, setTreeRoot] = useState<MindMapNode>(() => {
        // [NEW] LocalStorage Load
        const saved = localStorage.getItem('mindmap-data-v1');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse saved MindMap data", e);
            }
        }
        return INITIAL_TREE;
    });

    const saveRoot = (newRoot: MindMapNode) => {
        localStorage.setItem('mindmap-data-v1', JSON.stringify(newRoot));
    };

    // Helper to find node and parent
    // We might not need parent often if we pass it down or search, but for deletion/sibling creation we do.
    // Recursive search.
    const findNodePath = (current: MindMapNode, targetId: string, path: MindMapNode[] = []): MindMapNode[] | null => {
        if (current.id === targetId) return [...path, current];
        for (const child of current.children) {
            const result = findNodePath(child, targetId, [...path, current]);
            if (result) return result;
        }
        return null;
    };

    const updateNodeText = useCallback((id: string, text: string) => {
        setTreeRoot(prev => {
            const clone = JSON.parse(JSON.stringify(prev)); // Deep clone for simplicity in MVP
            const path = findNodePath(clone, id);
            if (path) {
                const target = path[path.length - 1];
                target.text = text;
            }
            saveRoot(clone); // [NEW] Auto-save
            return clone;
        });
    }, []);

    const addSibling = useCallback((referenceId: string) => {
        setTreeRoot(prev => {
            if (referenceId === prev.id) return prev; // Cannot add sibling to root
            const clone = JSON.parse(JSON.stringify(prev));
            const path = findNodePath(clone, referenceId);
            if (path && path.length >= 2) {
                const parent = path[path.length - 2];
                const index = parent.children.findIndex((n: MindMapNode) => n.id === referenceId);
                const newNode: MindMapNode = { id: uuidv4(), text: 'New Node', children: [] };
                parent.children.splice(index + 1, 0, newNode);
                saveRoot(clone); // [NEW] Auto-save
                return clone;
            }
            return clone;
        });
    }, []);

    const addChild = useCallback((parentId: string) => {
        setTreeRoot(prev => {
            const clone = JSON.parse(JSON.stringify(prev));
            const path = findNodePath(clone, parentId);
            if (path) {
                const target = path[path.length - 1];
                const newNode: MindMapNode = { id: uuidv4(), text: 'New Child', children: [] };
                target.children.push(newNode);
                target.isExpanded = true;
                saveRoot(clone); // [NEW] Auto-save
                return clone;
            }
            return clone;
        });
    }, []);

    const removeNodes = useCallback((ids: string[]) => {
        setTreeRoot(prev => {
            // Recursive filter? Or just traverse and splice.
            // Easier to rebuild tree or filter. 
            // But we need to keep structure.
            // Better: traverse and remove children that match ID.

            const clone = JSON.parse(JSON.stringify(prev));
            const idsSet = new Set(ids);

            if (idsSet.has(clone.id)) return clone; // Cannot remove root

            // Helper to remove recursively
            const removeRecursive = (node: MindMapNode) => {
                if (!node.children) return;
                // Filter children
                node.children = node.children.filter(child => !idsSet.has(child.id));
                // Recurse
                node.children.forEach(removeRecursive);
            };

            removeRecursive(clone);
            saveRoot(clone); // [NEW] Auto-save
            return clone;
        });
    }, []);

    const setRoot = (newRoot: MindMapNode) => {
        setTreeRoot(newRoot);
        saveRoot(newRoot); // [NEW] Auto-save
    };

    const resetData = () => {
        setTreeRoot(INITIAL_TREE);
        saveRoot(INITIAL_TREE);
    };

    return { root, updateNodeText, addSibling, addChild, removeNodes, setRoot, resetData };
};
