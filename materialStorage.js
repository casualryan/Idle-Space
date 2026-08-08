// Dedicated, slotless material storage. Material names are the stable keys used
// by recipes, loot, gathering, saves, and the fixed-position inventory UI.

const MATERIAL_STORAGE_CAP = 50000;

const MATERIAL_STORAGE_GROUPS = Object.freeze([
    Object.freeze({
        id: 'raw-salvage',
        label: 'Raw Salvage & Alloys',
        description: 'Ore, bulk salvage, plates, and unfinished alloys.',
        materials: Object.freeze([
            'Scrap Metal',
            'Iron Ore',
            'Copper Ore',
            'Titanium',
            'Pristine Metal Plate',
            'Pure Iron Nugget',
            'Copper Vein Sample',
            'Titanium Alloy Fragment',
            'Titanium Plating',
            'Advanced Alloy'
        ])
    }),
    Object.freeze({
        id: 'mechanical',
        label: 'Mechanical Components',
        description: 'Fasteners, servos, weapon parts, and fabrication hardware.',
        materials: Object.freeze([
            'Metal Fasteners',
            'Basic Servo',
            'Advanced Servo',
            'Spider Leg Segment',
            'Titanium Thorn',
            'Metal Scorpion Fang',
            'Stabilizer',
            'Partical Fuser',
            'Advanced Barrel',
            'Precision Mechanism',
            'Enhanced Cutting Edge'
        ])
    }),
    Object.freeze({
        id: 'electronics',
        label: 'Electronics & Power',
        description: 'Circuits, sensors, processors, converters, and power systems.',
        materials: Object.freeze([
            'Wire Bundle',
            'Minor Electronic Circuit',
            'Advanced Electronic Circuit',
            'Copper Coil',
            'Small Power Cell',
            'High-Density Power Cell',
            'Memory Chip',
            'Optic Sensor',
            'Basic Sensor Array',
            'Targeting Module',
            'Power Converter',
            'Neural Processor',
            'Neural Network Module',
            'AI Core Fragment',
            'Quantum Capacitor',
            'Phase Converter'
        ])
    }),
    Object.freeze({
        id: 'exotic',
        label: 'Elemental & Exotic Matter',
        description: 'Reactive, biological, phase, and endgame matter.',
        materials: Object.freeze([
            'Unstable Photon',
            'Crystalized Light',
            'Flame Shell',
            'Pyro Core',
            'Synthetic Poison Gland',
            'Synthetic Biofluid',
            'Toxic Residue',
            'Corrosive Fluid',
            'Cryo Cell',
            'Unstable Phase Core',
            'Quantum Core',
            'Temporal Stabilizer',
            'Nanite Cluster',
            'Flux Crystal'
        ])
    })
]);

const MATERIAL_STORAGE_NAMES = Object.freeze(MATERIAL_STORAGE_GROUPS.flatMap(group => group.materials));
const MATERIAL_STORAGE_NAME_SET = new Set(MATERIAL_STORAGE_NAMES);

window.materialInventory = window.materialInventory && typeof window.materialInventory === 'object'
    ? window.materialInventory
    : {};

function normalizeMaterialStorage(source = {}) {
    const normalized = {};
    MATERIAL_STORAGE_NAMES.forEach(name => {
        const value = Math.floor(Number(source?.[name]) || 0);
        if (value > 0) normalized[name] = Math.min(MATERIAL_STORAGE_CAP, value);
    });
    return normalized;
}

function isMaterialName(itemName) {
    return MATERIAL_STORAGE_NAME_SET.has(itemName);
}

function isMaterialItem(item) {
    return Boolean(item && (item.type === 'Material' || isMaterialName(item.name)));
}

function getMaterialQuantity(itemName) {
    if (!isMaterialName(itemName)) return 0;
    return Math.max(0, Math.min(MATERIAL_STORAGE_CAP, Math.floor(Number(window.materialInventory?.[itemName]) || 0)));
}

function addMaterialToStorage(itemOrName, quantity = null) {
    const itemName = typeof itemOrName === 'string' ? itemOrName : itemOrName?.name;
    if (!isMaterialName(itemName)) return false;
    const amount = Math.max(0, Math.floor(Number(quantity ?? itemOrName?.quantity ?? 1) || 0));
    if (amount <= 0) return true;
    const next = Math.min(MATERIAL_STORAGE_CAP, getMaterialQuantity(itemName) + amount);
    if (next > 0) window.materialInventory[itemName] = next;
    return true;
}

function removeMaterialFromStorage(itemName, quantity = 1) {
    if (!isMaterialName(itemName)) return false;
    const amount = Math.max(0, Math.floor(Number(quantity) || 0));
    if (amount <= 0) return true;
    const current = getMaterialQuantity(itemName);
    if (current < amount) return false;
    const next = current - amount;
    if (next > 0) window.materialInventory[itemName] = next;
    else delete window.materialInventory[itemName];
    return true;
}

function migrateLooseMaterialsToStorage(items = window.inventory) {
    if (!Array.isArray(items)) return [];
    const ordinaryItems = [];
    items.forEach(item => {
        if (isMaterialItem(item)) addMaterialToStorage(item, item.quantity);
        else if (item) ordinaryItems.push(item);
    });
    return ordinaryItems;
}

function getMaterialTemplate(itemName) {
    return (window.materials || []).find(material => material.name === itemName) || null;
}

function getMaterialDropSourceRows(itemName, limit = 4) {
    const poolRegistry = typeof LOOT_POOLS !== 'undefined' ? LOOT_POOLS : {};
    const matchingPools = new Set(Object.entries(poolRegistry)
        .filter(([, pool]) => pool?.items?.some(entry => entry.itemName === itemName))
        .map(([poolName]) => poolName));
    if (matchingPools.size === 0) return [];

    const enemyRegistry = new Map((window.enemies || []).map(enemy => [enemy.name, enemy]));
    const locationRegistry = typeof locations !== 'undefined' ? locations : [];
    const rows = [];
    const seen = new Set();
    const orderedLocations = locationRegistry.slice().sort((a, b) =>
        Number(a.recommendedLevel || 1) - Number(b.recommendedLevel || 1)
    );

    for (const location of orderedLocations) {
        for (const spawn of location.enemies || []) {
            const enemy = enemyRegistry.get(spawn.name);
            const pools = Object.values(enemy?.lootConfig?.poolsByTier || {}).flat();
            if (!pools.some(poolName => matchingPools.has(poolName))) continue;
            const key = `${spawn.name}|${location.name}`;
            if (seen.has(key)) continue;
            seen.add(key);
            rows.push({ enemy: spawn.name, location: location.name });
            if (rows.length >= limit) return rows;
        }
    }
    return rows;
}

function escapeMaterialTooltipText(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function getMaterialStorageTooltipContent(itemName, groupLabel) {
    const quantity = getMaterialQuantity(itemName);
    const acquisition = window.MATERIAL_ACQUISITION?.[itemName];
    const dropRows = getMaterialDropSourceRows(itemName);
    const safeName = escapeMaterialTooltipText(itemName);
    const safeGroup = escapeMaterialTooltipText(groupLabel);
    const count = quantity.toLocaleString();
    let content = `<div class="material-tooltip-content">`;
    content += `<div class="material-tooltip-title">${safeName}</div>`;
    content += `<div class="material-tooltip-meta"><span>${safeGroup}</span><strong>${count} / ${MATERIAL_STORAGE_CAP.toLocaleString()}</strong></div>`;

    if (acquisition?.source) {
        content += `<div class="material-tooltip-section"><div class="material-tooltip-heading">Earliest known source</div>`;
        content += `<div>${escapeMaterialTooltipText(acquisition.source)} <span class="material-tooltip-level">(Level ${Math.max(1, Number(acquisition.level) || 1)}+)</span></div></div>`;
    }

    content += `<div class="material-tooltip-section"><div class="material-tooltip-heading">Known enemy drops</div>`;
    if (dropRows.length > 0) {
        content += dropRows.map(row => `<div class="material-tooltip-source"><span>${escapeMaterialTooltipText(row.enemy)}</span><small>${escapeMaterialTooltipText(row.location)}</small></div>`).join('');
    } else {
        content += `<div class="material-tooltip-muted">No enemy drop has been documented. Check gathering or fabrication sources above.</div>`;
    }
    content += `</div></div>`;
    return content;
}

function updateMaterialInventoryDisplay() {
    const groupsContainer = document.getElementById('material-inventory-groups');
    if (!groupsContainer) return;
    groupsContainer.innerHTML = '';

    MATERIAL_STORAGE_GROUPS.forEach(group => {
        const section = document.createElement('section');
        section.className = 'material-storage-group';
        section.dataset.materialGroup = group.id;

        const heading = document.createElement('div');
        heading.className = 'material-storage-group-heading';
        heading.innerHTML = `<div><h4>${group.label}</h4><p>${group.description}</p></div><span>${group.materials.length} fixed slots</span>`;
        section.appendChild(heading);

        const grid = document.createElement('ul');
        grid.className = 'material-storage-grid';
        grid.style.setProperty('--material-slot-count', String(group.materials.length));

        group.materials.forEach((itemName, index) => {
            const template = getMaterialTemplate(itemName);
            const quantity = getMaterialQuantity(itemName);
            const slot = document.createElement('li');
            slot.className = `material-storage-slot${quantity > 0 ? ' is-owned' : ' is-empty'}`;
            slot.dataset.materialName = itemName;
            slot.dataset.materialSlot = String(index + 1);
            slot.setAttribute('data-has-tooltip', 'true');
            slot.setAttribute('data-tooltip-source', 'material-storage');
            slot.setAttribute('data-tooltip-content', getMaterialStorageTooltipContent(itemName, group.label));
            slot.setAttribute('aria-label', `${itemName}: ${quantity.toLocaleString()}`);

            const icon = document.createElement('img');
            icon.src = template?.icon || 'icons/default-icon.png';
            icon.alt = itemName;
            slot.appendChild(icon);

            const badge = document.createElement('div');
            badge.className = 'material-quantity-badge';
            badge.textContent = quantity > 0 ? quantity.toLocaleString() : '0';
            slot.appendChild(badge);
            grid.appendChild(slot);
        });

        section.appendChild(grid);
        groupsContainer.appendChild(section);
    });
}

window.MATERIAL_STORAGE_CAP = MATERIAL_STORAGE_CAP;
window.MATERIAL_STORAGE_GROUPS = MATERIAL_STORAGE_GROUPS;
window.getMaterialQuantity = getMaterialQuantity;
window.addMaterialToStorage = addMaterialToStorage;
window.removeMaterialFromStorage = removeMaterialFromStorage;
window.normalizeMaterialStorage = normalizeMaterialStorage;
window.migrateLooseMaterialsToStorage = migrateLooseMaterialsToStorage;
window.getMaterialDropSourceRows = getMaterialDropSourceRows;
window.getMaterialStorageTooltipContent = getMaterialStorageTooltipContent;
window.updateMaterialInventoryDisplay = updateMaterialInventoryDisplay;
