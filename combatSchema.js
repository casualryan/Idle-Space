// Canonical runtime contracts for combatants, damage packets, and applied-hit results.

const COMBAT_SCHEMA_VERSION = 1;
const COMBAT_SCHEMA_IDS = Object.freeze({
    combatant: 'corebound.combatant@1',
    damagePacket: 'corebound.damage-packet@1',
    damageResult: 'corebound.damage-result@1'
});

const COMBAT_DAMAGE_TYPES = Object.freeze([
    'kinetic',
    'slashing',
    'pyro',
    'cryo',
    'electric',
    'corrosive',
    'radiation'
]);

const COMBAT_RESISTANCE_TYPES = Object.freeze([
    'physicalResistance',
    'elementalResistance',
    'chemicalResistance'
]);

const COMBAT_DAMAGE_TYPE_ALIASES = Object.freeze({
    mental: 'slashing',
    magnetic: 'electric',
    chemical: 'corrosive'
});

const COMBAT_EFFECT_TRIGGERS = Object.freeze([
    'onHit',
    'onCritical',
    'whenHit'
]);

const COMBAT_EFFECT_ACTIONS = Object.freeze([
    'dealDamage',
    'heal',
    'applyBuff',
    'conditionalRestoreShield',
    'conditionalRestoreHealth',
    'applyDebuff',
    'areaEffect'
]);

// Registered for forward-compatible content, but deliberately unavailable to live items.
const RESERVED_COMBAT_EFFECT_ACTIONS = Object.freeze(['areaEffect']);

function toFiniteCombatNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function normalizeCombatDamageType(type) {
    const key = String(type || '').trim();
    return COMBAT_DAMAGE_TYPE_ALIASES[key] || key;
}

function normalizeCombatDamageMap(source = {}) {
    const normalized = {};
    if (!source || typeof source !== 'object') return normalized;

    for (const [rawType, rawAmount] of Object.entries(source)) {
        if (rawType === 'total') continue;
        const type = normalizeCombatDamageType(rawType);
        if (!COMBAT_DAMAGE_TYPES.includes(type)) continue;
        const amount = Math.max(0, toFiniteCombatNumber(rawAmount));
        if (amount > 0 || Object.prototype.hasOwnProperty.call(source, rawType)) {
            normalized[type] = (normalized[type] || 0) + amount;
        }
    }

    return normalized;
}

function getUnknownCombatDamageTypes(source = {}) {
    if (!source || typeof source !== 'object') return [];
    return Object.keys(source)
        .filter(type => type !== 'total')
        .map(normalizeCombatDamageType)
        .filter(type => !COMBAT_DAMAGE_TYPES.includes(type));
}

function resolveCombatantRole(entity, requestedRole = null) {
    if (requestedRole === 'player' || requestedRole === 'enemy') return requestedRole;
    if (entity?.isPlayer) return 'player';
    if (entity?.isEnemy) return 'enemy';
    return 'unknown';
}

function getCombatantEntity(combatantOrEntity) {
    if (combatantOrEntity?.schema === COMBAT_SCHEMA_IDS.combatant) {
        return combatantOrEntity.entity || null;
    }
    return combatantOrEntity || null;
}

function createCombatantReference(entityOrReference, requestedRole = null) {
    if (entityOrReference?.schema === COMBAT_SCHEMA_IDS.combatant) return entityOrReference;

    const entity = getCombatantEntity(entityOrReference);
    const role = resolveCombatantRole(entity, requestedRole);
    const totalStats = entity?.totalStats || {};
    const rawDamage = totalStats.damageTypes || entity?.damageTypes || {};
    const rawDefense = totalStats.defenseTypes || entity?.defenseTypes || {};
    const maximumHealth = Math.max(0, toFiniteCombatNumber(totalStats.health ?? entity?.health));
    const maximumShield = Math.max(0, toFiniteCombatNumber(totalStats.energyShield ?? entity?.energyShield));

    const resistances = {};
    for (const type of COMBAT_RESISTANCE_TYPES) {
        resistances[type] = toFiniteCombatNumber(rawDefense[type]);
    }

    return {
        schema: COMBAT_SCHEMA_IDS.combatant,
        version: COMBAT_SCHEMA_VERSION,
        entity,
        id: String(entity?.id || entity?.name || role),
        name: String(entity?.name || (role === 'player' ? 'Player' : role === 'enemy' ? 'Enemy' : 'Unknown')),
        role,
        level: Math.max(1, Math.floor(toFiniteCombatNumber(entity?.level, 1))),
        resources: {
            health: {
                current: Math.max(0, toFiniteCombatNumber(entity?.currentHealth, maximumHealth)),
                maximum: maximumHealth
            },
            shield: {
                current: Math.max(0, toFiniteCombatNumber(entity?.currentShield, maximumShield)),
                maximum: maximumShield
            }
        },
        offense: {
            damage: normalizeCombatDamageMap(rawDamage),
            attackSpeed: Math.max(0, toFiniteCombatNumber(totalStats.attackSpeed ?? entity?.attackSpeed)),
            criticalChance: Math.max(0, Math.min(1, toFiniteCombatNumber(totalStats.criticalChance ?? entity?.criticalChance))),
            criticalMultiplier: Math.max(0, toFiniteCombatNumber(totalStats.criticalMultiplier ?? entity?.criticalMultiplier, 1)),
            precision: toFiniteCombatNumber(totalStats.precision ?? entity?.precision)
        },
        defense: {
            resistances,
            deflection: toFiniteCombatNumber(totalStats.deflection ?? entity?.deflection)
        },
        effects: {
            buffs: Array.isArray(entity?.activeBuffs) ? entity.activeBuffs : [],
            debuffs: Array.isArray(entity?.activeDebuffs) ? entity.activeDebuffs : []
        },
        diagnostics: {
            unknownDamageTypes: getUnknownCombatDamageTypes(rawDamage),
            unknownResistanceTypes: Object.keys(rawDefense).filter(type => !COMBAT_RESISTANCE_TYPES.includes(type))
        }
    };
}

function validateCombatantReference(combatantOrEntity) {
    const combatant = createCombatantReference(combatantOrEntity);
    const errors = [];

    if (!combatant.entity || typeof combatant.entity !== 'object') {
        errors.push('combatant is missing its runtime entity reference');
    }
    if (!combatant.name || combatant.name === 'Unknown') {
        errors.push('combatant is missing a name');
    }
    if (!(combatant.resources.health.maximum > 0)) {
        errors.push('maximum health must be greater than zero');
    }
    if (!(combatant.offense.attackSpeed > 0)) {
        errors.push('attack speed must be greater than zero');
    }
    if (combatant.diagnostics.unknownDamageTypes.length > 0) {
        errors.push(`unknown damage types: ${combatant.diagnostics.unknownDamageTypes.join(', ')}`);
    }
    if (combatant.diagnostics.unknownResistanceTypes.length > 0) {
        errors.push(`unknown resistance types: ${combatant.diagnostics.unknownResistanceTypes.join(', ')}`);
    }

    return { valid: errors.length === 0, errors, value: combatant };
}

function assertCombatantReference(combatantOrEntity, context = 'combatant') {
    const validation = validateCombatantReference(combatantOrEntity);
    if (!validation.valid) {
        throw new TypeError(`Invalid ${context}: ${validation.errors.join('; ')}`);
    }
    return validation.value;
}

function isDamagePacket(value) {
    return Boolean(value && value.schema === COMBAT_SCHEMA_IDS.damagePacket);
}

function createDamagePacket(input = {}) {
    const damageSource = input.damage || input.damageBreakdown || {};
    const damage = normalizeCombatDamageMap(damageSource);
    const calculatedTotal = Object.values(damage).reduce((sum, amount) => sum + amount, 0);
    const explicitTotal = Number(input.total);
    const total = Math.max(0, Number.isFinite(explicitTotal) ? explicitTotal : calculatedTotal);
    const source = createCombatantReference(input.source, input.sourceRole);
    const target = createCombatantReference(input.target, input.targetRole);
    const flags = input.flags || {};

    return {
        schema: COMBAT_SCHEMA_IDS.damagePacket,
        version: COMBAT_SCHEMA_VERSION,
        kind: String(input.kind || 'attack'),
        source,
        target,
        damage,
        damageBreakdown: damage,
        total,
        isCritical: Boolean(input.isCritical),
        damageRoll: Math.max(0, toFiniteCombatNumber(input.damageRoll, 1)),
        mitigated: input.mitigated !== false,
        tags: [...new Set(Array.isArray(input.tags) ? input.tags.map(String) : [])],
        flags: {
            applyInherentDebuffs: flags.applyInherentDebuffs !== false,
            showDefaultLog: flags.showDefaultLog !== false,
            animate: flags.animate !== false,
            handleDefeat: flags.handleDefeat !== false,
            isDebuff: Boolean(flags.isDebuff),
            ignoreDefense: Boolean(flags.ignoreDefense)
        },
        metadata: input.metadata && typeof input.metadata === 'object' ? { ...input.metadata } : {},
        diagnostics: {
            unknownDamageTypes: getUnknownCombatDamageTypes(damageSource)
        }
    };
}

function validateDamagePacket(packet) {
    const errors = [];
    if (!isDamagePacket(packet)) {
        return { valid: false, errors: ['value is not a canonical damage packet'], value: packet };
    }
    if (!packet.source?.entity) errors.push('packet is missing a source entity');
    if (!packet.target?.entity) errors.push('packet is missing a target entity');
    if (!Number.isFinite(packet.total) || packet.total < 0) errors.push('packet total must be a non-negative finite number');
    if (packet.diagnostics.unknownDamageTypes.length > 0) {
        errors.push(`unknown damage types: ${packet.diagnostics.unknownDamageTypes.join(', ')}`);
    }
    for (const [type, amount] of Object.entries(packet.damage)) {
        if (!COMBAT_DAMAGE_TYPES.includes(type)) errors.push(`unknown normalized damage type: ${type}`);
        if (!Number.isFinite(amount) || amount < 0) errors.push(`${type} damage must be a non-negative finite number`);
    }
    return { valid: errors.length === 0, errors, value: packet };
}

function assertDamagePacket(packet, context = 'damage packet') {
    const validation = validateDamagePacket(packet);
    if (!validation.valid) {
        throw new TypeError(`Invalid ${context}: ${validation.errors.join('; ')}`);
    }
    return validation.value;
}

function scaleDamagePacket(packet, multiplier) {
    if (!isDamagePacket(packet) || multiplier === 1) return packet;
    const scale = Math.max(0, toFiniteCombatNumber(multiplier, 1));
    const damage = {};
    for (const [type, amount] of Object.entries(packet.damage)) {
        damage[type] = Math.round(amount * scale * 10) / 10;
    }

    return createDamagePacket({
        source: packet.source,
        target: packet.target,
        kind: packet.kind,
        damage,
        total: Math.round(Object.values(damage).reduce((sum, amount) => sum + amount, 0)),
        isCritical: packet.isCritical,
        damageRoll: packet.damageRoll,
        mitigated: packet.mitigated,
        tags: packet.tags,
        flags: packet.flags,
        metadata: packet.metadata
    });
}

function createDamageApplicationResult(packet, details = {}) {
    const target = createCombatantReference(getCombatantEntity(packet.target), packet.target.role);
    const before = details.before || {};
    const after = details.after || {};
    return {
        schema: COMBAT_SCHEMA_IDS.damageResult,
        version: COMBAT_SCHEMA_VERSION,
        packet,
        source: packet.source,
        target,
        requestedDamage: packet.total,
        appliedDamage: Math.max(0, toFiniteCombatNumber(details.appliedDamage)),
        shieldDamage: Math.max(0, toFiniteCombatNumber(details.shieldDamage)),
        healthDamage: Math.max(0, toFiniteCombatNumber(details.healthDamage)),
        overkill: Math.max(0, toFiniteCombatNumber(details.overkill)),
        targetDefeated: Boolean(details.targetDefeated),
        resources: {
            before: {
                health: Math.max(0, toFiniteCombatNumber(before.health)),
                shield: Math.max(0, toFiniteCombatNumber(before.shield))
            },
            after: {
                health: Math.max(0, toFiniteCombatNumber(after.health)),
                shield: Math.max(0, toFiniteCombatNumber(after.shield))
            }
        },
        consumedDebuffs: Array.isArray(details.consumedDebuffs) ? [...details.consumedDebuffs] : [],
        appliedDebuffs: Array.isArray(details.appliedDebuffs) ? [...details.appliedDebuffs] : []
    };
}

function validateEnemyCombatTemplate(template) {
    const errors = [];
    const name = template?.name || 'Unnamed enemy';
    if (!template || typeof template !== 'object') errors.push('template must be an object');
    if (!template?.name) errors.push('name is required');
    if (!template?.portrait) errors.push('portrait is required');
    if (!(toFiniteCombatNumber(template?.health) > 0)) errors.push('health must be greater than zero');
    if (!(toFiniteCombatNumber(template?.attackSpeed) > 0)) errors.push('attackSpeed must be greater than zero');

    const damageTypes = template?.damageTypes || {};
    const unknownDamageTypes = getUnknownCombatDamageTypes(damageTypes);
    if (unknownDamageTypes.length > 0) errors.push(`unknown damage types: ${unknownDamageTypes.join(', ')}`);
    if (!template?.isTrainingDummy && Object.keys(normalizeCombatDamageMap(damageTypes)).length === 0) {
        errors.push('at least one damage type is required');
    }

    const defenseTypes = template?.defenseTypes || {};
    const unknownDefenseTypes = Object.keys(defenseTypes).filter(type => !COMBAT_RESISTANCE_TYPES.includes(type));
    if (unknownDefenseTypes.length > 0) errors.push(`unknown resistance types: ${unknownDefenseTypes.join(', ')}`);

    if (template?.tauntAbility) {
        for (const field of ['initialDelay', 'duration', 'cooldown']) {
            if (!(toFiniteCombatNumber(template.tauntAbility[field]) > 0)) errors.push(`taunt ${field} must be greater than zero`);
        }
    }

    return { valid: errors.length === 0, errors, name };
}

function validateDebuffDefinition(key, definition) {
    const errors = [];
    const name = definition?.name || key || 'Unnamed debuff';
    if (!definition || typeof definition !== 'object') {
        return { valid: false, errors: ['definition must be an object'], name };
    }
    if (!definition.name) errors.push('name is required');
    if (definition.damageType !== null && definition.damageType !== undefined) {
        const normalizedType = normalizeCombatDamageType(definition.damageType);
        if (!COMBAT_DAMAGE_TYPES.includes(normalizedType)) {
            errors.push(`unknown damage type: ${definition.damageType}`);
        }
    }
    if (!Number.isFinite(Number(definition.duration))) errors.push('duration must be a finite number');
    if (Number(definition.duration) === -1 && !definition.permanent && !definition.consumesOn) {
        errors.push('indefinite duration requires permanent or consumesOn semantics');
    }
    if (definition.stackable !== undefined && typeof definition.stackable !== 'boolean') {
        errors.push('stackable must be a boolean');
    }
    if (definition.stackable && !(toFiniteCombatNumber(definition.maxStacks) > 0)) {
        errors.push('stackable debuffs require maxStacks greater than zero');
    }
    return { valid: errors.length === 0, errors, name };
}

function validateCombatEffectDefinition(effect, context = 'effect', debuffDefinitions = {}) {
    const errors = [];
    if (!effect || typeof effect !== 'object') {
        return { valid: false, errors: ['effect must be an object'], name: context };
    }

    if (!COMBAT_EFFECT_TRIGGERS.includes(effect.trigger)) {
        errors.push(`unknown trigger: ${effect.trigger || '(missing)'}`);
    }
    if (!COMBAT_EFFECT_ACTIONS.includes(effect.action)) {
        errors.push(`unknown action: ${effect.action || '(missing)'}`);
    }

    const chance = Number(effect.chance);
    if (!Number.isFinite(chance) || chance < 0 || chance > 100) {
        errors.push('chance must be between 0 and 100');
    }

    const parameters = effect.parameters;
    if (!parameters || typeof parameters !== 'object') {
        errors.push('parameters must be an object');
        return { valid: errors.length === 0, errors, name: context };
    }

    if (effect.enabled !== false && RESERVED_COMBAT_EFFECT_ACTIONS.includes(effect.action)) {
        errors.push(`${effect.action} is reserved and cannot be enabled yet`);
    }

    const validateAmount = (value, label = 'amount') => {
        if (!Number.isFinite(Number(value)) || Number(value) < 0) {
            errors.push(`${label} must be a non-negative finite number`);
        }
    };
    const validateDamageType = value => {
        if (!COMBAT_DAMAGE_TYPES.includes(normalizeCombatDamageType(value))) {
            errors.push(`unknown damage type: ${value || '(missing)'}`);
        }
    };

    switch (effect.action) {
        case 'dealDamage':
            validateDamageType(parameters.damageType);
            validateAmount(parameters.amount);
            break;
        case 'heal':
            validateAmount(parameters.amount);
            break;
        case 'applyBuff':
            if (!parameters.buffName || typeof parameters.buffName !== 'string') errors.push('buffName is required');
            break;
        case 'conditionalRestoreShield':
            if (!Number.isFinite(Number(parameters.maxShieldThreshold))) {
                errors.push('maxShieldThreshold must be a finite number');
            }
            break;
        case 'conditionalRestoreHealth':
            if (!Number.isFinite(Number(parameters.maxHealthThreshold))) {
                errors.push('maxHealthThreshold must be a finite number');
            }
            break;
        case 'applyDebuff':
            if (!parameters.debuffName || typeof parameters.debuffName !== 'string') {
                errors.push('debuffName is required');
            } else if (Object.keys(debuffDefinitions).length > 0 && !debuffDefinitions[parameters.debuffName]) {
                errors.push(`unknown debuff: ${parameters.debuffName}`);
            }
            if (parameters.duration !== undefined && !Number.isFinite(Number(parameters.duration))) {
                errors.push('duration must be a finite number');
            }
            if (parameters.useSourceDamage !== undefined && typeof parameters.useSourceDamage !== 'boolean') {
                errors.push('useSourceDamage must be a boolean');
            }
            break;
        case 'areaEffect':
            // This shape is retained for disabled future content, but execution stays forbidden above.
            validateDamageType(parameters.damageType);
            if (!parameters.damageAmount || typeof parameters.damageAmount !== 'object') {
                errors.push('damageAmount range is required');
            } else {
                validateAmount(parameters.damageAmount.min, 'damageAmount.min');
                validateAmount(parameters.damageAmount.max, 'damageAmount.max');
            }
            break;
        default:
            break;
    }

    return { valid: errors.length === 0, errors, name: context };
}

function validateCombatItemEffects(item, debuffDefinitions = {}) {
    const name = item?.name || 'Unnamed item';
    const effects = item?.effects;
    if (effects === undefined) return { valid: true, errors: [], name };
    if (!Array.isArray(effects)) return { valid: false, errors: ['effects must be an array'], name };

    const errors = effects.flatMap((effect, index) => {
        const validation = validateCombatEffectDefinition(effect, `${name} effect ${index + 1}`, debuffDefinitions);
        return validation.errors.map(error => `effect ${index + 1}: ${error}`);
    });
    return { valid: errors.length === 0, errors, name };
}

function assertCombatRegistry(enemyTemplates = [], itemTemplates = [], debuffDefinitions = {}) {
    const failures = [
        ...enemyTemplates.map(validateEnemyCombatTemplate),
        ...itemTemplates.map(item => validateCombatItemEffects(item, debuffDefinitions)),
        ...Object.entries(debuffDefinitions).map(([key, definition]) => validateDebuffDefinition(key, definition))
    ].filter(result => !result.valid);

    if (failures.length > 0) {
        const details = failures.map(result => `${result.name}: ${result.errors.join('; ')}`).join(' | ');
        throw new TypeError(`Invalid combat registry data: ${details}`);
    }
    return true;
}

window.coreboundCombatSchema = Object.freeze({
    version: COMBAT_SCHEMA_VERSION,
    ids: COMBAT_SCHEMA_IDS,
    damageTypes: COMBAT_DAMAGE_TYPES,
    resistanceTypes: COMBAT_RESISTANCE_TYPES,
    effectTriggers: COMBAT_EFFECT_TRIGGERS,
    effectActions: COMBAT_EFFECT_ACTIONS,
    createCombatantReference,
    validateCombatantReference,
    createDamagePacket,
    validateDamagePacket,
    scaleDamagePacket,
    createDamageApplicationResult,
    validateEnemyCombatTemplate,
    validateDebuffDefinition,
    validateCombatEffectDefinition,
    validateCombatItemEffects,
    assertCombatRegistry
});
