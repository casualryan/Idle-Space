document.addEventListener('DOMContentLoaded', function() {
    const codexScreen = document.getElementById('codex-screen');
    const codexCategories = document.createElement('div');
    codexCategories.id = 'codex-categories';
    codexCategories.className = 'codex-categories';
    
    const codexContent = document.createElement('div');
    codexContent.id = 'codex-content';
    codexContent.className = 'codex-content';
    
    // Add categories and content containers to the codex screen
    codexScreen.appendChild(codexCategories);
    codexScreen.appendChild(codexContent);
    
    // Define our codex categories
    const categories = [
        { id: 'new-player', name: 'New Player' },
        { id: 'basic-mechanics', name: 'Basic Mechanics' },
        { id: 'damage-types', name: 'Damage Types' },
        { id: 'deflection-precision', name: 'Deflection & Precision' },
        { id: 'delve', name: 'Delve' },
        { id: 'fabrication', name: 'Fabrication' },
        { id: 'mining', name: 'Mining' },
        { id: 'medtek', name: 'Medtek' },
        { id: 'enemies', name: 'Enemies' }
    ];
    
    // Create category buttons
    categories.forEach(category => {
        const categoryButton = document.createElement('div');
        categoryButton.className = 'codex-category-button';
        categoryButton.dataset.category = category.id;
        
        // Create icon if available
        if (category.icon) {
            const icon = document.createElement('img');
            icon.src = category.icon;
            icon.alt = `${category.name} Icon`;
            categoryButton.appendChild(icon);
        }
        
        // Add category name
        const nameSpan = document.createElement('span');
        nameSpan.textContent = category.name;
        categoryButton.appendChild(nameSpan);
        
        // Add event listener
        categoryButton.addEventListener('click', () => {
            document.querySelectorAll('.codex-category-button').forEach(btn => {
                btn.classList.remove('active');
            });
            categoryButton.classList.add('active');
            displayCategoryContent(category.id);
        });
        
        codexCategories.appendChild(categoryButton);
    });
    
    // Content for each category (placeholder text - you can add actual content later)
    const codexData = {
        'new-player': {
            title: 'Welcome to Corebound!',
            sections: [
                {
                    subtitle: 'Getting Started',
                    content: `Welcome to Corebound! This futuristic sci-fi world has been ravaged by conflict, and you'll need to navigate its dangers to survive and thrive.
                    
                    This guide will help you understand the basics of the game and get you started on your journey. Use the sidebar to navigate between different game screens and activities.`
                },
                {
                    subtitle: 'Your First Steps',
                    content: `Start by exploring the Inventory and Equipment screens to see what gear you have available. Then, head to the Delve section to begin fighting enemies and collecting loot.
                    
                    As you defeat enemies, you'll earn experience and find new equipment to make your character stronger. You'll also gather resources that can be used in Fabrication to craft new items.`
                }
            ]
        },
        'basic-mechanics': {
            title: 'Basic Game Mechanics',
            sections: [
                {
                    subtitle: 'Combat System',
                    content: `Combat in Idle Combat is automatic but strategic. Your character and enemies take turns attacking each other based on their attack speed. Higher attack speed means more frequent attacks.
                    
                    Each attack has a chance to critically hit, dealing increased damage based on your critical multiplier. You can increase your critical chance and multiplier through equipment and passive skills.`
                },
                {
                    subtitle: 'Health and Energy Shield',
                    content: `Your character has two defensive layers: Health and Energy Shield. Energy Shield is depleted first, and then damage is applied to Health. Energy Shield regenerates over time, but Health requires healing items or regeneration effects.
                    
                    When your Health reaches zero, combat ends and you must start again. Improve your resistances through better equipment and passive skills to survive longer in combat.`
                }
            ]
        },
        'damage-types': {
            title: 'Damage Types',
            sections: [
                {
                    subtitle: 'Physical Damage',
                    content: `Physical damage represents raw kinetic force. It's common in melee weapons and projectiles. Physical resistance reduces the amount of physical damage taken.`
                },
                {
                    subtitle: 'Energy Damage',
                    content: `Energy damage represents various forms of energy-based attacks, including laser, plasma, and electrical damage. Elemental resistance reduces the amount of energy damage taken.`
                },
                {
                    subtitle: 'Chemical Damage',
                    content: `Chemical damage comes from toxic substances, acids, and biological attacks. Chemical resistance provides protection against these hazardous substances.`
                },
                {
                    subtitle: 'Psionic Damage',
                    content: `Psionic damage attacks the mind directly, bypassing physical resistances. This rare damage type is particularly effective against heavily armored targets but can be countered with psionic resistance.`
                }
            ]
        },
        'deflection-precision': {
            title: 'Deflection and Precision',
            sections: [
                {
                    subtitle: 'Precision',
                    content: `Precision represents your ability to hit targets. Higher precision increases your chance to land successful attacks and reduces the enemy's chance to deflect your attacks.
                    
                    Precision can be improved through equipment, passive skills, and certain consumable items. Precision is especially important when fighting high-deflection enemies.`
                },
                {
                    subtitle: 'Deflection',
                    content: `Deflection represents your ability to avoid incoming attacks. Higher deflection increases your chance to completely avoid damage from attacks.
                    
                    When an attack is deflected, it deals no damage and triggers no on-hit effects. Deflection can be improved through equipment, passive skills, and certain buffs.
                    
                    The chance to deflect an attack is calculated based on your deflection value versus the attacker's precision value.`
                }
            ]
        },
        'delve': {
            title: 'Delve System',
            sections: [
                {
                    subtitle: 'What is Delving?',
                    content: `Delving is the main combat activity in the game. You'll venture into various locations to fight enemies, collect loot, and earn experience.
                    
                    Each location has its own set of enemies with different difficulties and loot tables. As you progress, you'll unlock new, more challenging locations with better rewards.`
                },
                {
                    subtitle: 'Combat Flow',
                    content: `When delving, combat happens automatically. Your character will attack enemies based on their attack speed, and enemies will do the same. The combat log will show you what's happening in detail.
                    
                    You can monitor your health and energy shield during combat. If they get too low, you might want to retreat or use healing items.
                    
                    After defeating an enemy, there's a short cooldown before the next enemy appears. Use this time to check your inventory and equipment if needed.`
                }
            ]
        },
        'fabrication': {
            title: 'Fabrication System',
            sections: [
                {
                    subtitle: 'Introduction to Fabrication',
                    content: `Fabrication is the crafting system in Idle Combat. It allows you to create new items, upgrade existing ones, and recycle unwanted gear into valuable materials.
                    
                    To fabricate items, you'll need recipes, materials, and components. These can be found while delving, purchased from shops, or gathered through Mining.`
                },
                {
                    subtitle: 'Recipes and Categories',
                    content: `Fabrication recipes are organized into categories based on the type of item they produce. These categories include Weapons, Armor, Bionics, Consumables, and Components.
                    
                    Each recipe shows the materials needed, the time required to craft the item, and any skill requirements. Your Fabrication skill level will determine which recipes you can use and how efficiently you can craft.`
                }
            ]
        },
        'mining': {
            title: 'Mining System',
            sections: [
                {
                    subtitle: 'Introduction to Mining',
                    content: `Mining is one of the gathering skills in Idle Combat. It allows you to collect various minerals, metals, and other raw materials that are used in Fabrication.
                    
                    Mining activities take time to complete, but they run in the background while you do other things. As your Mining skill increases, you'll be able to gather more valuable materials and do so more efficiently.`
                },
                {
                    subtitle: 'Mining Locations',
                    content: `Different mining activities represent different locations or methods of mining. Each has its own set of possible materials and requirements.
                    
                    Some mining activities require tools or specific skill levels to unlock. More advanced mining activities yield rarer and more valuable materials.`
                }
            ]
        },
        'medtek': {
            title: 'Medtek System',
            sections: [
                {
                    subtitle: 'Introduction to Medtek',
                    content: `Medtek is the medical technology skill in Idle Combat. It allows you to craft healing items, stimulants, and other biological enhancements.
                    
                    Like other crafting skills, Medtek activities take time to complete and run in the background. As your Medtek skill increases, you'll be able to create more potent items and do so more efficiently.`
                },
                {
                    subtitle: 'Medtek Crafting',
                    content: `Medtek crafting requires biological materials, chemicals, and sometimes electronic components. These can be found while delving, purchased from shops, or gathered through other skills.
                    
                    Medtek products include healing injectors, combat stimulants, antidotes, and various enhancement compounds that provide temporary buffs to your character.`
                }
            ]
        },
        'enemies': {
            title: 'Enemy Codex',
            sections: [
                {
                    subtitle: 'Enemy Database',
                    content: `Below you'll find information about all the enemies you may encounter while delving. This includes their stats, damage types, resistances, and what loot they might drop.
                    
                    Use this information to prepare for encounters and develop strategies for dealing with different enemy types.`
                }
            ]
        }
    };
    
    // Function to display content for a selected category
    function displayCategoryContent(categoryId) {
        codexContent.innerHTML = '';
        
        if (categoryId === 'enemies') {
            displayEnemiesCodex();
        } else {
            const categoryData = codexData[categoryId];
            
            // Create title
            const title = document.createElement('h2');
            title.className = 'codex-title';
            title.textContent = categoryData.title;
            codexContent.appendChild(title);
            
            // Create sections
            categoryData.sections.forEach(section => {
                const sectionDiv = document.createElement('div');
                sectionDiv.className = 'codex-section';
                
                if (section.subtitle) {
                    const subtitle = document.createElement('h3');
                    subtitle.className = 'codex-subtitle';
                    subtitle.textContent = section.subtitle;
                    sectionDiv.appendChild(subtitle);
                }
                
                const content = document.createElement('div');
                content.className = 'codex-text';
                content.innerHTML = section.content.replace(/\n\s+/g, '<br><br>');
                sectionDiv.appendChild(content);
                
                codexContent.appendChild(sectionDiv);
            });
        }
    }
    
    // Function to display the enemies codex
    function displayEnemiesCodex() {
        // Create title
        const title = document.createElement('h2');
        title.className = 'codex-title';
        title.textContent = 'Enemy Database';
        codexContent.appendChild(title);
        
        // Create search/filter
        const filterContainer = document.createElement('div');
        filterContainer.className = 'codex-filter';
        
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'enemy-search';
        searchInput.placeholder = 'Search enemies...';
        searchInput.addEventListener('input', filterEnemies);
        
        filterContainer.appendChild(searchInput);
        codexContent.appendChild(filterContainer);
        
        // Create enemy list container
        const enemyListContainer = document.createElement('div');
        enemyListContainer.id = 'codex-enemy-list';
        codexContent.appendChild(enemyListContainer);
        
        // Populate enemy list
        displayAllEnemies();
        
        function filterEnemies() {
            const searchTerm = searchInput.value.toLowerCase();
            displayAllEnemies(searchTerm);
        }
        
        function displayAllEnemies(searchTerm = '') {
            enemyListContainer.innerHTML = '';
            
            enemies.forEach(enemyData => {
                // Skip if doesn't match search
                if (searchTerm && !enemyData.name.toLowerCase().includes(searchTerm)) {
                    return;
                }
                
                const enemyContainer = document.createElement('div');
                enemyContainer.classList.add('codex-enemy');
                
                // Create header with name and collapsible functionality
                const enemyHeader = document.createElement('div');
                enemyHeader.classList.add('codex-enemy-header');
                
                const enemyName = document.createElement('h4');
                enemyName.textContent = enemyData.name;
                
                const expandButton = document.createElement('button');
                expandButton.classList.add('expand-button');
                expandButton.innerHTML = '+';
                
                enemyHeader.appendChild(enemyName);
                enemyHeader.appendChild(expandButton);
                enemyContainer.appendChild(enemyHeader);
                
                // Create collapsible content
                const enemyDetails = document.createElement('div');
                enemyDetails.classList.add('codex-enemy-details');
                enemyDetails.style.display = 'none';
                
                // Create two columns for stats
                const detailsColumns = document.createElement('div');
                detailsColumns.classList.add('codex-details-columns');
                
                // Left column - Basic Stats
                const leftColumn = document.createElement('div');
                leftColumn.classList.add('codex-column');
                
                const basicStats = document.createElement('div');
                basicStats.classList.add('codex-stats-section');
                
                const statsTitle = document.createElement('h5');
                statsTitle.textContent = 'Basic Stats';
                basicStats.appendChild(statsTitle);
                
                const statsList = document.createElement('ul');
                statsList.classList.add('codex-stats-list');
                
                // Add basic stats
                const stats = [
                    { name: 'Health', value: enemyData.health },
                    { name: 'Energy Shield', value: enemyData.energyShield || 0 },
                    { name: 'Attack Speed', value: enemyData.attackSpeed },
                    { name: 'Critical Chance', value: `${(enemyData.criticalChance * 100).toFixed(2)}%` },
                    { name: 'Critical Multiplier', value: enemyData.criticalMultiplier }
                ];
                
                stats.forEach(stat => {
                    const statItem = document.createElement('li');
                    statItem.innerHTML = `<span class="stat-name">${stat.name}:</span> <span class="stat-value">${stat.value}</span>`;
                    statsList.appendChild(statItem);
                });
                
                basicStats.appendChild(statsList);
                leftColumn.appendChild(basicStats);
                
                // Add damage types to left column
                if (enemyData.damageTypes && Object.keys(enemyData.damageTypes).length > 0) {
                    const damageSection = document.createElement('div');
                    damageSection.classList.add('codex-stats-section');
                    
                    const damageTitle = document.createElement('h5');
                    damageTitle.textContent = 'Damage Types';
                    damageSection.appendChild(damageTitle);
                    
                    const damageList = document.createElement('ul');
                    damageList.classList.add('codex-stats-list');
                    
                    Object.entries(enemyData.damageTypes).forEach(([type, value]) => {
                        if (value > 0) {
                            const damageItem = document.createElement('li');
                            const formattedType = type.charAt(0).toUpperCase() + type.slice(1);
                            damageItem.innerHTML = `<span class="stat-name">${formattedType}:</span> <span class="stat-value">${value}</span>`;
                            damageList.appendChild(damageItem);
                        }
                    });
                    
                    damageSection.appendChild(damageList);
                    leftColumn.appendChild(damageSection);
                }
                
                // Right column - Resistance Types and other stats
                const rightColumn = document.createElement('div');
                rightColumn.classList.add('codex-column');
                
                // Add resistance types to right column
                if (enemyData.defenseTypes && Object.keys(enemyData.defenseTypes).length > 0) {
                    const defenseSection = document.createElement('div');
                    defenseSection.classList.add('codex-stats-section');
                    
                    const defenseTitle = document.createElement('h5');
                    defenseTitle.textContent = 'Resistance Types';
                    defenseSection.appendChild(defenseTitle);
                    
                    const defenseList = document.createElement('ul');
                    defenseList.classList.add('codex-stats-list');
                    
                    Object.entries(enemyData.defenseTypes).forEach(([type, value]) => {
                        const defenseItem = document.createElement('li');
                        const formattedType = ({
                            physicalResistance: 'Physical Resistance',
                            elementalResistance: 'Elemental Resistance',
                            chemicalResistance: 'Chemical Resistance'
                        })[type] || (type.charAt(0).toUpperCase() + type.slice(1));
                        defenseItem.innerHTML = `<span class="stat-name">${formattedType}:</span> <span class="stat-value">${value}</span>`;
                        defenseList.appendChild(defenseItem);
                    });
                    
                    defenseSection.appendChild(defenseList);
                    rightColumn.appendChild(defenseSection);
                }
                
                // Add precision/deflection if present
                if (enemyData.precision || enemyData.deflection) {
                    const otherStatsSection = document.createElement('div');
                    otherStatsSection.classList.add('codex-stats-section');
                    
                    const otherTitle = document.createElement('h5');
                    otherTitle.textContent = 'Other Stats';
                    otherStatsSection.appendChild(otherTitle);
                    
                    const otherList = document.createElement('ul');
                    otherList.classList.add('codex-stats-list');
                    
                    if (enemyData.precision) {
                        const precisionItem = document.createElement('li');
                        precisionItem.innerHTML = `<span class="stat-name">Precision:</span> <span class="stat-value">${enemyData.precision}</span>`;
                        otherList.appendChild(precisionItem);
                    }
                    
                    if (enemyData.deflection) {
                        const deflectionItem = document.createElement('li');
                        deflectionItem.innerHTML = `<span class="stat-name">Deflection:</span> <span class="stat-value">${enemyData.deflection}</span>`;
                        otherList.appendChild(deflectionItem);
                    }
                    
                    otherStatsSection.appendChild(otherList);
                    rightColumn.appendChild(otherStatsSection);
                }
                
                // Add columns to details
                detailsColumns.appendChild(leftColumn);
                detailsColumns.appendChild(rightColumn);
                enemyDetails.appendChild(detailsColumns);
                
                // Add loot section
                const lootSection = document.createElement('div');
                lootSection.classList.add('codex-loot-section');
                
                const lootTitle = document.createElement('h5');
                lootTitle.textContent = 'Loot Information';
                lootSection.appendChild(lootTitle);
                
                // Add loot information
                if (enemyData.lootConfig) {
                    const lootInfo = document.createElement('div');
                    lootInfo.classList.add('codex-loot-info');
                    
                    // Base drop chance
                    const dropChance = document.createElement('p');
                    dropChance.innerHTML = `<span class="loot-label">Base Drop Chance:</span> <span class="loot-value">${(enemyData.lootConfig.baseDropChance * 100).toFixed(2)}%</span>`;
                    lootInfo.appendChild(dropChance);
                    
                    // Items per drop
                    const itemCount = document.createElement('p');
                    itemCount.innerHTML = `<span class="loot-label">Items Per Drop:</span> <span class="loot-value">${enemyData.lootConfig.minItems} - ${enemyData.lootConfig.maxItems}</span>`;
                    lootInfo.appendChild(itemCount);
                    
                    // Loot pools table
                    if (enemyData.lootConfig.poolsByTier) {
                        const poolsTitle = document.createElement('p');
                        poolsTitle.innerHTML = `<span class="loot-label">Available Loot Pools:</span>`;
                        lootInfo.appendChild(poolsTitle);
                        
                        const poolsTable = document.createElement('table');
                        poolsTable.classList.add('codex-loot-table');
                        
                        // Table header
                        const tableHeader = document.createElement('tr');
                        const tierHeader = document.createElement('th');
                        tierHeader.textContent = 'Tier';
                        const poolsHeader = document.createElement('th');
                        poolsHeader.textContent = 'Pools';
                        
                        tableHeader.appendChild(tierHeader);
                        tableHeader.appendChild(poolsHeader);
                        poolsTable.appendChild(tableHeader);
                        
                        // Table rows for each tier
                        for (const tier in enemyData.lootConfig.poolsByTier) {
                            const tableRow = document.createElement('tr');
                            
                            const tierCell = document.createElement('td');
                            let tierName = "Unknown";
                            
                            // Map tier numbers to names
                            switch (parseInt(tier)) {
                                case 1: tierName = "Common"; break;
                                case 2: tierName = "Uncommon"; break;
                                case 3: tierName = "Rare"; break;
                                case 4: tierName = "Very Rare"; break;
                                case 5: tierName = "Epic"; break;
                                case 6: tierName = "Legendary"; break;
                            }
                            
                            tierCell.textContent = `Tier ${tier} (${tierName})`;
                            
                            const poolsCell = document.createElement('td');
                            poolsCell.textContent = enemyData.lootConfig.poolsByTier[tier].join(', ');
                            
                            tableRow.appendChild(tierCell);
                            tableRow.appendChild(poolsCell);
                            poolsTable.appendChild(tableRow);
                        }
                        
                        lootInfo.appendChild(poolsTable);
                    }
                    
                    lootSection.appendChild(lootInfo);
                } else if (enemyData.lootTable && enemyData.lootTable.length > 0) {
                    // Legacy loot table for backward compatibility
                    const legacyTitle = document.createElement('p');
                    legacyTitle.textContent = 'Legacy Loot Table:';
                    lootSection.appendChild(legacyTitle);
                    
                    const legacyList = document.createElement('ul');
                    legacyList.classList.add('codex-legacy-loot');
                    
                    enemyData.lootTable.forEach(lootItem => {
                        const lootListItem = document.createElement('li');
                        const dropRate = (lootItem.dropRate * 100).toFixed(2);
                        lootListItem.textContent = `${lootItem.itemName} (Drop Rate: ${dropRate}%, Quantity: ${lootItem.minQuantity}-${lootItem.maxQuantity})`;
                        legacyList.appendChild(lootListItem);
                    });
                    
                    lootSection.appendChild(legacyList);
                } else {
                    const noLoot = document.createElement('p');
                    noLoot.textContent = 'No loot information available.';
                    lootSection.appendChild(noLoot);
                }
                
                enemyDetails.appendChild(lootSection);
                
                // Description section (placeholder for you to add descriptions later)
                const descriptionSection = document.createElement('div');
                descriptionSection.classList.add('codex-description-section');
                
                const descriptionTitle = document.createElement('h5');
                descriptionTitle.textContent = 'Description';
                descriptionSection.appendChild(descriptionTitle);
                
                const description = document.createElement('p');
                description.classList.add('codex-description');
                // You can add descriptions to enemies in the enemies.js file
                description.textContent = enemyData.description || 'No description available.';
                descriptionSection.appendChild(description);
                
                enemyDetails.appendChild(descriptionSection);
                
                // Add details to enemy container
                enemyContainer.appendChild(enemyDetails);
                
                // Add toggle functionality
                enemyHeader.addEventListener('click', () => {
                    const isExpanded = enemyDetails.style.display !== 'none';
                    enemyDetails.style.display = isExpanded ? 'none' : 'block';
                    expandButton.innerHTML = isExpanded ? '+' : '-';
                });
                
                // Add to list
                enemyListContainer.appendChild(enemyContainer);
            });
        }
    }
    
    // Initialize with the first category
    document.querySelector('.codex-category-button').classList.add('active');
    displayCategoryContent(categories[0].id);
}); 