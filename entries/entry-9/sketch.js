// ============================================================
const TITLE = "つぶやき花火";
const AUTHOR = "Haukun";
// ============================================================

t=I=0
draw=_=>{background(0,t?9:!createCanvas(W=720,W)+W)
T=t++%270
T?a*=.997:a=6+!(I+=W)
for(i=W;i--;)stroke(W,U=T-90,99,W-T*3)+circle(U<0?200:cos(A=(N=noise(i,I))*W)*(S=U*N*a)+200,U<0?W-a**2*T/5:sin(A)*S+300+S**1.8/W,cos(T/55)**4*6)}
