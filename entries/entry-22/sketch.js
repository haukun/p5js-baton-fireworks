// ============================================================
const TITLE = "Summer Memories";
const AUTHOR = "Kazoops";
// ============================================================

// グローバル変数定義
let fireworks = [];
let gravity;
const FIREWORK_TYPES = ['KIKU', 'BOTAN', 'KAMURO', 'SENRIN', 'STAR_MINE'];

// p5.js セットアップ関数
function setup() {
  // 画面全体に合わせてキャンバスを作成
  createCanvas(windowWidth, windowHeight);
  
  // HSBの透明度の最大値を255に指定。
  // これにより、花火の光の尾が突然消えることなく最後まで美しく滑らかにフェードアウトします。
  colorMode(HSB, 255, 255, 255, 255);
  
  // 内部の400x800空間に対する重力
  gravity = createVector(0, 0.2);
  background(0);
}

// 画面サイズが変更されたらキャンバスも合わせる
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// p5.js 描画ループ関数
function draw() {
  // 通常の描画モードに戻して、残像用の半透明な黒を描画
  blendMode(BLEND);
  background(0, 0, 0, 50);

  // どんな画面サイズでも「400 x 800」の比率を保ちながら中央に最大化して表示
  let scaleFactor = min(windowWidth / 400, windowHeight / 800);
  translate((windowWidth - 400 * scaleFactor) / 2, (windowHeight - 800 * scaleFactor) / 2);
  scale(scaleFactor);

  // 【再生速度を 1.5倍 にする処理】
  let updateSteps = (frameCount % 2 === 0) ? 2 : 1;

  for (let step = 0; step < updateSteps; step++) {
    // 打ち上げ確率を高く維持
    if (random(1) < 0.045) {
      let type = random(FIREWORK_TYPES);
      fireworks.push(new Firework(type));
    }

    // 花火の状態更新
    for (let i = fireworks.length - 1; i >= 0; i--) {
      fireworks[i].update();
      if (fireworks[i].done()) {
        fireworks.splice(i, 1);
      }
    }
  }

  // 光が重なった部分が激しく発光する「加算合成」モード
  blendMode(ADD);

  // 更新が終わった花火をまとめて描画
  for (let i = 0; i < fireworks.length; i++) {
    fireworks[i].show();
  }
}


// Firework Class
class Firework {
  constructor(type) {
    this.type = type;
    this.hu = (this.type === 'KAMURO') ? 40 : random(255);
    this.exploded = false;
    this.particles = [];

    if (this.type === 'STAR_MINE') {
      this.baseX = random(400 * 0.1, 400 * 0.9);
      this.launchCount = 0;
      this.totalLaunches = random(30, 80); 
      this.launchInterval = 2; 
      this.timer = this.launchInterval;
      this.rockets = [];
      this.exploded = true; 
    } else {
      this.firework = new Particle(random(400), 800, this.hu, this.type);
    }
  }

  done() {
    if (this.type === 'STAR_MINE') {
      return this.launchCount >= this.totalLaunches && this.rockets.length === 0 && this.particles.length === 0;
    }
    return this.exploded && this.particles.length === 0;
  }

  update() {
    if (this.type === 'STAR_MINE') {
      this.updateStarMine();
      return;
    }

    if (!this.exploded) {
      this.firework.update();
      if (this.firework.vel.y >= 0) {
        this.exploded = true;
        this.explode();
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].done()) {
        this.particles.splice(i, 1);
      }
    }
  }
  
  updateStarMine() {
    this.timer--;
    if (this.timer <= 0 && this.launchCount < this.totalLaunches) {
      const vx = random(-3, 3);
      const vy = random(-16, -12);
      const rocket = new Particle(this.baseX, 800, this.hu + random(-25, 25), 'STAR_MINE_ROCKET');
      rocket.vel = createVector(vx, vy);
      this.rockets.push(rocket);
      
      this.launchCount++;
      this.timer = this.launchInterval;
    }
    
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      this.rockets[i].update();
      if (this.rockets[i].vel.y >= 0) {
        this.explodeParticle(this.rockets[i]);
        this.rockets.splice(i, 1);
      }
    }
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].done()) {
        this.particles.splice(i, 1);
      }
    }
  }

  explodeParticle(rocket) {
    for (let i = 0; i < 80; i++) {
      let p = new Particle(rocket.pos.x, rocket.pos.y, rocket.hu, 'STAR_MINE_CHILD', true);
      p.vel = p5.Vector.random2D().mult(random(2, 9));
      this.particles.push(p);
    }
  }
  
  explode() {
    const x = this.firework.pos.x;
    const y = this.firework.pos.y;
    
    switch (this.type) {
      case 'SENRIN':
        for (let i = 0; i < 60; i++) {
           this.particles.push(new SubFirework(x, y, this.hu + random(-30, 30)));
        }
        break;
      case 'KAMURO':
        for (let i = 0; i < 500; i++) {
            let p = new Particle(x, y, this.hu, this.type, true);
            p.vel = p5.Vector.random2D().mult(random(2, 14));
            p.lifespan = 800;
            p.maxLifespan = 800; // KAMURO用の最大寿命もセットしておく（縮小計算用）
            this.particles.push(p);
        }
        break;
      default:
        const numParticles = (this.type === 'BOTAN') ? 350 : 450;
        for (let i = 0; i < numParticles; i++) {
            let p = new Particle(x, y, this.hu, this.type, true);
            p.vel = p5.Vector.random2D().mult(random(3, 16));
            this.particles.push(p);
        }
    }
  }
  
  show() {
    if (this.type === 'STAR_MINE') {
      for (let rocket of this.rockets) { rocket.show(); }
      for (let p of this.particles) { p.show(); }
      return;
    }
    
    if (!this.exploded) {
      this.firework.show();
    }
    
    // BOTANの背景フラッシュ処理
    if (this.exploded && this.type === 'BOTAN') {
       blendMode(BLEND);
       background(0, 0, 0, 180);
       blendMode(ADD);
    }
    
    for (let p of this.particles) {
      p.show();
    }
  }
}


// Particle Class
class Particle {
  constructor(x, y, hu, type, isChild = false) {
    this.pos = createVector(x, y);
    this.type = type;
    this.hu = hu;
    
    // 現在の寿命と、大きさを計算するための初期最大寿命を記憶
    this.lifespan = 255;
    this.maxLifespan = 255;
    
    this.isChild = isChild;

    if (this.isChild) {
      this.vel = p5.Vector.random2D().mult(random(2, 8));
    } else {
      this.vel = createVector(0, random(-17, -13));
    }
    this.acc = createVector(0, 0);
  }

  applyForce(force) { this.acc.add(force); }

  update() {
    if (this.type === 'KAMURO') { this.applyForce(gravity.copy().mult(0.5)); }
    
    if (this.isChild) {
      this.vel.mult(0.95);
      this.lifespan -= 4; 
    }
    
    if (this.type !== 'STAR_MINE_CHILD') {
      this.applyForce(gravity);
    }
    
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  show() {
    stroke(this.hu, 255, 255, this.lifespan);
    
    let w;
    if (this.isChild) {
      // 【追加演出】爆発した瞬間の火花は従来の1.5倍(太さ4.5)
      // そして寿命(lifespan)が0になるにつれて、太さも0に向かって小さくなる
      let ratio = max(0, this.lifespan) / this.maxLifespan; // 1.0 から 0.0 へ減っていく割合
      w = 4.5 * ratio;
    } else {
      // 打ち上がるロケットは太さ5
      w = 5;
    }
    
    strokeWeight(w);
    point(this.pos.x, this.pos.y);
  }

  done() { return this.lifespan < 0; }
}


// SubFirework Class
class SubFirework extends Particle {
  constructor(x, y, hu) {
     super(x, y, hu, 'SENRIN_CHILD', false);
     this.vel = p5.Vector.random2D().mult(random(5, 12));
     this.particles = [];
     this.exploded = false;
     this.delay = random(10, 40);
  }
  
  update() {
    this.vel.mult(0.98);
    this.pos.add(this.vel);
    this.applyForce(gravity);
    
    this.delay--;
    if (this.delay < 0 && !this.exploded) {
      this.exploded = true;
      for (let i = 0; i < 40; i++) {
         let p = new Particle(this.pos.x, this.pos.y, this.hu, 'SENRIN_CHILD', true);
         p.vel = p5.Vector.random2D().mult(random(1.5, 6));
         this.particles.push(p);
      }
    }
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].done()) { this.particles.splice(i, 1); }
    }
  }

  show() {
    if (!this.exploded) {
       stroke(this.hu, 255, 255);
       strokeWeight(3);
       point(this.pos.x, this.pos.y);
    }
    for (let p of this.particles) {
       p.show();
    }
  }

  done() { return this.exploded && this.particles.length === 0; }
}
