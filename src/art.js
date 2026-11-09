/* ===== DESSINS =====
   Tout est peint au canvas une fois au chargement, aucune image externe. */
const Art=(function(){
'use strict';
const TAU=Math.PI*2,S=280,INK='#1b0a13';
const DISPLAY='"Titan One","Arial Black",Impact,sans-serif';
function mk(w,h){const c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);return c;}
function lin(c,x0,y0,x1,y1,st){const g=c.createLinearGradient(x0,y0,x1,y1);for(const [o,k] of st)g.addColorStop(o,k);return g;}
function rad(c,x,y,r0,r1,st,fx,fy){const g=c.createRadialGradient(fx===undefined?x:fx,fy===undefined?y:fy,r0,x,y,r1);for(const [o,k] of st)g.addColorStop(o,k);return g;}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function poly(c,p){c.beginPath();c.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)c.lineTo(p[i],p[i+1]);c.closePath();}
function paint(c,f,s,w){if(f){c.fillStyle=f;c.fill();}if(s!==null){c.lineJoin='round';c.lineCap='round';c.strokeStyle=s===undefined?INK:s;c.lineWidth=w||7;c.stroke();}}
function circle(c,x,y,r){c.beginPath();c.arc(x,y,r,0,TAU);}
function ell(c,x,y,a,b,rot){c.beginPath();c.ellipse(x,y,a,b,rot||0,0,TAU);}
function seeded(s){return function(){s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function star4(c,x,y,r,col,a){
  c.save();c.globalAlpha=a===undefined?1:a;c.fillStyle=col;c.beginPath();
  for(let i=0;i<8;i++){const an=i/8*TAU,R=i%2?r*.16:r;c[i?'lineTo':'moveTo'](x+Math.cos(an)*R,y+Math.sin(an)*R);}
  c.closePath();c.fill();c.restore();
}
function halo(c,col,r,x,y){
  x=x===undefined?S/2:x;y=y===undefined?S/2:y;
  c.fillStyle=rad(c,x,y,r*.1,r,[[0,col],[1,col.replace(/[\d.]+\)$/,'0)')]]);
  c.fillRect(0,0,S,S);
}

/* Lettrage façon enseigne de casino : extrusion, double contour, dégradé cassé à mi-hauteur */
const STYLES={
  gold:{top:'#fff6b0',mid:'#ffd230',mid2:'#ffa90f',bot:'#e06204',edge:'#ffeb9a',ink:'#3a1200',deep:'#7a2c00'},
  fire:{top:'#ffe48a',mid:'#ff8a14',mid2:'#ff4a10',bot:'#c20d1e',edge:'#ffd08a',ink:'#2a0408',deep:'#6b0a12'},
  ice:{top:'#f1feff',mid:'#7fe9ff',mid2:'#2fb4ff',bot:'#1a50d6',edge:'#d6fbff',ink:'#04143f',deep:'#0a2a7a'},
  violet:{top:'#ffe9ff',mid:'#ff8cf0',mid2:'#c94bff',bot:'#6a1bd1',edge:'#ffd2fb',ink:'#1e0542',deep:'#430d85'},
  green:{top:'#f4ffd8',mid:'#a4f55a',mid2:'#3fd65c',bot:'#0c8a4a',edge:'#e3ffc2',ink:'#03301a',deep:'#075a30'},
  white:{top:'#ffffff',mid:'#fff6d8',mid2:'#ffe08a',bot:'#ffb03a',edge:'#ffffff',ink:'#2d1208',deep:'#6b2c08'},
  rainbow:{rainbow:true,top:'#fff',mid:'#fff',mid2:'#fff',bot:'#fff',edge:'#ffffff',ink:'#1a0536',deep:'#46107e'},
};
function fancy(c,text,x,y,size,style){
  const st=typeof style==='string'?STYLES[style]:style;
  c.font=size+'px '+DISPLAY;c.textAlign='center';c.textBaseline='alphabetic';c.lineJoin='round';c.lineCap='round';
  const d=size*.09;
  c.strokeStyle=st.deep;c.fillStyle=st.deep;c.lineWidth=size*.2;
  for(let i=d;i>0;i-=Math.max(1,size/60))c.strokeText(text,x,y+i);
  c.strokeStyle=st.ink;c.lineWidth=size*.2;c.strokeText(text,x,y);
  c.strokeStyle=st.edge;c.lineWidth=size*.075;c.strokeText(text,x,y);
  if(st.rainbow){
    const w=c.measureText(text).width;
    c.fillStyle=lin(c,x-w/2,0,x+w/2,0,[[0,'#ff4d6d'],[.2,'#ffb02e'],[.4,'#f6ff5e'],[.6,'#4dffa6'],[.8,'#4dc9ff'],[1,'#d36bff']]);
  }else{
    c.fillStyle=lin(c,0,y-size*.8,0,y+size*.05,[[0,st.top],[.48,st.mid],[.52,st.mid2],[1,st.bot]]);
  }
  c.fillText(text,x,y);
  c.fillStyle=lin(c,0,y-size*.8,0,y-size*.44,[[0,'rgba(255,255,255,.55)'],[1,'rgba(255,255,255,0)']]);
  c.fillText(text,x,y);
}

/* --- Symboles --- */
function goggle(c,x,y,r,px,py){
  circle(c,x,y,r);paint(c,lin(c,x-r,y-r,x+r,y+r,[[0,'#ffeeb0'],[.5,'#cf8f30'],[1,'#7a4a12']]),INK,7);
  circle(c,x,y,r*.74);paint(c,rad(c,x,y,2,r*.8,[[0,'#f2fffb'],[.7,'#c4f6ee'],[1,'#58c4bb']]),'#3a1c10',4);
  circle(c,x+px,y+py,r*.38);paint(c,'#1a0d18',null);
  circle(c,x+px-r*.13,y+py-r*.15,r*.13);paint(c,'#fff',null);
  c.save();circle(c,x,y,r*.74);c.clip();c.globalAlpha=.42;c.fillStyle='#fff';
  poly(c,[x-r,y-r*.2,x-r*.15,y-r,x+r*.22,y-r,x-r,y+r*.34]);c.fill();c.restore();
}
function stick(c,x,y,rot,w,h){
  c.save();c.translate(x,y);c.rotate(rot);
  rr(c,-w/2,-h/2,w,h,w*.22);paint(c,lin(c,-w/2,0,w/2,0,[[0,'#7a0f14'],[.28,'#ff5a3c'],[.55,'#e0261f'],[1,'#6e0c12']]),INK,6);
  c.fillStyle='rgba(255,255,255,.26)';rr(c,-w*.3,-h*.44,w*.16,h*.88,w*.08);c.fill();
  rr(c,-w/2,-h/2,w,h*.1,w*.2);paint(c,'#2b1a24',INK,4);
  rr(c,-w/2,h/2-h*.1,w,h*.1,w*.2);paint(c,'#2b1a24',INK,4);
  c.restore();
}
function fuseSpark(c,x,y,r){
  c.fillStyle=rad(c,x,y,1,r*2.4,[[0,'rgba(255,240,170,.95)'],[.35,'rgba(255,150,40,.6)'],[1,'rgba(255,90,0,0)']]);
  c.fillRect(x-r*3,y-r*3,r*6,r*6);
  star4(c,x,y,r*1.5,'#fff');star4(c,x+r*.7,y-r*.8,r*.7,'#ffe27a');
}
function mole(c){
  halo(c,'rgba(255,170,60,.55)',140);
  for(const sx of [-1,1]){ell(c,140+sx*88,80,27,25);paint(c,lin(c,0,52,0,108,[[0,'#8b5a3e'],[1,'#553020']]));ell(c,140+sx*88,82,13,12);paint(c,'#e59aa0',null);}
  ell(c,140,150,106,102);paint(c,rad(c,140,150,10,120,[[0,'#ad7a54'],[.6,'#7f5037'],[1,'#4e2b20']],112,96),INK,8);
  c.save();ell(c,140,150,102,98);c.clip();
  c.fillStyle=lin(c,0,96,0,128,[[0,'#47303c'],[1,'#20121a']]);c.fillRect(30,98,220,27);
  c.restore();
  ell(c,140,195,68,50);paint(c,lin(c,0,150,0,245,[[0,'#f6d7b1'],[1,'#d39c6e']]),'rgba(60,25,15,.55)',4);
  ell(c,140,168,27,19);paint(c,rad(c,140,168,2,30,[[0,'#ffbdca'],[1,'#de4a68']],132,161),INK,6);
  ell(c,131,161,7,4,-.4);paint(c,'rgba(255,255,255,.88)',null);
  c.strokeStyle=INK;c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(140,187);c.lineTo(140,201);c.moveTo(104,203);c.quadraticCurveTo(140,226,176,203);c.stroke();
  rr(c,126,207,13,25,4);paint(c,'#fffbe9',INK,4);rr(c,141,207,13,25,4);paint(c,'#fffbe9',INK,4);
  goggle(c,95,112,45,8,3);goggle(c,185,112,45,6,5);
  rr(c,126,104,28,16,5);paint(c,'#7a4a12',INK,5);
  poly(c,[62,226,218,226,140,278]);paint(c,lin(c,0,226,0,278,[[0,'#ff4438'],[1,'#a3101c']]),INK,6);
  for(let i=0;i<5;i++){circle(c,92+i*24,237+(i%2)*5,4);paint(c,'#ffe7c0',null);}
  stick(c,226,212,-.55,24,76);
  c.strokeStyle='#efe2c4';c.lineWidth=5;c.beginPath();c.moveTo(247,178);c.quadraticCurveTo(262,160,252,142);c.stroke();
  fuseSpark(c,252,140,11);
}
function goldBlob(c,x,y,r){circle(c,x,y,r);paint(c,rad(c,x,y,r*.1,r*1.15,[[0,'#fff7bd'],[.45,'#ffcb33'],[1,'#b96b08']],x-r*.35,y-r*.4),'#6a3604',3.5);}
function cart(c){
  halo(c,'rgba(255,205,70,.5)',140,140,110);
  const R=seeded(9);
  for(let row=0;row<4;row++){
    const n=7-row*1.4|0,yy=120-row*24;
    for(let i=0;i<n;i++){const xx=140+(i-(n-1)/2)*(38-row*2)+R()*8-4;goldBlob(c,xx,yy+R()*8,20+R()*7);}
  }
  star4(c,88,86,26,'#fff');star4(c,186,58,32,'#fff');star4(c,214,108,20,'#fff');
  poly(c,[28,128,252,128,222,232,58,232]);paint(c,lin(c,0,128,0,232,[[0,'#5c7893'],[.45,'#364a63'],[1,'#1e2a3f']]),INK,8);
  rr(c,18,116,244,26,8);paint(c,lin(c,0,116,0,142,[[0,'#ffd983'],[.5,'#c98a2e'],[1,'#7a4a12']]),INK,6);
  c.fillStyle='rgba(255,255,255,.14)';poly(c,[50,146,106,146,92,226,70,226]);c.fill();
  for(let i=0;i<5;i++){const x=64+i*38;for(const y of [158,212]){circle(c,x,y,5.5);paint(c,'#c5d5e6','#121a2a',2.5);}}
  for(const x of [88,192]){
    circle(c,x,244,29);paint(c,lin(c,0,216,0,272,[[0,'#6e4a34'],[1,'#2a1a18']]),INK,7);
    for(let a=0;a<6;a++){c.strokeStyle='#a0805a';c.lineWidth=5;c.beginPath();c.moveTo(x,244);c.lineTo(x+Math.cos(a/6*TAU)*21,244+Math.sin(a/6*TAU)*21);c.stroke();}
    circle(c,x,244,8);paint(c,'#ffcf6a',INK,4);
  }
}
function lamp(c){
  halo(c,'rgba(255,180,50,.85)',136,140,150);
  c.strokeStyle=INK;c.lineWidth=15;c.beginPath();c.arc(140,70,46,Math.PI,0);c.stroke();
  c.strokeStyle='#cf9840';c.lineWidth=7;c.beginPath();c.arc(140,70,46,Math.PI,0);c.stroke();
  poly(c,[92,92,188,92,172,62,108,62]);paint(c,lin(c,92,0,188,0,[[0,'#7a4a12'],[.4,'#ffdf8f'],[1,'#7a4a12']]),INK,6);
  rr(c,76,92,128,16,6);paint(c,lin(c,0,92,0,108,[[0,'#ffe29a'],[1,'#94601e']]),INK,5);
  rr(c,86,108,108,112,20);paint(c,lin(c,0,108,0,220,[[0,'rgba(255,221,130,.9)'],[1,'rgba(255,140,30,.95)']]),INK,6);
  c.fillStyle=rad(c,140,176,4,70,[[0,'rgba(255,255,230,1)'],[1,'rgba(255,200,60,0)']]);c.fillRect(86,108,108,112);
  c.beginPath();c.moveTo(140,122);c.bezierCurveTo(172,158,170,198,140,206);c.bezierCurveTo(110,198,108,158,140,122);
  paint(c,lin(c,0,122,0,206,[[0,'#ffb32c'],[.55,'#ffe85c'],[1,'#fffbe8']]),'#c8540a',4);
  c.beginPath();c.moveTo(140,152);c.bezierCurveTo(154,172,152,194,140,198);c.bezierCurveTo(128,194,126,172,140,152);c.fillStyle='#fff';c.fill();
  c.fillStyle='rgba(255,255,255,.5)';rr(c,98,118,12,92,6);c.fill();
  for(const x of [114,166]){c.strokeStyle=INK;c.lineWidth=8;c.beginPath();c.moveTo(x,108);c.lineTo(x,220);c.stroke();c.strokeStyle='#d7a24a';c.lineWidth=3.5;c.beginPath();c.moveTo(x,108);c.lineTo(x,220);c.stroke();}
  rr(c,70,218,140,28,9);paint(c,lin(c,0,218,0,246,[[0,'#ffe29a'],[1,'#7f5016']]),INK,6);
  rr(c,88,244,104,14,5);paint(c,'#5e3a10',INK,5);
}
function pick(c){
  halo(c,'rgba(120,200,255,.42)',140);
  for(const a of [-.78,.78]){
    c.save();c.translate(140,146);c.rotate(a);
    rr(c,-13,-112,26,232,11);paint(c,lin(c,-13,0,13,0,[[0,'#6d3f1d'],[.45,'#c88a4a'],[1,'#5a3216']]),INK,7);
    c.strokeStyle='rgba(60,30,10,.55)';c.lineWidth=2.5;for(let i=0;i<5;i++){c.beginPath();c.moveTo(-6+i*3,-60+i*30);c.lineTo(-6+i*3,-30+i*30);c.stroke();}
    rr(c,-16,70,32,44,8);paint(c,lin(c,0,70,0,114,[[0,'#d24a3a'],[1,'#7a1820']]),INK,6);
    c.beginPath();c.moveTo(-118,-52);c.quadraticCurveTo(-60,-124,0,-126);c.quadraticCurveTo(60,-124,118,-52);c.quadraticCurveTo(60,-92,0,-90);c.quadraticCurveTo(-60,-92,-118,-52);
    paint(c,lin(c,0,-126,0,-52,[[0,'#f6fcff'],[.45,'#a9c4dc'],[1,'#50688a']]),INK,7);
    rr(c,-22,-132,44,48,9);paint(c,lin(c,-22,0,22,0,[[0,'#6c7f99'],[.5,'#dfeaf5'],[1,'#47597a']]),INK,6);
    c.restore();
  }
  star4(c,62,62,26,'#fff');star4(c,222,70,20,'#fff');
}
const GEMS={
  A:{hi:'#ffd5dc',lit:'#ff6c84',mid:'#e8214a',dark:'#a10d33',deep:'#5e0720'},
  K:{hi:'#d5e8ff',lit:'#6fb1ff',mid:'#2a6cf0',dark:'#1540a8',deep:'#0a2263'},
  Q:{hi:'#cffff0',lit:'#55eeaf',mid:'#10b56a',dark:'#097a4a',deep:'#04462c'},
  J:{hi:'#f4dcff',lit:'#ca80ff',mid:'#9333e6',dark:'#6217a8',deep:'#380b66'},
  T:{hi:'#fff1c8',lit:'#ffc65a',mid:'#f08c12',dark:'#b75c08',deep:'#6d3404'},
};
function gem(c,key,letter){
  const g=GEMS[key],cx=140,cy=144;
  c.fillStyle=rad(c,cx,cy,30,142,[[0,g.lit+'aa'],[1,g.lit+'00']]);c.fillRect(0,0,S,S);
  const out=[[140,16],[250,82],[250,206],[140,272],[30,206],[30,82]];
  const inn=out.map(([x,y])=>[cx+(x-cx)*.66,cy+(y-cy)*.66]);
  const sh=[g.hi,g.lit,g.mid,g.deep,g.dark,g.lit];
  poly(c,out.flat());paint(c,g.dark,INK,10);
  for(let i=0;i<6;i++){const j=(i+1)%6;poly(c,[out[i][0],out[i][1],out[j][0],out[j][1],inn[j][0],inn[j][1],inn[i][0],inn[i][1]]);paint(c,sh[i],g.deep,2);}
  poly(c,inn.flat());paint(c,lin(c,0,cy-90,0,cy+90,[[0,g.lit],[.5,g.mid],[1,g.dark]]),g.deep,3);
  c.fillStyle='rgba(255,255,255,.26)';poly(c,[inn[5][0],inn[5][1],inn[0][0],inn[0][1],inn[1][0],inn[1][1],cx+24,cy-24,cx-40,cy-8]);c.fill();
  fancy(c,letter,cx,cy+(letter==='10'?44:52),letter==='10'?122:150,{top:'#ffffff',mid:g.hi,mid2:'#ffffff',bot:g.hi,edge:g.lit,ink:g.deep,deep:INK});
  star4(c,78,66,18,'#fff');
}
function burst(c,cx,cy,R,r,n,st){
  c.beginPath();for(let i=0;i<n*2;i++){const a=i/(n*2)*TAU-TAU/4,q=i%2?r:R;c[i?'lineTo':'moveTo'](cx+Math.cos(a)*q,cy+Math.sin(a)*q);}c.closePath();
  paint(c,rad(c,cx,cy,8,R,st),INK,6);
}
function wild(c){
  halo(c,'rgba(255,120,30,.75)',140);
  burst(c,140,140,134,96,13,[[0,'#fff6b0'],[.5,'#ffc42c'],[1,'#f25d11']]);
  stick(c,92,132,-.2,50,178);stick(c,188,132,.2,50,178);stick(c,140,128,0,54,188);
  c.strokeStyle='#efe2c4';c.lineWidth=7;c.lineCap='round';c.beginPath();c.moveTo(140,36);c.bezierCurveTo(146,14,186,28,200,12);c.stroke();
  c.strokeStyle=INK;c.lineWidth=2;c.beginPath();c.moveTo(140,36);c.bezierCurveTo(146,14,186,28,200,12);c.stroke();
  fuseSpark(c,204,12,14);
  rr(c,16,150,248,84,22);paint(c,lin(c,0,150,0,234,[[0,'#6a1cc4'],[1,'#27085f']]),INK,8);
  rr(c,24,158,232,68,16);paint(c,null,'#ffd34d',4);
  fancy(c,'WILD',140,216,74,'gold');
}
function bonus(c){
  c.save();c.translate(140,140);
  for(let i=0;i<14;i++){c.rotate(TAU/14);c.fillStyle=i%2?'rgba(255,60,190,.75)':'rgba(70,235,235,.75)';poly(c,[0,0,-27,-140,27,-140]);c.fill();}
  c.restore();
  c.fillStyle=rad(c,140,140,50,150,[[0,'rgba(20,4,40,0)'],[1,'rgba(20,4,40,.0)']]);c.fillRect(0,0,S,S);
  rr(c,56,28,168,28,14);paint(c,lin(c,0,28,0,56,[[0,'#ff7a5c'],[.5,'#e5261f'],[1,'#7e0d16']]),INK,7);
  rr(c,126,50,28,90,5);paint(c,lin(c,126,0,154,0,[[0,'#8c9db3'],[.5,'#f4f9ff'],[1,'#5b6d86']]),INK,6);
  rr(c,48,128,184,118,16);paint(c,lin(c,0,128,0,246,[[0,'#c98a4a'],[.5,'#8d5426'],[1,'#532c12']]),INK,8);
  c.strokeStyle='rgba(50,22,6,.5)';c.lineWidth=3;for(let i=1;i<4;i++){c.beginPath();c.moveTo(52,128+i*30);c.lineTo(228,128+i*30);c.stroke();}
  rr(c,102,122,76,18,5);paint(c,lin(c,0,122,0,140,[[0,'#ffe29a'],[1,'#94601e']]),INK,5);
  for(const x of [70,210]){circle(c,x,146,11);paint(c,lin(c,x-11,0,x+11,0,[[0,'#ffb080'],[1,'#a24a18']]),INK,4);}
  c.strokeStyle='#d33';c.lineWidth=5;c.beginPath();c.moveTo(70,142);c.bezierCurveTo(50,100,20,110,14,84);c.stroke();
  c.strokeStyle='#ffcc33';c.beginPath();c.moveTo(210,142);c.bezierCurveTo(232,100,258,112,266,84);c.stroke();
  rr(c,10,172,260,76,22);paint(c,lin(c,0,172,0,248,[[0,'#00c9c0'],[1,'#00466b']]),INK,8);
  rr(c,18,180,244,60,15);paint(c,null,'#fff27a',4);
  fancy(c,'BONUS',140,230,60,'gold');
}
const NUGCOL={
  gold:[[0,'#ffee8a'],[.45,'#ffbf1f'],[1,'#a04f02']],
  mini:[[0,'#e6ffd4'],[.42,'#4fe07f'],[1,'#07724a']],
  minor:[[0,'#dcf2ff'],[.42,'#3fb5ff'],[1,'#0d3fae']],
  major:[[0,'#f8e0ff'],[.42,'#bb62ff'],[1,'#4f12a2']],
  grand:[[0,'#ffe0d8'],[.42,'#ff4d4d'],[1,'#8a0a24']],
  super:[[0,'#ffffff'],[.42,'#ffe27a'],[1,'#e0308f']],
  mult:[[0,'#ffe9ff'],[.42,'#ff5ae0'],[1,'#7a14b0']],
};
function nuggetShape(c,cx,cy,r,seed){
  const R=seeded(seed),n=11,p=[];
  for(let i=0;i<n;i++){const a=i/n*TAU,q=r*(.86+R()*.2);p.push([cx+Math.cos(a)*q,cy+Math.sin(a)*q*.92]);}
  c.beginPath();
  const m=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
  const s=m(p[n-1],p[0]);c.moveTo(s[0],s[1]);
  for(let i=0;i<n;i++){const e=m(p[i],p[(i+1)%n]);c.quadraticCurveTo(p[i][0],p[i][1],e[0],e[1]);}
  c.closePath();
}
function nugget(c,kind){
  const col=NUGCOL[kind],gl=col[1][1];
  c.fillStyle=rad(c,140,140,30,140,[[0,gl+'cc'],[1,gl+'00']]);c.fillRect(0,0,S,S);
  nuggetShape(c,140,142,112,kind.length*7+3);
  paint(c,rad(c,140,142,8,128,col,100,92),INK,8);
  c.save();nuggetShape(c,140,142,108,kind.length*7+3);c.clip();
  const R=seeded(44);
  for(let i=0;i<26;i++){
    const a=R()*TAU,d=Math.sqrt(R())*104,x=140+Math.cos(a)*d,y=142+Math.sin(a)*d*.9,r=6+R()*13;
    circle(c,x+r*.25,y+r*.3,r);c.fillStyle='rgba(90,35,0,.22)';c.fill();
    circle(c,x-r*.2,y-r*.25,r*.6);c.fillStyle='rgba(255,246,190,.2)';c.fill();
  }
  c.restore();
  star4(c,82,72,24,'#fff');star4(c,206,94,14,'#fff');
}

/* --- Pièces, éclats, billets : les sprites des effets --- */
function sprites(){
  const out={};
  {const cv=mk(72,72),c=cv.getContext('2d');circle(c,36,36,31);paint(c,lin(c,8,6,64,66,[[0,'#fff5b0'],[.5,'#ffc62e'],[1,'#c0720c']]),'#7a3f06',4);circle(c,36,36,22);paint(c,null,'#a85f08',3);c.font='34px '+DISPLAY;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#a85f08';c.fillText('€',36,38);c.fillStyle='#fff3b0';c.fillText('€',35,36);out.coin=cv;}
  {const cv=mk(64,64),c=cv.getContext('2d');c.fillStyle=rad(c,32,32,0,32,[[0,'rgba(255,255,255,1)'],[.25,'rgba(255,225,130,.95)'],[.55,'rgba(255,130,30,.4)'],[1,'rgba(255,60,0,0)']]);c.fillRect(0,0,64,64);out.spark=cv;}
  {const cv=mk(128,128),c=cv.getContext('2d');const R=seeded(5);for(let i=0;i<14;i++){const x=36+R()*56,y=36+R()*56,r=22+R()*20;c.fillStyle=rad(c,x,y,0,r,[[0,'rgba(92,80,86,.34)'],[1,'rgba(60,50,60,0)']]);c.fillRect(0,0,128,128);}out.smoke=cv;}
  {const cv=mk(256,256),c=cv.getContext('2d');c.fillStyle=rad(c,128,128,0,128,[[0,'rgba(255,255,255,1)'],[.3,'rgba(255,230,160,.75)'],[.65,'rgba(255,140,40,.2)'],[1,'rgba(255,90,0,0)']]);c.fillRect(0,0,256,256);out.flash=cv;}
  {const cv=mk(64,64),c=cv.getContext('2d');star4(c,32,32,31,'#fff');c.fillStyle=rad(c,32,32,0,16,[[0,'rgba(255,255,255,.9)'],[1,'rgba(255,255,255,0)']]);c.fillRect(0,0,64,64);out.star=cv;}
  {const cv=mk(110,56),c=cv.getContext('2d');rr(c,3,3,104,50,5);paint(c,lin(c,0,0,110,56,[[0,'#ffdf8a'],[1,'#e8a53c']]),'#6b3b08',3);rr(c,10,9,90,38,3);paint(c,null,'#9a6214',2);circle(c,55,28,15);paint(c,'#fff0bf','#9a6214',2);c.font='20px '+DISPLAY;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#8a540f';c.fillText('€',55,29);out.note=cv;}
  out.gems=Object.keys(GEMS).map(k=>{const g=GEMS[k],cv=mk(44,44),c=cv.getContext('2d');poly(c,[22,3,40,16,33,41,11,41,4,16]);paint(c,lin(c,0,3,44,41,[[0,g.hi],[.5,g.lit],[1,g.dark]]),g.deep,2.5);poly(c,[22,3,40,16,22,20,4,16]);paint(c,'rgba(255,255,255,.5)',null);return cv;});
  out.rocks=[0,1,2,3].map(i=>{const R=seeded(i+70),cv=mk(40,40),c=cv.getContext('2d'),p=[];for(let a=0;a<7;a++){const q=11+R()*8;p.push(20+Math.cos(a/7*TAU)*q,20+Math.sin(a/7*TAU)*q);}poly(c,p);paint(c,lin(c,0,0,40,40,[[0,'#7a6470'],[1,'#2a1c28']]),'#120812',2.5);return cv;});
  return out;
}

/* --- Décor --- */
function background(W,H){
  const cv=mk(W,H),c=cv.getContext('2d'),R=seeded(31);
  const vx=W/2,vy=H*.42,D=Math.max(W,H);
  c.fillStyle=rad(c,vx,vy,0,D*.66,[[0,'#ffb35c'],[.05,'#ef6c20'],[.16,'#7a2a1a'],[.38,'#301224'],[.72,'#140a1c'],[1,'#07040c']]);c.fillRect(0,0,W,H);
  // rochers sur les parois
  for(let i=0;i<260;i++){
    const a=R()*TAU,d=(.12+R()*.9)*D*.6,x=vx+Math.cos(a)*d*1.1,y=vy+Math.sin(a)*d*.8,r=(14+R()*44)*(d/D+.25)*1.5,p=[];
    for(let k=0;k<6;k++){const q=r*(.6+R()*.5);p.push(x+Math.cos(k/6*TAU)*q,y+Math.sin(k/6*TAU)*q*.7);}
    poly(c,p);c.fillStyle=R()<.5?'rgba(255,190,130,'+(.03+R()*.05)+')':'rgba(8,3,12,'+(.1+R()*.2)+')';c.fill();
  }
  // filons d'or
  for(let i=0;i<70;i++){
    const a=R()*TAU,d=(.2+R()*.8)*D*.56,x=vx+Math.cos(a)*d*1.1,y=vy+Math.sin(a)*d*.8;
    star4(c,x,y,3+R()*7,R()<.7?'#ffd55c':'#7ff0ff',.5+R()*.5);
  }
  // portiques de bois, du plus loin au plus proche
  const woodFar=[122,70,38],woodNear=[30,16,22];
  for(let i=8;i>=0;i--){
    const z=Math.pow(.7,i),hw=W*.56*z+D*.04*z,top=vy-H*.56*z-D*.03*z,bot=vy+H*.66*z,t=D*.05*z;
    const k=i/8;const col=woodFar.map((f,j)=>Math.round(woodNear[j]+(f-woodNear[j])*k));
    const dk='rgb('+col.join(',')+')',lt='rgb('+col.map(v=>Math.min(255,v+34)).join(',')+')';
    for(const sx of [-1,1]){
      const x=vx+sx*hw-(sx<0?0:t);
      c.fillStyle=lin(c,x,0,x+t,0,sx<0?[[0,dk],[1,lt]]:[[0,lt],[1,dk]]);c.fillRect(x,top,t,bot-top);
      c.save();c.strokeStyle='rgba(10,4,8,.55)';c.lineWidth=Math.max(1,z*3);c.strokeRect(x,top,t,bot-top);c.restore();
    }
    c.fillStyle=lin(c,0,top-t*.5,0,top+t*.7,[[0,lt],[1,dk]]);c.fillRect(vx-hw-t*.4,top-t*.5,hw*2+t*.8,t*1.2);
    c.strokeStyle='rgba(10,4,8,.55)';c.lineWidth=Math.max(1,z*3);c.strokeRect(vx-hw-t*.4,top-t*.5,hw*2+t*.8,t*1.2);
    // lampe suspendue
    const lx=vx,ly=top+t*2.1;
    c.strokeStyle='rgba(20,10,10,.8)';c.lineWidth=Math.max(1,z*3);c.beginPath();c.moveTo(lx,top+t*.7);c.lineTo(lx,ly);c.stroke();
    c.fillStyle=rad(c,lx,ly,0,D*.18*z,[[0,'rgba(255,214,120,.8)'],[.25,'rgba(255,160,60,.28)'],[1,'rgba(255,120,30,0)']]);c.fillRect(lx-D*.2*z,ly-D*.2*z,D*.4*z,D*.4*z);
    circle(c,lx,ly,Math.max(2,D*.012*z));c.fillStyle='#fff3c0';c.fill();
  }
  // rails
  c.lineCap='butt';
  for(const sx of [-1,1]){
    c.strokeStyle='rgba(190,205,225,.5)';
    c.beginPath();c.moveTo(vx+sx*D*.014,vy+H*.05);c.lineTo(vx+sx*D*.24,H*1.02);c.lineWidth=D*.007;c.stroke();
  }
  for(let i=0;i<13;i++){
    const f=Math.pow(i/13,2.1),y=vy+H*.05+(H*.97-vy-H*.05)*f,hw=D*.014+(D*.27-D*.014)*f,t=2+f*D*.016;
    c.fillStyle='rgba(58,32,20,.9)';c.fillRect(vx-hw,y,hw*2,t);
  }
  // cristaux dans les coins
  const cluster=(x,y,dir,col1,col2,sc)=>{
    c.fillStyle=rad(c,x,y,0,D*.3*sc,[[0,col1+'66'],[1,col1+'00']]);c.fillRect(0,0,W,H);
    for(let i=0;i<9;i++){
      const h=D*(.07+R()*.16)*sc,w=h*(.2+R()*.14),a=-Math.PI/2+dir*(R()*.9)+(R()-.5)*.3,bx=x+dir*(R()*D*.09*sc),by=y-R()*D*.012;
      c.save();c.translate(bx,by);c.rotate(a+Math.PI/2);
      poly(c,[-w/2,0,-w/2,-h*.75,0,-h,w/2,-h*.75,w/2,0]);paint(c,lin(c,-w/2,0,w/2,0,[[0,col2],[.5,col1],[1,col2]]),'rgba(10,3,25,.8)',2);
      poly(c,[-w/2,-h*.75,0,-h,0,0,-w/2,0]);c.fillStyle='rgba(255,255,255,.2)';c.fill();
      c.restore();
    }
  };
  cluster(W*.02,H*1.0,1,'#3ff0e0','#0f6a7a',1);cluster(W*.98,H*1.0,-1,'#c86bff','#50149a',1);
  c.fillStyle=rad(c,vx,H*.5,D*.28,D*.75,[[0,'rgba(0,0,0,0)'],[1,'rgba(3,1,8,.86)']]);c.fillRect(0,0,W,H);
  return cv;
}

/* Cadre des rouleaux : acier riveté, liseré d'or, fenêtre découpée */
const RW=820,RH=512,MX=30,MY=28,CELL=152;
function frame(){
  const cv=mk(RW*2,RH*2),c=cv.getContext('2d');c.scale(2,2);
  rr(c,4,4,RW-8,RH-8,30);paint(c,lin(c,0,0,RW,RH,[[0,'#3c2c52'],[.35,'#20162f'],[.7,'#2c1f40'],[1,'#120b1d']]),'#080410',6);
  rr(c,13,13,RW-26,RH-26,22);paint(c,null,lin(c,0,0,0,RH,[[0,'#ffe9a6'],[.5,'#c9892a'],[1,'#ffd36b']]),3.5);
  c.save();c.globalCompositeOperation='destination-out';rr(c,MX,MY,RW-MX*2,RH-MY*2,12);c.fillStyle='#000';c.fill();c.restore();
  rr(c,MX-1,MY-1,RW-MX*2+2,RH-MY*2+2,13);paint(c,null,lin(c,0,MY,0,RH-MY,[[0,'#6a4413'],[.5,'#ffd778'],[1,'#7a4f18']]),5);
  return cv;
}
function reelBack(){
  const cv=mk(RW,RH),c=cv.getContext('2d');
  c.fillStyle=lin(c,0,MY,0,RH-MY,[[0,'#160c2a'],[.5,'#2c1a4e'],[1,'#140b26']]);c.fillRect(MX,MY,RW-MX*2,RH-MY*2);
  for(let r=0;r<5;r++){
    const x=MX+r*CELL;
    c.fillStyle=rad(c,x+CELL/2,RH/2,10,RH*.62,[[0,'rgba(128,84,210,.28)'],[1,'rgba(60,30,120,0)']]);c.fillRect(x,MY,CELL,RH-MY*2);
    if(r){c.fillStyle=lin(c,0,MY,0,RH-MY,[[0,'rgba(255,214,120,.04)'],[.5,'rgba(255,214,120,.42)'],[1,'rgba(255,214,120,.04)']]);c.fillRect(x-1,MY,2,RH-MY*2);}
  }
  return cv;
}

/* Roue de bonus */
const WHEEL_COL={
  fs:['#ff7a1a','#c23a06'],hold:['#19c8c0','#06607a'],cash:['#5a3a9a','#2b1a5e'],up:['#fff27a','#e8a30c'],
  mini:['#39d97a','#07723f'],minor:['#3aa8ff','#0d3fae'],major:['#b65cff','#4f12a2'],grand:['#ff4048','#8a0a24'],super:['#ffffff','#ff2fa0'],
};
const FS_LABEL=[['FREE','SPINS'],['SUPER','FREE'],['MEGA','FREE']];
const HOLD_LABEL=[['HOLD &','BLAST'],['SUPER','HOLD'],['MEGA','HOLD']];
function wedgeLabel(w){
  if(w.k==='fs')return FS_LABEL[w.t];
  if(w.k==='hold')return HOLD_LABEL[w.t];
  if(w.k==='cash')return ['×'+w.x];
  if(w.k==='up')return ['CREUSE','ENCORE'];
  return [w.jp.toUpperCase()];
}
function wheel(W){
  const SZ=960,cv=mk(SZ,SZ),c=cv.getContext('2d'),n=W.wedges.length,R=SZ/2-44,step=TAU/n;
  c.translate(SZ/2,SZ/2);
  W.wedges.forEach((w,i)=>{
    const key=w.k==='jp'?w.jp:w.k,col=WHEEL_COL[key];
    const a0=-Math.PI/2-step/2+i*step,a1=a0+step;
    c.beginPath();c.moveTo(0,0);c.arc(0,0,R,a0,a1);c.closePath();
    c.fillStyle=rad(c,0,0,R*.15,R,[[0,col[1]],[.55,col[0]],[1,col[1]]]);c.fill();
    c.strokeStyle='#1a0a14';c.lineWidth=7;c.stroke();
    if(w.k==='jp'||w.k==='up'){c.save();c.clip();for(let k=0;k<7;k++){const a=a0+(a1-a0)*k/6;c.strokeStyle='rgba(255,255,255,.14)';c.lineWidth=10;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*R,Math.sin(a)*R);c.stroke();}c.restore();}
    c.save();c.rotate(i*step);
    const lab=wedgeLabel(w),lg=lab[0].length>5||lab.length>1?46:(lab[0].length>3?56:68),st=w.k==='up'||key==='super'?{...STYLES.fire}:'white';
    lab.forEach((t,li)=>fancy(c,t,0,-R+96+li*lg*1.12,lg,st));
    c.restore();
  });
  c.beginPath();c.arc(0,0,R+10,0,TAU);c.lineWidth=30;c.strokeStyle=lin(c,-R,-R,R,R,[[0,'#ffeeb0'],[.3,'#c6862a'],[.6,'#ffe08a'],[1,'#7a4a12']]);c.stroke();
  c.beginPath();c.arc(0,0,R+26,0,TAU);c.lineWidth=5;c.strokeStyle='#1a0a14';c.stroke();
  c.beginPath();c.arc(0,0,R-6,0,TAU);c.lineWidth=5;c.strokeStyle='#1a0a14';c.stroke();
  c.beginPath();c.arc(0,0,94,0,TAU);c.fillStyle=lin(c,0,-94,0,94,[[0,'#ffe9a6'],[.5,'#c9892a'],[1,'#6e3f10']]);c.fill();c.strokeStyle='#1a0a14';c.lineWidth=7;c.stroke();
  c.beginPath();c.arc(0,0,70,0,TAU);c.fillStyle=lin(c,0,-70,0,70,[[0,'#3a1468'],[1,'#120430']]);c.fill();c.strokeStyle='#ffd34d';c.lineWidth=4;c.stroke();
  fancy(c,'TNT',0,20,50,'gold');
  return cv;
}
function pointer(){
  const cv=mk(120,140),c=cv.getContext('2d');
  poly(c,[60,132,14,30,60,8,106,30]);paint(c,lin(c,0,8,0,132,[[0,'#fff6c0'],[.5,'#ffc42c'],[1,'#d65a08']]),INK,8);
  circle(c,60,38,12);paint(c,'#7a1f18',INK,5);
  return cv;
}

/* Lueurs tournantes derrière les big wins */
function rays(n){
  const SZ=1024,cv=mk(SZ,SZ),c=cv.getContext('2d');c.translate(SZ/2,SZ/2);
  for(let i=0;i<n;i++){
    c.rotate(TAU/n);
    const g=c.createLinearGradient(0,0,0,-SZ/2);g.addColorStop(0,'rgba(255,255,255,.6)');g.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=g;c.beginPath();c.moveTo(0,0);c.lineTo(-SZ*.09,-SZ/2);c.lineTo(SZ*.09,-SZ/2);c.closePath();c.fill();
  }
  return cv;
}

/* Fabrique tous les symboles, plus leur version floue pour les rouleaux en mouvement */
function buildSymbols(){
  const painters=[mole,cart,lamp,pick,c=>gem(c,'A','A'),c=>gem(c,'K','K'),c=>gem(c,'Q','Q'),c=>gem(c,'J','J'),c=>gem(c,'T','10'),wild,bonus,c=>nugget(c,'gold')];
  const sym=painters.map(p=>{const cv=mk(S,S);p(cv.getContext('2d'));return cv;});
  const blur=sym.map(s=>{
    const B=mk(S/2,S),c=B.getContext('2d');
    c.globalAlpha=.16;
    for(let i=-6;i<=6;i++)c.drawImage(s,0,i*9,S/2,S);
    return B;
  });
  const nug={};for(const k of Object.keys(NUGCOL)){const cv=mk(S,S);nugget(cv.getContext('2d'),k);nug[k]=cv;}
  buildSymbols.nug=nug;
  return {sym,blur,nug};
}
const labelCache=new Map();
function nugLabel(kind,text,sub){
  const key=kind+'|'+text+'|'+(sub||'');
  if(labelCache.has(key))return labelCache.get(key);
  const cv=mk(S,S),c=cv.getContext('2d');
  c.drawImage(buildSymbols.nug[kind],0,0);
  const size=text.length>7?46:text.length>5?54:text.length>4?60:text.length>3?74:92;
  fancy(c,text,140,150+size*.34,size,{top:'#ffffff',mid:'#fff8dc',mid2:'#ffffff',bot:'#ffe9a6',edge:'#5a2a00',ink:'#2a1000',deep:'#2a1000'});
  if(sub)fancy(c,sub,140,214,30,'gold');
  labelCache.set(key,cv);
  if(labelCache.size>120)labelCache.delete(labelCache.keys().next().value);
  return cv;
}
function tntNug(){
  const cv=mk(S,S),c=cv.getContext('2d');
  c.drawImage(buildSymbols.nug.grand,0,0);
  stick(c,100,140,-.28,46,160);stick(c,180,140,.28,46,160);stick(c,140,134,0,50,172);
  fuseSpark(c,150,36,14);
  fancy(c,'TNT',140,166,60,'gold');
  return cv;
}
return {S,TAU,RW,RH,MX,MY,CELL,DISPLAY,STYLES,mk,lin,rad,rr,poly,paint,circle,star4,fancy,sprites,background,frame,reelBack,wheel,wedgeLabel,pointer,rays,buildSymbols,nugLabel,tntNug,WHEEL_COL};
})();
