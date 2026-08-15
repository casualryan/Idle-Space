// Purpose-built Flux interface for permanently binding and rerolling one generated modifier.

const FLUX_REROLL_COSTS = Object.freeze({ 1: 1, 2: 1, 3: 2, 4: 3, 5: 4 });
let selectedModificationItem = null;

function isEquipmentItemForModification(item) {
    if (!item || !Array.isArray(item.rolledModifiers) || item.rolledModifiers.length === 0) return false;
    return ['Weapon', 'Armor', 'Bionic'].includes(item.type) || ['mainHand', 'offHand', 'head', 'chest', 'legs', 'feet', 'gloves', 'bionic'].includes(item.slot);
}

function getModificationItemEntries() {
    const entries = [];
    (window.inventory || []).forEach((item, index) => {
        if (isEquipmentItemForModification(item)) entries.push({ item, source: 'Inventory', key: `inventory-${index}` });
    });
    const equipment = player?.equipment || {};
    ['mainHand', 'offHand', 'head', 'chest', 'legs', 'feet', 'gloves'].forEach(slot => {
        if (isEquipmentItemForModification(equipment[slot])) entries.push({ item: equipment[slot], source: `Equipped · ${slot}`, key: `equipment-${slot}` });
    });
    (equipment.bionicSlots || []).forEach((item, index) => {
        if (isEquipmentItemForModification(item)) entries.push({ item, source: `Equipped · Bionic ${index + 1}`, key: `bionic-${index}` });
    });
    return entries;
}

function getFluxNameForModifier(modifier) {
    const grade = Math.max(1, Math.min(5, Math.floor(Number(modifier?.grade) || 1)));
    return `Flux ${['I', 'II', 'III', 'IV', 'V'][grade - 1]}`;
}

function formatModificationRoll(value, isPercent) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    const formatted = Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/\.00$/, '');
    return `${formatted}${isPercent ? '%' : ''}`;
}

function bindFluxTarget(item, modifierId) {
    if (!item || item.fluxTargetModifierId) return false;
    const modifier = item.rolledModifiers?.find(candidate => candidate.id === modifierId);
    if (!modifier || !getModifierRollRange(item, modifier)) return false;
    item.fluxTargetModifierId = modifier.id;
    logMessage(`${item.name} is now Flux-bound.`);
    if (typeof updateInventoryDisplay === 'function') updateInventoryDisplay();
    renderItemModificationScreen();
    return true;
}

function requestFluxTargetBinding(item, modifierId) {
    const modifier = item?.rolledModifiers?.find(candidate => candidate.id === modifierId);
    if (!modifier) return;
    const commit = () => bindFluxTarget(item, modifierId);
    const message = `Bind ${modifier.displayName} on ${item.name}? This target can never be changed.`;
    if (typeof showConfirmationPopup === 'function') showConfirmationPopup(message, commit);
    else if (confirm(message)) commit();
}

function rerollSelectedFluxModifier(item) {
    if (!item?.fluxTargetModifierId || isDelveInProgress || isCombatActive) return false;
    const modifier = item.rolledModifiers?.find(candidate => candidate.id === item.fluxTargetModifierId);
    if (!modifier) return false;
    const grade = Math.max(1, Math.min(5, Math.floor(Number(modifier.grade) || 1)));
    const fluxName = getFluxNameForModifier(modifier);
    const cost = FLUX_REROLL_COSTS[grade];
    if (getMaterialQuantity(fluxName) < cost) {
        showWarningPopup(`Requires ${cost} ${fluxName}.`);
        return false;
    }

    const previous = modifier.displayValue;
    if (!removeMaterialFromStorage(fluxName, cost)) return false;
    const result = rerollBoundItemModifier(item);
    if (!result) {
        addMaterialToStorage(fluxName, cost);
        showWarningPopup('The selected modifier could not be rerolled. Flux was refunded.');
        return false;
    }
    if (Object.values(player.equipment || {}).includes(item) || player.equipment?.bionicSlots?.includes(item)) {
        player.calculateStats();
        updatePlayerStatsDisplay();
    }
    logMessage(`${item.name}: ${modifier.displayName} ${formatModificationRoll(previous, modifier.isPercent)} → ${formatModificationRoll(modifier.displayValue, modifier.isPercent)}.`);
    if (typeof updateMaterialInventoryDisplay === 'function') updateMaterialInventoryDisplay();
    if (typeof updateInventoryDisplay === 'function') updateInventoryDisplay();
    renderItemModificationScreen();
    return true;
}

function renderModifierRows(item) {
    const container = document.createElement('div');
    container.className = 'flux-modifier-list';
    const boundId = item.fluxTargetModifierId || null;
    item.rolledModifiers.forEach(modifier => {
        const range = getModifierRollRange(item, modifier);
        if (!range) return;
        const selected = boundId === modifier.id;
        const unavailable = Boolean(boundId && !selected);
        const row = document.createElement('button');
        row.type = 'button';
        row.className = `flux-modifier-row${selected ? ' is-bound' : ''}${unavailable ? ' is-unavailable' : ''}`;
        row.disabled = unavailable || Boolean(boundId) || isDelveInProgress || isCombatActive;
        row.title = `${range.gradeLabel}: ${formatModificationRoll(range.min, range.isPercent)}–${formatModificationRoll(range.max, range.isPercent)}`;
        row.innerHTML = `
            <span class="flux-bound-symbol" aria-hidden="true">${selected ? '◈' : '◇'}</span>
            <span class="flux-modifier-name"><strong>${modifier.displayName}</strong><small>${range.gradeLabel}</small></span>
            <span class="flux-modifier-value">${formatModificationRoll(modifier.displayValue, modifier.isPercent)}</span>
            <span class="flux-modifier-range">${formatModificationRoll(range.min, range.isPercent)}–${formatModificationRoll(range.max, range.isPercent)}</span>`;
        if (!boundId) row.addEventListener('click', () => requestFluxTargetBinding(item, modifier.id));
        container.appendChild(row);
    });
    return container;
}

function renderItemModificationScreen() {
    const root = document.getElementById('item-modification-root');
    if (!root) return;
    const locked = Boolean(isDelveInProgress || isCombatActive);
    const lockNotice = document.getElementById('modification-run-lock');
    if (lockNotice) lockNotice.hidden = !locked;
    const entries = getModificationItemEntries();
    if (selectedModificationItem && !entries.some(entry => entry.item === selectedModificationItem)) selectedModificationItem = null;
    root.innerHTML = '';

    const selector = document.createElement('section');
    selector.className = 'modification-item-selector';
    selector.innerHTML = '<header><span>EQUIPMENT</span><h3>Select Item</h3></header>';
    const list = document.createElement('div');
    list.className = 'modification-item-list';
    if (entries.length === 0) {
        list.innerHTML = '<p class="modification-empty">No equipment with generated modifiers is available.</p>';
    } else {
        entries.forEach(entry => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `modification-item-card${entry.item === selectedModificationItem ? ' is-selected' : ''}`;
            button.disabled = locked;
            button.innerHTML = `<img src="${entry.item.icon || 'icons/default-icon.png'}" alt=""><span><strong>${entry.item.name}</strong><small>${entry.source}</small></span>${entry.item.fluxTargetModifierId ? '<b aria-label="Flux bound">◈</b>' : ''}`;
            button.addEventListener('click', () => {
                selectedModificationItem = entry.item;
                renderItemModificationScreen();
            });
            list.appendChild(button);
        });
    }
    selector.appendChild(list);
    root.appendChild(selector);

    const workspace = document.createElement('section');
    workspace.className = 'modification-workspace';
    if (!selectedModificationItem) {
        workspace.innerHTML = '<div class="modification-empty-state"><span>◇</span><strong>No item selected</strong></div>';
        root.appendChild(workspace);
        return;
    }

    const item = selectedModificationItem;
    const boundModifier = item.rolledModifiers.find(modifier => modifier.id === item.fluxTargetModifierId);
    workspace.innerHTML = `
        <div class="modification-static-stats">
            <header><span>CURRENT ITEM</span><h3>${item.name}${boundModifier ? ' <b aria-label="Flux bound">◈</b>' : ''}</h3></header>
            <div class="modification-tooltip-static">${getItemTooltipContent(item, false)}</div>
        </div>
        <div class="modification-affix-panel"><header><span>MODIFIABLE</span><h3>Generated Modifiers</h3></header></div>`;
    const affixPanel = workspace.querySelector('.modification-affix-panel');
    affixPanel.appendChild(renderModifierRows(item));

    if (boundModifier) {
        const grade = Math.max(1, Math.min(5, Number(boundModifier.grade) || 1));
        const fluxName = getFluxNameForModifier(boundModifier);
        const cost = FLUX_REROLL_COSTS[grade];
        const action = document.createElement('div');
        action.className = 'flux-reroll-action';
        action.innerHTML = `
            <div><img src="icons/flux_${['i', 'ii', 'iii', 'iv', 'v'][grade - 1]}.png" alt=""><span><strong>${cost} ${fluxName}</strong><small>Owned: ${getMaterialQuantity(fluxName)}</small></span></div>
            <button type="button">Reroll ◈</button>`;
        const button = action.querySelector('button');
        button.disabled = locked || getMaterialQuantity(fluxName) < cost;
        button.addEventListener('click', () => rerollSelectedFluxModifier(item));
        affixPanel.appendChild(action);
    } else {
        const note = document.createElement('p');
        note.className = 'flux-bind-note';
        note.textContent = 'Select one modifier to bind permanently.';
        affixPanel.appendChild(note);
    }

    root.appendChild(workspace);
}

window.renderItemModificationScreen = renderItemModificationScreen;
window.FLUX_REROLL_COSTS = FLUX_REROLL_COSTS;

window.registerCoreboundInitializer(() => {
    addInventoryChangeListener(() => {
        if (currentScreen === 'modification-screen') renderItemModificationScreen();
    });
    renderItemModificationScreen();
});

window.addEventListener('screenChanged', event => {
    if (event.detail.screenId === 'modification-screen') renderItemModificationScreen();
});
