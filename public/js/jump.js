(() => {
  "use strict";
  // ================================================================ Grundlagen
  const $ = s => document.querySelector(s);
  const canvas = $("#game"), ctx = canvas.getContext("2d");
  const W = 1280, H = 720;
  const {ground, chapters, story} = window.DINO_LEVELS;
  const music = window.DinoMusic;
  const img = src => { const i = new Image(); i.src = src; return i; };
  const IMG = {
    dino: img("img/dino-girl-sprite.png"), raven: img("img/kolkrabe.png"), baby: img("img/baby-dino.png"),
    bug: img("img/bug.png"), dragon: img("img/dau-drache.png"),
    enemies: ["enemy-bear.png","enemy-fox.png","enemy-giraffe.png","enemy-hippo.png"].map(f => img(`img/${f}`))
  };
  const backdrops = Object.fromEntries([
    ["park","night-park-backdrop"],["rhein","backdrop-rheinufer"],["kirmes","backdrop-kirmes"],["bau","backdrop-baustelle"],
    ["weinberge","backdrop-weinberge"],["kneipen","backdrop-kneipen"],["burg","backdrop-burg"],["server","backdrop-serverraum"],["rauschen","backdrop-rauschen"]
  ].map(([k,f]) => [k, img(`img/${f}.png`)]));
  const enemySpecs = [
    {drawW:78,drawH:92,hitW:52,hitH:68,speed:45},   // Bär
    {drawW:70,drawH:84,hitW:46,hitH:62,speed:82},   // Fuchs
    {drawW:68,drawH:104,hitW:44,hitH:76,speed:58},  // Giraffe
    {drawW:82,drawH:90,hitW:56,hitH:66,speed:48},   // Nilpferd
    {drawW:54,drawH:42,hitW:44,hitH:30,speed:72}    // Bug
  ];
  const ui = {
    start:$("#startScreen"), pause:$("#pauseScreen"), win:$("#winScreen"), shop:$("#shopScreen"), c64Load:$("#c64Load"),
    crystals:$("#crystals"), score:$("#score"), hearts:$("#hearts"), time:$("#timeVal"), pauseBtn:$("#pauseBtn"), toast:$("#toast"),
    winStats:$("#winStats"), winBest:$("#winBest"), winTitle:$("#winTitle"), winEyebrow:$("#winEyebrow"), nextBtn:$("#nextBtn"),
    zoneName:$("#zoneName"), brandSub:$("#brandSub"), objective:$("#objectiveText"), chapterList:$("#chapterList"), startBtn:$("#startBtn")
  };
  const hashTags = location.hash.replace("#","").split(/[+,&]/);
  const rand = (a,b) => a + Math.random()*(b-a);
  const pick = list => list[Math.floor(Math.random()*list.length)];
  const fmtTime = t => `${String(Math.floor(t/60)).padStart(2,"0")}:${String(Math.floor(t%60)).padStart(2,"0")}`;

  // ================================================================ Fortschritt
  const store = {
    get(){ try { return JSON.parse(localStorage.getItem("dinoGirl.progress")) || {}; } catch(e){ return {}; } },
    set(v){ try { localStorage.setItem("dinoGirl.progress", JSON.stringify(v)); } catch(e){} }
  };
  const progress = Object.assign({unlocked:1,wallet:0,owned:{},hat:null,best:{},ghosts:{},secret:false,hatched:false,c64:false}, store.get());
  const save = () => store.set(progress);
  hashTags.forEach(t => { const m = /^kapitel-(\d)$/.exec(t); if (m) progress.unlocked = Math.max(progress.unlocked, +m[1]); });
  if (progress.unlocked >= 3) progress.hatched = true;
  const night = hashTags.includes("spaet") || (h => h >= 22 || h < 5)(new Date().getHours());

  // ================================================================ Sound
  let audio = null, sound = true, musicOn = true, c64 = false;
  function ensureAudio(){
    if (!sound) return;
    try { if (!audio) audio = new (window.AudioContext||window.webkitAudioContext)(); if (audio.state === "suspended") audio.resume(); music.init(audio); } catch(e){ audio = null; }
  }
  function tone(f1, f2, dur, type="square", vol=.045, delay=0){
    if (!sound || !audio) return;
    const t = audio.currentTime + delay, o = audio.createOscillator(), g = audio.createGain();
    o.type = c64 && type === "square" ? "sawtooth" : type;
    o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(30,f2), t+dur);
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
    krah(){ tone(900,380,.12,"sawtooth",.05); tone(820,300,.17,"sawtooth",.05,.16); },
    friend(){ tone(660,880,.08,"triangle",.05); tone(880,1175,.12,"triangle",.05,.08); },
    fix(){ tone(1200,1600,.05); tone(1600,2400,.08,"square",.03,.05); },
    pound(){ tone(500,120,.12,"square",.05); }, tv(){ tone(2000,300,.5,"sawtooth",.025); },
    hatch(){ [392,523,659,784,1047].forEach((f,i)=>tone(f,f,.12,"triangle",.06,i*.09)); },
    buy(){ [784,988,1319].forEach((f,i)=>tone(f,f,.07,"square",.04,i*.06)); }, nope(){ tone(200,150,.18,"square",.04); },
    win(){ [523,659,784,1047].forEach((f,i)=>tone(f,f,.14,"square",.045,i*.12)); }
  };

  // ================================================================ Zustand
  const keys = {}, touch = {left:false,right:false,jump:false,throw:false,down:false};
  let L = null, chapterIndex = 0, mode = "title";
  let running=false, paused=false, camera=0, last=0, collected=0, score=0, deaths=0, checkpoint=100, shake=0, activeZone=0;
  let throwCooldown=0, jumpWasHeld=false, downWasHeld=false, rafId=0, bgKey="park", prevBgKey=null, bgFade=0, arenaLocked=false, worldTime=0;
  let runTime=0, recT=0, ghostRec=[], ghostPlay=null, ghostOn=true, befriended=[], snapshot=null, hudT=0, bugToast=false;
  const player = {x:100,y:300,w:46,h:72,vx:0,vy:0,grounded:false,coyote:0,jumpBuf:0,jumps:0,hp:3,face:1,inv:0,on:null,boost:false,pound:false};
  let platforms=[], movers=[], springs=[], crystals=[], hearts=[], enemies=[], hazards=[], updrafts=[], tvs=[], total=0;
  const particles=[], projectiles=[], shockwaves=[], shots=[];
  const boss = {active:false};
  const prize = {active:false,x:0,y:0,vy:0,got:false,kind:"egg"};
  const flag = {raised:0,raising:false};
  const raven = {state:"off",x:0,y:0,tx:0,ty:0,t:0,line:"",face:-1};
  const baby = {x:0,y:0,w:40,h:46,vx:0,vy:0,grounded:false,face:1,idle:0,t:0,on:null,active:false};
  const ravenLines = ["KRAH! GESPEICHERT.","CHECKPOINT. OPEN SOURCE, NATÜRLICH.","HAB'S NOTIERT. MIT TINTE.","KRAH. WEITER SO, DINO!"];
  const ravenNight = ["KRAH … GÄHN. GESPEICHERT.","NACHTSCHICHT? ICH GEH SCHLAFEN.","*SCHNARCH* … JA, CHECKPOINT."];
  const friendSays = ["SORRY!","FRIEDEN?","OK, OK!","HUCH!","FREUNDE?","SCHON GUT!"];
  const dragonSays = ["IHR ANRUF IST UNS WICHTIG!","HABEN SIE ES NEU GESTARTET?","DRÜCKEN SIE DIE 1!","DAS GING GESTERN NOCH!","ICH HAB NIX GEMACHT!"];
  const maxHp = () => 3 + (progress.owned.heart ? 1 : 0);

  // ================================================================ Kapitel laden
  function loadChapter(index){
    chapterIndex = index; L = chapters[index];
    if (!L.goal) L.goal = {type:"flag", x:L.worldW-150, y:ground};
    for (const k of ["floats","movers","springs","hearts","hazards","signs","decor","coins","enemies"]) L[k] = L[k] || [];
    const styleAt = x => (L.zones.find(z=>x>=z.start&&x<z.end)||L.zones[0]).style;
    platforms = [
      ...L.ground.map(([x,w])=>({x,y:ground,w,h:160,style:styleAt(x),isGround:true})),
      ...L.floats.map(([x,y,w])=>({x,y,w,h:24,style:styleAt(x)}))
    ];
    movers = L.movers.map(m=>({...m,h:24,bx:m.x,by:m.y,t:m.phase||0,px:m.x,py:m.y}));
    springs = L.springs.map(x=>({x,y:ground-22,w:56,h:22,squash:0}));
    crystals = L.coins.map((p,i)=>({x:p[0],y:p[1],got:false,i}));
    hearts = L.hearts.map((p,i)=>({x:p[0],y:p[1],got:false,i}));
    enemies = L.enemies.map(([x,type,range=72,dir],i)=>makeEnemy(x,type,range,dir||(i%2?1:-1)));
    hazards = L.hazards.map(h=>({x:h[0],y:h[1],w:h[2],h:h[3]}));
    updrafts = (L.updrafts||[]).map(([x,w,top])=>({x,w,top}));
    tvs = (L.tvs||[]).map(([x,y,target])=>({x,y,target}));
    total = crystals.length;
    baby.active = !!L.companion;
  }
  function groundUnder(x){ return platforms.find(p=>p.isGround&&x>=p.x&&x<p.x+p.w); }
  function makeEnemy(x,type,range,dir,root=null){
    const s=enemySpecs[type]||enemySpecs[0], seg=groundUnder(x+s.hitW/2);
    return {x,y:ground-s.hitH,baseY:ground-s.hitH,w:s.hitW,h:s.hitH,drawW:s.drawW,drawH:s.drawH,speed:s.speed*L.enemySpeed,type,range,dir,base:x,
      alive:true,friend:false,segL:seg?seg.x:x-range,segR:seg?seg.x+seg.w-s.hitW:x+range,state:"walk",t:rand(.5,2),vy:0,hp:type===0?2:1,
      rot:0,say:null,sayT:0,flash:0,spawnT:rand(6.5,8.5),root,kids:0};
  }
  function resetBoss(){
    shockwaves.length=0; shots.length=0; arenaLocked=false;
    Object.assign(prize,{active:false,got:false});
    const g=L.goal;
    if (g.type==="boss") Object.assign(boss,{kind:"bear",active:false,awake:false,x:g.bossX,y:ground-150,w:116,h:150,vx:0,vy:0,hp:6,maxHp:6,timer:2.2,inv:0,face:-1,grounded:true,flee:false,gone:false,angry:false,stun:0});
    else if (g.type==="dragon") Object.assign(boss,{kind:"dragon",active:false,awake:false,x:g.bossX,y:200,w:140,h:100,vx:0,vy:0,hp:8,maxHp:8,timer:2.4,swoopT:6,phase:"hover",inv:0,face:-1,flee:false,gone:false,angry:false,t:0,targetX:g.bossX,moveT:4,dir:-1,stun:0,say:"",sayT:0});
    else Object.assign(boss,{active:false,flee:false});
  }
  function zoneAt(x){ const i=L.zones.findIndex(z=>x>=z.start&&x<z.end); return i<0?L.zones.length-1:i; }

  function reset(all=true){
    if(all){
      crystals.forEach(c=>c.got=false);hearts.forEach(h=>h.got=false);
      enemies=enemies.filter(e=>!e.root);enemies.forEach(e=>Object.assign(e,{alive:true,friend:false,fixed:false,x:e.base,y:e.baseY,state:"walk",vy:0,hp:e.type===0?2:1,kids:0,spawnT:rand(6.5,8.5),say:null,sayT:0}));
      collected=0;score=0;deaths=0;checkpoint=L.zones[0].checkpoint;befriended=[];raven.state="off";bugToast=false;
      flag.raised=0;flag.raising=false;
    }
    projectiles.length=0;throwCooldown=0;jumpWasHeld=false;
    if(all||!boss.flee)resetBoss();
    Object.assign(player,{x:checkpoint,y:300,vx:0,vy:0,grounded:false,coyote:0,jumpBuf:0,jumps:0,hp:maxHp(),inv:0,on:null,boost:false,pound:false});
    camera=Math.max(0,checkpoint-200);
    Object.assign(baby,{x:checkpoint-60,y:300,vx:0,vy:0,grounded:false,idle:0,on:null});
    setZone(zoneAt(checkpoint));bgFade=0;updateHud();
  }
  function start(index=0){
    ensureAudio();
    loadChapter(index);reset(true);snapshot=null;
    runTime=0;recT=0;ghostRec=[];ghostPlay=decodeGhost(progress.ghosts[L.id]);
    ui.brandSub.textContent=L.bonus?"BONUS":L.custom?"EIGENES":`KAPITEL ${L.id}`;
    ["start","win","pause","shop"].forEach(k=>ui[k].classList.add("hidden"));ui.pauseBtn.classList.remove("hidden");
    mode="play";running=true;paused=false;last=performance.now();canvas.focus();
    if(L.id===2)setTimeout(()=>toast("EIN EI FEHLT! FOLGE DER SPUR →"),400);
    if(L.id===3)setTimeout(()=>toast("DER KLEINE KOMMT MIT!"),400);
    if(L.ravenStart)setTimeout(()=>ravenAt(L.ravenStart.x,L.ravenStart.line),600);
    if(night)setTimeout(()=>toast("NACHTSCHICHT. DER RABE IST MÜDE."),1700);
    if(ghostPlay&&ghostOn)setTimeout(()=>toast("DEIN GEIST LÄUFT MIT · G AUS"),2900);
    cancelAnimationFrame(rafId);rafId=requestAnimationFrame(loop);
  }
  function toTitle(){
    running=false;mode="title";music.stop();cancelAnimationFrame(rafId);paused=false;music.pause(false);
    ["win","pause","shop"].forEach(k=>ui[k].classList.add("hidden"));ui.pauseBtn.classList.add("hidden");
    buildMenu();ui.start.classList.remove("hidden");
  }
  function togglePause(force){if(mode!=="play")return;paused=force??!paused;music.pause(paused);ui.pause.classList.toggle("hidden",!paused)}
  function toast(text){ui.toast.textContent=text;ui.toast.classList.remove("hidden");clearTimeout(toast.t);toast.t=setTimeout(()=>ui.toast.classList.add("hidden"),1400)}
  function updateHud(){
    ui.crystals.textContent=`${String(collected).padStart(2,"0")} / ${String(total).padStart(2,"0")}`;ui.score.textContent=String(score).padStart(6,"0");
    const m=maxHp();ui.hearts.textContent=("♥ ".repeat(Math.max(0,player.hp))+"♡ ".repeat(Math.max(0,m-player.hp))).trim();
    ui.time.textContent=fmtTime(runTime);
  }
  function setZone(index,announce=false){
    activeZone=index;const z=L.zones[index];ui.zoneName.textContent=z.name;ui.objective.textContent=z.objective;
    if(z.backdrop!==bgKey){prevBgKey=bgKey;bgKey=z.backdrop;bgFade=1}
    if(z.music&&!(boss.active&&!boss.flee))music.play(z.music);
    if(announce)toast(z.name);
  }
  function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
  function burst(x,y,color,n=10,spd=300){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*spd,vy:-Math.random()*250-40,life:1,color,s:3+Math.random()*5})}
  function hurt(){
    if(player.inv>0)return;player.hp--;player.inv=1.3;shake=12;burst(player.x+20,player.y+30,"#ff654f",12);updateHud();sfx.hurt();
    if(player.hp<=0){deaths++;reset(false);toast("NOCH EIN VERSUCH!")}
    else{player.vy=-440;player.vx=-player.face*280;player.pound=false}
  }

  // ================================================================ Eingabe (Tastatur, Touch, Gamepad)
  let padStartHeld=false;
  function pad(){
    const out={left:false,right:false,jump:false,throw:false,down:false};
    const pads=navigator.getGamepads?navigator.getGamepads():[];
    for(const p of pads){ if(!p)continue; const b=i=>p.buttons[i]&&p.buttons[i].pressed;
      out.left||=p.axes[0]<-.4||b(14); out.right||=p.axes[0]>.4||b(15); out.jump||=b(0); out.throw||=b(2)||b(1)||b(5); out.down||=p.axes[1]>.6||b(13);
      const st=b(9); if(st&&!padStartHeld&&mode==="play")togglePause(); padStartHeld=st;
    }
    return out;
  }
  function input(){
    const g=pad();
    return {
      left:keys.ArrowLeft||keys.KeyA||touch.left||g.left, right:keys.ArrowRight||keys.KeyD||touch.right||g.right,
      jump:keys.Space||keys.KeyW||keys.ArrowUp||touch.jump||g.jump, throw:keys.KeyF||keys.KeyX||touch.throw||g.throw,
      down:keys.KeyS||keys.ArrowDown||touch.down||g.down
    };
  }

  // ================================================================ Eisbären werfen
  function throwBear(){
    const boom=!!progress.owned.boomerang;
    const mk=vy=>({x:player.x+player.w/2+player.face*26,y:player.y+25,w:38,h:32,vx:player.face*650,vy,rot:0,life:boom?2.4:1.8,t:0,boomerang:boom});
    projectiles.push(mk(-150)); if(progress.owned.double)projectiles.push(mk(-470));
    throwCooldown=.38;touch.throw=false;burst(player.x+player.w/2,player.y+30,"#fff3d5",4);sfx.throw();
  }
  function updateProjectiles(dt){
    projectiles.forEach(p=>{
      p.t+=dt;
      if(p.boomerang&&p.t>.42){const tx=player.x+23,ty=player.y+30,dx=tx-(p.x+p.w/2),dy=ty-(p.y+p.h/2),d=Math.hypot(dx,dy)||1;p.vx=dx/d*720;p.vy=dy/d*720;if(d<40)p.life=0}
      else p.vy+=520*dt;
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=(p.boomerang?18:p.vx*.009)*dt;p.life-=dt;
      enemies.forEach(e=>{if(e.alive&&p.life>0&&e.flash<=0&&overlap(p,e)){if(!p.boomerang)p.life=0;hitEnemy(e,p)}});
      if(boss.active&&boss.awake&&!boss.flee&&p.life>0&&boss.inv<=0&&overlap(p,boss)){if(!p.boomerang)p.life=0;damageBoss(1)}
    });
    for(let i=projectiles.length-1;i>=0;i--)if(projectiles[i].life<=0||projectiles[i].y>H+100)projectiles.splice(i,1);
  }

  // ================================================================ Gegner
  function befriend(e,points=100){
    e.alive=false;score+=points;
    if(e.type===4){e.fixed=true;burst(e.x+e.w/2,e.y+10,"#5aff8c",16);sfx.fix();if(!bugToast){bugToast=true;toast("BUG GEFIXT!")}}
    else{e.friend=true;e.state="sit";e.rot=0;e.say=pick(friendSays);e.sayT=1.8;befriended.push(e.type);burst(e.x+e.w/2,e.y+20,"#ff8fb0",14);sfx.friend()}
    updateHud();
  }
  function hitEnemy(e,p){
    if(e.type===0&&e.hp>1){e.hp--;e.flash=.35;e.say="HUCH!";e.sayT=.9;e.x+=Math.sign(p.vx||1)*14;burst(e.x+e.w/2,e.y+20,"#fff3d5",8);sfx.stomp();return}
    befriend(e,150);
  }
  function sameBand(e){return Math.abs((player.y+player.h)-(e.y+e.h))<90}
  function updateEnemy(e,dt){
    e.sayT=Math.max(0,e.sayT-dt);e.flash=Math.max(0,e.flash-dt);
    if(!e.alive)return;
    const lo=Math.max(e.base-e.range,e.segL),hi=Math.min(e.base+e.range,e.segR);
    const dxp=(player.x+23)-(e.x+e.w/2),near=Math.abs(dxp);
    const walk=(spd,l=lo,h=hi)=>{e.x+=e.dir*spd*dt;if(e.x<l){e.x=l;e.dir=1}else if(e.x>h){e.x=h;e.dir=-1}};
    e.t-=dt;
    switch(e.type){
      case 1: // Fuchs: hüpft beim Patrouillieren
        walk(e.speed);
        if(e.t<=0&&e.y>=e.baseY){e.vy=-430;e.t=rand(1.3,2)}
        e.vy+=1500*dt;e.y+=e.vy*dt;if(e.y>=e.baseY){e.y=e.baseY;e.vy=0}
        break;
      case 2: // Giraffe: bemerkt Dino Girl und sprintet los
        if(e.state==="walk"){walk(e.speed);if(near<280&&sameBand(e)&&e.t<=0){e.state="alert";e.t=.5;e.dir=Math.sign(dxp)||e.dir}}
        else if(e.state==="alert"){if(e.t<=0){e.state="charge";e.t=.75}}
        else if(e.state==="charge"){walk(e.speed*3.4,e.segL,e.segR);if(e.t<=0){e.state="walk";e.t=1.8}}
        break;
      case 3: // Nilpferd: rollt sich ein und rollt los
        if(e.state==="walk"){walk(e.speed);if(near<320&&sameBand(e)&&e.t<=0){e.state="curl";e.t=.35;e.dir=Math.sign(dxp)||e.dir}}
        else if(e.state==="curl"){if(e.t<=0){e.state="roll";e.t=1.5}}
        else if(e.state==="roll"){walk(320,e.segL,e.segR);e.rot+=e.dir*dt*11;if(e.t<=0){e.state="dizzy";e.t=1.3;e.rot=0}}
        else if(e.state==="dizzy"){if(e.t<=0){e.state="walk";e.t=2}}
        break;
      case 4: // Bug: flink und vermehrt sich
        walk(e.speed*1.1);
        e.spawnT-=dt;
        if(e.spawnT<=0){e.spawnT=rand(6.5,8.5);const root=e.root||e;
          if(root.kids<2&&enemies.filter(b=>b.type===4&&b.alive).length<24){root.kids++;const k=makeEnemy(Math.max(e.segL,Math.min(e.segR,e.x+rand(-50,50))),4,e.range,-e.dir,root);k.base=e.base;enemies.push(k);burst(k.x+20,k.y+10,"#c77dff",10);if(Math.abs(e.x-player.x)<W)toast("BUG HAT SICH VERMEHRT!")}}
        break;
      default: walk(e.speed);
    }
    if(overlap(player,e)){
      if(player.vy>150&&player.y+player.h<e.y+24){const p=player.pound;befriend(e,100);player.vy=p?-520:-440;if(p){player.pound=false;poundImpact()}else sfx.stomp()}
      else hurt();
    }
  }

  // ================================================================ Stampf-Attacke
  function poundImpact(){
    shake=18;sfx.boom();
    for(let i=0;i<24;i++){const a=i/24*Math.PI;particles.push({x:player.x+23,y:player.y+player.h,vx:Math.cos(a)*420*(i%2?1:-1),vy:-Math.sin(a)*160,life:.8,color:"#d6e9b4",s:5})}
    const fx=player.x+23,fy=player.y+player.h;
    enemies.forEach(e=>{if(e.alive&&Math.abs(e.x+e.w/2-fx)<170&&Math.abs(e.y+e.h-fy)<50)befriend(e,120)});
    if(boss.active&&boss.kind==="bear"&&boss.awake&&!boss.flee&&boss.grounded&&Math.abs(boss.x+boss.w/2-fx)<240){boss.stun=1.3;toast("BÄR BENOMMEN!")}
  }

  // ================================================================ Bosse
  function damageBoss(n){
    if(boss.inv>0||boss.flee)return;
    boss.hp=Math.max(0,boss.hp-n);boss.inv=.7;score+=200*n;shake=10;burst(boss.x+boss.w/2,boss.y+40,"#fff3d5",20);sfx.bossHit();updateHud();
    if(boss.hp<=boss.maxHp/2&&!boss.angry){boss.angry=true;toast(boss.kind==="bear"?"DER BÄR WIRD SAUER!":"ESKALATION ANS MANAGEMENT!")}
    if(boss.hp<=0){
      boss.flee=true;music.stop();score+=1000;updateHud();shots.length=0;shockwaves.length=0;
      toast(boss.kind==="bear"?"DER BÄR TROLLT SICH BELEIDIGT!":"TICKET GESCHLOSSEN!");
      Object.assign(prize,{active:true,got:false,x:boss.x+boss.w/2,y:boss.y-10,vy:-520,kind:boss.kind==="bear"?"egg":"mug"});
    }
  }
  function startBoss(){
    boss.active=true;arenaLocked=true;music.play(boss.kind==="bear"?"boss":"drache");toast(`BOSS · ${L.goal.name||"BOSS"}`);
    setTimeout(()=>{if(boss.active)boss.awake=true},900);
  }
  function updateBear(dt){
    const arena=L.goal.arena;
    if(boss.flee){boss.face=1;boss.x+=280*dt;boss.y=ground-boss.h;if(boss.x>L.worldW+200)boss.gone=true;return}
    if(!boss.awake)return;
    boss.inv=Math.max(0,boss.inv-dt);boss.stun=Math.max(0,boss.stun-dt);boss.timer-=dt;
    const toward=Math.sign(player.x-boss.x)||boss.face;
    if(boss.grounded){
      if(boss.stun>0)boss.vx=0;
      else{boss.face=toward;boss.vx=toward*(boss.angry?125:80);
        if(boss.timer<=0){boss.vy=-860;boss.vx=Math.max(-430,Math.min(430,(player.x-boss.x)*.95));boss.grounded=false;boss.timer=boss.angry?1.5:2.4;sfx.jump()}}
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
      if(player.vy>150&&player.y+player.h<boss.y+40){const p=player.pound;player.vy=-640;player.pound=false;damageBoss(p?2:1);sfx.stomp();if(p)poundImpact()}
      else if(boss.stun<=0)hurt();
    }
  }
  function updateDragon(dt){
    const arena=L.goal.arena,minX=arena+60,maxX=L.worldW-boss.w-60;
    boss.t+=dt;boss.sayT=Math.max(0,boss.sayT-dt);
    if(boss.flee){boss.face=1;boss.x+=320*dt;boss.y-=210*dt;if(boss.y<-260)boss.gone=true;return}
    if(!boss.awake)return;
    boss.inv=Math.max(0,boss.inv-dt);
    if(boss.phase==="hover"){
      boss.moveT-=dt;if(boss.moveT<=0){boss.moveT=rand(3,4.5);boss.targetX=boss.x>(minX+maxX)/2?rand(minX,minX+300):rand(maxX-300,maxX)}
      boss.x+=Math.sign(boss.targetX-boss.x)*Math.min(Math.abs(boss.targetX-boss.x),150*dt);
      boss.y+=((190+Math.sin(boss.t*1.7)*45)-boss.y)*Math.min(1,dt*3);
      boss.face=Math.sign(player.x-boss.x)||boss.face;
      boss.timer-=dt;
      if(boss.timer<=0){
        const n=boss.angry?5:3,sx=boss.x+boss.w/2+boss.face*60,sy=boss.y+62;
        for(let i=0;i<n;i++){const vx=Math.max(-560,Math.min(560,(player.x+23-sx)/1.15+(i-(n-1)/2)*95));shots.push({x:sx-15,y:sy,w:30,h:24,vx,vy:-260-i%2*60,rot:0,life:5})}
        boss.timer=boss.angry?1.7:2.5;boss.say=pick(dragonSays);boss.sayT=1.3;sfx.throw();
      }
      boss.swoopT-=dt;if(boss.swoopT<=0){boss.phase="dive";boss.dir=boss.x>(minX+maxX)/2?-1:1;boss.face=boss.dir}
    }else if(boss.phase==="dive"){
      boss.y+=((ground-boss.h-14)-boss.y)*Math.min(1,dt*5);if(Math.abs(boss.y-(ground-boss.h-14))<6){boss.phase="sweep";toast("ACHTUNG, STURZFLUG!")}
    }else if(boss.phase==="sweep"){
      boss.x+=boss.dir*(boss.angry?520:430)*dt;
      if(boss.x<minX||boss.x>maxX){boss.x=Math.max(minX,Math.min(maxX,boss.x));boss.phase="rise"}
    }else if(boss.phase==="rise"){
      boss.y+=(190-boss.y)*Math.min(1,dt*2.5);if(boss.y<230){boss.phase="hover";boss.swoopT=boss.angry?4.5:6.5}
    }
    if(overlap(player,boss)){
      if(player.vy>150&&player.y+player.h<boss.y+40){const p=player.pound;player.vy=-680;player.pound=false;damageBoss(p?2:1);sfx.stomp()}
      else hurt();
    }
  }
  function updateArena(dt){
    const g=L.goal;
    if(g.type!=="boss"&&g.type!=="dragon")return;
    if(!boss.active&&!boss.flee&&player.x>g.arena+120)startBoss();
    if(boss.active&&!boss.gone)(boss.kind==="bear"?updateBear:updateDragon)(dt);
    shockwaves.forEach(s=>{s.x+=s.vx*dt;s.life-=dt;if(s.life>0&&overlap(player,s))hurt()});
    for(let i=shockwaves.length-1;i>=0;i--)if(shockwaves[i].life<=0)shockwaves.splice(i,1);
    shots.forEach(s=>{s.vy+=700*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.rot+=dt*6;s.life-=dt;
      if(s.y+s.h>ground){s.life=0;burst(s.x+15,ground-6,"#f4f1e6",6)}
      if(s.life>0&&overlap(player,s)){s.life=0;hurt()}});
    for(let i=shots.length-1;i>=0;i--)if(shots[i].life<=0)shots.splice(i,1);
    if(prize.active&&!prize.got){
      prize.vy+=1400*dt;prize.y+=prize.vy*dt;if(prize.y>ground-30){prize.y=ground-30;prize.vy=0}
      if(Math.hypot(player.x+23-prize.x,player.y+35-prize.y)<56){prize.got=true;score+=500;burst(prize.x,prize.y,prize.kind==="egg"?"#fff0bd":"#ffcf45",30);updateHud();win()}
    }
  }

  // ================================================================ Kolkrabe of Doom
  function ravenAt(x,line){Object.assign(raven,{state:"in",tx:x,ty:280,x:x+W*.75,y:-90,t:0,face:-1,line})}
  function ravenArrive(zone){
    const sign=L.signs.find(s=>s[0]===zone.start);if(!sign)return;
    const pool=night?ravenNight:ravenLines;
    ravenAt(sign[0],zone.raven||pool[Math.floor(Math.random()*pool.length)]);
  }
  function updateRaven(dt){
    if(raven.state==="off")return;raven.t+=dt;
    if(raven.state==="in"){
      const k=Math.min(1,dt*3.2);raven.x+=(raven.tx-raven.x)*k;raven.y+=(raven.ty-raven.y)*k;
      if(Math.hypot(raven.tx-raven.x,raven.ty-raven.y)<5){Object.assign(raven,{x:raven.tx,y:raven.ty,state:"perch",t:0});sfx.krah();burst(raven.x,raven.y,"#3a4170",8)}
    }else if(raven.state==="perch"){
      raven.face=player.x+23<raven.x?-1:1;
      if(raven.t>(night?3.6:2.9)){raven.state="out";raven.t=0;sfx.krah()}
    }else{raven.face=1;raven.x+=280*dt;raven.y-=230*dt;if(raven.y<-160)raven.state="off"}
  }

  // ================================================================ Baby-Dino
  function landBody(b,oldBottom){
    let landed=false,on=null;
    for(const p of platforms){if(b.x+b.w>p.x+4&&b.x<p.x+p.w-4&&oldBottom<=p.y+8&&b.y+b.h>=p.y&&b.vy>=0){b.y=p.y-b.h;b.vy=0;landed=true}}
    for(const m of movers){if(b.x+b.w>m.x+4&&b.x<m.x+m.w-4&&oldBottom<=Math.max(m.y,m.py)+8&&b.y+b.h>=m.y&&b.vy>=0){b.y=m.y-b.h;b.vy=0;landed=true;on=m}}
    return {landed,on};
  }
  function supportAt(x,y){return platforms.some(p=>x>p.x&&x<p.x+p.w&&p.y>=y-4&&p.y<y+140)||movers.some(m=>x>m.x&&x<m.x+m.w&&Math.abs(m.y-y)<60)}
  function updateBaby(dt){
    if(!baby.active)return;
    baby.t+=dt;
    if(baby.on){baby.x+=baby.on.x-baby.on.px;baby.y+=baby.on.y-baby.on.py}
    const target=player.x+player.w/2-player.face*70-baby.w/2,dx=target-baby.x;
    if(baby.idle>0){baby.idle-=dt;baby.vx=0;if(Math.abs(dx)>260)baby.idle=0}
    else baby.vx=Math.abs(dx)>24?Math.sign(dx)*Math.min(360,Math.abs(dx)*3.2):0;
    if(baby.grounded&&baby.idle<=0&&Math.abs(dx)<90&&Math.random()<dt*.12)baby.idle=1.3;
    if(baby.grounded){
      const ahead=baby.x+baby.w/2+Math.sign(baby.vx)*34;
      if((baby.vx&&!supportAt(ahead,baby.y+baby.h))||(player.y+player.h<baby.y+baby.h-60&&Math.abs(dx)<300&&player.grounded)){baby.vy=-800;baby.grounded=false;baby.on=null}
    }
    updrafts.forEach(u=>{if(baby.x+baby.w/2>u.x&&baby.x+baby.w/2<u.x+u.w&&baby.y>u.top)baby.vy=Math.max(baby.vy-3200*dt,-560)});
    baby.vy=Math.min(baby.vy+1850*dt,1100);
    baby.x+=baby.vx*dt;const ob=baby.y+baby.h;baby.y+=baby.vy*dt;
    const r=landBody(baby,ob);baby.grounded=r.landed;baby.on=r.on;
    if(baby.vx)baby.face=Math.sign(baby.vx);else baby.face=Math.sign(player.x-baby.x)||baby.face;
    if(baby.y>H+60||Math.hypot(dx,player.y-baby.y)>700){Object.assign(baby,{x:player.x-player.face*50,y:player.y,vx:0,vy:0,on:null});burst(baby.x+20,baby.y+20,"#b9f34a",10)}
    crystals.forEach(c=>{if(!c.got&&Math.hypot(baby.x+20-c.x,baby.y+20-c.y)<46){c.got=true;collected++;score+=25;burst(c.x,c.y,"#ffcf45",12);updateHud();sfx.coin()}});
  }

  // ================================================================ Geist (Bestzeit-Wiederholung)
  function decodeGhost(g){return Array.isArray(g)&&g.length>6?g:null}
  function ghostAt(t){
    if(!ghostPlay)return null;const f=t/.1,i=Math.floor(f),k=f-i,a=i*3,b=a+3;
    if(b+2>=ghostPlay.length)return null;
    return {x:ghostPlay[a]+(ghostPlay[b]-ghostPlay[a])*k,y:ghostPlay[a+1]+(ghostPlay[b+1]-ghostPlay[a+1])*k,face:ghostPlay[a+2]};
  }

  // ================================================================ Rausch-Fernseher / Geheimlevel
  function useTv(tv){
    sfx.tv();shake=8;
    if(tv.target==="bonus"){
      snapshot={ci:chapterIndex,x:tv.x-23,y:tv.y-player.h-4,score,collected,coins:crystals.map(c=>c.got),hearts:hearts.map(h=>h.got),
        enemies:enemies.filter(e=>!e.root).map(e=>({alive:e.alive,friend:e.friend,x:e.x})),checkpoint,runTime,ghostRec:ghostRec.slice(),befriended:befriended.slice(),hp:player.hp};
      progress.secret=true;save();
      const keep=snapshot;loadChapter(chapters.findIndex(c=>c.bonus));reset(true);snapshot=keep;score=keep.score;ghostRec=[];updateHud();
      ui.brandSub.textContent="BONUS";setTimeout(()=>ravenAt(L.ravenStart.x,L.ravenStart.line),500);toast("… RAUSCHEN …");
    }else if(snapshot){
      const s=snapshot,bonusCoins=collected;progress.wallet+=bonusCoins;save();
      loadChapter(s.ci);reset(true);
      crystals.forEach((c,i)=>c.got=s.coins[i]);hearts.forEach((h,i)=>h.got=s.hearts[i]);
      enemies.forEach((e,i)=>{const o=s.enemies[i];if(o){e.alive=o.alive;e.friend=o.friend;e.x=o.x;if(e.friend)e.state="sit"}});
      Object.assign(player,{x:s.x,y:s.y,hp:s.hp});score=s.score;collected=s.collected;checkpoint=s.checkpoint;runTime=s.runTime;ghostRec=s.ghostRec;befriended=s.befriended;
      camera=Math.max(0,player.x-400);setZone(zoneAt(player.x));snapshot=null;ui.brandSub.textContent=`KAPITEL ${L.id}`;updateHud();
      toast(`+${bonusCoins} MÜNZEN INS LADEN-KONTO`);
    }else win();
  }

  // ================================================================ Physik
  function physics(dt){
    worldTime+=dt;runTime+=dt;bgFade=Math.max(0,bgFade-dt*1.4);
    recT+=dt;if(recT>=.1){recT-=.1;ghostRec.push(Math.round(player.x),Math.round(player.y),player.face)}
    hudT-=dt;if(hudT<=0){hudT=.25;ui.time.textContent=fmtTime(runTime)}
    const inp=input();
    throwCooldown=Math.max(0,throwCooldown-dt);if(inp.throw&&throwCooldown<=0)throwBear();
    const downPressed=inp.down&&!downWasHeld;downWasHeld=inp.down;
    const accel=player.grounded?2100:1250, target=player.pound?0:(inp.right?1:0)-(inp.left?1:0);
    player.vx += (target*330-player.vx)*Math.min(1,accel*dt/330); if(target)player.face=target;
    if(inp.jump&&!jumpWasHeld)player.jumpBuf=.14;jumpWasHeld=inp.jump;
    if(!inp.jump)touch.jump=false;
    player.jumpBuf=Math.max(0,player.jumpBuf-dt);player.coyote=Math.max(0,player.coyote-dt);
    if(player.jumpBuf>0&&!player.pound){
      if(player.grounded||player.coyote>0){
        player.vy=-690;player.grounded=false;player.coyote=0;player.jumpBuf=0;player.jumps=1;player.on=null;burst(player.x+23,player.y+70,"#fff0bd",5);sfx.jump();
      }else if(player.jumps<2){
        const doubleJump=player.jumps===1;player.vy=doubleJump?-820:-690;player.jumpBuf=0;player.jumps=doubleJump?2:1;
        burst(player.x+23,player.y+62,doubleJump?"#78d9ff":"#fff0bd",doubleJump?14:7);if(doubleJump){toast("DOUBLE JUMP!");sfx.double()}else sfx.jump();
      }
    }
    // Stampf-Attacke: in der Luft nach unten drücken
    if(downPressed&&!player.grounded&&!player.pound&&player.coyote<=0){player.pound=true;player.vy=1250;player.vx=0;player.boost=false;sfx.pound();burst(player.x+23,player.y+30,"#ffffff",6)}
    if(player.vy>=0)player.boost=false;
    if(!inp.jump&&player.vy<0&&!player.boost)player.vy+=1200*dt;
    player.vy+=1850*dt;player.vy=Math.min(player.vy,player.pound?1400:1100);
    updrafts.forEach(u=>{if(player.x+23>u.x&&player.x+23<u.x+u.w&&player.y>u.top){player.vy=Math.max(player.vy-3200*dt,-560);player.pound=false;if(player.jumps>1)player.jumps=1}});

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
        const sup=player.pound;player.y=s.y-player.h;player.vy=sup?-1380:-1150;player.boost=true;player.pound=false;player.jumps=1;player.grounded=false;landed=false;on=null;s.squash=1;
        burst(s.x+s.w/2,s.y,"#ffcf45",sup?18:10);toast(sup?"SUPER-BOING!":"BOING!");sfx.boing();
      }
    }
    player.on=on;
    if(landed){
      if(!player.grounded&&player.vy===0)burst(player.x+23,player.y+72,"#d6e9b4",4);
      if(player.pound){player.pound=false;poundImpact()}
      player.grounded=true;player.coyote=.11;player.jumps=0;
    }else if(player.grounded){player.grounded=false;player.coyote=.11}
    const feet=player.y+player.h,surface=ground+22;
    if(feet>surface&&feet-player.vy*dt<=surface&&L.zones[zoneAt(player.x)].gap==="water"){burst(player.x+23,surface,"#9fd3ff",22);sfx.splash()}
    if(player.y>H+160){
      const wet=L.zones[zoneAt(player.x)].gap==="water";deaths++;reset(false);
      toast(wet?"PLATSCH! DINOS SIND KEINE ENTEN.":"VORSICHT, ABGRUND!");
    }

    const zoneIndex=zoneAt(player.x);
    if(zoneIndex!==activeZone){const forward=zoneIndex>activeZone;if(forward)checkpoint=L.zones[zoneIndex].checkpoint;setZone(zoneIndex,forward);if(forward)ravenArrive(L.zones[zoneIndex])}
    updateRaven(dt);
    player.inv=Math.max(0,player.inv-dt);
    hazards.forEach(h=>{if(overlap(player,h))hurt()});
    crystals.forEach(c=>{if(!c.got&&Math.hypot(player.x+23-c.x,player.y+35-c.y)<48){c.got=true;collected++;score+=25;burst(c.x,c.y,"#ffcf45",16);updateHud();sfx.coin()}});
    hearts.forEach(h=>{if(!h.got&&Math.hypot(player.x+23-h.x,player.y+35-h.y)<48){h.got=true;burst(h.x,h.y,"#ff654f",18);if(player.hp<maxHp()){player.hp++;toast("+1 LEBEN")}else{score+=50;toast("+50 · HERZ VOLL")}updateHud();sfx.heart()}});
    updateProjectiles(dt);
    for(const e of enemies.slice())updateEnemy(e,dt);
    updateBaby(dt);

    for(const tv of tvs){tv.near=player.grounded&&Math.abs(player.x+23-tv.x)<50&&Math.abs(player.y+player.h-tv.y)<12;if(tv.near&&downPressed&&mode==="play"){useTv(tv);break}}

    // Ziele
    const g=L.goal;
    if(g.type==="nest"&&player.x>g.x)win();
    if(g.type==="flag"&&!flag.raising&&Math.abs(player.x+23-g.x)<36&&player.y+player.h<=g.y+4&&player.y+player.h>g.y-170){flag.raising=true;sfx.win();toast("FAHNE HOCH!")}
    if(flag.raising){flag.raised=Math.min(1,flag.raised+dt*1.4);if(flag.raised>=1&&mode==="play")win()}
    updateArena(dt);

    const camTarget=arenaLocked?L.goal.arena:Math.max(0,Math.min(L.worldW-W,player.x-W*.36));
    camera+=(camTarget-camera)*Math.min(1,dt*4.5);
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=700*dt;p.life-=dt*1.7});for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);
  }

  // ================================================================ Sieg, Schlüpf-Szene
  let cut=null;
  function win(){
    if(mode!=="play")return;
    if(L.hatch&&!cut){mode="cutscene";music.stop();particles.length=0;cut={t:0,friends:befriended.filter(t=>t!==4).slice(0,8)};if(!cut.friends.length)cut.friends=[0,1,2,3];ui.pauseBtn.classList.add("hidden");return}
    finishWin();
  }
  function finishWin(){
    mode="won";running=false;cut=null;ui.pauseBtn.classList.add("hidden");music.stop();sfx.win();
    const txt=L.win||{eyebrow:"GESCHAFFT!",title:"SUPER!",text:""};
    if(!L.custom)progress.wallet+=collected;
    let bestLine="";
    if(!L.custom&&!L.bonus){
      const b=progress.best[L.id]||{},newTime=!b.time||runTime<b.time,newScore=!b.score||score>b.score;
      progress.best[L.id]={score:Math.max(score,b.score||0),time:newTime?runTime:b.time};
      if(newTime&&ghostRec.length>6)progress.ghosts[L.id]=ghostRec;
      bestLine=`ZEIT ${fmtTime(runTime)}${newTime?" · NEUE BESTZEIT!":` · BESTZEIT ${fmtTime(b.time)}`}${newScore&&b.score?" · NEUER HIGHSCORE!":""} · `;
      if(L.id<4)progress.unlocked=Math.max(progress.unlocked,L.id+1);
      if(L.hatch)progress.hatched=true;
    }
    save();
    ui.winEyebrow.textContent=txt.eyebrow;ui.winTitle.textContent=txt.title;
    ui.winStats.textContent=`Score ${String(score).padStart(6,"0")} · ${collected} von ${total} Münzen · ${befriended.length} neue Freunde. ${txt.text}`;
    ui.winBest.textContent=bestLine+(L.custom?"":`LADEN-KONTO: ${progress.wallet} MÜNZEN`);
    const next=!L.custom&&!L.bonus&&L.id<4;
    ui.nextBtn.classList.toggle("hidden",!next);if(next)ui.nextBtn.innerHTML=`WEITER: KAPITEL ${L.id+1} <span>→</span>`;
    ui.win.classList.remove("hidden");
  }
  function updateCut(dt){
    cut.t+=dt;worldTime+=dt;
    if(cut.t>3.2&&!cut.hatched){cut.hatched=true;sfx.hatch();shake=10;for(let i=0;i<30;i++)particles.push({x:640,y:ground-80,vx:(Math.random()-.5)*500,vy:-Math.random()*400,life:1.2,color:i%2?"#fff0bd":"#ff654f",s:5})}
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=700*dt;p.life-=dt*1.2});for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);
    if(cut.t>7.2)finishWin();
  }
  function skipCut(){if(cut&&cut.t>1)finishWin()}

  // ================================================================ Zeichnen: Hilfen
  const palettes={
    brick:{base:"#8b3f21",top:"#d47a35",hi:"#f0a14b",line:"#241018",glow:"rgba(255,170,73,.24)"},
    quay:{base:"#3c4868",top:"#8494b4",hi:"#c3d0e4",line:"#0f1424",glow:"rgba(170,200,255,.16)"},
    cobble:{base:"#3a3a48",top:"#7d7d92",hi:"#a9a9bd",line:"#15151d",glow:"rgba(200,200,255,.12)"},
    castle:{base:"#4a4c6e",top:"#8a8cb0",hi:"#b4b6d6",line:"#1a1b2e",glow:"rgba(255,190,120,.14)"}
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
    if(h>28){ctx.fillStyle="#120c16";ctx.fillRect(x,y,w,h);ctx.strokeStyle="#6e2f22";ctx.lineWidth=6;
      for(let bx=x;bx<x+w;bx+=60){ctx.beginPath();ctx.moveTo(bx,y+28);ctx.lineTo(Math.min(bx+60,x+w),y+h);ctx.moveTo(Math.min(bx+60,x+w),y+28);ctx.lineTo(bx,y+h);ctx.stroke()}}
    ctx.fillStyle="#a8481f";ctx.fillRect(x,y,w,26);ctx.fillStyle="#e3843a";ctx.fillRect(x,y,w,6);
    ctx.fillStyle="#6b2614";ctx.fillRect(x,y+20,w,6);ctx.fillRect(x+10,y+6,w-20,4);
    ctx.fillStyle="#ffd08a";for(let bx=x+12;bx<x+w-6;bx+=28)ctx.fillRect(bx,y+12,4,4);
    ctx.strokeStyle="#241018";ctx.lineWidth=3;ctx.strokeRect(x+1.5,y+1.5,w-3,23);
  }
  function cratePlatform(p){
    const {x,y,w,h}=p,size=52,rows=h>28?Math.ceil(h/size):1;
    for(let r=0;r<rows;r++)for(let cx=x;cx<x+w;cx+=size){
      const cw=Math.min(size,x+w-cx),cy=y+r*size,ch=h>28?size:46;
      ctx.fillStyle=r?"#4a2a14":"#7a4a24";ctx.fillRect(cx,cy,cw,ch);
      ctx.strokeStyle="#22120a";ctx.lineWidth=4;ctx.strokeRect(cx+2,cy+2,cw-4,ch-4);
      ctx.strokeStyle=r?"#5c3418":"#9b6232";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx+5,cy+5);ctx.lineTo(cx+cw-5,cy+ch-5);ctx.stroke();
      if(!r){ctx.fillStyle="#c98a4a";ctx.fillRect(cx+4,cy+3,cw-8,4)}
    }
  }
  function rackPlatform(p){
    const {x,y,w,h}=p,dh=h<=28?40:h;
    ctx.fillStyle="#1a2350";ctx.fillRect(x,y,w,dh);ctx.fillStyle="#5a6cc0";ctx.fillRect(x,y,w,7);ctx.fillStyle="#a8b8ff";ctx.fillRect(x,y,w,2);
    ctx.fillStyle="#070a1e";for(let sy=y+12;sy<y+dh-4;sy+=10)ctx.fillRect(x+6,sy,w-12,5);
    const leds=["#5aff8c","#5ac8ff","#ffbe46","#ff4646"];
    for(let sy=y+13,i=0;sy<y+dh-4;sy+=10,i++)for(let lx=x+12;lx<x+w-10;lx+=34){if(Math.sin(worldTime*(3+((lx+sy)%5))+lx*.7+sy)>.2){ctx.fillStyle=leds[(lx+i)%4];ctx.fillRect(lx,sy+1,4,3)}}
    ctx.strokeStyle="#05071a";ctx.lineWidth=3;ctx.strokeRect(x+1.5,y+1.5,w-3,dh-3);ctx.strokeStyle="#7f90e0";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+3,y+dh-3);ctx.lineTo(x+3,y+3);ctx.lineTo(x+w-3,y+3);ctx.stroke();
  }
  function neonPlatform(p){
    const {x,y,w,h}=p,dh=h<=28?24:h;
    ctx.fillStyle="rgba(10,8,32,.75)";ctx.fillRect(x,y,w,dh);
    ctx.save();ctx.shadowColor="#6ee7ff";ctx.shadowBlur=16;ctx.strokeStyle=(Math.floor(x/100)%2)?"#6ee7ff":"#c77dff";ctx.lineWidth=3;ctx.strokeRect(x+2,y+2,w-4,h<=28?20:40);ctx.restore();
  }
  function drawPlatform(p){
    if(p.style==="girder")girderPlatform(p);else if(p.style==="crate")cratePlatform(p);else if(p.style==="rack")rackPlatform(p);else if(p.style==="neon")neonPlatform(p);else brickPlatform(p);
  }
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
    }else if(m.style==="seilbahn"){
      const ax=m.bx+w/2,ay=m.by-70,bx2=m.bx+m.dx+w/2,by2=m.by+m.dy-70,ex=(bx2-ax)*.3,ey=(by2-ay)*.3;
      ctx.strokeStyle="#0c0a14";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(ax-ex,ay-ey);ctx.lineTo(bx2+ex,by2+ey);ctx.stroke();
      ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x+w/2,y-70);ctx.lineTo(x+w/2,y-34);ctx.stroke();
      ctx.fillStyle="#c0392b";ctx.fillRect(x+10,y-34,w-20,34);ctx.fillStyle="#ffcf45";ctx.fillRect(x+18,y-28,22,14);ctx.fillRect(x+w-40,y-28,22,14);
      ctx.fillStyle="#7a1f16";ctx.fillRect(x,y,w,10);ctx.fillStyle="#e8604f";ctx.fillRect(x,y,w,3);
    }else if(m.style==="korb"){
      ctx.strokeStyle="#2a1a10";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+10,y);ctx.lineTo(x+w/2,y-50);ctx.lineTo(x+w-10,y);ctx.moveTo(x+w/2,y-50);ctx.lineTo(x+w/2,0);ctx.stroke();
      ctx.fillStyle="#8a5a2a";ctx.fillRect(x,y,w,22);ctx.strokeStyle="#4a2a10";ctx.lineWidth=2;for(let bx=x+6;bx<x+w;bx+=10){ctx.beginPath();ctx.moveTo(bx,y);ctx.lineTo(bx,y+22);ctx.stroke()}
      ctx.fillStyle="#c08a4a";ctx.fillRect(x,y,w,4);
    }else{
      ctx.strokeStyle="#1a1820";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+14,y);ctx.lineTo(x+w/2,y-60);ctx.lineTo(x+w-14,y);ctx.moveTo(x+w/2,y-60);ctx.lineTo(x+w/2,0);ctx.stroke();
      ctx.fillStyle="#ffcf45";ctx.fillRect(x+w/2-6,y-66,12,10);girderPlatform({x,y,w,h:24});
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
    ctx.fillStyle="#f6c453";ctx.shadowColor="#ffd36b";ctx.shadowBlur=night?40:24;ctx.fillRect(x-17,356,34,45);ctx.shadowBlur=0;
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
  const HEART=["0110110","1111111","1111111","0111110","0011100","0001000"];
  function heart(h){
    const bob=Math.sin(performance.now()*.005+h.i)*6,px=5;
    ctx.save();ctx.translate(h.x-3.5*px,h.y-3*px+bob);ctx.shadowColor="#ff654f";ctx.shadowBlur=16;
    HEART.forEach((row,r)=>[...row].forEach((v,c)=>{if(v==="1"){ctx.fillStyle=r===1&&c<3&&c>0?"#ffd0c4":"#ef4b45";ctx.fillRect(c*px,r*px,px,px)}}));
    ctx.shadowBlur=0;ctx.restore();
  }
  function miniHeart(x,y,a){ctx.save();ctx.globalAlpha=Math.max(0,a);ctx.translate(x-7,y);HEART.forEach((row,r)=>[...row].forEach((v,c)=>{if(v==="1"){ctx.fillStyle="#ff6f91";ctx.fillRect(c*2,r*2,2,2)}}));ctx.restore()}
  function parkBench(x){
    ctx.fillStyle="#1b1025";ctx.fillRect(x-62,544,124,12);ctx.fillRect(x-66,566,132,12);ctx.fillRect(x-54,535,10,74);ctx.fillRect(x+44,535,10,74);
    ctx.fillStyle="#5f2a75";ctx.fillRect(x-58,540,116,10);ctx.fillRect(x-62,562,124,10);
    ctx.fillStyle="#b05ac1";ctx.fillRect(x-50,541,76,3);ctx.fillRect(x-54,563,88,3);
  }
  function bollard(x){ctx.fillStyle="#141824";ctx.fillRect(x-14,574,28,36);ctx.fillRect(x-20,566,40,10);ctx.fillStyle="#56607a";ctx.fillRect(x-10,578,6,28);ctx.fillStyle="#ffcf45";ctx.fillRect(x-14,586,28,5)}
  function pole(x){ctx.fillStyle="#120c1e";ctx.fillRect(x-4,420,8,190);ctx.fillRect(x-12,600,24,10);ctx.fillStyle="#ffcf45";ctx.fillRect(x-6,412,12,10)}
  function garlands(list){
    const colors=["#ff5c5c","#ffd65c","#6edcff","#a0ff78","#f078ff"];
    for(let i=0;i<list.length-1;i++){const a=list[i],b=list[i+1];if(b<camera-100||a>camera+W+100)continue;
      for(let s=0;s<=20;s++){const t=s/20,x=a+(b-a)*t,y=418+Math.sin(t*Math.PI)*46;ctx.fillStyle="#2a1a40";ctx.fillRect(x-1,y-1,3,3);
        if(s%2===0){ctx.fillStyle=colors[(s/2+i)%5];ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=10;ctx.fillRect(x-3,y+2,6,7);ctx.shadowBlur=0}}}
  }
  function bake(x){
    ctx.fillStyle="#141018";ctx.fillRect(x-18,600,36,10);
    for(let i=0;i<4;i++){ctx.fillStyle=i%2?"#f6f0e0":"#ef4b45";ctx.fillRect(x-8,520+i*20,16,20)}
    const on=Math.sin(worldTime*6+x)>0;ctx.fillStyle=on?"#ffb52e":"#5a3a10";ctx.shadowColor="#ffb52e";ctx.shadowBlur=on?18:0;ctx.fillRect(x-7,506,14,12);ctx.shadowBlur=0;
  }
  function fass(x){
    ctx.fillStyle="#3a200e";ctx.fillRect(x-30,548,60,62);ctx.fillStyle="#6b3a18";ctx.fillRect(x-26,552,52,54);
    ctx.fillStyle="#2a2a32";ctx.fillRect(x-30,560,60,6);ctx.fillRect(x-30,592,60,6);ctx.fillStyle="#8a5426";ctx.fillRect(x-18,552,6,54);
    ctx.fillStyle="#5a2a6a";ctx.fillRect(x-6,540,18,10);ctx.fillStyle="#3c7a26";ctx.fillRect(x+8,534,10,8);
  }
  function fackel(x){
    ctx.fillStyle="#2a1a10";ctx.fillRect(x-3,470,6,60);ctx.fillStyle="#4a4c6e";ctx.fillRect(x-10,524,20,8);
    const f=Math.sin(worldTime*17+x)*3;ctx.save();ctx.shadowColor="#ffa040";ctx.shadowBlur=night?40:26;
    ctx.fillStyle="#ff7a20";ctx.fillRect(x-7,452+f,14,18);ctx.fillStyle="#ffd060";ctx.fillRect(x-4,446-f,8,16);ctx.restore();
  }
  function kabel(x){
    ["#c74a4a","#4a8ac7","#e0c040","#5ac870"].forEach((c,i)=>{ctx.strokeStyle=c;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x+i*16,0);ctx.quadraticCurveTo(x+i*16+70,240+i*22+Math.sin(worldTime+i)*8,x+i*16+150,0);ctx.stroke()});
  }
  const DECOR={bench:parkBench,bollard,bake,pole,fass,lamp:streetLamp,fackel,kabel};
  function drawTv(tv){
    const x=tv.x-36,y=tv.y-58;
    ctx.fillStyle="#2a1a12";ctx.fillRect(x,y,72,54);ctx.fillStyle="#5a3a22";ctx.fillRect(x+3,y+3,66,48);
    ctx.fillStyle="#111";ctx.fillRect(x+8,y+8,44,36);
    for(let i=0;i<60;i++){ctx.fillStyle=Math.random()<.5?"#ddd":"#555";ctx.fillRect(x+8+(Math.random()*42|0),y+8+(Math.random()*34|0),3,2)}
    ctx.fillStyle="#c8a060";ctx.fillRect(x+56,y+12,8,8);ctx.fillRect(x+56,y+26,8,8);
    ctx.strokeStyle="#111";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+30,y);ctx.lineTo(x+18,y-18);ctx.moveTo(x+40,y);ctx.lineTo(x+54,y-16);ctx.stroke();
    if(tv.near&&Math.floor(worldTime*3)%2){ctx.fillStyle="#fff3d5";ctx.font="12px 'Press Start 2P', monospace";ctx.fillText("▼ S",tv.x-20,y-26)}
  }
  function drawFans(){
    updrafts.forEach(u=>{
      const cx=u.x+u.w/2,cy=680;
      ctx.fillStyle="#1a2250";ctx.fillRect(u.x+10,cy-14,u.w-20,40);ctx.strokeStyle="#4a5aa8";ctx.lineWidth=3;ctx.strokeRect(u.x+10,cy-14,u.w-20,40);
      ctx.save();ctx.translate(cx,cy+6);ctx.rotate(worldTime*14);ctx.fillStyle="#8aa0e8";for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.fillRect(-4,-30,8,30)}ctx.restore();
      ctx.strokeStyle="rgba(170,220,255,.32)";ctx.lineWidth=3;
      for(let k=0;k<12;k++){const sx=u.x+20+((k*53)%(u.w-40)),sy=H-((worldTime*300+k*97)%(H-u.top+40));ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx,sy+22);ctx.stroke()}
    });
  }
  function drawGaps(){
    const parts=platforms.filter(p=>p.isGround).sort((a,b)=>a.x-b.x);let cursor=0;const gaps=[];
    parts.forEach(p=>{if(p.x>cursor)gaps.push([cursor,p.x]);cursor=Math.max(cursor,p.x+p.w)});
    if(cursor<L.worldW)gaps.push([cursor,L.worldW]);
    gaps.forEach(([a,b])=>{
      const water=L.zones[zoneAt((a+b)/2)].gap==="water";
      if(!water){ctx.fillStyle="#03040d";ctx.fillRect(a,ground,b-a,H-ground);return}
      ctx.fillStyle="#06154a";ctx.fillRect(a,ground,b-a,H-ground);ctx.fillStyle="#0b2a7a";ctx.fillRect(a,ground+24,b-a,H-ground-24);
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
  function drawEgg(x,y,s=1,rot=0){
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(s,s);ctx.shadowColor="#fff0bd";ctx.shadowBlur=20;
    ctx.fillStyle="#fff0bd";ctx.beginPath();ctx.ellipse(0,0,17,23,0,0,7);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle="#ff654f";ctx.fillRect(-9,-6,7,6);ctx.fillRect(4,-12,7,6);ctx.fillRect(2,6,6,5);ctx.restore();
  }
  function drawMug(x,y){
    ctx.save();ctx.translate(x,y);ctx.shadowColor="#ffcf45";ctx.shadowBlur=22;
    ctx.fillStyle="#f2a817";ctx.fillRect(-16,-18,30,36);ctx.fillStyle="#ffe47a";ctx.fillRect(-12,-14,8,28);
    ctx.strokeStyle="#f2a817";ctx.lineWidth=6;ctx.beginPath();ctx.arc(16,0,9,-1.3,1.3);ctx.stroke();
    ctx.fillStyle="#54280e";ctx.fillRect(-16,-18,30,5);ctx.shadowBlur=0;
    ctx.fillStyle="rgba(255,255,255,.6)";for(let i=0;i<3;i++)ctx.fillRect(-8+i*8,-30-Math.sin(worldTime*4+i)*5,3,8);ctx.restore();
  }
  function drawTicket(s){
    ctx.save();ctx.translate(s.x+15,s.y+12);ctx.rotate(Math.sin(s.rot)*.6);
    ctx.fillStyle="#f4f1e6";ctx.fillRect(-15,-12,30,24);ctx.fillStyle="#9aa";for(let i=0;i<3;i++)ctx.fillRect(-11,-6+i*6,18,2);
    ctx.fillStyle="#ef4b45";ctx.fillRect(4,-10,9,9);ctx.fillStyle="#fff";ctx.font="bold 8px monospace";ctx.fillText("#",6,-3);ctx.restore();
  }
  const HATS={
    hat_party:{px:3,rows:["....Y....","...RRR...","...RYR...","..RRRRR..","..YRRRY..",".RRRRRRR.","YYYYYYYYY"],pal:{R:"#ef4b45",Y:"#ffcf45"}},
    hat_beret:{px:3,rows:["........KK..","..KKKKKKpK..",".KPPPPPPPPK.","KPPpppPPPPPK",".KKKKKKKKKK."],pal:{K:"#07070d",P:"#24203a",p:"#54507a"}},
    hat_crown:{px:3,rows:["Y..Y..Y","YY.Y.YY","YYYYYYY","YRYBYRY","YYYYYYY"],pal:{Y:"#ffcf45",R:"#ef4b45",B:"#4fa8ff"}},
    hat_helmet:{px:3,rows:["...KKKKK...","..KYYYYYK..",".KYYwYYYYK.",".KYYYYYYYK.","KKKKKKKKKKK"],pal:{K:"#241018",Y:"#ffcf45",w:"#fff3d5"}}
  };
  function drawHat(id){
    const h=HATS[id];if(!h)return;const wpx=h.rows[0].length*h.px,hpx=h.rows.length*h.px;
    h.rows.forEach((row,r)=>[...row].forEach((c,i)=>{if(h.pal[c]){ctx.fillStyle=h.pal[c];ctx.fillRect(4-wpx/2+i*h.px,-80-hpx+r*h.px,h.px,h.px)}}));
  }
  function drawDino(x,y,face,alpha=1,hat=progress.hat,lean=0){
    ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(face,1);ctx.rotate(lean*face);ctx.globalAlpha*=alpha;
    ctx.imageSmoothingEnabled=false;if(IMG.dino.complete)ctx.drawImage(IMG.dino,-43,-96,86,96);
    if(hat)drawHat(hat);ctx.imageSmoothingEnabled=true;ctx.restore();
  }
  function bubble(text,cx,by,a=1){
    ctx.save();ctx.globalAlpha=a;ctx.font="11px 'Press Start 2P', monospace";const tw=ctx.measureText(text).width,bw=tw+18,bh=28,bx=cx-bw/2;
    ctx.fillStyle="#120d15";ctx.fillRect(bx-3,by-3,bw+6,bh+6);ctx.fillRect(cx-6,by+bh,12,8);ctx.fillStyle="#fff3d5";ctx.fillRect(bx,by,bw,bh);ctx.fillRect(cx-3,by+bh,6,4);
    ctx.fillStyle="#18101a";ctx.fillText(text,bx+9,by+19);ctx.restore();
  }

  // ================================================================ Zeichnen: Figuren
  function drawEnemy(e){
    if(!e.alive&&!e.friend)return;
    const sitting=e.friend,face=sitting?(player.x<e.x?-1:1):e.dir;
    ctx.save();ctx.translate(Math.round(e.x+e.w/2),Math.round(e.y+e.h));ctx.scale(face,1);ctx.imageSmoothingEnabled=false;
    if(e.type===4){const fr=Math.floor(worldTime*10)%2;if(IMG.bug.complete)ctx.drawImage(IMG.bug,fr*18,0,18,14,-27,-40,54,42);ctx.restore();ctx.imageSmoothingEnabled=true;return}
    if(e.state==="curl")ctx.scale(1.08,.86);
    if(e.state==="roll"){ctx.translate(0,-e.drawH*.38);ctx.rotate(e.rot*face);ctx.scale(.8,.8);ctx.translate(0,e.drawH*.38)}
    if(sitting){ctx.translate(0,6+Math.sin(worldTime*3+e.base)*1.5);ctx.scale(1,.84)}
    if(e.flash>0&&Math.floor(e.flash*20)%2)ctx.globalAlpha=.35;
    const image=IMG.enemies[e.type];if(image.complete)ctx.drawImage(image,-e.drawW/2,-e.drawH,e.drawW,e.drawH);
    ctx.restore();ctx.imageSmoothingEnabled=true;
    const top=e.y+e.h-e.drawH-8;
    if(e.state==="alert"){ctx.fillStyle="#ffcf45";ctx.font="bold 30px monospace";ctx.fillText("!",e.x+e.w/2-8,top-6)}
    if(e.state==="dizzy"){for(let i=0;i<3;i++){const a=worldTime*5+i*2.1;ctx.fillStyle="#ffe47a";ctx.fillRect(e.x+e.w/2+Math.cos(a)*24-3,top+6+Math.sin(a)*6,6,6)}}
    if(sitting){const k=((worldTime*.6+e.base*.01)%1);miniHeart(e.x+e.w/2+Math.sin(k*6)*6,top+10-k*40,1-k)}
    if(e.sayT>0&&e.say)bubble(e.say,e.x+e.w/2,top-44,Math.min(1,e.sayT*3));
  }
  function drawBear(){
    const image=IMG.enemies[0],dw=172,dh=198;
    ctx.save();ctx.translate(Math.round(boss.x+boss.w/2),Math.round(boss.y+boss.h));ctx.scale(boss.face,1);
    if(boss.inv>0&&Math.floor(boss.inv*16)%2)ctx.globalAlpha=.35;
    if(boss.angry&&!boss.flee){ctx.shadowColor="#ff3b2f";ctx.shadowBlur=22}
    ctx.imageSmoothingEnabled=false;if(image.complete)ctx.drawImage(image,-dw/2,-dh,dw,dh);ctx.imageSmoothingEnabled=true;ctx.restore();
    if(boss.stun>0)for(let i=0;i<4;i++){const a=worldTime*6+i*1.6;ctx.fillStyle="#ffe47a";ctx.fillRect(boss.x+boss.w/2+Math.cos(a)*50-4,boss.y-50+Math.sin(a)*10,8,8)}
    if(!boss.flee&&!prize.active)drawEgg(boss.x+boss.w/2+boss.face*-6,boss.y-78+Math.sin(worldTime*4)*4,.9);
    if(boss.flee){ctx.fillStyle="#fff3d5";ctx.font="bold 22px monospace";ctx.fillText("HMPF!",boss.x+20,boss.y-20)}
  }
  function drawDragon(){
    const fr=Math.floor(boss.t*7)%2,S=3;
    ctx.save();ctx.translate(Math.round(boss.x+boss.w/2),Math.round(boss.y+boss.h/2));ctx.scale(boss.face,1);
    if(boss.inv>0&&Math.floor(boss.inv*16)%2)ctx.globalAlpha=.35;
    if(boss.angry&&!boss.flee){ctx.shadowColor="#ff3b2f";ctx.shadowBlur=24}
    ctx.imageSmoothingEnabled=false;if(IMG.dragon.complete)ctx.drawImage(IMG.dragon,fr*56,0,56,44,-28*S-6,-22*S+4,56*S,44*S);ctx.imageSmoothingEnabled=true;ctx.restore();
    if(boss.flee)bubble("ICH RUF MORGEN NOCHMAL AN!",boss.x+boss.w/2,boss.y-50);
    else if(boss.sayT>0)bubble(boss.say,boss.x+boss.w/2,boss.y-50,Math.min(1,boss.sayT*3));
  }
  function drawBossBar(){
    if(!boss.active||boss.flee||boss.gone)return;
    const x=W/2-200,y=70,seg=400/boss.maxHp;
    ctx.fillStyle="#06171de6";ctx.fillRect(x-14,y-30,428,58);ctx.strokeStyle="#ef4b45";ctx.lineWidth=4;ctx.strokeRect(x-14,y-30,428,58);
    ctx.fillStyle="#ffcf45";ctx.font="14px 'Press Start 2P', monospace";ctx.fillText(L.goal.name||"BOSS",x,y-8);
    for(let i=0;i<boss.maxHp;i++){ctx.fillStyle=i<boss.hp?"#ef4b45":"#2a1a24";ctx.fillRect(x+i*seg,y+2,seg-7,14)}
  }
  function drawRaven(){
    if(raven.state==="off")return;
    const S=3,FW=46,FH=30,frame=raven.state==="perch"?0:(Math.floor(raven.t*11)%2?1:2);
    ctx.save();ctx.translate(Math.round(raven.x),Math.round(raven.y));ctx.scale(raven.face,1);ctx.imageSmoothingEnabled=false;
    ctx.shadowColor="#8fa6ff";ctx.shadowBlur=10;if(IMG.raven.complete)ctx.drawImage(IMG.raven,frame*FW,0,FW,FH,-22*S,-28*S,FW*S,FH*S);ctx.shadowBlur=0;
    ctx.restore();ctx.imageSmoothingEnabled=true;
    if(raven.state==="perch"&&raven.x>camera-30&&raven.x<camera+W+30){
      ctx.font="13px 'Press Start 2P', monospace";const tw=ctx.measureText(raven.line).width,pad=12,bw=tw+pad*2,bh=36;
      const pop=Math.min(1,raven.t*6),bx=Math.max(camera+12,Math.min(camera+W-bw-12,raven.x-bw/2)),by=raven.y-98-bh;
      ctx.save();ctx.globalAlpha=pop;
      ctx.fillStyle="#120d15";ctx.fillRect(bx-4,by-4,bw+8,bh+8);ctx.fillRect(raven.x-10,by+bh,20,10);
      ctx.fillStyle="#fff3d5";ctx.fillRect(bx,by,bw,bh);ctx.fillRect(raven.x-6,by+bh,12,6);
      ctx.fillStyle="#18101a";ctx.fillText(raven.line,bx+pad,by+25);ctx.restore();
    }
  }
  function drawBaby(){
    if(!baby.active)return;
    const S=2.6,fr=baby.idle>0?2:(Math.abs(baby.vx)>10?Math.floor(baby.t*9)%2:0);
    ctx.save();ctx.translate(Math.round(baby.x+baby.w/2),Math.round(baby.y+baby.h));ctx.scale(baby.face,1);ctx.imageSmoothingEnabled=false;
    if(IMG.baby.complete)ctx.drawImage(IMG.baby,fr*22,0,22,20,-11*S,-20*S+2,22*S,20*S);ctx.imageSmoothingEnabled=true;ctx.restore();
    if(baby.idle>0){ctx.fillStyle="#fff3d5";ctx.font="bold 20px monospace";ctx.fillText("?",baby.x+baby.w/2-5,baby.y-12)}
  }
  function drawPlayer(){
    const p=player,t=performance.now()*.014;
    const moving=p.grounded&&Math.abs(p.vx)>25,bob=moving?Math.round(Math.sin(t))*3:0;
    const lean=p.pound?0:p.grounded?Math.max(-.06,Math.min(.06,p.vx/5000)):Math.max(-.12,Math.min(.12,p.vy/5000));
    const a=p.inv>0&&Math.floor(p.inv*14)%2?.25:1;
    if(p.pound){ctx.fillStyle="rgba(255,255,255,.35)";for(let i=1;i<4;i++)ctx.fillRect(p.x+8,p.y-i*22,30,14)}
    drawDino(p.x+p.w/2,p.y+p.h+bob,p.face,a,progress.hat,lean);
  }
  function drawGhost(){
    if(!ghostOn||!ghostPlay||mode!=="play"||snapshot)return;const g=ghostAt(runTime);if(!g)return;
    ctx.save();ctx.filter="grayscale(1) brightness(1.7)";drawDino(g.x+23,g.y+72,g.face,.32,null);ctx.restore();
  }
  function nestShape(){
    ctx.fillStyle="#845737";for(let i=0;i<14;i++){ctx.save();ctx.rotate(i*.45);ctx.fillRect(-45,-5,90,10);ctx.restore()}
    ctx.fillStyle="#fff0bd";ctx.beginPath();ctx.ellipse(-16,0,17,23,-.2,0,7);ctx.ellipse(17,0,17,23,.2,0,7);ctx.fill();ctx.fillStyle="#ff654f";ctx.fillRect(-26,-3,7,6);ctx.fillRect(10,-9,7,6);
  }
  function drawNest(){ctx.save();ctx.translate(L.goal.x-20,535);nestShape();ctx.restore()}
  function drawFlag(){
    const g=L.goal;if(g.type!=="flag")return;
    ctx.fillStyle="#1a1220";ctx.fillRect(g.x-3,g.y-170,6,170);ctx.fillStyle="#ffcf45";ctx.fillRect(g.x-6,g.y-176,12,8);
    const fy=g.y-30-flag.raised*130,wave=Math.sin(worldTime*6)*4;
    ctx.fillStyle="#9fca31";ctx.beginPath();ctx.moveTo(g.x+3,fy);ctx.lineTo(g.x+66,fy+12+wave);ctx.lineTo(g.x+3,fy+30);ctx.closePath();ctx.fill();
    ctx.fillStyle="#120d15";ctx.font="bold 14px monospace";ctx.fillText("///",g.x+10,fy+20);
  }
  function drawBackdrop(key,alpha){
    const image=backdrops[key];if(!image||!image.complete||!image.naturalWidth)return false;
    ctx.globalAlpha=alpha;const bgShift=-((camera*.2)%W);ctx.drawImage(image,bgShift,0,W,H);ctx.drawImage(image,bgShift+W,0,W,H);ctx.globalAlpha=1;return true;
  }

  // ================================================================ Zeichnen: Szene
  function draw(){
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.imageSmoothingEnabled=true;
    if(mode==="cutscene"&&cut){drawCut();post();return}
    const sx=shake?(Math.random()-.5)*shake:0,sy=shake?(Math.random()-.5)*shake:0;shake*=.82;
    ctx.save();ctx.translate(sx,sy);
    const zone=L.zones[activeZone],sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,zone.sky[0]);sky.addColorStop(.38,zone.sky[1]);sky.addColorStop(1,zone.sky[2]);ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    ctx.imageSmoothingEnabled=false;drawBackdrop(bgKey,1);if(bgFade>0&&prevBgKey)drawBackdrop(prevBgKey,bgFade);ctx.imageSmoothingEnabled=true;
    ctx.save();ctx.translate(-camera,0);
    drawGaps();drawFans();
    const poles=[];
    L.decor.forEach(([type,x])=>{if(type==="pole")poles.push(x);if(x<camera-300||x>camera+W+300)return;DECOR[type]?.(x)});
    if(poles.length)garlands(poles.sort((a,b)=>a-b));
    L.signs.forEach(([gx,label])=>{ctx.fillStyle="#11111d";ctx.fillRect(gx-7,280,14,330);ctx.fillStyle="#e2a72c";ctx.strokeStyle="#120d15";ctx.lineWidth=6;ctx.fillRect(gx-40,295,80,44);ctx.strokeRect(gx-40,295,80,44);ctx.fillStyle="#18101a";ctx.font="bold 24px monospace";ctx.fillText(label,gx-16,325)});
    platforms.forEach(p=>{if(p.x+p.w>camera-20&&p.x<camera+W+20)drawPlatform(p)});
    movers.forEach(drawMover);springs.forEach(drawSpring);tvs.forEach(drawTv);
    crystals.forEach(c=>{if(!c.got)coin(c)});hearts.forEach(h=>{if(!h.got)heart(h)});
    enemies.forEach(e=>{if(e.x>camera-200&&e.x<camera+W+200)drawEnemy(e)});
    hazards.forEach(h=>{ctx.fillStyle="#9da7bd";ctx.strokeStyle="#202033";ctx.lineWidth=2;for(let x=h.x;x<h.x+h.w;x+=15){ctx.beginPath();ctx.moveTo(x,h.y+h.h);ctx.lineTo(x+7,h.y);ctx.lineTo(x+15,h.y+h.h);ctx.fill();ctx.stroke()}});
    shockwaves.forEach(s=>{ctx.globalAlpha=Math.min(1,s.life);ctx.fillStyle="#d6e9b4";for(let i=0;i<4;i++){const k=(i*7+Math.floor(worldTime*20))%4;ctx.fillRect(s.x+i*8,s.y+s.h-6-k*5,6,6+k*5)}ctx.fillStyle="#fff3d5";ctx.fillRect(s.x,s.y+s.h-4,s.w,4);ctx.globalAlpha=1});
    shots.forEach(drawTicket);
    if(boss.active&&!boss.gone)(boss.kind==="bear"?drawBear:drawDragon)();
    if(prize.active&&!prize.got){if(prize.kind==="egg")drawEgg(prize.x,prize.y+Math.sin(worldTime*5)*3);else drawMug(prize.x,prize.y+Math.sin(worldTime*5)*3)}
    projectiles.forEach(plushBear);
    if(L.goal.type==="nest")drawNest();
    drawFlag();drawGhost();drawBaby();drawPlayer();drawRaven();
    particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.s,p.s)});ctx.globalAlpha=1;
    ctx.restore();
    if(night){const px=player.x+23-camera,py=player.y+40,g=ctx.createRadialGradient(px,py,70,px,py,560);g.addColorStop(0,"rgba(0,0,20,0)");g.addColorStop(1,"rgba(0,0,24,.58)");ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
    drawBossBar();
    ctx.restore();
    post();
  }
  function drawCut(){
    const t=cut.t,sx=shake?(Math.random()-.5)*shake:0;shake*=.85;
    ctx.save();ctx.translate(sx,0);
    ctx.fillStyle="#091563";ctx.fillRect(0,0,W,H);ctx.imageSmoothingEnabled=false;const bd=backdrops.park;if(bd.complete)ctx.drawImage(bd,0,0,W,H);ctx.imageSmoothingEnabled=true;
    brickPlatform({x:-20,y:ground,w:W+40,h:160,style:"brick"});
    cut.friends.forEach((type,i)=>{const left=i%2===0,slot=Math.floor(i/2),x=left?390-slot*95:890+slot*95,s=enemySpecs[type],image=IMG.enemies[type];
      const arrive=Math.min(1,Math.max(0,(t-.2-i*.12)*1.6)),xx=left?x-(1-arrive)*560:x+(1-arrive)*560;
      ctx.save();ctx.translate(xx,ground+4+Math.sin(t*4+i)*2);ctx.scale(left?1:-1,.86);ctx.imageSmoothingEnabled=false;if(image.complete)ctx.drawImage(image,-s.drawW/2,-s.drawH,s.drawW,s.drawH);ctx.restore();ctx.imageSmoothingEnabled=true;
      if(cut.hatched)miniHeart(xx,ground-s.drawH-20-((t*40+i*13)%40),1-((t*.9+i*.3)%1));});
    drawDino(520,ground,1);
    const wob=t>1.4&&t<3.2?Math.sin(t*40)*.18*Math.min(1,(t-1.4)):0;
    ctx.save();ctx.translate(640,ground-46);ctx.scale(1.5,1.5);nestShape();ctx.restore();
    if(!cut.hatched)drawEgg(640,ground-84,1.3,wob);
    else{const k=Math.min(1,(t-3.2)*2.5),by=ground-56-Math.sin(k*Math.PI)*70-k*24,S=3;
      ctx.save();ctx.translate(640,by);ctx.imageSmoothingEnabled=false;if(IMG.baby.complete)ctx.drawImage(IMG.baby,0,0,22,20,-11*S,-20*S,22*S,20*S);ctx.restore();ctx.imageSmoothingEnabled=true;
      ctx.fillStyle="#fff0bd";ctx.fillRect(606,ground-64,16,10);ctx.fillRect(660,ground-68,16,12);}
    particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.s,p.s)});ctx.globalAlpha=1;
    ctx.textAlign="center";ctx.font="26px 'Press Start 2P', monospace";ctx.fillStyle="#000";
    const title=t<3.2?"DA WACKELT WAS …":"WILLKOMMEN, KLEINER!";ctx.fillText(title,W/2+4,144);ctx.fillStyle=t<3.2?"#fff3d5":"#ffcf45";ctx.fillText(title,W/2,140);
    ctx.font="11px 'Press Start 2P', monospace";ctx.fillStyle="#9fb2a8";if(t>1)ctx.fillText("LEERTASTE ZUM ÜBERSPRINGEN",W/2,H-30);ctx.textAlign="left";
    ctx.restore();
  }

  // ================================================================ C64-Modus (Nachbearbeitung)
  const C64PAL=[[0,0,0],[255,255,255],[104,55,43],[112,164,178],[111,61,134],[88,141,67],[53,40,121],[184,199,111],[111,79,37],[67,57,0],[154,103,89],[68,68,68],[108,108,108],[154,210,132],[108,94,181],[149,149,149]];
  const lo=document.createElement("canvas");lo.width=320;lo.height=180;const lctx=lo.getContext("2d",{willReadFrequently:true});
  const cmap=new Int8Array(1<<18).fill(-1);
  function nearest(r,g,b){const k=((r>>2)<<12)|((g>>2)<<6)|(b>>2);let v=cmap[k];if(v>=0)return v;let best=0,bd=1e9;
    for(let i=0;i<16;i++){const c=C64PAL[i],dr=r-c[0],dg=g-c[1],db=b-c[2],d=dr*dr*.3+dg*dg*.59+db*db*.11;if(d<bd){bd=d;best=i}}cmap[k]=best;return best}
  let c64Soft=false;
  function post(){
    if(!c64)return;
    lctx.imageSmoothingEnabled=true;lctx.drawImage(canvas,0,0,320,180);
    let d=null;
    // Aus dem Dateisystem (file://) darf der Browser keine Pixel auslesen: dann nur dicke Pixel plus CSS-Farbfilter
    if(!c64Soft){try{d=lctx.getImageData(0,0,320,180)}catch(e){c64Soft=true;canvas.classList.add("c64-soft");toast("C64-FARBEN KOMPLETT NUR ÜBER SERVER.PY")}}
    if(!d){ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(lo,0,0,canvas.width,canvas.height);return}
    const a=d.data;
    for(let i=0;i<a.length;i+=4){const c=C64PAL[nearest(a[i],a[i+1],a[i+2])];a[i]=c[0];a[i+1]=c[1];a[i+2]=c[2]}
    lctx.putImageData(d,0,0);ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(lo,0,0,canvas.width,canvas.height);
  }
  function setC64(on,animate=true){
    c64=on;progress.c64=on;save();document.body.classList.toggle("c64",on);if(!on)canvas.classList.remove("c64-soft");else if(c64Soft)canvas.classList.add("c64-soft");music.setSid(on);
    document.querySelectorAll(".c64-toggle").forEach(b=>b.textContent=on?"C64-MODUS: AN":"C64-MODUS: AUS");
    if(on&&animate)c64Boot();
    if(!running){try{draw()}catch(e){console.error(e)}}
  }
  function c64Boot(){
    const lines=["    **** COMMODORE 64 BASIC V2 ****",""," 64K RAM SYSTEM  38911 BASIC BYTES FREE","","READY.",'LOAD"DINO",8,1',"","SEARCHING FOR DINO","LOADING","READY.","RUN"];
    const el=$("#c64Text");el.textContent="";ui.c64Load.classList.remove("hidden");let i=0;
    clearInterval(c64Boot.t);c64Boot.t=setInterval(()=>{el.textContent+=lines[i]+"\n";i++;tone(1800,1800,.02,"square",.02);if(i>=lines.length){clearInterval(c64Boot.t);setTimeout(()=>ui.c64Load.classList.add("hidden"),450)}},170);
  }

  // ================================================================ Schleife
  let loopErrors=0;
  function loop(now){
    if(!running)return;const dt=Math.min(.033,(now-last)/1000||0);last=now;
    // Ein Fehler darf nie die ganze Schleife anhalten: protokollieren und weiterlaufen
    try{
      if(mode==="cutscene"&&!cut)finishWin();
      if(mode==="cutscene"&&cut)updateCut(dt);else if(!paused&&mode==="play")physics(dt);
      if(running||mode==="won")draw();
    }catch(e){console.error(e);if(++loopErrors===1)toast("HOPPLA, KLEINER FEHLER. SPIEL LÄUFT WEITER.")}
    if(running)rafId=requestAnimationFrame(loop);
  }

  // ================================================================ Menü, Laden
  const SHOP=[
    {id:"double",name:"DOPPELWURF",desc:"Zwei Eisbären auf einmal.",price:40},
    {id:"boomerang",name:"BUMERANG-BÄR",desc:"Kommt zurück. Meistens.",price:60},
    {id:"heart",name:"EXTRA-HERZ",desc:"Vier statt drei Leben.",price:80},
    {id:"hat_party",name:"PARTYHUT",desc:"Für jeden Anlass.",price:30,hat:true},
    {id:"hat_beret",name:"BASKENMÜTZE",desc:"Wie der Rabe. Nur cooler.",price:30,hat:true},
    {id:"hat_crown",name:"KRONE",desc:"Keine Herrschaft, nur Deko.",price:30,hat:true},
    {id:"hat_helmet",name:"BAUHELM",desc:"Sicherheit geht vor.",price:30,hat:true}
  ];
  const squirrelSays={hello:["KROKETTEN HAB ICH KEINE. NUR KRAM.","WILLKOMMEN IM LADEN. KEIN UMTAUSCH.","MÜNZEN? HER DAMIT. ALSO, BITTE."],buy:["GUTE WAHL! *MAMPF*","VERKAUFT! DAFÜR GIBT'S KROKETTEN.","DAS STEHT DIR. GLAUB ICH."],poor:["ZU WENIG MÜNZEN. AUCH NICHT FÜR KROKETTEN.","NIX DA. ERST SAMMELN.","ANSCHREIBEN IS NICH."]};
  let shopFrom="title";
  function openShop(){
    shopFrom=mode==="won"?"won":"title";
    ["start","win"].forEach(k=>ui[k].classList.add("hidden"));ui.shop.classList.remove("hidden");
    $("#shopSay").textContent=pick(squirrelSays.hello);renderShop();
  }
  function closeShop(){ui.shop.classList.add("hidden");if(shopFrom==="won")ui.win.classList.remove("hidden");else toTitle()}
  function renderShop(){
    $("#shopWallet").textContent=`${progress.wallet} MÜNZEN`;
    const box=$("#shopItems");box.textContent="";
    SHOP.forEach(it=>{
      const owned=!!progress.owned[it.id],row=document.createElement("div");row.className="shop-item"+(owned?" owned":"");
      const info=document.createElement("div");const n=document.createElement("strong");n.textContent=it.name;const d=document.createElement("span");d.textContent=it.desc;info.append(n,d);
      const b=document.createElement("button");b.className="secondary-btn";
      if(!owned){b.textContent=`KAUFEN · ${it.price}`;b.onclick=()=>{ensureAudio();if(progress.wallet<it.price){sfx.nope();$("#shopSay").textContent=pick(squirrelSays.poor);return}
        progress.wallet-=it.price;progress.owned[it.id]=true;if(it.hat)progress.hat=it.id;save();sfx.buy();$("#shopSay").textContent=pick(squirrelSays.buy);
        const sq=$(".squirrel");sq.classList.add("bite");setTimeout(()=>sq.classList.remove("bite"),700);renderShop()}}
      else if(it.hat){b.textContent=progress.hat===it.id?"ABSETZEN":"AUFSETZEN";b.onclick=()=>{progress.hat=progress.hat===it.id?null:it.id;save();renderShop()}}
      else{b.textContent="GEKAUFT";b.disabled=true}
      row.append(info,b);box.append(row);
    });
  }
  function buildMenu(){
    const list=ui.chapterList;list.textContent="";
    const entries=[...story.map(c=>({c,open:progress.unlocked>=c.id})),
      ...(progress.secret?[{c:chapters.find(c=>c.bonus),open:true}]:[]),...chapters.filter(c=>c.custom).map(c=>({c,open:true}))];
    entries.forEach(({c,open})=>{
      const b=document.createElement("button");b.className="chapter-btn";b.disabled=!open;
      const best=progress.best[c.id];
      const label=document.createElement("strong");label.textContent=open?c.title.replace("KAPITEL ",""):`${c.id} · ???`;
      const meta=document.createElement("span");meta.textContent=open&&best?`★ ${String(best.score).padStart(6,"0")} · ${fmtTime(best.time)}`:open?(c.bonus?"GEHEIM":c.custom?"AUS DEM EDITOR":"NOCH OHNE BESTZEIT"):"GESPERRT";
      b.append(label,meta);b.onclick=()=>start(chapters.indexOf(c));list.append(b);
    });
    const next=Math.min(progress.unlocked,4);
    ui.startBtn.innerHTML=next>1?`WEITER MIT KAPITEL ${next} <span>→</span>`:"ABENTEUER STARTEN <span>→</span>";
    ui.startBtn.onclick=()=>start(chapters.indexOf(story[next-1]));
    $("#walletInfo").textContent=`LADEN-KONTO: ${progress.wallet} MÜNZEN`;
  }

  // ================================================================ Ereignisse
  addEventListener("keydown",e=>{
    keys[e.code]=true;if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)&&e.target.tagName!=="INPUT")e.preventDefault();
    if(e.repeat)return;
    if(mode==="cutscene"&&(e.code==="Space"||e.code==="Enter"))skipCut();
    if(e.code==="Escape"){if(!ui.shop.classList.contains("hidden"))closeShop();else togglePause()}
    if(e.code==="KeyM"){musicOn=!musicOn;music.setEnabled(sound&&musicOn);toast(musicOn?"MUSIK AN":"MUSIK AUS")}
    if(e.code==="KeyG"&&mode==="play"){ghostOn=!ghostOn;toast(ghostOn?"GEIST AN":"GEIST AUS")}
    if(e.code==="KeyC"&&mode!=="cutscene")setC64(!c64);
  });
  addEventListener("keyup",e=>keys[e.code]=false);
  canvas.addEventListener("pointerdown",()=>skipCut());
  [["leftBtn","left"],["rightBtn","right"],["jumpBtn","jump"],["throwBtn","throw"],["downBtn","down"]].forEach(([id,k])=>{const b=$("#"+id);if(!b)return;["pointerdown","pointerenter"].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();touch[k]=true}));["pointerup","pointerleave","pointercancel"].forEach(ev=>b.addEventListener(ev,()=>touch[k]=false))});
  $("#againBtn").onclick=()=>start(chapterIndex);
  ui.nextBtn.onclick=()=>start(chapters.indexOf(story[L.id]));
  $("#resumeBtn").onclick=()=>togglePause(false);
  $("#pauseBtn").onclick=()=>togglePause();$("#restartBtn").onclick=()=>{reset(false);togglePause(false)};
  document.querySelectorAll(".to-title").forEach(b=>b.onclick=toTitle);
  document.querySelectorAll(".open-shop").forEach(b=>b.onclick=openShop);
  document.querySelectorAll(".c64-toggle").forEach(b=>b.onclick=()=>setC64(!c64));
  $("#shopClose").onclick=closeShop;
  $("#soundBtn").onclick=()=>{sound=!sound;$("#soundBtn").textContent=sound?"♪":"×";if(sound)ensureAudio();music.setEnabled(sound&&musicOn)};

  // Test-Hook für automatisierte Durchläufe, im Spiel ohne Wirkung
  window.__dino={get state(){return{player,boss,prize,movers,raven,baby,enemies,music:music.current,checkpoint,activeZone,mode,collected,total,score,chapterIndex,arenaLocked,runTime,progress,flag,snapshot,c64,tvs}},
    start,teleport(x,y=300){player.x=x;player.y=y;player.vx=0;player.vy=0;camera=Math.max(0,x-300);if(baby.active){baby.x=x-60;baby.y=y}},keys,touch,setC64,openShop,chapters};

  loadChapter(0);resetBoss();buildMenu();if(progress.c64)setC64(true,false);draw();
  if(hashTags.includes("eigenes")){const i=chapters.findIndex(c=>c.custom);if(i>=0)setTimeout(()=>start(i),100)}
})();
