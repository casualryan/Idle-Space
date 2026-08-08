// Corebound radial passive tree. The graph and effects are data-driven so the
// renderer, save migration, validation, and stat pipeline share one authority.

const PASSIVE_TREE_VERSION = 2;
const PASSIVE_TREE_ORIGIN_ID = 'core-origin';
const PASSIVE_TREE_SECTOR_ORDER = Object.freeze([
    'kinetic', 'slashing', 'corrosive', 'radiation', 'electric', 'cryo', 'pyro'
]);

const PASSIVE_SECTOR_DEFINITIONS = Object.freeze({
    kinetic: {
        label: 'Kinetic', angle: -90, damageType: 'kinetic', group: 'physical', resistance: 'physicalResistance',
        identity: 'Impact, reliable damage, health, and physical resistance.',
        laneNames: {
            offense: ['Kinetic Focus', 'Armorbreaker Calculus'],
            defense: ['Dense Tissue', 'Reactive Plating'],
            utility: ['Measured Force', 'Stagger Protocol']
        },
        keystones: {
            offense: { name: 'Unyielding Impact', description: 'Raise the floor of every damage roll, but reduce critical damage.', effects: { damageRollFloorBonus: 0.15, criticalMultiplier: -0.15 } },
            defense: { name: 'Mass Doctrine', description: 'Become substantially harder to kill at the cost of attack speed.', effects: { healthPercent: 18, attackSpeed: -8 } },
            utility: { name: 'Overwhelming Force', description: 'Kinetic hits apply statuses more readily, but your own evasive control suffers.', effects: { damageTypes: { kinetic: 18 }, debuffChanceBonus: 0.05, deflection: -5 } }
        }
    },
    slashing: {
        label: 'Slashing', angle: -90 + (360 / 7), damageType: 'slashing', group: 'physical', resistance: 'physicalResistance',
        identity: 'Critical strikes, wounds, damage variance, and deflection.',
        laneNames: {
            offense: ['Blade Master', 'Open Vein'],
            defense: ['Dancing Guard', 'Impossible Angle'],
            utility: ['Edge Alignment', 'Wound Cartography']
        },
        keystones: {
            offense: { name: 'Perfect Incision', description: 'Gain powerful critical scaling at the cost of maximum health.', effects: { criticalChance: 8, criticalMultiplier: 0.3, healthPercent: -8 } },
            defense: { name: 'Ghostblade Geometry', description: 'Greatly increase Deflection, but reduce maximum Energy Shield.', effects: { deflection: 18, energyShieldPercent: -12 } },
            utility: { name: 'Hemorrhagic Engine', description: 'Your damage over time is stronger while your direct hits are weaker.', effects: { dotDamageMultiplier: 0.35, directDamageMultiplier: -0.12 } }
        }
    },
    corrosive: {
        label: 'Corrosive', angle: -90 + (360 / 7) * 2, damageType: 'corrosive', group: 'chemical', resistance: 'chemicalResistance',
        identity: 'Attrition, suppression, regeneration, and persistent weakening.',
        laneNames: {
            offense: ['Solvent Pressure', 'Caustic Saturation'],
            defense: ['Adaptive Membrane', 'Reactive Antidote'],
            utility: ['Rusted Timing', 'Persistent Reagent']
        },
        keystones: {
            offense: { name: 'Patient Dissolution', description: 'Trade direct hit damage for substantially stronger damage over time.', effects: { dotDamageMultiplier: 0.4, directDamageMultiplier: -0.15 } },
            defense: { name: 'Adaptive Carapace', description: 'Gain regeneration and chemical resistance at the cost of attack speed.', effects: { healthRegen: 3, defenseTypes: { chemicalResistance: 15 }, attackSpeed: -8 } },
            utility: { name: 'Total Oxidation', description: 'Corrosive statuses apply more often and persist much longer.', effects: { debuffChanceBonus: 0.05, debuffDurationBonus: 0.5 } }
        }
    },
    radiation: {
        label: 'Radiation', angle: -90 + (360 / 7) * 3, damageType: 'radiation', group: 'chemical', resistance: 'chemicalResistance',
        identity: 'Stacking decay, reflected damage, risk, and bionic amplification.',
        laneNames: {
            offense: ['Isotope Density', 'Runaway Decay'],
            defense: ['Lead Marrow', 'Half-Life Recovery'],
            utility: ['Unstable Feedback', 'Synthetic Isotope']
        },
        keystones: {
            offense: { name: 'Event Horizon Metabolism', description: 'Massively increase damage over time, but also increase damage taken.', effects: { dotDamageMultiplier: 0.45, damageTakenReduction: -0.12 } },
            defense: { name: 'Rad-Hardened Genome', description: 'Gain health and chemical resistance while sacrificing attack speed.', effects: { healthPercent: 14, defenseTypes: { chemicalResistance: 12 }, attackSpeed: -6 } },
            utility: { name: 'Synthetic Isotope Core', description: 'Greatly amplify bionics at the cost of maximum health.', effects: { bionicSync: 25, bionicEfficiency: 10, healthPercent: -10 } }
        }
    },
    electric: {
        label: 'Electric', angle: -90 + (360 / 7) * 4, damageType: 'electric', group: 'elemental', resistance: 'elementalResistance',
        identity: 'Attack speed, critical setup, precision, and Energy Shield.',
        laneNames: {
            offense: ['Voltage Gain', 'Critical Circuit'],
            defense: ['Capacitor Skin', 'Emergency Ground'],
            utility: ['Swift Strikes', 'Discharge Timing']
        },
        keystones: {
            offense: { name: 'Live Wire', description: 'Attack and critically strike faster, but take additional damage.', effects: { attackSpeed: 15, criticalChance: 6, damageTakenReduction: -0.08 } },
            defense: { name: 'Capacitor Overflow', description: 'Greatly increase Energy Shield while reducing maximum health.', effects: { energyShieldPercent: 30, healthPercent: -12 } },
            utility: { name: 'Closed Critical Circuit', description: 'Deal more damage to debuffed targets and gain critical damage.', effects: { damageVsDebuffed: 0.2, criticalMultiplier: 0.25 } }
        }
    },
    cryo: {
        label: 'Cryo', angle: -90 + (360 / 7) * 5, damageType: 'cryo', group: 'elemental', resistance: 'elementalResistance',
        identity: 'Control, impaired-target damage, deflection, and Energy Shield.',
        laneNames: {
            offense: ['Thermal Theft', 'Brittle Fracture'],
            defense: ['Frozen Bulwark', 'Glacial Deflection'],
            utility: ['Frigid Timing', 'Heat Sink Logic']
        },
        keystones: {
            offense: { name: 'Shatter Doctrine', description: 'Deal much more damage to debuffed enemies, but less to clean targets.', effects: { damageVsDebuffed: 0.25, directDamageMultiplier: -0.05 } },
            defense: { name: 'Absolute Bulwark', description: 'Greatly increase Energy Shield at the cost of maximum health.', effects: { energyShieldPercent: 25, healthPercent: -10 } },
            utility: { name: 'Absolute Zero', description: 'Statuses persist longer, but your attack speed is reduced.', effects: { debuffDurationBonus: 0.5, attackSpeed: -10 } }
        }
    },
    pyro: {
        label: 'Pyro', angle: -90 + (360 / 7) * 6, damageType: 'pyro', group: 'elemental', resistance: 'elementalResistance',
        identity: 'Burst damage, burning, resistance stripping, and regeneration.',
        laneNames: {
            offense: ['Pyro Mastery', 'Combustion Window'],
            defense: ['Furnace Blood', 'Cauterized Tissue'],
            utility: ['Scorch Pattern', 'Ignition Control']
        },
        keystones: {
            offense: { name: 'Flashover', description: 'Increase both direct and burning damage while becoming more vulnerable.', effects: { directDamageMultiplier: 0.18, dotDamageMultiplier: 0.2, damageTakenReduction: -0.08 } },
            defense: { name: 'Furnace Heart', description: 'Gain health and regeneration while sacrificing Energy Shield.', effects: { healthPercent: 12, healthRegen: 4, energyShieldPercent: -20 } },
            utility: { name: 'Cauterizing Assault', description: 'Apply longer-lasting statuses more often, but lose Deflection.', effects: { debuffChanceBonus: 0.05, debuffDurationBonus: 0.3, deflection: -8 } }
        }
    }
});

const PASSIVE_BRIDGE_DEFINITIONS = Object.freeze([
    { sectors: ['kinetic', 'slashing'], label: 'Physical Confluence', notable: 'Physical Mastery', effects: { damageGroups: { physical: 4 }, flatHealth: 8 } },
    { sectors: ['slashing', 'corrosive'], label: 'Open-Wound Chemistry', notable: 'Septic Edge', effects: { damageTypes: { slashing: 3, corrosive: 3 }, dotDamageMultiplier: 0.02 } },
    { sectors: ['corrosive', 'radiation'], label: 'Chemical Confluence', notable: 'Chemical Mastery', effects: { damageGroups: { chemical: 4 }, defenseTypes: { chemicalResistance: 1 } } },
    { sectors: ['radiation', 'electric'], label: 'Volatile Circuitry', notable: 'Irradiated Conductor', effects: { damageTypes: { radiation: 3, electric: 3 }, bionicSync: 1 } },
    { sectors: ['electric', 'cryo'], label: 'Superconductive Shell', notable: 'Zero-Resistance Circuit', effects: { damageTypes: { electric: 3, cryo: 3 }, flatEnergyShield: 6 } },
    { sectors: ['cryo', 'pyro'], label: 'Thermal Confluence', notable: 'Thermal Mastery', effects: { damageTypes: { cryo: 3, pyro: 3 }, defenseTypes: { elementalResistance: 1 } } },
    { sectors: ['pyro', 'kinetic'], label: 'Explosive Impact', notable: 'Detonation Physics', effects: { damageTypes: { pyro: 3, kinetic: 3 }, debuffChanceBonus: 0.005 } }
]);

function passivePolarPosition(radius, degrees) {
    const radians = degrees * Math.PI / 180;
    return { x: Math.round(Math.cos(radians) * radius), y: Math.round(Math.sin(radians) * radius) };
}

function mergePassiveEffects(...sources) {
    const result = {};
    for (const source of sources) {
        for (const [key, value] of Object.entries(source || {})) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                result[key] = result[key] || {};
                for (const [nestedKey, nestedValue] of Object.entries(value)) {
                    result[key][nestedKey] = Number(result[key][nestedKey] || 0) + Number(nestedValue || 0);
                }
            } else {
                result[key] = Number(result[key] || 0) + Number(value || 0);
            }
        }
    }
    return result;
}

function getSectorLaneMinorEffects(sector, lane, depth) {
    const scale = depth >= 5 ? 1.35 : depth >= 2 ? 1.15 : 1;
    if (lane === 'offense') {
        const effects = { damageTypes: { [sector.damageType]: Math.round(4 * scale) } };
        if (depth % 3 === 1) effects.precision = Math.max(1, Math.round(2 * scale));
        if (depth % 4 === 3) effects.criticalChance = Math.max(1, Math.round(1.5 * scale));
        return effects;
    }
    if (lane === 'defense') {
        const effects = { defenseTypes: { [sector.resistance]: Math.max(1, Math.round(1.5 * scale)) } };
        if (['cryo', 'electric'].includes(sector.damageType)) effects.flatEnergyShield = Math.round(10 * scale);
        else effects.flatHealth = Math.round(14 * scale);
        if (sector.damageType === 'slashing') effects.deflection = Math.max(1, Math.round(2 * scale));
        if (['pyro', 'corrosive'].includes(sector.damageType)) effects.healthRegen = Number((0.2 * scale).toFixed(2));
        return effects;
    }
    const utilityBySector = {
        kinetic: { precision: 2, debuffChanceBonus: 0.005 },
        slashing: { criticalMultiplier: 0.03, deflection: 1 },
        corrosive: { debuffDurationBonus: 0.025, healthRegen: 0.15 },
        radiation: { bionicSync: 1.5, debuffChanceBonus: 0.005 },
        electric: { attackSpeed: 1.5, precision: 1 },
        cryo: { debuffDurationBonus: 0.025, deflection: 1 },
        pyro: { debuffChanceBonus: 0.005, healthRegen: 0.15 }
    };
    const base = utilityBySector[sector.damageType] || {};
    return Object.fromEntries(Object.entries(base).map(([key, value]) => [key, Number((value * scale).toFixed(3))]));
}

function getSectorNotableEffects(sector, lane, depth) {
    const base = getSectorLaneMinorEffects(sector, lane, depth);
    if (lane === 'offense') return mergePassiveEffects(base, { damageTypes: { [sector.damageType]: 8 }, criticalChance: 2 });
    if (lane === 'defense') return mergePassiveEffects(base, { defenseTypes: { [sector.resistance]: 4 }, healthPercent: 3, energyShieldPercent: 3 });
    return mergePassiveEffects(base, { debuffChanceBonus: 0.015, debuffDurationBonus: 0.08, precision: 2, deflection: 2 });
}

function getMinorPassiveName(sector, lane) {
    if (lane === 'offense') return `${sector.label} Damage`;
    if (lane === 'defense') return `${sector.label} Guard`;
    return `${sector.label} Technique`;
}

function createPassiveTree() {
    const nodes = [];
    const links = new Set();
    const addNode = node => nodes.push(Object.freeze({ maxRank: 1, gearScalable: node.type !== 'keystone', ...node }));
    const link = (left, right) => {
        if (!left || !right || left === right) return;
        links.add([left, right].sort().join('|'));
    };

    addNode({
        id: PASSIVE_TREE_ORIGIN_ID,
        name: 'Corebound Origin',
        description: 'Every build begins here. The origin is always active and costs no point.',
        sector: 'core', type: 'origin', x: 0, y: 0, effects: {}
    });

    const gatewayIds = {};
    PASSIVE_TREE_SECTOR_ORDER.forEach((sectorId, index) => {
        const sector = PASSIVE_SECTOR_DEFINITIONS[sectorId];
        const gatewayId = `core-${sectorId}-gateway`;
        const utilityId = `core-${sectorId}-junction`;
        gatewayIds[sectorId] = gatewayId;
        const gatewayPosition = passivePolarPosition(145, sector.angle);
        const nextSector = PASSIVE_SECTOR_DEFINITIONS[PASSIVE_TREE_SECTOR_ORDER[(index + 1) % PASSIVE_TREE_SECTOR_ORDER.length]];
        let midpointAngle = sector.angle + (360 / 14);
        if (nextSector.angle < sector.angle && index === PASSIVE_TREE_SECTOR_ORDER.length - 1) midpointAngle = sector.angle + (360 / 14);
        const junctionPosition = passivePolarPosition(150, midpointAngle);

        addNode({
            id: gatewayId,
            name: `${sector.label} Gateway`,
            description: `Enter the ${sector.label} sector: ${sector.identity}`,
            sector: sectorId, type: 'gateway', ...gatewayPosition,
            effects: { damageTypes: { [sector.damageType]: 3 } }
        });
        addNode({
            id: utilityId,
            name: 'Core Adaptation',
            description: 'A flexible central junction supporting hybrid pathing.',
            sector: 'core', type: 'minor', ...junctionPosition,
            effects: index % 2 === 0 ? { flatHealth: 8, flatEnergyShield: 4 } : { precision: 1, deflection: 1 }
        });
        link(PASSIVE_TREE_ORIGIN_ID, gatewayId);
        link(gatewayId, utilityId);
        link(utilityId, `core-${PASSIVE_TREE_SECTOR_ORDER[(index + 1) % PASSIVE_TREE_SECTOR_ORDER.length]}-gateway`);
    });

    const laneNodeIds = {};
    const laneOffsets = { offense: -7.5, defense: 0, utility: 7.5 };
    const laneOrder = ['offense', 'defense', 'utility'];
    for (const sectorId of PASSIVE_TREE_SECTOR_ORDER) {
        const sector = PASSIVE_SECTOR_DEFINITIONS[sectorId];
        laneNodeIds[sectorId] = {};
        for (const lane of laneOrder) {
            laneNodeIds[sectorId][lane] = [];
            for (let depth = 0; depth < 8; depth++) {
                const id = `${sectorId}-${lane}-${depth + 1}`;
                const isNotable = depth === 2 || depth === 5;
                const isKeystone = depth === 7;
                const radius = 265 + depth * 112;
                const position = passivePolarPosition(radius, sector.angle + laneOffsets[lane]);
                const notableIndex = depth === 2 ? 0 : 1;
                const keystone = sector.keystones[lane];
                const name = isKeystone
                    ? keystone.name
                    : isNotable
                        ? sector.laneNames[lane][notableIndex]
                        : getMinorPassiveName(sector, lane);
                const effects = isKeystone
                    ? keystone.effects
                    : isNotable
                        ? getSectorNotableEffects(sector, lane, depth)
                        : getSectorLaneMinorEffects(sector, lane, depth);
                addNode({
                    id, name,
                    description: isKeystone
                        ? keystone.description
                        : `${sector.identity} ${isNotable ? 'A major specialization node.' : 'A supporting path node.'}`,
                    sector: sectorId,
                    lane,
                    depth: depth + 1,
                    type: isKeystone ? 'keystone' : isNotable ? 'notable' : 'minor',
                    ...position,
                    effects
                });
                laneNodeIds[sectorId][lane].push(id);
                link(depth === 0 ? gatewayIds[sectorId] : laneNodeIds[sectorId][lane][depth - 1], id);
            }
        }
        for (const crossDepth of [2, 5]) {
            link(laneNodeIds[sectorId].offense[crossDepth], laneNodeIds[sectorId].defense[crossDepth]);
            link(laneNodeIds[sectorId].defense[crossDepth], laneNodeIds[sectorId].utility[crossDepth]);
        }
    }

    PASSIVE_BRIDGE_DEFINITIONS.forEach((bridge, bridgeIndex) => {
        const [leftSectorId, rightSectorId] = bridge.sectors;
        const leftSector = PASSIVE_SECTOR_DEFINITIONS[leftSectorId];
        const rightSector = PASSIVE_SECTOR_DEFINITIONS[rightSectorId];
        let angleDelta = rightSector.angle - leftSector.angle;
        if (angleDelta < 0) angleDelta += 360;
        const ids = [];
        for (let index = 0; index < 10; index++) {
            const progress = (index + 1) / 11;
            const angle = leftSector.angle + angleDelta * progress;
            const radius = 790 + Math.sin(progress * Math.PI) * 115;
            const position = passivePolarPosition(radius, angle);
            const isNotable = index === 3 || index === 7;
            const effects = isNotable
                ? mergePassiveEffects(bridge.effects, bridge.effects, { precision: 1, deflection: 1 })
                : bridge.effects;
            const id = `bridge-${bridgeIndex + 1}-${index + 1}`;
            addNode({
                id,
                name: isNotable ? (index === 3 ? bridge.notable : bridge.label) : bridge.label,
                description: `Hybrid path between ${leftSector.label} and ${rightSector.label}.`,
                sector: 'bridge', sectors: bridge.sectors, type: isNotable ? 'notable' : 'bridge',
                depth: index + 1, ...position, effects
            });
            ids.push(id);
            if (index > 0) link(ids[index - 1], id);
        }
        link(laneNodeIds[leftSectorId].utility[4], ids[0]);
        link(ids[ids.length - 1], laneNodeIds[rightSectorId].offense[4]);
    });

    const adjacency = Object.fromEntries(nodes.map(node => [node.id, []]));
    const edges = [...links].map(serialized => {
        const [from, to] = serialized.split('|');
        adjacency[from].push(to);
        adjacency[to].push(from);
        return Object.freeze({ from, to });
    });
    const completedNodes = nodes.map(node => Object.freeze({ ...node, connections: Object.freeze([...adjacency[node.id]]) }));
    return Object.freeze({ nodes: Object.freeze(completedNodes), edges: Object.freeze(edges) });
}

const PASSIVE_TREE = createPassiveTree();
const passives = PASSIVE_TREE.nodes;
const PASSIVE_NODE_BY_ID = new Map(passives.map(node => [node.id, node]));
const PASSIVE_NODES_BY_NAME = new Map();
for (const node of passives) {
    if (!PASSIVE_NODES_BY_NAME.has(node.name)) PASSIVE_NODES_BY_NAME.set(node.name, []);
    PASSIVE_NODES_BY_NAME.get(node.name).push(node);
}

function getPassiveNode(idOrName) {
    if (!idOrName) return null;
    return PASSIVE_NODE_BY_ID.get(idOrName) || PASSIVE_NODES_BY_NAME.get(idOrName)?.[0] || null;
}

function normalizePassiveAllocations(allocations) {
    const normalized = {};
    for (const [rawKey, rawRank] of Object.entries(allocations || {})) {
        const node = getPassiveNode(rawKey);
        const rank = Math.max(0, Math.floor(Number(rawRank) || 0));
        if (node && node.id !== PASSIVE_TREE_ORIGIN_ID && rank > 0) normalized[node.id] = Math.min(node.maxRank, rank);
    }
    return normalized;
}

function getActivePassiveNodeIds(allocations) {
    return new Set([PASSIVE_TREE_ORIGIN_ID, ...Object.keys(normalizePassiveAllocations(allocations))]);
}

function canAllocatePassiveNode(allocations, nodeId) {
    const node = getPassiveNode(nodeId);
    if (!node || node.id === PASSIVE_TREE_ORIGIN_ID) return { ok: false, reason: 'The origin is always active.' };
    const normalized = normalizePassiveAllocations(allocations);
    if (normalized[node.id]) return { ok: false, reason: 'This node is already allocated.' };
    const active = getActivePassiveNodeIds(normalized);
    if (!node.connections.some(connection => active.has(connection))) {
        return { ok: false, reason: 'Allocate a connected node first.' };
    }
    return { ok: true, reason: '' };
}

function getReachableAllocatedPassiveIds(allocations, ignoredNodeId = null) {
    const active = getActivePassiveNodeIds(allocations);
    if (ignoredNodeId) active.delete(ignoredNodeId);
    const reached = new Set();
    const queue = [PASSIVE_TREE_ORIGIN_ID];
    while (queue.length > 0) {
        const current = queue.shift();
        if (reached.has(current) || !active.has(current)) continue;
        reached.add(current);
        for (const next of PASSIVE_NODE_BY_ID.get(current)?.connections || []) {
            if (active.has(next) && !reached.has(next)) queue.push(next);
        }
    }
    return reached;
}

function canRefundPassiveNode(allocations, nodeId) {
    const normalized = normalizePassiveAllocations(allocations);
    if (!normalized[nodeId]) return { ok: false, reason: 'This node has no allocated point.' };
    const remaining = Object.keys(normalized).filter(id => id !== nodeId);
    const reached = getReachableAllocatedPassiveIds(normalized, nodeId);
    const disconnected = remaining.filter(id => !reached.has(id));
    if (disconnected.length > 0) {
        return { ok: false, reason: `Refund connected outer nodes first (${disconnected.length} would be disconnected).`, disconnected };
    }
    return { ok: true, reason: '', disconnected: [] };
}

function createEmptyPassiveBonuses() {
    return {
        attackSpeed: 0,
        damageTypes: {},
        damageGroups: {},
        flatDamageTypes: {},
        defenseTypes: {},
        healthPercent: 0,
        energyShieldPercent: 0,
        criticalChance: 0,
        criticalMultiplier: 0,
        flatHealth: 0,
        flatEnergyShield: 0,
        healthRegen: 0,
        precision: 0,
        deflection: 0,
        armorEfficiency: 0,
        weaponEfficiency: 0,
        bionicEfficiency: 0,
        bionicSync: 0,
        comboAttack: 0,
        comboEffectiveness: 0,
        additionalComboAttacks: 0,
        severedLimbChance: 0,
        maxSeveredLimbs: 0,
        maxSeepingWoundStacks: 0,
        damageRollFloorBonus: 0,
        debuffChanceBonus: 0,
        debuffDurationBonus: 0,
        directDamageMultiplier: 0,
        dotDamageMultiplier: 0,
        damageVsDebuffed: 0,
        damageTakenReduction: 0
    };
}

function accumulatePassiveEffects(target, effects, multiplier = 1) {
    for (const [key, value] of Object.entries(effects || {})) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            target[key] = target[key] || {};
            for (const [nestedKey, nestedValue] of Object.entries(value)) {
                target[key][nestedKey] = Number(target[key][nestedKey] || 0) + Number(nestedValue || 0) * multiplier;
            }
        } else {
            target[key] = Number(target[key] || 0) + Number(value || 0) * multiplier;
        }
    }
    return target;
}

function validatePassiveTree() {
    const errors = [];
    if (passives.length < 250) errors.push(`tree requires at least 250 nodes; found ${passives.length}`);
    if (PASSIVE_NODE_BY_ID.size !== passives.length) errors.push('passive node IDs must be unique');
    for (const node of passives) {
        if (!node.name || !node.type || !node.effects) errors.push(`${node.id} is missing required data`);
        if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) errors.push(`${node.id} has invalid coordinates`);
        for (const connection of node.connections || []) {
            const target = PASSIVE_NODE_BY_ID.get(connection);
            if (!target) errors.push(`${node.id} references missing node ${connection}`);
            else if (!target.connections.includes(node.id)) errors.push(`${node.id} -> ${connection} is not symmetric`);
        }
    }
    const reachable = new Set([PASSIVE_TREE_ORIGIN_ID]);
    const queue = [PASSIVE_TREE_ORIGIN_ID];
    while (queue.length > 0) {
        const current = queue.shift();
        for (const next of PASSIVE_NODE_BY_ID.get(current)?.connections || []) {
            if (!reachable.has(next)) { reachable.add(next); queue.push(next); }
        }
    }
    if (reachable.size !== passives.length) errors.push(`${passives.length - reachable.size} nodes are unreachable from the origin`);
    for (const sectorId of PASSIVE_TREE_SECTOR_ORDER) {
        const sectorNodes = passives.filter(node => node.sector === sectorId);
        if (sectorNodes.length < 25) errors.push(`${sectorId} sector is undersized`);
        if (sectorNodes.filter(node => node.type === 'keystone').length !== 3) errors.push(`${sectorId} requires exactly three keystones`);
    }
    return { valid: errors.length === 0, errors, nodeCount: passives.length, edgeCount: PASSIVE_TREE.edges.length };
}

window.coreboundPassiveTree = Object.freeze({
    version: PASSIVE_TREE_VERSION,
    originId: PASSIVE_TREE_ORIGIN_ID,
    sectorOrder: PASSIVE_TREE_SECTOR_ORDER,
    sectors: PASSIVE_SECTOR_DEFINITIONS,
    bridges: PASSIVE_BRIDGE_DEFINITIONS,
    nodes: passives,
    edges: PASSIVE_TREE.edges,
    getNode: getPassiveNode,
    normalizeAllocations: normalizePassiveAllocations,
    canAllocate: canAllocatePassiveNode,
    canRefund: canRefundPassiveNode,
    getReachableAllocatedIds: getReachableAllocatedPassiveIds,
    createEmptyBonuses: createEmptyPassiveBonuses,
    accumulateEffects: accumulatePassiveEffects,
    validate: validatePassiveTree
});
