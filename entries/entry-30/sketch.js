// ============================================================
const TITLE = "Fractal Hanabi";
const AUTHOR = "nullhodo";
// ============================================================

const CONFIG = {
  "branchCount": 9,
  "branchAngle": 152,
  "angleJitter": 0,
  "maxDepth": 3,
  "reduction": 0.56,
  "baseLength": 130,
  "strokeWidth": 2.8125,
  "gravityAmount": 300,
  "stageDelay": 1.4,
  "fadeDecay": 0.85,
  "animationSpeed": 0.01,
  "sparkleAmount": 80,
  "glowAmount": 15,
  "trailFade": 55,
  "offsetY": 84,
  "colors": [
    "#FF6D00"
  ],
  "backgroundColor": "#000000"
};

const sparkParticles = [];
let explodeTimer = 0;
let explodeTimeStep = 0;
const ASCENT_FRAMES = 36;
const TOTAL_FRAMES = 300;

function setup() {
  createCanvas(400, 800);
  frameRate(30);
  angleMode(DEGREES);

  const stageDelay = CONFIG.stageDelay || 1.0;
  const extraLifeRatio = Math.max(0.3, 0.45 * (1.6 - (CONFIG.fadeDecay || 0.85)));
  const totalBranchLife = stageDelay * (1.0 + extraLifeRatio);
  const totalFadeOutTime = CONFIG.maxDepth * stageDelay + totalBranchLife;
  const availableExplodeFrames = TOTAL_FRAMES - ASCENT_FRAMES - 20;
  explodeTimeStep = totalFadeOutTime / Math.max(60, availableExplodeFrames);
}

function draw() {
  const currentFrame = frameCount;

  const [br, bg, bb] = hexToRgb(CONFIG.backgroundColor);
  if (CONFIG.trailFade > 0 && currentFrame > ASCENT_FRAMES) {
    const fadeAlpha = ((80 - CONFIG.trailFade) / 80) * 225 + 30;
    push();
    fill(br, bg, bb, fadeAlpha);
    noStroke();
    rect(0, 0, width, height);
    pop();
  } else {
    background(br, bg, bb);
  }

  const centerX = width / 2;
  const centerY = height / 2 - (CONFIG.offsetY || 0);

  if (currentFrame <= ASCENT_FRAMES) {
    const launchProgress = currentFrame / ASCENT_FRAMES;
    drawRocketAscent(launchProgress, centerX, centerY);
  } else {
    explodeTimer += explodeTimeStep;
    renderFractalBloom(centerX, centerY, explodeTimer);
  }

  updateAndRenderSparks();

  if (currentFrame >= 285) {
    const endFade = (currentFrame - 285) / 15;
    push();
    noStroke();
    fill(br, bg, bb, endFade * 255);
    rect(0, 0, width, height);
    pop();
  }
}

function drawRocketAscent(progress, cx, targetY) {
  const eased = easeOutCubic(progress);
  const startY = height + 20;
  const currentY = (1 - eased) * startY + eased * targetY;
  const ascentFade = progress > 0.5 ? Math.max(0, (1.0 - progress) / 0.5) : 1.0;
  const rocketHex = CONFIG.colors[0] || "#ffffff";
  const [r, g, b] = hexToRgb(rocketHex);

  push();
  noStroke();

  const tailLength = 16;
  for (let i = 0; i < tailLength; i++) {
    const tailY = currentY + i * 3.5;
    const alphaVal = (1 - i / tailLength) * 255 * ascentFade;
    fill(r, g, b, alphaVal);
    const size = (5 - (i / tailLength) * 4) * (0.5 + 0.5 * ascentFade);
    circle(cx + (Math.random() - 0.5) * 2.5, tailY, size);
  }

  fill(255, 255, 255, 250 * ascentFade);
  circle(cx, currentY, 7 * ascentFade);
  pop();

  if (CONFIG.sparkleAmount > 0 && Math.random() * 100 < CONFIG.sparkleAmount * 0.8 * ascentFade) {
    addSpark(cx, currentY + 6, rocketHex);
  }
}

function renderFractalBloom(cx, cy, timer) {
  const ctx = drawingContext;
  if (!ctx) return;

  const branchCount = CONFIG.branchCount || 9;
  const branchAngleRad = ((CONFIG.branchAngle || 150) * Math.PI) / 180;
  const angleJitterDeg = CONFIG.angleJitter || 0;
  const stageDelay = CONFIG.stageDelay || 1.0;
  const fadeDecay = CONFIG.fadeDecay || 0.85;

  const segmentsByColor = new Map();
  const totalLayers = 2;

  for (let layer = 0; layer < totalLayers; layer++) {
    const layerOffsetAngle = (layer * (360 / (totalLayers * branchCount)) * Math.PI) / 180;
    const layerLen = layer === 0 ? CONFIG.baseLength : CONFIG.baseLength * 0.75;

    for (let bIndex = 0; bIndex < branchCount; bIndex++) {
      const baseSpokeRad = layerOffsetAngle + (bIndex * (2 * Math.PI)) / branchCount - Math.PI / 2;
      const colorIndex = (bIndex + layer) % CONFIG.colors.length;
      const strokeColor = CONFIG.colors[colorIndex] || "#ffffff";

      collectBranchSegments(
        cx,
        cy,
        layerLen,
        baseSpokeRad,
        1,
        CONFIG.maxDepth,
        CONFIG.reduction,
        branchAngleRad,
        angleJitterDeg,
        layer,
        bIndex,
        0,
        timer,
        stageDelay,
        fadeDecay,
        CONFIG.gravityAmount,
        CONFIG.baseLength,
        CONFIG.strokeWidth,
        strokeColor,
        segmentsByColor,
        CONFIG.sparkleAmount
      );
    }
  }

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const blurRadius = Math.min(14, (CONFIG.glowAmount || 0) * 0.25);

  for (const [colorHex, segList] of segmentsByColor) {
    const [r, g, b] = hexToRgb(colorHex);
    if (blurRadius > 0) {
      ctx.shadowBlur = blurRadius;
      ctx.shadowColor = `rgb(${r},${g},${b})`;
    } else {
      ctx.shadowBlur = 0;
    }

    const whiteBlend = Math.min(0.55, ((CONFIG.glowAmount || 0) / 60) * 0.55);
    const coreR = Math.round(r + (255 - r) * whiteBlend);
    const coreG = Math.round(g + (255 - g) * whiteBlend);
    const coreB = Math.round(b + (255 - b) * whiteBlend);

    for (let i = 0; i < segList.length; i++) {
      const seg = segList[i];
      if (seg.points.length < 2 || seg.alpha <= 0.01) continue;
      const p0 = seg.points[0];
      const pEnd = seg.points[seg.points.length - 1];

      const dx = pEnd.x - p0.x;
      const dy = pEnd.y - p0.y;
      if (dx * dx + dy * dy < 0.01) continue;

      const grad = ctx.createLinearGradient(p0.x, p0.y, pEnd.x, pEnd.y);
      grad.addColorStop(0, `rgba(${coreR},${coreG},${coreB},${seg.alpha})`);
      grad.addColorStop(0.35, `rgba(${r},${g},${b},${seg.alpha * 0.85})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},${seg.alpha * 0.15})`);

      ctx.lineWidth = seg.lineWidth;
      ctx.strokeStyle = grad;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      for (let j = 1; j < seg.points.length; j++) {
        ctx.lineTo(seg.points[j].x, seg.points[j].y);
      }
      ctx.stroke();
    }
  }

  ctx.restore();
}

function collectBranchSegments(
  x0,
  y0,
  length,
  angleRad,
  depth,
  maxDepth,
  reduction,
  branchAngleRad,
  angleJitterDeg,
  layerIndex,
  spokeIndex,
  sideIndex,
  explodeTimer,
  stageDelay,
  fadeDecay,
  gravityAmount,
  baseLength,
  baseStrokeWidth,
  strokeColor,
  segmentsByColor,
  sparkleAmount
) {
  if (depth > maxDepth) return;

  const stageStart = (depth - 1) * stageDelay;
  const branchAge = explodeTimer - stageStart;
  if (branchAge <= 0) return;

  const rawGrowth = Math.min(1, branchAge / stageDelay);
  const stageProgress = physicalExplosionEase(rawGrowth, 4.5);

  const extraLifeRatio = Math.max(0.3, 0.45 * (1.6 - fadeDecay));
  const totalBranchLife = stageDelay * (1.0 + extraLifeRatio);

  let alpha = 0.95;
  if (branchAge < totalBranchLife) {
    const lifeRatio = branchAge / totalBranchLife;
    alpha = Math.max(0, 1.0 - lifeRatio ** 1.85);
  } else {
    alpha = 0;
  }

  const depthWidthFactor = 0.75 ** (depth - 1);
  const lineWidth = Math.max(0.6, baseStrokeWidth * depthWidthFactor);
  const lengthRatio = length / (baseLength || 130);
  const scaleRatio = (baseLength || 130) / 270;
  const gravity = lengthRatio * gravityAmount * 0.45 * scaleRatio;

  const parabola = evaluateParabolaPoints(x0, y0, length, angleRad, gravity, stageProgress);

  if (parabola.points.length >= 2 && alpha > 0.01) {
    let list = segmentsByColor.get(strokeColor);
    if (!list) {
      list = [];
      segmentsByColor.set(strokeColor, list);
    }
    list.push({
      points: parabola.points,
      alpha: alpha,
      lineWidth: lineWidth,
    });
  }

  if (sparkleAmount > 0 && alpha > 0.25) {
    const isRootAction = depth === 1 && branchAge <= stageDelay * 0.35;
    const isBranchNodeAction = depth > 1 && rawGrowth <= 0.25;
    if ((isRootAction || isBranchNodeAction) && Math.random() * 100 < sparkleAmount * 0.2) {
      addSpark(x0 + (Math.random() - 0.5) * 3, y0 + (Math.random() - 0.5) * 3, strokeColor);
    }
  }

  if (rawGrowth >= 0.92 && depth < maxDepth) {
    const nextLength = length * reduction;
    const fullEnd = evaluateParabolaPoints(x0, y0, length, angleRad, gravity, 1.0);

    const leftJitter = getBranchJitter(layerIndex, spokeIndex, depth + 1, 0, angleJitterDeg);
    const rightJitter = getBranchJitter(layerIndex, spokeIndex, depth + 1, 1, angleJitterDeg);

    collectBranchSegments(
      fullEnd.endX,
      fullEnd.endY,
      nextLength,
      fullEnd.endTangentRad - branchAngleRad + leftJitter,
      depth + 1,
      maxDepth,
      reduction,
      branchAngleRad,
      angleJitterDeg,
      layerIndex,
      spokeIndex,
      0,
      explodeTimer,
      stageDelay,
      fadeDecay,
      gravityAmount,
      baseLength,
      baseStrokeWidth,
      strokeColor,
      segmentsByColor,
      sparkleAmount
    );

    collectBranchSegments(
      fullEnd.endX,
      fullEnd.endY,
      nextLength,
      fullEnd.endTangentRad + branchAngleRad + rightJitter,
      depth + 1,
      maxDepth,
      reduction,
      branchAngleRad,
      angleJitterDeg,
      layerIndex,
      spokeIndex,
      1,
      explodeTimer,
      stageDelay,
      fadeDecay,
      gravityAmount,
      baseLength,
      baseStrokeWidth,
      strokeColor,
      segmentsByColor,
      sparkleAmount
    );
  }
}

function evaluateParabolaPoints(x0, y0, length, angleRad, gravity, extentProgress) {
  const steps = Math.max(3, Math.round(10 * extentProgress));
  const points = [{ x: x0, y: y0 }];

  for (let s = 1; s <= steps; s++) {
    const t = (s / steps) * extentProgress;
    const px = x0 + Math.cos(angleRad) * length * t;
    const py = y0 + Math.sin(angleRad) * length * t + 0.5 * gravity * t * t;
    points.push({ x: px, y: py });
  }

  const endT = extentProgress;
  const endX = x0 + Math.cos(angleRad) * length * endT;
  const endY = y0 + Math.sin(angleRad) * length * endT + 0.5 * gravity * endT * endT;
  const dx = Math.cos(angleRad) * length;
  const dy = Math.sin(angleRad) * length + gravity * endT;
  const endTangentRad = Math.atan2(dy, dx);

  return { points, endX, endY, endTangentRad };
}

function getBranchJitter(layer, bIndex, depth, side, maxJitterDeg) {
  if (maxJitterDeg <= 0) return 0;
  const seed = (layer * 997 + bIndex * 101 + depth * 31 + side * 13) % 1000;
  const normalized = (seed / 1000) * 2 - 1;
  return (normalized * maxJitterDeg * Math.PI) / 180;
}

function physicalExplosionEase(t, k = 4.5) {
  const clamped = Math.max(0, Math.min(1, t));
  return (1 - Math.exp(-k * clamped)) / (1 - Math.exp(-k));
}

function addSpark(x, y, colorHex) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.8 + Math.random() * 2.8;
  sparkParticles.push({
    x: x,
    y: y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: 1.5 + Math.random() * 2.5,
    alpha: 255,
    decay: 3.5 + Math.random() * 6.5,
    colorHex: colorHex,
  });
}

function updateAndRenderSparks() {
  push();
  noStroke();
  for (let i = sparkParticles.length - 1; i >= 0; i--) {
    const p = sparkParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.vy += 0.085;
    p.alpha -= p.decay;

    if (p.alpha <= 0) {
      sparkParticles.splice(i, 1);
      continue;
    }

    const [r, g, b] = hexToRgb(p.colorHex);
    const twinkle = Math.random() > 0.15 ? 1 : 0.4;
    fill(r, g, b, p.alpha * twinkle);
    circle(p.x, p.y, p.size);
  }
  pop();
}

function easeOutCubic(x) {
  return 1 - (1 - x) ** 3;
}

function hexToRgb(hex) {
  let c = (hex || "#ffffff").replace("#", "").trim();
  if (c.length === 3) {
    c = c.split("").map(x => x + x).join("");
  }
  const n = Number.parseInt(c, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
