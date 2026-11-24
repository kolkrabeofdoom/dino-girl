(() => {
  "use strict";
  const canvas = document.querySelector("#game"), ctx = canvas.getContext("2d");
  const img = src => { const i = new Image(); i.src = src; return i; };
  const dinoSprite = img("img/dino-girl-sprite.png");
  const backdrops = {
    park: img("img/night-park-backdrop.png"),
    rhein: img("img/backdrop-rheinufer.png"),
    kirmes: img("img/backdrop-kirmes.png"),
    bau: img("img/backdrop-baustelle.png")
  };
  const enemySprites = ["enemy-bear.png","enemy-fox.png","enemy-giraffe.png","enemy-hippo.png"].map(f => img(`img/${f}`));
  const enemySpecs = [
    {drawW:78,drawH:92,hitW:52,hitH:68,speed:45},
    {drawW:70,drawH:84,hitW:46,hitH:62,speed:82},
    {drawW:68,drawH:104,hitW:44,hitH:76,speed:58},
    {drawW:82,drawH:90,hitW:56,hitH:66,speed:48}
  ];
  const $ = s => document.querySelector(s);
  const ui = {
    start:$("#startScreen"), pause:$("#pauseScreen"), win:$("#winScreen"), crystals:$("#crystals"), score:$("#score"),
    hearts:$("#hearts"), pauseBtn:$("#pauseBtn"), toast:$("#toast"), winStats:$("#winStats"), winTitle:$("#winTitle"),
    winEyebrow:$("#winEyebrow"), nextBtn:$("#nextBtn"), chapter2Btn:$("#chapter2Btn"),
    zoneName:$("#zoneName"),brandSub:$("#brandSub"), objective:$("#objectiveText")
  };
  const W = 1280, H = 720, {ground, chapters} = window.DINO_LEVELS;

  // ---------------------------------------------------------------- Fortschritt
  const store = {
    get(){ try { return JSON.parse(localStorage.getItem("dinoGirl.progress")) || {}; } catch(e){ return {}; } },
    set(v){ try { localStorage.setItem("dinoGirl.progress", JSON.stringify(v)); } catch(e){} }
  };
  let progress = store.get();
  if (new URLSearchParams(location.search).get("kapitel") === "2") progress.unlocked = Math.max(progress.unlocked||1, 2);
  function refreshChapterButton(){
    const open = (progress.unlocked||1) >= 2;
    ui.chapter2Btn.disabled = !open;
    ui.chapter2Btn.innerHTML = open ? "KAPITEL 2 · DAS VERSCHWUNDENE EI <span>→</span>" : "KAPITEL 2 · NOCH GESPERRT";
  }

  // ---------------------------------------------------------------- Sound
  let audio = null, sound = true;
  function ensureAudio(){
    if (!sound) return;
    try { if (!audio) audio = new (window.AudioContext||window.webkitAudioContext)(); if (audio.state === "suspended") audio.resume(); } catch(e){ audio = null; }
  }
  function tone(f1, f2, dur, type="square", vol=.045, delay=0){
    if (!sound || !audio) return;
    const t = audio.currentTime + delay, o = audio.createOscillator(), g = audio.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(30,f2), t+dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t+dur);
    o.connect(g).connect(audio.destination); o.start(t); o.stop(t+dur+.02);
  }
  const sfx = {
    jump(){ tone(330,620,.12); }, double(){ tone(440,990,.16); tone(660,1320,.1,"square",.03,.06); },
    coin(){ tone(988,988,.06); tone(1319,1319,.12,"square",.04,.06); }, throw(){ tone(500,240,.1,"triangle",.06); },
    stomp(){ tone(220,80,.14,"square",.06); }, hurt(){ tone(300,90,.25,"sawtooth",.05); },
    boing(){ tone(140,700,.22,"triangle",.08); }, splash(){ tone(900,60,.35,"sawtooth",.03); },
    heart(){ [523,659,784].forEach((f,i)=>tone(f,f,.09,"square",.04,i*.07)); },
    boom(){ tone(120,40,.35,"sawtooth",.07); }, bossHit(){ tone(180,90,.18,"square",.07); tone(90,60,.2,"triangle",.07,.05); },
    win(){ [523,659,784,1047].forEach((f,i)=>tone(f,f,.14,"square",.045,i*.12)); }
  };

  // ---------------------------------------------------------------- Zustand
  const keys = {}, touch = {left:false,right:false,jump:false,throw:false};
  let L = null, chapterIndex = 0;
  let running=false, paused=false, won=false, camera=0, last=0, collected=0, score=0, deaths=0, checkpoint=100, shake=0, activeZone=0, throwCooldown=0, jumpWasHeld=false;
  let bgKey="park", prevBgKey=null, bgFade=0, arenaLocked=false, worldTime=0;
  const player = {x:100,y:300,w:46,h:72,vx:0,vy:0,grounded:false,coyote:0,jumpBuf:0,jumps:0,hp:3,face:1,inv:0,on:null};
  let platforms=[], movers=[], springs=[], crystals=[], hearts=[], enemies=[], hazards=[], total=0;
  const particles=[], projectiles=[], shockwaves=[];
  const boss = {active:false};
  const egg = {active:false,x:0,y:0,vy:0,got:false};

  function loadChapter(index){
    chapterIndex = index; L = chapters[index];
    const styleAt = x => (L.zones.find(z=>x>=z.start&&x<z.end)||L.zones[0]).style;
    platforms = [
      ...L.ground.map(([x,w])=>({x,y:ground,w,h:160,style:styleAt(x),isGround:true})),
      ...L.floats.map(([x,y,w])=>({x,y,w,h:24,style:styleAt(x)}))
    ];
    movers = L.movers.map(m=>({...m,h:24,bx:m.x,by:m.y,t:m.phase||0,px:m.x,py:m.y}));
    springs = L.springs.map(x=>({x,y:ground-22,w:56,h:22,squash:0}));
    crystals = L.coins.map((p,i)=>({x:p[0],y:p[1],got:false,i}));
    hearts = L.hearts.map((p,i)=>({x:p[0],y:p[1],got:false,i}));
    enemies = L.enemies.map(([x,type,range=72,dir],i)=>{const s=enemySpecs[type];return{x,y:ground-s.hitH,w:s.hitW,h:s.hitH,drawW:s.drawW,drawH:s.drawH,speed:s.speed*L.enemySpeed,type,range,dir:dir||(i%2?1:-1),base:x,alive:true}});
    hazards = L.hazards.map(h=>({x:h[0],y:h[1],w:h[2],h:h[3]}));
    total = crystals.length;
  }

  function resetBoss(){
    shockwaves.length = 0; arenaLocked = false;
    if (L.goal.type !== "boss") { boss.active = false; return; }
    Object.assign(boss,{active:false,awake:false,x:L.goal.bossX,y:ground-150,w:116,h:150,vx:0,vy:0,hp:6,maxHp:6,timer:2.2,inv:0,face:-1,grounded:true,flee:false,gone:false,angry:false});
    Object.assign(egg,{active:false,got:false});
  }

  function zoneAt(x){ const i = L.zones.findIndex(z=>x>=z.start&&x<z.end); return i<0?L.zones.length-1:i; }

  function reset(all=true){
    if(all){crystals.forEach(c=>c.got=false);hearts.forEach(h=>h.got=false);enemies.forEach(e=>{e.alive=true;e.x=e.base});collected=0;score=0;deaths=0;checkpoint=L.zones[0].checkpoint}
    projectiles.length=0;throwCooldown=0;jumpWasHeld=false;
    if(all||!boss.flee)resetBoss();
    Object.assign(player,{x:checkpoint,y:300,vx:0,vy:0,grounded:false,coyote:0,jumpBuf:0,jumps:0,hp:3,inv:0,on:null});camera=Math.max(0,checkpoint-200);won=false;
    setZone(zoneAt(checkpoint));bgFade=0;updateHud();
  }
  function start(index=0){
    ensureAudio();
    loadChapter(index);reset(true);ui.brandSub.textContent=index===1?"KAPITEL 2":"NACHTPARK";
    ["start","win","pause"].forEach(k=>ui[k].classList.add("hidden"));ui.pauseBtn.classList.remove("hidden");
    running=true;paused=false;last=performance.now();canvas.focus();
    if(index===1)setTimeout(()=>toast("EIN EI FEHLT! FOLGE DER SPUR →"),400);
    requestAnimationFrame(loop);
  }
  function togglePause(force){if(!running||won)return;paused=force??!paused;ui.pause.classList.toggle("hidden",!paused)}
  function toast(text){ui.toast.textContent=text;ui.toast.classList.remove("hidden");clearTimeout(toast.t);toast.t=setTimeout(()=>ui.toast.classList.add("hidden"),1300)}
  function updateHud(){ui.crystals.textContent=`${String(collected).padStart(2,"0")} / ${String(total).padStart(2,"0")}`;ui.score.textContent=String(score).padStart(6,"0");ui.hearts.textContent="♥ ".repeat(player.hp).trim()+" ♡ ".repeat(3-player.hp).trim()}
  function setZone(index,announce=false){
    activeZone=index;const z=L.zones[index];ui.zoneName.textContent=z.name;ui.objective.textContent=z.objective;
    if(z.backdrop!==bgKey){prevBgKey=bgKey;bgKey=z.backdrop;bgFade=1}
    if(announce)toast(z.name);
  }
  function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
  function burst(x,y,color,n=10){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*300,vy:-Math.random()*250-40,life:1,color,s:3+Math.random()*5})}
  function throwBear(){projectiles.push({x:player.x+player.w/2+player.face*26,y:player.y+25,w:38,h:32,vx:player.face*650,vy:-150,rot:0,life:1.8});throwCooldown=.38;touch.throw=false;burst(player.x+player.w/2,player.y+30,"#fff3d5",4);sfx.throw()}
  function hurt(){
    if(player.inv>0)return;player.hp--;player.inv=1.3;shake=12;burst(player.x+20,player.y+30,"#ff654f",12);updateHud();sfx.hurt();
    if(player.hp<=0){deaths++;reset(false);toast("NOCH EIN VERSUCH!")}
    else{player.vy=-440;player.vx=-player.face*280}
  }
  function win(){
    won=true;running=false;ui.pauseBtn.classList.add("hidden");sfx.win();
    const stats=`Score ${String(score).padStart(6,"0")} · ${collected} von ${total} Münzen`;
    if(chapterIndex===0){
      progress.unlocked=Math.max(progress.unlocked||1,2);store.set(progress);refreshChapterButton();
      ui.winEyebrow.textContent="DAS NEST IST GERETTET!";ui.winTitle.textContent="SAURIER-STARK!";
      ui.winStats.textContent=`${stats}. Moment mal … waren da nicht drei Eier?`;
      ui.nextBtn.classList.remove("hidden");
    }else{
      ui.winEyebrow.textContent="DAS EI IST ZURÜCK IM NEST!";ui.winTitle.textContent="DINO-MÄSSIG!";
      ui.winStats.textContent=`${stats}. Der große Bär schmollt jetzt woanders.`;
      ui.nextBtn.classList.add("hidden");
    }
    ui.win.classList.remove("hidden");
  }

  // ---------------------------------------------------------------- Boss
  function damageBoss(){
    if(boss.inv>0||boss.flee)return;
    boss.hp--;boss.inv=.7;score+=200;shake=10;burst(boss.x+boss.w/2,boss.y+40,"#fff3d5",20);sfx.bossHit();updateHud();
    if(boss.hp===3&&!boss.angry){boss.angry=true;toast("DER BÄR WIRD SAUER!")}
    if(boss.hp<=0){
      boss.flee=true;score+=1000;updateHud();toast("DER BÄR TROLLT SICH BELEIDIGT!");
      Object.assign(egg,{active:true,got:false,x:boss.x+boss.w/2,y:boss.y-10,vy:-520});
      shockwaves.length=0;
    }
  }
  function updateBoss(dt){
    if(!boss.active||boss.gone)return;
    const arena=L.goal.arena;
    if(boss.flee){boss.face=1;boss.x+=280*dt;boss.y=ground-boss.h;if(boss.x>L.worldW+200)boss.gone=true;return}
    if(!boss.awake)return;
    boss.inv=Math.max(0,boss.inv-dt);boss.timer-=dt;
    const toward=Math.sign(player.x-boss.x)||boss.face;
    if(boss.grounded){
      boss.face=toward;boss.vx=toward*(boss.angry?125:80);
      if(boss.timer<=0){boss.vy=-860;boss.vx=Math.max(-430,Math.min(430,(player.x-boss.x)*.95));boss.grounded=false;boss.timer=boss.angry?1.5:2.4;sfx.jump()}
    }
    boss.vy+=1850*dt;boss.x+=boss.vx*dt;boss.y+=boss.vy*dt;
    boss.x=Math.max(arena+20,Math.min(L.worldW-boss.w-20,boss.x));
    if(boss.y+boss.h>=ground){
      if(!boss.grounded){
        shake=18;sfx.boom();burst(boss.x+boss.w/2,ground-4,"#d6e9b4",14);
        const speed=boss.angry?430:360;
        shockwaves.push({x:boss.x-10,y:ground-26,w:34,h:26,vx:-speed,life:2.4},{x:boss.x+boss.w-24,y:ground-26,w:34,h:26,vx:speed,life:2.4});
      }
      boss.y=ground-boss.h;boss.vy=0;boss.grounded=true;
    }
    if(overlap(player,boss)){
      if(player.vy>150&&player.y+player.h<boss.y+40){player.vy=-640;damageBoss();sfx.stomp()}
      else hurt();
    }
  }

  // ---------------------------------------------------------------- Physik
  function physics(dt){
    worldTime+=dt;bgFade=Math.max(0,bgFade-dt*1.4);
    const left=keys.ArrowLeft||keys.KeyA||touch.left,right=keys.ArrowRight||keys.KeyD||touch.right;
    const jump=keys.Space||keys.KeyW||keys.ArrowUp||touch.jump;
    const throwing=keys.KeyF||keys.KeyX||touch.throw;
    throwCooldown=Math.max(0,throwCooldown-dt);if(throwing&&throwCooldown<=0)throwBear();
    const accel=player.grounded?2100:1250, target=(right?1:0)-(left?1:0);
    player.vx += (target*330-player.vx)*Math.min(1,accel*dt/330); if(target)player.face=target;
    if(jump&&!jumpWasHeld)player.jumpBuf=.14;jumpWasHeld=jump;
    if(!jump)touch.jump=false;
    player.jumpBuf=Math.max(0,player.jumpBuf-dt);player.coyote=Math.max(0,player.coyote-dt);
    if(player.jumpBuf>0){
      if(player.grounded||player.coyote>0){
        player.vy=-690;player.grounded=false;player.coyote=0;player.jumpBuf=0;player.jumps=1;player.on=null;burst(player.x+23,player.y+70,"#fff0bd",5);sfx.jump();
      }else if(player.jumps<2){
        const doubleJump=player.jumps===1;player.vy=doubleJump?-820:-690;player.jumpBuf=0;player.jumps=doubleJump?2:1;
        burst(player.x+23,player.y+62,doubleJump?"#78d9ff":"#fff0bd",doubleJump?14:7);if(doubleJump){toast("DOUBLE JUMP!");sfx.double()}else sfx.jump();
      }
    }
    if(player.vy>=0)player.boost=false;
    if(!jump&&player.vy<0&&!player.boost)player.vy+=1200*dt;
    player.vy+=1850*dt;player.vy=Math.min(player.vy,1100);

    // bewegte Plattformen: erst bewegen, dann Dino Girl mitnehmen
    movers.forEach(m=>{
      m.t+=dt;const k=(1-Math.cos(m.t*m.speed))/2;m.px=m.x;m.py=m.y;m.x=m.bx+m.dx*k;m.y=m.by+m.dy*k;
      if(player.on===m){player.x+=m.x-m.px;player.y+=m.y-m.py}
    });

    player.x+=player.vx*dt;
    const minX=arenaLocked?L.goal.arena:0;player.x=Math.max(minX,Math.min(L.worldW-player.w,player.x));
    for(const p of platforms){if(L.oneWayFloats&&!p.isGround)continue;if(overlap(player,p)){if(player.vx>0)player.x=p.x-player.w;else if(player.vx<0)player.x=p.x+p.w;player.vx=0}}
    const oldBottom=player.y+player.h;player.y+=player.vy*dt;let landed=false,on=null;
    for(const p of platforms){if(player.x+player.w>p.x+5&&player.x<p.x+p.w-5&&oldBottom<=p.y+8&&player.y+player.h>=p.y&&player.vy>=0){player.y=p.y-player.h;player.vy=0;landed=true}}
    for(const m of movers){if(player.x+player.w>m.x+5&&player.x<m.x+m.w-5&&oldBottom<=Math.max(m.y,m.py)+8&&player.y+player.h>=m.y&&player.vy>=0){player.y=m.y-player.h;player.vy=0;landed=true;on=m}}
    for(const s of springs){
      s.squash=Math.max(0,s.squash-dt*4);
      if(player.vy>0&&player.x+player.w>s.x+4&&player.x<s.x+s.w-4&&oldBottom<=s.y+10&&player.y+player.h>=s.y){
        player.y=s.y-player.h;player.vy=-1150;player.boost=true;player.jumps=1;player.grounded=false;landed=false;on=null;s.squash=1;
        burst(s.x+s.w/2,s.y,"#ffcf45",10);toast("BOING!");sfx.boing();
      }
    }
    player.on=on;
    if(landed){if(!player.grounded&&player.vy===0)burst(player.x+23,player.y+72,"#d6e9b4",4);player.grounded=true;player.coyote=.11;player.jumps=0}else if(player.grounded){player.grounded=false;player.coyote=.11}
    if(player.y>H+160){
      const wet=L.zones[zoneAt(player.x)].gap==="water";deaths++;reset(false);
      toast(wet?"PLATSCH! DINOS SIND KEINE ENTEN.":"VORSICHT, ABGRUND!");
    }
    const feet=player.y+player.h,surface=ground+22;
    if(feet>surface&&feet-player.vy*dt<=surface&&L.zones[zoneAt(player.x)].gap==="water"){burst(player.x+23,surface,"#9fd3ff",22);sfx.splash()}

    const zoneIndex=zoneAt(player.x);
    if(zoneIndex!==activeZone){const forward=zoneIndex>activeZone;if(forward)checkpoint=L.zones[zoneIndex].checkpoint;setZone(zoneIndex,forward)}
    player.inv=Math.max(0,player.inv-dt);
    hazards.forEach(h=>{if(overlap(player,h))hurt()});
    crystals.forEach(c=>{if(!c.got&&Math.hypot(player.x+23-c.x,player.y+35-c.y)<48){c.got=true;collected++;score+=25;burst(c.x,c.y,"#ffcf45",16);updateHud();sfx.coin()}});
    hearts.forEach(h=>{if(!h.got&&Math.hypot(player.x+23-h.x,player.y+35-h.y)<48){h.got=true;burst(h.x,h.y,"#ff654f",18);if(player.hp<3){player.hp++;toast("+1 LEBEN")}else{score+=50;toast("+50 · HERZ VOLL")}updateHud();sfx.heart()}});
    projectiles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=520*dt;p.rot+=p.vx*dt*.009;p.life-=dt;
      enemies.forEach(e=>{if(e.alive&&p.life>0&&overlap(p,e)){e.alive=false;p.life=0;score+=150;burst(e.x+e.w/2,e.y+25,"#fff3d5",18);updateHud();sfx.stomp()}});
      if(boss.active&&boss.awake&&!boss.flee&&p.life>0&&overlap(p,boss)){p.life=0;damageBoss()}
    });
    for(let i=projectiles.length-1;i>=0;i--)if(projectiles[i].life<=0||projectiles[i].y>H+100)projectiles.splice(i,1);
    enemies.forEach(e=>{if(!e.alive)return;e.x+=e.dir*e.speed*dt;if(Math.abs(e.x-e.base)>e.range)e.dir*=-1;if(overlap(player,e)){if(player.vy>150&&player.y+player.h<e.y+24){e.alive=false;player.vy=-440;score+=100;burst(e.x+e.w/2,e.y+18,"#b9f34a",12);updateHud();sfx.stomp()}else hurt()}});

    // Ziel
    if(L.goal.type==="nest"&&player.x>L.goal.x)win();
    if(L.goal.type==="boss"){
      if(!boss.active&&!boss.flee&&player.x>L.goal.arena+120){boss.active=true;arenaLocked=true;toast("BOSS · DER GROSSE BÄR");setTimeout(()=>{if(boss.active)boss.awake=true},900)}
      updateBoss(dt);
      shockwaves.forEach(s=>{s.x+=s.vx*dt;s.life-=dt;if(s.life>0&&overlap(player,s))hurt()});
      for(let i=shockwaves.length-1;i>=0;i--)if(shockwaves[i].life<=0)shockwaves.splice(i,1);
      if(egg.active&&!egg.got){
        egg.vy+=1400*dt;egg.y+=egg.vy*dt;if(egg.y>ground-30){egg.y=ground-30;egg.vy=0}
        if(Math.hypot(player.x+23-egg.x,player.y+35-egg.y)<56){egg.got=true;score+=500;burst(egg.x,egg.y,"#fff0bd",30);updateHud();win()}
      }
    }

    const camTarget=arenaLocked?L.goal.arena:Math.max(0,Math.min(L.worldW-W,player.x-W*.36));
    camera+=(camTarget-camera)*Math.min(1,dt*4.5);
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=700*dt;p.life-=dt*1.7});for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);
  }

  // ---------------------------------------------------------------- Zeichnen
  function cloud(x,y,s){
    ctx.fillStyle="rgba(183,176,218,.55)";
    ctx.fillRect(x,y+12*s,92*s,15*s);ctx.fillRect(x+18*s,y,24*s,18*s);ctx.fillRect(x+43*s,y+5*s,32*s,18*s);
  }
  function skyline(parallax,base,color,light){
    const block=148,shift=camera*parallax,first=Math.floor(shift/block)-2;
    for(let i=first;i<first+13;i++){
      const seed=Math.abs((i*73+41)%211),x=i*block-shift,w=92+seed%56,h=105+(seed*7)%170;
      ctx.fillStyle=color;ctx.fillRect(x,base-h,w,h);
      ctx.fillStyle=color;ctx.fillRect(x+12,base-h-16,Math.max(20,w-24),18);
      ctx.fillStyle=light;
      for(let wy=base-h+24;wy<base-15;wy+=25)for(let wx=x+15;wx<x+w-10;wx+=25)if((Math.floor(wx+wy+i)&3)!==0)ctx.fillRect(wx,wy,7,9);
    }
  }
  const palettes={
    brick:{base:"#8b3f21",top:"#d47a35",hi:"#f0a14b",line:"#241018",glow:"rgba(255,170,73,.24)"},
    quay:{base:"#3c4868",top:"#8494b4",hi:"#c3d0e4",line:"#0f1424",glow:"rgba(170,200,255,.16)"}
  };
  function brickPlatform(p){
    const {x,y,w,h}=p,c=palettes[p.style]||palettes.brick;
    const drawH=h<=28?52:h;
    ctx.fillStyle=c.base;ctx.fillRect(x,y,w,drawH);
    ctx.fillStyle=c.top;ctx.fillRect(x,y,w,7);
    ctx.fillStyle=c.hi;for(let bx=x+6;bx<x+w;bx+=50)ctx.fillRect(bx,y+5,30,4);
    ctx.strokeStyle=c.line;ctx.lineWidth=4;
    for(let row=26;row<drawH;row+=26){
      ctx.beginPath();ctx.moveTo(x,y+row);ctx.lineTo(x+w,y+row);ctx.stroke();
      const offset=(Math.floor(row/26)%2)*25;
      for(let bx=x+offset;bx<x+w;bx+=50){ctx.beginPath();ctx.moveTo(bx,y+row);ctx.lineTo(bx,y+Math.min(row+26,drawH));ctx.stroke()}
    }
    ctx.fillStyle=c.glow;for(let row=31;row<drawH;row+=26)for(let bx=x+8;bx<x+w;bx+=50)ctx.fillRect(bx,y+row,27,4);
  }
  function girderPlatform(p){
    const {x,y,w,h}=p;
    if(h>28){ // Bodenträger mit Fachwerk
      ctx.fillStyle="#120c16";ctx.fillRect(x,y,w,h);
      ctx.strokeStyle="#6e2f22";ctx.lineWidth=6;
      for(let bx=x;bx<x+w;bx+=60){ctx.beginPath();ctx.moveTo(bx,y+28);ctx.lineTo(Math.min(bx+60,x+w),y+h);ctx.moveTo(Math.min(bx+60,x+w),y+28);ctx.lineTo(bx,y+h);ctx.stroke()}
    }
    ctx.fillStyle="#a8481f";ctx.fillRect(x,y,w,26);
    ctx.fillStyle="#e3843a";ctx.fillRect(x,y,w,6);
    ctx.fillStyle="#6b2614";ctx.fillRect(x,y+20,w,6);ctx.fillRect(x+10,y+6,w-20,4);
    ctx.fillStyle="#ffd08a";for(let bx=x+12;bx<x+w-6;bx+=28){ctx.fillRect(bx,y+12,4,4)}
    ctx.strokeStyle="#241018";ctx.lineWidth=3;ctx.strokeRect(x+1.5,y+1.5,w-3,23);
  }
  function drawPlatform(p){ if(p.style==="girder")girderPlatform(p); else brickPlatform(p); }
  function drawMover(m){
    const {x,y,w}=m;
    if(m.style==="boat"){
      ctx.fillStyle="#3b1b12";ctx.beginPath();ctx.moveTo(x-6,y);ctx.lineTo(x+w+6,y);ctx.lineTo(x+w-14,y+30);ctx.lineTo(x+14,y+30);ctx.closePath();ctx.fill();
      ctx.fillStyle="#a8532a";ctx.fillRect(x-4,y,w+8,8);ctx.fillStyle="#fff3d5";ctx.fillRect(x+10,y+13,w-20,5);
      ctx.fillStyle="#d64b3c";ctx.fillRect(x+w/2-3,y+13,6,5);
      ctx.fillStyle="rgba(159,211,255,.45)";const wob=Math.sin(worldTime*5)*4;ctx.fillRect(x+wob,y+30,w,3);
    }else if(m.style==="gondel"){
      ctx.strokeStyle="#2a1a40";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x+w/2,0);ctx.lineTo(x+w/2,y-28);ctx.stroke();
      ctx.fillStyle="#5c2f86";ctx.fillRect(x+8,y-28,w-16,10);ctx.fillRect(x+w/2-3,y-34,6,8);
      ctx.fillStyle="#b05ac1";ctx.fillRect(x,y,w,12);ctx.fillStyle="#ffcf45";for(let bx=x+8;bx<x+w;bx+=18)ctx.fillRect(bx,y+3,6,6);
      ctx.fillStyle="#3a1a55";ctx.fillRect(x+6,y+12,w-12,14);
    }else{ // Kranlast
      ctx.strokeStyle="#1a1820";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+14,y);ctx.lineTo(x+w/2,y-60);ctx.lineTo(x+w-14,y);ctx.moveTo(x+w/2,y-60);ctx.lineTo(x+w/2,0);ctx.stroke();
      ctx.fillStyle="#ffcf45";ctx.fillRect(x+w/2-6,y-66,12,10);
      girderPlatform({x,y,w,h:24});
    }
  }
  function drawSpring(s){
    const sq=s.squash*10;
    ctx.fillStyle="#241018";ctx.fillRect(s.x,s.y+16,s.w,6);
    ctx.strokeStyle="#c6ccd8";ctx.lineWidth=3;ctx.beginPath();
    for(let i=0;i<4;i++){const yy=s.y+6+sq*.6+i*(10-sq*.6)/4;ctx.moveTo(s.x+10,yy);ctx.lineTo(s.x+s.w-10,yy+2)}ctx.stroke();
    ctx.fillStyle="#ef4b45";ctx.fillRect(s.x-2,s.y+sq*.8,s.w+4,8);ctx.fillStyle="#ff9b7a";ctx.fillRect(s.x+4,s.y+sq*.8+1,s.w-8,2);
  }
  function streetLamp(x){
    ctx.fillStyle="#0a0b18";ctx.fillRect(x-6,330,12,280);ctx.fillRect(x-26,346,52,8);
    ctx.fillStyle="#f6c453";ctx.shadowColor="#ffd36b";ctx.shadowBlur=24;ctx.fillRect(x-17,356,34,45);ctx.shadowBlur=0;
    ctx.strokeStyle="#17101b";ctx.lineWidth=8;ctx.strokeRect(x-20,350,40,55);
    ctx.fillStyle="#12111c";ctx.beginPath();ctx.moveTo(x-27,350);ctx.lineTo(x,326);ctx.lineTo(x+27,350);ctx.fill();
    ctx.beginPath();ctx.arc(x,610,22,Math.PI,0);ctx.fill();
  }
  function coin(c){
    const bob=Math.sin(performance.now()*.004+c.i)*7;
    ctx.save();ctx.translate(c.x,c.y+bob);ctx.scale(.72+Math.abs(Math.sin(performance.now()*.006+c.i))*.28,1);
    ctx.shadowColor="#ffb52e";ctx.shadowBlur=14;ctx.fillStyle="#54280e";ctx.fillRect(-13,-19,26,38);ctx.fillRect(-18,-13,36,26);
    ctx.fillStyle="#f2a817";ctx.fillRect(-10,-17,20,34);ctx.fillRect(-15,-10,30,20);
    ctx.fillStyle="#ffe47a";ctx.fillRect(-6,-14,7,26);ctx.fillRect(1,-10,5,20);ctx.shadowBlur=0;ctx.restore();
  }
  function heart(h){
    const bob=Math.sin(performance.now()*.005+h.i)*6,px=5;
    const shape=["0110110","1111111","1111111","0111110","0011100","0001000"];
    ctx.save();ctx.translate(h.x-3.5*px,h.y-3*px+bob);ctx.shadowColor="#ff654f";ctx.shadowBlur=16;
    shape.forEach((row,r)=>[...row].forEach((v,c)=>{if(v==="1"){ctx.fillStyle=(r===1&&c===1)||(r===1&&c===2)?"#ffd0c4":"#ef4b45";ctx.fillRect(c*px,r*px,px,px)}}));
    ctx.shadowBlur=0;ctx.restore();
  }
  function parkBench(x){
    ctx.fillStyle="#1b1025";ctx.fillRect(x-62,544,124,12);ctx.fillRect(x-66,566,132,12);ctx.fillRect(x-54,535,10,74);ctx.fillRect(x+44,535,10,74);
    ctx.fillStyle="#5f2a75";ctx.fillRect(x-58,540,116,10);ctx.fillRect(x-62,562,124,10);
    ctx.fillStyle="#b05ac1";ctx.fillRect(x-50,541,76,3);ctx.fillRect(x-54,563,88,3);
  }
  function bollard(x){
    ctx.fillStyle="#141824";ctx.fillRect(x-14,574,28,36);ctx.fillRect(x-20,566,40,10);
    ctx.fillStyle="#56607a";ctx.fillRect(x-10,578,6,28);ctx.fillStyle="#ffcf45";ctx.fillRect(x-14,586,28,5);
  }
  function pole(x,i){
    ctx.fillStyle="#120c1e";ctx.fillRect(x-4,420,8,190);ctx.fillRect(x-12,600,24,10);
    ctx.fillStyle="#ffcf45";ctx.fillRect(x-6,412,12,10);
  }
  function garlands(list){
    const colors=["#ff5c5c","#ffd65c","#6edcff","#a0ff78","#f078ff"];
    for(let i=0;i<list.length-1;i++){
      const a=list[i],b=list[i+1];
      for(let s=0;s<=20;s++){const t=s/20,x=a+(b-a)*t,y=418+Math.sin(t*Math.PI)*46;
        ctx.fillStyle="#2a1a40";ctx.fillRect(x-1,y-1,3,3);
        if(s%2===0){ctx.fillStyle=colors[(s/2+i)%5];ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=10;ctx.fillRect(x-3,y+2,6,7);ctx.shadowBlur=0}}
    }
  }
  function bake(x){
    ctx.fillStyle="#141018";ctx.fillRect(x-18,600,36,10);
    for(let i=0;i<4;i++){ctx.fillStyle=i%2?"#f6f0e0":"#ef4b45";ctx.fillRect(x-8,520+i*20,16,20)}
    ctx.fillStyle=Math.sin(worldTime*6+x)>0?"#ffb52e":"#5a3a10";ctx.shadowColor="#ffb52e";ctx.shadowBlur=Math.sin(worldTime*6+x)>0?18:0;ctx.fillRect(x-7,506,14,12);ctx.shadowBlur=0;
  }
  function drawGaps(){
    const parts=platforms.filter(p=>p.isGround).sort((a,b)=>a.x-b.x);let cursor=0;const gaps=[];
    parts.forEach(p=>{if(p.x>cursor)gaps.push([cursor,p.x]);cursor=Math.max(cursor,p.x+p.w)});
    if(cursor<L.worldW)gaps.push([cursor,L.worldW]);
    gaps.forEach(([a,b])=>{
      const water=L.zones[zoneAt((a+b)/2)].gap==="water";
      if(!water){ctx.fillStyle="#03040d";ctx.fillRect(a,ground,b-a,H-ground);return}
      ctx.fillStyle="#06154a";ctx.fillRect(a,ground,b-a,H-ground);
      ctx.fillStyle="#0b2a7a";ctx.fillRect(a,ground+24,b-a,H-ground-24);
      for(let y=ground+30;y<H;y+=18)for(let x=a+((y/18|0)%2)*20;x<b;x+=40){const o=Math.sin(worldTime*2+x*.05+y)*6;ctx.fillStyle=(x+y)%3?"rgba(110,170,255,.5)":"rgba(246,196,83,.6)";ctx.fillRect(x+o,y,14,3)}
      ctx.fillStyle="#9fd3ff";for(let x=a;x<b;x+=16)ctx.fillRect(x,ground+22+Math.round(Math.sin(worldTime*3+x*.1)*2),10,3);
    });
  }
  function plushBear(p){
    ctx.save();ctx.translate(p.x+p.w/2,p.y+p.h/2);ctx.rotate(p.rot);ctx.lineWidth=3;ctx.strokeStyle="#27314b";
    ctx.fillStyle="#f8f1df";ctx.beginPath();ctx.arc(-11,-10,8,0,7);ctx.arc(11,-10,8,0,7);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(0,7,15,16,0,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(0,-5,14,0,7);ctx.fill();ctx.stroke();
    ctx.fillStyle="#27314b";ctx.beginPath();ctx.arc(-5,-7,2,0,7);ctx.arc(5,-7,2,0,7);ctx.arc(0,-1,3,0,7);ctx.fill();
    ctx.fillStyle="#55a8c8";ctx.beginPath();ctx.moveTo(0,7);ctx.lineTo(-11,2);ctx.lineTo(-9,13);ctx.closePath();ctx.moveTo(0,7);ctx.lineTo(11,2);ctx.lineTo(9,13);ctx.closePath();ctx.fill();
    ctx.restore();
  }
  function drawEgg(x,y,s=1){
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.shadowColor="#fff0bd";ctx.shadowBlur=20;
    ctx.fillStyle="#fff0bd";ctx.beginPath();ctx.ellipse(0,0,17,23,0,0,7);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle="#ff654f";ctx.fillRect(-9,-6,7,6);ctx.fillRect(4,-12,7,6);ctx.fillRect(2,6,6,5);ctx.restore();
  }
  function drawBoss(){
    if(!boss.active||boss.gone)return;
    const image=enemySprites[0],dw=172,dh=198;
    ctx.save();ctx.translate(Math.round(boss.x+boss.w/2),Math.round(boss.y+boss.h));ctx.scale(boss.face,1);
    if(boss.inv>0&&Math.floor(boss.inv*16)%2)ctx.globalAlpha=.35;
    if(boss.angry&&!boss.flee){ctx.shadowColor="#ff3b2f";ctx.shadowBlur=22}
    ctx.imageSmoothingEnabled=false;if(image.complete)ctx.drawImage(image,-dw/2,-dh,dw,dh);ctx.imageSmoothingEnabled=true;
    ctx.restore();
    if(!boss.flee&&!egg.active)drawEgg(boss.x+boss.w/2+boss.face*-6,boss.y-78+Math.sin(worldTime*4)*4,.9);
    if(boss.flee){ctx.fillStyle="#fff3d5";ctx.font="bold 22px monospace";ctx.fillText("HMPF!",boss.x+20,boss.y-20)}
  }
  function drawShockwave(s){
    const a=Math.min(1,s.life);ctx.globalAlpha=a;
    ctx.fillStyle="#d6e9b4";for(let i=0;i<4;i++)ctx.fillRect(s.x+i*8,s.y+s.h-6-((i*7+Math.floor(worldTime*20))%4)*5,6,6+((i*7+Math.floor(worldTime*20))%4)*5);
    ctx.fillStyle="#fff3d5";ctx.fillRect(s.x,s.y+s.h-4,s.w,4);ctx.globalAlpha=1;
  }
  function drawBossBar(){
    if(!boss.active||boss.flee||boss.gone)return;
    const x=W/2-200,y=70;
    ctx.fillStyle="#06171de6";ctx.fillRect(x-14,y-30,428,58);ctx.strokeStyle="#ef4b45";ctx.lineWidth=4;ctx.strokeRect(x-14,y-30,428,58);
    ctx.fillStyle="#ffcf45";ctx.font="14px 'Press Start 2P', monospace";ctx.fillText("DER GROSSE BÄR",x,y-8);
    for(let i=0;i<boss.maxHp;i++){ctx.fillStyle=i<boss.hp?"#ef4b45":"#2a1a24";ctx.fillRect(x+i*67,y+2,60,14)}
  }
  function drawBackdrop(key,alpha){
    const image=backdrops[key];if(!image||!image.complete||!image.naturalWidth)return false;
    ctx.globalAlpha=alpha;const bgShift=-((camera*.2)%W);ctx.drawImage(image,bgShift,0,W,H);ctx.drawImage(image,bgShift+W,0,W,H);ctx.globalAlpha=1;return true;
  }
  function draw(){
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
    ctx.imageSmoothingEnabled=true;
    const sx=shake?(Math.random()-.5)*shake:0,sy=shake?(Math.random()-.5)*shake:0;shake*=.82;
    ctx.save();ctx.translate(sx,sy);
    const zone=L.zones[activeZone],sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,zone.sky[0]);sky.addColorStop(.38,zone.sky[1]);sky.addColorStop(1,zone.sky[2]);ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    ctx.imageSmoothingEnabled=false;
    const ok=drawBackdrop(bgKey,1);if(bgFade>0&&prevBgKey)drawBackdrop(prevBgKey,bgFade);
    ctx.imageSmoothingEnabled=true;
    if(!ok){
      for(let i=0;i<38;i++){const x=(i*191-camera*.035)%1380-40,y=55+(i*67)%245;ctx.fillStyle=i%5?"#fff2c4":"#b4c9ff";ctx.fillRect(x,y,i%3?3:5,i%3?3:5)}
      cloud(120-camera*.08,145,1);cloud(550-camera*.045,92,.72);cloud(910-camera*.07,210,.9);
      skyline(.08,535,"#10183f","#6f7a51");skyline(.16,590,"#0a1131","#9d8845");skyline(.25,625,"#080c23","#c6a34b");
    }
    ctx.save();ctx.translate(-camera,0);
    drawGaps();
    const poles=[];
    L.decor.forEach(([type,x])=>{if(x<camera-300||x>camera+W+300){if(type==="pole")poles.push(x);return}
      if(type==="bench")parkBench(x);else if(type==="bollard")bollard(x);else if(type==="bake")bake(x);else if(type==="pole"){pole(x);poles.push(x)}});
    if(poles.length)garlands(poles.sort((a,b)=>a-b));
    L.signs.forEach(([gx,label])=>{ctx.fillStyle="#11111d";ctx.fillRect(gx-7,280,14,330);ctx.fillStyle="#e2a72c";ctx.strokeStyle="#120d15";ctx.lineWidth=6;ctx.fillRect(gx-40,295,80,44);ctx.strokeRect(gx-40,295,80,44);ctx.fillStyle="#18101a";ctx.font="bold 24px monospace";ctx.fillText(label,gx-16,325)});
    platforms.forEach(p=>{if(p.x+p.w>camera-20&&p.x<camera+W+20)drawPlatform(p)});
    movers.forEach(drawMover);
    springs.forEach(drawSpring);
    crystals.forEach(c=>{if(!c.got)coin(c)});
    hearts.forEach(h=>{if(!h.got)heart(h)});
    ctx.imageSmoothingEnabled=false;
    enemies.forEach(e=>{if(!e.alive)return;const image=enemySprites[e.type];ctx.save();ctx.translate(Math.round(e.x+e.w/2),Math.round(e.y+e.h));ctx.scale(e.dir,1);if(image.complete)ctx.drawImage(image,-e.drawW/2,-e.drawH,e.drawW,e.drawH);ctx.restore()});
    ctx.imageSmoothingEnabled=true;
    hazards.forEach(h=>{ctx.fillStyle="#9da7bd";ctx.strokeStyle="#202033";ctx.lineWidth=2;for(let x=h.x;x<h.x+h.w;x+=15){ctx.beginPath();ctx.moveTo(x,h.y+h.h);ctx.lineTo(x+7,h.y);ctx.lineTo(x+15,h.y+h.h);ctx.fill();ctx.stroke()}});
    shockwaves.forEach(drawShockwave);
    drawBoss();
    if(egg.active&&!egg.got)drawEgg(egg.x,egg.y+Math.sin(worldTime*5)*3);
    projectiles.forEach(plushBear);
    if(L.goal.type==="nest")drawNest();
    drawPlayer();particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.s,p.s)});ctx.globalAlpha=1;
    ctx.restore();
    drawBossBar();
    ctx.restore();
  }
  function drawPlayer(){
    const p=player,t=performance.now()*.014;
    const moving=p.grounded&&Math.abs(p.vx)>25,bob=moving?Math.round(Math.sin(t))*3:0;
    const lean=p.grounded?Math.max(-.06,Math.min(.06,p.vx/5000)):Math.max(-.12,Math.min(.12,p.vy/5000));
    ctx.save();ctx.translate(Math.round(p.x+p.w/2),Math.round(p.y+p.h+bob));ctx.scale(p.face,1);ctx.rotate(lean*p.face);
    if(p.inv>0&&Math.floor(p.inv*14)%2)ctx.globalAlpha=.25;
    ctx.imageSmoothingEnabled=false;if(dinoSprite.complete)ctx.drawImage(dinoSprite,-43,-96,86,96);ctx.imageSmoothingEnabled=true;
    ctx.restore();
  }
  function drawNest(){const nx=L.goal.x-20;ctx.save();ctx.translate(nx,535);ctx.fillStyle="#845737";for(let i=0;i<14;i++){ctx.save();ctx.rotate(i*.45);ctx.fillRect(-45,-5,90,10);ctx.restore()}ctx.fillStyle="#fff0bd";ctx.beginPath();ctx.ellipse(-16,0,17,23,-.2,0,7);ctx.ellipse(17,0,17,23,.2,0,7);ctx.fill();ctx.fillStyle="#ff654f";ctx.fillRect(-26,-3,7,6);ctx.fillRect(10,-9,7,6);ctx.restore()}
  function loop(now){if(!running)return;const dt=Math.min(.033,(now-last)/1000||0);last=now;if(!paused)physics(dt);draw();requestAnimationFrame(loop)}

  // ---------------------------------------------------------------- Eingabe
  addEventListener("keydown",e=>{keys[e.code]=true;if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();if(e.code==="Escape")togglePause()});
  addEventListener("keyup",e=>keys[e.code]=false);
  [["leftBtn","left"],["rightBtn","right"],["jumpBtn","jump"],["throwBtn","throw"]].forEach(([id,k])=>{const b=$("#"+id);["pointerdown","pointerenter"].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();touch[k]=true}));["pointerup","pointerleave","pointercancel"].forEach(ev=>b.addEventListener(ev,()=>touch[k]=false))});
  $("#startBtn").onclick=()=>start(0);
  ui.chapter2Btn.onclick=()=>start(1);
  $("#againBtn").onclick=()=>start(chapterIndex);
  ui.nextBtn.onclick=()=>start(1);
  $("#resumeBtn").onclick=()=>togglePause(false);
  $("#pauseBtn").onclick=()=>togglePause();$("#restartBtn").onclick=()=>{reset(false);togglePause(false)};
  $("#soundBtn").onclick=()=>{sound=!sound;$("#soundBtn").textContent=sound?"♪":"×";if(sound)ensureAudio()};

  // Test-Hook für automatisierte Durchläufe, im Spiel ohne Wirkung
  window.__dino={get state(){return{player,boss,egg,movers,checkpoint,activeZone,won,collected,total,score,chapterIndex,arenaLocked}},start,teleport(x,y=300){player.x=x;player.y=y;player.vx=0;player.vy=0;camera=Math.max(0,x-300)},keys};

  loadChapter(0);refreshChapterButton();resetBoss();draw();
})();
