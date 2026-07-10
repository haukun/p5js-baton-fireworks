// ============================================================
const TITLE = "HANABI";
const AUTHOR = "p5js baton team";
// ============================================================

function setup() {
  createCanvas(400, 800);
  background(0)
}
var a=[]
var i=0
function draw() {
  background(0);
  if(frameCount%10==1){
    a[i++]={x:random(width),y:random(height-200),t:6,d:0}
  }

  a.map(p=>{
    p.t*=0.98
    p.d+=2
    for(r=0;r<TAU;r+=PI/10){
      circle(p.x+cos(r)*p.d,p.y+sin(r)*p.d,p.t)
    }
  })
}