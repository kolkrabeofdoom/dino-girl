(() => {
  "use strict";
  const canvas = document.querySelector("#game"), ctx = canvas.getContext("2d");
  const dinoSprite = new Image();
  dinoSprite.src = "img/dino-girl-sprite.png";
  const levelBackdrop = new Image();
  levelBackdrop.src = "img/night-park-backdrop.png";
  const enemySprites = ["enemy-bear.png","enemy-fox.png","enemy-giraffe.png","enemy-hippo.png"].map(file=>{const image=new Image();image.src=`img/${file}`;return image});
  const enemySpecs = [
    {drawW:78,drawH:92,hitW:52,hitH:68,speed:45},
    {drawW:70,drawH:84,hitW:46,hitH:62,speed:82},
    {drawW:68,drawH:104,hitW:44,hitH:76,speed:58},
    {drawW:82,drawH:90,hitW:56,hitH:66,speed:48}
  ];
  const ui = {
    start: document.querySelector("#startScreen"), pause: document.querySelector("#pauseScreen"),
    win: document.querySelector("#winScreen"), crystals: document.querySelector("#crystals"), score: document.querySelector("#score"),
    hearts: document.querySelector("#hearts"), pauseBtn: document.querySelector("#pauseBtn"),
    toast: document.querySelector("#toast"), winStats: document.querySelector("#winStats"),
    zoneName: document.querySelector("#zoneName"), objective: document.querySelector("#objectiveText")
  };
  const W = 1280, H = 720, worldW = 7600, ground = 610;
  const zones = [
    {start:0,end:2240,name:"LEVEL 01 · NACHTPARK",objective:"Erreiche den Dächerweg →",checkpoint:100,sky:["#091563","#132a8e","#171d52"]},
    {start:2240,end:4620,name:"LEVEL 02 · DÄCHERWEG",objective:"Überquere die Skyline →",checkpoint:2290,sky:["#10105c","#24207b","#1b1747"]},
    {start:4620,end:7600,name:"LEVEL 03 · ALTSTADT",objective:"Rette das Dino-Nest →",checkpoint:4670,sky:["#210d46","#3d175a","#1a1234"]}
  ];
  const keys = {}, touch = {left:false,right:false,jump:false,throw:false};
  let running=false, paused=false, won=false, camera=0, last=0, collected=0, score=0, deaths=0, checkpoint=100, shake=0, activeZone=0, throwCooldown=0, jumpWasHeld=false;
  const player = {x:100,y:300,w:46,h:72,vx:0,vy:0,grounded:false,coyote:0,jumpBuf:0,jumps:0,hp:3,face:1,inv:0};
  const platforms = [
    [0,ground,620,160],[760,ground,520,160],[1420,ground,680,160],
    [2240,ground,370,160],[2740,ground,520,160],[3380,ground,340,160],[3840,ground,650,160],
    [4620,ground,430,160],[5180,ground,520,160],[5840,ground,330,160],[6310,ground,430,160],[6880,ground,720,160],
    [340,500,170,24],[860,480,170,24],[1110,380,150,24],[1500,500,165,24],[1760,410,150,24],[1990,320,160,24],
    [2320,485,160,24],[2530,390,160,24],[2800,490,160,24],[3060,395,165,24],[3440,490,150,24],[3650,395,160,24],[3970,305,170,24],[4270,420,160,24],
    [4690,485,160,24],[4930,390,160,24],[5240,480,150,24],[5460,370,165,24],[5900,480,160,24],[6110,380,160,24],[6380,470,160,24],[6620,355,170,24],[6940,470,160,24],[7170,370,160,24]
  ];
  const crystals = [[400,450],[910,430],[1160,330],[1560,450],[1810,360],[2040,270],[2370,435],[2580,340],[2850,440],[3120,345],[3485,440],[3700,345],[4020,255],[4320,370],[4740,435],[4980,340],[5290,430],[5510,320],[5950,430],[6160,330],[6430,420],[6680,305],[6990,420],[7220,320]].map((p,i)=>({x:p[0],y:p[1],got:false,i}));
  const enemies = [930,1680,2400,2930,3510,4110,4770,5370,5960,6500,7090].map((x,i)=>{const type=i%4,s=enemySpecs[type];return{x,y:ground-s.hitH,w:s.hitW,h:s.hitH,drawW:s.drawW,drawH:s.drawH,speed:s.speed,type,dir:i%2?1:-1,base:x,alive:true}});
  const hazards = [[1180,590,60,20],[2450,590,60,20],[3510,590,70,20],[4150,590,70,20],[4810,590,60,20],[5480,590,70,20],[5960,590,60,20],[7040,590,70,20]].map(h=>({x:h[0],y:h[1],w:h[2],h:h[3]}));
  const particles=[], projectiles=[];
  const total=crystals.length;
  ui.crystals.textContent=`00 / ${String(total).padStart(2,"0")}`;

  function reset(all=true){
    if(all){crystals.forEach(c=>c.got=false);enemies.forEach(e=>{e.alive=true;e.x=e.base});collected=0;score=0;deaths=0;checkpoint=100}
    projectiles.length=0;throwCooldown=0;jumpWasHeld=false;
    Object.assign(player,{x:checkpoint,y:300,vx:0,vy:0,grounded:false,coyote:0,jumpBuf:0,jumps:0,hp:3,inv:0}); camera=Math.max(0,checkpoint-200);won=false;
    setZone(checkpoint>=4620?2:checkpoint>=2240?1:0);updateHud();
  }
  function start(){reset(true);ui.start.classList.add("hidden");ui.win.classList.add("hidden");ui.pause.classList.add("hidden");ui.pauseBtn.classList.remove("hidden");running=true;paused=false;last=performance.now();canvas.focus();requestAnimationFrame(loop)}
  function togglePause(force){if(!running||won)return;paused=force??!paused;ui.pause.classList.toggle("hidden",!paused)}
  function toast(text){ui.toast.textContent=text;ui.toast.classList.remove("hidden");clearTimeout(toast.t);toast.t=setTimeout(()=>ui.toast.classList.add("hidden"),1300)}
  function updateHud(){ui.crystals.textContent=`${String(collected).padStart(2,"0")} / ${String(total).padStart(2,"0")}`;ui.score.textContent=String(score).padStart(6,"0");ui.hearts.textContent="♥ ".repeat(player.hp).trim()+" ♡ ".repeat(3-player.hp).trim()}
  function setZone(index,announce=false){activeZone=index;ui.zoneName.textContent=zones[index].name;ui.objective.textContent=zones[index].objective;if(announce)toast(zones[index].name)}
  function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
  function burst(x,y,color,n=10){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*300,vy:-Math.random()*250-40,life:1,color,s:3+Math.random()*5})}
  function throwBear(){projectiles.push({x:player.x+player.w/2+player.face*26,y:player.y+25,w:38,h:32,vx:player.face*650,vy:-150,rot:0,life:1.8});throwCooldown=.38;touch.throw=false;burst(player.x+player.w/2,player.y+30,"#fff3d5",4)}
  function hurt(){
    if(player.inv>0)return;player.hp--;player.inv=1.3;shake=12;burst(player.x+20,player.y+30,"#ff654f",12);updateHud();
    if(player.hp<=0){deaths++;reset(false);toast("NOCH EIN VERSUCH!")}
    else{player.vy=-440;player.vx=-player.face*280}
  }
  function physics(dt){
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
        player.vy=-690;player.grounded=false;player.coyote=0;player.jumpBuf=0;player.jumps=1;burst(player.x+23,player.y+70,"#fff0bd",5);
      }else if(player.jumps<2){
        const doubleJump=player.jumps===1;player.vy=doubleJump?-820:-690;player.jumpBuf=0;player.jumps=doubleJump?2:1;
        burst(player.x+23,player.y+62,doubleJump?"#78d9ff":"#fff0bd",doubleJump?14:7);if(doubleJump)toast("DOUBLE JUMP!");
      }
    }
    if(!jump&&player.vy<0)player.vy+=1200*dt;
    player.vy+=1850*dt;player.vy=Math.min(player.vy,1100);
    player.x+=player.vx*dt;player.x=Math.max(0,Math.min(worldW-player.w,player.x));
    for(const p of platforms){const box={x:p[0],y:p[1],w:p[2],h:p[3]};if(overlap(player,box)){if(player.vx>0)player.x=box.x-player.w;else if(player.vx<0)player.x=box.x+box.w;player.vx=0}}
    const oldBottom=player.y+player.h;player.y+=player.vy*dt;let landed=false;
    for(const p of platforms){if(player.x+player.w>p[0]+5&&player.x<p[0]+p[2]-5&&oldBottom<=p[1]+8&&player.y+player.h>=p[1]&&player.vy>=0){player.y=p[1]-player.h;player.vy=0;landed=true}}
    if(landed){if(!player.grounded&&player.vy===0)burst(player.x+23,player.y+72,"#d6e9b4",4);player.grounded=true;player.coyote=.11;player.jumps=0}else if(player.grounded){player.grounded=false;player.coyote=.11}
    if(player.y>H+160){deaths++;reset(false);toast("VORSICHT, ABGRUND!")}
    const zoneIndex=player.x>=4620?2:player.x>=2240?1:0;
    if(zoneIndex!==activeZone){const forward=zoneIndex>activeZone;if(forward)checkpoint=zones[zoneIndex].checkpoint;setZone(zoneIndex,forward)}
    player.inv=Math.max(0,player.inv-dt);
    hazards.forEach(h=>{if(overlap(player,h))hurt()});
    crystals.forEach(c=>{if(!c.got&&Math.hypot(player.x+23-c.x,player.y+35-c.y)<48){c.got=true;collected++;score+=25;burst(c.x,c.y,"#ffcf45",16);updateHud()}});
    projectiles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=520*dt;p.rot+=p.vx*dt*.009;p.life-=dt;enemies.forEach(e=>{if(e.alive&&p.life>0&&overlap(p,e)){e.alive=false;p.life=0;score+=150;burst(e.x+e.w/2,e.y+25,"#fff3d5",18);updateHud()}})});
    for(let i=projectiles.length-1;i>=0;i--)if(projectiles[i].life<=0||projectiles[i].y>H+100)projectiles.splice(i,1);
    enemies.forEach(e=>{if(!e.alive)return;e.x+=e.dir*e.speed*dt;if(Math.abs(e.x-e.base)>72)e.dir*=-1;if(overlap(player,e)){if(player.vy>150&&player.y+player.h<e.y+24){e.alive=false;player.vy=-440;score+=100;burst(e.x+e.w/2,e.y+18,"#b9f34a",12);updateHud()}else hurt()}});
    if(player.x>7480){won=true;running=false;ui.pauseBtn.classList.add("hidden");ui.winStats.textContent=`Score ${String(score).padStart(6,"0")} · ${collected} von ${total} Münzen`;ui.win.classList.remove("hidden")}
    camera+=(Math.max(0,Math.min(worldW-W,player.x-W*.36))-camera)*Math.min(1,dt*4.5);
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=700*dt;p.life-=dt*1.7});for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0)particles.splice(i,1);
  }
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
  function brickPlatform(p){
    const [x,y,w,h]=p;
    const drawH=h<=28?52:h;
    ctx.fillStyle="#8b3f21";ctx.fillRect(x,y,w,drawH);
    ctx.fillStyle="#d47a35";ctx.fillRect(x,y,w,7);
    ctx.fillStyle="#f0a14b";for(let bx=x+6;bx<x+w;bx+=50)ctx.fillRect(bx,y+5,30,4);
    ctx.strokeStyle="#241018";ctx.lineWidth=4;
    for(let row=26;row<drawH;row+=26){
      ctx.beginPath();ctx.moveTo(x,y+row);ctx.lineTo(x+w,y+row);ctx.stroke();
      const offset=(Math.floor(row/26)%2)*25;
      for(let bx=x+offset;bx<x+w;bx+=50){ctx.beginPath();ctx.moveTo(bx,y+row);ctx.lineTo(bx,y+Math.min(row+26,drawH));ctx.stroke()}
    }
    ctx.fillStyle="rgba(255,170,73,.24)";for(let row=31;row<drawH;row+=26)for(let bx=x+8;bx<x+w;bx+=50)ctx.fillRect(bx,y+row,27,4);
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
  function parkBench(x){
    ctx.fillStyle="#1b1025";ctx.fillRect(x-62,544,124,12);ctx.fillRect(x-66,566,132,12);ctx.fillRect(x-54,535,10,74);ctx.fillRect(x+44,535,10,74);
    ctx.fillStyle="#5f2a75";ctx.fillRect(x-58,540,116,10);ctx.fillRect(x-62,562,124,10);
    ctx.fillStyle="#b05ac1";ctx.fillRect(x-50,541,76,3);ctx.fillRect(x-54,563,88,3);
  }
  function maskStreetGaps(){
    const groundParts=platforms.filter(p=>p[1]===ground).sort((a,b)=>a[0]-b[0]);let cursor=0;
    ctx.fillStyle="#03040d";
    groundParts.forEach(p=>{if(p[0]>cursor)ctx.fillRect(cursor,ground,p[0]-cursor,H-ground);cursor=Math.max(cursor,p[0]+p[2])});
    if(cursor<worldW)ctx.fillRect(cursor,ground,worldW-cursor,H-ground);
  }
  function plushBear(p){
    ctx.save();ctx.translate(p.x+p.w/2,p.y+p.h/2);ctx.rotate(p.rot);ctx.lineWidth=3;ctx.strokeStyle="#27314b";
    ctx.fillStyle="#f8f1df";ctx.beginPath();ctx.arc(-11,-10,8,0,7);ctx.arc(11,-10,8,0,7);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(0,7,15,16,0,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(0,-5,14,0,7);ctx.fill();ctx.stroke();
    ctx.fillStyle="#27314b";ctx.beginPath();ctx.arc(-5,-7,2,0,7);ctx.arc(5,-7,2,0,7);ctx.arc(0,-1,3,0,7);ctx.fill();
    ctx.fillStyle="#55a8c8";ctx.beginPath();ctx.moveTo(0,7);ctx.lineTo(-11,2);ctx.lineTo(-9,13);ctx.closePath();ctx.moveTo(0,7);ctx.lineTo(11,2);ctx.lineTo(9,13);ctx.closePath();ctx.fill();
    ctx.restore();
  }
  function draw(){
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
    ctx.imageSmoothingEnabled=true;
    const sx=shake?(Math.random()-.5)*shake:0,sy=shake?(Math.random()-.5)*shake:0;shake*=.82;
    ctx.save();ctx.translate(sx,sy);
    const zone=zones[activeZone],sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,zone.sky[0]);sky.addColorStop(.38,zone.sky[1]);sky.addColorStop(1,zone.sky[2]);ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    if(levelBackdrop.complete&&levelBackdrop.naturalWidth){
      const bgShift=-((camera*.2)%W);ctx.drawImage(levelBackdrop,bgShift,0,W,H);ctx.drawImage(levelBackdrop,bgShift+W,0,W,H);
    }else{
      for(let i=0;i<38;i++){const x=(i*191-camera*.035)%1380-40,y=55+(i*67)%245;ctx.fillStyle=i%5?"#fff2c4":"#b4c9ff";ctx.fillRect(x,y,i%3?3:5,i%3?3:5)}
      cloud(120-camera*.08,145,1);cloud(550-camera*.045,92,.72);cloud(910-camera*.07,210,.9);
      skyline(.08,535,"#10183f","#6f7a51");skyline(.16,590,"#0a1131","#9d8845");skyline(.25,625,"#080c23","#c6a34b");
    }
    ctx.save();ctx.translate(-camera,0);
    maskStreetGaps();
    for(let x=640;x<worldW;x+=1280)parkBench(x);
    [[2240,"02"],[4620,"03"]].forEach(g=>{ctx.fillStyle="#11111d";ctx.fillRect(g[0]-7,280,14,330);ctx.fillStyle="#e2a72c";ctx.strokeStyle="#120d15";ctx.lineWidth=6;ctx.fillRect(g[0]-40,295,80,44);ctx.strokeRect(g[0]-40,295,80,44);ctx.fillStyle="#18101a";ctx.font="bold 24px monospace";ctx.fillText(g[1],g[0]-16,325)});
    platforms.forEach(brickPlatform);
    crystals.forEach(c=>{if(!c.got)coin(c)});
    ctx.imageSmoothingEnabled=false;
    enemies.forEach(e=>{if(!e.alive)return;const image=enemySprites[e.type];ctx.save();ctx.translate(Math.round(e.x+e.w/2),Math.round(e.y+e.h));ctx.scale(e.dir,1);if(image.complete)ctx.drawImage(image,-e.drawW/2,-e.drawH,e.drawW,e.drawH);ctx.restore()});
    ctx.imageSmoothingEnabled=true;
    hazards.forEach(h=>{ctx.fillStyle="#9da7bd";ctx.strokeStyle="#202033";ctx.lineWidth=2;for(let x=h.x;x<h.x+h.w;x+=15){ctx.beginPath();ctx.moveTo(x,h.y+h.h);ctx.lineTo(x+7,h.y);ctx.lineTo(x+15,h.y+h.h);ctx.fill();ctx.stroke()}});
    projectiles.forEach(plushBear);
    drawNest();drawPlayer();particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.s,p.s)});ctx.globalAlpha=1;
    ctx.restore();ctx.restore();
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
  function drawNest(){ctx.save();ctx.translate(7460,535);ctx.fillStyle="#845737";for(let i=0;i<14;i++){ctx.save();ctx.rotate(i*.45);ctx.fillRect(-45,-5,90,10);ctx.restore()}ctx.fillStyle="#fff0bd";ctx.beginPath();ctx.ellipse(-16,0,17,23,-.2,0,7);ctx.ellipse(17,0,17,23,.2,0,7);ctx.fill();ctx.fillStyle="#ff654f";ctx.fillRect(-26,-3,7,6);ctx.fillRect(10,-9,7,6);ctx.restore()}
  function loop(now){if(!running)return;const dt=Math.min(.033,(now-last)/1000||0);last=now;if(!paused)physics(dt);draw();requestAnimationFrame(loop)}
  addEventListener("keydown",e=>{keys[e.code]=true;if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();if(e.code==="Escape")togglePause()});
  addEventListener("keyup",e=>keys[e.code]=false);
  [["leftBtn","left"],["rightBtn","right"],["jumpBtn","jump"],["throwBtn","throw"]].forEach(([id,k])=>{const b=document.querySelector("#"+id);["pointerdown","pointerenter"].forEach(ev=>b.addEventListener(ev,e=>{e.preventDefault();touch[k]=true}));["pointerup","pointerleave","pointercancel"].forEach(ev=>b.addEventListener(ev,()=>touch[k]=false))});
  document.querySelector("#startBtn").onclick=start;document.querySelector("#againBtn").onclick=start;document.querySelector("#resumeBtn").onclick=()=>togglePause(false);
  document.querySelector("#pauseBtn").onclick=()=>togglePause();document.querySelector("#restartBtn").onclick=()=>{reset(false);togglePause(false)};
  let audio=null,sound=true;document.querySelector("#soundBtn").onclick=()=>{sound=!sound;document.querySelector("#soundBtn").textContent=sound?"♪":"×";if(sound&&!audio){audio=new AudioContext();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=110;g.gain.value=.0001;o.connect(g).connect(audio.destination);o.start()}};
  draw();
})();
