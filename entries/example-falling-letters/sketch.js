// ============================================================
const TITLE = "Rain of Words";
const AUTHOR = "P5 Continue Team";
// ============================================================

let letters = [];
let message = "HELLO WORLD P5JS CREATIVE CODING";

function setup() {
  background(10, 10, 30);
  textAlign(CENTER, CENTER);
}

function draw() {
  background(10, 10, 30);

  let progress = frameCount / 600;

  // 中心を通過するメインオブジェクト（光の玉）
  let mainX = 200;
  let mainY = progress * 800;

  // メインの軌跡に沿って文字を生成
  if (frameCount % 8 === 0) {
    let char = message.charAt(int(random(message.length)));
    letters.push({
      x: mainX + random(-30, 30),
      y: mainY,
      char: char,
      size: random(12, 28),
      alpha: 255,
      drift: random(-0.5, 0.5),
      fallSpeed: random(0.3, 1.2)
    });
  }

  // 文字の描画・更新
  for (let i = letters.length - 1; i >= 0; i--) {
    let l = letters[i];
    l.x += l.drift;
    l.y += l.fallSpeed;
    l.alpha -= 2;

    noStroke();
    fill(180, 220, 255, l.alpha);
    textSize(l.size);
    text(l.char, l.x, l.y);

    if (l.alpha <= 0) {
      letters.splice(i, 1);
    }
  }

  // メインの光の玉
  noStroke();
  for (let r = 40; r > 0; r -= 8) {
    let alpha = map(r, 0, 40, 200, 20);
    fill(200, 230, 255, alpha);
    ellipse(mainX, mainY, r);
  }
}
