// npcshops.js
console.log('npcshops.js loaded');

// Stock/restock mechanics removed per design

// Example NPC array with new properties:
// - defaultStock: resets to this after timer
// - levelReq: The player's level must be >= this to buy (but we still show it locked)
const npcs = [
    {
        name: "Mech Marty",
        inventory: [
            {
                itemName: "Scrap Metal",
                price: 5000,
                stock: 999,
                defaultStock: 999,
                levelReq: 1
            },
            {
                itemName: "Minor Electronic Circuit",
                price: 25,
                stock: 20,
                defaultStock: 20,
                levelReq: 2
            },
            {
                itemName: "Reaction Enhancer",
                price: 1,
                stock: 10,
                defaultStock: 1,
                levelReq: 1
            },
            { itemName: "Mod Pool Test Blade", price: 1, stock: 999, defaultStock: 999, levelReq: 1 },
            { itemName: "Dual Pool Test Staff", price: 1, stock: 999, defaultStock: 999, levelReq: 1 },
            { itemName: "Wired Test Dagger", price: 1, stock: 999, defaultStock: 999, levelReq: 1 },
            { itemName: "Red Test Chip", price: 1, stock: 999, defaultStock: 999, levelReq: 1 },
            { itemName: "Critical Test Bionic", price: 1, stock: 999, defaultStock: 999, levelReq: 1 },
            { itemName: "Pyro Booster", price: 1, stock: 999, defaultStock: 999, levelReq: 1 }
        ]
    },
    {
        name: "Nurse Jen",
        inventory: [
            {
                itemName: "Empty Injector",
                price: 50,
                stock: 30,
                defaultStock: 30,
                levelReq: 10
            },
            {
                itemName: "Unstable Photon",
                price: 100,
                stock: 10,
                defaultStock: 10,
                levelReq: 3
            }
        ]
    },
    {
        name: "Clarissa",
        inventory: [
            {
                itemName: "Fire Spewer Mk1",
                price: 1,
                stock: 5,
                defaultStock: 5,
                levelReq: 1
            },
            {
                itemName: "Phase Reaver",
                price: 1,
                stock: 5,
                defaultStock: 5,
                levelReq: 1
            },
            {
                itemName: "Minor Electronic Circuit",
                price: 20,
                stock: 10,
                defaultStock: 10,
                levelReq: 1
            },
            {
                itemName: "Combo Test Sword",
                price: 100,
                stock: 3,
                defaultStock: 3,
                levelReq: 1
            },
            {
                itemName: "Nanonic Phase Sword of Incision",
                price: 1,
                stock: 1,
                defaultStock: 1,
                levelReq: 1
            },
            {
                itemName: "Synthesized Alloy Chestplate",
                price: 1,
                stock: 5,
                defaultStock: 5,
                levelReq: 1
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
        name: "Account Manager Zara",
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

    // Header (show only credits on the left; NPC name removed to avoid redundancy)
    const headerDiv = document.createElement('div');
    headerDiv.className = 'shop-header';
    const currencyP = document.createElement('div');
    currencyP.className = 'shop-currency';
    currencyP.textContent = `Credits: ${playerCurrency}`;
    headerDiv.appendChild(currencyP);
    shopContainer.appendChild(headerDiv);

    // Grid container
    const grid = document.createElement('div');
    grid.className = 'shop-grid';
    shopContainer.appendChild(grid);

    // List items for sale
    npc.inventory.forEach((invItem, index) => {
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
        priceP.textContent = `${itemPrice} credits`;

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

        // Buy button
        const buyButton = document.createElement('button');
        buyButton.className = 'shop-buy-button';
        if (isService && invItem.itemName === "Inventory Slot Expansion") {
            buyButton.textContent = 'Purchase Expansion';
            // Check if player is at max slots
            if (player.maxInventorySlots >= 500) {
                buyButton.disabled = true;
                buyButton.textContent = 'Max Slots Reached';
                buyButton.title = 'You already have the maximum number of inventory slots (500)';
            }
        } else {
            buyButton.textContent = 'Buy 1';
        }

        // If player's level < itemLevelReq, lock the item
        if (player.level < itemLevelReq) {
            buyButton.disabled = true;
            buyButton.textContent = 'Locked';
            buyButton.title = `Requires level ${itemLevelReq}`;
        } else {
            // Normal buy behavior
            // Highlight unaffordable items and show delta
            const missingCredits = Math.max(0, itemPrice - playerCurrency);
            if (missingCredits > 0) {
                itemDiv.classList.add('unaffordable');
                const needP = document.createElement('p');
                needP.className = 'shop-item-need';
                needP.textContent = `Need +${missingCredits} credits`;
                itemDiv.appendChild(needP);
                buyButton.disabled = true;
                buyButton.title = `Need +${missingCredits} credits`;
            }

            buyButton.addEventListener('click', () => {
                const cost = itemPrice * 1; // quantity 1
                const threshold = (window.gameSettings && window.gameSettings.purchaseConfirmThresholdCredits) || 500;
                const doBuy = () => buyItemFromNPC(npc, index, 1);

                // Only block on inventory space for non-service items
                if (!isService) {
                    if (!hasInventorySpace(1)) {
                        if (typeof showWarningPopup === 'function') {
                            showWarningPopup('Your inventory is full. Free up space before purchasing this item.');
                        } else {
                            logMessage('Your inventory is full. Free up space before purchasing this item.');
                        }
                        return;
                    }
                }

                if (cost >= threshold) {
                    if (typeof showConfirmationPopup === 'function') {
                        showConfirmationPopup(`Confirm purchase of ${itemName} for ${cost} credits?`, doBuy);
                    } else if (window.confirm) {
                        if (confirm(`Purchase ${itemName} for ${cost} credits?`)) doBuy();
                    } else {
                        doBuy();
                    }
                } else {
                    doBuy();
                }
            });
        }

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
        itemDiv.appendChild(buyButton);

        grid.appendChild(itemDiv);
    });
}

// Handle purchasing an item from an NPC
function buyItemFromNPC(npc, itemIndex, quantity) {
    const invItem = npc.inventory[itemIndex];
    if (!invItem) {
        console.error("Item not found in NPC inventory.");
        return;
    }
    const cost = invItem.price * quantity;

    // Check if player has enough currency
    if (playerCurrency < cost) {
        logMessage(`You don't have enough credits to buy ${quantity} of ${invItem.itemName}!`);
        return;
    }
    // Deduct currency
    playerCurrency -= cost;

    // Handle services vs regular items
    if (invItem.isService) {
        // Special handling for services
        if (invItem.itemName === "Inventory Slot Expansion") {
            // Check if player is already at max slots
            if (player.maxInventorySlots >= 500) {
                logMessage("You already have the maximum number of inventory slots (500)!");
                // Refund the purchase
                playerCurrency += cost;
                return;
            }
            
            // Check if this purchase would exceed the limit
            const newSlotCount = player.maxInventorySlots + quantity;
            if (newSlotCount > 500) {
                const maxPurchasable = 500 - player.maxInventorySlots;
                logMessage(`You can only buy ${maxPurchasable} more inventory slots to reach the maximum of 500.`);
                // Refund the purchase
                playerCurrency += cost;
                return;
            }
            
            // Apply the expansion
            player.maxInventorySlots += quantity;
            logMessage(`Inventory expanded! You now have ${player.maxInventorySlots} slots (purchased ${quantity} slot${quantity > 1 ? 's' : ''} for ${cost} credits).`);
            
            // Update inventory display to show new slot count
            updateInventoryDisplay();
        } else {
            logMessage(`Unknown service: ${invItem.itemName}`);
            // Refund unknown services
            playerCurrency += cost;
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
            if (!hasInventorySpace(1)) {
                if (typeof showWarningPopup === 'function') {
                    showWarningPopup('Your inventory is full. Purchase cancelled.');
                }
                // Refund the purchase
                playerCurrency += cost;
                return;
            }
            const success = addItemToInventory(purchasedItem);
            if (success) {
                logMessage(`You bought ${quantity}x ${invItem.itemName} for ${cost} credits.`);
            } else {
                // Inventory was full, refund the purchase
                playerCurrency += cost;
                return;
            }
        } else {
            logMessage(`Error: item template for ${invItem.itemName} not found in items.js.`);
            // Refund on error
            playerCurrency += cost;
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
    document.addEventListener('DOMContentLoaded', () => {
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
