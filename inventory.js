window.inventory = ["Iron Sword"];
window.inventoryChangeListeners = [];

console.log('inventory.js loaded');
console.log('window.inventory at the start:', window.inventory);

function addInventoryChangeListener(listener) {
    window.inventoryChangeListeners.push(listener);
}

function notifyInventoryChange() {
    window.inventoryChangeListeners.forEach(listener => listener());
}

// Function to add an item to the inventory, handling stackable items
function addItemToInventory(newItem) {
    console.log('Adding item to inventory:', newItem);
    if (newItem.stackable) {
        const existingItem = window.inventory.find(item => item.name === newItem.name);
        if (existingItem) {
            existingItem.quantity += newItem.quantity;
            console.log(`Updated quantity of ${existingItem.name} to ${existingItem.quantity}`);
        } else {
            window.inventory.push(newItem);
            console.log(`Added new stackable item: ${newItem.name}`);
        }
    } else {
        window.inventory.push(newItem);
        console.log(`Added new non-stackable item: ${newItem.name}`);
    }

    console.log('Current inventory:', inventory);

    if (currentScreen === 'fabrication-screen') {
        displayFabricationRecipes();
    }
    updateInventoryDisplay();
    notifyInventoryChange();
}

// Function to remove an item from the inventory
function removeItemFromInventory(itemName, quantity = 1) {
    const inventoryItem = window.inventory.find(item => item.name === itemName);
    if (inventoryItem) {
        if (inventoryItem.stackable) {
            inventoryItem.quantity -= quantity;
            if (inventoryItem.quantity <= 0) {
                const index = window.inventory.indexOf(inventoryItem);
                if (index > -1) {
                    window.inventory.splice(index, 1);
                }
            }
        } else {
            const index = window.inventory.indexOf(inventoryItem);
            if (index > -1) {
                window.inventory.splice(index, 1);
            }
        }
    } else {
        console.warn(`Item ${itemName} not found in inventory when attempting to remove.`);
    }
    if (window.currentScreen === 'fabrication-screen') {
        displayFabricationRecipes();
    }

    updateInventoryDisplay();
    notifyInventoryChange();
}


// Function to update the inventory display
function updateInventoryDisplay() {
    const inventoryList = document.getElementById('inventory');
    inventoryList.innerHTML = '';  // Clear current inventory list

    // Check if inventory is an array
    if (!Array.isArray(inventory)) {
        console.error('Inventory is not an array:', inventory);
        return;
    }

    // Loop through each item in the inventory
    window.inventory.forEach(item => {
        if (item) {
            const listItem = document.createElement('li');
            listItem.style.position = 'relative'; // Required for tooltip and quantity badge positioning

            // Create item icon
            const itemIcon = document.createElement('img');
            itemIcon.src = item.icon || 'default-icon.png'; // Use a default icon if none provided
            itemIcon.alt = item.name || 'Unknown Item';
            itemIcon.width = 50; // Set icon size
            itemIcon.height = 50;

            // Quantity badge
            if (item.quantity > 1) {
                const quantityBadge = document.createElement('div');
                quantityBadge.className = 'quantity-badge';
                quantityBadge.textContent = 'x' + item.quantity;
                listItem.appendChild(quantityBadge);
            }

            // Create tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';

            // Update tooltip content to include random stats
            tooltip.innerHTML = getItemTooltipContent(item);

            // Append icon and tooltip to list item
            listItem.appendChild(itemIcon);
            listItem.appendChild(tooltip);

            inventoryList.appendChild(listItem);

            // Add hover event listeners with delay
            let hoverTimeout;
            itemIcon.addEventListener('mouseenter', () => {
                hoverTimeout = setTimeout(() => {
                    tooltip.style.display = 'block';
                }, 500); // 0.5-second delay
            });
            itemIcon.addEventListener('mouseleave', () => {
                clearTimeout(hoverTimeout);
                tooltip.style.display = 'none';
            });

            // Click event to handle item actions
            itemIcon.addEventListener('click', () => {
                if (item.effect) {
                    showUseItemPopup(item);
                } else {
                    showItemOptionsPopup(item);
                }
            });

        } else {
            console.warn('Undefined item found in inventory. Skipping...');
        }
    });
}

// Function to equip an item from inventory
function equipItem(item) {
    if (!item || !item.slot) {
        console.error('Invalid item or slot.');
        return;
    }

    // Check if player meets level requirement
    if (item.levelRequirement && player.level < item.levelRequirement) {
        logMessage(`You need to be level ${item.levelRequirement} to equip this item.`);
        return;
    }

    // Handle equipping based on slot
    let previousItem = null;
    switch (item.slot) {
        case 'mainHand':
        case 'offHand':
        case 'head':
        case 'chest':
        case 'legs':
        case 'feet':
        case 'gloves':
            previousItem = player.equipment[item.slot];
            player.equipment[item.slot] = item;
            break;
        case 'bionic':
            // Find the first empty bionic slot
            const emptySlotIndex = player.equipment.bionicSlots.findIndex(slot => slot === null);
            if (emptySlotIndex !== -1) {
                player.equipment.bionicSlots[emptySlotIndex] = item;
            } else {
                logMessage('No empty bionic slots available.');
                return;
            }
            break;
        default:
            console.warn(`Unknown slot type: ${item.slot}`);
            return;
    }

    // Update inventory and UI
    removeItemFromInventory(item);
    if (previousItem) {
        addItemToInventory(previousItem);
    }
    player.calculateStats();
    updateInventoryDisplay();
    updateEquipmentDisplay();
    updatePlayerStatsDisplay();
}


// Function to update the equipped items display
function updateEquipmentDisplay() {
    // Ensure player and player.equipment are defined
    if (!player || !player.equipment) {
        console.error('Player or player.equipment is undefined');
        return;
    }

    // Update equipment slots
    const slots = ['mainHand', 'offHand', 'head', 'chest', 'legs', 'feet', 'gloves'];
    slots.forEach(slotName => {
        const slotElement = document.getElementById(`${slotName}-slot`);
        const equippedItem = player.equipment[slotName];

        slotElement.innerHTML = ''; // Clear current content

        if (equippedItem) {
            // Display item icon
            const itemIcon = document.createElement('img');
            itemIcon.src = equippedItem.icon || 'default-icon.png';
            itemIcon.alt = equippedItem.name || 'Unknown Item';

            // Create tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.innerHTML = getItemTooltipContent(equippedItem);

            // Append icon and tooltip
            slotElement.appendChild(itemIcon);
            slotElement.appendChild(tooltip);

            // Add hover event listeners with delay
            let hoverTimeout;
            itemIcon.addEventListener('mouseenter', () => {
                hoverTimeout = setTimeout(() => {
                    tooltip.style.display = 'block';
                }, 500);
            });
            itemIcon.addEventListener('mouseleave', () => {
                clearTimeout(hoverTimeout);
                tooltip.style.display = 'none';
            });

            // Add click event to unequip
            itemIcon.addEventListener('click', () => {
                unequipItemWithConfirmation(slotName);
            });
        } else {
            // Display slot name
            slotElement.textContent = capitalize(slotName.replace('Hand', ' Hand'));
        }
    });

    // Update bionic slots
    player.equipment.bionicSlots.forEach((item, index) => {
        const slotElement = document.getElementById(`bionic-slot-${index}`);
        slotElement.innerHTML = ''; // Clear current content

        if (item) {
            // Display item icon
            const itemIcon = document.createElement('img');
            itemIcon.src = item.icon || 'default-icon.png';
            itemIcon.alt = item.name || 'Unknown Item';

            // Create tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.innerHTML = getItemTooltipContent(item);

            // Append icon and tooltip
            slotElement.appendChild(itemIcon);
            slotElement.appendChild(tooltip);

            // Add hover event listeners with delay
            let hoverTimeout;
            itemIcon.addEventListener('mouseenter', () => {
                hoverTimeout = setTimeout(() => {
                    tooltip.style.display = 'block';
                }, 500);
            });
            itemIcon.addEventListener('mouseleave', () => {
                clearTimeout(hoverTimeout);
                tooltip.style.display = 'none';
            });

            // Add click event to unequip
            itemIcon.addEventListener('click', () => {
                unequipItemWithConfirmation(`bionic-slot-${index}`);
            });
        } else {
            // Display slot name
            slotElement.textContent = `Bionic ${index + 1}`;
        }
    });
}

// Function to generate tooltip content
// function getItemTooltipContent(item) {
//     let content = `<strong>${item.name}</strong><br>`;
//     content += `Type: ${item.type}<br>`;
//     if (item.weaponType) {
//         content += `Weapon Type: ${item.weaponType}<br>`;
//     }

//     // Display flat damage types
//     if (item.damageTypes) {
//         for (let damageType in item.damageTypes) {
//             content += `Damage: ${item.damageTypes[damageType]} ${capitalize(damageType)}<br>`;
//         }
//     }

//     // Display percentage damage type modifiers
//     if (item.statModifiers && item.statModifiers.damageTypes) {
//         for (let damageType in item.statModifiers.damageTypes) {
//             content += `+${item.statModifiers.damageTypes[damageType]}% ${capitalize(damageType)} Damage<br>`;
//         }
//     }

//     // Display defense types
//     if (item.defenseTypes) {
//         for (let defenseType in item.defenseTypes) {
//             content += `+${item.defenseTypes[defenseType]} ${capitalize(defenseType)}<br>`;
//         }
//     }

//     // Display health bonuses
//     if (item.healthBonus !== undefined) {
//         content += `+${item.healthBonus} Health<br>`;
//     }
//     if (item.healthBonusPercentDisplay !== undefined) {
//         content += `+${item.healthBonusPercentDisplay}% Health<br>`;
//     }

//     // Display energy shield bonuses
//     if (item.energyShieldBonus !== undefined) {
//         content += `+${item.energyShieldBonus} Energy Shield<br>`;
//     }
//     if (item.energyShieldBonusPercentDisplay !== undefined) {
//         content += `+${item.energyShieldBonusPercentDisplay}% Energy Shield<br>`;
//     }

//     // Other stats
//     if (item.attackSpeedModifierPercent !== undefined) {
//         content += `Attack Speed: ${item.attackSpeedModifierPercent}%<br>`;
//     }
//     if (item.criticalChanceModifierPercent !== undefined) {
//         content += `Critical Chance: ${item.criticalChanceModifierPercent}%<br>`;
//     }
//     if (item.criticalMultiplierModifierPercent !== undefined) {
//         content += `Critical Multiplier: ${item.criticalMultiplierModifierPercent}%<br>`;
//     }

//     if (item.levelRequirement !== undefined) {
//         content += `Level Requirement: ${item.levelRequirement}<br>`;
//     }
//     if (item.description) {
//         content += `${item.description}<br>`;
//     }

//     console.log('Tooltip content:', content);
//     return content;
// }

// Helper function to capitalize the first letter
// function capitalize(str) {
//     if (typeof str !== 'string' || str.length === 0) {
//         return '';
//     }
//     return str.charAt(0).toUpperCase() + str.slice(1);
// }

// Function to show confirmation popup with optional secondary action
function showConfirmationPopup(message, onConfirm, onSecondary = null) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'overlay';
    document.body.appendChild(overlay);

    // Create popup
    const popup = document.createElement('div');
    popup.className = 'confirmation-popup';

    const msg = document.createElement('p');
    msg.textContent = message;
    popup.appendChild(msg);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'popup-buttons';

    const yesButton = document.createElement('button');
    yesButton.textContent = 'Yes';
    yesButton.addEventListener('click', () => {
        onConfirm();
        document.body.removeChild(popup);
        document.body.removeChild(overlay);
    });

    const noButton = document.createElement('button');
    noButton.textContent = 'No';
    noButton.addEventListener('click', () => {
        document.body.removeChild(popup);
        document.body.removeChild(overlay);
    });

    buttonsContainer.appendChild(yesButton);
    buttonsContainer.appendChild(noButton);

    // If a secondary action is provided (e.g., Disassemble)
    if (onSecondary) {
        const secondaryButton = document.createElement('button');
        secondaryButton.textContent = 'Disassemble';
        secondaryButton.addEventListener('click', () => {
            onSecondary();
            document.body.removeChild(popup);
            document.body.removeChild(overlay);
        });
        buttonsContainer.appendChild(secondaryButton);
    }

    popup.appendChild(buttonsContainer);
    document.body.appendChild(popup);
}

// Function to initialize equipment slots with click event listeners
function initializeEquipmentSlots() {
    const slots = document.querySelectorAll('.equipment-slot');
    slots.forEach(slot => {
        slot.addEventListener('click', () => {
            const slotName = slot.getAttribute('data-slot');
            unequipItemWithConfirmation(slotName);
        });
    });
}

// Function to unequip an item with confirmation
function unequipItemWithConfirmation(slotName) {
    const equippedItem = getEquippedItemBySlot(slotName);
    if (!equippedItem) {
        logMessage('No item equipped in this slot.');
        return;
    }

    showConfirmationPopup(`Unequip ${equippedItem.name}?`, () => {
        unequipItem(slotName);
    });
}

// Function to get the equipped item by slot name
function getEquippedItemBySlot(slotName) {
    if (slotName.startsWith('bionic-slot-')) {
        const index = parseInt(slotName.split('-')[2]);
        return player.equipment.bionicSlots[index];
    } else {
        return player.equipment[slotName];
    }
}

// Function to unequip an item
function unequipItem(slotName) {
    let unequippedItem = null;
    if (slotName.startsWith('bionic-slot-')) {
        const index = parseInt(slotName.split('-')[2]);
        unequippedItem = player.equipment.bionicSlots[index];
        player.equipment.bionicSlots[index] = null;
    } else {
        unequippedItem = player.equipment[slotName];
        player.equipment[slotName] = null;
    }

    if (unequippedItem) {
        addItemToInventory(unequippedItem);
    }

    // Recalculate player stats after unequipping the item
    player.currentHealth = null;
    player.currentShield = null;
    player.calculateStats();

    // Update displays
    updateInventoryDisplay();
    updateEquipmentDisplay();
    updatePlayerStatsDisplay();
}

// Function to disassemble an item
function disassembleItem(item) {
    if (!item) {
        console.error('No item provided for disassembly.');
        return;
    }

    // Remove the item from inventory
    removeItemFromInventory(item);

    // Determine materials received based on item definition
    const materialsReceived = getMaterialsFromItem(item);

    if (materialsReceived.length === 0) {
        logMessage(`You disassembled ${item.name} but received no materials.`);
    } else {
        // Add materials to inventory
        materialsReceived.forEach(material => {
            addItemToInventory(material);
        });
        logMessage(`You disassembled ${item.name} and received materials.`);
    }

    updateInventoryDisplay();
}

// Function to get materials from an item based on its definition
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

// Function to show use item popup
function showUseItemPopup(item) {
    showConfirmationPopup(`Use ${item.name}?`, () => {
        useItem(item);
    });
}

// Function to use an item
function useItem(item) {
    if (item.effect) {
        player.applyBuff(item.effect);
        removeItemFromInventory(item);
        logMessage(`You used: ${item.name}`);
        updateInventoryDisplay();
    } else {
        logMessage(`Cannot use item: ${item.name}`);
    }
}

// Function to show item options popup
function showItemOptionsPopup(item) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'overlay';
    document.body.appendChild(overlay);

    // Create popup
    const popup = document.createElement('div');
    popup.className = 'confirmation-popup';

    const msg = document.createElement('p');
    msg.textContent = `What would you like to do with ${item.name}?`;
    popup.appendChild(msg);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'popup-buttons';

    // Equip Button
    const equipButton = document.createElement('button');
    equipButton.textContent = 'Equip';
    equipButton.addEventListener('click', () => {
        equipItem(item);
        document.body.removeChild(popup);
        document.body.removeChild(overlay);
    });
    buttonsContainer.appendChild(equipButton);

    // Disassemble Button (if applicable)
    if (item.isDisassembleable) {
        const disassembleButton = document.createElement('button');
        disassembleButton.textContent = 'Disassemble';
        disassembleButton.addEventListener('click', () => {
            disassembleItem(item);
            document.body.removeChild(popup);
            document.body.removeChild(overlay);
        });
        buttonsContainer.appendChild(disassembleButton);
    }

    // Cancel Button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(popup);
        document.body.removeChild(overlay);
    });
    buttonsContainer.appendChild(cancelButton);

    popup.appendChild(buttonsContainer);
    document.body.appendChild(popup);
}

// Initialize equipment slots and update displays
document.addEventListener('DOMContentLoaded', () => {
    initializeEquipmentSlots();
    updateInventoryDisplay();
    updateEquipmentDisplay();
    updatePlayerStatsDisplay();
});
