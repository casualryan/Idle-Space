// Purpose-built Flux interface for permanently binding and rerolling one generated modifier.

const FLUX_REROLL_COSTS = Object.freeze({ 1: 1, 2: 1, 3: 2, 4: 3, 5: 4 });
const FLUX_GRADE_UPGRADE_COST = 10;
let selectedModificationItem = null;
let lastFluxRerollResult = null;

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
    if (!item || item.fluxTargetModifierId || item.fluxModificationLocked) return false;
    const modifier = item.rolledModifiers?.find(candidate => candidate.id === modifierId);
    if (!modifier || !getModifierRollRange(item, modifier)) return false;
    item.fluxTargetModifierId = modifier.id;
    lastFluxRerollResult = null;
    logMessage(`${item.name} is now Flux-bound.`);
    refreshModifiedItemViews(item);
    renderItemModificationScreen();
    return true;
}

function isModifiedItemEquipped(item) {
    const equipment = player?.equipment || {};
    return ['mainHand', 'offHand', 'head', 'chest', 'legs', 'feet', 'gloves']
        .some(slot => equipment[slot] === item)
        || (Array.isArray(equipment.bionicSlots) && equipment.bionicSlots.includes(item));
}

function refreshModifiedItemViews(item) {
    if (isModifiedItemEquipped(item)) {
        if (typeof player.calculateStats === 'function') player.calculateStats();
        if (typeof updatePlayerStatsDisplay === 'function') updatePlayerStatsDisplay();
        if (typeof updateEquipmentDisplay === 'function') updateEquipmentDisplay();
    }
    if (typeof updateInventoryDisplay === 'function') updateInventoryDisplay();
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
    if (!item?.fluxTargetModifierId || item.fluxModificationLocked || isDelveInProgress || isCombatActive) return false;
    const modifier = item.rolledModifiers?.find(candidate => candidate.id === item.fluxTargetModifierId);
    if (!modifier) return false;
    const grade = Math.max(1, Math.min(5, Math.floor(Number(modifier.grade) || 1)));
    const fluxName = getFluxNameForModifier(modifier);
    const cost = FLUX_REROLL_COSTS[grade];
    if (getMaterialQuantity(fluxName) < cost) {
        showWarningPopup(`Requires ${cost} ${fluxName}.`);
        return false;
    }

    if (!removeMaterialFromStorage(fluxName, cost)) return false;
    const result = rerollBoundItemModifier(item);
    if (!result) {
        addMaterialToStorage(fluxName, cost);
        showWarningPopup('The selected modifier could not be rerolled. Flux was refunded.');
        return false;
    }
    lastFluxRerollResult = { item, previous: result.previous, next: result.next, mode: 'reroll' };
    logMessage(`${item.name}: ${formatFluxRerollOutcome(result.previous)} → ${formatFluxRerollOutcome(result.next)}.`);
    if (typeof updateMaterialInventoryDisplay === 'function') updateMaterialInventoryDisplay();
    refreshModifiedItemViews(item);
    renderItemModificationScreen();
    return true;
}

function upgradeSelectedFluxModifierGrade(item) {
    if (!item?.fluxTargetModifierId || item.fluxModificationLocked || isDelveInProgress || isCombatActive) return false;
    const modifier = item.rolledModifiers?.find(candidate => candidate.id === item.fluxTargetModifierId);
    const grade = Math.max(1, Math.min(5, Math.floor(Number(modifier?.grade) || 1)));
    if (!modifier || grade >= 5) return false;
    const fluxName = getFluxNameForModifier(modifier);
    if (getMaterialQuantity(fluxName) < FLUX_GRADE_UPGRADE_COST) {
        showWarningPopup(`Requires ${FLUX_GRADE_UPGRADE_COST} ${fluxName}.`);
        return false;
    }
    if (!removeMaterialFromStorage(fluxName, FLUX_GRADE_UPGRADE_COST)) return false;
    const result = typeof upgradeBoundItemModifierGrade === 'function'
        ? upgradeBoundItemModifierGrade(item)
        : null;
    if (!result) {
        addMaterialToStorage(fluxName, FLUX_GRADE_UPGRADE_COST);
        showWarningPopup('The selected modifier could not be upgraded. Flux was refunded.');
        return false;
    }

    lastFluxRerollResult = { item, previous: result.previous, next: result.next, mode: 'upgrade' };
    logMessage(`${item.name}: ${formatFluxRerollOutcome(result.previous)} → ${formatFluxRerollOutcome(result.next)}. Flux modification is now permanently locked.`);
    if (typeof updateMaterialInventoryDisplay === 'function') updateMaterialInventoryDisplay();
    refreshModifiedItemViews(item);
    renderItemModificationScreen();
    return true;
}

function requestFluxGradeUpgrade(item) {
    const modifier = item?.rolledModifiers?.find(candidate => candidate.id === item.fluxTargetModifierId);
    const grade = Math.max(1, Math.min(5, Math.floor(Number(modifier?.grade) || 1)));
    if (!modifier || item.fluxModificationLocked || grade >= 5) return;
    const fluxName = getFluxNameForModifier(modifier);
    const overlay = document.createElement('div');
    overlay.id = 'flux-upgrade-confirmation-overlay';
    overlay.className = 'flux-upgrade-confirmation-overlay';
    const popup = document.createElement('div');
    popup.className = 'flux-upgrade-confirmation';
    popup.innerHTML = `
        <div class="flux-upgrade-danger-icon" aria-hidden="true">!</div>
        <span class="flux-upgrade-danger-label">CAUTION · PERMANENT ACTION</span>
        <h3>Up-Tier and Lock Item?</h3>
        <p>The bound <strong>${modifier.displayName}</strong> modifier will advance from Grade ${grade} to Grade ${grade + 1} and roll a new value in that grade.</p>
        <div class="flux-upgrade-danger-copy"><strong>This item can never be rerolled or up-tiered again.</strong><small>Wire and Chip management will remain available.</small></div>
        <div class="popup-buttons"><button type="button" data-flux-upgrade-confirm>Spend ${FLUX_GRADE_UPGRADE_COST} ${fluxName} &amp; Lock</button><button type="button" data-flux-upgrade-cancel>Cancel</button></div>`;
    overlay.appendChild(popup);
    const close = () => {
        document.removeEventListener('keydown', onKey);
        overlay.remove();
    };
    const onKey = event => { if (event.key === 'Escape') close(); };
    popup.querySelector('[data-flux-upgrade-confirm]').addEventListener('click', () => {
        close();
        upgradeSelectedFluxModifierGrade(item);
    });
    popup.querySelector('[data-flux-upgrade-cancel]').addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
}

function formatFluxRerollOutcome(modifier) {
    return `${formatModificationRoll(modifier?.displayValue, modifier?.isPercent)} ${modifier?.displayName || 'Modifier'} (${modifier?.gradeLabel || getModifierGradeLabel(modifier?.grade)})`;
}

function executeFluxConversion(sourceGrade, targetGrade) {
    if (isDelveInProgress || isCombatActive) return false;
    const result = convertFluxStorage(sourceGrade, targetGrade);
    if (!result) {
        const upgrading = targetGrade > sourceGrade;
        const sourceName = `Flux ${['I', 'II', 'III', 'IV', 'V'][sourceGrade - 1]}`;
        const required = upgrading ? 5 : 1;
        showWarningPopup(`Requires ${required} ${sourceName} and available storage space.`);
        return false;
    }
    logMessage(`${result.sourceCost} ${result.sourceName} converted into ${result.outputQuantity} ${result.targetName}.`);
    if (typeof updateMaterialInventoryDisplay === 'function') updateMaterialInventoryDisplay();
    renderItemModificationScreen();
    return true;
}

function renderFluxExchange(locked) {
    const section = document.createElement('section');
    section.className = 'flux-exchange-panel';
    section.innerHTML = '<header><span>FLUX EXCHANGE</span><h3>Grade Conversion</h3><p>Compress five lower-grade Flux into one higher grade, or break one higher grade into three of the grade below.</p></header>';
    const grid = document.createElement('div');
    grid.className = 'flux-exchange-grid';
    const numerals = ['I', 'II', 'III', 'IV', 'V'];
    for (let grade = 1; grade < numerals.length; grade += 1) {
        const lowerName = `Flux ${numerals[grade - 1]}`;
        const higherName = `Flux ${numerals[grade]}`;
        const lowerQuantity = getMaterialQuantity(lowerName);
        const higherQuantity = getMaterialQuantity(higherName);
        const row = document.createElement('article');
        row.className = 'flux-exchange-row';
        row.innerHTML = `
            <div><img src="icons/flux_${numerals[grade - 1].toLowerCase()}.png" alt=""><span><strong>${lowerName}</strong><small>Owned: ${lowerQuantity.toLocaleString()}</small></span></div>
            <div class="flux-exchange-actions"></div>
            <div><img src="icons/flux_${numerals[grade].toLowerCase()}.png" alt=""><span><strong>${higherName}</strong><small>Owned: ${higherQuantity.toLocaleString()}</small></span></div>`;
        const actions = row.querySelector('.flux-exchange-actions');
        const upgrade = document.createElement('button');
        upgrade.type = 'button';
        upgrade.textContent = `5 ${numerals[grade - 1]} → 1 ${numerals[grade]}`;
        upgrade.disabled = locked || lowerQuantity < 5 || higherQuantity >= MATERIAL_STORAGE_CAP;
        upgrade.addEventListener('click', () => executeFluxConversion(grade, grade + 1));
        const downgrade = document.createElement('button');
        downgrade.type = 'button';
        downgrade.textContent = `3 ${numerals[grade - 1]} ← 1 ${numerals[grade]}`;
        downgrade.disabled = locked || higherQuantity < 1 || lowerQuantity > MATERIAL_STORAGE_CAP - 3;
        downgrade.addEventListener('click', () => executeFluxConversion(grade + 1, grade));
        actions.append(upgrade, downgrade);
        grid.appendChild(row);
    }
    section.appendChild(grid);
    return section;
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
        row.className = `flux-modifier-row${selected ? ' is-bound' : ''}${unavailable ? ' is-unavailable' : ''}${item.fluxModificationLocked ? ' is-locked' : ''}`;
        row.disabled = unavailable || Boolean(boundId) || Boolean(item.fluxModificationLocked) || isDelveInProgress || isCombatActive;
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

function renderPossibleModifierBrowser(item) {
    const details = document.createElement('details');
    details.className = 'possible-modifier-browser';
    const info = typeof getPossibleRandomModifiers === 'function'
        ? getPossibleRandomModifiers(item)
        : null;
    if (!info || info.modifiers.length === 0) {
        details.innerHTML = '<summary>Possible Rolls</summary><p>No generated modifiers are available for this item.</p>';
        return details;
    }

    const summary = document.createElement('summary');
    summary.textContent = `Possible Rolls (${info.modifiers.length})`;
    details.appendChild(summary);

    const intro = document.createElement('p');
    intro.textContent = `Level ${info.level} items generate ${info.countRange} modifiers from this pool.`;
    details.appendChild(intro);

    const list = document.createElement('div');
    list.className = 'possible-modifier-list';
    info.modifiers.forEach(modifier => {
        const row = document.createElement('div');
        row.className = 'possible-modifier-row';
        const name = document.createElement('strong');
        name.textContent = modifier.displayName;
        const ranges = document.createElement('span');
        ranges.className = 'possible-modifier-ranges';
        modifier.grades.forEach(grade => {
            const range = document.createElement('small');
            range.textContent = `${grade.gradeLabel}: ${formatModificationRoll(grade.min, modifier.isPercent)}–${formatModificationRoll(grade.max, modifier.isPercent)}`;
            ranges.appendChild(range);
        });
        row.appendChild(name);
        row.appendChild(ranges);
        list.appendChild(row);
    });
    details.appendChild(list);
    return details;
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
            button.innerHTML = `<img src="${entry.item.icon || 'icons/default-icon.png'}" alt=""><span><strong>${entry.item.name}</strong><small>${entry.source}</small></span>${entry.item.fluxModificationLocked ? '<b aria-label="Flux modification locked">▣</b>' : entry.item.fluxTargetModifierId ? '<b aria-label="Flux bound">◈</b>' : ''}`;
            button.addEventListener('click', () => {
                if (selectedModificationItem !== entry.item) lastFluxRerollResult = null;
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
        root.appendChild(renderFluxExchange(locked));
        return;
    }

    const item = selectedModificationItem;
    const boundModifier = item.rolledModifiers.find(modifier => modifier.id === item.fluxTargetModifierId);
    workspace.innerHTML = `
        <div class="modification-static-stats">
            <header><span>CURRENT ITEM</span><h3>${item.name}${item.fluxModificationLocked ? ' <b aria-label="Flux modification locked">▣</b>' : boundModifier ? ' <b aria-label="Flux bound">◈</b>' : ''}</h3></header>
            <div class="modification-tooltip-static">${getItemTooltipContent(item, false)}</div>
        </div>
        <div class="modification-affix-panel"><header><span>MODIFIABLE</span><h3>Generated Modifiers</h3></header></div>`;
    const affixPanel = workspace.querySelector('.modification-affix-panel');
    affixPanel.appendChild(renderModifierRows(item));
    affixPanel.appendChild(renderPossibleModifierBrowser(item));

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
        button.disabled = locked || item.fluxModificationLocked || getMaterialQuantity(fluxName) < cost;
        if (item.fluxModificationLocked) button.textContent = 'Modification Locked';
        button.addEventListener('click', () => rerollSelectedFluxModifier(item));
        affixPanel.appendChild(action);
        if (lastFluxRerollResult?.item === item) {
            const result = document.createElement('div');
            result.className = 'flux-reroll-result';
            const label = document.createElement('span');
            label.textContent = 'LAST MODIFICATION';
            const outcome = document.createElement('p');
            outcome.textContent = `${formatFluxRerollOutcome(lastFluxRerollResult.previous)} → ${formatFluxRerollOutcome(lastFluxRerollResult.next)}`;
            result.append(label, outcome);
            affixPanel.appendChild(result);
        }
        if (item.fluxModificationLocked) {
            const lockedNotice = document.createElement('div');
            lockedNotice.className = 'flux-item-locked-notice';
            lockedNotice.innerHTML = '<strong>▣ FLUX MODIFICATION LOCKED</strong><span>This item cannot be rerolled or up-tiered again. Wires and Chips remain editable.</span>';
            affixPanel.appendChild(lockedNotice);
        } else if (grade < 5) {
            const upgrade = document.createElement('div');
            upgrade.className = 'flux-upgrade-action';
            upgrade.innerHTML = `
                <div><span class="flux-upgrade-mark">!</span><span><strong>Up-Tier to Grade ${grade + 1}</strong><small>${FLUX_GRADE_UPGRADE_COST} ${fluxName} · Permanently locks Flux modification</small></span></div>
                <button type="button">Up-Tier &amp; Lock</button>`;
            const upgradeButton = upgrade.querySelector('button');
            upgradeButton.disabled = locked || getMaterialQuantity(fluxName) < FLUX_GRADE_UPGRADE_COST;
            upgradeButton.addEventListener('click', () => requestFluxGradeUpgrade(item));
            affixPanel.appendChild(upgrade);
        }
    } else {
        const note = document.createElement('p');
        note.className = 'flux-bind-note';
        note.textContent = 'Select one modifier to bind permanently.';
        affixPanel.appendChild(note);
    }

    root.appendChild(workspace);
    root.appendChild(renderFluxExchange(locked));
}

window.renderItemModificationScreen = renderItemModificationScreen;
window.FLUX_REROLL_COSTS = FLUX_REROLL_COSTS;
window.FLUX_GRADE_UPGRADE_COST = FLUX_GRADE_UPGRADE_COST;

window.registerCoreboundInitializer(() => {
    addInventoryChangeListener(() => {
        if (currentScreen === 'modification-screen') renderItemModificationScreen();
    });
    renderItemModificationScreen();
});

window.addEventListener('screenChanged', event => {
    if (event.detail.screenId === 'modification-screen') renderItemModificationScreen();
});
