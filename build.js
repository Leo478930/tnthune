// Assemble un seul fichier HTML : node build.js  ->  tnthune.html (page Claude), index.html (GitHub Pages) et local.html (test avec crochets de debug)
const fs=require('fs'),path=require('path');
const r=f=>fs.readFileSync(path.join(__dirname,'src',f),'utf8');
const strip=s=>s.replace(/\/\*DEV\*\/[\s\S]*?\/\*ENDDEV\*\//g,'');
const safe=s=>s.replace(/<\/script/g,'<\\/script');
function page(dev){
  const g=dev?r('game.js'):strip(r('game.js'));
  return r('index.html')
    .replace('/*__CSS__*/',()=>r('style.css'))
    .replace('/*__ENGINE__*/',()=>safe(r('engine.js')))
    .replace('/*__ART__*/',()=>safe(r('art.js')))
    .replace('/*__AUDIO__*/',()=>safe(dev?r('audio.js'):strip(r('audio.js'))))
    .replace('/*__FX__*/',()=>safe(r('fx.js')))
    .replace('/*__GAME__*/',()=>safe(g));
}
function full(s){
  const i=s.indexOf('<canvas id="bg"');
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+s.slice(0,i)+'</head><body>'+s.slice(i)+'</body></html>';
}
fs.writeFileSync(path.join(__dirname,'tnthune.html'),page(false));
fs.writeFileSync(path.join(__dirname,'index.html'),full(page(false)));
fs.writeFileSync(path.join(__dirname,'local.html'),full(page(true)));
console.log('ok',(fs.statSync(path.join(__dirname,'tnthune.html')).size/1024).toFixed(0)+' Ko');
