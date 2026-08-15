// npcshops.js
console.log('npcshops.js loaded');

// Stock/restock mechanics removed per design

const MARTY_COMPONENT_UNLOCK_COUNT = 5;
const MARTY_COMMON_COMPONENTS = [
    { itemName: "Scrap Metal", price: 15, levelReq: 1 },
    { itemName: "Wire Bundle", price: 30, levelReq: 1 },
    { itemName: "Metal Fasteners", price: 25, levelReq: 1 },
    { itemName: "Minor Electronic Circuit", price: 250, levelReq: 2 },
    { itemName: "Basic Servo", price: 120, levelReq: 2 },
    { itemName: "Iron Ore", price: 45, levelReq: 6 },
    { itemName: "Copper Ore", price: 55, levelReq: 6 },
    { itemName: "Titanium", price: 120, levelReq: 11 },
    { itemName: "Titanium Plating", price: 350, levelReq: 16 },
    { itemName: "Advanced Servo", price: 600, levelReq: 21 },
    { itemName: "Advanced Electronic Circuit", price: 700, levelReq: 21 },
    { itemName: "Advanced Alloy", price: 1000, levelReq: 31 }
].map(item => ({
    ...item,
    stock: 999,
    defaultStock: 999,
    martyDropUnlock: MARTY_COMPONENT_UNLOCK_COUNT
}));

function getComponentDropCount(itemName) {
    return Math.max(0, Number(window.componentDropCounts?.[itemName] || 0));
}

function isShopItemVisible(invItem) {
    if (invItem.developerOnly && !window.coreboundConfig?.developerMode) return false;
    if (invItem.martyDropUnlock) {
        return getComponentDropCount(invItem.itemName) >= invItem.martyDropUnlock;
    }
    return true;
}

// Example NPC array with new properties:
// - defaultStock: resets to this after timer
// - levelReq: The player's level must be >= this to buy (but we still show it locked)
const npcs = [
    {
        name: "Marty",
        inventory: [
            ...MARTY_COMMON_COMPONENTS,
            {
                itemName: "Reaction Enhancer",
                price: 1,
                stock: 10,
                defaultStock: 1,
                levelReq: 1,
                developerOnly: true
            },
            { itemName: "Mod Pool Test Blade", price: 1, stock: 999, defaultStock: 999, levelReq: 1, developerOnly: true },
            { itemName: "Dual Pool Test Staff", price: 1, stock: 999, defaultStock: 999, levelReq: 1, developerOnly: true },
            { itemName: "Wired Test Dagger", price: 1, stock: 999, defaultStock: 999, levelReq: 1, developerOnly: true }
        ]
    },
    // Nurse Jen's med-tech inventory was retired with the med-tech system.
    // Keep her character available for a future authored role rather than
    // exposing an unrelated placeholder shop.
    {
        name: "Clarissa",
        inventory: [
            {
                itemName: "Fire Spewer Mk1",
                price: 1,
                stock: 5,
                defaultStock: 5,
                levelReq: 1,
                developerOnly: true
            },
            {
                itemName: "Phase Reaver",
                price: 1,
                stock: 5,
                defaultStock: 5,
                levelReq: 1,
                developerOnly: true
            },
            {
                itemName: "Combo Test Sword",
                price: 100,
                stock: 3,
                defaultStock: 3,
                levelReq: 1,
                developerOnly: true
            },
            {
                itemName: "Nanonic Phase Sword of Incision",
                price: 1,
                stock: 1,
                defaultStock: 1,
                levelReq: 1,
                developerOnly: true
            },
            {
                itemName: "Synthesized Alloy Chestplate",
                price: 1,
                stock: 5,
                defaultStock: 5,
                levelReq: 1,
                developerOnly: true
            },
            {
                itemName: "Big Brute Basher",
                price: 100,
                stock: 5,
                defaultStock: 5,
                levelReq: 1
            },
            {
                itemName: "Ionizing Whip",
                price: 100,
                stock: 5,
                defaultStock: 5,
                levelReq: 1
            }
        ]
    },
    {
        name: "Zara",
        inventory: [
            {
                itemName: "Inventory Slot Expansion",
                price: 5000,
                stock: 999, // Unlimited
                defaultStock: 999,
                levelReq: 1,
                isService: true, // Special flag for services
                description: "Permanently increases your inventory capacity by 1 slot. Maximum 500 slots total."
            }
        ]
    }
];

// Timer/stocks removed

// Display NPC list in #npc-list
function displayNPCList() {
    const npcListDiv = document.getElementById('npc-list');
    if (!npcListDiv) {
        console.error("Element with ID 'npc-list' not found.");
        return;
    }
    npcListDiv.innerHTML = '';

    npcs.forEach(npc => {
        const npcButton = document.createElement('button');
        npcButton.textContent = npc.name;
        npcButton.className = 'shop-npc-button';
        npcButton.addEventListener('click', () => {
            displayNPCShop(npc);
        });
        npcListDiv.appendChild(npcButton);
    });

    // Open the first available shop by default so the screen isn't empty
    if (!window.currentNPC && npcs.length > 0) {
        displayNPCShop(npcs[0]);
    }
}

// Display a single NPC's shop in #npc-shop-container
function displayNPCShop(npc) {
    window.currentNPC = npc; // Save reference if we need to refresh after stock reset
    const shopContainer = document.getElementById('npc-shop-container');
    if (!shopContainer) {
        console.error("Element with ID 'npc-shop-container' not found.");
        return;
    }
    shopContainer.innerHTML = '';

    shopContainer.classList.add('shop-container');

    // Header (show only Feed on the left; NPC name removed to avoid redundancy)
    const headerDiv = document.createElement('div');
    headerDiv.className = 'shop-header';
    const currencyP = document.createElement('div');
    currencyP.className = 'shop-currency';
    currencyP.textContent = `Feed: ${playerFeed}`;
    headerDiv.appendChild(currencyP);
    shopContainer.appendChild(headerDiv);

    // Grid container
    const grid = document.createElement('div');
    grid.className = 'shop-grid';
    shopContainer.appendChild(grid);

    // List items for sale
    const visibleInventory = npc.inventory.filter(isShopItemVisible);
    visibleInventory.forEach((invItem) => {
        const itemTemplate = items.find(i => i.name === invItem.itemName);
        const itemName = itemTemplate ? itemTemplate.name : invItem.itemName;
        const itemPrice = invItem.price;
        // Stock removed; items are always available (unless level/currency gated)
        const itemLevelReq = invItem.levelReq || 1;
        
        // Special handling for services
        const isService = invItem.isService || false; 

        // Card
        const itemDiv = document.createElement('div');
        itemDiv.className = 'shop-card';

        // Item name
        const itemNameP = document.createElement('p');
        itemNameP.textContent = itemName;
        itemNameP.className = 'shop-item-name';

        // Price
        const priceP = document.createElement('p');
        priceP.className = 'shop-item-price';
        priceP.textContent = `${itemPrice} Feed`;

        // Service info
        const serviceInfo = document.createElement('p');
        serviceInfo.className = 'shop-item-service';
        if (isService && invItem.itemName === "Inventory Slot Expansion") {
            const currentSlots = player.maxInventorySlots;
            const maxSlots = 500;
            const remaining = maxSlots - currentSlots;
            serviceInfo.innerHTML = `Current Slots: ${currentSlots}/500<br>Available: ${remaining} more slots`;
            serviceInfo.style.color = remaining > 0 ? '#00ffcc' : '#ff6464';
        }

        // Level requirement
        const levelReqP = document.createElement('p');
        levelReqP.className = 'shop-item-req';
        levelReqP.textContent = `Req. Level: ${itemLevelReq}`;

        // Description for services
        let descriptionP = null;
        if (isService && invItem.description) {
            descriptionP = document.createElement('p');
            descriptionP.textContent = invItem.description;
            descriptionP.className = 'shop-item-desc';
        }

        let needP = null;
        const missingFeed = Math.max(0, itemPrice - playerFeed);
        if (player.level >= itemLevelReq && missingFeed > 0) {
            itemDiv.classList.add('unaffordable');
            needP = document.createElement('p');
            needP.className = 'shop-item-need';
            needP.textContent = `Need +${missingFeed} Feed`;
        }

        const purchaseControls = document.createElement('div');
        purchaseControls.className = 'shop-purchase-controls';
        const purchaseQuantities = !isService && isMaterialItem(itemTemplate) ? [1, 10, 50] : [1];

        purchaseQuantities.forEach(quantity => {
            const buyButton = document.createElement('button');
            buyButton.className = 'shop-buy-button';
            buyButton.textContent = isService && invItem.itemName === 'Inventory Slot Expansion'
                ? 'Purchase Expansion'
                : `Buy ${quantity}`;

            if (isService && invItem.itemName === 'Inventory Slot Expansion' && player.maxInventorySlots >= 500) {
                buyButton.disabled = true;
                buyButton.textContent = 'Max Slots Reached';
                buyButton.title = 'You already have the maximum inventory capacity.';
            } else if (player.level < itemLevelReq) {
                buyButton.disabled = true;
                buyButton.textContent = 'Locked';
                buyButton.title = `Requires level ${itemLevelReq}`;
            } else {
                const cost = itemPrice * quantity;
                if (cost > playerFeed) {
                    buyButton.disabled = true;
                    buyButton.title = `Need +${cost - playerFeed} Feed`;
                }

                buyButton.addEventListener('click', () => {
                    const threshold = window.gameSettings?.purchaseConfirmThresholdCredits || 500;
                    const doBuy = () => buyItemFromNPC(npc, invItem, quantity);
                    if (!isService && !isMaterialItem(itemTemplate) && !hasInventorySpace(1)) {
                        const message = 'Your inventory is full. Free up space before purchasing this item.';
                        if (typeof showWarningPopup === 'function') showWarningPopup(message);
                        else logMessage(message);
                        return;
                    }
                    if (cost >= threshold && typeof showConfirmationPopup === 'function') {
                        showConfirmationPopup(`Confirm purchase of ${quantity} x ${itemName} for ${cost} Feed?`, doBuy);
                    } else if (cost >= threshold && window.confirm) {
                        if (confirm(`Purchase ${quantity} x ${itemName} for ${cost} Feed?`)) doBuy();
                    } else {
                        doBuy();
                    }
                });
            }
            purchaseControls.appendChild(buyButton);
        });

        // Setup tooltip using global system
        itemDiv.setAttribute('data-has-tooltip', 'true');
        itemDiv.setAttribute('data-tooltip-source', 'shop-item');
        itemDiv.setAttribute('data-tooltip-content', getItemTooltipContent(itemTemplate || invItem || {}, true));

        // Append everything
        itemDiv.appendChild(itemNameP);
        itemDiv.appendChild(priceP);
        if (isService) itemDiv.appendChild(serviceInfo);
        itemDiv.appendChild(levelReqP);
        if (descriptionP) {
            itemDiv.appendChild(descriptionP);
        }
        if (needP) itemDiv.appendChild(needP);
        itemDiv.appendChild(purchaseControls);

        grid.appendChild(itemDiv);
    });

    if (visibleInventory.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'shop-empty-message';
        emptyMessage.textContent = npc.name === 'Marty'
            ? `Marty stocks a common component after enemies have dropped 5 of it.`
            : 'Nothing is currently available.';
        grid.appendChild(emptyMessage);
    }
}

// Handle purchasing an item from an NPC
function buyItemFromNPC(npc, itemOrIndex, quantity) {
    const invItem = typeof itemOrIndex === 'number'
        ? npc.inventory[itemOrIndex]
        : itemOrIndex;
    if (!invItem) {
        console.error("Item not found in NPC inventory.");
        return;
    }
    const cost = invItem.price * quantity;

    // Check if player has enough Feed
    if (playerFeed < cost) {
        logMessage(`You don't have enough Feed to buy ${quantity} of ${invItem.itemName}!`);
        return;
    }
    // Deduct Feed
    playerFeed -= cost;

    // Handle services vs regular items
    if (invItem.isService) {
        // Special handling for services
        if (invItem.itemName === "Inventory Slot Expansion") {
            // Check if player is already at max slots
            if (player.maxInventorySlots >= 500) {
                logMessage("You already have the maximum number of inventory slots (500)!");
                // Refund the purchase
                playerFeed += cost;
                return;
            }
            
            // Check if this purchase would exceed the limit
            const newSlotCount = player.maxInventorySlots + quantity;
            if (newSlotCount > 500) {
                const maxPurchasable = 500 - player.maxInventorySlots;
                logMessage(`You can only buy ${maxPurchasable} more inventory slots to reach the maximum of 500.`);
                // Refund the purchase
                playerFeed += cost;
                return;
            }
            
            // Apply the expansion
            player.maxInventorySlots += quantity;
            logMessage(`Inventory expanded! You now have ${player.maxInventorySlots} slots (purchased ${quantity} slot${quantity > 1 ? 's' : ''} for ${cost} Feed).`);
            
            // Update inventory display to show new slot count
            updateInventoryDisplay();
        } else {
            logMessage(`Unknown service: ${invItem.itemName}`);
            // Refund unknown services
            playerFeed += cost;
            invItem.stock += quantity;
            return;
        }
    } else {
        // Regular item handling
        const itemTemplate = items.find(i => i.name === invItem.itemName);
        if (itemTemplate) {
            const purchasedItem = generateItemInstance(itemTemplate);
            purchasedItem.quantity = quantity;
            // Inventory capacity check again just in case
            if (!isMaterialItem(purchasedItem) && !hasInventorySpace(1)) {
                if (typeof showWarningPopup === 'function') {
                    showWarningPopup('Your inventory is full. Purchase cancelled.');
                }
                // Refund the purchase
                playerFeed += cost;
                return;
            }
            const success = addItemToInventory(purchasedItem);
            if (success) {
                logMessage(`You bought ${quantity}x ${invItem.itemName} for ${cost} Feed.`);
            } else {
                // Inventory was full, refund the purchase
                playerFeed += cost;
                return;
            }
        } else {
            logMessage(`Error: item template for ${invItem.itemName} not found in items.js.`);
            // Refund on error
            playerFeed += cost;
            return;
        }
    }

    // Refresh NPC shop display
    displayNPCShop(npc);
}

// Make sure to clean up when screen changes
function cleanupShopUI() {
    window.currentNPC = null;
    const shopContainer = document.getElementById('npc-shop-container');
    if (shopContainer) {
        shopContainer.innerHTML = '';
    }
}

    // Initialize shops
    window.registerCoreboundInitializer(() => {
        // Listen for screen changes so we can show NPC list and clean up shop UI
    window.addEventListener('screenChanged', (e) => {
        if (e.detail.screenId === 'shops-screen') {
            displayNPCList();
            // If no NPC currently open, open the first by default
            if (!window.currentNPC && npcs.length > 0) {
                displayNPCShop(npcs[0]);
            }
        } else if (window.currentNPC) {
            // Clean up shop UI when leaving shops screen
            cleanupShopUI();
        }
    });

    // If you want the NPC list loaded from the start:
    // displayNPCList();
});
