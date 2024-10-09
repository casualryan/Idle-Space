const components = [
    { name: 'Scrap Metal', icon: 'icons/scrap_metal.png', stackable: true },
    { name: 'Electronic Circuit', icon: 'icons/electronic_circuit.png', stackable: true },
    { name: 'Plastic Parts', icon: 'icons/plastic_parts.png', stackable: true },
    // Add more as needed
];

function disassembleItem(item) {
    if (!item) {
        console.error('No item provided for disassembly.');
        return;
    }

    // Remove the item from inventory
    removeItemFromInventory(item);

    // Determine materials received based on item type or properties
    const materialsReceived = getMaterialsFromItem(item);

    if (materialsReceived.length === 0) {
        logMessage(`You disassembled ${item.name} but received no materials.`);
    }
    else {
        // Add materials to inventory
        materialsReceived.forEach(material => {
            addItemToInventory(material);
        });
    }

    logMessage(`You disassembled ${item.name} and received materials.`);
    updateInventoryDisplay();
}

function removeItemFromInventory(item) {
    const index = inventory.indexOf(item);
    if (index > -1) {
        inventory.splice(index, 1);
    } else {
        console.error('Item not found in inventory.');
    }
}

function getMaterialsFromItem(item) {
    const materials = [];

    if (item.disassembleResults) {
        item.disassembleResults.forEach(result => {
            const materialTemplate = items.find(i => i.name === result.name);
            if (materialTemplate) {
                const material = createItemInstance(materialTemplate);
                material.quantity = result.quantity;
                materials.push(material);
            } else {
                console.warn(`Material not found: ${result.name}`);
            }
        });
    } else {
        console.warn(`No disassemble results defined for item: ${item.name}`);
    }

    return materials;
}
