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

    const insertParent = useCallback((targetIds: string[], text: string = 'New Parent') => {
        setTreeRoot(prev => {
            const clone = JSON.parse(JSON.stringify(prev));

            // Cannot insert parent for Root
            if (targetIds.includes(clone.id)) return clone;

            const targetsSet = new Set(targetIds);

            // 1. Find common parent using the first target
            const firstTargetId = targetIds[0];
            const path = findNodePath(clone, firstTargetId);

            if (!path || path.length < 2) return clone; // Should accept at least root->target

            const commonParent = path[path.length - 2];

            // 2. Verify all targets are children of this commonParent
            // We use the ID to check because objects are cloned
            const validTargets = targetIds.filter(id => commonParent.children.some((c: MindMapNode) => c.id === id));

            // If we have mixed targets (some sharing parent, some not), we only move the valid ones?
            // Or abort? User expectation: if I select multiple spanning different parents, maybe it shouldn't work.
            // But let's just proceed with valid ones for robustness.
            if (validTargets.length === 0) return clone;

            // 3. Create New Node
            const newParent: MindMapNode = {
                id: uuidv4(),
                text: text,
                children: [],
                isExpanded: true
            };

            // 4. Move valid targets to newParent
            const movingNodes: MindMapNode[] = [];

            // We iterate over commonParent.children to maintain order
            commonParent.children = commonParent.children.filter((c: MindMapNode) => {
                if (targetsSet.has(c.id)) {
                    movingNodes.push(c);
                    return false;
                }
                return true;
            });

            newParent.children = movingNodes;

            // 5. Insert newParent at the index of the first target
            // We need to find where the first valid target *was*. 
            // Since we just removed them, we can't find index easily unless we did it before filter.
            // But actually, we can just insert it at the index where the first moving node was found.
            // Let's refine step 4/5.

            // Re-fetch parent to be safe? No, we are modifying `commonParent` in place (it's part of `clone`).

            // To find the original insertion index, we should have found it before filtering.
            // But `movingNodes` will be populated in order.
            // If we just append `newParent` it might jump to end.
            // Let's try to find the index of the *first target* in the *original* children list.

            // Correction: Re-do step 4/5 logic more carefully.

            // A better approach: 
            // Create a new children array.
            // Iterate original children.
            // If child is a target -> Add to `newParent.children`, DO NOT add to `newChildren`.
            // If it's the FIRST target found -> Add `newParent` to `newChildren`.
            // If child is NOT a target -> Add to `newChildren`.

            // But wait, if we have multiple targets, we only add `newParent` once (at position of first target).

            const originalChildren = [...commonParent.children];
            const newChildren: MindMapNode[] = [];
            const newParentChildren: MindMapNode[] = [];
            let parentInserted = false;

            for (const child of originalChildren) {
                if (targetsSet.has(child.id)) {
                    newParentChildren.push(child);
                    if (!parentInserted) {
                        newChildren.push(newParent);
                        parentInserted = true;
                    }
                } else {
                    newChildren.push(child);
                }
            }

            newParent.children = newParentChildren;
            commonParent.children = newChildren;

            saveRoot(clone);
            return clone;
        });
    }, []);

    const resetData = () => {
        setTreeRoot(INITIAL_TREE);
        saveRoot(INITIAL_TREE);
    };

    return { root, updateNodeText, addSibling, addChild, removeNodes, insertParent, setRoot, resetData };
};
