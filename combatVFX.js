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

const WEAPON_ATTACK_PRESENTERS = Object.freeze({
    blades: queueBladePrimaryAttackPresentation,
    impact: queueImpactPrimaryAttackPresentation
});
const WEAPON_PROPAGATION_PRESENTERS = Object.freeze({
    blades: queueBladePropagationPresentation,
    impact: queueImpactPropagationPresentation
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
    combatVfxParticles = [];
    combatVfxShockwaves = [];
    combatVfxSurfaceCache = null;
    const canvas = document.getElementById('combat-vfx-canvas');
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    document.querySelectorAll('.enemy-assault-damage').forEach(element => element.remove());
    document.querySelectorAll('.blade-propagation-damage').forEach(element => element.remove());
    document.querySelectorAll('.impact-propagation-damage').forEach(element => element.remove());
    document.getElementById('player-stats')?.classList.remove('enemy-assault-hit');
    document.querySelectorAll('.blade-impact-hit').forEach(element => element.classList.remove('blade-impact-hit'));
    document.querySelectorAll('.impact-strike-hit').forEach(element => element.classList.remove('impact-strike-hit'));
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
