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
  fill(120-t/5,t/10,100)
  for(r=PI/8;r<TAU;r+=PI/4){
    circle(200+cos(r)*t/4,400+sin(r)*t/4,t/8)
  }
}