// ============================================================
const TITLE = "First Fireworks";
const AUTHOR = "p5js baton project";
// ============================================================

function setup() {
  colorMode(HSB);
  createCanvas(400,800)
  background(160, 90, 0);
  noStroke();
}

t=0

function draw() {
  t++;
  background(160, 90, 0,.05);
  fill(30-t/10,t/5,100)
  for(r=0;r<TAU;r+=PI/8){
    circle(200+cos(r)*t/2,300+sin(r)*t/2,t/9)
  }
}