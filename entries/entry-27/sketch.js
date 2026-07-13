// ============================================================
const TITLE = "TEDUTU HANABI";
const AUTHOR = "黒狐";
// ============================================================

function setup() {
	createCanvas(400,800);
	const bs=[];
	for(let k=0;k<500;k++){
		const v=8+4*random();
		const t=PI*1.35+0.3*PI*random();
		bs.push({
			x:200+10*random(),y:800+10*random(),px:200,py:750,w:4,
			vx:v*cos(t),vy:(1+5*random())*v*sin(t),delay:floor(random(120))
		});
	}
	let j=0;
	background(0);
	draw=()=>{
		blendMode(MULTIPLY);
	background(230,200,180);
		blendMode(ADD);
		stroke(255,240,225);
		for(const b of bs){
			if(b.delay > frameCount)continue;
			b.vy+=0.2;
			b.x+=b.vx;
			b.y+=b.vy;
			if(b.vx*b.vx+b.vy*b.vy>100){
				b.vx*=0.9;
				b.vy*=0.9;
			}
			strokeWeight(b.w);
			b.w-=0.05;
			line(b.x,b.y,b.px,b.py);
			b.px=b.x;b.py=b.y;
			if(b.w<0 && j<210){
				b.x=200+10*random();
				b.y=800+10*random();b.px=b.x;b.py=b.y;b.w=4;
					const v=8+4*random();
		const t=PI*1.35+0.3*PI*random();
				b.vx=v*cos(t);b.vy=(1+5*random())*v*sin(t);
			}
		}
		j++;
	}
}
