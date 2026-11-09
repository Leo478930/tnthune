/* ===== SON =====
   Tout est synthétisé en direct, aucun fichier audio. Le contexte démarre au premier geste du joueur. */
const Snd=(function(){
'use strict';
let ac=null,master,sfx,music,noise,ready=false,muted=false,musicOn=true;
function setup(){
  if(ac){if(ac.state==='suspended')ac.resume();return;}
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return;
  try{ac=new AC();}catch(e){return;}
  const comp=ac.createDynamicsCompressor();
  comp.threshold.value=-12;comp.ratio.value=8;comp.attack.value=.003;comp.release.value=.16;
  master=ac.createGain();master.gain.value=muted?0:.85;
  sfx=ac.createGain();music=ac.createGain();music.gain.value=musicOn?.6:0;
  const delay=ac.createDelay(1),fb=ac.createGain(),wet=ac.createGain();
  delay.delayTime.value=.27;fb.gain.value=.3;wet.gain.value=.22;
  music.connect(delay);delay.connect(fb);fb.connect(delay);delay.connect(wet);wet.connect(comp);
  const pre=ac.createGain(),clip=ac.createWaveShaper(),curve=new Float32Array(2049);
  pre.gain.value=.5;
  for(let i=0;i<2049;i++)curve[i]=Math.tanh((i/1024-1)*2.2);
  clip.curve=curve;
  sfx.connect(comp);music.connect(comp);comp.connect(pre);pre.connect(clip);clip.connect(master);master.connect(ac.destination);/*DEV*/window.__an=ac.createAnalyser();window.__an.fftSize=2048;master.connect(window.__an);window.__ac=ac;/*ENDDEV*/
  const len=ac.sampleRate*2;
  noise=ac.createBuffer(1,len,ac.sampleRate);
  const d=noise.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  ready=true;
  if(ac.state==='suspended')ac.resume();
  if(seq.mood)startSeq();
}
function env(g,t,a,peak,d){
  g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak,.0002),t+a);
  g.gain.exponentialRampToValueAtTime(.0001,t+a+d);
}
function tone(o){
  if(!ready)return;
  const t=(o.t||ac.currentTime)+(o.at||0),a=o.a||.004,d=o.d||.2;
  const n=ac.createOscillator(),g=ac.createGain();
  n.type=o.type||'sine';n.frequency.setValueAtTime(o.f,t);
  if(o.f2)n.frequency.exponentialRampToValueAtTime(o.f2,t+a+d);
  if(o.detune)n.detune.value=o.detune;
  env(g,t,a,o.v===undefined?.3:o.v,d);
  let tail=g;
  if(o.lp){const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(o.lp,t);if(o.lp2)f.frequency.exponentialRampToValueAtTime(o.lp2,t+a+d);f.Q.value=o.q||1;g.connect(f);tail=f;}
  n.connect(g);tail.connect(o.dest||sfx);n.start(t);n.stop(t+a+d+.05);
}
function hiss(o){
  if(!ready)return;
  const t=(o.t||ac.currentTime)+(o.at||0),a=o.a||.002,d=o.d||.2;
  const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
  s.buffer=noise;s.loop=true;
  f.type=o.type||'bandpass';f.frequency.setValueAtTime(o.f||1000,t);if(o.f2)f.frequency.exponentialRampToValueAtTime(o.f2,t+a+d);f.Q.value=o.q||1;
  env(g,t,a,o.v===undefined?.3:o.v,d);
  s.connect(f);f.connect(g);g.connect(o.dest||sfx);s.start(t,Math.random()*1.5);s.stop(t+a+d+.05);
}
function bell(f,at,d,v,dest,t){
  tone({f,d,v,at,dest,t});
  tone({f:f*2.76,d:d*.42,v:v*.3,at,dest,t});
  tone({f:f*5.4,d:d*.18,v:v*.16,at,dest,t});
}
function brass(f,at,d,v,t){
  tone({f,d,v:v*.55,a:.02,type:'sawtooth',lp:f*5,lp2:f*2,at,t});
  tone({f:f*1.005,d,v:v*.45,a:.02,type:'sawtooth',lp:f*5,lp2:f*2,at,t});
  tone({f:f/2,d,v:v*.5,a:.02,type:'triangle',at,t});
}

/* Boucles continues : ronronnement des rouleaux, mèche, montée en tension */
const loops={};
function loopNoise(key,build){
  if(!ready||loops[key])return;
  loops[key]=build();
}
function endLoop(key,fade){
  const L=loops[key];if(!L)return;
  delete loops[key];
  const t=ac.currentTime;fade=fade||.08;
  L.g.gain.cancelScheduledValues(t);L.g.gain.setTargetAtTime(.0001,t,fade/3);
  L.nodes.forEach(n=>{try{n.stop(t+fade+.1);}catch(e){}});
  if(L.timer)clearInterval(L.timer);
}
function spinStart(){
  loopNoise('spin',()=>{
    const t=ac.currentTime,s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain(),l=ac.createOscillator(),lg=ac.createGain();
    s.buffer=noise;s.loop=true;f.type='bandpass';f.frequency.value=380;f.Q.value=.9;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.12,t+.14);
    l.type='square';l.frequency.value=24;lg.gain.value=.05;l.connect(lg);lg.connect(g.gain);
    s.connect(f);f.connect(g);g.connect(sfx);s.start();l.start();
    return {g,nodes:[s,l]};
  });
}
function spinStop(){endLoop('spin',.12);}
function fuseStart(){
  loopNoise('fuse',()=>{
    const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
    s.buffer=noise;s.loop=true;f.type='highpass';f.frequency.value=3200;g.gain.value=.11;
    s.connect(f);f.connect(g);g.connect(sfx);s.start();
    const timer=setInterval(()=>{hiss({d:.02+Math.random()*.03,v:.1+Math.random()*.2,type:'bandpass',f:2500+Math.random()*5000,q:6});},55);
    return {g,nodes:[s],timer};
  });
}
function fuseStop(){endLoop('fuse',.05);}
function tensionStart(){
  loopNoise('tension',()=>{
    const t=ac.currentTime,o=ac.createOscillator(),o2=ac.createOscillator(),f=ac.createBiquadFilter(),g=ac.createGain(),l=ac.createOscillator(),lg=ac.createGain();
    o.type='sawtooth';o2.type='sawtooth';o.frequency.setValueAtTime(92,t);o2.frequency.setValueAtTime(92.8,t);
    o.frequency.exponentialRampToValueAtTime(370,t+3.4);o2.frequency.exponentialRampToValueAtTime(374,t+3.4);
    f.type='lowpass';f.frequency.setValueAtTime(260,t);f.frequency.exponentialRampToValueAtTime(3400,t+3.4);f.Q.value=7;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.2,t+.3);
    l.frequency.setValueAtTime(6,t);l.frequency.linearRampToValueAtTime(17,t+3.4);lg.gain.value=.07;l.connect(lg);lg.connect(g.gain);
    o.connect(f);o2.connect(f);f.connect(g);g.connect(sfx);o.start();o2.start();l.start();
    let beat=0;
    const timer=setInterval(()=>{beat++;const n=Math.min(beat,20)/20;tone({f:68,f2:38,d:.17,v:.75});tone({f:60,f2:36,d:.15,v:.5,at:.2-n*.05});},Math.max(430,520));
    return {g,nodes:[o,o2,l],timer};
  });
}
function tensionStop(){endLoop('tension',.1);}
let heartTimer=null;
function heartStart(rate){
  if(heartTimer)clearInterval(heartTimer);
  const beat=()=>{tone({f:66,f2:36,d:.18,v:.8});tone({f:58,f2:34,d:.16,v:.55,at:.19});};
  beat();heartTimer=setInterval(beat,rate||720);
}
function heartStop(){if(heartTimer){clearInterval(heartTimer);heartTimer=null;}}

/* Effets ponctuels */
function reelStop(i){
  tone({f:170-i*9,f2:50,d:.13,v:.52});
  hiss({d:.03,v:.2,type:'highpass',f:2100});
  tone({f:880,d:.018,v:.05,type:'square'});
}
function scatterLand(n){
  const b=[392,523.25,659.25,880,1046.5][Math.min(n-1,4)];
  bell(b,0,.7,.36);bell(b*1.5,.06,.7,.24);bell(b*2,.12,.8,.2);
  tone({f:95,f2:40,d:.28,v:.8});
  hiss({d:.2,v:.26,type:'highpass',f:5200});
}
function coinLand(n){bell(880*Math.pow(2,Math.min(n,18)/12),0,.3,.3);}
function respinReset(){bell(1318,0,.3,.24);bell(1760,.06,.4,.22);tone({f:120,f2:60,d:.18,v:.5});}
function emptyTick(){tone({f:300,f2:140,d:.05,v:.1,type:'triangle'});}
function explosion(p){
  p=p===undefined?1:p;
  const d=.42+.5*p;
  hiss({d,v:Math.min(1,.55+p*.3),type:'lowpass',f:5200,f2:110,q:.7});
  tone({f:135,f2:26,d:d*.95,v:1});
  tone({f:74,f2:22,d,v:.7,type:'triangle'});
  hiss({d:.06,v:.55,type:'highpass',f:1900});
}
function thump(){tone({f:150,f2:44,d:.16,v:.7});hiss({d:.05,v:.2,type:'lowpass',f:2400});}
function fireball(){hiss({d:.28,v:.26,type:'bandpass',f:900,f2:3400,q:1.4});tone({f:220,f2:880,d:.24,v:.14,type:'triangle'});}
function multUp(n){const f=440*Math.pow(2,Math.min(n,24)/12);brass(f,0,.2,.34);bell(f*2,.02,.4,.22);tone({f:130,f2:60,d:.18,v:.6});}
function wheelTick(u){tone({f:1500+u*500,d:.022,v:.2,type:'square'});hiss({d:.018,v:.14,type:'highpass',f:3200});}
function click(){tone({f:620,f2:340,d:.05,v:.2,type:'triangle'});}
function denied(){tone({f:180,f2:120,d:.14,v:.26,type:'square',lp:900});}
function winTick(n){const s=[0,2,4,7,9,12,14,16,19,21,24];bell(660*Math.pow(2,s[n%s.length]/12),0,.14,.16);}
function smallWin(x){
  const n=x<1?2:x<5?4:6,sc=[0,4,7,12,16,19];
  for(let i=0;i<n;i++)bell(523.25*Math.pow(2,sc[i]/12),i*.075,.34,.26);
}
function countTick(u){tone({f:520+u*1500,d:.03,v:.14,type:'triangle'});}
function cashOut(){for(let i=0;i<9;i++)bell(1046+i*120,i*.05,.2,.2);}
function stinger(level){
  const r=[261.63,329.63,392,523.25,659.25][Math.min(level,4)];
  [[0,.1],[.1,.1],[.2,.42]].forEach(([at,d],i)=>{const f=r*[1,1.26,1.5][i];brass(f,at,d,.5);});
  brass(r*2,.22,.6,.42);brass(r*1.5,.22,.6,.34);brass(r*1.26,.22,.6,.3);
  tone({f:110,f2:32,d:.6,v:.9});
  hiss({d:.6,v:.35,type:'highpass',f:4400,f2:8000});
}
function siren(){
  for(let i=0;i<6;i++){tone({f:620,f2:980,d:.2,v:.2,type:'sawtooth',lp:2600,at:i*.24});}
}
function failFizz(){hiss({d:.5,v:.26,type:'highpass',f:4000,f2:1200});tone({f:240,f2:70,d:.5,v:.26,type:'triangle'});}
function freeze(){if(!ready)return;const t=ac.currentTime;music.gain.cancelScheduledValues(t);music.gain.setTargetAtTime(.02,t,.02);}
function unfreeze(){if(!ready)return;const t=ac.currentTime;music.gain.cancelScheduledValues(t);music.gain.setTargetAtTime(musicOn?.6:0,t,.05);}

/* Musique : petit séquenceur, une ambiance par moment de jeu */
const seq={mood:null,level:0,step:0,next:0,timer:null};
const N=(root,semi)=>root*Math.pow(2,semi/12);
const A2=110,E2=82.41,F2=87.31,G2=98,D2=73.42,C3=130.81;
const MOODS={
  base:{bpm:92,prog:[[A2,0],[A2,0],[F2,1],[E2,2]]},
  fs:{bpm:136,prog:[[E2,0],[E2,0],[C3/2,1],[D2,3]]},
  hold:{bpm:112,prog:[[D2,0],[D2,0],[D2,0],[E2/1,4]]},
  wheel:{bpm:124,prog:[[G2,3],[G2,3],[C3,3],[D2*2,3]]},
  big:{bpm:152,prog:[[C3,3],[G2,3],[A2,0],[F2,3]]},
};
function chordOf(q){return q===0?[0,3,7]:q===1?[0,4,7]:q===2?[0,4,7,10]:q===3?[0,4,7]:[0,3,6];}
function step(t,i){
  const M=MOODS[seq.mood],bar=Math.floor(i/16)%M.prog.length,s=i%16,[root0,q]=M.prog[bar];
  const lift=seq.mood==='big'?seq.level*3:seq.mood==='fs'?Math.min(seq.level,6):0;
  const root=N(root0,lift),ch=chordOf(q),dest=music;
  const kick=()=>{tone({f:140,f2:44,d:.13,v:.62,t,dest});};
  const hat=(v)=>{hiss({d:.03,v,type:'highpass',f:7600,t,dest});};
  const snare=()=>{hiss({d:.11,v:.24,type:'bandpass',f:2100,q:.7,t,dest});tone({f:220,f2:120,d:.08,v:.14,type:'triangle',t,dest});};
  const pluck=(semi,v,oct)=>{const f=N(root,semi)*(oct||2);tone({f,d:.2,v,type:'triangle',t,dest});tone({f:f*2,d:.09,v:v*.3,type:'sawtooth',lp:f*5,t,dest});};
  const bass=(semi,v,oct)=>{const f=N(root,semi)*(oct||1);tone({f,d:.24,v,type:'triangle',t,dest});tone({f,d:.14,v:v*.5,type:'sawtooth',lp:f*3.5,lp2:f,t,dest});};
  if(seq.mood==='base'){
    if(s===0||s===8)kick();
    if(s%4===2)hat(.05);
    if([0,6,8,11,14].includes(s))bass(s===14?7:0,.26);
    if(s%2===0){const k=[0,2,1,2,0,2,1,2][s/2];pluck(ch[k%ch.length],.075,2);}
  }else if(seq.mood==='fs'){
    if(s%4===0)kick();
    if(s===4||s===12)snare();
    if(s%2===1)hat(.08);
    if(s%2===0)bass(s%8===6?7:0,.3);
    pluck(ch[(s*3)%ch.length],.085,s%8<4?2:4);
  }else if(seq.mood==='hold'){
    if(s===0||s===3||s===8||s===11)tone({f:60,f2:36,d:.16,v:.62,t,dest});
    hat(s%4===2?.09:.03);
    if(s%4===0)bass(0,.28,.5);
    if(s%8===6)pluck(ch[1],.1,4);
    if(s===15)pluck(ch[2],.1,4);
  }else if(seq.mood==='wheel'){
    if(s%4===0)kick();
    if(s%2===1)hat(.07);
    if(s%4===2)snare();
    pluck(ch[s%ch.length],.08,2);
    if(s%4===0)bass(0,.28);
  }else{
    kick.call(null);
    if(s===4||s===12)snare();
    hat(.1);
    bass(0,.3);
    pluck(ch[s%ch.length],.12,4);
    pluck(ch[(s+1)%ch.length],.07,2);
    if(s%4===0)brass(N(root,ch[1])*4,0,.1,.13,t);
    if(s%8===0)bell(N(root,12)*4,0,.3,.13,dest,t);
  }
}
function pump(){
  if(!ready||!seq.mood)return;
  const M=MOODS[seq.mood],sp=60/M.bpm/4;
  if(seq.next<ac.currentTime)seq.next=ac.currentTime+.02;
  while(seq.next<ac.currentTime+.16){step(seq.next,seq.step);seq.next+=sp;seq.step++;}
}
function startSeq(){if(!seq.timer)seq.timer=setInterval(pump,40);}
function mood(name,level){
  if(seq.mood!==name){seq.mood=name;seq.step=0;}
  seq.level=level||0;
  if(ready)startSeq();
}
function setMuted(v){muted=v;if(ready)master.gain.setTargetAtTime(v?0:.85,ac.currentTime,.02);}
function setMusic(v){musicOn=v;if(ready)music.gain.setTargetAtTime(v?.6:0,ac.currentTime,.02);}
function stopAll(){['spin','fuse','tension'].forEach(k=>endLoop(k));heartStop();}
return {setup,spinStart,spinStop,fuseStart,fuseStop,tensionStart,tensionStop,heartStart,heartStop,reelStop,scatterLand,coinLand,respinReset,emptyTick,explosion,thump,fireball,multUp,wheelTick,click,denied,winTick,smallWin,countTick,cashOut,stinger,siren,failFizz,freeze,unfreeze,mood,setMuted,setMusic,stopAll};
})();
