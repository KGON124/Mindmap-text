
const cloneDeep = (obj) => JSON.parse(JSON.stringify(obj));

const INITIAL_TREE = {
    id: 'root',
    text: 'Central Topic',
    children: [
        {
            id: 'child-1',
            text: 'Child 1',
            children: [
                {
                    id: 'grandchild-1',
                    text: 'Grandchild 1',
                    children: []
                }
            ]
        },
        {
            id: 'child-2',
            text: 'Child 2',
            children: []
        }
    ],
    isExpanded: true,
};

const findNodePath = (current, targetId, path = []) => {
    if (current.id === targetId) return [...path, current];
    if (!current.children) return null;
    for (const child of current.children) {
        const result = findNodePath(child, targetId, [...path, current]);
        if (result) return result;
    }
    return null;
};

const insertParent = (root, targetIds, text = 'New Parent') => {
    const clone = cloneDeep(root);

    // Cannot insert parent for Root
    if (targetIds.includes(clone.id)) {
        console.log("Error: Cannot insert parent for root");
        return clone;
    }

    const targetsSet = new Set(targetIds);

    // 1. Find common parent using the first target
    const firstTargetId = targetIds[0];
    const path = findNodePath(clone, firstTargetId);

    if (!path || path.length < 2) {
        console.log("Error: Path not found or too short");
        return clone;
    }

    const commonParent = path[path.length - 2];
    console.log("Common Parent Found:", commonParent.text);

    // 2. Verify all targets are children of this commonParent
    const validTargets = targetIds.filter(id => commonParent.children.some(c => c.id === id));

    if (validTargets.length === 0) {
        console.log("Error: No valid targets found under common parent");
        return clone;
    }

    // 3. Create New Node
    const newParent = {
        id: 'new-parent-uuid',
        text: text,
        children: [],
        isExpanded: true
    };

    // 4. Move valid targets to newParent
    const newChildren = [];
    const newParentChildren = [];
    let parentInserted = false;
    const originalChildren = [...commonParent.children]; // shallow copy of array

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

    return clone;
};

// TEST CASE 1: Insert parent for 'child-1' (Child of Root)
console.log("--- TEST 1: Insert Parent above Child 1 ---");
const result1 = insertParent(INITIAL_TREE, ['child-1']);
console.log("Result 1 Children:");
result1.children.forEach(c => {
    console.log(`- ${c.text} (ID: ${c.id})`);
    if (c.children.length > 0) {
        c.children.forEach(gc => console.log(`  - ${gc.text} (ID: ${gc.id})`));
    }
});

// TEST CASE 2: Insert parent for 'grandchild-1' (Child of Child 1)
console.log("\n--- TEST 2: Insert Parent above Grandchild 1 ---");
const result2 = insertParent(INITIAL_TREE, ['grandchild-1']);
const child1 = result2.children.find(c => c.id === 'child-1');
if (child1) {
    console.log("Child 1 Children:");
    child1.children.forEach(c => {
        console.log(`- ${c.text} (ID: ${c.id})`);
        if (c.children.length > 0) {
            c.children.forEach(gc => console.log(`  - ${gc.text} (ID: ${gc.id})`));
        }
    });
} else {
    console.log("Child 1 disappeared!");
}
