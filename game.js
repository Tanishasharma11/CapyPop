(()=>{'use strict';
const cv=document.getElementById('game'),c=cv.getContext('2d'),$=id=>document.getElementById(id),W=960,H=600;
const C=['#ff78c8','#a78bfa','#72d9ef','#ffd36e'];
const levels=[
 {name:'First Fan Encounter',rows:3,cols:8,boss:false,limit:0},
 {name:'Tunnel Trouble',rows:4,cols:8,boss:false,limit:0},
 {name:'Idol Safe Zone',rows:4,cols:9,boss:false,limit:2},
 {name:'Demon Encore',rows:5,cols:9,boss:false,limit:0},
 {name:'The Headliner',rows:4,cols:8,boss:true,limit:0}
];
let g={},sfxEnabled=true,musicEnabled=true,ac=null,last=0;
const art={};['kibaraska','train-station','derpy'].forEach(n=>{const im=new Image();im.src='asset/'+n+(n==='train-station'||n==='derpy'?'.jpg':'.png');art[n]=im});
function sfx(f=500,d=.07,type='sine'){if(!sfxEnabled)return;try{ac ||= new(window.AudioContext||window.webkitAudioContext)();let o=ac.createOscillator(),a=ac.createGain();o.type=type;o.frequency.value=f;a.gain.setValueAtTime(.065,ac.currentTime);a.gain.exponentialRampToValueAtTime(.001,ac.currentTime+d);o.connect(a);a.connect(ac.destination);o.start();o.stop(ac.currentTime+d)}catch(e){}}
const gameplayMusic = new Audio('asset/gameplay-audio.mp3');
gameplayMusic.loop = true;
gameplayMusic.volume = 0.65;

function playGameplayMusic() {
  if (!musicEnabled || g.mode !== 'play') return;
  gameplayMusic.play().catch(err => console.log('Music playback:', err));
}

function stopGameplayMusic() {
  gameplayMusic.pause();
  gameplayMusic.currentTime = 0;
}
function fresh(level){stopGameplayMusic();g={mode:'play',level,score:0,lives:3,coins:0,combo:0,comboTimer:0,fever:0,playerX:120,aimX:500,aimY:150,shots:[],grid:[],particles:[],boss:null,orb:Math.floor(Math.random()*4),next:Math.floor(Math.random()*4),toast:0,elapsed:0,descentCount:0,nextDescent:25,shield:0,boost:0};let cfg=levels[level-1];for(let r=0;r<cfg.rows;r++)for(let col=0;col<cfg.cols;col++){let friendly=cfg.limit&&r===1&&col%4===1;g.grid.push({x:430+col*54+(r%2)*24,y:112+r*49,r:20,color:(Math.floor(col/3)+r)%4,friendly:!!friendly,hp:1,alive:true,phase:Math.random()*6})}if(cfg.boss)g.boss={x:780,y:190,r:49,hp:12,max:12,phase:0};$('level').textContent=String(level).padStart(2,'0')+' / 05';$('bossbar').classList.toggle('hidden',!g.boss);updateHUD();$('menu').classList.add('hidden');$('result').classList.add('hidden');toast('MATCH 3 OR MORE!');}
function descendFormation(){
  const cfg=levels[g.level-1];

  for(const demon of g.grid){
    demon.y+=49;
  }

  const offset=g.descentCount%2===0?24:0;

  // Create a fresh row of demons at the top
  for(let col=0;col<cfg.cols;col++){
    g.grid.push({
      x:430+col*54+offset,
      y:112,
      r:20,
      color:(Math.floor(col/3)+g.descentCount+1)%4,
      friendly:false,
      hp:1,
      alive:true,
      phase:Math.random()*6
    });
  }

  g.descentCount++;
  toast('NEW DEMON WAVE!');
  sfx(350,.15,'triangle');
}
function toast(t){g.toast=1.4;$('toast').textContent=t;$('toast').classList.add('show')}
function updateHUD(){$('score').textContent=String(g.score).padStart(5,'0');$('lives').textContent='♥ '.repeat(g.lives).trim()||'—';$('coins').textContent=g.coins+' 🍊';$('combo').textContent='×'+Math.max(1,g.combo);$('meter').style.width=g.fever+'%';const feverBtn=$('feverBtn');
  feverBtn.hidden=g.fever<100;
  feverBtn.disabled=g.mode!=='play'||g.fever<100; if(g.boss){$('bossFill').style.width=(100*g.boss.hp/g.boss.max)+'%';$('bossHp').textContent=g.boss.hp+' / '+g.boss.max}}
function start(level=1){
  try{ac ||= new(window.AudioContext||window.webkitAudioContext)();ac.resume()}catch(e){}
  fresh(level);
  playGameplayMusic();
}
function finish(win){g.mode='result';stopGameplayMusic();let reward=Math.max(1,Math.floor(g.score/250)+(win?3:0));g.coins=reward;let old=Number(localStorage.getItem('capypopCoins')||0);localStorage.setItem('capypopCoins',old+reward);let best=Number(localStorage.getItem('capypopBest')||0);if(g.score>best)localStorage.setItem('capypopBest',g.score);$('resultEmoji').textContent=win?'🏆🍊':'🐹💜';$('resultEyebrow').textContent=win?'LEVEL CLEARED':'TRAIN NEEDS A RESET';$('resultTitle').textContent=win?(g.level===5?'DEMON HEADLINER DEFEATED!':'SUPER POP!'):'SO CLOSE!';$('resultText').textContent=win?'The idols are safe. Your fan energy is legendary.':'The demons reached the train. One more try?';$('levelScore').textContent=g.score;$('earned').textContent=reward;$('next').textContent=g.level===5?'PLAY FROM LEVEL 1':'NEXT LEVEL';$('next').onclick=()=>start(g.level===5?1:g.level+1);$('retry').onclick=()=>start(g.level);$('result').classList.remove('hidden');$('bossbar').classList.add('hidden');sfx(win?900:160,.25,win?'sine':'triangle')}
function popCluster(seed){let found=[],stack=[seed],seen=new Set();while(stack.length){let e=stack.pop();if(!e||seen.has(e)||!e.alive)continue;seen.add(e);if(e.friendly||e.color!==seed.color)continue;found.push(e);for(let n of neighbors(e))if(!seen.has(n)&&!n.friendly&&n.color===seed.color)stack.push(n)}return found}
function neighbors(e){return g.grid.filter(n=>n!==e&&n.alive&&Math.hypot(n.x-e.x,n.y-e.y)<67)}
function explode(x,y,color,n=14){for(let i=0;i<n;i++){let a=Math.random()*Math.PI*2,v=70+Math.random()*190;g.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.45+Math.random()*.35,max:.8,r:2+Math.random()*4,color})}}
function shoot(){if(g.mode!=='play'||g.shots.length>2)return;let dx=g.aimX-g.playerX,dy=g.aimY-493,ang=Math.atan2(dy,dx);if(ang>-.08)ang=-.08;let speed=680;g.shots.push({x:g.playerX+32,y:488,vx:Math.cos(ang)*speed,vy:Math.sin(ang)*speed,r:11,color:g.orb});g.orb=g.next;g.next=Math.floor(Math.random()*4);sfx(420+g.orb*100,.05,'triangle')}
function hitShot(sh){let target=null,dist=999;for(let e of g.grid){if(!e.alive)continue;let d=Math.hypot(sh.x-e.x,sh.y-e.y);if(d<e.r+sh.r+3&&d<dist){target=e;dist=d}}if(g.boss&&Math.hypot(sh.x-g.boss.x,sh.y-g.boss.y)<g.boss.r+sh.r)target=g.boss;if(!target)return false;
if(target.friendly){if(g.shield>0){g.shield=0;explode(target.x,target.y,'#72d9ef',20);toast('DERPY BLOCKED IT!');sfx(880,.15);return true}target.alive=false;explode(target.x,target.y,'#fff0b0',12);g.lives--;g.combo=0;toast('OH NO! FRIENDLY IDOL!');sfx(150,.2,'sawtooth');if(g.lives<=0)finish(false);updateHUD();return true}
if(target===g.boss){if(sh.color===g.bossColor||g.bossColor===undefined){g.boss.hp--;g.score+=80;g.combo++;g.fever=Math.min(100,g.fever+8);explode(sh.x,sh.y,C[sh.color],10);toast('BOSS HIT!');sfx(700,.08)}else{g.combo=0;toast('MATCH THE BOSS ORB!')}if(g.boss.hp<=0){g.score+=1000;g.coins+=5;explode(g.boss.x,g.boss.y,'#ffd36e',45);g.boss.dead=true;toast('BOSS DEFEATED! +1000');}return true}
let cluster=popCluster(target);if(sh.color===target.color){if(cluster.length>=3){cluster.forEach(e=>{e.alive=false;explode(e.x,e.y,C[e.color],9)});dropCheck();let mult=Math.min(5,1+Math.floor(g.combo/2));let pts=cluster.length*100*mult;g.score+=pts;g.combo++;g.comboTimer=2.5;g.fever=Math.min(100,g.fever+cluster.length*8+(g.boost>0?30:0));g.coins+=Math.floor(cluster.length/5);toast(cluster.length>=5?'MEGA POP! +'+pts:'NICE POP! +'+pts);sfx(650+cluster.length*35,.12);if(g.fever>=100)toast('FEVER READY! Press F!');}
else{g.combo=0;g.comboTimer=0;toast('NEED 3 OR MORE!');sfx(220,.08,'square')}}
else{g.combo=0;g.comboTimer=0;toast('WRONG COLOUR!');sfx(220,.08,'square')}
return true}
function dropCheck(){// detached clusters fall away after a group is removed
let live=g.grid.filter(e=>e.alive&&!e.friendly);let connected=new Set();let tops=live.filter(e=>e.y<140);let q=[...tops];while(q.length){let e=q.pop();if(connected.has(e))continue;connected.add(e);neighbors(e).forEach(n=>{if(!connected.has(n))q.push(n)})}
live.forEach(e=>{if(!connected.has(e)){e.alive=false;g.score+=50;g.coins+=1;explode(e.x,e.y,C[e.color],8)}})}
function update(dt){if(g.mode!=='play')return;g.elapsed+=dt;if(g.elapsed>=g.nextDescent){
  descendFormation();
  g.nextDescent+=25;
}g.shield=Math.max(0,(g.shield||0)-dt);g.boost=Math.max(0,(g.boost||0)-dt);g.playerX=Math.max(70,Math.min(380,g.playerX));g.comboTimer-=dt;if(g.comboTimer<=0){g.combo=0}
g.toast=Math.max(0,g.toast-dt);if(!g.toast)$('toast').classList.remove('show');
for(let e of g.grid)e.phase+=dt*2;
for(let sh of g.shots){sh.x+=sh.vx*dt;sh.y+=sh.vy*dt;if(sh.x<12||sh.x>W-12){sh.vx*=-1;sh.x=Math.max(12,Math.min(W-12,sh.x))}if(hitShot(sh))sh.dead=true;if(sh.y<60)sh.dead=true}g.shots=g.shots.filter(s=>!s.dead);
for(let p of g.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=160*dt;p.life-=dt}g.particles=g.particles.filter(p=>p.life>0);
if(g.boss&&!g.boss.dead){g.boss.phase+=dt;g.boss.x=760+Math.sin(g.boss.phase*1.3)*20;if(g.bossColor===undefined)g.bossColor=Math.floor(Math.random()*4);if(g.boss.hp<=0)g.boss.dead=true}
if(g.boss?.dead)g.boss=null;
let remaining=g.grid.some(e=>e.alive&&!e.friendly);if(!remaining&&!g.boss){finish(true)}
updateHUD()}
function bg(){let im=art['train-station'];if(im&&im.complete&&im.naturalWidth){c.drawImage(im,0,0,W,470);c.fillStyle='#28133b55';c.fillRect(0,0,W,470)}else{let gr=c.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#302249');gr.addColorStop(.55,'#51345f');gr.addColorStop(1,'#19172c');c.fillStyle=gr;c.fillRect(0,0,W,H)}
c.fillStyle='#21152b';c.fillRect(0,455,W,145);c.fillStyle='#4a2f59';c.fillRect(0,457,W,7);for(let x=-(g.elapsed*100%110);x<W;x+=110){c.fillStyle='#80618c';c.fillRect(x,505,65,9);c.fillRect(x+25,530,65,9)}c.fillStyle='#171322';c.fillRect(0,565,W,35);c.strokeStyle='#d88bc9';c.lineWidth=3;c.beginPath();c.moveTo(0,565);c.lineTo(W,565);c.stroke()}
function demon(e){c.save();c.translate(e.x,e.y+Math.sin(e.phase)*3);c.shadowColor=C[e.color];c.shadowBlur=14;c.fillStyle=C[e.color];c.beginPath();c.arc(0,0,e.r,0,7);c.fill();c.shadowBlur=0;c.fillStyle='#35213e';c.beginPath();c.moveTo(-12,-10);c.lineTo(-20,-27);c.lineTo(-3,-19);c.moveTo(12,-10);c.lineTo(20,-27);c.lineTo(3,-19);c.fill();c.fillStyle='#24162c';c.beginPath();c.arc(-7,-2,2.7,0,7);c.arc(7,-2,2.7,0,7);c.fill();c.strokeStyle='#24162c';c.lineWidth=2;c.beginPath();c.arc(0,5,5,.1,Math.PI-.1);c.stroke();c.restore()}
function ally(e){c.save();c.translate(e.x,e.y+Math.sin(e.phase)*3);c.fillStyle='#FFFFFF';c.shadowColor='#FFDFA0';c.shadowBlur=25;c.beginPath();c.arc(0,0,e.r,0,7);c.fill();c.shadowBlur=0;c.fillStyle='#6c4d83';c.beginPath();c.arc(-7,-2,2.5,0,7);c.arc(7,-2,2.5,0,7);c.fill();c.font='900 9px Nunito';c.textAlign='center';c.fillStyle='#FFD36E';
c.font='900 11px Nunito'; c.fillText('IDOL',0,37);c.restore()}
function player(){let x=g.playerX,im=art.kibaraska;if(im&&im.complete&&im.naturalWidth){c.drawImage(im,x-58,398,116,116)}else
 {
    c.fillStyle='#b77b55';
    c.beginPath();
    c.ellipse(x,485,31,24,0,0,7);
    c.fill();
  }


  if(g.shield>0){
    let d=art.derpy;
    if(d&&d.complete&&d.naturalWidth){
      c.drawImage(d,x+48,405,65,65);
    }
  }
  c.fillStyle='#f5d8ee';
  c.font='900 12px Nunito';
  c.textAlign='center';
  c.fillText('KIBARASKA',x,535);
}
function draw(){bg();c.textAlign='left';c.fillStyle='#f4c7e9';c.font='900 14px Nunito';c.fillText('DEMON EXPRESS · MATCH 3+',24,32);c.fillStyle='#c8b3e4';c.font='bold 11px Nunito';c.fillText('MATCH 3+ TO CLEAR A CLUSTER',24,50);
g.grid.forEach(e=>{if(e.alive){if(e.friendly)ally(e);else demon(e)}});if(g.boss){c.save();c.translate(g.boss.x,g.boss.y+Math.sin(g.boss.phase)*5);c.shadowColor='#ff78c8';c.shadowBlur=24;c.fillStyle='#733e83';c.beginPath();c.arc(0,0,g.boss.r,0,7);c.fill();c.shadowBlur=0;c.fillStyle='#ff78c8';c.beginPath();c.moveTo(-25,-25);c.lineTo(-42,-55);c.lineTo(-8,-40);c.moveTo(25,-25);c.lineTo(42,-55);c.lineTo(8,-40);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(-14,-5,5,0,7);c.arc(14,-5,5,0,7);c.fill();c.restore()}
g.shots.forEach(s=>{c.shadowColor=C[s.color];c.shadowBlur=18;c.fillStyle=C[s.color];c.beginPath();c.arc(s.x,s.y,s.r,0,7);c.fill();c.shadowBlur=0});g.particles.forEach(p=>{c.globalAlpha=Math.max(0,p.life/p.max);c.fillStyle=p.color;c.beginPath();c.arc(p.x,p.y,p.r,0,7);c.fill()});c.globalAlpha=1;player();
c.fillStyle='#e8d8f4';c.font='900 11px Nunito';c.fillText('CURRENT',g.playerX+65,486);c.fillStyle=C[g.orb];c.beginPath();c.arc(g.playerX+130,482,10,0,7);c.fill();c.fillStyle='#c9b8dc';c.fillText('NEXT',g.playerX+65,518);c.fillStyle=C[g.next];c.beginPath();c.arc(g.playerX+130,514,7,0,7);c.fill();
if(g.mode==='play'&&g.fever>=100){c.fillStyle='#ffd36e';c.font='900 14px Nunito';c.fillText('FEVER READY! PRESS F',W-205,35)}}
function loop(t){let dt=Math.min(.035,(t-last)/1000||0);last=t;if(g.mode==='play')update(dt);draw();requestAnimationFrame(loop)}
function pointer(e){let r=cv.getBoundingClientRect();g.aimX=(e.clientX-r.left)*W/r.width;g.aimY=(e.clientY-r.top)*H/r.height}

cv.addEventListener('pointermove',pointer);
cv.addEventListener('pointerdown',e=>{
  if(g.mode==='play'){
    pointer(e);
    shoot();
  }
});

function activateFever(){
  if(g.mode!=='play'||g.fever<100)return;

  g.fever=0;
  g.grid.filter(x=>x.alive&&!x.friendly).slice(0,5).forEach(x=>{
    x.alive=false;
    explode(x.x,x.y,'#ffe17c',15);
    g.score+=150;
  });

  toast('KIBARASKA FEVER!');
  sfx(1000,.25);
  updateHUD();
}

window.addEventListener('keydown',e=>{
  
  if(e.key===' '){
    e.preventDefault();
    shoot();
  }

  if(e.key.toLowerCase()==='q'&&g.mode==='play'&&!g.shield){
    g.shield=6;
    toast('DERPY SHIELD!');
    sfx(880,.18);
  }

  if(e.key.toLowerCase()==='e'&&g.mode==='play'&&!g.boost){
    g.boost=8;
    g.fever=Math.min(100,g.fever+30);
    toast('SUSSIE BOOST! +30 FEVER');
    sfx(990,.18);
  }

  if(e.key.toLowerCase()==='f'){
    activateFever();
  }
});

$('feverBtn').onclick=activateFever;
$('start').onclick=()=>start(1); $('soundBtn').onclick=()=>{sfxEnabled=!sfxEnabled;$('soundBtn').textContent=sfxEnabled?'🔊 SFX ON':'🔇 SFX OFF';if(sfxEnabled)sfx(600)};
$('musicBtn').onclick=()=>{
  musicEnabled=!musicEnabled;
  $('musicBtn').textContent=musicEnabled?'♫ MUSIC ON':'♫ MUSIC OFF';

  if(musicEnabled){
    playGameplayMusic();
  }else{
    gameplayMusic.pause();
    gameplayMusic.currentTime=0;
  }
};
g={mode:'menu',score:0,level:1,lives:3,coins:0,combo:0,fever:0,playerX:180,aimX:600,aimY:120,shots:[],grid:[],particles:[],elapsed:0};requestAnimationFrame(loop);
})();
