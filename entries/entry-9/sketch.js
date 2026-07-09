// ============================================================
const TITLE = "テスト";
const AUTHOR = "Haukun";
// ============================================================

function setup() {
  createCanvas(400, 800, WEBGL);
}
h =0
function draw() {
  colorMode(HSB)
  if(frameCount%10==1){
    h=random(360)
  }
  background(h,50,50);
  rotateX(frameCount/20)
  rotateY(frameCount/50)
  box(100)
}
