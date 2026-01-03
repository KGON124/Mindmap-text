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
    const [root, setRoot] = useState<MindMapNode>(INITIAL_TREE);

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
        setRoot(prev => {
            const clone = JSON.parse(JSON.stringify(prev)); // Deep clone for simplicity in MVP
            const path = findNodePath(clone, id);
            if (path) {
                const target = path[path.length - 1];
                target.text = text;
            }
            return clone;
        });
    }, []);

    const addSibling = useCallback((referenceId: string) => {
        setRoot(prev => {
            if (referenceId === prev.id) return prev; // Cannot add sibling to root
            const clone = JSON.parse(JSON.stringify(prev));
            const path = findNodePath(clone, referenceId);
            if (path && path.length >= 2) {
                const parent = path[path.length - 2];
                const index = parent.children.findIndex((n: MindMapNode) => n.id === referenceId);
                const newNode: MindMapNode = { id: uuidv4(), text: 'New Node', children: [] };
                parent.children.splice(index + 1, 0, newNode);
                return clone;
            }
            return clone;
        });
    }, []);

    const addChild = useCallback((parentId: string) => {
        setRoot(prev => {
            const clone = JSON.parse(JSON.stringify(prev));
            const path = findNodePath(clone, parentId);
            if (path) {
                const target = path[path.length - 1];
                const newNode: MindMapNode = { id: uuidv4(), text: 'New Child', children: [] };
                target.children.push(newNode);
                target.isExpanded = true;
                return clone;
            }
            return clone;
        });
    }, []);

    const removeNodes = useCallback((ids: string[]) => {
        setRoot(prev => {
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
            return clone;
        });
    }, []);

    return { root, updateNodeText, addSibling, addChild, removeNodes };
};
