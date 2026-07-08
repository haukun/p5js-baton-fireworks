// ============================================================
const TITLE = "テスト花火3";
const AUTHOR = "Haukun";
// ============================================================

function setup() {
  background(255,128,128)
}

function draw() {
  background(128,128,255)
  for(r=0;r<TAU;r+=PI/32){
    circle(200+cos(r)*frameCount/3,400+sin(r)*frameCount/3,9)
  }
}
