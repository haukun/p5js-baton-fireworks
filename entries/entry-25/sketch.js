// ============================================================
const TITLE = "AntiGravity Fireworks";
const AUTHOR = "TSMEN";
// ============================================================

let fireworks = [];
let gravity;

function setup() {
  // 大会規定のサイズとフレームレート
  createCanvas(400, 800);
  frameRate(30);
  background(20, 24, 32); 
}

function draw() {
  // --- 背景の描画（残像効果） ---
  blendMode(BLEND);
  colorMode(RGB, 255, 255, 255, 255);
  noStroke();
  fill(20, 24, 32, 80); 
  rect(0, 0, width, height);

    // 「下」の概念を回転させる (300フレームで反時計回りに1回転)
    let rotateSpeed = TWO_PI / 300; 
  // 初期値 HALF_PI(真下) から角度を引いて反時計回りに回す
  let currentDownAngle = HALF_PI - frameCount * rotateSpeed;
  
  // 回転する重力の更新（スピードアップのため強め）
  let gravityMag = 0.5;
  gravity = p5.Vector.fromAngle(currentDownAngle).mult(gravityMag);

  // --- 花火の描画 ---
  blendMode(ADD); 
  colorMode(HSB, 360, 100, 100, 1);

    // 10秒間(300フレーム)の演出タイムライン（テンポアップ）
    if (frameCount === 1) {
    fireworks.push(new Firework(-100, currentDownAngle));
    fireworks.push(new Firework(100, currentDownAngle));
  }
  
  if (frameCount > 10 && frameCount < 220 && random(1) < 0.12) {
    fireworks.push(new Firework(undefined, currentDownAngle));
  }
  
  if (frameCount === 220) {
    fireworks.push(new Firework(-120, currentDownAngle));
    fireworks.push(new Firework(0, currentDownAngle));
    fireworks.push(new Firework(120, currentDownAngle));
  }
    for (let i = fireworks.length - 1; i >= 0; i--) {
    fireworks[i].update();
    fireworks[i].show();
    
    if (fireworks[i].done()) {
      fireworks.splice(i, 1);
    }
  }
}

// 花火全体を管理するクラス
class Firework {
  constructor(startOffset, downAngle) {
    this.baseHue = random(360);
    this.timer = 0; // 保険用のタイマー
    
    // キャンバスの中心から「現在の画面の端（下）」までの距離を計算
    let c = cos(downAngle);
    let s = sin(downAngle);
    // ゼロ除算を防ぎつつ、長方形の枠との交点を求める
    let rX = abs(c) > 0.001 ? abs(200 / c) : 9999;
    let rY = abs(s) > 0.001 ? abs(400 / s) : 9999;
    let r = min(rX, rY);
    
    // 現在の「一番下」の座標
    let baseX = 200 + c * r;
    let baseY = 400 + s * r;
    
    // 左右にずらして打ち上げ位置を散らす
    let offset = startOffset !== undefined ? startOffset : random(-150, 150);
    let startX = baseX + cos(downAngle - HALF_PI) * offset;
    let startY = baseY + sin(downAngle - HALF_PI) * offset;
    
    // 現在の「上（下の反対）」に向かって打ち上げる速度を距離から逆算
    let speed = sqrt(2 * 0.5 * r) * random(0.8, 1.2);
    
    this.firework = new Particle(startX, startY, this.baseHue, true, downAngle + PI, speed);
    
    this.exploded = false;
    this.particles = [];
  }

  done() {
    return this.exploded && this.particles.length === 0;
  }

  update() {
    if (!this.exploded) {
      this.firework.applyForce(gravity);
      this.firework.update();
      this.timer++;
      
      // 速度ベクトルと現在の重力ベクトルの内積が正になったら(落下し始めたら)爆発
      // 重力が回っているので、軌道が曲がりきった絶妙なタイミングで爆発します
      if (p5.Vector.dot(this.firework.vel, gravity) >= 0 || this.timer > 45) {
        this.exploded = true;
        this.explode();
      }
    }
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].applyForce(gravity);
      this.particles[i].update();
      if (this.particles[i].done()) {
        this.particles.splice(i, 1);
      }
    }
  }

  explode() {
    let numParticles = floor(random(400, 501));
    for (let i = 0; i < numParticles; i++) {
      // 爆発時はダミーの角度と速度を渡す（Particleクラス内でランダム化）
      let p = new Particle(this.firework.pos.x, this.firework.pos.y, this.baseHue, false, 0, 0);
      this.particles.push(p);
    }
  }

  show() {
    if (!this.exploded) {
      this.firework.show();
    }
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].show();
    }
  }
}

// 個々の点（打ち上げ種 ＆ 爆発後の粒）を管理するクラス
class Particle {
  constructor(x, y, baseHue, isSeed, launchAngle, launchSpeed) {
    this.pos = createVector(x, y);
    this.isSeed = isSeed;
    this.lifespan = 1.0; 
    
    this.hue = (baseHue + random(-20, 20) + 360) % 360;
    this.sat = random(60, 100); 
    this.bri = random(80, 100); 

    this.noiseOffset = random(1000);

    if (this.isSeed) {
      this.vel = p5.Vector.fromAngle(launchAngle).mult(launchSpeed);
      this.acc = createVector(0, 0);
      this.size = random(3, 6);
    } else {
      let angle = random(TWO_PI); 
      // 爆発の勢い（スピードアップ）
      let speed = random(5, 25) * random(0.5, 1.2); 
      this.vel = p5.Vector.fromAngle(angle).mult(speed);
      this.acc = createVector(0, 0);
      this.size = random(2, 4);
      // 消える速さ（テンポアップ）
      this.decay = random(0.025, 0.05); 
    }
  }

  applyForce(force) {
    this.acc.add(force);
  }

  update() {
    if (this.isSeed) {
      // 打ち上げ時もノイズで少しブレさせる
      let nx = map(noise(this.pos.x * 0.01, frameCount * 0.05 + this.noiseOffset), 0, 1, -0.5, 0.5);
      let ny = map(noise(this.pos.y * 0.01, frameCount * 0.05 + this.noiseOffset + 100), 0, 1, -0.5, 0.5);
      this.vel.x += nx;
      this.vel.y += ny;
    } else {
      // 強い空気抵抗でシュッと広がる
      this.vel.mult(0.88); 
      this.lifespan -= this.decay;

      // X, Y 両方のノイズでウネウネ散る
      let nx = map(noise(this.pos.x * 0.01, this.pos.y * 0.01, frameCount * 0.05 + this.noiseOffset), 0, 1, -1, 1);
      let ny = map(noise(this.pos.x * 0.01 + 100, this.pos.y * 0.01 + 100, frameCount * 0.05 + this.noiseOffset), 0, 1, -1, 1);
      this.vel.x += nx * 1.5;
      this.vel.y += ny * 1.5;
    }
    
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0); 
  }

  done() {
    return this.lifespan < 0;
  }

  show() {
    if (!this.isSeed && this.lifespan < 0) return;

    let currentCoreSize = this.size;
    let currentGlowSize = this.size * 3.5;
    let alphaNum, coreAlpha;

    if (this.isSeed) {
      alphaNum = 0.3;
      coreAlpha = 1;
    } else {
      alphaNum = this.lifespan * 0.5;
      coreAlpha = this.lifespan;
      let expandRatio = 1.0 - this.lifespan;
      
      currentCoreSize += expandRatio * 3.0; 
      currentGlowSize += expandRatio * 10.0; 
    }

    strokeWeight(currentGlowSize); 
    stroke(this.hue, this.sat, this.bri, alphaNum);
    point(this.pos.x, this.pos.y);
    
    strokeWeight(currentCoreSize);
    stroke(this.hue, this.sat, 100, coreAlpha); 
    point(this.pos.x, this.pos.y);
  }
}
