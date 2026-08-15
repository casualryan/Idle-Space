// Delve deployment, claim-cache, and temporary reward rendering.

let selectedDeploymentMode = 'operation';
let selectedOperationCoreId = '';

function closeDelveClaimCachePopup() {
    document.getElementById('delve-claim-cache-overlay')?.remove();
}
function refreshDelveClaimCacheUI(reopenPopup = false) {
    displayAdventureLocations();
    if (reopenPopup && hasDelveClaimCacheRewards()) showDelveClaimCachePopup();
    else if (!hasDelveClaimCacheRewards()) closeDelveClaimCachePopup();
}
function showDelveClaimCachePopup(warningMessage = '') {
    closeDelveClaimCachePopup();
    if (!hasDelveClaimCacheRewards()) return;
    const visibleWarning = typeof warningMessage === 'string' ? warningMessage : '';

    const overlay = document.createElement('div');
    overlay.id = 'delve-claim-cache-overlay';
    overlay.className = 'delve-claim-cache-overlay';

    const popup = document.createElement('section');
    popup.className = 'delve-claim-cache-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    popup.setAttribute('aria-labelledby', 'delve-claim-cache-title');

    const rows = delveClaimCache.items.map((item, index) => `
        <li class="delve-claim-cache-item">
            <span>${item.name} x${item.quantity || 1}</span>
            <button type="button" data-claim-cache-index="${index}">Claim</button>
        </li>
    `).join('');

    popup.innerHTML = `
        <h2 id="delve-claim-cache-title">Operation Claim Cache</h2>
        ${visibleWarning ? `<p class="delve-claim-cache-full-warning">${visibleWarning}</p>` : ''}
        <p class="delve-claim-cache-warning">Unclaimed rewards disappear when you start another Operation.</p>
        <div class="delve-claim-cache-credits">Feed waiting: ${delveClaimCache.feed}</div>
        <ul class="delve-claim-cache-list">${rows || '<li class="delve-claim-cache-empty">No items waiting.</li>'}</ul>
        <div class="delve-claim-cache-actions">
            <button type="button" data-claim-cache-action="all">Claim All That Fits</button>
            <button type="button" data-claim-cache-action="sell">Sell/Discard Remaining (${getDelveClaimCacheSaleValue()} Feed)</button>
            <button type="button" data-claim-cache-action="close">Close</button>
        </div>
    `;

    popup.querySelectorAll('[data-claim-cache-index]').forEach(button => {
        button.addEventListener('click', () => claimDelveCacheItem(Number(button.dataset.claimCacheIndex)));
    });
    popup.querySelector('[data-claim-cache-action="all"]').addEventListener('click', claimAllDelveCacheRewards);
    popup.querySelector('[data-claim-cache-action="sell"]').addEventListener('click', sellRemainingDelveCacheRewards);
    popup.querySelector('[data-claim-cache-action="close"]').addEventListener('click', closeDelveClaimCachePopup);

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}

function appendDelveClaimCacheAccess(container) {
    if (!hasDelveClaimCacheRewards()) return;
    const panel = document.createElement('div');
    panel.className = 'delve-claim-cache-access';
    panel.innerHTML = `
        <strong>Unclaimed Operation Rewards</strong>
        <span>${delveClaimCache.items.length} item${delveClaimCache.items.length === 1 ? '' : 's'} · ${delveClaimCache.feed} Feed</span>
        <span class="delve-claim-cache-warning">Starting another Operation destroys them.</span>
        <button type="button">Open Claim Cache</button>
    `;
    panel.querySelector('button').addEventListener('click', () => showDelveClaimCachePopup());
    container.appendChild(panel);
}

window.hasDelveClaimCacheRewards = hasDelveClaimCacheRewards;
window.showDelveClaimCachePopup = showDelveClaimCachePopup;
function updateDelveBagUI() {
    // Find or create the delve bag container
    let delveBagContainer = document.getElementById('delve-bag-container');

    if (!delveBagContainer) {
        // Create the container if it doesn't exist
        delveBagContainer = document.createElement('div');
        delveBagContainer.id = 'delve-bag-container';
        delveBagContainer.className = 'delve-bag';

        // Create header
        const header = document.createElement('h3');
        header.textContent = 'Operation Bag';
        delveBagContainer.appendChild(header);

        // Create Feed display
        const feedDiv = document.createElement('div');
        feedDiv.id = 'delve-bag-credits';
        feedDiv.className = 'delve-bag-credits';
        delveBagContainer.appendChild(feedDiv);

        // Create items list
        const itemsList = document.createElement('ul');
        itemsList.id = 'delve-bag-items';
        delveBagContainer.appendChild(itemsList);

        // Recovery fallback for older markup: keep the bag inside its combat drawer.
        const drawer = document.getElementById('delve-bag-drawer');
        if (drawer) drawer.appendChild(delveBagContainer);
    }

    // Update Feed display
    const feedDiv = document.getElementById('delve-bag-credits');
    if (feedDiv) {
        feedDiv.textContent = `Feed: ${delveBag.feed}`;
    }

    // Update items list
    const itemsList = document.getElementById('delve-bag-items');
    if (itemsList) {
        // Clear current items
        itemsList.innerHTML = '';

        // Add each item with a tooltip
        delveBag.items.forEach(item => {
            const listItem = document.createElement('li');
            listItem.textContent = `${item.name} x${item.quantity || 1}`;

            // Create an actual tooltip element (the old-fashioned way)
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.style.display = 'none'; // Initially hidden
            tooltip.innerHTML = getItemTooltipContent(item);
            listItem.appendChild(tooltip);

            // Also add data attributes for the global tooltip system as a backup
            listItem.dataset.hasTooltip = 'true';

            // Set unique ID to help debug
            const uniqueId = `delve-item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            listItem.id = uniqueId;

            // Old hover handler (fallback method)
            listItem.addEventListener('mouseenter', () => {
                console.log(`Mouse entered delve bag item: ${item.name}`);
                tooltip.style.display = 'block';
            });

            listItem.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });

            itemsList.appendChild(listItem);
        });

        // Show "empty" message if no items
        if (delveBag.items.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.textContent = 'No recovered items';
            emptyMessage.className = 'delve-bag-empty';
            itemsList.appendChild(emptyMessage);
        }
    }

    // The bag remains mounted for its drawer, but the drawer controls visibility.
    if (delveBagContainer) {
        delveBagContainer.style.display = 'block';
    }
}


function displayAdventureLocations() {
    const delveControlsDiv = document.getElementById('delve-controls');
    const adventureDiv = document.getElementById('adventure-locations');
    if (!delveControlsDiv || !adventureDiv) {
        console.error("div#delve-controls or div#adventure-locations not found in the DOM.");
        return;
    }

    console.log("displayAdventureLocations - isDelveInProgress:", isDelveInProgress);
    if (typeof setDelveCombatUIActive === 'function') setDelveCombatUIActive(Boolean(isDelveInProgress));

    // Clear previous UI
    delveControlsDiv.innerHTML = '';
    adventureDiv.innerHTML = '';

    // If a delve is currently in progress, show a "Flee" button and hide location buttons
    if (isDelveInProgress) {
        const bagToggle = document.getElementById('delve-bag-toggle');
        if (bagToggle) bagToggle.hidden = currentRunMode === 'patrol';
        // Create a stylish Flee button
        const fleeButton = document.createElement('button');
        fleeButton.textContent = currentRunMode === 'patrol' ? 'Stop Patrol' : 'Abort Operation';
        fleeButton.className = 'delve-button danger';
        fleeButton.style.fontSize = '16px';
        fleeButton.style.padding = '12px 24px';
        fleeButton.style.margin = '10px 0';
        fleeButton.style.background = 'linear-gradient(135deg, #d62828, #f94144)';
        fleeButton.style.color = 'white';
        fleeButton.style.border = 'none';
        fleeButton.style.borderRadius = '4px';
        fleeButton.style.boxShadow = '0 0 15px rgba(249, 65, 68, 0.5)';
        fleeButton.style.fontWeight = 'bold';
        fleeButton.style.cursor = 'pointer';
        fleeButton.style.transition = 'all 0.2s ease';

        // Add hover effect
        fleeButton.addEventListener('mouseover', function() {
            this.style.background = 'linear-gradient(135deg, #f94144, #d62828)';
            this.style.boxShadow = '0 0 20px rgba(249, 65, 68, 0.7)';
        });

        fleeButton.addEventListener('mouseout', function() {
            this.style.background = 'linear-gradient(135deg, #d62828, #f94144)';
            this.style.boxShadow = '0 0 15px rgba(249, 65, 68, 0.5)';
        });

        fleeButton.addEventListener('click', () => {
            stopCombat('playerFled');
        });

        // Add it to the delveControls area
        delveControlsDiv.appendChild(fleeButton);

        // Stylish warning note
        const note = document.createElement('p');
        note.innerHTML = currentRunMode === 'patrol'
            ? '<span style="color:#61e9bd;font-weight:bold;">PATROL ACTIVE</span> <span style="color:#e0f2ff;">Recovered loot is already secured.</span>'
            : '<span style="color:#ff6b6b;font-weight:bold;">OPERATION ACTIVE</span> <span style="color:#e0f2ff;">Aborting forfeits Operation Bag loot.</span>';
        note.style.padding = '10px';
        note.style.background = 'rgba(0, 15, 40, 0.7)';
        note.style.borderRadius = '4px';
        note.style.border = '1px solid #ff6b6b';
        delveControlsDiv.appendChild(note);

    } else {
        const bagToggle = document.getElementById('delve-bag-toggle');
        if (bagToggle) bagToggle.hidden = false;
        // Create a sci-fi themed holographic location selection interface

        // Main section title with futuristic styling
        const mainTitle = document.createElement('h3');
        mainTitle.textContent = 'DEPLOYMENT TERMINAL';
        mainTitle.className = 'locations-main-title';
        mainTitle.style.color = '#00ffcc';
        mainTitle.style.textShadow = '0 0 8px rgba(0, 255, 204, 0.7)';
        mainTitle.style.marginBottom = '5px';
        mainTitle.style.textAlign = 'center';
        mainTitle.style.fontFamily = '"Rajdhani", "Orbitron", sans-serif';
        mainTitle.style.letterSpacing = '2px';
        mainTitle.style.fontSize = '24px';
        adventureDiv.appendChild(mainTitle);

        // Subtitle with blinking cursor effect
        const subtitle = document.createElement('div');
        subtitle.className = 'locations-subtitle';
        subtitle.innerHTML = selectedDeploymentMode === 'operation'
            ? 'SELECT OPERATION SIGNAL<span class="blink-cursor">_</span>'
            : 'SELECT PATROL SECTOR<span class="blink-cursor">_</span>';
        subtitle.style.color = '#7fdbff';
        subtitle.style.textAlign = 'center';
        subtitle.style.marginBottom = '20px';
        subtitle.style.fontSize = '14px';
        subtitle.style.fontFamily = '"Rajdhani", "Courier New", monospace';
        adventureDiv.appendChild(subtitle);

        // Create blinking cursor animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes blink-cursor {
                0%, 100% { opacity: 1; }
                50% { opacity: 0; }
            }
            .blink-cursor {
                animation: blink-cursor 1s infinite;
                font-weight: bold;
                color: #00ffcc;
            }
        `;
        document.head.appendChild(style);

        // Create main interface container
        const interfaceContainer = document.createElement('div');
        interfaceContainer.className = 'locations-interface';
        interfaceContainer.style.display = 'flex';
        interfaceContainer.style.flexDirection = 'column';
        interfaceContainer.style.background = 'rgba(0, 20, 40, 0.7)';
        interfaceContainer.style.borderRadius = '8px';
        interfaceContainer.style.border = '1px solid #00a6fb';
        interfaceContainer.style.boxShadow = '0 0 20px rgba(0, 166, 251, 0.3), inset 0 0 10px rgba(0, 255, 204, 0.2)';
        interfaceContainer.style.padding = '15px';
        interfaceContainer.style.position = 'relative';
        interfaceContainer.style.overflow = 'hidden'; // For the scanner effect
        adventureDiv.appendChild(interfaceContainer);

        const modeStrip = document.createElement('div');
        modeStrip.className = 'deployment-mode-strip';
        [
            { id: 'operation', name: 'Operation', detail: 'Finite run · events · higher rewards · Operation Bag risk' },
            { id: 'patrol', name: 'Patrol', detail: 'Infinite combat · direct loot · reliable lower rewards' }
        ].forEach(mode => {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.mode = mode.id;
            button.className = `deployment-mode-card${selectedDeploymentMode === mode.id ? ' is-selected' : ''}`;
            button.innerHTML = `<strong>${mode.name}</strong><span>${mode.detail}</span>`;
            button.addEventListener('click', () => {
                selectedDeploymentMode = mode.id;
                displayAdventureLocations();
            });
            modeStrip.appendChild(button);
        });
        interfaceContainer.appendChild(modeStrip);

        if (selectedDeploymentMode === 'operation') {
            const coreSelector = document.createElement('label');
            coreSelector.className = 'operation-core-selector';
            const label = document.createElement('strong');
            label.textContent = 'Operation Core';
            const select = document.createElement('select');
            select.innerHTML = '<option value="">No Core</option>';
            CORE_DEFINITIONS.forEach(core => {
                const quantity = getCoreQuantity(core.id);
                const option = document.createElement('option');
                option.value = core.id;
                option.disabled = quantity <= 0;
                option.selected = selectedOperationCoreId === core.id;
                option.textContent = `${core.name} ×${quantity} — ${core.effect}`;
                select.appendChild(option);
            });
            if (selectedOperationCoreId && getCoreQuantity(selectedOperationCoreId) <= 0) selectedOperationCoreId = '';
            select.value = selectedOperationCoreId;
            select.addEventListener('change', () => { selectedOperationCoreId = select.value; });
            coreSelector.appendChild(label);
            coreSelector.appendChild(select);
            interfaceContainer.appendChild(coreSelector);
        }

        // Automation is mode-specific: Operations may auto-claim, while Patrols
        // may restart the same authored sector after defeat.
        const autoRow = document.createElement('div');
        autoRow.className = 'delve-automation-options';
        if (selectedDeploymentMode === 'patrol') {
            const redeployOption = document.createElement('label');
            redeployOption.className = 'delve-automation-option';
            redeployOption.title = 'Restart the selected Patrol after player defeat. Manually stopping a Patrol never restarts it.';
            const autoChk = document.createElement('input');
            autoChk.type = 'checkbox';
            autoChk.checked = localStorage.getItem('autoPatrolRedeploy') === 'true';
            autoChk.addEventListener('change', () => localStorage.setItem('autoPatrolRedeploy', autoChk.checked ? 'true' : 'false'));
            const autoLbl = document.createElement('span');
            autoLbl.textContent = 'Auto-redeploy Patrol after defeat';
            redeployOption.appendChild(autoChk);
            redeployOption.appendChild(autoLbl);
            autoRow.appendChild(redeployOption);
        } else {
            const claimOption = document.createElement('label');
            claimOption.className = 'delve-automation-option';
            claimOption.title = 'Resources and Feed are always claimed. This also claims every item when the ordinary inventory has enough room.';
            const claimChk = document.createElement('input');
            claimChk.type = 'checkbox';
            claimChk.checked = localStorage.getItem('autoClaimAllItems') === 'true';
            claimChk.addEventListener('change', () => localStorage.setItem('autoClaimAllItems', claimChk.checked ? 'true' : 'false'));
            const claimLbl = document.createElement('span');
            claimLbl.textContent = 'Auto-claim all items';
            claimOption.appendChild(claimChk);
            claimOption.appendChild(claimLbl);
            autoRow.appendChild(claimOption);
        }

        interfaceContainer.appendChild(autoRow);
        appendDelveClaimCacheAccess(interfaceContainer);

        // Add scanner effect
        const scannerEffect = document.createElement('div');
        scannerEffect.className = 'scanner-effect';
        scannerEffect.style.position = 'absolute';
        scannerEffect.style.top = '0';
        scannerEffect.style.left = '0';
        scannerEffect.style.width = '100%';
        scannerEffect.style.height = '2px';
        scannerEffect.style.background = 'linear-gradient(90deg, transparent, #00ffcc, transparent)';
        scannerEffect.style.boxShadow = '0 0 15px rgba(0, 255, 204, 0.7)';
        scannerEffect.style.opacity = '0.7';
        scannerEffect.style.zIndex = '1';
        interfaceContainer.appendChild(scannerEffect);

        // Add scanner animation
        const scannerAnimation = document.createElement('style');
        scannerAnimation.textContent = `
            @keyframes scanner {
                0% { top: 0; }
                100% { top: 100%; }
            }
            .scanner-effect {
                animation: scanner 2.5s linear infinite;
            }
        `;
        document.head.appendChild(scannerAnimation);

        // Add search and filter controls
        const controlsRow = document.createElement('div');
        controlsRow.className = 'locations-controls';
        controlsRow.style.display = selectedDeploymentMode === 'patrol' ? 'flex' : 'none';
        controlsRow.style.justifyContent = 'space-between';
        controlsRow.style.marginBottom = '15px';
        controlsRow.style.zIndex = '2';
        controlsRow.style.position = 'relative';
        interfaceContainer.appendChild(controlsRow);

        // Search input
        const searchContainer = document.createElement('div');
        searchContainer.style.flex = '1';
        searchContainer.style.marginRight = '15px';
        searchContainer.style.position = 'relative';
        searchContainer.style.maxWidth = 'calc(100% - 200px)'; // Prevent overlap with dropdown

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'SEARCH LOCATIONS...';
        searchInput.className = 'location-search';
        searchInput.style.width = '93%';
        searchInput.style.padding = '8px 10px 8px 35px';
        searchInput.style.background = 'rgba(0, 40, 60, 0.7)';
        searchInput.style.border = '1px solid #0096c7';
        searchInput.style.borderRadius = '4px';
        searchInput.style.color = '#e0f2ff';
        searchInput.style.outline = 'none';
        searchInput.style.fontFamily = '"Rajdhani", "Courier New", monospace';

        // Search icon
        const searchIcon = document.createElement('span');
        searchIcon.innerHTML = '🔍';
        searchIcon.style.position = 'absolute';
        searchIcon.style.left = '10px';
        searchIcon.style.top = '50%';
        searchIcon.style.transform = 'translateY(-50%)';
        searchIcon.style.color = '#7fdbff';
        searchIcon.style.fontSize = '14px';

        searchContainer.appendChild(searchIcon);
        searchContainer.appendChild(searchInput);
        controlsRow.appendChild(searchContainer);

        // Add filter dropdown
        const filterContainer = document.createElement('div');
        filterContainer.style.width = '180px';
        filterContainer.style.position = 'relative';
        filterContainer.style.flexShrink = '0'; // Prevent shrinking

        const filterSelect = document.createElement('select');
        filterSelect.className = 'location-filter';
        filterSelect.style.width = '100%';
        filterSelect.style.padding = '8px 10px';
        filterSelect.style.background = 'rgba(0, 40, 60, 0.7)';
        filterSelect.style.border = '1px solid #0096c7';
        filterSelect.style.borderRadius = '4px';
        filterSelect.style.color = '#e0f2ff';
        filterSelect.style.outline = 'none';
        filterSelect.style.cursor = 'pointer';
        filterSelect.style.fontFamily = '"Rajdhani", "Courier New", monospace';
        filterSelect.style.appearance = 'none';

        const visibleLocations = getVisibleDelveLocations();
        const deploymentEntries = selectedDeploymentMode === 'operation'
            ? ensureOperationBoard().offers
            : visibleLocations;
        const playerLevel = Math.max(1, Number(player?.level) || 1);
        const nextLevelLocation = locations
            .filter(location => location.locationCategory !== 'endgame' && Number(location.recommendedLevel || 1) > playerLevel + 2)
            .sort((a, b) => a.recommendedLevel - b.recommendedLevel)[0];
        const nextEndgameLocation = locations
            .filter(location => location.locationCategory === 'endgame' && !visibleLocations.includes(location))
            .sort((a, b) => a.endgameTier - b.endgameTier)[0];
        const progressionNotice = document.createElement('div');
        progressionNotice.className = 'location-progression-notice';
        if (selectedDeploymentMode === 'operation') {
            progressionNotice.textContent = '2 CURRENT · 2 CATCH-UP · 2 HIGHER-RISK SIGNALS';
        } else if (nextLevelLocation) {
            progressionNotice.textContent = `NEXT SECTOR SIGNAL · LEVEL ${Math.max(1, nextLevelLocation.recommendedLevel - 2)}`;
        } else if (nextEndgameLocation) {
            progressionNotice.textContent = 'ENDGAME PATROL SIGNALS DETECTED AT LEVEL 48';
        } else {
            progressionNotice.textContent = 'ALL KNOWN SECTOR SIGNALS ACQUIRED';
        }
        interfaceContainer.insertBefore(progressionNotice, controlsRow);

        // Get unique categories from currently visible locations
        const uniqueCategories = ['all sectors'];
        deploymentEntries.forEach(loc => {
            if (loc.locationCategory && !uniqueCategories.includes(loc.locationCategory.toLowerCase())) {
                uniqueCategories.push(loc.locationCategory.toLowerCase());
            }
        });

        // Create options from unique categories
        uniqueCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category === 'all sectors' ? 'ALL SECTORS' : category.toUpperCase();
            filterSelect.appendChild(option);
        });

        // Custom dropdown arrow
        const filterArrow = document.createElement('div');
        filterArrow.innerHTML = '▼';
        filterArrow.style.position = 'absolute';
        filterArrow.style.right = '10px';
        filterArrow.style.top = '50%';
        filterArrow.style.transform = 'translateY(-50%)';
        filterArrow.style.color = '#7fdbff';
        filterArrow.style.fontSize = '10px';
        filterArrow.style.pointerEvents = 'none';

        filterContainer.appendChild(filterSelect);
        filterContainer.appendChild(filterArrow);
        controlsRow.appendChild(filterContainer);

        // Function to update displayed locations based on search and filter
        function updateLocationDisplay() {
            const searchTerm = searchInput.value.toLowerCase();
            const selectedCategory = filterSelect.value.toLowerCase();

            // Show all locations in grid that match search and filter
            Array.from(locationGrid.children).forEach(locationCard => {
                const locName = locationCard.getAttribute('data-name').toLowerCase();
                const locCategory = locationCard.getAttribute('data-category').toLowerCase() || '';

                const matchesSearch = locName.includes(searchTerm);
                const matchesCategory = selectedCategory === 'all sectors' || locCategory === selectedCategory;

                locationCard.style.display = (matchesSearch && matchesCategory) ? 'flex' : 'none';
            });
        }

        // Add event listeners for search and filter
        searchInput.addEventListener('input', updateLocationDisplay);
        filterSelect.addEventListener('change', updateLocationDisplay);

        // Let the location grid use its natural height. The old internal
        // viewport was sized for a denser card layout that no longer exists.
        const locationScrollContainer = document.createElement('div');
        locationScrollContainer.className = 'locations-scroll-container';
        locationScrollContainer.style.zIndex = '2';
        locationScrollContainer.style.position = 'relative';

        interfaceContainer.appendChild(locationScrollContainer);

        // Create the actual grid for locations
        const locationGrid = document.createElement('div');
        locationGrid.className = 'locations-grid';
        locationGrid.style.display = 'grid';
        locationGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))';
        locationGrid.style.gap = '15px';
        locationGrid.style.padding = '5px';
        locationScrollContainer.appendChild(locationGrid);

        // Create location cards for each location
        deploymentEntries.forEach(loc => {
            // Get the category from the locationCategory property, with a fallback to "industrial"
            const category = loc.locationCategory || "industrial";

            // Create location card
            const locationCard = document.createElement('div');
            locationCard.className = 'location-card';
            locationCard.setAttribute('data-name', loc.name);
            locationCard.setAttribute('data-category', category);
            locationCard.style.display = 'flex';
            locationCard.style.flexDirection = 'column';
            locationCard.style.background = 'rgba(0, 30, 60, 0.8)';
            locationCard.style.borderRadius = '6px';
            locationCard.style.border = '1px solid #0077b6';
            locationCard.style.padding = '12px';
            locationCard.style.transition = 'all 0.2s ease';
            locationCard.style.cursor = 'pointer';
            locationCard.style.position = 'relative';
            locationCard.style.overflow = 'hidden';

            // Category indicator
            const categoryTag = document.createElement('div');
            categoryTag.className = 'category-tag';
            categoryTag.textContent = category === 'endgame'
                ? `ENDGAME T${loc.endgameTier || 1}`
                : (category === 'operation'
                    ? ({ lower: 'CATCH-UP', current: 'CURRENT', higher: 'HIGHER RISK' }[loc.difficultyBand] || 'OPERATION')
                    : category.toUpperCase());
            categoryTag.style.position = 'absolute';
            categoryTag.style.top = '8px';
            categoryTag.style.right = '8px';
            categoryTag.style.fontSize = '8px'; // Smaller font
            categoryTag.style.padding = '2px 4px';
            categoryTag.style.borderRadius = '3px';
            categoryTag.style.textTransform = 'uppercase';
            categoryTag.style.letterSpacing = '0.5px';
            categoryTag.style.zIndex = '1'; // Ensure it's above other elements

            // Set color based on category
            switch(category) {
                case 'training':
                    categoryTag.style.background = 'rgba(0, 176, 255, 0.3)';
                    categoryTag.style.border = '1px solid #00b0ff';
                    categoryTag.style.color = '#90e0ef';
                    break;
                case 'industrial':
                    categoryTag.style.background = 'rgba(255, 159, 28, 0.3)';
                    categoryTag.style.border = '1px solid #ff9f1c';
                    categoryTag.style.color = '#ffbd59';
                    break;
                case 'wilderness':
                    categoryTag.style.background = 'rgba(76, 187, 23, 0.3)';
                    categoryTag.style.border = '1px solid #4cbb17';
                    categoryTag.style.color = '#90ee90';
                    break;
                case 'residential':
                    categoryTag.style.background = 'rgba(147, 112, 219, 0.3)';
                    categoryTag.style.border = '1px solid #9370db';
                    categoryTag.style.color = '#b19cd9';
                    break;
                case 'dangerous':
                    categoryTag.style.background = 'rgba(220, 53, 69, 0.3)';
                    categoryTag.style.border = '1px solid #dc3545';
                    categoryTag.style.color = '#f08080';
                    break;
                case 'endgame':
                    categoryTag.style.background = 'rgba(153, 51, 255, 0.35)';
                    categoryTag.style.border = '1px solid #c266ff';
                    categoryTag.style.color = '#e0b3ff';
                    locationCard.style.borderColor = '#8f3dcc';
                    break;
                case 'operation':
                    if (loc.difficultyBand === 'higher') {
                        categoryTag.style.background = 'rgba(255, 93, 93, 0.2)';
                        categoryTag.style.border = '1px solid #ff6868';
                        categoryTag.style.color = '#ffaaaa';
                        locationCard.style.borderColor = '#b8465e';
                    } else if (loc.difficultyBand === 'lower') {
                        categoryTag.style.background = 'rgba(78, 168, 255, 0.2)';
                        categoryTag.style.border = '1px solid #5caeff';
                        categoryTag.style.color = '#acd6ff';
                        locationCard.style.borderColor = '#397eb4';
                    } else {
                        categoryTag.style.background = 'rgba(0, 255, 204, 0.18)';
                        categoryTag.style.border = '1px solid #00ffcc';
                        categoryTag.style.color = '#8bffe7';
                        locationCard.style.borderColor = '#00a68a';
                    }
                    break;
                default:
                    categoryTag.style.background = 'rgba(108, 117, 125, 0.3)';
                    categoryTag.style.border = '1px solid #6c757d';
                    categoryTag.style.color = '#adb5bd';
            }

            locationCard.appendChild(categoryTag);

            if (selectedDeploymentMode === 'patrol' && completedDelveLocations[loc.name] > 0) {
                const clearedTag = document.createElement('div');
                clearedTag.className = 'location-cleared-tag';
                clearedTag.textContent = `CLEARED ×${completedDelveLocations[loc.name]}`;
                locationCard.appendChild(clearedTag);
            }

            // Location name
            const locationName = document.createElement('h4');
            locationName.textContent = loc.name;
            locationName.style.color = '#e0f2ff';
            locationName.style.margin = '5px 0 8px 0';
            locationName.style.fontSize = '16px';
            locationName.style.fontWeight = 'bold';
            locationName.style.fontFamily = '"Rajdhani", sans-serif';
            locationName.style.paddingRight = '65px'; // Add padding to avoid overlap with tag
            locationCard.appendChild(locationName);

            // Location description
            const locationDesc = document.createElement('p');
            locationDesc.textContent = loc.description || "No description available.";
            locationDesc.style.color = '#a0c5e8';
            locationDesc.style.fontSize = '12px';
            locationDesc.style.margin = '0 0 10px 0';
            locationDesc.style.flex = '1';
            locationDesc.style.lineHeight = '1.4';
            locationCard.appendChild(locationDesc);

            // Recommended level (optional) with color-coded badge
            if (typeof loc.recommendedLevel === 'number' && !isNaN(loc.recommendedLevel)) {
                const badge = document.createElement('span');
                badge.className = 'adventure-badge';
                badge.textContent = `Rec. Lv ${loc.recommendedLevel}`;
                const plyrLevel = (typeof player !== 'undefined' && player && typeof player.level === 'number') ? player.level : 1;
                const delta = plyrLevel - loc.recommendedLevel;
                if (delta <= -3) badge.setAttribute('data-diff', 'below-3');
                else if (delta <= -1) badge.setAttribute('data-diff', 'below-1');
                else if (delta === 0) badge.setAttribute('data-diff', 'even');
                else if (delta <= 2) badge.setAttribute('data-diff', 'above-1');
                else badge.setAttribute('data-diff', 'above-3');
                badge.style.alignSelf = 'flex-start';
                badge.style.margin = '0 0 8px 0';
                locationCard.appendChild(badge);
            }

            // Enemy count and fight info
            const enemyInfo = document.createElement('div');
            enemyInfo.style.display = 'flex';
            enemyInfo.style.flexDirection = 'column';
            enemyInfo.style.gap = '3px';
            enemyInfo.style.marginTop = '5px';
            locationCard.appendChild(enemyInfo);

            const enemyCount = document.createElement('span');
            enemyCount.textContent = `${loc.enemies.length} Known Entities`;
            enemyCount.style.color = '#7fdbff';
            enemyCount.style.fontSize = '11px';
            enemyInfo.appendChild(enemyCount);

            const fightCount = document.createElement('span');
            fightCount.textContent = selectedDeploymentMode === 'patrol' ? 'Infinite Encounters' : `${loc.numFights} Encounters`;
            fightCount.style.color = '#7fdbff';
            fightCount.style.fontSize = '11px';
            enemyInfo.appendChild(fightCount);

            if (selectedDeploymentMode === 'operation') {
                const reward = document.createElement('span');
                reward.className = 'operation-guaranteed-reward';
                reward.textContent = `Guaranteed on success: ${formatOperationReward(loc.guaranteedReward)}`;
                reward.style.color = '#ffd166';
                reward.style.fontSize = '12px';
                reward.style.fontWeight = 'bold';
                reward.style.marginTop = '5px';
                enemyInfo.appendChild(reward);
            }

            // Action button
            const actionButton = document.createElement('button');
            actionButton.textContent = selectedDeploymentMode === 'patrol' ? 'START PATROL' : 'START OPERATION';
            actionButton.className = 'location-action-button';
            actionButton.style.marginTop = '15px';
            actionButton.style.padding = '8px';
            actionButton.style.background = 'linear-gradient(135deg, #003559, #005f73)';
            actionButton.style.color = '#e0f2ff';
            actionButton.style.border = '1px solid #00a6fb';
            actionButton.style.borderRadius = '4px';
            actionButton.style.boxShadow = '0 0 10px rgba(0, 166, 251, 0.3)';
            actionButton.style.fontWeight = 'bold';
            actionButton.style.cursor = 'pointer';
            actionButton.style.fontFamily = '"Rajdhani", sans-serif';
            actionButton.style.transition = 'all 0.2s ease';
            locationCard.appendChild(actionButton);

            // Hover effects
            locationCard.addEventListener('mouseover', function() {
                this.style.transform = 'translateY(-5px)';
                this.style.boxShadow = '0 5px 15px rgba(0, 166, 251, 0.4)';
                this.style.borderColor = '#00b4d8';

                // Add glowing border effect
                this.style.boxShadow = '0 0 15px rgba(0, 180, 216, 0.5), 0 5px 15px rgba(0, 166, 251, 0.4)';
            });

            locationCard.addEventListener('mouseout', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = 'none';
                this.style.borderColor = '#0077b6';
            });

            // Click event to start adventure
            locationCard.addEventListener('click', () => {
                if (selectedDeploymentMode === 'patrol') startPatrol(loc);
                else startAdventure(loc, selectedOperationCoreId || null);
            });

            // Also add click event to button
            actionButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the card's click event
                if (selectedDeploymentMode === 'patrol') startPatrol(loc);
                else startAdventure(loc, selectedOperationCoreId || null);
            });

            locationGrid.appendChild(locationCard);
        });

        // Add "Connecting to network..." animation effect during load
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'location-loading-overlay';
        loadingOverlay.style.position = 'absolute';
        loadingOverlay.style.top = '0';
        loadingOverlay.style.left = '0';
        loadingOverlay.style.width = '100%';
        loadingOverlay.style.height = '100%';
        loadingOverlay.style.background = 'rgba(0, 15, 30, 0.9)';
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.flexDirection = 'column';
        loadingOverlay.style.alignItems = 'center';
        loadingOverlay.style.justifyContent = 'center';
        loadingOverlay.style.zIndex = '10';
        loadingOverlay.style.transition = 'opacity 0.5s ease';

        const loadingText = document.createElement('div');
        loadingText.textContent = 'CONNECTING TO NETWORK';
        loadingText.style.color = '#00ffcc';
        loadingText.style.fontFamily = '"Rajdhani", "Courier New", monospace';
        loadingText.style.marginBottom = '15px';
        loadingText.style.fontSize = '18px';
        loadingOverlay.appendChild(loadingText);

        const loadingDots = document.createElement('div');
        loadingDots.className = 'loading-dots';
        loadingDots.style.display = 'flex';
        loadingDots.style.gap = '8px';

        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.style.width = '10px';
            dot.style.height = '10px';
            dot.style.background = '#00ffcc';
            dot.style.borderRadius = '50%';
            dot.style.animation = `loading-dot 1.5s infinite ${i * 0.2}s`;
            loadingDots.appendChild(dot);
        }

        const loadingDotsAnimation = document.createElement('style');
        loadingDotsAnimation.textContent = `
            @keyframes loading-dot {
                0%, 100% { opacity: 0.3; transform: scale(0.8); }
                50% { opacity: 1; transform: scale(1.2); }
            }
        `;
        document.head.appendChild(loadingDotsAnimation);

        loadingOverlay.appendChild(loadingDots);
        interfaceContainer.appendChild(loadingOverlay);

        // Hide loading overlay after a delay
        setTimeout(() => {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                interfaceContainer.removeChild(loadingOverlay);
            }, 500);
        }, 1200); // 1.2 seconds loading animation
    }
}
