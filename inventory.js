window.inventory = [];
window.inventoryChangeListeners = [];

console.log('inventory.js loaded');
console.log('window.inventory at the start:', window.inventory);

function addInventoryChangeListener(listener) {
    window.inventoryChangeListeners.push(listener);
}

function notifyInventoryChange() {
    window.inventoryChangeListeners.forEach(listener => listener());
}

// Function to get current number of used inventory slots
function getUsedInventorySlots() {
    return window.inventory.filter(item => !isMaterialItem(item)).length;
}

// Determine sale price for an item. Fallback to material defaults.
function getItemSalePrice(item) {
    if (!item) return 0;
    const direct = Number(item.salePrice);
    if (!isNaN(direct) && direct > 0) return direct;
    // Default pricing rules by type/name if no salePrice present
    if (item.type === 'Material') {
        // Basic materials like Scrap Metal have a small default value
        if ((item.name||'').toLowerCase() === 'scrap metal') return 1;
        return 1; // generic material baseline
    } else if (item.type === 'Chip') {
        return 10; // base chip value if not specified
    } else if (item.type === 'Bionic') {
        return 25; // base bionic value if not specified
    }
    return 0;
}

// Function to check if inventory has space for new items
function hasInventorySpace(slotsNeeded = 1) {
    return getUsedInventorySlots() + slotsNeeded <= player.maxInventorySlots;
}

// Function to add an item to the inventory, handling stackable items
function addItemToInventory(newItem) {
    console.log('Adding item to inventory:', newItem);

    // Materials belong to their own fixed-slot, capacity-free storage and are
    // accepted even when the ordinary inventory is full.
    if (isMaterialItem(newItem)) {
        const added = addMaterialToStorage(newItem, newItem?.quantity);
        if (!added) return false;
        if (currentScreen === 'fabrication-screen') displayFabricationRecipes();
        updateInventoryDisplay();
        notifyInventoryChange();
        if (window.playSound && !window.isSilentItemAdd) playSound('ITEM_PICKUP', 0.2);
        return true;
    }

    // Chips should never stack. Split into individual entries and force quantity = 1
    if (newItem && newItem.type === 'Chip') {
        const copiesToAdd = Math.max(1, Number(newItem.quantity) || 1);
        for (let i = 0; i < copiesToAdd; i++) {
            if (!hasInventorySpace(1)) {
                logMessage(`Inventory full! Cannot add ${newItem.name}. (${getUsedInventorySlots()}/${player.maxInventorySlots} slots used)`);
                return i > 0; // Return true if we managed to add at least one
            }
            const clone = { ...newItem, quantity: 1, stackable: false };
            window.inventory.push(clone);
            console.log(`Added chip instance: ${clone.name}`);
        }
    } else if (newItem && (newItem.stackable || newItem.type === 'Material')) {
        if (newItem.type === 'Material') newItem.stackable = true;
        const existingItem = window.inventory.find(
            item => item.name === newItem.name && (item.stackable === true || item.type === 'Material')
        );
        if (existingItem) {
            existingItem.quantity += newItem.quantity;
            console.log(`Updated quantity of ${existingItem.name} to ${existingItem.quantity}`);
        } else {
            if (!hasInventorySpace(1)) {
                logMessage(`Inventory full! Cannot add ${newItem.name}. (${getUsedInventorySlots()}/${player.maxInventorySlots} slots used)`);
                return false;
            }
            window.inventory.push(newItem);
            console.log(`Added new stackable item: ${newItem.name}`);
        }
    } else {
        if (!hasInventorySpace(1)) {
            logMessage(`Inventory full! Cannot add ${newItem.name}. (${getUsedInventorySlots()}/${player.maxInventorySlots} slots used)`);
            return false;
        }
        window.inventory.push(newItem);
        console.log(`Added new non-stackable item: ${newItem.name}`);
    }

    console.log('Current inventory:', inventory);

    if (currentScreen === 'fabrication-screen') {
        displayFabricationRecipes();
    }
    updateInventoryDisplay();
    notifyInventoryChange();

    // Play pickup sound
    if (window.playSound && !window.isSilentItemAdd) {
        playSound('ITEM_PICKUP', 0.2);
    }
    
    return true; // Successfully added item
}

// Function to remove an item from the inventory
function removeItemFromInventory(itemOrName, quantity = 1) {
    const possibleMaterialName = typeof itemOrName === 'string' ? itemOrName : itemOrName?.name;
    if (isMaterialName(possibleMaterialName)) {
        const removed = removeMaterialFromStorage(possibleMaterialName, quantity);
        if (!removed) console.warn(`Unable to remove ${quantity} ${possibleMaterialName} from material storage.`);
        if (window.currentScreen === 'fabrication-screen') displayFabricationRecipes();
        updateInventoryDisplay();
        notifyInventoryChange();
        return removed;
    }

    // Support removing by object reference or by name
    if (itemOrName && typeof itemOrName === 'object') {
        const idx = window.inventory.indexOf(itemOrName);
        if (idx > -1) {
            window.inventory.splice(idx, 1);
        } else if (itemOrName.name) {
            // Fallback: remove first item with same name
            const byNameIdx = window.inventory.findIndex(it => it && it.name === itemOrName.name);
            if (byNameIdx > -1) window.inventory.splice(byNameIdx, 1);
            else console.warn(`Item ${itemOrName.name} not found in inventory when attempting to remove.`);
        } else {
            console.warn('Unknown item passed to removeItemFromInventory:', itemOrName);
        }
    } else {
        const name = itemOrName;
        const inventoryItem = window.inventory.find(item => item && item.name === name);
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
            console.warn(`Item ${name} not found in inventory when attempting to remove.`);
        }
    }
    if (window.currentScreen === 'fabrication-screen') {
        displayFabricationRecipes();
    }

    updateInventoryDisplay();
    notifyInventoryChange();
}


// Function to update the inventory header with slot count
function updateInventoryHeader() {
    const inventoryHeader = document.getElementById('inventory-header');
    if (inventoryHeader) {
        const usedSlots = getUsedInventorySlots();
        const maxSlots = player.maxInventorySlots;
        inventoryHeader.textContent = `Inventory (${usedSlots}/${maxSlots} slots)`;
    }
}

// Function to update the inventory display
function updateInventoryDisplay() {
    // Update the header first
    updateInventoryHeader();
    
    const inventoryList = document.getElementById('inventory');
    inventoryList.innerHTML = '';  // Clear current inventory list

    // Check if inventory is an array
    if (!Array.isArray(inventory)) {
        console.error('Inventory is not an array:', inventory);
        updateMaterialInventoryDisplay();
        return;
    }

    // Apply search/filter/sort before rendering
    const search = (document.getElementById('inv-search')?.value || '').trim().toLowerCase();
    const filterType = (document.getElementById('inv-filter')?.value || 'all');
    const sortBy = (document.getElementById('inv-sort')?.value || 'none');

    let itemsToShow = window.inventory.filter(item => !isMaterialItem(item));
    if (filterType !== 'all') {
        itemsToShow = itemsToShow.filter(it => (it && it.type === filterType));
    }
    if (search) {
        itemsToShow = itemsToShow.filter(it => (it && (it.name||'').toLowerCase().includes(search)));
    }
    const weaponDps = (it) => {
        if (!it || it.type !== 'Weapon') return 0;
        const dmg = Object.values(it.damageTypes||{}).reduce((a,b) => a + (typeof b === 'number' ? b : (b.min||0)), 0);
        const atkSpd = (typeof it.bAttackSpeed === 'number' ? it.bAttackSpeed : 1);
        return Number((dmg * atkSpd).toFixed(2));
    };
    if (sortBy === 'rarity') {
        const rank = { Legendary:5, Epic:4, Rare:3, Uncommon:2, Common:1 };
        itemsToShow.sort((a,b) => (rank[(b?.rarity)||'Common']||0) - (rank[(a?.rarity)||'Common']||0));
    } else if (sortBy === 'level') {
        itemsToShow.sort((a,b) => (b?.levelRequirement||0) - (a?.levelRequirement||0));
    } else if (sortBy === 'dps') {
        itemsToShow.sort((a,b) => weaponDps(b) - weaponDps(a));
    } else if (sortBy === 'sockets') {
        const sockets = it => Array.isArray(it?.rolledWires) ? it.rolledWires.length : 0;
        itemsToShow.sort((a,b) => sockets(b) - sockets(a));
    } else if (sortBy === 'name') {
        itemsToShow.sort((a,b) => (a?.name||'').localeCompare(b?.name||''));
    }

    // Determine if we can safely reorder (avoid confusion when filtered/sorted)
    const canReorder = !search && filterType === 'all' && sortBy === 'none';

    // Loop through each item in the inventory (post-filtered)
    itemsToShow.forEach((item, index) => {
        if (item) {
            const listItem = document.createElement('li');
            listItem.style.position = 'relative'; // Required for quantity badge positioning
            
            // Set the item index for staggered animations
            listItem.style.setProperty('--item-index', index);

            // Create item icon
            const itemIcon = document.createElement('img');
            itemIcon.src = item.icon || 'icons/default-icon.png';
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

            // Set tooltip content via data attribute
            listItem.setAttribute('data-has-tooltip', 'true');
            listItem.setAttribute('data-tooltip-source', 'inventory-item');
            listItem.setAttribute('data-tooltip-content', getItemTooltipContent(item));
            
            // Append icon to list item
            listItem.appendChild(itemIcon);
            
            inventoryList.appendChild(listItem);

            // Left-click: open options (or use if consumable) — swapped behavior
            itemIcon.addEventListener('click', (e) => {
                if (item.effect) {
                    showUseItemPopup(item);
                } else {
                    showItemOptionsPopup(item, e);
                }
            });
            // Drag and drop to reorder inventory (drop BETWEEN items)
            if (canReorder) {
                listItem.setAttribute('draggable', 'true');
                listItem.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', index.toString());
                });
                listItem.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    const rect = listItem.getBoundingClientRect();
                    const halfway = rect.top + rect.height / 2;
                    listItem.classList.toggle('drag-over-top', e.clientY < halfway);
                    listItem.classList.toggle('drag-over-bottom', e.clientY >= halfway);
                });
                listItem.addEventListener('dragleave', () => {
                    listItem.classList.remove('drag-over-top', 'drag-over-bottom');
                });
                listItem.addEventListener('drop', (e) => {
                    e.preventDefault();
                    const fromVisibleIdx = parseInt(e.dataTransfer.getData('text/plain'));
                    if (isNaN(fromVisibleIdx)) return;
                    // Determine insertion index (before/after based on cursor position)
                    const rect = listItem.getBoundingClientRect();
                    const insertAfter = e.clientY >= (rect.top + rect.height / 2);
                    let insertVisibleIdx = index + (insertAfter ? 1 : 0);
                    // Reorder the underlying array (since no filter/sort, visible indices map 1:1)
                    if (fromVisibleIdx !== insertVisibleIdx && fromVisibleIdx + 1 !== insertVisibleIdx) {
                        // No-op check not strictly needed, just prevents jitter
                    }
                    const [moved] = window.inventory.splice(fromVisibleIdx, 1);
                    // Adjust target index if removing item before the insertion point
                    if (fromVisibleIdx < insertVisibleIdx) insertVisibleIdx -= 1;
                    window.inventory.splice(insertVisibleIdx, 0, moved);
                    listItem.classList.remove('drag-over-top', 'drag-over-bottom');
                    updateInventoryDisplay();
                    notifyInventoryChange();
                });
            }
            // Double-click to equip if equippable
            itemIcon.addEventListener('dblclick', () => {
                if (isEquippableItem(item)) {
                    equipItem(item);
                }
            });
            // Right-click: auto-equip if equippable; else use consumables
            itemIcon.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (isEquippableItem(item)) {
                    equipItem(item);
                } else if (item.effect) {
                    showUseItemPopup(item);
                }
            });
        } else {
            console.warn('Undefined item found in inventory. Skipping...');
        }
    });

    updateMaterialInventoryDisplay();
}

// Wire up inventory controls events (search/filter/sort)
window.registerCoreboundInitializer(() => {
    const s = document.getElementById('inv-search');
    const f = document.getElementById('inv-filter');
    const o = document.getElementById('inv-sort');
    [s,f,o].forEach(el => { if (el) el.addEventListener('input', updateInventoryDisplay); });
});

function recomputePlayerEffects() {
    const equipment = player?.equipment || {};
    const equipped = ['mainHand', 'offHand', 'head', 'chest', 'legs', 'feet', 'gloves']
        .map(slot => equipment[slot])
        .filter(Boolean);
    if (Array.isArray(equipment.bionicSlots)) {
        equipped.push(...equipment.bionicSlots.filter(Boolean));
    }
    const chipState = typeof getEquippedChipState === 'function'
        ? getEquippedChipState(player)
        : { blackCount: 0 };
    player.effects = equipped.flatMap(item => {
        const effects = Array.isArray(item.effects)
            ? item.effects.map(effect => ({ ...effect, sourceSlot: item.slot || null, sourceItemName: item.name }))
            : [];
        if (!Array.isArray(item.rolledWires)) return effects;
        item.rolledWires.forEach(wire => {
            const chip = wire?.chip;
            const enabled = typeof isEquippedChipEnabled !== 'function'
                || isEquippedChipEnabled(chip, chipState);
            if (!chip || !enabled || !Array.isArray(chip.effects)) return;
            chip.effects.forEach(effect => effects.push({
                ...effect,
                sourceSlot: item.slot || null,
                sourceItemName: chip.name,
                sourceWireColor: wire.color
            }));
        });
        return effects;
    });
    return player.effects;
}

function countBlackChipsOnItem(item) {
    if (!Array.isArray(item?.rolledWires)) return 0;
    return item.rolledWires.filter(wire => (
        wire?.chip && String(wire.chip.color || '').toLowerCase() === 'black'
    )).length;
}

function wouldEquipItemCreateBlackChipConflict(item) {
    if (!item || typeof getEquippedChipState !== 'function') return false;
    const state = getEquippedChipState(player);
    const replacing = item.slot && item.slot !== 'bionic' ? player?.equipment?.[item.slot] : null;
    const retainedBlackChips = state.blackCount - countBlackChipsOnItem(replacing);
    return retainedBlackChips + countBlackChipsOnItem(item) > 1;
}

window.recomputePlayerEffects = recomputePlayerEffects;
window.wouldEquipItemCreateBlackChipConflict = wouldEquipItemCreateBlackChipConflict;

// Function to equip an item from inventory
function equipItem(item) {
    if (!item || !item.slot) {
        console.error('Invalid item or slot.');
        return;
    }
    
    // Additional check to prevent non-equippable items (like materials) from being equipped
    if (!isEquippableItem(item)) {
        console.error(`Cannot equip ${item.name}: not an equippable item type.`);
        logMessage(`${item.name} cannot be equipped.`);
        return;
    }

    // Check if player meets level requirement
    if (item.levelRequirement && player.level < item.levelRequirement) {
        logMessage(`You need to be level ${item.levelRequirement} to equip this item.`);
        return;
    }

    if (wouldEquipItemCreateBlackChipConflict(item)) {
        logMessage('Equipping that item would activate more than one Black Chip. Remove a Black Chip first.');
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
    
    // Reset and reapply all passive bonuses from gear
    resetGearPassiveBonuses();
    // Passive application owns the single authoritative stat rebuild.
    applyAllPassivesToPlayer();
    
    updateInventoryDisplay();
    // Recompute proc effects from equipped gear
    recomputePlayerEffects();

    updateEquipmentDisplay();
    updatePlayerStatsDisplay();

    // Play equip sound
    if (window.playSound) {
        playSound('ITEM_EQUIP');
    }
}


// Function to update the equipped items display
function updateEquipmentDisplay() {
    // Ensure player and player.equipment are defined
    if (!player || !player.equipment) {
        console.error('Player or player.equipment is undefined');
        return;
    }

    // Add a subtle animation to the paper doll
    const paperDoll = document.getElementById('equipment-paper-doll');
    paperDoll.classList.add('updating');
    setTimeout(() => paperDoll.classList.remove('updating'), 500);

    renderEquipmentStatsPanel();

    // Update equipment slots
    const slots = ['mainHand', 'offHand', 'head', 'chest', 'legs', 'feet', 'gloves'];
    slots.forEach((slotName, index) => {
        const slotElement = document.getElementById(`${slotName}-slot`);
        const equippedItem = player.equipment[slotName];

        // Add a slight delay to each slot update for a cascading effect
        setTimeout(() => {
            slotElement.innerHTML = ''; // Clear current content
            slotElement.onclick = null;
            
            if (equippedItem) {
                // Create a wrapper div to hold icon and tooltip data
                const wrapper = document.createElement('div');
                wrapper.setAttribute('data-has-tooltip', 'true');
                wrapper.setAttribute('data-tooltip-source', 'equipment-slot');
                let tooltipHtml = getItemTooltipContent(equippedItem);
                if (Array.isArray(equippedItem.rolledWires) && equippedItem.rolledWires.length > 0) {
                    const colorBadge = c => ({ red: '#ff6b6b', green: '#51cf66', blue: '#74c0fc', black: '#ced4da' }[c] || '#adb5bd');
                    const chips = equippedItem.rolledWires.map(w => `<span style=\"display:inline-block; border:1px solid ${colorBadge(w.color)}; color:${colorBadge(w.color)}; padding:1px 4px; margin:1px; border-radius:3px; font-size:11px;\">${w.color}${w.chip ? ' • ' + w.chip.name : ''}</span>`).join(' ');
                    tooltipHtml += `<div style=\"background: rgba(0,20,45,0.6); padding:4px; margin-top:4px; border-radius:4px; border-left:2px solid #00ffcc;\"><div style=\"color:#66ffcc; font-weight:bold; margin-bottom:2px;\">Wires</div>${chips}</div>`;
                }
                wrapper.setAttribute('data-tooltip-content', tooltipHtml);
                wrapper.style.width = '100%';
                wrapper.style.height = '100%';
                wrapper.style.display = 'flex';
                wrapper.style.alignItems = 'center';
                wrapper.style.justifyContent = 'center';
                
                // Add a class for equipped items
                wrapper.classList.add('equipped-item');
                
                // Add a data attribute for item rarity if it exists
                if (equippedItem.rarity) {
                    wrapper.setAttribute('data-rarity', equippedItem.rarity);
                    slotElement.setAttribute('data-rarity', equippedItem.rarity);
                }

                // Create item icon
                const itemIcon = document.createElement('img');
                itemIcon.src = equippedItem.icon || "icons/default-icon.png";
                itemIcon.alt = equippedItem.name || 'Unknown Item';
                itemIcon.style.maxWidth = '100%';
                itemIcon.style.maxHeight = '100%';

                // Append element
                wrapper.appendChild(itemIcon);
                slotElement.appendChild(wrapper);

                // Add click handler to the wrapper
                wrapper.addEventListener('click', (event) => {
                    // Add a visual feedback effect when clicked
                    wrapper.classList.add('clicked');
                    setTimeout(() => wrapper.classList.remove('clicked'), 300);
                    
                    showEquipmentSelectionWindow(slotName);
                });
                
                // Add a subtle entrance animation
                wrapper.style.opacity = '0';
                wrapper.style.transform = 'scale(0.8)';
                setTimeout(() => {
                    wrapper.style.transition = 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
                    wrapper.style.opacity = '1';
                    wrapper.style.transform = 'scale(1)';
                }, 50);
            } else {
                slotElement.textContent = capitalize(slotName.replace('Hand', ' Hand'));
                
                // Add a subtle pulse effect to empty slots
                slotElement.classList.add('pulse-empty');
                setTimeout(() => slotElement.classList.remove('pulse-empty'), 1000);
                
                // Add click handler for empty slots
                slotElement.onclick = () => {
                    showEquipmentSelectionWindow(slotName);
                };
                slotElement.style.cursor = 'pointer';
            }
        }, index * 100); // Stagger the updates by 100ms per slot
    });

    // Update bionic slots with same structure
    player.equipment.bionicSlots.forEach((item, index) => {
        const slotElement = document.getElementById(`bionic-slot-${index}`);
        
        // Add a slight delay for cascading effect, continuing from regular equipment
        setTimeout(() => {
            slotElement.innerHTML = '';
            slotElement.onclick = null;

            if (item) {
                const wrapper = document.createElement('div');
                wrapper.setAttribute('data-has-tooltip', 'true');
                wrapper.setAttribute('data-tooltip-source', 'bionic-slot');
                wrapper.setAttribute('data-tooltip-content', getItemTooltipContent(item));
                wrapper.style.width = '100%';
                wrapper.style.height = '100%';
                wrapper.style.display = 'flex';
                wrapper.style.alignItems = 'center';
                wrapper.style.justifyContent = 'center';
                
                // Add a class for equipped bionics
                wrapper.classList.add('equipped-bionic');
                
                // Add a data attribute for item rarity if it exists
                if (item.rarity) {
                    wrapper.setAttribute('data-rarity', item.rarity);
                    slotElement.setAttribute('data-rarity', item.rarity);
                }

                const itemIcon = document.createElement('img');
                itemIcon.src = item.icon || "icons/default-icon.png";
                itemIcon.alt = item.name || 'Unknown Item';
                itemIcon.style.maxWidth = '100%';
                itemIcon.style.maxHeight = '100%';

                wrapper.appendChild(itemIcon);
                slotElement.appendChild(wrapper);

                wrapper.addEventListener('click', (event) => {
                    // Add a visual feedback effect when clicked
                    wrapper.classList.add('clicked');
                    setTimeout(() => wrapper.classList.remove('clicked'), 300);
                    
                    showEquipmentSelectionWindow('bionic', index);
                });
                
                // Add a subtle entrance animation
                wrapper.style.opacity = '0';
                wrapper.style.transform = 'scale(0.8)';
                setTimeout(() => {
                    wrapper.style.transition = 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
                    wrapper.style.opacity = '1';
                    wrapper.style.transform = 'scale(1)';
                }, 50);
            } else {
                slotElement.textContent = `Bionic ${index + 1}`;
                
                // Add a subtle pulse effect to empty slots
                slotElement.classList.add('pulse-empty');
                setTimeout(() => slotElement.classList.remove('pulse-empty'), 1000);
                
                // Add click handler for empty bionic slots
                slotElement.onclick = () => {
                    showEquipmentSelectionWindow('bionic', index);
                };
                slotElement.style.cursor = 'pointer';
            }
        }, (slots.length + index) * 100); // Continue the staggered timing from regular equipment
    });
}

function renderEquipmentStatsPanel() {
    const statsPanel = document.getElementById('equipment-stats-panel');
    const buildPanel = document.getElementById('equipment-build-panel');
    if (!statsPanel || !buildPanel || !player || !player.equipment) return;

    if (typeof player.calculateStats === 'function') {
        player.calculateStats();
    }

    const total = player.totalStats || {};
    const asPercent = (value, decimals = 1) => `${((value || 0) * 100).toFixed(decimals)}%`;
    const asInt = (value) => Math.round(value || 0);
    const toDamageGroup = (type) => {
        if (type === 'kinetic' || type === 'slashing') return 'physical';
        if (type === 'pyro' || type === 'cryo' || type === 'electric') return 'elemental';
        if (type === 'corrosive' || type === 'radiation') return 'chemical';
        return null;
    };
    const sectionRow = (label, value) => `
        <div class="equipment-stat-row">
            <span class="equipment-stat-label">${label}</span>
            <span class="equipment-stat-value">${value}</span>
        </div>
    `;

    const damageTypes = total.damageTypes || {};
    const damageTypeModifiers = total.damageTypeModifiers || {};
    const damageGroupModifiers = total.damageGroupModifiers || {};
    const critChance = Math.max(0, Number(total.criticalChance || 0));
    const critMultiplier = Math.max(1, Number(total.criticalMultiplier || 1));
    const attackSpeed = Math.max(0, Number(total.attackSpeed || 0));
    const critFactor = 1 + (critChance * Math.max(critMultiplier - 1, 0));

    const dpsByType = {};
    Object.keys(damageTypes).forEach(type => {
        const base = Number(damageTypes[type] || 0);
        if (base <= 0) return;
        const typeMult = Number(damageTypeModifiers[type] || 1);
        const groupKey = toDamageGroup(type);
        const groupMult = groupKey ? Number(damageGroupModifiers[groupKey] || 1) : 1;
        const dps = base * typeMult * groupMult * attackSpeed * critFactor;
        dpsByType[type] = dps;
    });
    const totalDps = Object.values(dpsByType).reduce((sum, value) => sum + value, 0);
    const dpsRows = Object.keys(dpsByType)
        .sort((a, b) => dpsByType[b] - dpsByType[a])
        .map(type => sectionRow(capitalize(type), dpsByType[type].toFixed(2)))
        .join('');

    statsPanel.innerHTML = `
        <h3>Equipment Stats</h3>
        <div class="equipment-stat-section">
            <div class="equipment-stat-section-title">Core</div>
            ${sectionRow('Health', asInt(total.health))}
            ${sectionRow('Energy Shield', asInt(total.energyShield))}
            ${sectionRow('Attack Speed', (total.attackSpeed || 0).toFixed(2))}
        </div>
        <div class="equipment-stat-section">
            <div class="equipment-stat-section-title">Combat</div>
            ${sectionRow('Crit Chance', asPercent(total.criticalChance, 2))}
            ${sectionRow('Crit Multiplier', `${(total.criticalMultiplier || 0).toFixed(2)}x`)}
            ${sectionRow('Precision', asInt(total.precision))}
            ${sectionRow('Deflection', asInt(total.deflection))}
            ${sectionRow('Propagation Targets', Math.min(5, 1 + asInt(total.propagationTargets)))}
        </div>
        <div class="equipment-stat-section">
            <div class="equipment-stat-section-title">Damage Per Second</div>
            ${sectionRow('Total DPS', totalDps.toFixed(2))}
            ${dpsRows || `<div class="equipment-panel-empty">No damage sources equipped.</div>`}
        </div>
        <div class="equipment-stat-section">
            <div class="equipment-stat-section-title">Resistances</div>
            ${sectionRow('Physical', `${asInt(total.defenseTypes?.physicalResistance)}%`)}
            ${sectionRow('Elemental', `${asInt(total.defenseTypes?.elementalResistance)}%`)}
            ${sectionRow('Chemical', `${asInt(total.defenseTypes?.chemicalResistance)}%`)}
        </div>
        <div class="equipment-stat-section">
            <div class="equipment-stat-section-title">Efficiency</div>
            ${sectionRow('Weapon', `${asInt(total.weaponEfficiency)}%`)}
            ${sectionRow('Armor', `${asInt(total.armorEfficiency)}%`)}
            ${sectionRow('Bionic', `${asInt(total.bionicEfficiency)}%`)}
        </div>
    `;

    const normalSlots = ['mainHand', 'offHand', 'head', 'chest', 'legs', 'feet', 'gloves'];
    const armorSlots = ['head', 'chest', 'legs', 'feet', 'gloves'];
    const equippedItems = normalSlots
        .map(slot => player.equipment[slot])
        .filter(Boolean);
    const bionicSlots = Array.isArray(player.equipment.bionicSlots) ? player.equipment.bionicSlots : [];
    const equippedBionics = bionicSlots.filter(Boolean);

    const damageTotals = {};
    equippedItems.forEach(item => {
        if (!item || !item.damageTypes) return;
        Object.keys(item.damageTypes).forEach(type => {
            const value = typeof item.damageTypes[type] === 'number'
                ? item.damageTypes[type]
                : 0;
            if (value > 0) {
                damageTotals[type] = (damageTotals[type] || 0) + value;
            }
        });
    });

    const dominantDamageType = Object.keys(damageTotals).sort((a, b) => damageTotals[b] - damageTotals[a])[0];
    const warnings = [];
    if (!player.equipment.mainHand) warnings.push('No main hand equipped.');
    if (!player.equipment.chest) warnings.push('No chest armor equipped.');
    if (equippedBionics.length === 0) warnings.push('No bionics equipped.');
    const chipState = typeof getEquippedChipState === 'function' ? getEquippedChipState(player) : null;
    if (chipState?.hasBlackConflict) {
        warnings.unshift(`${chipState.blackCount} Black Chips detected. All Black Chips are disabled.`);
    }

    buildPanel.innerHTML = `
        <h3>Build Summary</h3>
        <div class="equipment-stat-section">
            <div class="equipment-stat-section-title">Loadout</div>
            ${sectionRow('Armor Slots Filled', `${armorSlots.filter(slot => !!player.equipment[slot]).length}/5`)}
            ${sectionRow('Main/Off Hand', `${player.equipment.mainHand ? 1 : 0}/${player.equipment.offHand ? 1 : 0}`)}
            ${sectionRow('Bionics Filled', `${equippedBionics.length}/4`)}
            ${sectionRow('Dominant Damage', dominantDamageType ? capitalize(dominantDamageType) : 'None')}
        </div>
        <div class="equipment-stat-section">
            <div class="equipment-stat-section-title">Quick Warnings</div>
            <div class="equipment-warning-list">
                ${warnings.length ? warnings.map(w => `<div class="equipment-warning-item">${w}</div>`).join('') : '<div class="equipment-ok-item">Loadout looks solid.</div>'}
            </div>
        </div>
    `;
}

// Function to show confirmation popup with optional secondary action
function showConfirmationPopup(message, onConfirm, onSecondary = null) {
    // Remove any existing generic overlay to avoid stacking
    const existing = document.getElementById('overlay');
    if (existing) existing.remove();

    // Create overlay (full screen, centered)
    const overlay = document.createElement('div');
    overlay.id = 'overlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:100000; display:flex; align-items:center; justify-content:center;';

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
    const closePopup = () => {
        document.removeEventListener('keydown', onKey);
        if (overlay && overlay.parentNode) overlay.remove();
    };

    yesButton.addEventListener('click', () => {
        try { if (typeof onConfirm === 'function') onConfirm(); } catch (e) { console.error(e); }
        closePopup();
    });

    const noButton = document.createElement('button');
    noButton.textContent = 'No';
    noButton.addEventListener('click', () => {
        closePopup();
    });

    buttonsContainer.appendChild(yesButton);
    buttonsContainer.appendChild(noButton);

    // If a secondary action is provided (e.g., Disassemble)
    if (onSecondary) {
        const secondaryButton = document.createElement('button');
        secondaryButton.textContent = 'Disassemble';
        secondaryButton.addEventListener('click', () => {
            try { if (typeof onSecondary === 'function') onSecondary(); } catch (e) { console.error(e); }
            closePopup();
        });
        buttonsContainer.appendChild(secondaryButton);
    }

    popup.appendChild(buttonsContainer);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Close when clicking outside
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closePopup(); });
    const onKey = (e) => { if (e.key === 'Escape') closePopup(); };
    document.addEventListener('keydown', onKey);
}

// Function to initialize equipment slots with click event listeners
function initializeEquipmentSlots() {
    // We no longer need to add click listeners here
    // This was causing double popups with the listeners in updateEquipmentDisplay
    
    // If we need to do other initialization for equipment slots in the future,
    // we can add it here
}

// Function to unequip an item with confirmation
function unequipItemWithConfirmation(slotName, event) {
    const equippedItem = getEquippedItemBySlot(slotName);
    if (!equippedItem) {
        logMessage('No item equipped in this slot.');
        return;
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'overlay';
    document.body.appendChild(overlay);

    // Create popup
    const popup = document.createElement('div');
    popup.className = 'confirmation-popup';

    const msg = document.createElement('p');
    msg.textContent = `Unequip ${equippedItem.name}?`;
    popup.appendChild(msg);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'popup-buttons';

    const yesButton = document.createElement('button');
    yesButton.textContent = 'Yes';
    yesButton.addEventListener('click', () => {
        unequipItem(slotName);
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
    popup.appendChild(buttonsContainer);
    
    // Add to DOM first so we can measure it
    document.body.appendChild(popup);
    
    // Position the popup near the equipment slot
    const slotElement = document.getElementById(slotName);
    const rect = slotElement ? slotElement.getBoundingClientRect() : { top: 0, left: 0 };
    
    // Get window dimensions
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Get popup dimensions
    const popupRect = popup.getBoundingClientRect();
    
    // Calculate position (near the slot)
    let left = rect.right + 10;
    let top = rect.top;
    
    // Make sure it doesn't go off the right edge
    if (left + popupRect.width > windowWidth - 20) {
        left = rect.left - popupRect.width - 10;
        
        // If that would go off the left edge, position it below
        if (left < 20) {
            left = Math.max(20, Math.min(windowWidth - popupRect.width - 20, rect.left));
            top = rect.bottom + 10;
        }
    }
    
    // Make sure it doesn't go off the bottom
    if (top + popupRect.height > windowHeight - 20) {
        top = Math.max(20, windowHeight - popupRect.height - 20);
    }
    
    // Apply position
    popup.style.position = 'fixed';
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
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
    // If the slot is a bionic slot, handle differently
    if (slotName.startsWith('bionic-slot-')) {
        const slotIndex = parseInt(slotName.split('-')[2]);
        if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= player.equipment.bionicSlots.length) {
            return false;
        }
        if (!player.equipment.bionicSlots[slotIndex]) return false;
        // Add the bionic back to inventory
        addItemToInventory(player.equipment.bionicSlots[slotIndex]);
        
        // Play sound
        if (window.playSound) {
            playSound('ITEM_DROP');
        }
        
        // Remove from equipment
        player.equipment.bionicSlots[slotIndex] = null;
    } else {
        if (!player.equipment[slotName]) return false;
        // Regular equipment slot
        // Add back to inventory
        addItemToInventory(player.equipment[slotName]);
        
        // Play sound
        if (window.playSound) {
            playSound('ITEM_DROP');
        }
        
        // Remove from equipment
        player.equipment[slotName] = null;
    }

    // Reset and reapply all passive bonuses from gear
    resetGearPassiveBonuses();
    // Passive application owns the single authoritative stat rebuild.
    applyAllPassivesToPlayer();
    recomputePlayerEffects();

    // Update displays
    updateInventoryDisplay();
    updateEquipmentDisplay();
    updatePlayerStatsDisplay();
    
    return true;
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
                const material = generateItemInstance(materialTemplate);
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

// Function to show equipment selection window for a specific slot
function showEquipmentSelectionWindow(slotName, bionicIndex = null) {
    // Check if overlay already exists and remove it
    const existingOverlay = document.getElementById('equipment-selection-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'equipment-selection-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    document.body.appendChild(overlay);

    // Create main window
    const window = document.createElement('div');
    window.className = 'equipment-selection-window';
    window.style.cssText = `
        background: linear-gradient(to bottom, #001a33, #000d1a);
        border: 2px solid #00ffcc;
        border-radius: 8px;
        padding: 20px;
        max-width: 500px;
        max-height: 70vh;
        overflow-y: auto;
        box-shadow: 0 0 20px rgba(0, 255, 204, 0.3);
    `;

    // Title
    const title = document.createElement('h3');
    title.style.cssText = `
        color: #00ffcc;
        margin: 0 0 15px 0;
        text-align: center;
        font-family: 'Orbitron', sans-serif;
    `;
    
    if (slotName === 'bionic') {
        title.textContent = `Select Bionic for Slot ${bionicIndex + 1}`;
    } else {
        title.textContent = `Select ${capitalize(slotName.replace('Hand', ' Hand'))} Equipment`;
    }
    window.appendChild(title);

    // Check if there's currently equipped item and add unequip button
    let currentItem = null;
    if (slotName === 'bionic') {
        currentItem = player.equipment.bionicSlots[bionicIndex];
    } else {
        currentItem = player.equipment[slotName];
    }

    if (currentItem) {
        const unequipSection = document.createElement('div');
        unequipSection.style.cssText = `
            margin-bottom: 15px;
            padding: 10px;
            background: rgba(255, 100, 100, 0.1);
            border-radius: 4px;
            border-left: 3px solid #ff6464;
        `;

        const currentItemLabel = document.createElement('p');
        currentItemLabel.style.cssText = `
            margin: 0 0 10px 0;
            color: #ffffff;
            font-weight: bold;
        `;
        currentItemLabel.textContent = `Currently equipped: ${currentItem.name}`;
        unequipSection.appendChild(currentItemLabel);

        const unequipButton = document.createElement('button');
        unequipButton.textContent = 'Unequip';
        unequipButton.style.cssText = `
            background: linear-gradient(to bottom, #cc3333, #aa1111);
            color: white;
            border: 1px solid #ff6464;
            border-radius: 4px;
            padding: 8px 15px;
            cursor: pointer;
            font-family: 'Orbitron', sans-serif;
            transition: all 0.2s ease;
        `;
        unequipButton.addEventListener('mouseover', () => {
            unequipButton.style.background = 'linear-gradient(to bottom, #ff4444, #cc3333)';
        });
        unequipButton.addEventListener('mouseout', () => {
            unequipButton.style.background = 'linear-gradient(to bottom, #cc3333, #aa1111)';
        });
        unequipButton.addEventListener('click', () => {
            if (slotName === 'bionic') {
                unequipItem(`bionic-slot-${bionicIndex}`);
            } else {
                unequipItem(slotName);
            }
            document.body.removeChild(overlay);
            updateEquipmentDisplay();
        });
        unequipSection.appendChild(unequipButton);

        // Manage Wires button if equipped item has wire slots
        if (Array.isArray(currentItem.rolledWires) && currentItem.rolledWires.length > 0) {
            const mwButton = document.createElement('button');
            mwButton.textContent = 'Manage Wires';
            mwButton.style.cssText = `
                margin-left: 10px;
                background: linear-gradient(to bottom, #003366, #001133);
                color: #00ffcc;
                border: 1px solid #00ffcc;
                border-radius: 4px;
                padding: 8px 15px;
                cursor: pointer;
                font-family: 'Orbitron', sans-serif;
                transition: all 0.2s ease;
            `;
            mwButton.addEventListener('mouseover', () => {
                mwButton.style.background = 'linear-gradient(to bottom, #004080, #002255)';
            });
            mwButton.addEventListener('mouseout', () => {
                mwButton.style.background = 'linear-gradient(to bottom, #003366, #001133)';
            });
            mwButton.addEventListener('click', () => {
                openManageWiresWindow(currentItem);
            });
            unequipSection.appendChild(mwButton);
        }
        window.appendChild(unequipSection);
    }

    // Get available items for this slot
    const availableItems = inventory.filter(item => {
        if (slotName === 'bionic') {
            return item.slot === 'bionic' && item.type === 'Bionic';
        } else {
            return item.slot === slotName && isEquippableItem(item);
        }
    });

    // Items container
    const itemsContainer = document.createElement('div');
    itemsContainer.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: 10px;
        margin-bottom: 15px;
    `;

    if (availableItems.length === 0) {
        const noItemsMsg = document.createElement('p');
        noItemsMsg.style.cssText = `
            color: #888888;
            text-align: center;
            font-style: italic;
            margin: 20px 0;
        `;
        noItemsMsg.textContent = 'No compatible items in inventory';
        itemsContainer.appendChild(noItemsMsg);
    } else {
        availableItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.style.cssText = `
                background: linear-gradient(to bottom, #003366, #001133);
                border: 1px solid #00306e;
                border-radius: 4px;
                padding: 8px;
                cursor: pointer;
                text-align: center;
                transition: all 0.2s ease;
                position: relative;
            `;

            const itemIcon = document.createElement('img');
            itemIcon.src = item.icon || 'icons/default-icon.png';
            itemIcon.style.cssText = `
                width: 40px;
                height: 40px;
                display: block;
                margin: 0 auto 5px auto;
            `;
            itemElement.appendChild(itemIcon);

            const itemName = document.createElement('div');
            itemName.style.cssText = `
                color: #ffffff;
                font-size: 12px;
                word-wrap: break-word;
            `;
            itemName.textContent = item.name;
            itemElement.appendChild(itemName);

            // Add quantity if stackable
            if (item.stackable && item.quantity > 1) {
                const quantityLabel = document.createElement('div');
                quantityLabel.style.cssText = `
                    position: absolute;
                    top: 2px;
                    right: 2px;
                    background: rgba(0, 255, 204, 0.8);
                    color: #000;
                    font-size: 10px;
                    padding: 1px 3px;
                    border-radius: 2px;
                    font-weight: bold;
                `;
                quantityLabel.textContent = item.quantity;
                itemElement.appendChild(quantityLabel);
            }

            // Hover effects
            itemElement.addEventListener('mouseover', () => {
                itemElement.style.background = 'linear-gradient(to bottom, #004080, #002255)';
                itemElement.style.borderColor = '#00ffcc';
                itemElement.style.boxShadow = '0 0 8px rgba(0, 255, 204, 0.4)';
            });
            itemElement.addEventListener('mouseout', () => {
                itemElement.style.background = 'linear-gradient(to bottom, #003366, #001133)';
                itemElement.style.borderColor = '#00306e';
                itemElement.style.boxShadow = 'none';
            });

            // Click to equip
            itemElement.addEventListener('click', () => {
                equipItem(item);
                document.body.removeChild(overlay);
                updateEquipmentDisplay();
            });

            itemsContainer.appendChild(itemElement);
        });
    }

    window.appendChild(itemsContainer);

    // Close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.cssText = `
        background: linear-gradient(to bottom, #003366, #001133);
        color: #00ffcc;
        border: 1px solid #00ffcc;
        border-radius: 4px;
        padding: 10px 20px;
        cursor: pointer;
        font-family: 'Orbitron', sans-serif;
        width: 100%;
        transition: all 0.2s ease;
    `;
    closeButton.addEventListener('mouseover', () => {
        closeButton.style.background = 'linear-gradient(to bottom, #004080, #002255)';
        closeButton.style.boxShadow = '0 0 8px rgba(0, 255, 204, 0.6)';
    });
    closeButton.addEventListener('mouseout', () => {
        closeButton.style.background = 'linear-gradient(to bottom, #003366, #001133)';
        closeButton.style.boxShadow = 'none';
    });
    closeButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    window.appendChild(closeButton);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });

    overlay.appendChild(window);
}

// Function to check if an item is actually equippable
function isEquippableItem(item) {
    // Define valid equipment slots
    const validEquipmentSlots = [
        'mainHand', 'offHand',           // Weapons
        'head', 'chest', 'legs', 'feet', 'gloves',  // Armor
        'bionic'                         // Bionics
    ];
    
    // Item must have a valid equipment slot and not be a material
    return item.slot && 
           validEquipmentSlots.includes(item.slot) && 
           item.type !== 'Material';
}

// Function to show item options popup
function showItemOptionsPopup(item, clickEvent) {
    // Check if overlay already exists and remove it
    const existingOverlay = document.getElementById('overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    // Create overlay (use unique id to avoid clashing with generic confirmation overlays)
    const overlay = document.createElement('div');
    overlay.id = 'item-options-overlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:100000;';
    document.body.appendChild(overlay);

    // Create popup
    const popup = document.createElement('div');
    popup.className = 'confirmation-popup';

    const msg = document.createElement('p');
    msg.textContent = `What would you like to do with ${item.name}?`;
    popup.appendChild(msg);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'popup-buttons';

    // Lock/Unlock toggle (icon only)
    const lockButton = document.createElement('button');
    const isLocked = !!item.locked;
    lockButton.textContent = isLocked ? '🔒' : '🔓';
    lockButton.title = isLocked ? 'Unlock item' : 'Lock item';
    lockButton.addEventListener('click', () => {
        item.locked = !item.locked;
        lockButton.textContent = item.locked ? '🔒' : '🔓';
        lockButton.title = item.locked ? 'Unlock item' : 'Lock item';
        updateInventoryDisplay();
    });
    buttonsContainer.appendChild(lockButton);

    // Equip Button (only if item is actually equippable - not materials)
    if (item.slot && item.type !== 'Material' && isEquippableItem(item)) {
        const equipButton = document.createElement('button');
        equipButton.textContent = 'Equip';
        if (item.locked) { equipButton.disabled = true; equipButton.title = 'Item locked'; }
        equipButton.addEventListener('click', () => {
            if (item.locked) { logMessage('Item is locked. Unlock it to equip.'); return; }
            equipItem(item);
            if (popup && popup.parentNode) popup.remove();
            if (overlay && overlay.parentNode) overlay.remove();
        });
        buttonsContainer.appendChild(equipButton);
    }

    // Manage Wires (if item has wire slots)
    if (Array.isArray(item.rolledWires) && item.rolledWires.length > 0) {
        const manageWiresButton = document.createElement('button');
        manageWiresButton.textContent = 'Manage Wires';
        manageWiresButton.addEventListener('click', () => {
            if (popup && popup.parentNode) popup.remove();
            if (overlay && overlay.parentNode) overlay.remove();
            openManageWiresWindow(item);
        });
        buttonsContainer.appendChild(manageWiresButton);
    }

    // Disassemble Button (if applicable)
    if (item.isDisassembleable) {
        const disassembleButton = document.createElement('button');
        disassembleButton.textContent = 'Disassemble';
        if (item.locked) { disassembleButton.disabled = true; disassembleButton.title = 'Item locked'; }
        disassembleButton.addEventListener('click', () => {
            if (item.locked) { logMessage('Item is locked. Unlock it to disassemble.'); return; }
            disassembleItem(item);
            if (popup && popup.parentNode) popup.remove();
            if (overlay && overlay.parentNode) overlay.remove();
        });
        buttonsContainer.appendChild(disassembleButton);
    }

	// Sell Button (all items)
	const sellButton = document.createElement('button');
	sellButton.textContent = 'Sell';
    sellButton.addEventListener('click', () => {
		const price = Number(item.salePrice) || 0;
		const disableConfirm = localStorage.getItem('disableSellConfirm') === 'true';
		const doSell = () => {
            if (item.locked) { logMessage('Item is locked. Unlock it to sell.'); return; }
            sellItem(item, 1);
			if (popup && popup.parentNode) popup.remove();
			if (overlay && overlay.parentNode) overlay.remove();
		};
		if (disableConfirm) {
			doSell();
		} else {
			showConfirmationPopup(`Sell ${item.name} for ${price} credits?`, doSell);
		}
	});
	buttonsContainer.appendChild(sellButton);

    // Cancel Button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => {
        if (popup && popup.parentNode) popup.remove();
        if (overlay && overlay.parentNode) overlay.remove();
    });
    buttonsContainer.appendChild(cancelButton);

    // Add the buttons container to the popup
    popup.appendChild(buttonsContainer);
    
    // Add to DOM first so we can calculate size
    document.body.appendChild(popup);
    // Dynamically size the window to be just wider than the buttons row
    try {
        // Sum individual button widths plus the gap between them (10px set in CSS)
        const btns = Array.from(buttonsContainer.querySelectorAll('button'));
        const sumButtons = btns.reduce((sum, b) => sum + (b.getBoundingClientRect().width || 0), 0);
        const gaps = Math.max(0, btns.length - 1) * 10;
        const paddingBuffer = 40; // small padding around contents
        const desired = sumButtons + gaps + paddingBuffer;
        const maxAllowed = Math.max(320, window.innerWidth - 40);
        const targetWidth = Math.min(desired, maxAllowed);
        popup.style.maxWidth = 'none';
        popup.style.width = `${Math.max(320, targetWidth)}px`;
    } catch (e) { /* ignore sizing errors */ }
    
    // Position the popup near the clicked item
    if (clickEvent && clickEvent.clientX && clickEvent.clientY) {
        // Get window dimensions
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Get popup dimensions
        const popupRect = popup.getBoundingClientRect();
        
        // Calculate position (start at click position)
        let left = clickEvent.clientX + 10;
        let top = clickEvent.clientY;
        
        // Make sure it doesn't go off the right edge
        if (left + popupRect.width > windowWidth - 20) {
            left = windowWidth - popupRect.width - 20;
        }
        
        // Make sure it doesn't go off the bottom
        if (top + popupRect.height > windowHeight - 20) {
            top = windowHeight - popupRect.height - 20;
        }
        
        // Make sure it doesn't go off the top
        if (top < 20) {
            top = 20;
        }
        
        // Apply position
        popup.style.position = 'fixed';
        popup.style.top = `${top}px`;
        popup.style.left = `${left}px`;
    }

    // Close on overlay click and ESC
    overlay.addEventListener('click', () => {
        if (popup && popup.parentNode) popup.remove();
        if (overlay && overlay.parentNode) overlay.remove();
    });
    const onKey = (e) => {
        if (e.key === 'Escape') {
            if (popup && popup.parentNode) popup.remove();
            overlay.remove();
            document.removeEventListener('keydown', onKey);
        }
    };
    document.addEventListener('keydown', onKey);
}

// Sell an item (sells one unit for stackables)
function sellItem(item, quantity = 1) {
	if (!item) return;
    if (item.locked) { logMessage('Item is locked. Unlock it to sell.'); return; }
    const pricePer = getItemSalePrice(item);
	let soldCount = 0;
	if (item.stackable && item.quantity && item.quantity > 1) {
		const toSell = Math.max(1, Math.min(quantity, item.quantity));
		item.quantity -= toSell;
		soldCount = toSell;
		if (item.quantity <= 0) {
			removeItemFromInventory(item);
		}
	} else {
		// Non-stackable or single
		removeItemFromInventory(item);
		soldCount = 1;
	}
	const total = pricePer * soldCount;
	if (typeof playerCurrency === 'number') {
		playerCurrency += total;
	}
	logMessage(`Sold ${item.name}${soldCount > 1 ? ' x' + soldCount : ''} for ${total} credits.`);
	updateInventoryDisplay();
}

// Bulk: Sell all sellable, unlocked items in inventory
function sellAllInInventory() {
    const disableConfirm = localStorage.getItem('disableSellConfirm') === 'true';
    const sellable = window.inventory.filter(it => it && !it.locked && getItemSalePrice(it) > 0);
    if (sellable.length === 0) { logMessage('No sellable items found.'); return; }
    const previewTotal = sellable.reduce((sum, it) => sum + getItemSalePrice(it) * (it.stackable ? (it.quantity||1) : 1), 0);
    const doAll = () => {
        // Recompute defensively and remove as we go
        let soldCount = 0;
        let credits = 0;
        window.inventory = window.inventory.filter(it => {
            if (!it || it.locked) return true;
            const price = getItemSalePrice(it);
            if (price <= 0) return true;
            const qty = it.stackable ? (it.quantity||1) : 1;
            credits += price * qty;
            soldCount += 1;
            return false; // remove from inventory
        });
        if (typeof playerCurrency === 'number') playerCurrency += credits;
        logMessage(`Sold ${soldCount} item${soldCount!==1?'s':''} for ${credits} credits.`);
        updateInventoryDisplay();
        notifyInventoryChange();
    };
    if (disableConfirm) doAll(); else showConfirmationPopup(`Sell all (${sellable.length}) items for ${previewTotal} credits?`, doAll);
}

// Bulk: Disassemble all eligible, unlocked items
function disassembleAllInInventory() {
    const eligible = window.inventory.filter(it => it && it.isDisassembleable && !it.locked);
    if (eligible.length === 0) { logMessage('No disassembleable items found.'); return; }
    const doAll = () => {
        // Walk items and disassemble one by one to preserve stacking rules
        const items = [...window.inventory];
        window.inventory = [];
        items.forEach(it => {
            if (it && it.isDisassembleable && !it.locked) {
                const qty = it.stackable ? (it.quantity||1) : 1;
                for (let i = 0; i < qty; i++) {
                    const mats = getMaterialsFromItem(it);
                    mats.forEach(m => addItemToInventory(m));
                }
            } else if (it) {
                window.inventory.push(it);
            }
        });
        logMessage(`Disassembled ${eligible.length} item${eligible.length!==1?'s':''}. Materials added to inventory.`);
        updateInventoryDisplay();
        notifyInventoryChange();
    };
    showConfirmationPopup(`Disassemble all (${eligible.length}) eligible items?`, doAll);
}

// Manage Wires UI
function openManageWiresWindow(item) {
    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'manage-wires-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 100000;
        display:flex; align-items:center; justify-content:center;`;
    document.body.appendChild(overlay);

    // Window
    const win = document.createElement('div');
    win.className = 'manage-wires-window';
    win.style.cssText = `
        background: linear-gradient(to bottom, #001a33, #000d1a);
        border: 2px solid #00ffcc; border-radius: 8px; padding: 12px;
        width: 940px; max-width: 98vw; max-height: 80vh; overflow: hidden;
        box-shadow: 0 0 20px rgba(0,255,204,0.3); display:flex; flex-direction:row; gap:12px;`;
    overlay.appendChild(win);

    // Persistent item tooltip on the left
    const sideTooltip = document.createElement('div');
    sideTooltip.style.cssText = 'flex:0 0 320px; max-width:320px; overflow:auto; border:1px solid rgba(0,255,204,0.25); border-radius:6px; background: rgba(0,10,25,0.6); padding:8px;';
    const updateSideTooltip = () => {
        sideTooltip.innerHTML = getItemTooltipContent(item, false);
    };
    updateSideTooltip();
    win.appendChild(sideTooltip);

    // Right column container
    const rightCol = document.createElement('div');
    rightCol.style.cssText = 'flex:1; display:flex; flex-direction:column; gap:10px; min-width:0;';
    win.appendChild(rightCol);

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display:flex; align-items:center; justify-content:space-between;';
    const title = document.createElement('div');
    title.textContent = `Manage Wires — ${item.name}`;
    title.style.cssText = 'color:#00ffcc; font-weight:bold; font-size:16px;';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'background:linear-gradient(to bottom,#003366,#001133); color:#00ffcc; border:1px solid #00ffcc; border-radius:4px; padding:6px 10px; cursor:pointer;';
    closeBtn.onclick = () => overlay.remove();
    header.appendChild(title); header.appendChild(closeBtn); rightCol.appendChild(header);

    // Body split: chips (top) and slots (bottom)
    const body = document.createElement('div');
    body.style.cssText = 'display:flex; flex-direction:column; gap:10px; flex:1; overflow:hidden;';
    rightCol.appendChild(body);

    // Chips list
    const chipsPanel = document.createElement('div');
    chipsPanel.style.cssText = 'background: rgba(0,0,0,0.4); border:1px solid rgba(0,255,204,0.3); border-radius:6px; padding:10px; flex:1; overflow:auto;';
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;';
    const chipsHeader = document.createElement('div');
    chipsHeader.textContent = 'Inventory Chips';
    chipsHeader.style.cssText = 'color:#66ccff;';
    headerRow.appendChild(chipsHeader);
    // Chip color filter buttons
    const filterRow = document.createElement('div');
    filterRow.style.cssText = 'display:flex; gap:6px;';
    const filters = ['All','Red','Green','Blue','Black'];
    let currentFilter = 'All';
    filters.forEach(name => {
        const b = document.createElement('button');
        b.textContent = name;
        b.style.cssText = 'background:linear-gradient(to bottom,#003366,#001133); color:#cfe6ff; border:1px solid #004a7f; border-radius:4px; padding:4px 6px; cursor:pointer; font-size:12px;';
        b.addEventListener('click', ()=>{ currentFilter = name; renderChips(); });
        filterRow.appendChild(b);
    });
    headerRow.appendChild(filterRow);
    chipsPanel.appendChild(headerRow);

    const chipsGrid = document.createElement('div');
    chipsGrid.style.cssText = 'display:grid; grid-template-columns: repeat(auto-fill, minmax(120px,1fr)); gap:8px;';
    chipsPanel.appendChild(chipsGrid);
    body.appendChild(chipsPanel);

    // Slots panel
    const slotsPanel = document.createElement('div');
    slotsPanel.style.cssText = 'background: rgba(0,0,0,0.5); border:1px solid rgba(0,255,204,0.3); border-radius:6px; padding:10px;';
    const slotsHeader = document.createElement('div');
    slotsHeader.textContent = 'Wire Slots';
    slotsHeader.style.cssText = 'color:#66ffcc; margin-bottom:6px;';
    slotsPanel.appendChild(slotsHeader);

    // Unsocket All button (per item)
    const unsocketAllBtn = document.createElement('button');
    unsocketAllBtn.textContent = 'Unsocket All';
    unsocketAllBtn.style.cssText = 'margin: 0 0 8px 0; background:linear-gradient(to bottom,#332200,#221100); color:#ffcc66; border:1px solid #ffcc66; border-radius:4px; padding:6px 10px; cursor:pointer;';
    unsocketAllBtn.addEventListener('click', () => {
        let changed = false;
        (item.rolledWires || []).forEach(w => {
            if (w.chip) { addItemToInventory(w.chip); w.chip = null; changed = true; }
        });
        if (changed) {
            player.calculateStats();
            recomputePlayerEffects();
            updateInventoryDisplay();
            updateEquipmentDisplay();
            renderSlots();
            renderChips();
            updateSideTooltip();
        }
    });
    slotsPanel.appendChild(unsocketAllBtn);

    const slotsRow = document.createElement('div');
    slotsRow.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px;';
    slotsPanel.appendChild(slotsRow);
    body.appendChild(slotsPanel);

    // Selection state
    let selectedSlotIndex = -1;

    const colorHex = { red:'#ff6b6b', green:'#51cf66', blue:'#74c0fc', black:'#ced4da' };

    function chipStatsHtml(chip) {
        if (!chip) return '<em>Empty</em>';
        const parts = [];
        const chipState = typeof getEquippedChipState === 'function' ? getEquippedChipState(player) : null;
        if (isBlackChip(chip) && chipState?.hasBlackConflict) {
            parts.push('<strong style="color:#ff6b6b;">DISABLED — multiple Black Chips equipped</strong>');
        }
        if (chip.damageTypes) {
            for (const dt in chip.damageTypes) parts.push(`+${chip.damageTypes[dt]} ${dt}`);
        }
        if (chip.statModifiers) {
            if (chip.statModifiers.damageTypes) {
                for (const dt in chip.statModifiers.damageTypes) parts.push(`+${chip.statModifiers.damageTypes[dt]}% ${dt} dmg`);
            }
            for (const k in chip.statModifiers) {
                if (k === 'damageTypes' || k === 'damageGroups') continue;
                parts.push(`+${chip.statModifiers[k]} ${k}`);
            }
        }
        if (chip.precision) parts.push(`+${chip.precision} Precision`);
        if (chip.deflection) parts.push(`+${chip.deflection} Deflection`);
        return parts.length ? parts.join('<br>') : '<em>No stats</em>';
    }

    function renderSlots() {
        slotsRow.innerHTML = '';
        (item.rolledWires || []).forEach((wire, idx) => {
            const slot = document.createElement('div');
            const border = colorHex[wire.color] || '#adb5bd';
            const blackConflict = isBlackChip(wire.chip)
                && typeof getEquippedChipState === 'function'
                && getEquippedChipState(player).hasBlackConflict;
            slot.style.cssText = `min-width:120px; flex:0 0 auto; padding:8px; border:1px solid ${border}; border-radius:4px; background: rgba(0,20,45,0.4); cursor:pointer;`;
            slot.innerHTML = `<div style="color:${border}; font-weight:bold; margin-bottom:4px;">${capitalize(wire.color)} Wire</div>` +
                             `<div style="color:#cfe6ff; font-size:12px;">${wire.chip ? wire.chip.name : 'Empty'}</div>` +
                             (blackConflict ? '<div style="color:#ff6b6b; font-size:11px; font-weight:bold; margin-top:4px;">DISABLED</div>' : '') +
                             (wire.chip ? `<div style="margin-top:6px;"><button data-act="remove" style="background:#3b0; color:#fff; border:1px solid #4d4; border-radius:3px; padding:3px 6px; cursor:pointer;">Remove</button></div>` : '');
            // Tooltip for this slot showing the slotted chip's stats
            slot.setAttribute('data-has-tooltip', 'true');
            slot.setAttribute('data-tooltip-content', chipStatsHtml(wire.chip));
            if (idx === selectedSlotIndex) slot.style.boxShadow = `0 0 8px ${border}`;
            slot.addEventListener('click', (e) => {
                // If clicking remove button, unsocket
                if (e.target && e.target.getAttribute('data-act') === 'remove') {
                    if (wire.chip) {
                        addItemToInventory(wire.chip);
                        wire.chip = null;
                        player.calculateStats();
                        recomputePlayerEffects();
                        updateInventoryDisplay();
                        updateEquipmentDisplay();
                        renderSlots();
                        renderChips();
                        updateSideTooltip();
                    }
                    return;
                }
                selectedSlotIndex = idx;
                renderSlots();
            });
            slotsRow.appendChild(slot);
        });
    }

    function canUseChipInSlot(chip, wireColor) {
        if (!chip || chip.type !== 'Chip') return false;
        if (wireColor === 'black') return true; // accepts any
        return (chip.color && chip.color.toLowerCase() === wireColor);
    }

    function isBlackChip(chip) { return chip && chip.type === 'Chip' && (chip.color||'').toLowerCase() === 'black'; }

    function anyBlackChipEquipped() {
        return typeof getEquippedChipState === 'function'
            ? getEquippedChipState(player).blackCount > 0
            : false;
    }

    function managedItemIsEquipped() {
        const equipment = player?.equipment || {};
        if (['mainHand','offHand','head','chest','legs','feet','gloves']
            .some(slot => equipment[slot] === item)) return true;
        return Array.isArray(equipment.bionicSlots) && equipment.bionicSlots.includes(item);
    }

    function renderChips() {
        chipsGrid.innerHTML = '';
        const chipItems = window.inventory.filter(i => i && i.type === 'Chip').filter(c => {
            if (currentFilter === 'All') return true;
            return (c.color||'').toLowerCase() === currentFilter.toLowerCase();
        });
        if (chipItems.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'color:#aaa; font-style:italic;';
            empty.textContent = 'No chips in inventory.';
            chipsGrid.appendChild(empty);
            return;
        }
        // Show each chip instance as its own card (no grouping)
        chipItems.forEach(chip => {
            const card = document.createElement('div');
            const border = colorHex[chip.color] || '#888';
            card.style.cssText = `border:1px solid ${border}; border-radius:4px; padding:8px; background: linear-gradient(135deg, rgba(0,34,85,0.5), rgba(0,17,51,0.5)); cursor:pointer;`;
            card.innerHTML = `<div style="color:${border}; font-weight:bold; margin-bottom:4px;">${chip.name}</div>` +
                             `<div style="color:#cfe6ff; font-size:12px;">Color: ${capitalize(chip.color||'unknown')}</div>`;
            // Tooltip for chip stats
            card.setAttribute('data-has-tooltip', 'true');
            card.setAttribute('data-tooltip-source', 'chip-card');
            card.setAttribute('data-tooltip-content', getItemTooltipContent(chip));
            card.addEventListener('click', () => {
                if (selectedSlotIndex < 0) { logMessage('Select a wire slot first.'); return; }
                const wire = item.rolledWires[selectedSlotIndex];
                if (!canUseChipInSlot(chip, wire.color)) { logMessage('Chip color does not match this wire.'); return; }
                if (isBlackChip(chip) && managedItemIsEquipped() && anyBlackChipEquipped() && !(wire.chip && isBlackChip(wire.chip))) { logMessage('Only one Black Chip may be equipped across all gear.'); return; }
                // If slot already has chip, return it to inventory first
                if (wire.chip) addItemToInventory(wire.chip);
                // Remove this exact chip instance from inventory
                removeItemFromInventory(chip);
                // Slot a cloned single-quantity instance to avoid inventory reference sharing
                const slotted = { ...chip };
                slotted.quantity = 1;
                slotted.stackable = false;
                wire.chip = slotted;
                player.calculateStats();
                recomputePlayerEffects();
                updateInventoryDisplay();
                updateEquipmentDisplay();
                renderSlots();
                renderChips();
                updateSideTooltip();
            });
            chipsGrid.appendChild(card);
        });
    }

    renderSlots();
    renderChips();

    // Close on overlay click
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    const onKey = (e) => { if (e.key === 'Escape') { if (overlay && overlay.parentNode) overlay.remove(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
}
