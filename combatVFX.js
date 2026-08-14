// Canvas-rendered combat presentation for projectiles, particles, and impacts.

const COMBAT_VFX_COLORS = Object.freeze({
    abyss: '#280008',
    core: '#ff365f',
    hot: '#ffd1d8',
    ember: '#a60029'
});

const COMBAT_DAMAGE_VFX_PALETTE = Object.freeze({
    kinetic: Object.freeze({ glow: '#c7d0dc', accent: '#718095', particle: '#f4f7fb' }),
    slashing: Object.freeze({ glow: '#ff4f70', accent: '#9f1837', particle: '#ffd0d9' }),
    pyro: Object.freeze({ glow: '#ff6a24', accent: '#b7240d', particle: '#ffd27a' }),
    cryo: Object.freeze({ glow: '#55d8ff', accent: '#147da6', particle: '#d8f8ff' }),
    electric: Object.freeze({ glow: '#ffe24f', accent: '#b88700', particle: '#fff8b5' }),
    corrosive: Object.freeze({ glow: '#8df33f', accent: '#397d13', particle: '#dcff9b' }),
    radiation: Object.freeze({ glow: '#24d483', accent: '#076346', particle: '#baffdc' })
});

const COMBAT_DAMAGE_VFX_PRIORITY = Object.freeze([
    'kinetic', 'slashing', 'pyro', 'cryo', 'electric', 'corrosive', 'radiation'
]);

let combatVfxProjectiles = [];
let combatVfxSlashes = [];
let combatVfxImpacts = [];
let combatVfxPressureWaves = [];
let combatVfxSidearmShots = [];
let combatVfxRifleRounds = [];
let combatVfxOrdnanceEffects = [];
let combatVfxProjectorBeams = [];
let combatVfxConduitEffects = [];
let combatVfxParticles = [];
let combatVfxShockwaves = [];
let combatVfxAnimationFrame = null;
let combatVfxLastFrame = 0;
let combatVfxGeneration = 0;
let combatVfxSurfaceCache = null;

function clampCombatVfx(value, minimum = 0, maximum = 1) {
    return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function getDominantCombatDamageType(damagePacket) {
    const damage = damagePacket?.metadata?.unmitigatedDamage || damagePacket?.damage || {};
    let dominantType = 'kinetic';
    let dominantAmount = -1;
    for (const type of COMBAT_DAMAGE_VFX_PRIORITY) {
        const amount = Math.max(0, Number(damage[type]) || 0);
        if (amount > dominantAmount) {
            dominantType = type;
            dominantAmount = amount;
        }
    }
    return dominantType;
}

function getCombatVfxWeaponFamily(attacker) {
    const weapon = attacker?.equipment?.mainHand;
    if (!weapon) return null;
    const taxonomy = window.coreboundWeaponTaxonomy?.resolveWeapon?.(weapon);
    return taxonomy?.family || attacker?.totalStats?.activeWeaponFamily || weapon.weaponFamily || null;
}

function getCombatVfxSurface(refresh = false) {
    const canvas = document.getElementById('combat-vfx-canvas');
    const stage = document.getElementById('delve-combat-stage');
    if (!canvas || !stage || stage.classList.contains('hidden')) return null;
    if (!refresh && combatVfxSurfaceCache?.canvas === canvas && combatVfxSurfaceCache.stage === stage) {
        return combatVfxSurfaceCache;
    }
    const bounds = stage.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;
    const nativeRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const pixelBudgetRatio = Math.sqrt(3200000 / (bounds.width * bounds.height));
    const ratio = Math.max(0.85, Math.min(nativeRatio, pixelBudgetRatio));
    const width = Math.max(1, Math.round(bounds.width * ratio));
    const height = Math.max(1, Math.round(bounds.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    combatVfxSurfaceCache = { canvas, stage, bounds, context, width: bounds.width, height: bounds.height };
    return combatVfxSurfaceCache;
}

function getCombatVfxAnchor(entity, surface) {
    const element = entity?.isPlayer
        ? document.getElementById('player-stats')
        : [...document.querySelectorAll('.enemy-combat-card')]
            .find(card => card.dataset.combatId === entity?._combatId);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left - surface.bounds.left + rect.width / 2,
        y: rect.top - surface.bounds.top + rect.height / 2,
        width: rect.width,
        height: rect.height
    };
}

function quadraticCombatVfxPoint(projectile, progress) {
    const inverse = 1 - progress;
    return {
        x: inverse * inverse * projectile.start.x + 2 * inverse * progress * projectile.control.x + progress * progress * projectile.end.x,
        y: inverse * inverse * projectile.start.y + 2 * inverse * progress * projectile.control.y + progress * progress * projectile.end.y
    };
}

function quadraticCombatVfxTangent(projectile, progress) {
    return {
        x: 2 * (1 - progress) * (projectile.control.x - projectile.start.x) + 2 * progress * (projectile.end.x - projectile.control.x),
        y: 2 * (1 - progress) * (projectile.control.y - projectile.start.y) + 2 * progress * (projectile.end.y - projectile.control.y)
    };
}

function getCombatVfxTargetElement(targetOrId) {
    if (targetOrId?.isPlayer || targetOrId === 'player') return document.getElementById('player-stats');
    const targetId = typeof targetOrId === 'string'
        ? targetOrId
        : String(targetOrId?._combatId || targetOrId?.id || targetOrId?.name || '');
    return [...document.querySelectorAll('.enemy-combat-card')]
        .find(card => card.dataset.combatId === targetId) || null;
}

function pulseBladeTarget(targetOrId) {
    const card = getCombatVfxTargetElement(targetOrId);
    if (!card) return;
    card.classList.remove('blade-impact-hit');
    void card.offsetWidth;
    card.classList.add('blade-impact-hit');
    setTimeout(() => card.classList.remove('blade-impact-hit'), 280);
}

function pulseImpactTarget(targetOrId) {
    const card = getCombatVfxTargetElement(targetOrId);
    if (!card) return;
    card.classList.remove('impact-strike-hit');
    void card.offsetWidth;
    card.classList.add('impact-strike-hit');
    setTimeout(() => card.classList.remove('impact-strike-hit'), 320);
}

function pulseSidearmTarget(targetOrId) {
    const card = getCombatVfxTargetElement(targetOrId);
    if (!card) return;
    card.classList.remove('sidearm-shot-hit');
    void card.offsetWidth;
    card.classList.add('sidearm-shot-hit');
    setTimeout(() => card.classList.remove('sidearm-shot-hit'), 240);
}

function pulseWeaponTarget(targetOrId, className, durationMs) {
    const card = getCombatVfxTargetElement(targetOrId);
    if (!card) return;
    card.classList.remove(className);
    void card.offsetWidth;
    card.classList.add(className);
    setTimeout(() => card.classList.remove(className), durationMs);
}

function buildBladeSlash(anchor, options = {}) {
    const secondary = Boolean(options.secondary);
    const sizeMultiplier = secondary ? 0.62 : 1;
    const baseLength = Math.min(anchor.width * 0.67, anchor.height * 1.35) * sizeMultiplier;
    const length = Math.max(72, baseLength * Number(options.lengthMultiplier || 1));
    const angleMagnitude = 0.48 + Math.random() * 0.18;
    const angle = Number.isFinite(options.angle)
        ? options.angle
        : (Math.random() < 0.5 ? -1 : 1) * angleMagnitude;
    const direction = Math.random() < 0.5 ? -1 : 1;
    const unitX = Math.cos(angle) * direction;
    const unitY = Math.sin(angle) * direction;
    const perpendicularX = -unitY;
    const perpendicularY = unitX;
    const center = {
        x: anchor.x + (Math.random() - 0.5) * anchor.width * (secondary ? 0.07 : 0.1),
        y: anchor.y + (Math.random() - 0.5) * anchor.height * (secondary ? 0.06 : 0.09)
    };
    const curvature = (Math.random() - 0.5) * length * 0.1;
    const reducedMotion = Boolean(options.reducedMotion);
    return {
        start: { x: center.x - unitX * length / 2, y: center.y - unitY * length / 2 },
        control: { x: center.x + perpendicularX * curvature, y: center.y + perpendicularY * curvature },
        end: { x: center.x + unitX * length / 2, y: center.y + unitY * length / 2 },
        angle,
        palette: COMBAT_DAMAGE_VFX_PALETTE[options.damageType] || COMBAT_DAMAGE_VFX_PALETTE.kinetic,
        critical: Boolean(options.critical),
        crossCut: Boolean(options.crossCut),
        secondary,
        reducedMotion,
        startedAt: performance.now() + Math.max(0, Number(options.delayMs) || 0),
        durationMs: reducedMotion ? 135 : secondary ? 225 : 270,
        impactProgress: 0.28,
        impacted: false,
        onImpact: options.onImpact || null,
        onFinish: options.onFinish || null
    };
}

function ensureCombatVfxFrame() {
    if (combatVfxAnimationFrame) return;
    combatVfxLastFrame = 0;
    combatVfxAnimationFrame = requestAnimationFrame(runCombatVfxFrame);
}

function queueBladeSlashSet(anchor, options = {}) {
    const slashCount = options.critical ? 2 : 1;
    let remaining = slashCount;
    const finishSlash = () => {
        remaining--;
        if (remaining === 0) options.onComplete?.();
    };
    const primarySlash = buildBladeSlash(anchor, {
        ...options,
        onFinish: finishSlash
    });
    combatVfxSlashes.push(primarySlash);
    if (options.critical) {
        combatVfxSlashes.push(buildBladeSlash(anchor, {
            ...options,
            angle: -Math.sign(primarySlash.angle || 1) * (0.5 + Math.random() * 0.14),
            lengthMultiplier: 0.78,
            delayMs: (Number(options.delayMs) || 0) + (options.reducedMotion ? 22 : 44),
            crossCut: true,
            onImpact: null,
            onFinish: finishSlash
        }));
    }
    ensureCombatVfxFrame();
}

function showBladePropagationDamage(anchor, event, damageType) {
    const layer = document.getElementById('propagation-effects-layer');
    if (!layer) return;
    const number = document.createElement('span');
    number.className = `propagation-effect propagation-damage blade-propagation-damage${event.critical ? ' critical' : ''}`;
    number.textContent = `-${Math.round(event.damage)}${event.critical ? '!' : ''}`;
    number.style.left = `${anchor.x}px`;
    number.style.top = `${anchor.y - 20}px`;
    number.style.setProperty('--blade-damage-color', (COMBAT_DAMAGE_VFX_PALETTE[damageType] || COMBAT_DAMAGE_VFX_PALETTE.kinetic).glow);
    layer.appendChild(number);
    number.addEventListener('animationend', () => number.remove(), { once: true });
}

function queueBladePrimaryAttackPresentation(attacker, target, damagePacket, context = {}) {
    const surface = getCombatVfxSurface(!combatVfxAnimationFrame);
    const anchor = surface ? getCombatVfxAnchor(target, surface) : null;
    if (!surface || !anchor) return false;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    queueBladeSlashSet(anchor, {
        damageType: getDominantCombatDamageType(damagePacket),
        critical: damagePacket.isCritical,
        reducedMotion,
        delayMs: Math.max(0, Number(context.hitIndex) || 0) * (reducedMotion ? 24 : 55),
        onImpact: () => pulseBladeTarget(target)
    });
    return true;
}

function queueBladePropagationPresentation(sequence, complete) {
    const surface = getCombatVfxSurface(!combatVfxAnimationFrame);
    if (!surface || !sequence?.events?.length) return false;
    const anchors = sequence.snapshot?.anchors;
    if (!anchors || sequence.events.some(event => !anchors[event.targetId])) return false;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    const damageType = sequence.dominantDamageType || 'kinetic';
    let remainingEvents = sequence.events.length;
    for (const event of sequence.events) {
        const anchor = anchors[event.targetId];
        queueBladeSlashSet(anchor, {
            damageType,
            critical: event.critical,
            secondary: true,
            reducedMotion,
            delayMs: (reducedMotion ? 45 : 105) + event.index * (reducedMotion ? 28 : 58),
            onImpact: () => {
                pulseBladeTarget(event.targetId);
                showBladePropagationDamage(anchor, event, damageType);
            },
            onComplete: () => {
                remainingEvents--;
                if (remainingEvents === 0) complete();
            }
        });
    }
    return true;
}

function buildImpactFractures(center, radius, secondary, critical) {
    const count = secondary ? 5 + Math.floor(Math.random() * 2) : 7 + Math.floor(Math.random() * 3);
    const rotation = Math.random() * Math.PI * 2;
    return Array.from({ length: count }, (_, index) => {
        const angle = rotation + (index / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.24;
        const perpendicularX = -Math.sin(angle);
        const perpendicularY = Math.cos(angle);
        const length = radius * (0.72 + Math.random() * 0.38);
        const bend = (Math.random() - 0.5) * radius * 0.18;
        const joint = {
            x: center.x + Math.cos(angle) * length * 0.53 + perpendicularX * bend,
            y: center.y + Math.sin(angle) * length * 0.53 + perpendicularY * bend
        };
        const end = {
            x: center.x + Math.cos(angle) * length,
            y: center.y + Math.sin(angle) * length
        };
        const branchDirection = angle + (index % 2 === 0 ? 1 : -1) * (0.34 + Math.random() * 0.24);
        const branch = {
            x: joint.x + Math.cos(branchDirection) * length * (0.2 + Math.random() * 0.17),
            y: joint.y + Math.sin(branchDirection) * length * (0.2 + Math.random() * 0.17)
        };
        const extensionLength = critical ? length * (0.2 + Math.random() * 0.16) : 0;
        return {
            points: [center, joint, end],
            branch: [joint, branch],
            extension: [end, {
                x: end.x + Math.cos(angle + (Math.random() - 0.5) * 0.18) * extensionLength,
                y: end.y + Math.sin(angle + (Math.random() - 0.5) * 0.18) * extensionLength
            }]
        };
    });
}

function buildImpactStrike(anchor, options = {}) {
    const secondary = Boolean(options.secondary);
    const scale = secondary ? 0.62 : 1;
    const radius = Math.max(28, Math.min(anchor.width * 0.22, anchor.height * 0.34) * scale);
    const center = {
        x: anchor.x + (Math.random() - 0.5) * anchor.width * (secondary ? 0.05 : 0.08),
        y: anchor.y + (Math.random() - 0.5) * anchor.height * (secondary ? 0.05 : 0.08)
    };
    const reducedMotion = Boolean(options.reducedMotion);
    const critical = Boolean(options.critical);
    return {
        center,
        radius,
        palette: COMBAT_DAMAGE_VFX_PALETTE[options.damageType] || COMBAT_DAMAGE_VFX_PALETTE.kinetic,
        fractures: buildImpactFractures(center, radius, secondary, critical),
        critical,
        secondary,
        reducedMotion,
        startedAt: performance.now() + Math.max(0, Number(options.delayMs) || 0),
        durationMs: reducedMotion ? 210 : secondary ? 360 : 430,
        aftershockDelayMs: reducedMotion ? 34 : 62,
        impacted: false,
        aftershocked: false,
        onImpact: options.onImpact || null,
        onFinish: options.onFinish || null
    };
}

function queueImpactStrike(anchor, options = {}) {
    combatVfxImpacts.push(buildImpactStrike(anchor, options));
    ensureCombatVfxFrame();
}

function buildImpactPressureWave(origin, target, options = {}) {
    const reducedMotion = Boolean(options.reducedMotion);
    return {
        start: { x: origin.x, y: origin.y },
        end: { x: target.x, y: target.y },
        palette: COMBAT_DAMAGE_VFX_PALETTE[options.damageType] || COMBAT_DAMAGE_VFX_PALETTE.kinetic,
        secondary: true,
        startedAt: performance.now() + Math.max(0, Number(options.delayMs) || 0),
        durationMs: reducedMotion ? 72 : 108
    };
}

function showImpactPropagationDamage(anchor, event, damageType) {
    const layer = document.getElementById('propagation-effects-layer');
    if (!layer) return;
    const number = document.createElement('span');
    number.className = `propagation-effect propagation-damage impact-propagation-damage${event.critical ? ' critical' : ''}`;
    number.textContent = `-${Math.round(event.damage)}${event.critical ? '!' : ''}`;
    number.style.left = `${anchor.x}px`;
    number.style.top = `${anchor.y - 20}px`;
    number.style.setProperty('--impact-damage-color', (COMBAT_DAMAGE_VFX_PALETTE[damageType] || COMBAT_DAMAGE_VFX_PALETTE.kinetic).glow);
    layer.appendChild(number);
    number.addEventListener('animationend', () => number.remove(), { once: true });
}

function queueImpactPrimaryAttackPresentation(attacker, target, damagePacket, context = {}) {
    const surface = getCombatVfxSurface(!combatVfxAnimationFrame);
    const anchor = surface ? getCombatVfxAnchor(target, surface) : null;
    if (!surface || !anchor) return false;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    queueImpactStrike(anchor, {
        damageType: getDominantCombatDamageType(damagePacket),
        critical: damagePacket.isCritical,
        reducedMotion,
        delayMs: Math.max(0, Number(context.hitIndex) || 0) * (reducedMotion ? 24 : 55),
        onImpact: () => pulseImpactTarget(target)
    });
    return true;
}

function queueImpactPropagationPresentation(sequence, complete) {
    const surface = getCombatVfxSurface(!combatVfxAnimationFrame);
    if (!surface || !sequence?.events?.length) return false;
    const anchors = sequence.snapshot?.anchors;
    if (!anchors || sequence.events.some(event => !anchors[event.originId] || !anchors[event.targetId])) return false;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    const damageType = sequence.dominantDamageType || 'kinetic';
    const targetReadyAt = new Map([[sequence.primaryTargetId, 0]]);
    let remainingEvents = sequence.events.length;
    for (const event of sequence.events) {
        const origin = anchors[event.originId];
        const target = anchors[event.targetId];
        const originReadyAt = targetReadyAt.get(event.originId) || 0;
        const waveDelay = Math.max(
            (reducedMotion ? 30 : 55) + event.index * (reducedMotion ? 20 : 38),
            originReadyAt + (reducedMotion ? 30 : 55)
        );
        const wave = buildImpactPressureWave(origin, target, { damageType, reducedMotion, delayMs: waveDelay });
        combatVfxPressureWaves.push(wave);
        const impactDelay = waveDelay + wave.durationMs * 0.78;
        targetReadyAt.set(event.targetId, impactDelay);
        queueImpactStrike(target, {
            damageType,
            critical: event.critical,
            secondary: true,
            reducedMotion,
            delayMs: impactDelay,
            onImpact: () => {
                pulseImpactTarget(event.targetId);
                showImpactPropagationDamage(target, event, damageType);
            },
            onFinish: () => {
                remainingEvents--;
                if (remainingEvents === 0) complete();
            }
        });
    }
    ensureCombatVfxFrame();
    return true;
}

function buildSidearmShot(origin, target, options = {}) {
    const secondary = Boolean(options.secondary);
    const reducedMotion = Boolean(options.reducedMotion);
    const start = {
        x: origin.x + (Math.random() - 0.5) * origin.width * 0.055,
        y: origin.y + origin.height * 0.18 + (Math.random() - 0.5) * origin.height * 0.045
    };
    const end = {
        x: target.x + (Math.random() - 0.5) * target.width * (secondary ? 0.055 : 0.075),
        y: target.y + (Math.random() - 0.5) * target.height * (secondary ? 0.055 : 0.075)
    };
    const distance = Math.max(1, Math.hypot(end.x - start.x, end.y - start.y));
    const normalX = -(end.y - start.y) / distance;
    const normalY = (end.x - start.x) / distance;
    const bend = (Math.random() - 0.5) * Math.min(18, distance * 0.035);
    return {
        start,
        end,
        control: {
            x: (start.x + end.x) / 2 + normalX * bend,
            y: (start.y + end.y) / 2 + normalY * bend
        },
        palette: COMBAT_DAMAGE_VFX_PALETTE[options.damageType] || COMBAT_DAMAGE_VFX_PALETTE.kinetic,
        critical: Boolean(options.critical),
        secondary,
        reducedMotion,
        sparkRotation: Math.random() * Math.PI * 2,
        startedAt: performance.now() + Math.max(0, Number(options.delayMs) || 0),
        durationMs: reducedMotion ? 125 : secondary ? 235 : 255,
        flightPortion: reducedMotion ? 0.62 : secondary ? 0.48 : 0.5,
        fired: false,
        impacted: false,
        onImpact: options.onImpact || null,
        onFinish: options.onFinish || null
    };
}

function queueSidearmShot(origin, target, options = {}) {
    combatVfxSidearmShots.push(buildSidearmShot(origin, target, options));
    ensureCombatVfxFrame();
}

function showSidearmPropagationDamage(anchor, event, damageType) {
    const layer = document.getElementById('propagation-effects-layer');
    if (!layer) return;
    const number = document.createElement('span');
    number.className = `propagation-effect propagation-damage sidearm-propagation-damage${event.critical ? ' critical' : ''}`;
    number.textContent = `-${Math.round(event.damage)}${event.critical ? '!' : ''}`;
    number.style.left = `${anchor.x}px`;
    number.style.top = `${anchor.y - 20}px`;
    number.style.setProperty('--sidearm-damage-color', (COMBAT_DAMAGE_VFX_PALETTE[damageType] || COMBAT_DAMAGE_VFX_PALETTE.kinetic).glow);
    layer.appendChild(number);
    number.addEventListener('animationend', () => number.remove(), { once: true });
}

function queueSidearmPrimaryAttackPresentation(attacker, target, damagePacket, context = {}) {
    const surface = getCombatVfxSurface(!combatVfxAnimationFrame);
    const origin = surface ? getCombatVfxAnchor(attacker, surface) : null;
    const anchor = surface ? getCombatVfxAnchor(target, surface) : null;
    if (!surface || !origin || !anchor) return false;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    queueSidearmShot(origin, anchor, {
        damageType: getDominantCombatDamageType(damagePacket),
        critical: damagePacket.isCritical,
        reducedMotion,
        delayMs: Math.max(0, Number(context.hitIndex) || 0) * (reducedMotion ? 28 : 62),
        onImpact: () => pulseSidearmTarget(target)
    });
    return true;
}

function queueSidearmPropagationPresentation(sequence, complete) {
    const surface = getCombatVfxSurface(!combatVfxAnimationFrame);
    if (!surface || !sequence?.events?.length) return false;
    const anchors = sequence.snapshot?.anchors;
    if (!anchors || sequence.events.some(event => !anchors[event.originId] || !anchors[event.targetId])) return false;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    const damageType = sequence.dominantDamageType || 'kinetic';
    let remainingEvents = sequence.events.length;
    for (const event of sequence.events) {
        const origin = anchors[event.originId];
        const target = anchors[event.targetId];
        queueSidearmShot(origin, target, {
            damageType,
            critical: event.critical,
            secondary: true,
            reducedMotion,
            delayMs: (reducedMotion ? 38 : 72) + event.index * (reducedMotion ? 34 : 68),
            onImpact: () => {
                pulseSidearmTarget(event.targetId);
                showSidearmPropagationDamage(target, event, damageType);
            },
            onFinish: () => {
                remainingEvents--;
                if (remainingEvents === 0) complete();
            }
        });
    }
    return true;
}

function showWeaponPropagationDamage(anchor, event, damageType, family) {
    const layer = document.getElementById('propagation-effects-layer');
    if (!layer) return;
    const number = document.createElement('span');
    number.className = `propagation-effect propagation-damage ${family}-propagation-damage${event.critical ? ' critical' : ''}`;
    number.textContent = `-${Math.round(event.damage)}${event.critical ? '!' : ''}`;
    number.style.left = `${anchor.x}px`;
    number.style.top = `${anchor.y - 20}px`;
    number.style.setProperty('--weapon-damage-color', (COMBAT_DAMAGE_VFX_PALETTE[damageType] || COMBAT_DAMAGE_VFX_PALETTE.kinetic).glow);
    layer.appendChild(number);
    number.addEventListener('animationend', () => number.remove(), { once: true });
}

function buildRifleRound(origin, target, options = {}) {
    const secondary = Boolean(options.secondary);
    const reducedMotion = Boolean(options.reducedMotion);
    const start = {
        x: origin.x + (Math.random() - 0.5) * origin.width * 0.035,
        y: origin.y + (origin.height || 0) * (options.fromPlayer ? 0.16 : 0) + (Math.random() - 0.5) * origin.height * 0.035
    };
    const end = {
        x: target.x + (Math.random() - 0.5) * target.width * 0.045,
        y: target.y + (Math.random() - 0.5) * target.height * 0.045
    };
    const distance = Math.max(1, Math.hypot(end.x - start.x, end.y - start.y));
    const normalX = -(end.y - start.y) / distance;
    const normalY = (end.x - start.x) / distance;
    const bend = (Math.random() - 0.5) * Math.min(12, distance * 0.022);
    return {
        start,
        end,
        control: {
            x: (start.x + end.x) / 2 + normalX * bend,
            y: (start.y + end.y) / 2 + normalY * bend
        },
        palette: COMBAT_DAMAGE_VFX_PALETTE[options.damageType] || COMBAT_DAMAGE_VFX_PALETTE.kinetic,
        critical: Boolean(options.critical),
        secondary,
        reducedMotion,
        shockRotation: Math.random() * Math.PI * 2,
        startedAt: performance.now() + Math.max(0, Number(options.delayMs) || 0),
        durationMs: reducedMotion ? 145 : secondary ? 205 : 310,
        flightPortion: reducedMotion ? 0.62 : secondary ? 0.44 : 0.48,
        fired: false,
        impacted: false,
        onImpact: options.onImpact || null,
        onFinish: options.onFinish || null
    };
}

function queueRifleRound(origin, target, options = {}) {
    combatVfxRifleRounds.push(buildRifleRound(origin, target, options));
    ensureCombatVfxFrame();
}

function queueRiflePrimaryAttackPresentation(attacker, target, damagePacket, context = {}) {
    const surface = getCombatVfxSurface(!combatVfxAnimationFrame);
    const origin = surface ? getCombatVfxAnchor(attacker, surface) : null;
    const anchor = surface ? getCombatVfxAnchor(target, surface) : null;
    if (!surface || !origin || !anchor) return false;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    queueRifleRound(origin, anchor, {
        damageType: getDominantCombatDamageType(damagePacket),
        critical: damagePacket.isCritical,
        fromPlayer: true,
        reducedMotion,
        delayMs: Math.max(0, Number(context.hitIndex) || 0) * (reducedMotion ? 32 : 72),
        onImpact: () => pulseWeaponTarget(target, 'rifle-round-hit', 300)
    });
    return true;
}

function queueRiflePropagationPresentation(sequence, complete) {
    const surface = getCombatVfxSurface(!combatVfxAnimationFrame);
    if (!surface || !sequence?.events?.length) return false;
    const anchors = sequence.snapshot?.anchors;
    if (!anchors || sequence.events.some(event => !anchors[event.originId] || !anchors[event.targetId])) return false;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    const damageType = sequence.dominantDamageType || 'kinetic';
    let remainingEvents = sequence.events.length;
    for (const event of sequence.events) {
        const origin = anchors[event.originId];
        const target = anchors[event.targetId];
        queueRifleRound(origin, target, {
            damageType,
            critical: event.critical,
            secondary: true,
            reducedMotion,
            delayMs: (reducedMotion ? 95 : 155) + event.index * (reducedMotion ? 60 : 88),
            onImpact: () => {
                pulseWeaponTarget(event.targetId, 'rifle-round-hit', 300);
                showWeaponPropagationDamage(target, event, damageType, 'rifle');
            },
            onFinish: () => {
                remainingEvents--;
                if (remainingEvents === 0) complete();
            }
        });
    }
    return true;
}

function buildOrdnanceEffect(origin, target, options = {}) {
    const shrapnel = Boolean(options.shrapnel);
    const reducedMotion = Boolean(options.reducedMotion);
    const start = { x: origin.x, y: origin.y + (shrapnel ? 0 : origin.height * 0.13) };
    const end = {
        x: target.x + (Math.random() - 0.5) * target.width * (shrapnel ? 0.06 : 0.04),
        y: target.y + (Math.random() - 0.5) * target.height * (shrapnel ? 0.06 : 0.04)
    };
    const distance = Math.max(1, Math.hypot(end.x - start.x, end.y - start.y));
    const direction = Math.random() < 0.5 ? -1 : 1;
    return {
        start,
        end,
        control: shrapnel
            ? {
                x: (start.x + end.x) / 2 + direction * Math.min(16, distance * 0.04),
                y: (start.y + end.y) / 2 - 8
            }
            : {
                x: (start.x + end.x) / 2 + direction * Math.min(52, distance * 0.08),
                y: Math.min(start.y, end.y) - Math.min(165, 78 + distance * 0.12)
            },
        palette: COMBAT_DAMAGE_VFX_PALETTE[options.damageType] || COMBAT_DAMAGE_VFX_PALETTE.kinetic,
        critical: Boolean(options.critical),
        shrapnel,
        reducedMotion,
        spin: Math.random() * Math.PI * 2,
        startedAt: performance.now() + Math.max(0, Number(options.delayMs) || 0),
        durationMs: reducedMotion ? 175 : shrapnel ? 220 : 520,
        flightPortion: reducedMotion ? 0.64 : shrapnel ? 0.48 : 0.63,
        fired: false,
        impacted: false,
        aftershocked: false,
        onImpact: options.onImpact || null,
        onFinish: options.onFinish || null
    };
}

function queueOrdnanceEffect(origin, target, options = {}) {
    combatVfxOrdnanceEffects.push(buildOrdnanceEffect(origin, target, options));
    ensureCombatVfxFrame();
}

function queueOrdnancePrimaryAttackPresentation(attacker, target, damagePacket, context = {}) {
    const surface = getCombatVfxSurface(!combatVfxAnimationFrame);
    const origin = surface ? getCombatVfxAnchor(attacker, surface) : null;
    const anchor = surface ? getCombatVfxAnchor(target, surface) : null;
    if (!surface || !origin || !anchor) return false;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    queueOrdnanceEffect(origin, anchor, {
        damageType: getDominantCombatDamageType(damagePacket),
        critical: damagePacket.isCritical,
        reducedMotion,
        delayMs: Math.max(0, Number(context.hitIndex) || 0) * (reducedMotion ? 38 : 90),
        onImpact: () => pulseWeaponTarget(target, 'ordnance-blast-hit', 390)
    });
    return true;
}

function queueOrdnancePropagationPresentation(sequence, complete) {
    const surface = getCombatVfxSurface(!combatVfxAnimationFrame);
    if (!surface || !sequence?.events?.length) return false;
    const anchors = sequence.snapshot?.anchors;
    if (!anchors || sequence.events.some(event => !anchors[event.originId] || !anchors[event.targetId])) return false;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    const damageType = sequence.dominantDamageType || 'kinetic';
    let remainingEvents = sequence.events.length;
    for (const event of sequence.events) {
        const origin = anchors[event.originId];
        const target = anchors[event.targetId];
        queueOrdnanceEffect(origin, target, {
            damageType,
            critical: event.critical,
            shrapnel: true,
            reducedMotion,
            delayMs: (reducedMotion ? 120 : 355) + event.index * (reducedMotion ? 8 : 14),
            onImpact: () => {
                pulseWeaponTarget(event.targetId, 'ordnance-shrapnel-hit', 270);
                showWeaponPropagationDamage(target, event, damageType, 'ordnance');
            },
            onFinish: () => {
                remainingEvents--;
                if (remainingEvents === 0) complete();
            }
        });
    }
    return true;
}

function buildProjectorBeam(origin, target, options = {}) {
    const secondary = Boolean(options.secondary);
    const reducedMotion = Boolean(options.reducedMotion);
    return {
        start: {
            x: origin.x + (Math.random() - 0.5) * origin.width * 0.025,
            y: origin.y + origin.height * 0.15
        },
        end: {
            x: target.x + (Math.random() - 0.5) * target.width * 0.035,
            y: target.y + (Math.random() - 0.5) * target.height * 0.035
        },
        palette: COMBAT_DAMAGE_VFX_PALETTE[options.damageType] || COMBAT_DAMAGE_VFX_PALETTE.kinetic,
        critical: Boolean(options.critical),
        secondary,
        reducedMotion,
        phase: Math.random() * Math.PI * 2,
        startedAt: performance.now() + Math.max(0, Number(options.delayMs) || 0),
        durationMs: reducedMotion ? 145 : secondary ? 215 : 305,
        strikeProgress: reducedMotion ? 0.18 : 0.13,
        fired: false,
        struck: false,
        onStrike: options.onStrike || null,
        onFinish: options.onFinish || null
    };
}

function queueProjectorBeam(origin, target, options = {}) {
    combatVfxProjectorBeams.push(buildProjectorBeam(origin, target, options));
    ensureCombatVfxFrame();
}

function queueProjectorPrimaryAttackPresentation(attacker, target, damagePacket, context = {}) {
    const surface = getCombatVfxSurface(!combatVfxAnimationFrame);
    const origin = surface ? getCombatVfxAnchor(attacker, surface) : null;
    const anchor = surface ? getCombatVfxAnchor(target, surface) : null;
    if (!surface || !origin || !anchor) return false;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    queueProjectorBeam(origin, anchor, {
        damageType: getDominantCombatDamageType(damagePacket),
        critical: damagePacket.isCritical,
        reducedMotion,
        delayMs: Math.max(0, Number(context.hitIndex) || 0) * (reducedMotion ? 32 : 78),
        onStrike: () => pulseWeaponTarget(target, 'projector-beam-hit', 330)
    });
    return true;
}

function queueProjectorPropagationPresentation(sequence, complete) {
    const surface = getCombatVfxSurface(!combatVfxAnimationFrame);
    if (!surface || !sequence?.events?.length) return false;
    const anchors = sequence.snapshot?.anchors;
    if (!anchors || sequence.events.some(event => !anchors[event.originId] || !anchors[event.targetId])) return false;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    const damageType = sequence.dominantDamageType || 'kinetic';
    let remainingEvents = sequence.events.length;
    for (const event of sequence.events) {
        const origin = anchors[event.originId];
        const target = anchors[event.targetId];
        queueProjectorBeam(origin, target, {
            damageType,
            critical: event.critical,
            secondary: true,
            reducedMotion,
            delayMs: (reducedMotion ? 42 : 115) + event.index * (reducedMotion ? 40 : 82),
            onStrike: () => {
                pulseWeaponTarget(event.targetId, 'projector-beam-hit', 330);
                showWeaponPropagationDamage(target, event, damageType, 'projector');
            },
            onFinish: () => {
                remainingEvents--;
                if (remainingEvents === 0) complete();
            }
        });
    }
    return true;
}

function buildConduitEffect(origin, targets, options = {}) {
    const reducedMotion = Boolean(options.reducedMotion);
    const nova = Boolean(options.nova);
    return {
        origin,
        targets: targets.map((target, index) => ({ ...target, phase: Math.random() * Math.PI * 2 + index * 0.7 })),
        palette: COMBAT_DAMAGE_VFX_PALETTE[options.damageType] || COMBAT_DAMAGE_VFX_PALETTE.kinetic,
        critical: Boolean(options.critical),
        nova,
        reducedMotion,
        phase: Math.random() * Math.PI * 2,
        startedAt: performance.now() + Math.max(0, Number(options.delayMs) || 0),
        durationMs: reducedMotion ? 210 : nova ? 390 : 455,
        burstProgress: reducedMotion ? 0.34 : nova ? 0.36 : 0.42,
        gathered: false,
        burst: false,
        onBurst: options.onBurst || null,
        onFinish: options.onFinish || null
    };
}

function queueConduitEffect(origin, targets, options = {}) {
    combatVfxConduitEffects.push(buildConduitEffect(origin, targets, options));
    ensureCombatVfxFrame();
}

function queueConduitPrimaryAttackPresentation(attacker, target, damagePacket, context = {}) {
    const surface = getCombatVfxSurface(!combatVfxAnimationFrame);
    const origin = surface ? getCombatVfxAnchor(attacker, surface) : null;
    const anchor = surface ? getCombatVfxAnchor(target, surface) : null;
    if (!surface || !origin || !anchor) return false;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    queueConduitEffect(origin, [{ anchor, critical: damagePacket.isCritical }], {
        damageType: getDominantCombatDamageType(damagePacket),
        critical: damagePacket.isCritical,
        reducedMotion,
        delayMs: Math.max(0, Number(context.hitIndex) || 0) * (reducedMotion ? 34 : 82),
        onBurst: () => pulseWeaponTarget(target, 'conduit-sigil-hit', 360)
    });
    return true;
}

function queueConduitPropagationPresentation(sequence, complete) {
    const surface = getCombatVfxSurface(!combatVfxAnimationFrame);
    if (!surface || !sequence?.events?.length) return false;
    const anchors = sequence.snapshot?.anchors;
    const origin = anchors?.[sequence.primaryTargetId];
    if (!origin || sequence.events.some(event => !anchors[event.targetId])) return false;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    const damageType = sequence.dominantDamageType || 'kinetic';
    const targets = sequence.events.map(event => ({ anchor: anchors[event.targetId], event }));
    queueConduitEffect(origin, targets, {
        damageType,
        critical: sequence.events.some(event => event.critical),
        nova: true,
        reducedMotion,
        delayMs: reducedMotion ? 70 : 105,
        onBurst: () => {
            for (const { anchor, event } of targets) {
                pulseWeaponTarget(event.targetId, 'conduit-sigil-hit', 360);
                showWeaponPropagationDamage(anchor, event, damageType, 'conduit');
            }
        },
        onFinish: complete
    });
    return true;
}

const WEAPON_ATTACK_PRESENTERS = Object.freeze({
    blades: queueBladePrimaryAttackPresentation,
    impact: queueImpactPrimaryAttackPresentation,
    sidearms: queueSidearmPrimaryAttackPresentation,
    rifles: queueRiflePrimaryAttackPresentation,
    projectors: queueProjectorPrimaryAttackPresentation,
    ordnance: queueOrdnancePrimaryAttackPresentation,
    conduits: queueConduitPrimaryAttackPresentation
});
const WEAPON_PROPAGATION_PRESENTERS = Object.freeze({
    blades: queueBladePropagationPresentation,
    impact: queueImpactPropagationPresentation,
    sidearms: queueSidearmPropagationPresentation,
    rifles: queueRiflePropagationPresentation,
    projectors: queueProjectorPropagationPresentation,
    ordnance: queueOrdnancePropagationPresentation,
    conduits: queueConduitPropagationPresentation
});

function queuePlayerAttackPresentation(attacker, target, damagePacket, context = {}) {
    const family = getCombatVfxWeaponFamily(attacker);
    const presenter = WEAPON_ATTACK_PRESENTERS[family];
    return presenter ? presenter(attacker, target, damagePacket, context) : false;
}

function queueWeaponPropagationPresentation(sequence, complete) {
    const presenter = WEAPON_PROPAGATION_PRESENTERS[sequence?.profile?.family];
    return presenter ? presenter(sequence, complete) : false;
}

function spawnEnemyAssaultTrailParticle(projectile, point, tangent) {
    const length = Math.max(1, Math.hypot(tangent.x, tangent.y));
    const backwardX = -tangent.x / length;
    const backwardY = -tangent.y / length;
    const life = 0.22 + Math.random() * 0.24;
    combatVfxParticles.push({
        x: point.x + (Math.random() - 0.5) * 8,
        y: point.y + (Math.random() - 0.5) * 8,
        vx: backwardX * (35 + Math.random() * 65) + (Math.random() - 0.5) * 40,
        vy: backwardY * (35 + Math.random() * 65) + (Math.random() - 0.5) * 40,
        life,
        maximumLife: life,
        size: 1.5 + Math.random() * 4,
        color: Math.random() > 0.32 ? COMBAT_VFX_COLORS.core : COMBAT_VFX_COLORS.ember,
        drag: 0.91,
        spin: Math.random() * Math.PI
    });
}

function spawnEnemyAssaultImpact(point, critical) {
    const particleCount = critical ? 46 : 34;
    for (let index = 0; index < particleCount; index++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 55 + Math.random() * (critical ? 260 : 190);
        const life = 0.3 + Math.random() * 0.45;
        combatVfxParticles.push({
            x: point.x,
            y: point.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life,
            maximumLife: life,
            size: 2 + Math.random() * (critical ? 6 : 4),
            color: index % 5 === 0 ? COMBAT_VFX_COLORS.hot : index % 2 ? COMBAT_VFX_COLORS.core : COMBAT_VFX_COLORS.ember,
            drag: 0.94,
            spin: Math.random() * Math.PI
        });
    }
    combatVfxShockwaves.push(
        { x: point.x, y: point.y, life: 0.34, maximumLife: 0.34, radius: 8, speed: critical ? 250 : 190, width: 5 },
        { x: point.x, y: point.y, life: 0.52, maximumLife: 0.52, radius: 3, speed: critical ? 155 : 120, width: 2 }
    );
}

function showEnemyAssaultDamage(point, damagePacket, stage) {
    const number = document.createElement('span');
    number.className = `enemy-assault-damage${damagePacket.isCritical ? ' critical' : ''}`;
    number.textContent = `-${Math.round(damagePacket.total)}${damagePacket.isCritical ? '!' : ''}`;
    number.style.left = `${point.x}px`;
    number.style.top = `${point.y - 12}px`;
    number.setAttribute('aria-hidden', 'true');
    stage.appendChild(number);
    number.addEventListener('animationend', () => number.remove(), { once: true });
}

function pulseEnemyAssaultTarget(target) {
    if (!target?.isPlayer) return;
    const card = document.getElementById('player-stats');
    if (!card) return;
    card.classList.remove('enemy-assault-hit');
    void card.offsetWidth;
    card.classList.add('enemy-assault-hit');
    setTimeout(() => card.classList.remove('enemy-assault-hit'), 340);
}

function drawEnemyAssaultProjectile(context, projectile, progress) {
    const point = quadraticCombatVfxPoint(projectile, progress);
    const tangent = quadraticCombatVfxTangent(projectile, progress);
    const angle = Math.atan2(tangent.y, tangent.x);
    const trailStart = Math.max(0, progress - 0.26);

    context.save();
    context.globalCompositeOperation = 'lighter';
    context.lineCap = 'round';
    for (const [width, color, alpha] of [[18, COMBAT_VFX_COLORS.abyss, 0.5], [9, COMBAT_VFX_COLORS.ember, 0.65], [3, COMBAT_VFX_COLORS.core, 0.95]]) {
        context.beginPath();
        for (let sample = 0; sample <= 12; sample++) {
            const sampleProgress = trailStart + (progress - trailStart) * (sample / 12);
            const samplePoint = quadraticCombatVfxPoint(projectile, sampleProgress);
            if (sample === 0) context.moveTo(samplePoint.x, samplePoint.y);
            else context.lineTo(samplePoint.x, samplePoint.y);
        }
        context.globalAlpha = alpha;
        context.strokeStyle = color;
        context.lineWidth = width;
        context.shadowColor = color;
        context.shadowBlur = width * 1.4;
        context.stroke();
    }

    const pulse = 1 + Math.sin(progress * 30) * 0.12;
    context.translate(point.x, point.y);
    context.rotate(angle);
    context.scale(pulse, pulse);
    const glow = context.createRadialGradient(5, 0, 1, 0, 0, 23);
    glow.addColorStop(0, COMBAT_VFX_COLORS.hot);
    glow.addColorStop(0.18, COMBAT_VFX_COLORS.core);
    glow.addColorStop(0.55, COMBAT_VFX_COLORS.ember);
    glow.addColorStop(1, 'rgba(40, 0, 8, 0)');
    context.globalAlpha = 1;
    context.fillStyle = glow;
    context.beginPath();
    context.ellipse(0, 0, 27, 12, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = COMBAT_VFX_COLORS.hot;
    context.shadowColor = COMBAT_VFX_COLORS.core;
    context.shadowBlur = 16;
    context.beginPath();
    context.ellipse(5, 0, 9, 3.5, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
    return { point, tangent };
}

function traceBladeSlashPath(context, slash, startProgress, endProgress) {
    const start = clampCombatVfx(startProgress);
    const end = clampCombatVfx(endProgress);
    if (end <= start) return;
    context.beginPath();
    const samples = 16;
    for (let index = 0; index <= samples; index++) {
        const progress = start + (end - start) * (index / samples);
        const point = quadraticCombatVfxPoint(slash, progress);
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
    }
}

function spawnBladeSlashParticles(slash) {
    const point = quadraticCombatVfxPoint(slash, 0.55);
    const tangent = quadraticCombatVfxTangent(slash, 0.55);
    const length = Math.max(1, Math.hypot(tangent.x, tangent.y));
    const tangentX = tangent.x / length;
    const tangentY = tangent.y / length;
    const normalX = -tangentY;
    const normalY = tangentX;
    const baseCount = slash.reducedMotion ? 4 : slash.secondary ? 8 : 15;
    const particleCount = slash.crossCut ? Math.ceil(baseCount * 0.55) : slash.critical ? baseCount + 5 : baseCount;
    for (let index = 0; index < particleCount; index++) {
        const side = index % 2 === 0 ? -1 : 1;
        const speed = 65 + Math.random() * (slash.secondary ? 100 : 165);
        const life = 0.18 + Math.random() * 0.28;
        combatVfxParticles.push({
            x: point.x + tangentX * (Math.random() - 0.5) * (slash.secondary ? 36 : 58),
            y: point.y + tangentY * (Math.random() - 0.5) * (slash.secondary ? 36 : 58),
            vx: normalX * side * speed + tangentX * (Math.random() - 0.5) * 85,
            vy: normalY * side * speed + tangentY * (Math.random() - 0.5) * 85,
            life,
            maximumLife: life,
            size: 1.2 + Math.random() * (slash.secondary ? 2.2 : 3.5),
            color: index % 4 === 0 ? '#fffdf5' : index % 3 === 0 ? slash.palette.particle : slash.palette.glow,
            drag: 0.9,
            spin: Math.atan2(tangentY, tangentX) + (Math.random() - 0.5) * 0.4
        });
    }
}

function drawBladeSlash(context, slash, progress) {
    const revealProgress = clampCombatVfx(progress / 0.42);
    const reveal = 1 - Math.pow(1 - revealProgress, 3);
    const fade = progress < 0.48 ? 1 : 1 - clampCombatVfx((progress - 0.48) / 0.52);
    const crossOpacity = slash.crossCut ? 0.68 : 1;
    const primaryWidth = slash.secondary ? 7 : slash.critical ? 15 : 12;
    const coreStart = Math.max(0, reveal - (slash.secondary ? 0.38 : 0.3));

    context.save();
    context.globalCompositeOperation = 'lighter';
    context.lineCap = 'round';

    traceBladeSlashPath(context, slash, 0, reveal);
    context.globalAlpha = fade * crossOpacity * 0.34;
    context.strokeStyle = slash.palette.accent;
    context.shadowColor = slash.palette.glow;
    context.shadowBlur = slash.secondary ? 9 : 16;
    context.lineWidth = primaryWidth * 1.7;
    context.stroke();

    traceBladeSlashPath(context, slash, 0, reveal);
    context.globalAlpha = fade * crossOpacity * 0.72;
    context.strokeStyle = slash.palette.glow;
    context.shadowColor = slash.palette.glow;
    context.shadowBlur = slash.secondary ? 7 : 13;
    context.lineWidth = primaryWidth * 0.72;
    context.stroke();

    const afterimageProgress = clampCombatVfx((progress - 0.055) / 0.42);
    const afterimageReveal = 1 - Math.pow(1 - afterimageProgress, 3);
    traceBladeSlashPath(context, slash, 0, afterimageReveal);
    context.globalAlpha = fade * crossOpacity * 0.48;
    context.strokeStyle = slash.palette.particle;
    context.shadowColor = slash.palette.glow;
    context.shadowBlur = slash.secondary ? 3 : 6;
    context.lineWidth = slash.secondary ? 1.1 : 1.7;
    context.stroke();

    traceBladeSlashPath(context, slash, coreStart, reveal);
    context.globalAlpha = fade * crossOpacity;
    context.strokeStyle = '#fffdf5';
    context.shadowColor = slash.palette.particle;
    context.shadowBlur = slash.secondary ? 5 : 9;
    context.lineWidth = slash.secondary ? 1.8 : slash.critical ? 3.6 : 2.8;
    context.stroke();

    if (reveal < 1) {
        const tip = quadraticCombatVfxPoint(slash, reveal);
        const radius = slash.secondary ? 9 : slash.critical ? 18 : 14;
        const glow = context.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, radius);
        glow.addColorStop(0, '#ffffff');
        glow.addColorStop(0.25, slash.palette.particle);
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        context.globalAlpha = fade * crossOpacity;
        context.fillStyle = glow;
        context.beginPath();
        context.arc(tip.x, tip.y, radius, 0, Math.PI * 2);
        context.fill();
    }
    context.restore();
}

function traceImpactFracture(context, points, reveal) {
    if (!Array.isArray(points) || points.length < 2 || reveal <= 0) return;
    const scaled = clampCombatVfx(reveal) * (points.length - 1);
    const fullSegments = Math.floor(scaled);
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let index = 0; index < fullSegments; index++) {
        context.lineTo(points[index + 1].x, points[index + 1].y);
    }
    if (fullSegments < points.length - 1) {
        const fraction = scaled - fullSegments;
        const start = points[fullSegments];
        const end = points[fullSegments + 1];
        context.lineTo(
            start.x + (end.x - start.x) * fraction,
            start.y + (end.y - start.y) * fraction
        );
    }
}

function spawnImpactStrikeParticles(impact, aftershock = false) {
    const baseCount = impact.reducedMotion ? 5 : impact.secondary ? 10 : 18;
    const particleCount = aftershock ? Math.ceil(baseCount * 0.55) : impact.critical ? baseCount + 5 : baseCount;
    for (let index = 0; index < particleCount; index++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (aftershock ? 45 : 70) + Math.random() * (impact.secondary ? 120 : 205);
        const life = 0.2 + Math.random() * 0.34;
        combatVfxParticles.push({
            x: impact.center.x + Math.cos(angle) * Math.random() * impact.radius * 0.18,
            y: impact.center.y + Math.sin(angle) * Math.random() * impact.radius * 0.18,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life,
            maximumLife: life,
            size: 1.5 + Math.random() * (impact.secondary ? 2.8 : 4.5),
            color: index % 5 === 0 ? '#fffdf5' : index % 3 === 0 ? impact.palette.particle : impact.palette.glow,
            drag: aftershock ? 0.88 : 0.92,
            spin: angle + (Math.random() - 0.5) * 0.7
        });
    }
}

function drawImpactStrike(context, impact, progress, elapsedMs) {
    const burstProgress = clampCombatVfx(progress / 0.24);
    const ringProgress = 1 - Math.pow(1 - clampCombatVfx(progress / 0.46), 3);
    const reveal = 1 - Math.pow(1 - clampCombatVfx(progress / 0.34), 2);
    const fade = progress < 0.5 ? 1 : 1 - clampCombatVfx((progress - 0.5) / 0.5);
    const flashAlpha = 1 - burstProgress;
    const ringRadius = impact.radius * (0.18 + ringProgress * 0.98);

    context.save();
    context.globalCompositeOperation = 'lighter';

    if (flashAlpha > 0) {
        const flashRadius = impact.radius * (0.25 + burstProgress * 0.42);
        const flash = context.createRadialGradient(
            impact.center.x, impact.center.y, 0,
            impact.center.x, impact.center.y, flashRadius
        );
        flash.addColorStop(0, '#ffffff');
        flash.addColorStop(0.24, impact.palette.particle);
        flash.addColorStop(0.62, impact.palette.glow);
        flash.addColorStop(1, 'rgba(255, 255, 255, 0)');
        context.globalAlpha = flashAlpha;
        context.fillStyle = flash;
        context.beginPath();
        context.arc(impact.center.x, impact.center.y, flashRadius, 0, Math.PI * 2);
        context.fill();
    }

    context.globalAlpha = fade * 0.78;
    context.strokeStyle = impact.palette.glow;
    context.shadowColor = impact.palette.glow;
    context.shadowBlur = impact.secondary ? 9 : 16;
    context.lineWidth = impact.secondary ? 4 : impact.critical ? 7 : 6;
    context.beginPath();
    context.arc(impact.center.x, impact.center.y, ringRadius, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = fade;
    context.strokeStyle = '#fffdf5';
    context.shadowBlur = impact.secondary ? 4 : 7;
    context.lineWidth = impact.secondary ? 1.2 : 2;
    context.stroke();

    for (const fracture of impact.fractures) {
        traceImpactFracture(context, fracture.points, reveal);
        context.globalAlpha = fade * 0.72;
        context.strokeStyle = impact.palette.accent;
        context.shadowColor = impact.palette.glow;
        context.shadowBlur = impact.secondary ? 5 : 9;
        context.lineWidth = impact.secondary ? 3 : 5;
        context.stroke();
        traceImpactFracture(context, fracture.points, reveal);
        context.globalAlpha = fade * 0.9;
        context.strokeStyle = impact.palette.particle;
        context.shadowBlur = impact.secondary ? 2 : 4;
        context.lineWidth = impact.secondary ? 0.9 : 1.4;
        context.stroke();
        traceImpactFracture(context, fracture.branch, clampCombatVfx((reveal - 0.35) / 0.65));
        context.globalAlpha = fade * 0.66;
        context.strokeStyle = impact.palette.glow;
        context.lineWidth = impact.secondary ? 1 : 1.6;
        context.stroke();
    }

    if (impact.critical && elapsedMs >= impact.aftershockDelayMs) {
        const aftershockProgress = clampCombatVfx((elapsedMs - impact.aftershockDelayMs) / (impact.secondary ? 190 : 230));
        const aftershockEase = 1 - Math.pow(1 - aftershockProgress, 3);
        const aftershockAlpha = 1 - aftershockProgress;
        context.globalAlpha = aftershockAlpha * (impact.secondary ? 0.52 : 0.8);
        context.strokeStyle = '#fffdf5';
        context.shadowColor = impact.palette.glow;
        context.shadowBlur = impact.secondary ? 8 : 15;
        context.lineWidth = impact.secondary ? 2.2 : 3.6;
        context.beginPath();
        context.arc(
            impact.center.x,
            impact.center.y,
            impact.radius * (0.12 + aftershockEase * 1.22),
            0,
            Math.PI * 2
        );
        context.stroke();
        for (const fracture of impact.fractures) {
            traceImpactFracture(context, fracture.extension, aftershockEase);
            context.globalAlpha = aftershockAlpha * (impact.secondary ? 0.55 : 0.82);
            context.strokeStyle = impact.palette.particle;
            context.lineWidth = impact.secondary ? 0.9 : 1.5;
            context.stroke();
        }
    }
    context.restore();
}

function drawImpactPressureWave(context, wave, progress) {
    const eased = 1 - Math.pow(1 - clampCombatVfx(progress), 2);
    const x = wave.start.x + (wave.end.x - wave.start.x) * eased;
    const y = wave.start.y + (wave.end.y - wave.start.y) * eased;
    const angle = Math.atan2(wave.end.y - wave.start.y, wave.end.x - wave.start.x);
    const alpha = Math.sin(Math.PI * clampCombatVfx(progress));
    const size = 18 + eased * 16;

    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.globalCompositeOperation = 'lighter';
    context.lineCap = 'round';
    context.globalAlpha = alpha * 0.76;
    context.strokeStyle = wave.palette.glow;
    context.shadowColor = wave.palette.glow;
    context.shadowBlur = 14;
    context.lineWidth = 6;
    context.beginPath();
    context.ellipse(0, 0, size * 0.48, size, 0, -Math.PI / 2, Math.PI / 2);
    context.stroke();
    context.globalAlpha = alpha;
    context.strokeStyle = '#fffdf5';
    context.shadowBlur = 6;
    context.lineWidth = 1.5;
    context.stroke();
    context.translate(-9, 0);
    context.globalAlpha = alpha * 0.32;
    context.strokeStyle = wave.palette.particle;
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(0, 0, size * 0.36, size * 0.78, 0, -Math.PI / 2, Math.PI / 2);
    context.stroke();
    context.restore();
}

function traceSidearmShotPath(context, shot, startProgress, endProgress) {
    const start = clampCombatVfx(startProgress);
    const end = clampCombatVfx(endProgress);
    if (end <= start) return;
    context.beginPath();
    for (let index = 0; index <= 10; index++) {
        const progress = start + (end - start) * (index / 10);
        const point = quadraticCombatVfxPoint(shot, progress);
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
    }
}

function spawnSidearmMuzzleParticles(shot) {
    const tangent = quadraticCombatVfxTangent(shot, 0);
    const length = Math.max(1, Math.hypot(tangent.x, tangent.y));
    const directionX = tangent.x / length;
    const directionY = tangent.y / length;
    const normalX = -directionY;
    const normalY = directionX;
    const count = shot.reducedMotion ? 3 : shot.secondary ? 5 : 8;
    for (let index = 0; index < count; index++) {
        const spread = (Math.random() - 0.5) * (shot.secondary ? 0.5 : 0.68);
        const speed = 55 + Math.random() * (shot.secondary ? 95 : 140);
        const life = 0.1 + Math.random() * 0.16;
        combatVfxParticles.push({
            x: shot.start.x + directionX * 5,
            y: shot.start.y + directionY * 5,
            vx: directionX * speed + normalX * spread * speed,
            vy: directionY * speed + normalY * spread * speed,
            life,
            maximumLife: life,
            size: 0.8 + Math.random() * (shot.secondary ? 1.6 : 2.4),
            color: index % 3 === 0 ? '#fffdf5' : index % 2 ? shot.palette.particle : shot.palette.glow,
            drag: 0.86,
            spin: Math.atan2(directionY, directionX) + spread
        });
    }
}

function spawnSidearmImpactParticles(shot) {
    const count = shot.reducedMotion ? 5 : shot.secondary ? 11 : shot.critical ? 24 : 17;
    for (let index = 0; index < count; index++) {
        const angle = shot.sparkRotation + (index / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
        const speed = 65 + Math.random() * (shot.secondary ? 115 : shot.critical ? 245 : 180);
        const life = 0.16 + Math.random() * 0.28;
        combatVfxParticles.push({
            x: shot.end.x,
            y: shot.end.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life,
            maximumLife: life,
            size: 1 + Math.random() * (shot.secondary ? 2.2 : shot.critical ? 4 : 3),
            color: index % 4 === 0 ? '#fffdf5' : index % 3 === 0 ? shot.palette.particle : shot.palette.glow,
            drag: 0.9,
            spin: angle
        });
    }
}

function drawSidearmMuzzleFlash(context, shot, progress) {
    const flashProgress = clampCombatVfx(progress / 0.2);
    if (flashProgress >= 1) return;
    const tangent = quadraticCombatVfxTangent(shot, 0);
    const angle = Math.atan2(tangent.y, tangent.x);
    const scale = shot.secondary ? 0.72 : 1;
    const alpha = 1 - flashProgress;
    context.save();
    context.translate(shot.start.x, shot.start.y);
    context.rotate(angle);
    context.globalCompositeOperation = 'lighter';
    context.globalAlpha = alpha * 0.7;
    context.fillStyle = shot.palette.glow;
    context.shadowColor = shot.palette.glow;
    context.shadowBlur = 13 * scale;
    context.beginPath();
    context.moveTo(-4 * scale, 0);
    context.lineTo((30 + flashProgress * 10) * scale, -8 * scale);
    context.lineTo(19 * scale, 0);
    context.lineTo((30 + flashProgress * 10) * scale, 8 * scale);
    context.closePath();
    context.fill();
    context.globalAlpha = alpha;
    context.fillStyle = '#fffdf5';
    context.shadowColor = shot.palette.particle;
    context.shadowBlur = 7 * scale;
    context.beginPath();
    context.ellipse(7 * scale, 0, 11 * scale, 3 * scale, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
}

function drawSidearmImpactBloom(context, shot, impactProgress) {
    if (impactProgress <= 0) return;
    const scale = shot.secondary ? 0.72 : 1;
    const eased = 1 - Math.pow(1 - clampCombatVfx(impactProgress), 3);
    const alpha = 1 - clampCombatVfx(impactProgress);
    const radius = (shot.critical ? 31 : 23) * scale * (0.3 + eased * 0.9);
    context.save();
    context.translate(shot.end.x, shot.end.y);
    context.rotate(shot.sparkRotation);
    context.globalCompositeOperation = 'lighter';
    context.globalAlpha = alpha * 0.82;
    context.strokeStyle = shot.palette.glow;
    context.shadowColor = shot.palette.glow;
    context.shadowBlur = 13 * scale;
    context.lineWidth = (shot.critical ? 4 : 3) * scale;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = alpha;
    context.strokeStyle = '#fffdf5';
    context.shadowColor = shot.palette.particle;
    context.shadowBlur = 6 * scale;
    context.lineWidth = 1.4 * scale;
    for (let index = 0; index < (shot.critical ? 8 : 6); index++) {
        const angle = (index / (shot.critical ? 8 : 6)) * Math.PI * 2;
        const inner = radius * 0.25;
        const outer = radius * (0.78 + (index % 2) * 0.28);
        context.beginPath();
        context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        context.stroke();
    }
    context.restore();
}

function drawSidearmShot(context, shot, progress) {
    const flightProgress = clampCombatVfx(progress / shot.flightPortion);
    const impactProgress = clampCombatVfx((progress - shot.flightPortion) / (1 - shot.flightPortion));
    const trailFade = impactProgress > 0 ? 1 - impactProgress : 1;
    const trailStart = clampCombatVfx(flightProgress - (shot.secondary ? 0.28 : 0.34) + impactProgress * 0.48);
    const tip = quadraticCombatVfxPoint(shot, flightProgress);
    const tangent = quadraticCombatVfxTangent(shot, flightProgress);
    const angle = Math.atan2(tangent.y, tangent.x);
    const scale = shot.secondary ? 0.72 : 1;

    drawSidearmMuzzleFlash(context, shot, progress);
    context.save();
    context.globalCompositeOperation = 'lighter';
    context.lineCap = 'round';
    traceSidearmShotPath(context, shot, trailStart, flightProgress);
    context.globalAlpha = trailFade * 0.26;
    context.strokeStyle = shot.palette.accent;
    context.shadowColor = shot.palette.glow;
    context.shadowBlur = 13 * scale;
    context.lineWidth = 9 * scale;
    context.stroke();
    traceSidearmShotPath(context, shot, trailStart, flightProgress);
    context.globalAlpha = trailFade * 0.72;
    context.strokeStyle = shot.palette.glow;
    context.shadowBlur = 8 * scale;
    context.lineWidth = 4.2 * scale;
    context.stroke();
    traceSidearmShotPath(context, shot, Math.max(trailStart, flightProgress - 0.18), flightProgress);
    context.globalAlpha = trailFade;
    context.strokeStyle = '#fffdf5';
    context.shadowColor = shot.palette.particle;
    context.shadowBlur = 5 * scale;
    context.lineWidth = 1.35 * scale;
    context.stroke();
    if (impactProgress === 0) {
        context.translate(tip.x, tip.y);
        context.rotate(angle);
        context.globalAlpha = 1;
        context.fillStyle = '#fffdf5';
        context.shadowColor = shot.palette.glow;
        context.shadowBlur = 12 * scale;
        context.beginPath();
        context.ellipse(0, 0, (shot.critical ? 14 : 10) * scale, 2.6 * scale, 0, 0, Math.PI * 2);
        context.fill();
    }
    context.restore();
    drawSidearmImpactBloom(context, shot, impactProgress);
}

function spawnWeaponBurst(point, palette, options = {}) {
    const count = Math.max(0, Math.floor(Number(options.count) || 0));
    for (let index = 0; index < count; index++) {
        const angle = Number.isFinite(options.direction)
            ? options.direction + (Math.random() - 0.5) * Number(options.spread || 0.7)
            : Math.random() * Math.PI * 2;
        const speed = Number(options.speedMin || 50) + Math.random() * Number(options.speedRange || 140);
        const life = Number(options.lifeMin || 0.16) + Math.random() * Number(options.lifeRange || 0.3);
        combatVfxParticles.push({
            x: point.x,
            y: point.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life,
            maximumLife: life,
            size: Number(options.sizeMin || 1) + Math.random() * Number(options.sizeRange || 3),
            color: index % 5 === 0 ? '#fffdf5' : index % 3 === 0 ? palette.particle : palette.glow,
            drag: Number(options.drag || 0.9),
            spin: angle
        });
    }
}

function spawnRifleMuzzle(round) {
    const tangent = quadraticCombatVfxTangent(round, 0);
    const direction = Math.atan2(tangent.y, tangent.x);
    spawnWeaponBurst(round.start, round.palette, {
        count: round.reducedMotion ? 4 : round.secondary ? 7 : 13,
        direction,
        spread: round.secondary ? 0.42 : 0.58,
        speedMin: 75,
        speedRange: round.secondary ? 125 : 190,
        lifeMin: 0.12,
        lifeRange: 0.2,
        sizeMin: 1,
        sizeRange: round.secondary ? 2.2 : 3.5,
        drag: 0.87
    });
}

function spawnRifleImpact(round) {
    spawnWeaponBurst(round.end, round.palette, {
        count: round.reducedMotion ? 6 : round.secondary ? 16 : round.critical ? 34 : 25,
        speedMin: 85,
        speedRange: round.secondary ? 170 : round.critical ? 300 : 235,
        lifeMin: 0.2,
        lifeRange: 0.36,
        sizeMin: 1.4,
        sizeRange: round.secondary ? 3 : round.critical ? 5.5 : 4.2,
        drag: 0.92
    });
}

function drawRifleRound(context, round, progress) {
    const flightProgress = clampCombatVfx(progress / round.flightPortion);
    const impactProgress = clampCombatVfx((progress - round.flightPortion) / (1 - round.flightPortion));
    const trailFade = impactProgress > 0 ? 1 - impactProgress : 1;
    const trailStart = clampCombatVfx(flightProgress - (round.secondary ? 0.34 : 0.42) + impactProgress * 0.55);
    const point = quadraticCombatVfxPoint(round, flightProgress);
    const tangent = quadraticCombatVfxTangent(round, flightProgress);
    const angle = Math.atan2(tangent.y, tangent.x);
    const scale = round.secondary ? 0.82 : 1;

    context.save();
    context.globalCompositeOperation = 'lighter';
    context.lineCap = 'round';
    if (progress < 0.18) {
        const muzzleAlpha = 1 - progress / 0.18;
        context.save();
        context.translate(round.start.x, round.start.y);
        context.rotate(Math.atan2(round.end.y - round.start.y, round.end.x - round.start.x));
        context.globalAlpha = muzzleAlpha * 0.82;
        context.fillStyle = round.palette.glow;
        context.shadowColor = round.palette.glow;
        context.shadowBlur = 19 * scale;
        context.beginPath();
        context.moveTo(-7 * scale, 0);
        context.lineTo(42 * scale, -11 * scale);
        context.lineTo(28 * scale, 0);
        context.lineTo(42 * scale, 11 * scale);
        context.closePath();
        context.fill();
        context.globalAlpha = muzzleAlpha;
        context.fillStyle = '#fffdf5';
        context.beginPath();
        context.ellipse(10 * scale, 0, 17 * scale, 4.5 * scale, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }
    traceSidearmShotPath(context, round, trailStart, flightProgress);
    context.globalAlpha = trailFade * 0.34;
    context.strokeStyle = round.palette.accent;
    context.shadowColor = round.palette.glow;
    context.shadowBlur = 20 * scale;
    context.lineWidth = 17 * scale;
    context.stroke();
    traceSidearmShotPath(context, round, trailStart, flightProgress);
    context.globalAlpha = trailFade * 0.8;
    context.strokeStyle = round.palette.glow;
    context.shadowBlur = 12 * scale;
    context.lineWidth = 7.5 * scale;
    context.stroke();
    traceSidearmShotPath(context, round, Math.max(trailStart, flightProgress - 0.22), flightProgress);
    context.globalAlpha = trailFade;
    context.strokeStyle = '#fffdf5';
    context.shadowColor = round.palette.particle;
    context.shadowBlur = 7 * scale;
    context.lineWidth = 2.4 * scale;
    context.stroke();
    if (impactProgress === 0) {
        context.translate(point.x, point.y);
        context.rotate(angle);
        context.fillStyle = '#fffdf5';
        context.shadowColor = round.palette.glow;
        context.shadowBlur = 18 * scale;
        context.globalAlpha = 1;
        context.beginPath();
        context.ellipse(0, 0, (round.critical ? 23 : 18) * scale, 5.5 * scale, 0, 0, Math.PI * 2);
        context.fill();
        for (let index = 0; index < 2; index++) {
            context.globalAlpha = 0.56 - index * 0.18;
            context.strokeStyle = round.palette.particle;
            context.lineWidth = 1.7 * scale;
            context.beginPath();
            context.ellipse((-18 - index * 13) * scale, 0, (8 + index * 3) * scale, (13 + index * 4) * scale, 0, -Math.PI / 2, Math.PI / 2);
            context.stroke();
        }
    }
    context.restore();

    if (impactProgress > 0) {
        const eased = 1 - Math.pow(1 - impactProgress, 3);
        const alpha = 1 - impactProgress;
        const radius = (round.secondary ? 30 : round.critical ? 54 : 43) * (0.2 + eased);
        context.save();
        context.translate(round.end.x, round.end.y);
        context.rotate(round.shockRotation);
        context.globalCompositeOperation = 'lighter';
        context.globalAlpha = alpha * 0.78;
        context.strokeStyle = round.palette.glow;
        context.shadowColor = round.palette.glow;
        context.shadowBlur = round.secondary ? 12 : 21;
        context.lineWidth = round.secondary ? 3.5 : 6;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.stroke();
        context.globalAlpha = alpha;
        context.strokeStyle = '#fffdf5';
        context.lineWidth = round.secondary ? 1.1 : 2;
        context.beginPath();
        context.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
        context.stroke();
        if (round.critical) {
            context.globalAlpha = alpha * 0.7;
            context.beginPath();
            context.arc(0, 0, radius * 1.24, 0, Math.PI * 2);
            context.stroke();
        }
        context.restore();
    }
}

function spawnOrdnanceMuzzle(effect) {
    const tangent = quadraticCombatVfxTangent(effect, 0);
    spawnWeaponBurst(effect.start, effect.palette, {
        count: effect.reducedMotion ? 4 : 16,
        direction: Math.atan2(tangent.y, tangent.x),
        spread: 0.75,
        speedMin: 55,
        speedRange: 180,
        lifeMin: 0.16,
        lifeRange: 0.32,
        sizeMin: 1.5,
        sizeRange: 4.5,
        drag: 0.88
    });
}

function spawnOrdnanceImpact(effect, aftershock = false) {
    const count = effect.reducedMotion ? 7 : effect.shrapnel ? 14 : aftershock ? 18 : effect.critical ? 46 : 36;
    spawnWeaponBurst(effect.end, effect.palette, {
        count,
        speedMin: aftershock ? 60 : 80,
        speedRange: effect.shrapnel ? 175 : aftershock ? 200 : effect.critical ? 330 : 275,
        lifeMin: 0.24,
        lifeRange: effect.shrapnel ? 0.3 : 0.5,
        sizeMin: effect.shrapnel ? 1.2 : 2,
        sizeRange: effect.shrapnel ? 3 : effect.critical ? 7 : 5.5,
        drag: aftershock ? 0.89 : 0.93
    });
}

function drawOrdnanceEffect(context, effect, progress) {
    const flightProgress = clampCombatVfx(progress / effect.flightPortion);
    const impactProgress = clampCombatVfx((progress - effect.flightPortion) / (1 - effect.flightPortion));
    const point = quadraticCombatVfxPoint(effect, flightProgress);
    const tangent = quadraticCombatVfxTangent(effect, flightProgress);
    const angle = Math.atan2(tangent.y, tangent.x);
    const scale = effect.shrapnel ? 0.58 : 1;
    const trailStart = clampCombatVfx(flightProgress - (effect.shrapnel ? 0.32 : 0.18));

    context.save();
    context.globalCompositeOperation = 'lighter';
    context.lineCap = 'round';
    if (!effect.shrapnel && progress < 0.14) {
        const alpha = 1 - progress / 0.14;
        context.save();
        context.translate(effect.start.x, effect.start.y);
        context.rotate(Math.atan2(effect.end.y - effect.start.y, effect.end.x - effect.start.x));
        context.globalAlpha = alpha * 0.72;
        context.fillStyle = effect.palette.glow;
        context.shadowColor = effect.palette.glow;
        context.shadowBlur = 23;
        context.beginPath();
        context.ellipse(5, 0, 33, 13, 0, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = alpha;
        context.fillStyle = '#fffdf5';
        context.beginPath();
        context.ellipse(9, 0, 15, 4, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }
    if (impactProgress === 0) {
        traceSidearmShotPath(context, effect, trailStart, flightProgress);
        context.globalAlpha = effect.shrapnel ? 0.72 : 0.46;
        context.strokeStyle = effect.palette.glow;
        context.shadowColor = effect.palette.glow;
        context.shadowBlur = effect.shrapnel ? 8 : 14;
        context.lineWidth = effect.shrapnel ? 4 : 7;
        context.stroke();
        traceSidearmShotPath(context, effect, Math.max(trailStart, flightProgress - 0.09), flightProgress);
        context.globalAlpha = 0.95;
        context.strokeStyle = '#fffdf5';
        context.lineWidth = effect.shrapnel ? 1.2 : 1.8;
        context.stroke();
        context.translate(point.x, point.y);
        context.rotate(angle + effect.spin + flightProgress * (effect.shrapnel ? 4 : 10));
        context.fillStyle = effect.palette.accent;
        context.shadowColor = effect.palette.glow;
        context.shadowBlur = effect.shrapnel ? 8 : 17;
        context.beginPath();
        if (effect.shrapnel) {
            context.moveTo(10 * scale, 0);
            context.lineTo(-7 * scale, -3 * scale);
            context.lineTo(-4 * scale, 4 * scale);
            context.closePath();
        } else {
            context.roundRect(-15, -9, 30, 18, 6);
        }
        context.fill();
        context.strokeStyle = '#fffdf5';
        context.lineWidth = effect.shrapnel ? 1 : 2;
        context.stroke();
    }
    context.restore();

    if (impactProgress > 0) {
        const eased = 1 - Math.pow(1 - impactProgress, 3);
        const alpha = 1 - impactProgress;
        const baseRadius = effect.shrapnel ? 28 : effect.critical ? 82 : 68;
        const radius = baseRadius * (0.16 + eased);
        context.save();
        context.translate(effect.end.x, effect.end.y);
        context.globalCompositeOperation = 'lighter';
        const glow = context.createRadialGradient(0, 0, 0, 0, 0, radius);
        glow.addColorStop(0, '#ffffff');
        glow.addColorStop(0.2, effect.palette.particle);
        glow.addColorStop(0.58, effect.palette.glow);
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        context.globalAlpha = alpha * (effect.shrapnel ? 0.7 : 0.9);
        context.fillStyle = glow;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = alpha;
        context.strokeStyle = '#fffdf5';
        context.shadowColor = effect.palette.glow;
        context.shadowBlur = effect.shrapnel ? 9 : 21;
        context.lineWidth = effect.shrapnel ? 1.5 : 3.5;
        context.beginPath();
        context.arc(0, 0, radius * 0.76, 0, Math.PI * 2);
        context.stroke();
        if (effect.critical && !effect.shrapnel && impactProgress > 0.3) {
            const aftershock = clampCombatVfx((impactProgress - 0.3) / 0.7);
            context.globalAlpha = (1 - aftershock) * 0.88;
            context.lineWidth = 3;
            context.beginPath();
            context.arc(0, 0, 18 + aftershock * 92, 0, Math.PI * 2);
            context.stroke();
        }
        context.restore();
    }
}

function traceProjectorBeamPath(context, beam, reveal, offset, phase) {
    const deltaX = beam.end.x - beam.start.x;
    const deltaY = beam.end.y - beam.start.y;
    const distance = Math.max(1, Math.hypot(deltaX, deltaY));
    const normalX = -deltaY / distance;
    const normalY = deltaX / distance;
    context.beginPath();
    for (let index = 0; index <= 18; index++) {
        const progress = reveal * (index / 18);
        const envelope = Math.sin(Math.PI * progress);
        const ripple = Math.sin(progress * Math.PI * 7 + phase) * offset * envelope;
        const x = beam.start.x + deltaX * progress + normalX * ripple;
        const y = beam.start.y + deltaY * progress + normalY * ripple;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
    }
}

function spawnProjectorDischarge(beam, impact = false) {
    const point = impact ? beam.end : beam.start;
    const direction = Math.atan2(beam.end.y - beam.start.y, beam.end.x - beam.start.x) + (impact ? Math.PI : 0);
    spawnWeaponBurst(point, beam.palette, {
        count: beam.reducedMotion ? 4 : beam.secondary ? 8 : beam.critical ? 21 : 15,
        direction,
        spread: impact ? 1.7 : 0.72,
        speedMin: 45,
        speedRange: impact ? 185 : 135,
        lifeMin: 0.15,
        lifeRange: 0.28,
        sizeMin: 1,
        sizeRange: beam.secondary ? 2.4 : 3.8,
        drag: 0.89
    });
}

function drawProjectorBeam(context, beam, progress) {
    const revealProgress = clampCombatVfx(progress / (beam.reducedMotion ? 0.24 : 0.16));
    const reveal = 1 - Math.pow(1 - revealProgress, 3);
    const collapse = progress < 0.68 ? 0 : clampCombatVfx((progress - 0.68) / 0.32);
    const alpha = progress < 0.12 ? progress / 0.12 : 1 - collapse;
    const scale = beam.secondary ? 0.68 : 1;
    const flicker = 0.92 + Math.sin(progress * 82 + beam.phase) * 0.08;
    const endpoint = {
        x: beam.start.x + (beam.end.x - beam.start.x) * reveal,
        y: beam.start.y + (beam.end.y - beam.start.y) * reveal
    };

    context.save();
    context.globalCompositeOperation = 'lighter';
    context.lineCap = 'round';
    context.translate(beam.start.x, beam.start.y);
    context.rotate(Math.atan2(beam.end.y - beam.start.y, beam.end.x - beam.start.x));
    context.globalAlpha = alpha * 0.75;
    context.strokeStyle = beam.palette.glow;
    context.shadowColor = beam.palette.glow;
    context.shadowBlur = 17 * scale;
    context.lineWidth = 4 * scale;
    context.beginPath();
    context.arc(0, 0, (15 + revealProgress * 7) * scale, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = alpha;
    context.fillStyle = '#fffdf5';
    context.shadowColor = beam.palette.particle;
    context.shadowBlur = 9 * scale;
    context.beginPath();
    context.ellipse(8 * scale, 0, 11 * scale, 3.4 * scale, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();

    context.save();
    context.globalCompositeOperation = 'lighter';
    context.lineCap = 'round';
    traceProjectorBeamPath(context, beam, reveal, 0, beam.phase);
    context.globalAlpha = alpha * 0.28 * flicker;
    context.strokeStyle = beam.palette.accent;
    context.shadowColor = beam.palette.glow;
    context.shadowBlur = 24 * scale;
    context.lineWidth = (beam.critical ? 25 : 20) * scale;
    context.stroke();
    traceProjectorBeamPath(context, beam, reveal, 0, beam.phase);
    context.globalAlpha = alpha * 0.78 * flicker;
    context.strokeStyle = beam.palette.glow;
    context.shadowBlur = 16 * scale;
    context.lineWidth = (beam.critical ? 12 : 9) * scale;
    context.stroke();
    for (const [offset, phaseOffset] of [[5.5, 0], [-5.5, Math.PI]]) {
        traceProjectorBeamPath(context, beam, reveal, offset * scale, beam.phase + phaseOffset + progress * 20);
        context.globalAlpha = alpha * 0.52;
        context.strokeStyle = beam.palette.particle;
        context.shadowBlur = 7 * scale;
        context.lineWidth = 1.3 * scale;
        context.stroke();
    }
    traceProjectorBeamPath(context, beam, reveal, 0, beam.phase);
    context.globalAlpha = alpha;
    context.strokeStyle = '#fffdf5';
    context.shadowColor = beam.palette.particle;
    context.shadowBlur = 10 * scale;
    context.lineWidth = (beam.critical ? 4.2 : 3) * scale;
    context.stroke();
    context.restore();

    if (reveal > 0.72) {
        const feed = clampCombatVfx((reveal - 0.72) / 0.28);
        const radius = (beam.secondary ? 24 : beam.critical ? 48 : 38) * (0.55 + Math.sin(progress * 55) * 0.08);
        context.save();
        context.translate(endpoint.x, endpoint.y);
        context.globalCompositeOperation = 'lighter';
        const glow = context.createRadialGradient(0, 0, 0, 0, 0, radius);
        glow.addColorStop(0, '#ffffff');
        glow.addColorStop(0.25, beam.palette.particle);
        glow.addColorStop(0.62, beam.palette.glow);
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        context.globalAlpha = alpha * feed;
        context.fillStyle = glow;
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = alpha * 0.86;
        context.strokeStyle = '#fffdf5';
        context.shadowColor = beam.palette.glow;
        context.shadowBlur = 12 * scale;
        context.lineWidth = 1.7 * scale;
        context.beginPath();
        context.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
        context.stroke();
        if (beam.critical && collapse > 0) {
            context.globalAlpha = (1 - collapse) * 0.9;
            context.lineWidth = 3 * scale;
            context.beginPath();
            context.arc(0, 0, radius * (0.45 + collapse * 1.7), 0, Math.PI * 2);
            context.stroke();
        }
        context.restore();
    }
}

function drawConduitSigil(context, target, effect, progress, alphaMultiplier = 1) {
    const critical = Boolean(target.critical ?? target.event?.critical ?? effect.critical);
    const preBurst = progress < effect.burstProgress;
    const charge = clampCombatVfx(progress / effect.burstProgress);
    const release = clampCombatVfx((progress - effect.burstProgress) / (1 - effect.burstProgress));
    const scale = preBurst ? 0.55 + charge * 0.45 : 1 + release * (critical ? 1.45 : 1.05);
    const alpha = preBurst ? Math.min(1, charge * 1.7) : 1 - release;
    const radius = (effect.nova ? 34 : critical ? 48 : 41) * scale;
    const rotation = effect.phase + target.phase + progress * (critical ? 5.5 : 4.2);
    context.save();
    context.translate(target.anchor.x, target.anchor.y);
    context.rotate(rotation);
    context.globalCompositeOperation = 'lighter';
    context.globalAlpha = alpha * alphaMultiplier * 0.72;
    context.strokeStyle = effect.palette.glow;
    context.shadowColor = effect.palette.glow;
    context.shadowBlur = effect.nova ? 12 : 18;
    context.lineWidth = effect.nova ? 2.2 : 3.2;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
    context.rotate(-rotation * 1.7);
    context.globalAlpha = alpha * alphaMultiplier;
    context.strokeStyle = '#fffdf5';
    context.shadowColor = effect.palette.particle;
    context.shadowBlur = 8;
    context.lineWidth = critical ? 2.1 : 1.4;
    context.beginPath();
    context.arc(0, 0, radius * 0.68, 0, Math.PI * 2);
    context.stroke();
    const spokeCount = critical ? 10 : 8;
    for (let index = 0; index < spokeCount; index++) {
        const angle = (index / spokeCount) * Math.PI * 2;
        context.beginPath();
        context.moveTo(Math.cos(angle) * radius * 0.3, Math.sin(angle) * radius * 0.3);
        context.lineTo(Math.cos(angle) * radius * (index % 2 ? 0.62 : 0.88), Math.sin(angle) * radius * (index % 2 ? 0.62 : 0.88));
        context.stroke();
    }
    if (critical) {
        context.rotate(rotation * 2.4);
        context.globalAlpha = alpha * alphaMultiplier * 0.62;
        context.strokeStyle = effect.palette.particle;
        context.beginPath();
        context.arc(0, 0, radius * 1.18, 0, Math.PI * 2);
        context.stroke();
    }
    context.restore();
}

function spawnConduitBurst(effect) {
    for (const target of effect.targets) {
        spawnWeaponBurst(target.anchor, effect.palette, {
            count: effect.reducedMotion ? 5 : effect.nova ? 12 : effect.critical ? 28 : 20,
            speedMin: 45,
            speedRange: effect.nova ? 155 : effect.critical ? 245 : 195,
            lifeMin: 0.22,
            lifeRange: 0.38,
            sizeMin: 1,
            sizeRange: effect.nova ? 3 : 4.5,
            drag: 0.9
        });
    }
}

function drawConduitEffect(context, effect, progress) {
    const charge = clampCombatVfx(progress / effect.burstProgress);
    const release = clampCombatVfx((progress - effect.burstProgress) / (1 - effect.burstProgress));
    context.save();
    context.globalCompositeOperation = 'lighter';

    if (!effect.nova) {
        const originRadius = 46 - charge * 24;
        context.globalAlpha = (1 - release) * Math.min(1, charge * 1.8) * 0.75;
        context.strokeStyle = effect.palette.glow;
        context.shadowColor = effect.palette.glow;
        context.shadowBlur = 17;
        context.lineWidth = 3;
        context.beginPath();
        context.arc(effect.origin.x, effect.origin.y, originRadius, effect.phase, effect.phase + Math.PI * 1.55);
        context.stroke();
        context.strokeStyle = '#fffdf5';
        context.lineWidth = 1.3;
        context.beginPath();
        context.arc(effect.origin.x, effect.origin.y, originRadius * 0.68, -effect.phase - progress * 4, -effect.phase - progress * 4 + Math.PI * 1.4);
        context.stroke();
        const target = effect.targets[0].anchor;
        if (charge > 0.24 && release < 0.72) {
            const tetherAlpha = release > 0 ? 1 - release / 0.72 : Math.min(1, (charge - 0.24) / 0.3);
            context.globalAlpha = tetherAlpha * 0.5;
            context.strokeStyle = effect.palette.glow;
            context.shadowBlur = 10;
            context.lineWidth = 2;
            context.setLineDash([7, 9]);
            context.lineDashOffset = -progress * 80;
            context.beginPath();
            context.moveTo(effect.origin.x, effect.origin.y);
            context.lineTo(target.x, target.y);
            context.stroke();
            context.setLineDash([]);
        }
    } else {
        const radius = 28 + release * 430;
        context.globalAlpha = release > 0 ? (1 - release) * 0.44 : charge * 0.18;
        context.strokeStyle = effect.palette.glow;
        context.shadowColor = effect.palette.glow;
        context.shadowBlur = 20;
        context.lineWidth = 7 * (1 - release) + 1;
        context.beginPath();
        context.arc(effect.origin.x, effect.origin.y, radius, 0, Math.PI * 2);
        context.stroke();
        context.globalAlpha *= 0.65;
        context.strokeStyle = '#fffdf5';
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(effect.origin.x, effect.origin.y, radius * 0.92, 0, Math.PI * 2);
        context.stroke();
    }
    context.restore();

    for (const target of effect.targets) {
        drawConduitSigil(context, target, effect, progress, effect.nova ? 0.82 : 1);
    }
}

function drawCombatVfxParticles(context, deltaSeconds) {
    context.save();
    context.globalCompositeOperation = 'lighter';
    combatVfxParticles = combatVfxParticles.filter(particle => {
        particle.life -= deltaSeconds;
        if (particle.life <= 0) return false;
        particle.x += particle.vx * deltaSeconds;
        particle.y += particle.vy * deltaSeconds;
        particle.vx *= Math.pow(particle.drag, deltaSeconds * 60);
        particle.vy *= Math.pow(particle.drag, deltaSeconds * 60);
        particle.spin += deltaSeconds * 4;
        const alpha = Math.min(1, particle.life / Math.min(0.16, particle.maximumLife));
        context.save();
        context.translate(particle.x, particle.y);
        context.rotate(particle.spin);
        context.globalAlpha = alpha;
        context.fillStyle = particle.color;
        context.fillRect(-particle.size * 1.5, -particle.size / 2, particle.size * 3, particle.size);
        context.restore();
        return true;
    });
    context.restore();
}

function drawCombatVfxShockwaves(context, deltaSeconds) {
    context.save();
    context.globalCompositeOperation = 'lighter';
    combatVfxShockwaves = combatVfxShockwaves.filter(wave => {
        wave.life -= deltaSeconds;
        if (wave.life <= 0) return false;
        wave.radius += wave.speed * deltaSeconds;
        const alpha = wave.life / wave.maximumLife;
        context.globalAlpha = alpha;
        context.strokeStyle = COMBAT_VFX_COLORS.core;
        context.shadowColor = COMBAT_VFX_COLORS.core;
        context.shadowBlur = 18;
        context.lineWidth = Math.max(0.5, wave.width * alpha);
        context.beginPath();
        context.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        context.stroke();
        return true;
    });
    context.restore();
}

function runCombatVfxFrame(timestamp) {
    const surface = getCombatVfxSurface();
    if (!surface) {
        cancelCombatVfx();
        return;
    }
    const deltaSeconds = combatVfxLastFrame ? Math.min(0.05, (timestamp - combatVfxLastFrame) / 1000) : 0;
    combatVfxLastFrame = timestamp;
    surface.context.clearRect(0, 0, surface.width, surface.height);
    const generation = combatVfxGeneration;

    combatVfxProjectiles = combatVfxProjectiles.filter(projectile => {
        const progress = Math.min(1, (timestamp - projectile.startedAt) / projectile.durationMs);
        const rendered = drawEnemyAssaultProjectile(surface.context, projectile, progress);
        projectile.emission += deltaSeconds * (projectile.reducedMotion ? 22 : 95);
        while (projectile.emission >= 1) {
            spawnEnemyAssaultTrailParticle(projectile, rendered.point, rendered.tangent);
            projectile.emission--;
        }
        if (progress < 1) return true;

        spawnEnemyAssaultImpact(rendered.point, projectile.damagePacket.isCritical);
        showEnemyAssaultDamage(rendered.point, projectile.damagePacket, surface.stage);
        pulseEnemyAssaultTarget(projectile.target);
        return false;
    });

    if (generation !== combatVfxGeneration) return;
    const sidearmCompletions = [];
    combatVfxSidearmShots = combatVfxSidearmShots.filter(shot => {
        if (timestamp < shot.startedAt) return true;
        const progress = Math.min(1, (timestamp - shot.startedAt) / shot.durationMs);
        if (!shot.fired) {
            shot.fired = true;
            spawnSidearmMuzzleParticles(shot);
        }
        drawSidearmShot(surface.context, shot, progress);
        if (!shot.impacted && progress >= shot.flightPortion) {
            shot.impacted = true;
            spawnSidearmImpactParticles(shot);
            shot.onImpact?.();
        }
        if (progress < 1) return true;
        if (shot.onFinish) sidearmCompletions.push(shot.onFinish);
        return false;
    });
    sidearmCompletions.forEach(complete => complete());
    if (generation !== combatVfxGeneration) return;

    const rifleCompletions = [];
    combatVfxRifleRounds = combatVfxRifleRounds.filter(round => {
        if (timestamp < round.startedAt) return true;
        const progress = Math.min(1, (timestamp - round.startedAt) / round.durationMs);
        if (!round.fired) {
            round.fired = true;
            spawnRifleMuzzle(round);
        }
        drawRifleRound(surface.context, round, progress);
        if (!round.impacted && progress >= round.flightPortion) {
            round.impacted = true;
            spawnRifleImpact(round);
            round.onImpact?.();
        }
        if (progress < 1) return true;
        if (round.onFinish) rifleCompletions.push(round.onFinish);
        return false;
    });
    rifleCompletions.forEach(complete => complete());
    if (generation !== combatVfxGeneration) return;

    const ordnanceCompletions = [];
    combatVfxOrdnanceEffects = combatVfxOrdnanceEffects.filter(effect => {
        if (timestamp < effect.startedAt) return true;
        const progress = Math.min(1, (timestamp - effect.startedAt) / effect.durationMs);
        if (!effect.fired) {
            effect.fired = true;
            if (!effect.shrapnel) spawnOrdnanceMuzzle(effect);
        }
        drawOrdnanceEffect(surface.context, effect, progress);
        if (!effect.impacted && progress >= effect.flightPortion) {
            effect.impacted = true;
            spawnOrdnanceImpact(effect);
            effect.onImpact?.();
        }
        const impactProgress = clampCombatVfx((progress - effect.flightPortion) / (1 - effect.flightPortion));
        if (effect.critical && !effect.shrapnel && !effect.aftershocked && impactProgress >= 0.3) {
            effect.aftershocked = true;
            spawnOrdnanceImpact(effect, true);
        }
        if (progress < 1) return true;
        if (effect.onFinish) ordnanceCompletions.push(effect.onFinish);
        return false;
    });
    ordnanceCompletions.forEach(complete => complete());
    if (generation !== combatVfxGeneration) return;

    const projectorCompletions = [];
    combatVfxProjectorBeams = combatVfxProjectorBeams.filter(beam => {
        if (timestamp < beam.startedAt) return true;
        const progress = Math.min(1, (timestamp - beam.startedAt) / beam.durationMs);
        if (!beam.fired) {
            beam.fired = true;
            spawnProjectorDischarge(beam);
        }
        drawProjectorBeam(surface.context, beam, progress);
        if (!beam.struck && progress >= beam.strikeProgress) {
            beam.struck = true;
            spawnProjectorDischarge(beam, true);
            beam.onStrike?.();
        }
        if (progress < 1) return true;
        if (beam.onFinish) projectorCompletions.push(beam.onFinish);
        return false;
    });
    projectorCompletions.forEach(complete => complete());
    if (generation !== combatVfxGeneration) return;

    const conduitCompletions = [];
    combatVfxConduitEffects = combatVfxConduitEffects.filter(effect => {
        if (timestamp < effect.startedAt) return true;
        const progress = Math.min(1, (timestamp - effect.startedAt) / effect.durationMs);
        if (!effect.gathered) {
            effect.gathered = true;
            spawnWeaponBurst(effect.origin, effect.palette, {
                count: effect.reducedMotion ? 3 : effect.nova ? 8 : 12,
                speedMin: 28,
                speedRange: 90,
                lifeMin: 0.18,
                lifeRange: 0.3,
                sizeMin: 1,
                sizeRange: 3,
                drag: 0.86
            });
        }
        drawConduitEffect(surface.context, effect, progress);
        if (!effect.burst && progress >= effect.burstProgress) {
            effect.burst = true;
            spawnConduitBurst(effect);
            effect.onBurst?.();
        }
        if (progress < 1) return true;
        if (effect.onFinish) conduitCompletions.push(effect.onFinish);
        return false;
    });
    conduitCompletions.forEach(complete => complete());
    if (generation !== combatVfxGeneration) return;

    combatVfxPressureWaves = combatVfxPressureWaves.filter(wave => {
        if (timestamp < wave.startedAt) return true;
        const progress = Math.min(1, (timestamp - wave.startedAt) / wave.durationMs);
        drawImpactPressureWave(surface.context, wave, progress);
        return progress < 1;
    });

    const impactCompletions = [];
    combatVfxImpacts = combatVfxImpacts.filter(impact => {
        if (timestamp < impact.startedAt) return true;
        const elapsedMs = timestamp - impact.startedAt;
        const progress = Math.min(1, elapsedMs / impact.durationMs);
        drawImpactStrike(surface.context, impact, progress, elapsedMs);
        if (!impact.impacted) {
            impact.impacted = true;
            spawnImpactStrikeParticles(impact);
            impact.onImpact?.();
        }
        if (impact.critical && !impact.aftershocked && elapsedMs >= impact.aftershockDelayMs) {
            impact.aftershocked = true;
            spawnImpactStrikeParticles(impact, true);
        }
        if (progress < 1) return true;
        if (impact.onFinish) impactCompletions.push(impact.onFinish);
        return false;
    });
    impactCompletions.forEach(complete => complete());
    if (generation !== combatVfxGeneration) return;

    const slashCompletions = [];
    combatVfxSlashes = combatVfxSlashes.filter(slash => {
        if (timestamp < slash.startedAt) return true;
        const progress = Math.min(1, (timestamp - slash.startedAt) / slash.durationMs);
        drawBladeSlash(surface.context, slash, progress);
        if (!slash.impacted && progress >= slash.impactProgress) {
            slash.impacted = true;
            spawnBladeSlashParticles(slash);
            slash.onImpact?.();
        }
        if (progress < 1) return true;
        if (slash.onFinish) slashCompletions.push(slash.onFinish);
        return false;
    });
    slashCompletions.forEach(complete => complete());
    if (generation !== combatVfxGeneration) return;
    drawCombatVfxParticles(surface.context, deltaSeconds);
    drawCombatVfxShockwaves(surface.context, deltaSeconds);
    if (
        combatVfxProjectiles.length
        || combatVfxSlashes.length
        || combatVfxImpacts.length
        || combatVfxPressureWaves.length
        || combatVfxSidearmShots.length
        || combatVfxRifleRounds.length
        || combatVfxOrdnanceEffects.length
        || combatVfxProjectorBeams.length
        || combatVfxConduitEffects.length
        || combatVfxParticles.length
        || combatVfxShockwaves.length
    ) {
        combatVfxAnimationFrame = requestAnimationFrame(runCombatVfxFrame);
    } else {
        combatVfxAnimationFrame = null;
        combatVfxLastFrame = 0;
        surface.context.clearRect(0, 0, surface.width, surface.height);
        combatVfxSurfaceCache = null;
    }
}

function queueEnemyAttackPresentation(attacker, target, damagePacket) {
    const surface = getCombatVfxSurface(!combatVfxAnimationFrame);
    const start = surface ? getCombatVfxAnchor(attacker, surface) : null;
    const end = surface ? getCombatVfxAnchor(target, surface) : null;
    if (!surface || !start || !end) return false;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    const direction = Number(attacker?._slotIndex || 0) % 2 === 0 ? 1 : -1;
    const horizontalDistance = Math.abs(end.x - start.x);
    combatVfxProjectiles.push({
        attacker,
        target,
        damagePacket,
        start,
        end,
        control: {
            x: (start.x + end.x) / 2 + direction * Math.min(145, 55 + horizontalDistance * 0.18),
            y: (start.y + end.y) / 2 - 48
        },
        startedAt: performance.now(),
        durationMs: reducedMotion ? 150 : 330,
        reducedMotion,
        emission: 0
    });
    ensureCombatVfxFrame();
    return true;
}

function cancelCombatVfx() {
    combatVfxGeneration++;
    if (combatVfxAnimationFrame) cancelAnimationFrame(combatVfxAnimationFrame);
    combatVfxAnimationFrame = null;
    combatVfxLastFrame = 0;
    combatVfxProjectiles = [];
    combatVfxSlashes = [];
    combatVfxImpacts = [];
    combatVfxPressureWaves = [];
    combatVfxSidearmShots = [];
    combatVfxRifleRounds = [];
    combatVfxOrdnanceEffects = [];
    combatVfxProjectorBeams = [];
    combatVfxConduitEffects = [];
    combatVfxParticles = [];
    combatVfxShockwaves = [];
    combatVfxSurfaceCache = null;
    const canvas = document.getElementById('combat-vfx-canvas');
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    document.querySelectorAll('.enemy-assault-damage').forEach(element => element.remove());
    document.querySelectorAll('.blade-propagation-damage').forEach(element => element.remove());
    document.querySelectorAll('.impact-propagation-damage').forEach(element => element.remove());
    document.querySelectorAll('.sidearm-propagation-damage').forEach(element => element.remove());
    document.querySelectorAll('.rifle-propagation-damage, .ordnance-propagation-damage, .projector-propagation-damage, .conduit-propagation-damage').forEach(element => element.remove());
    document.getElementById('player-stats')?.classList.remove('enemy-assault-hit');
    document.querySelectorAll('.blade-impact-hit').forEach(element => element.classList.remove('blade-impact-hit'));
    document.querySelectorAll('.impact-strike-hit').forEach(element => element.classList.remove('impact-strike-hit'));
    document.querySelectorAll('.sidearm-shot-hit').forEach(element => element.classList.remove('sidearm-shot-hit'));
    document.querySelectorAll('.rifle-round-hit, .ordnance-blast-hit, .ordnance-shrapnel-hit, .projector-beam-hit, .conduit-sigil-hit').forEach(element => {
        element.classList.remove('rifle-round-hit', 'ordnance-blast-hit', 'ordnance-shrapnel-hit', 'projector-beam-hit', 'conduit-sigil-hit');
    });
}

window.queueEnemyAttackPresentation = queueEnemyAttackPresentation;
window.queuePlayerAttackPresentation = queuePlayerAttackPresentation;
window.queueWeaponPropagationPresentation = queueWeaponPropagationPresentation;
window.cancelCombatVfx = cancelCombatVfx;
window.coreboundWeaponAttackVfx = Object.freeze({
    attackFamilies: Object.freeze(Object.keys(WEAPON_ATTACK_PRESENTERS)),
    propagationFamilies: Object.freeze(Object.keys(WEAPON_PROPAGATION_PRESENTERS)),
    damagePalette: COMBAT_DAMAGE_VFX_PALETTE
});
