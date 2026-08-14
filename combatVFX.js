// Canvas-rendered combat presentation for projectiles, particles, and impacts.

const COMBAT_VFX_COLORS = Object.freeze({
    abyss: '#280008',
    core: '#ff365f',
    hot: '#ffd1d8',
    ember: '#a60029'
});

let combatVfxProjectiles = [];
let combatVfxParticles = [];
let combatVfxShockwaves = [];
let combatVfxAnimationFrame = null;
let combatVfxLastFrame = 0;
let combatVfxGeneration = 0;

function getCombatVfxSurface() {
    const canvas = document.getElementById('combat-vfx-canvas');
    const stage = document.getElementById('delve-combat-stage');
    if (!canvas || !stage || stage.classList.contains('hidden')) return null;
    const bounds = stage.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;
    const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const width = Math.max(1, Math.round(bounds.width * ratio));
    const height = Math.max(1, Math.round(bounds.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { canvas, stage, bounds, context, width: bounds.width, height: bounds.height };
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
        context.shadowColor = particle.color;
        context.shadowBlur = particle.size * 2.5;
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
    drawCombatVfxParticles(surface.context, deltaSeconds);
    drawCombatVfxShockwaves(surface.context, deltaSeconds);
    if (combatVfxProjectiles.length || combatVfxParticles.length || combatVfxShockwaves.length) {
        combatVfxAnimationFrame = requestAnimationFrame(runCombatVfxFrame);
    } else {
        combatVfxAnimationFrame = null;
        combatVfxLastFrame = 0;
        surface.context.clearRect(0, 0, surface.width, surface.height);
    }
}

function queueEnemyAttackPresentation(attacker, target, damagePacket) {
    const surface = getCombatVfxSurface();
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
    if (!combatVfxAnimationFrame) {
        combatVfxLastFrame = 0;
        combatVfxAnimationFrame = requestAnimationFrame(runCombatVfxFrame);
    }
    return true;
}

function cancelCombatVfx() {
    combatVfxGeneration++;
    if (combatVfxAnimationFrame) cancelAnimationFrame(combatVfxAnimationFrame);
    combatVfxAnimationFrame = null;
    combatVfxLastFrame = 0;
    combatVfxProjectiles = [];
    combatVfxParticles = [];
    combatVfxShockwaves = [];
    const canvas = document.getElementById('combat-vfx-canvas');
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    document.querySelectorAll('.enemy-assault-damage').forEach(element => element.remove());
    document.getElementById('player-stats')?.classList.remove('enemy-assault-hit');
}

window.queueEnemyAttackPresentation = queueEnemyAttackPresentation;
window.cancelCombatVfx = cancelCombatVfx;
