// Interactive renderer and allocation controller for the Corebound radial passive tree.

if (!player.passiveAllocations) player.passiveAllocations = {};
if (!Number.isFinite(Number(player.passivePoints))) player.passivePoints = 1;
if (!player.gearPassiveBonuses) player.gearPassiveBonuses = {};
if (!player.passiveBonuses) player.passiveBonuses = createEmptyPassiveBonuses();

let selectedPassiveNodeId = PASSIVE_TREE_ORIGIN_ID;
let passiveTreeSearch = '';
let passiveTreeView = { x: -1250, y: -1250, width: 2500, height: 2500 };
let passiveTreeDragState = null;

function escapePassiveHTML(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function ensurePlayerPassiveTreeState() {
    if (player.passiveTreeVersion !== PASSIVE_TREE_VERSION) {
        const refund = Object.values(player.passiveAllocations || {})
            .reduce((total, rank) => total + Math.max(0, Math.floor(Number(rank) || 0)), 0);
        player.passivePoints = Math.max(0, Math.floor(Number(player.passivePoints) || 0)) + refund;
        player.passiveAllocations = {};
        player.passiveTreeVersion = PASSIVE_TREE_VERSION;
        if (refund > 0 && typeof logMessage === 'function') {
            logMessage(`The passive tree was rebuilt. ${refund} legacy passive point${refund === 1 ? '' : 's'} were refunded.`);
        }
    }
    const authoredRanks = Object.values(player.passiveAllocations || {})
        .reduce((total, rank) => total + Math.max(0, Math.floor(Number(rank) || 0)), 0);
    const normalized = normalizePassiveAllocations(player.passiveAllocations);
    const retainedRanks = Object.values(normalized).reduce((total, rank) => total + rank, 0);
    if (authoredRanks > retainedRanks) player.passivePoints += authoredRanks - retainedRanks;
    player.passiveAllocations = normalized;
}

function getPassiveMaxEffectiveRank(passive) {
    return Math.max(1, Number(passive?.maxRank || 1));
}

function getPassiveNodeAllocatedRank(nodeId) {
    return Math.max(0, Number(player.passiveAllocations?.[nodeId]) || 0);
}

function getPassiveNodeGearRank(nodeId) {
    return Math.max(0, Number(player.gearPassiveBonuses?.[nodeId]) || 0);
}

function getPassiveNodeEffectiveRank(nodeId) {
    const node = getPassiveNode(nodeId);
    if (!node) return 0;
    if (node.id === PASSIVE_TREE_ORIGIN_ID) return 1;
    const allocated = getPassiveNodeAllocatedRank(node.id);
    const gear = node.gearScalable ? getPassiveNodeGearRank(node.id) : 0;
    return allocated + gear;
}

function getAllocatedPassivePointCount() {
    return Object.values(player.passiveAllocations || {})
        .reduce((total, rank) => total + Math.max(0, Number(rank) || 0), 0);
}

function getPassiveSectorAllocationSummary() {
    const summary = Object.fromEntries(PASSIVE_TREE_SECTOR_ORDER.map(sector => [sector, 0]));
    summary.core = 0;
    summary.bridge = 0;
    for (const [nodeId, rank] of Object.entries(player.passiveAllocations || {})) {
        const node = getPassiveNode(nodeId);
        if (!node) continue;
        summary[node.sector] = Number(summary[node.sector] || 0) + Number(rank || 0);
    }
    return summary;
}

function formatPassiveEffectName(key, nestedKey = null) {
    const labels = {
        attackSpeed: 'Attack Speed', damageTypes: 'Damage', damageGroups: 'Damage', flatDamageTypes: 'Flat Damage',
        defenseTypes: 'Resistance', healthPercent: 'Maximum Health', energyShieldPercent: 'Maximum Energy Shield',
        criticalChance: 'Critical Strike Chance', criticalMultiplier: 'Critical Damage', flatHealth: 'Maximum Health',
        flatEnergyShield: 'Energy Shield', healthRegen: 'Health Regeneration / Second', precision: 'Precision',
        deflection: 'Deflection', armorEfficiency: 'Armor Efficiency', weaponEfficiency: 'Weapon Efficiency',
        bionicEfficiency: 'Bionic Efficiency', bionicSync: 'Bionic Sync', comboAttack: 'Combo Attack Chance',
        comboEffectiveness: 'Combo Effectiveness', additionalComboAttacks: 'Additional Combo Attacks',
        severedLimbChance: 'Severed Limb Chance', maxSeveredLimbs: 'Maximum Severed Limbs',
        maxSeepingWoundStacks: 'Maximum Seeping Wound Stacks', damageRollFloorBonus: 'Minimum Damage Roll',
        debuffChanceBonus: 'Status Application Chance', debuffDurationBonus: 'Status Duration',
        directDamageMultiplier: 'Direct Hit Damage', dotDamageMultiplier: 'Damage Over Time',
        damageVsDebuffed: 'Damage Against Debuffed Targets', damageTakenReduction: 'Damage Taken Reduction'
    };
    if (!nestedKey) return labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, letter => letter.toUpperCase());
    const nestedLabels = {
        physicalResistance: 'Physical Resistance', elementalResistance: 'Elemental Resistance',
        chemicalResistance: 'Chemical Resistance', physical: 'Physical', elemental: 'Elemental', chemical: 'Chemical'
    };
    return `${nestedLabels[nestedKey] || capitalize(nestedKey)} ${labels[key] || ''}`.trim();
}

function formatPassiveEffectValue(key, value) {
    const percentFractionKeys = new Set([
        'damageRollFloorBonus', 'debuffChanceBonus', 'debuffDurationBonus', 'directDamageMultiplier',
        'dotDamageMultiplier', 'damageVsDebuffed', 'damageTakenReduction'
    ]);
    const percentagePointKeys = new Set([
        'attackSpeed', 'healthPercent', 'energyShieldPercent', 'criticalChance', 'damageTypes',
        'damageGroups', 'defenseTypes', 'armorEfficiency', 'weaponEfficiency',
        'bionicEfficiency', 'bionicSync', 'comboAttack', 'comboEffectiveness', 'severedLimbChance'
    ]);
    const numeric = Number(value || 0);
    const prefix = numeric >= 0 ? '+' : '';
    if (percentFractionKeys.has(key)) return `${prefix}${Math.round(numeric * 1000) / 10}%`;
    if (percentagePointKeys.has(key)) return `${prefix}${Math.round(numeric * 10) / 10}%`;
    if (key === 'criticalMultiplier') return `${prefix}${numeric.toFixed(2)}x`;
    return `${prefix}${Math.round(numeric * 100) / 100}`;
}

function getPassiveEffectLines(node, rank = 1) {
    const lines = [];
    for (const [key, value] of Object.entries(node?.effects || {})) {
        if (value && typeof value === 'object') {
            for (const [nestedKey, nestedValue] of Object.entries(value)) {
                lines.push(`${formatPassiveEffectValue(key, Number(nestedValue) * rank)} ${formatPassiveEffectName(key, nestedKey)}`);
            }
        } else {
            lines.push(`${formatPassiveEffectValue(key, Number(value) * rank)} ${formatPassiveEffectName(key)}`);
        }
    }
    return lines;
}

function getPassiveNodeState(node) {
    const allocated = getPassiveNodeAllocatedRank(node.id);
    const gear = getPassiveNodeGearRank(node.id);
    const effective = getPassiveNodeEffectiveRank(node.id);
    const allocation = canAllocatePassiveNode(player.passiveAllocations, node.id);
    const refund = canRefundPassiveNode(player.passiveAllocations, node.id);
    return {
        allocated, gear, effective,
        active: node.id === PASSIVE_TREE_ORIGIN_ID || effective > 0,
        connected: allocated > 0 || node.id === PASSIVE_TREE_ORIGIN_ID,
        available: allocation.ok && player.passivePoints > 0,
        canRefund: refund.ok,
        allocationReason: player.passivePoints <= 0 ? 'No passive points are available.' : allocation.reason,
        refundReason: refund.reason
    };
}

function preservePassiveResourceRatios(callback) {
    const healthMaximum = Math.max(1, Number(player.totalStats?.health) || 1);
    const shieldMaximum = Math.max(0, Number(player.totalStats?.energyShield) || 0);
    const healthRatio = Math.min(1, Math.max(0, Number(player.currentHealth) / healthMaximum));
    const shieldRatio = shieldMaximum > 0 ? Math.min(1, Math.max(0, Number(player.currentShield) / shieldMaximum)) : 0;
    callback();
    resetGearPassiveBonuses();
    applyAllPassivesToPlayer();
    player.currentHealth = Math.max(1, Math.round(player.totalStats.health * healthRatio));
    player.currentShield = Math.max(0, Math.round(player.totalStats.energyShield * shieldRatio));
}

function investPassiveNode(nodeId) {
    ensurePlayerPassiveTreeState();
    const node = getPassiveNode(nodeId);
    const check = canAllocatePassiveNode(player.passiveAllocations, nodeId);
    if (!node || !check.ok || player.passivePoints <= 0) {
        if (typeof logMessage === 'function') logMessage(player.passivePoints <= 0 ? 'You have no passive points to spend.' : check.reason);
        return false;
    }
    preservePassiveResourceRatios(() => {
        player.passiveAllocations[node.id] = 1;
        player.passivePoints--;
    });
    selectedPassiveNodeId = node.id;
    if (typeof logMessage === 'function') logMessage(`Allocated ${node.name}.`);
    displayPassivesScreen();
    return true;
}

function refundPassiveNode(nodeId) {
    ensurePlayerPassiveTreeState();
    const node = getPassiveNode(nodeId);
    const check = canRefundPassiveNode(player.passiveAllocations, nodeId);
    if (!node || !check.ok) {
        if (typeof logMessage === 'function') logMessage(check.reason || 'That passive cannot be refunded.');
        return false;
    }
    preservePassiveResourceRatios(() => {
        delete player.passiveAllocations[node.id];
        player.passivePoints++;
    });
    if (typeof logMessage === 'function') logMessage(`Refunded ${node.name}.`);
    displayPassivesScreen();
    return true;
}

function refundAllPassiveNodes() {
    const refund = getAllocatedPassivePointCount();
    if (refund <= 0) return false;
    preservePassiveResourceRatios(() => {
        player.passiveAllocations = {};
        player.passivePoints += refund;
    });
    selectedPassiveNodeId = PASSIVE_TREE_ORIGIN_ID;
    if (typeof logMessage === 'function') logMessage(`Refunded the passive tree and recovered ${refund} point${refund === 1 ? '' : 's'}.`);
    displayPassivesScreen();
    return true;
}

function applyAllPassivesToPlayer() {
    ensurePlayerPassiveTreeState();
    const bonuses = createEmptyPassiveBonuses();
    const activeNodeIds = new Set([
        ...Object.keys(player.passiveAllocations || {}),
        ...Object.keys(player.gearPassiveBonuses || {})
    ]);
    for (const nodeId of activeNodeIds) {
        const node = getPassiveNode(nodeId);
        if (!node || node.id === PASSIVE_TREE_ORIGIN_ID) continue;
        const rank = getPassiveNodeEffectiveRank(node.id);
        if (rank > 0) accumulatePassiveEffects(bonuses, node.effects, rank);
    }
    player.passiveBonuses = bonuses;
    player.passiveAttackSpeedBonus = bonuses.attackSpeed / 100;
    player.calculateStats();
}

function getPassiveNodeClasses(node, state) {
    const classes = ['passive-tree-node', `node-${node.type}`, `sector-${node.sector}`];
    if (state.active) classes.push('is-active');
    if (state.connected) classes.push('is-connected');
    if (state.available) classes.push('is-available');
    if (state.gear > 0) classes.push('has-gear-rank');
    if (node.id === selectedPassiveNodeId) classes.push('is-selected');
    if (passiveTreeSearch) {
        const haystack = `${node.name} ${node.description} ${node.sector} ${getPassiveEffectLines(node).join(' ')}`.toLowerCase();
        classes.push(haystack.includes(passiveTreeSearch.toLowerCase()) ? 'is-search-match' : 'is-search-dimmed');
    }
    return classes.join(' ');
}

function renderPassiveTreeGraph() {
    const svg = document.getElementById('passive-tree-svg');
    if (!svg) return;
    const manuallyActive = new Set([PASSIVE_TREE_ORIGIN_ID, ...Object.keys(player.passiveAllocations || {})]);
    const edgesMarkup = PASSIVE_TREE.edges.map(edge => {
        const from = getPassiveNode(edge.from);
        const to = getPassiveNode(edge.to);
        const active = manuallyActive.has(from.id) && manuallyActive.has(to.id);
        const available = active || (manuallyActive.has(from.id) && canAllocatePassiveNode(player.passiveAllocations, to.id).ok)
            || (manuallyActive.has(to.id) && canAllocatePassiveNode(player.passiveAllocations, from.id).ok);
        return `<line class="passive-tree-edge${active ? ' is-active' : ''}${available ? ' is-available' : ''}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"></line>`;
    }).join('');

    const sectorLabels = PASSIVE_TREE_SECTOR_ORDER.map(sectorId => {
        const sector = PASSIVE_SECTOR_DEFINITIONS[sectorId];
        const position = passivePolarPosition(1215, sector.angle);
        return `<text class="passive-sector-label sector-${sectorId}" x="${position.x}" y="${position.y}">${escapePassiveHTML(sector.label)}</text>`;
    }).join('');

    const nodesMarkup = passives.map(node => {
        const state = getPassiveNodeState(node);
        const radius = node.type === 'origin' ? 34 : node.type === 'keystone' ? 28 : node.type === 'notable' ? 22 : node.type === 'gateway' ? 20 : 13;
        const showLabel = ['origin', 'gateway', 'notable', 'keystone'].includes(node.type);
        const label = showLabel
            ? `<text class="passive-node-label" x="0" y="${radius + 18}">${escapePassiveHTML(node.name)}</text>`
            : '';
        return `
            <g class="${getPassiveNodeClasses(node, state)}" data-node-id="${node.id}" transform="translate(${node.x} ${node.y})" role="button" tabindex="0" aria-label="${escapePassiveHTML(node.name)}">
                <circle r="${radius}"></circle>
                ${node.type === 'keystone' ? `<path d="M -13 0 L 0 -13 L 13 0 L 0 13 Z"></path>` : ''}
                ${state.gear > 0 ? `<text class="passive-node-gear" x="${radius - 3}" y="${-radius + 7}">+${state.gear}</text>` : ''}
                ${label}
                <title>${escapePassiveHTML(node.name)} — ${escapePassiveHTML(node.description)}</title>
            </g>`;
    }).join('');

    svg.setAttribute('viewBox', `${passiveTreeView.x} ${passiveTreeView.y} ${passiveTreeView.width} ${passiveTreeView.height}`);
    svg.innerHTML = `<g class="passive-tree-edges">${edgesMarkup}</g><g class="passive-tree-labels">${sectorLabels}</g><g class="passive-tree-nodes">${nodesMarkup}</g>`;

    svg.querySelectorAll('[data-node-id]').forEach(element => {
        const nodeId = element.dataset.nodeId;
        const select = () => {
            selectedPassiveNodeId = nodeId;
            renderPassiveTreeGraph();
            renderPassiveNodeDetails();
        };
        element.addEventListener('click', event => { event.stopPropagation(); select(); });
        element.addEventListener('dblclick', event => { event.preventDefault(); event.stopPropagation(); investPassiveNode(nodeId); });
        element.addEventListener('contextmenu', event => { event.preventDefault(); event.stopPropagation(); refundPassiveNode(nodeId); });
        element.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); }
        });
    });
}

function renderPassiveNodeDetails() {
    const detail = document.getElementById('passive-node-details');
    if (!detail) return;
    const node = getPassiveNode(selectedPassiveNodeId) || getPassiveNode(PASSIVE_TREE_ORIGIN_ID);
    const state = getPassiveNodeState(node);
    const sector = PASSIVE_SECTOR_DEFINITIONS[node.sector];
    const effectRank = Math.max(1, state.effective);
    const effects = getPassiveEffectLines(node, effectRank);
    const allocationDisabled = !state.available;
    const refundDisabled = !state.canRefund;
    detail.innerHTML = `
        <div class="passive-detail-heading">
            <div>
                <div class="passive-detail-type">${escapePassiveHTML(node.type)}${sector ? ` · ${escapePassiveHTML(sector.label)}` : ''}</div>
                <h3>${escapePassiveHTML(node.name)}</h3>
            </div>
            ${state.effective > 0 && node.id !== PASSIVE_TREE_ORIGIN_ID ? `<span class="passive-effective-rank">Rank ${state.effective}${state.gear ? ` (+${state.gear} gear)` : ''}</span>` : ''}
        </div>
        <p>${escapePassiveHTML(node.description)}</p>
        <div class="passive-detail-effects">
            ${effects.length ? effects.map(line => `<div>${escapePassiveHTML(line)}</div>`).join('') : '<div>Starting point — no statistical bonus.</div>'}
        </div>
        <div class="passive-detail-actions">
            <button id="allocate-passive-node" class="passive-tree-action" ${allocationDisabled ? 'disabled' : ''}>Allocate 1 Point</button>
            <button id="refund-passive-node" class="passive-tree-action secondary" ${refundDisabled ? 'disabled' : ''}>Refund</button>
        </div>
        <div class="passive-detail-reason">${escapePassiveHTML(state.allocated ? state.refundReason : state.allocationReason)}</div>`;
    detail.querySelector('#allocate-passive-node')?.addEventListener('click', () => investPassiveNode(node.id));
    detail.querySelector('#refund-passive-node')?.addEventListener('click', () => refundPassiveNode(node.id));
}

function renderPassiveTreeSummary() {
    const summaryElement = document.getElementById('passive-tree-summary');
    if (!summaryElement) return;
    const summary = getPassiveSectorAllocationSummary();
    const ranked = PASSIVE_TREE_SECTOR_ORDER
        .map(sectorId => ({ sectorId, points: summary[sectorId] || 0 }))
        .filter(entry => entry.points > 0)
        .sort((left, right) => right.points - left.points);
    summaryElement.innerHTML = ranked.length
        ? ranked.slice(0, 3).map(entry => `<span class="passive-summary-sector sector-${entry.sectorId}">${PASSIVE_SECTOR_DEFINITIONS[entry.sectorId].label}: ${entry.points}</span>`).join('')
        : '<span class="passive-summary-empty">No specialization selected.</span>';
}

function changePassiveTreeZoom(multiplier) {
    const nextWidth = Math.min(3200, Math.max(700, passiveTreeView.width * multiplier));
    const nextHeight = Math.min(3200, Math.max(700, passiveTreeView.height * multiplier));
    passiveTreeView.x += (passiveTreeView.width - nextWidth) / 2;
    passiveTreeView.y += (passiveTreeView.height - nextHeight) / 2;
    passiveTreeView.width = nextWidth;
    passiveTreeView.height = nextHeight;
    renderPassiveTreeGraph();
}

function centerPassiveTreeView() {
    passiveTreeView = { x: -1250, y: -1250, width: 2500, height: 2500 };
    renderPassiveTreeGraph();
}

function bindPassiveTreeInteractions() {
    const svg = document.getElementById('passive-tree-svg');
    if (!svg) return;
    svg.addEventListener('pointerdown', event => {
        if (event.target.closest?.('[data-node-id]')) return;
        passiveTreeDragState = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, view: { ...passiveTreeView } };
        svg.setPointerCapture?.(event.pointerId);
        svg.classList.add('is-dragging');
    });
    svg.addEventListener('pointermove', event => {
        if (!passiveTreeDragState || event.pointerId !== passiveTreeDragState.pointerId) return;
        const rect = svg.getBoundingClientRect();
        passiveTreeView.x = passiveTreeDragState.view.x - (event.clientX - passiveTreeDragState.clientX) * passiveTreeDragState.view.width / Math.max(1, rect.width);
        passiveTreeView.y = passiveTreeDragState.view.y - (event.clientY - passiveTreeDragState.clientY) * passiveTreeDragState.view.height / Math.max(1, rect.height);
        svg.setAttribute('viewBox', `${passiveTreeView.x} ${passiveTreeView.y} ${passiveTreeView.width} ${passiveTreeView.height}`);
    });
    const stopDrag = event => {
        if (passiveTreeDragState && event.pointerId === passiveTreeDragState.pointerId) {
            passiveTreeDragState = null;
            svg.classList.remove('is-dragging');
        }
    };
    svg.addEventListener('pointerup', stopDrag);
    svg.addEventListener('pointercancel', stopDrag);
    svg.addEventListener('wheel', event => {
        event.preventDefault();
        const rect = svg.getBoundingClientRect();
        const ratioX = (event.clientX - rect.left) / Math.max(1, rect.width);
        const ratioY = (event.clientY - rect.top) / Math.max(1, rect.height);
        const multiplier = event.deltaY > 0 ? 1.12 : 0.88;
        const nextWidth = Math.min(3200, Math.max(700, passiveTreeView.width * multiplier));
        const nextHeight = Math.min(3200, Math.max(700, passiveTreeView.height * multiplier));
        passiveTreeView.x += (passiveTreeView.width - nextWidth) * ratioX;
        passiveTreeView.y += (passiveTreeView.height - nextHeight) * ratioY;
        passiveTreeView.width = nextWidth;
        passiveTreeView.height = nextHeight;
        svg.setAttribute('viewBox', `${passiveTreeView.x} ${passiveTreeView.y} ${passiveTreeView.width} ${passiveTreeView.height}`);
    }, { passive: false });
}

function displayPassivesScreen() {
    ensurePlayerPassiveTreeState();
    const screen = document.getElementById('passives-screen');
    if (!screen) return;
    const validation = validatePassiveTree();
    if (!validation.valid) throw new TypeError(`Invalid passive tree: ${validation.errors.join('; ')}`);
    screen.innerHTML = `
        <div class="passive-tree-header">
            <div>
                <div class="passive-tree-kicker">Neural Constellation</div>
                <h2>Passive Tree</h2>
                <div id="passive-tree-summary" class="passive-tree-summary"></div>
            </div>
            <div class="passive-tree-points">
                <span>Available</span><strong>${Math.max(0, player.passivePoints)}</strong>
                <span>Allocated</span><strong>${getAllocatedPassivePointCount()}</strong>
            </div>
        </div>
        <div class="passive-tree-toolbar">
            <input id="passive-tree-search" type="search" placeholder="Search nodes, effects, or sectors…" value="${escapePassiveHTML(passiveTreeSearch)}" aria-label="Search passive tree">
            <button id="passive-zoom-in" aria-label="Zoom in">+</button>
            <button id="passive-zoom-out" aria-label="Zoom out">−</button>
            <button id="passive-center-tree">Center</button>
            <button id="passive-refund-all" class="danger" ${getAllocatedPassivePointCount() <= 0 ? 'disabled' : ''}>Refund All</button>
        </div>
        <div class="passive-tree-instructions">Drag to pan · Wheel to zoom · Double-click to allocate · Right-click to refund</div>
        <div class="passive-tree-layout">
            <div class="passive-tree-viewport">
                <svg id="passive-tree-svg" xmlns="http://www.w3.org/2000/svg" aria-label="Seven-sector passive tree"></svg>
            </div>
            <aside id="passive-node-details" class="passive-node-details"></aside>
        </div>`;

    renderPassiveTreeGraph();
    renderPassiveNodeDetails();
    renderPassiveTreeSummary();
    bindPassiveTreeInteractions();
    screen.querySelector('#passive-tree-search')?.addEventListener('input', event => {
        passiveTreeSearch = event.target.value.trim();
        renderPassiveTreeGraph();
    });
    screen.querySelector('#passive-zoom-in')?.addEventListener('click', () => changePassiveTreeZoom(0.82));
    screen.querySelector('#passive-zoom-out')?.addEventListener('click', () => changePassiveTreeZoom(1.22));
    screen.querySelector('#passive-center-tree')?.addEventListener('click', centerPassiveTreeView);
    screen.querySelector('#passive-refund-all')?.addEventListener('click', refundAllPassiveNodes);
}

function refreshPassivesScreen() {
    resetGearPassiveBonuses();
    displayPassivesScreen();
}

function openPassivesScreen() {
    showScreen('passives-screen');
}

ensurePlayerPassiveTreeState();
window.refreshPassivesScreen = refreshPassivesScreen;
window.openPassivesScreen = openPassivesScreen;
window.displayPassivesScreen = displayPassivesScreen;
window.applyAllPassivesToPlayer = applyAllPassivesToPlayer;
window.investPassiveNode = investPassiveNode;
window.refundPassiveNode = refundPassiveNode;
window.refundAllPassiveNodes = refundAllPassiveNodes;
