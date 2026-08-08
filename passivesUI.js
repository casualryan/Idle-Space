// Interactive renderer and allocation controller for the Corebound radial passive tree.

if (!player.passiveAllocations) player.passiveAllocations = {};
if (!Number.isFinite(Number(player.passivePoints))) player.passivePoints = 2;
if (!player.gearPassiveBonuses) player.gearPassiveBonuses = {};
if (!player.passiveBonuses) player.passiveBonuses = createEmptyPassiveBonuses();

let selectedPassiveNodeId = PASSIVE_TREE_ORIGIN_ID;
let passiveTreeSearch = '';
function getPassiveTreeHomeView() {
    const bounds = PASSIVE_TREE.bounds || { x: -4650, y: -4650, width: 9300, height: 9300 };
    const size = Math.max(bounds.width, bounds.height) * 1.025;
    return {
        x: bounds.x + (bounds.width - size) / 2,
        y: bounds.y + (bounds.height - size) / 2,
        width: size,
        height: size
    };
}
let passiveTreeView = getPassiveTreeHomeView();
let passiveTreeDragState = null;
let passiveTreeHoveredNodeId = null;
let passiveTreeRenderer = null;
let passiveTreePendingView = null;
let passiveTreeViewFrame = 0;
let passiveTooltipFrame = 0;
let passiveTooltipPointer = null;
let passiveTooltipMetrics = null;
let passiveTreeSearchTimer = 0;
let passiveTreeSearchMatches = null;
let passiveTreeSearchIndex = null;
let passiveTreeValidation = null;

const PASSIVE_SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const PASSIVE_TREE_SEARCH_DELAY_MS = 140;
const PASSIVE_TREE_RENDER_BUFFER = 0.24;
const PASSIVE_TREE_OVERVIEW_THRESHOLD = 0.62;
const PASSIVE_TREE_CLOSE_THRESHOLD = 0.24;
const PASSIVE_TREE_OVERVIEW_TYPES = new Set(['origin', 'gateway', 'travel', 'bridge', 'notable', 'keystone']);

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
        const recoveredPoints = Math.max(0, Math.floor(Number(player.passivePoints) || 0)) + refund;
        const progressionFloor = Math.max(2, Math.floor(Number(player.level) || 1) * 2);
        player.passivePoints = Math.max(recoveredPoints, progressionFloor);
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

function getPassiveTreeSearchIndex() {
    if (passiveTreeSearchIndex) return passiveTreeSearchIndex;
    passiveTreeSearchIndex = new Map(passives.map(node => [
        node.id,
        `${node.name} ${node.description} ${node.sector} ${node.type} ${getPassiveEffectLines(node).join(' ')}`.toLowerCase()
    ]));
    return passiveTreeSearchIndex;
}

function updatePassiveTreeSearchMatches() {
    const query = passiveTreeSearch.trim().toLowerCase();
    passiveTreeSearchMatches = query
        ? new Set([...getPassiveTreeSearchIndex()].filter(([, haystack]) => haystack.includes(query)).map(([nodeId]) => nodeId))
        : null;
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
    refreshPassiveTreeDynamicState();
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
    refreshPassiveTreeDynamicState();
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
    refreshPassiveTreeDynamicState();
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
    if (passiveTreeSearchMatches) {
        classes.push(passiveTreeSearchMatches.has(node.id) ? 'is-search-match' : 'is-search-dimmed');
    }
    return classes.join(' ');
}

function getPassiveTooltipStatus(node, state) {
    if (node.id === PASSIVE_TREE_ORIGIN_ID) return 'Starting point';
    if (state.effective > 0) {
        return `Rank ${state.effective}${state.gear > 0 ? ` (+${state.gear} gear)` : ''}`;
    }
    if (state.available) return 'Available to allocate';
    return state.allocationReason || 'Not connected';
}

function renderPassiveNodeTooltipContent(node) {
    const state = getPassiveNodeState(node);
    const sector = PASSIVE_SECTOR_DEFINITIONS[node.sector];
    const effects = getPassiveEffectLines(node, Math.max(1, state.effective));
    return `
        <div class="passive-tooltip-heading">
            <div class="passive-tooltip-type">${escapePassiveHTML(node.type)}${sector ? ` · ${escapePassiveHTML(sector.label)}` : ''}</div>
            <div class="passive-tooltip-status">${escapePassiveHTML(getPassiveTooltipStatus(node, state))}</div>
        </div>
        <h4>${escapePassiveHTML(node.name)}</h4>
        <p>${escapePassiveHTML(node.description)}</p>
        <div class="passive-tooltip-effects">
            ${effects.length
                ? effects.map(line => `<div>${escapePassiveHTML(line)}</div>`).join('')
                : '<div>Starting point — no statistical bonus.</div>'}
        </div>`;
}

function hidePassiveNodeTooltip() {
    const tooltip = document.getElementById('passive-node-tooltip');
    if (!tooltip) return;
    tooltip.hidden = true;
    tooltip.removeAttribute('data-node-id');
    passiveTooltipMetrics = null;
    passiveTooltipPointer = null;
    if (passiveTooltipFrame) cancelAnimationFrame(passiveTooltipFrame);
    passiveTooltipFrame = 0;
}

function positionPassiveNodeTooltip(clientX, clientY) {
    const tooltip = document.getElementById('passive-node-tooltip');
    const viewport = tooltip?.closest('.passive-tree-viewport');
    if (!tooltip || !viewport || tooltip.hidden) return;
    if (!passiveTooltipMetrics) {
        const viewportRect = viewport.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        passiveTooltipMetrics = {
            viewportRect,
            tooltipWidth: tooltipRect.width,
            tooltipHeight: tooltipRect.height
        };
    }
    const { viewportRect, tooltipWidth, tooltipHeight } = passiveTooltipMetrics;
    const gap = 14;
    const margin = 8;
    const pointerX = clientX - viewportRect.left;
    const pointerY = clientY - viewportRect.top;
    let left = pointerX + gap;
    let top = pointerY + gap;
    if (left + tooltipWidth > viewportRect.width - margin) left = pointerX - tooltipWidth - gap;
    if (top + tooltipHeight > viewportRect.height - margin) top = pointerY - tooltipHeight - gap;
    tooltip.style.left = `${Math.max(margin, Math.min(left, viewportRect.width - tooltipWidth - margin))}px`;
    tooltip.style.top = `${Math.max(margin, Math.min(top, viewportRect.height - tooltipHeight - margin))}px`;
}

function schedulePassiveNodeTooltipPosition(clientX, clientY) {
    passiveTooltipPointer = { clientX, clientY };
    if (passiveTooltipFrame) return;
    passiveTooltipFrame = requestAnimationFrame(() => {
        passiveTooltipFrame = 0;
        if (!passiveTooltipPointer) return;
        positionPassiveNodeTooltip(passiveTooltipPointer.clientX, passiveTooltipPointer.clientY);
    });
}

function showPassiveNodeTooltip(nodeId, clientX, clientY) {
    const tooltip = document.getElementById('passive-node-tooltip');
    const node = getPassiveNode(nodeId);
    if (!tooltip || !node) return;
    tooltip.className = `passive-node-tooltip sector-${node.sector}`;
    tooltip.dataset.nodeId = node.id;
    tooltip.innerHTML = renderPassiveNodeTooltipContent(node);
    tooltip.hidden = false;
    passiveTooltipMetrics = null;
    positionPassiveNodeTooltip(clientX, clientY);
}

function showPassiveNodeTooltipAtElement(nodeId, element) {
    const rect = element.getBoundingClientRect();
    showPassiveNodeTooltip(nodeId, rect.right, rect.top + rect.height / 2);
}

function createPassiveSvgElement(tagName, attributes = {}) {
    const element = document.createElementNS(PASSIVE_SVG_NAMESPACE, tagName);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
    return element;
}

function initializePassiveTreeRenderer(svg) {
    if (passiveTreeRenderer?.resizeObserver) passiveTreeRenderer.resizeObserver.disconnect();
    const clustersLayer = createPassiveSvgElement('g', { class: 'passive-tree-clusters' });
    const edgesLayer = createPassiveSvgElement('g', { class: 'passive-tree-edges' });
    const labelsLayer = createPassiveSvgElement('g', { class: 'passive-tree-labels' });
    const nodesLayer = createPassiveSvgElement('g', { class: 'passive-tree-nodes' });
    const edgePaths = {
        inactive: createPassiveSvgElement('path', { class: 'passive-tree-edge is-inactive' }),
        available: createPassiveSvgElement('path', { class: 'passive-tree-edge is-available' }),
        active: createPassiveSvgElement('path', { class: 'passive-tree-edge is-active' })
    };
    edgesLayer.append(edgePaths.inactive, edgePaths.available, edgePaths.active);
    svg.replaceChildren(clustersLayer, edgesLayer, labelsLayer, nodesLayer);
    passiveTreeRenderer = {
        svg,
        clustersLayer,
        edgesLayer,
        labelsLayer,
        nodesLayer,
        edgePaths,
        nodeElements: new Map(),
        clusterElements: new Map(),
        labelElements: new Map(),
        renderedNodeIds: new Set(),
        renderBounds: null,
        detailLevel: null,
        viewportRect: null,
        resizeObserver: null
    };
    if (typeof ResizeObserver === 'function') {
        passiveTreeRenderer.resizeObserver = new ResizeObserver(() => {
            if (!passiveTreeRenderer || passiveTreeRenderer.svg !== svg) return;
            passiveTreeRenderer.viewportRect = null;
            passiveTooltipMetrics = null;
        });
        passiveTreeRenderer.resizeObserver.observe(svg);
    }
}

function getPassiveTreeDetailLevel(view = passiveTreePendingView || passiveTreeView) {
    const home = getPassiveTreeHomeView();
    const ratio = view.width / Math.max(1, home.width);
    if (ratio >= PASSIVE_TREE_OVERVIEW_THRESHOLD) return 'overview';
    if (ratio <= PASSIVE_TREE_CLOSE_THRESHOLD) return 'close';
    return 'medium';
}

function getPassiveTreeRenderBounds(view) {
    const padX = view.width * PASSIVE_TREE_RENDER_BUFFER;
    const padY = view.height * PASSIVE_TREE_RENDER_BUFFER;
    return {
        x: view.x - padX,
        y: view.y - padY,
        width: view.width + padX * 2,
        height: view.height + padY * 2
    };
}

function passiveTreeBoundsContainView(bounds, view) {
    return Boolean(bounds)
        && view.x >= bounds.x
        && view.y >= bounds.y
        && view.x + view.width <= bounds.x + bounds.width
        && view.y + view.height <= bounds.y + bounds.height;
}

function isPassivePointInsideBounds(x, y, bounds, margin = 0) {
    return x + margin >= bounds.x
        && y + margin >= bounds.y
        && x - margin <= bounds.x + bounds.width
        && y - margin <= bounds.y + bounds.height;
}

function getPassiveNodeRadius(node) {
    if (node.type === 'origin') return 34;
    if (node.type === 'keystone') return 30;
    if (node.type === 'notable') return 23;
    if (node.type === 'gateway') return 20;
    return ['travel', 'bridge'].includes(node.type) ? 9 : 12;
}

function getPassiveTreeManualActiveSet() {
    return new Set([
        PASSIVE_TREE_ORIGIN_ID,
        ...Object.keys(normalizePassiveAllocations(player.passiveAllocations))
    ]);
}

function getPassiveGraphNodeState(node, manuallyActive) {
    const allocated = manuallyActive.has(node.id);
    const gear = getPassiveNodeGearRank(node.id);
    const effective = (allocated && node.id !== PASSIVE_TREE_ORIGIN_ID ? 1 : 0)
        + (node.gearScalable ? gear : 0);
    return {
        allocated,
        gear,
        effective,
        active: node.id === PASSIVE_TREE_ORIGIN_ID || effective > 0,
        connected: allocated,
        available: node.id !== PASSIVE_TREE_ORIGIN_ID
            && !allocated
            && player.passivePoints > 0
            && node.connections.some(connection => manuallyActive.has(connection))
    };
}

function isPassivePriorityNode(node, manuallyActive) {
    return node.id === selectedPassiveNodeId
        || manuallyActive.has(node.id)
        || getPassiveNodeGearRank(node.id) > 0
        || Boolean(passiveTreeSearchMatches?.has(node.id))
        || node.connections.some(connection => manuallyActive.has(connection));
}

function getOrCreatePassiveNodeElement(node) {
    const cached = passiveTreeRenderer.nodeElements.get(node.id);
    if (cached) return cached;
    const radius = getPassiveNodeRadius(node);
    const element = createPassiveSvgElement('g', {
        'data-node-id': node.id,
        transform: `translate(${node.x} ${node.y})`,
        role: 'button',
        tabindex: '0',
        'aria-label': node.name
    });
    const circle = createPassiveSvgElement('circle', { r: radius });
    element.append(circle);
    if (node.type === 'keystone') {
        element.append(createPassiveSvgElement('path', { d: 'M -13 0 L 0 -13 L 13 0 L 0 13 Z' }));
    }
    const gearLabel = createPassiveSvgElement('text', {
        class: 'passive-node-gear',
        x: radius - 3,
        y: -radius + 7,
        display: 'none'
    });
    element.append(gearLabel);
    const entry = { element, gearLabel };
    passiveTreeRenderer.nodeElements.set(node.id, entry);
    return entry;
}

function updatePassiveTreeNodeElementState(nodeId, manuallyActive = getPassiveTreeManualActiveSet()) {
    const node = getPassiveNode(nodeId);
    const entry = passiveTreeRenderer?.nodeElements.get(nodeId);
    if (!node || !entry) return;
    const state = getPassiveGraphNodeState(node, manuallyActive);
    entry.element.setAttribute('class', getPassiveNodeClasses(node, state));
    entry.element.setAttribute('aria-pressed', state.active ? 'true' : 'false');
    if (state.gear > 0) entry.gearLabel.removeAttribute('display');
    else entry.gearLabel.setAttribute('display', 'none');
    entry.gearLabel.textContent = state.gear > 0 ? `+${state.gear}` : '';
}

function getOrCreatePassiveClusterElement(cluster) {
    let element = passiveTreeRenderer.clusterElements.get(cluster.id);
    if (element) return element;
    element = createPassiveSvgElement('circle', {
        class: `passive-tree-cluster sector-${cluster.sector}${cluster.specialist ? ' is-specialist' : ''}`,
        cx: cluster.x,
        cy: cluster.y,
        r: cluster.radius
    });
    passiveTreeRenderer.clusterElements.set(cluster.id, element);
    return element;
}

function getOrCreatePassiveSectorLabel(sectorId) {
    let element = passiveTreeRenderer.labelElements.get(sectorId);
    if (element) return element;
    const sector = PASSIVE_SECTOR_DEFINITIONS[sectorId];
    const position = passivePolarPosition(4550, sector.angle);
    element = createPassiveSvgElement('text', {
        class: `passive-sector-label sector-${sectorId}`,
        x: position.x,
        y: position.y
    });
    element.textContent = sector.label;
    passiveTreeRenderer.labelElements.set(sectorId, element);
    return element;
}

function renderPassiveTreeEdgePaths(manuallyActive, visibleNodeIds) {
    const pathParts = { inactive: [], available: [], active: [] };
    for (const edge of PASSIVE_TREE.edges) {
        const from = getPassiveNode(edge.from);
        const to = getPassiveNode(edge.to);
        const bothVisible = visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to);
        const overviewRoute = passiveTreeRenderer.detailLevel === 'overview'
            && isPassivePointInsideBounds(from.x, from.y, passiveTreeRenderer.renderBounds)
            && isPassivePointInsideBounds(to.x, to.y, passiveTreeRenderer.renderBounds)
            && ((visibleNodeIds.has(from.id) && PASSIVE_TREE_OVERVIEW_TYPES.has(from.type))
                || (visibleNodeIds.has(to.id) && PASSIVE_TREE_OVERVIEW_TYPES.has(to.type)));
        if (!bothVisible && !overviewRoute) continue;
        const active = manuallyActive.has(from.id) && manuallyActive.has(to.id);
        const available = active || manuallyActive.has(from.id) || manuallyActive.has(to.id);
        const category = active ? 'active' : available ? 'available' : 'inactive';
        pathParts[category].push(`M${from.x} ${from.y}L${to.x} ${to.y}`);
    }
    for (const [category, path] of Object.entries(passiveTreeRenderer.edgePaths)) {
        path.setAttribute('d', pathParts[category].join(''));
    }
}

function rebuildPassiveTreeVisibleContent(view, detailLevel, manuallyActive) {
    const bounds = getPassiveTreeRenderBounds(view);
    const visibleNodeIds = new Set();
    const nodeFragment = document.createDocumentFragment();
    for (const node of passives) {
        if (!isPassivePointInsideBounds(node.x, node.y, bounds, getPassiveNodeRadius(node))) continue;
        const priority = isPassivePriorityNode(node, manuallyActive);
        if (detailLevel === 'overview' && !PASSIVE_TREE_OVERVIEW_TYPES.has(node.type) && !priority) continue;
        visibleNodeIds.add(node.id);
        const entry = getOrCreatePassiveNodeElement(node);
        updatePassiveTreeNodeElementState(node.id, manuallyActive);
        nodeFragment.append(entry.element);
    }
    passiveTreeRenderer.nodesLayer.replaceChildren(nodeFragment);

    const clusterFragment = document.createDocumentFragment();
    for (const cluster of PASSIVE_TREE.clusters || []) {
        if (isPassivePointInsideBounds(cluster.x, cluster.y, bounds, cluster.radius)) {
            clusterFragment.append(getOrCreatePassiveClusterElement(cluster));
        }
    }
    passiveTreeRenderer.clustersLayer.replaceChildren(clusterFragment);

    const labelFragment = document.createDocumentFragment();
    for (const sectorId of PASSIVE_TREE_SECTOR_ORDER) {
        const sector = PASSIVE_SECTOR_DEFINITIONS[sectorId];
        const position = passivePolarPosition(4550, sector.angle);
        if (isPassivePointInsideBounds(position.x, position.y, bounds, 100)) {
            labelFragment.append(getOrCreatePassiveSectorLabel(sectorId));
        }
    }
    passiveTreeRenderer.labelsLayer.replaceChildren(labelFragment);
    passiveTreeRenderer.renderedNodeIds = visibleNodeIds;
    passiveTreeRenderer.renderBounds = bounds;
    passiveTreeRenderer.detailLevel = detailLevel;
    renderPassiveTreeEdgePaths(manuallyActive, visibleNodeIds);
}

function renderPassiveTreeGraph({ forceVisibility = false, forceState = false } = {}) {
    const svg = document.getElementById('passive-tree-svg');
    if (!svg) return;
    if (!passiveTreeRenderer || passiveTreeRenderer.svg !== svg) initializePassiveTreeRenderer(svg);
    const view = passiveTreePendingView || passiveTreeView;
    const detailLevel = getPassiveTreeDetailLevel(view);
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
    svg.dataset.detail = detailLevel;
    const manuallyActive = getPassiveTreeManualActiveSet();
    const visibilityChanged = forceVisibility
        || passiveTreeRenderer.detailLevel !== detailLevel
        || !passiveTreeBoundsContainView(passiveTreeRenderer.renderBounds, view);
    if (visibilityChanged) {
        rebuildPassiveTreeVisibleContent(view, detailLevel, manuallyActive);
    } else if (forceState) {
        for (const nodeId of passiveTreeRenderer.renderedNodeIds) {
            updatePassiveTreeNodeElementState(nodeId, manuallyActive);
        }
        renderPassiveTreeEdgePaths(manuallyActive, passiveTreeRenderer.renderedNodeIds);
    }
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
    const currentView = passiveTreePendingView || passiveTreeView;
    const home = getPassiveTreeHomeView();
    const nextWidth = Math.min(home.width, Math.max(650, currentView.width * multiplier));
    const nextHeight = Math.min(home.height, Math.max(650, currentView.height * multiplier));
    schedulePassiveTreeView({
        x: currentView.x + (currentView.width - nextWidth) / 2,
        y: currentView.y + (currentView.height - nextHeight) / 2,
        width: nextWidth,
        height: nextHeight
    });
}

function centerPassiveTreeView() {
    schedulePassiveTreeView(getPassiveTreeHomeView());
}

function schedulePassiveTreeView(nextView) {
    passiveTreePendingView = nextView;
    if (passiveTreeViewFrame) return;
    passiveTreeViewFrame = requestAnimationFrame(() => {
        passiveTreeViewFrame = 0;
        if (!passiveTreePendingView) return;
        passiveTreeView = passiveTreePendingView;
        passiveTreePendingView = null;
        renderPassiveTreeGraph();
    });
}

function getPassiveTreeViewportRect(svg, refresh = false) {
    if (!passiveTreeRenderer || passiveTreeRenderer.svg !== svg) return svg.getBoundingClientRect();
    if (refresh || !passiveTreeRenderer.viewportRect) {
        passiveTreeRenderer.viewportRect = svg.getBoundingClientRect();
    }
    return passiveTreeRenderer.viewportRect;
}

function bindPassiveTreeInteractions() {
    const svg = document.getElementById('passive-tree-svg');
    if (!svg || svg.dataset.interactionsBound === 'true') return;
    svg.dataset.interactionsBound = 'true';
    const getNodeElement = target => target?.closest?.('[data-node-id]');
    const selectNode = nodeId => {
        const previousNodeId = selectedPassiveNodeId;
        selectedPassiveNodeId = nodeId;
        passiveTreeHoveredNodeId = null;
        hidePassiveNodeTooltip();
        const manuallyActive = getPassiveTreeManualActiveSet();
        updatePassiveTreeNodeElementState(previousNodeId, manuallyActive);
        updatePassiveTreeNodeElementState(nodeId, manuallyActive);
        renderPassiveNodeDetails();
    };
    svg.addEventListener('pointerover', event => {
        const element = getNodeElement(event.target);
        if (!element || element.dataset.nodeId === passiveTreeHoveredNodeId) return;
        passiveTreeHoveredNodeId = element.dataset.nodeId;
        showPassiveNodeTooltip(passiveTreeHoveredNodeId, event.clientX, event.clientY);
    });
    svg.addEventListener('pointerout', event => {
        const element = getNodeElement(event.target);
        if (!element || element.contains(event.relatedTarget)) return;
        passiveTreeHoveredNodeId = null;
        hidePassiveNodeTooltip();
    });
    svg.addEventListener('focusin', event => {
        const element = getNodeElement(event.target);
        if (element) showPassiveNodeTooltipAtElement(element.dataset.nodeId, element);
    });
    svg.addEventListener('focusout', event => {
        if (getNodeElement(event.target)) hidePassiveNodeTooltip();
    });
    svg.addEventListener('click', event => {
        const element = getNodeElement(event.target);
        if (element) { event.stopPropagation(); selectNode(element.dataset.nodeId); }
    });
    svg.addEventListener('dblclick', event => {
        const element = getNodeElement(event.target);
        if (element) { event.preventDefault(); event.stopPropagation(); investPassiveNode(element.dataset.nodeId); }
    });
    svg.addEventListener('contextmenu', event => {
        const element = getNodeElement(event.target);
        if (element) { event.preventDefault(); event.stopPropagation(); refundPassiveNode(element.dataset.nodeId); }
    });
    svg.addEventListener('keydown', event => {
        const element = getNodeElement(event.target);
        if (element && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            selectNode(element.dataset.nodeId);
        }
    });
    svg.addEventListener('pointerdown', event => {
        const element = getNodeElement(event.target);
        if (element) {
            if (event.pointerType !== 'mouse') showPassiveNodeTooltipAtElement(element.dataset.nodeId, element);
            return;
        }
        if (event.button !== 0) return;
        const view = passiveTreePendingView || passiveTreeView;
        const rect = getPassiveTreeViewportRect(svg, true);
        passiveTreeDragState = {
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
            rect,
            view: { ...view }
        };
        svg.setPointerCapture?.(event.pointerId);
        svg.classList.add('is-dragging');
        hidePassiveNodeTooltip();
    });
    svg.addEventListener('pointermove', event => {
        if (passiveTreeHoveredNodeId) schedulePassiveNodeTooltipPosition(event.clientX, event.clientY);
        if (!passiveTreeDragState || event.pointerId !== passiveTreeDragState.pointerId) return;
        const { rect, view } = passiveTreeDragState;
        schedulePassiveTreeView({
            x: view.x - (event.clientX - passiveTreeDragState.clientX) * view.width / Math.max(1, rect.width),
            y: view.y - (event.clientY - passiveTreeDragState.clientY) * view.height / Math.max(1, rect.height),
            width: view.width,
            height: view.height
        });
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
        const rect = getPassiveTreeViewportRect(svg);
        const ratioX = (event.clientX - rect.left) / Math.max(1, rect.width);
        const ratioY = (event.clientY - rect.top) / Math.max(1, rect.height);
        const multiplier = Math.exp(Math.max(-160, Math.min(160, event.deltaY)) * 0.0015);
        const currentView = passiveTreePendingView || passiveTreeView;
        const home = getPassiveTreeHomeView();
        const nextWidth = Math.min(home.width, Math.max(650, currentView.width * multiplier));
        const nextHeight = Math.min(home.height, Math.max(650, currentView.height * multiplier));
        schedulePassiveTreeView({
            x: currentView.x + (currentView.width - nextWidth) * ratioX,
            y: currentView.y + (currentView.height - nextHeight) * ratioY,
            width: nextWidth,
            height: nextHeight
        });
    }, { passive: false });
}

function createPassiveTreeScreen(screen, validation) {
    screen.innerHTML = `
        <div class="passive-tree-header">
            <div>
                <div class="passive-tree-kicker">Neural Constellation · ${validation.nodeCount.toLocaleString()} nodes · ${validation.clusterCount} clusters</div>
                <h2>Passive Tree</h2>
                <div id="passive-tree-summary" class="passive-tree-summary"></div>
            </div>
            <div class="passive-tree-points">
                <span>Available</span><strong id="passive-tree-available-points"></strong>
                <span>Allocated</span><strong id="passive-tree-allocated-points"></strong>
            </div>
        </div>
        <div class="passive-tree-toolbar">
            <input id="passive-tree-search" type="search" placeholder="Search nodes, effects, or sectors…" value="${escapePassiveHTML(passiveTreeSearch)}" aria-label="Search passive tree">
            <button id="passive-zoom-in" aria-label="Zoom in">+</button>
            <button id="passive-zoom-out" aria-label="Zoom out">−</button>
            <button id="passive-center-tree">Center</button>
            <button id="passive-refund-all" class="danger">Refund All</button>
        </div>
        <div class="passive-tree-instructions">Drag to pan · Wheel to zoom · Double-click to allocate · Right-click to refund</div>
        <div class="passive-tree-layout">
            <div class="passive-tree-viewport">
                <svg id="passive-tree-svg" xmlns="http://www.w3.org/2000/svg" aria-label="Seven-sector passive tree"></svg>
                <div id="passive-node-tooltip" class="passive-node-tooltip" role="tooltip" hidden></div>
            </div>
            <aside id="passive-node-details" class="passive-node-details"></aside>
        </div>`;
    passiveTreeRenderer = null;
    updatePassiveTreeSearchMatches();
    initializePassiveTreeRenderer(screen.querySelector('#passive-tree-svg'));
    bindPassiveTreeInteractions();
    screen.querySelector('#passive-tree-search')?.addEventListener('input', event => {
        const query = event.target.value.trim();
        if (passiveTreeSearchTimer) clearTimeout(passiveTreeSearchTimer);
        passiveTreeSearchTimer = setTimeout(() => {
            passiveTreeSearchTimer = 0;
            if (query === passiveTreeSearch) return;
            passiveTreeSearch = query;
            updatePassiveTreeSearchMatches();
            renderPassiveTreeGraph({ forceVisibility: true, forceState: true });
        }, PASSIVE_TREE_SEARCH_DELAY_MS);
    });
    screen.querySelector('#passive-zoom-in')?.addEventListener('click', () => changePassiveTreeZoom(0.82));
    screen.querySelector('#passive-zoom-out')?.addEventListener('click', () => changePassiveTreeZoom(1.22));
    screen.querySelector('#passive-center-tree')?.addEventListener('click', centerPassiveTreeView);
    screen.querySelector('#passive-refund-all')?.addEventListener('click', refundAllPassiveNodes);
}

function renderPassiveTreePointCounters() {
    const allocated = getAllocatedPassivePointCount();
    const availableElement = document.getElementById('passive-tree-available-points');
    const allocatedElement = document.getElementById('passive-tree-allocated-points');
    const refundAllButton = document.getElementById('passive-refund-all');
    if (availableElement) availableElement.textContent = Math.max(0, player.passivePoints).toLocaleString();
    if (allocatedElement) allocatedElement.textContent = allocated.toLocaleString();
    if (refundAllButton) refundAllButton.disabled = allocated <= 0;
}

function refreshPassiveTreeDynamicState() {
    renderPassiveTreeGraph({ forceVisibility: true, forceState: true });
    renderPassiveNodeDetails();
    renderPassiveTreeSummary();
    renderPassiveTreePointCounters();
}

function displayPassivesScreen() {
    ensurePlayerPassiveTreeState();
    const screen = document.getElementById('passives-screen');
    if (!screen) return;
    if (!passiveTreeValidation) passiveTreeValidation = validatePassiveTree();
    if (!passiveTreeValidation.valid) {
        throw new TypeError(`Invalid passive tree: ${passiveTreeValidation.errors.join('; ')}`);
    }
    if (!screen.querySelector('#passive-tree-svg')) createPassiveTreeScreen(screen, passiveTreeValidation);
    refreshPassiveTreeDynamicState();
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
