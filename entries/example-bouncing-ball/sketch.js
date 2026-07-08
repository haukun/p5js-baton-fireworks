// ============================================================
const TITLE = "Bouncing Journey";
const AUTHOR = "P5 Continue Team";
// ============================================================

let particles = [];

function setup() {
  colorMode(HSB, 360, 100, 100, 100);
  background(140, 40, 40);
}

function draw() {
  background(140, 40, 40);

  let progress = frameCount / 600;
  let x = 200;
  let y = progress * 800;

  // メインのボール - バウンドしながら落ちる
  let bounceOffset = sin(frameCount * 0.15) * (1 - progress) * 60;
  let ballX = x + bounceOffset;
  let ballY = y;

  // パーティクルを生成
  if (frameCount % 3 === 0) {
    particles.push({
      x: ballX,
      y: ballY,
      vx: random(-2, 2),
      vy: random(-3, 0),
      life: 60,
      hue: (frameCount * 0.6) % 360
    });
  }

  // パーティクル更新・描画
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life--;

    let alpha = map(p.life, 0, 60, 0, 80);
    noStroke();
    fill(p.hue, 80, 90, alpha);
    ellipse(p.x, p.y, p.life * 0.15);

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }

  // メインのボール描画
  let hue = (frameCount * 0.6) % 360;
  noStroke();

  // グロー効果
  for (let r = 50; r > 0; r -= 10) {
    fill(hue, 70, 90, map(r, 0, 50, 40, 5));
    ellipse(ballX, ballY, r);
  }

  // コアの球
  fill(hue, 50, 100);
  ellipse(ballX, ballY, 20);
}
