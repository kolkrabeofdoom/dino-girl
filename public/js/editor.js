/* Level-Editor für Dino Girl.
 * Bearbeitet ein Kapitel im selben Format wie js/levels.js und speichert es
 * als "eigenes Level" in localStorage. Das Spiel lädt es dann über #eigenes.
 */
{
  const $ = s => document.querySelector(s);
  const G = 610, H = 720, SNAP = 10;
  const canvas = $("#ed"), ctx = canvas.getContext("2d"), view = $("#view");
  const {chapters} = window.DINO_LEVELS;
  const snap = v => Math.round(v / SNAP) * SNAP;
  const clone = o => JSON.parse(JSON.stringify(o));
  const img = src => { const i = new Image(); i.src = src; i.onload = () => draw(); return i; };
  const backdrops = {park:"night-park-backdrop",rhein:"backdrop-rheinufer",kirmes:"backdrop-kirmes",bau:"backdrop-baustelle",weinberge:"backdrop-weinberge",kneipen:"backdrop-kneipen",burg:"backdrop-burg",server:"backdrop-serverraum",rauschen:"backdrop-rauschen"};
  const bdImg = Object.fromEntries(Object.entries(backdrops).map(([k,f]) => [k, img(`img/${f}.png`)]));
  const enemyImg = ["enemy-bear","enemy-fox","enemy-giraffe","enemy-hippo"].map(f => img(`img/${f}.png`));
  const bugImg = img("img/bug.png");
  const enemySize = [[52,68,78,92],[46,62,70,84],[44,76,68,104],[56,66,82,90],[44,30,54,42]];
  const styleCol = {brick:"#a8492a",quay:"#5a6a8c",cobble:"#5c5c70",castle:"#6a6c92",girder:"#c05a24",crate:"#8a5428",rack:"#2a3570",neon:"#5ae0ff"};
  const musicNames = Object.keys(window.DinoMusic.tracks);

  let lvl, sel = null, tool = "select", zoom = .5, drag = null, history = [];
  const status = t => $("#status").textContent = t;

  function blank(){
    return {title:"MEIN LEVEL",worldW:4000,enemySpeed:1,oneWayFloats:true,companion:false,
      zones:[{start:0,end:4000,name:"EIGENES LEVEL",music:"park",objective:"Bis zur Fahne →",checkpoint:100,sky:["#091563","#132a8e","#171d52"],backdrop:"park",gap:"abyss",style:"brick"}],
      ground:[[0,1200],[1360,1200],[2720,1280]],floats:[[500,480,160],[900,380,160]],movers:[],springs:[],coins:[[580,430],[980,330]],hearts:[],enemies:[[1600,1]],hazards:[],updrafts:[],signs:[],decor:[],
      goal:{type:"flag",x:3850,y:G},win:{eyebrow:"EIGENES LEVEL GESCHAFFT!",title:"SELBST GEBAUT!",text:"Und selbst gespielt."}};
  }
  function fromChapter(c){
    const l = clone(c);
    delete l.id; delete l.bonus; delete l.custom; delete l.hatch; delete l.tvs; delete l.ravenStart;
    l.title = `${c.title.replace(/^KAPITEL \d · /,"")} (KOPIE)`;
    if (!["flag"].includes(l.goal?.type)) l.goal = {type:"flag", x:l.worldW-150, y:G};
    for (const k of ["floats","movers","springs","coins","hearts","enemies","hazards","updrafts","signs","decor"]) l[k] = l[k] || [];
    return l;
  }
  function fixZones(){
    lvl.zones.sort((a,b)=>a.start-b.start);
    lvl.zones[0].start = 0;
    lvl.zones.forEach((z,i)=>{ z.end = i+1<lvl.zones.length ? lvl.zones[i+1].start : lvl.worldW; z.checkpoint = z.start + (i ? 50 : 100); });
  }
  function commit(){ history.push(JSON.stringify(lvl)); if (history.length > 60) history.shift(); saveDraft(); }
  function saveDraft(){ try { localStorage.setItem("dinoGirl.editorDraft", JSON.stringify(lvl)); } catch(e){} }
  function load(l){ lvl = l; fixZones(); sel = null; history = []; renderSide(); resize(); draw(); }

  // ------------------------------------------------------------ Objekte & Treffer
  function items(){
    const out = [];
    lvl.ground.forEach((g,i)=>out.push({k:"ground",i,x:g[0],y:G,w:g[1],h:110}));
    lvl.floats.forEach((f,i)=>out.push({k:"float",i,x:f[0],y:f[1],w:f[2],h:24}));
    lvl.coins.forEach((c,i)=>out.push({k:"coin",i,x:c[0]-18,y:c[1]-20,w:36,h:40}));
    lvl.hearts.forEach((c,i)=>out.push({k:"heart",i,x:c[0]-18,y:c[1]-18,w:36,h:36}));
    lvl.enemies.forEach((e,i)=>{const s=enemySize[e[1]]||enemySize[0];out.push({k:"enemy",i,x:e[0],y:G-s[3],w:s[2],h:s[3]})});
    lvl.springs.forEach((x,i)=>out.push({k:"spring",i,x,y:G-22,w:56,h:22}));
    lvl.hazards.forEach((h,i)=>out.push({k:"hazard",i,x:h[0],y:h[1],w:h[2],h:h[3]}));
    lvl.movers.forEach((m,i)=>out.push({k:"mover",i,x:m.x,y:m.y,w:m.w,h:24}));
    (lvl.updrafts||[]).forEach((u,i)=>out.push({k:"updraft",i,x:u[0],y:u[2],w:u[1],h:H-u[2]}));
    lvl.signs.forEach((s,i)=>out.push({k:"sign",i,x:s[0]-40,y:295,w:80,h:44}));
    out.push({k:"flag",i:0,x:lvl.goal.x-10,y:lvl.goal.y-180,w:76,h:180});
    return out;
  }
  function hit(x,y){ const all = items(); for (let i=all.length-1;i>=0;i--){ const o=all[i]; if (x>=o.x&&x<=o.x+o.w&&y>=o.y&&y<=o.y+o.h) return o; } return null; }
  const listOf = k => ({ground:lvl.ground,float:lvl.floats,coin:lvl.coins,heart:lvl.hearts,enemy:lvl.enemies,spring:lvl.springs,hazard:lvl.hazards,mover:lvl.movers,updraft:lvl.updrafts,sign:lvl.signs})[k];
  function moveItem(o,dx,dy){
    const L = listOf(o.k), it = L ? L[o.i] : null;
    if (o.k==="ground"){ it[0]=snap(it[0]+dx); }
    else if (o.k==="float"){ it[0]=snap(it[0]+dx); it[1]=Math.min(G-20,snap(it[1]+dy)); }
    else if (o.k==="coin"||o.k==="heart"){ it[0]=snap(it[0]+dx); it[1]=snap(it[1]+dy); }
    else if (o.k==="enemy"){ it[0]=snap(it[0]+dx); }
    else if (o.k==="spring"){ L[o.i]=snap(it+dx); }
    else if (o.k==="hazard"){ it[0]=snap(it[0]+dx); it[1]=snap(it[1]+dy); }
    else if (o.k==="mover"){ it.x=snap(it.x+dx); it.y=snap(it.y+dy); }
    else if (o.k==="updraft"){ it[0]=snap(it[0]+dx); it[2]=Math.max(40,snap(it[2]+dy)); }
    else if (o.k==="sign"){ it[0]=snap(it[0]+dx); }
    else if (o.k==="flag"){ lvl.goal.x=snap(lvl.goal.x+dx); lvl.goal.y=snap(lvl.goal.y+dy); }
  }
  function resizeItem(o,dx){
    const it = listOf(o.k)?.[o.i]; if (!it) return;
    if (o.k==="ground") it[1]=Math.max(40,snap(it[1]+dx));
    else if (o.k==="float") it[2]=Math.max(40,snap(it[2]+dx));
    else if (o.k==="hazard") it[2]=Math.max(20,snap(it[2]+dx));
    else if (o.k==="mover") it.w=Math.max(60,snap(it.w+dx));
    else if (o.k==="updraft") it[1]=Math.max(60,snap(it[1]+dx));
  }
  function removeItem(o){
    if (o.k==="flag") return;
    listOf(o.k).splice(o.i,1); sel=null;
  }
  function place(x,y){
    x=snap(x); y=snap(y);
    switch(tool){
      case "ground": lvl.ground.push([x,400]); break;
      case "float": lvl.floats.push([x,Math.min(y,G-40),160]); break;
      case "coin": lvl.coins.push([x,y]); break;
      case "heart": lvl.hearts.push([x,y]); break;
      case "enemy": lvl.enemies.push([x,+$("#enemyType").value]); break;
      case "spring": lvl.springs.push(x); break;
      case "hazard": lvl.hazards.push([x,590,60,20]); break;
      case "mover": { const st=$("#moverStyle").value, vert=st==="gondel"||st==="korb", diag=st==="seilbahn";
        lvl.movers.push({x,y:Math.min(y,G-20),w:130,dx:vert?0:diag?260:160,dy:vert?-200:diag?-200:0,speed:1,style:st}); break; }
      case "updraft": lvl.updrafts=lvl.updrafts||[]; lvl.updrafts.push([x,240,180]); break;
      case "sign": lvl.signs.push([x,"??"]); break;
      case "flag": lvl.goal.x=x; lvl.goal.y=y>500?G:y; break;
      default: return false;
    }
    return true;
  }

  // ------------------------------------------------------------ Zeichnen
  function resize(){ canvas.width = Math.ceil(lvl.worldW*zoom); canvas.height = Math.ceil(H*zoom); }
  function draw(){
    if (!lvl) return;
    ctx.setTransform(zoom,0,0,zoom,0,0); ctx.imageSmoothingEnabled=false;
    ctx.fillStyle="#050812"; ctx.fillRect(0,0,lvl.worldW,H);
    lvl.zones.forEach(z=>{ const b=bdImg[z.backdrop]; ctx.save(); ctx.beginPath(); ctx.rect(z.start,0,z.end-z.start,H); ctx.clip();
      if (b&&b.complete) for (let x=z.start;x<z.end;x+=1280) ctx.drawImage(b,x,0,1280,720);
      ctx.fillStyle="rgba(5,8,18,.35)"; ctx.fillRect(z.start,0,z.end-z.start,H);
      ctx.fillStyle="#9fca31"; ctx.font="22px 'Press Start 2P',monospace"; ctx.fillText(z.name,z.start+14,36);
      ctx.restore(); ctx.strokeStyle="#9fca31"; ctx.setLineDash([12,10]); ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(z.start,0); ctx.lineTo(z.start,H); ctx.stroke(); ctx.setLineDash([]); });
    const zoneAt = x => lvl.zones.find(z=>x>=z.start&&x<z.end)||lvl.zones[0];
    ctx.fillStyle="#02030a"; ctx.fillRect(0,G,lvl.worldW,H-G);
    lvl.ground.forEach(([x,w])=>{ ctx.fillStyle=styleCol[zoneAt(x).style]||"#a8492a"; ctx.fillRect(x,G,w,110); ctx.fillStyle="rgba(255,255,255,.25)"; ctx.fillRect(x,G,w,8); });
    lvl.floats.forEach(([x,y,w])=>{ ctx.fillStyle=styleCol[zoneAt(x).style]||"#a8492a"; ctx.fillRect(x,y,w,24); ctx.fillStyle="rgba(255,255,255,.3)"; ctx.fillRect(x,y,w,5); });
    (lvl.updrafts||[]).forEach(([x,w,top])=>{ ctx.fillStyle="rgba(140,200,255,.18)"; ctx.fillRect(x,top,w,H-top); ctx.strokeStyle="#8ac8ff"; ctx.strokeRect(x,top,w,H-top); });
    lvl.movers.forEach(m=>{ ctx.strokeStyle="rgba(255,207,69,.6)"; ctx.setLineDash([8,8]); ctx.strokeRect(m.x+m.dx,m.y+m.dy,m.w,24); ctx.beginPath(); ctx.moveTo(m.x+m.w/2,m.y+12); ctx.lineTo(m.x+m.dx+m.w/2,m.y+m.dy+12); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle="#d08a3a"; ctx.fillRect(m.x,m.y,m.w,24); });
    lvl.springs.forEach(x=>{ ctx.fillStyle="#ef4b45"; ctx.fillRect(x,G-22,56,10); ctx.fillStyle="#c6ccd8"; ctx.fillRect(x+10,G-12,36,10); });
    lvl.hazards.forEach(([x,y,w,h])=>{ ctx.fillStyle="#9da7bd"; for(let i=x;i<x+w;i+=15){ctx.beginPath();ctx.moveTo(i,y+h);ctx.lineTo(i+7,y);ctx.lineTo(i+15,y+h);ctx.fill()} });
    lvl.coins.forEach(([x,y])=>{ ctx.fillStyle="#f2a817"; ctx.fillRect(x-14,y-18,28,36); ctx.fillStyle="#ffe47a"; ctx.fillRect(x-6,y-14,7,26); });
    lvl.hearts.forEach(([x,y])=>{ ctx.fillStyle="#ef4b45"; ctx.fillRect(x-15,y-12,12,12); ctx.fillRect(x+3,y-12,12,12); ctx.fillRect(x-15,y-4,30,10); ctx.fillRect(x-8,y+6,16,8); });
    lvl.enemies.forEach(([x,t,range=72])=>{ const s=enemySize[t]||enemySize[0];
      ctx.fillStyle="rgba(255,255,255,.12)"; ctx.fillRect(x-range,G-6,range*2+s[0],6);
      if (t===4) { if (bugImg.complete) ctx.drawImage(bugImg,0,0,18,14,x+s[0]/2-s[2]/2,G-s[3],s[2],s[3]); }
      else if (enemyImg[t].complete) ctx.drawImage(enemyImg[t],x+s[0]/2-s[2]/2,G-s[3],s[2],s[3]); });
    lvl.signs.forEach(([x,t])=>{ ctx.fillStyle="#11111d"; ctx.fillRect(x-7,280,14,330); ctx.fillStyle="#e2a72c"; ctx.fillRect(x-40,295,80,44); ctx.fillStyle="#18101a"; ctx.font="bold 24px monospace"; ctx.fillText(t,x-16,325); });
    const g=lvl.goal; ctx.fillStyle="#1a1220"; ctx.fillRect(g.x-3,g.y-170,6,170); ctx.fillStyle="#9fca31"; ctx.beginPath(); ctx.moveTo(g.x+3,g.y-170); ctx.lineTo(g.x+66,g.y-155); ctx.lineTo(g.x+3,g.y-140); ctx.fill();
    ctx.fillStyle="#9fca31"; ctx.fillRect(100-18,G-90,46,72); ctx.fillStyle="#071229"; ctx.font="16px 'Press Start 2P',monospace"; ctx.fillText("S",96,G-46);
    if (sel){ const o=items().find(o=>o.k===sel.k&&o.i===sel.i); if(o){ ctx.strokeStyle="#f7c742"; ctx.lineWidth=4/zoom; ctx.strokeRect(o.x-3,o.y-3,o.w+6,o.h+6); if(["ground","float","hazard","mover","updraft"].includes(o.k)){ ctx.fillStyle="#f7c742"; ctx.fillRect(o.x+o.w-6,o.y+o.h/2-14,12,28); } } }
  }

  // ------------------------------------------------------------ Seitenleiste
  function field(label,value,onChange,type="text",opts){
    const row=document.createElement("div"); row.className="row";
    const l=document.createElement("label"); l.textContent=label; row.append(l);
    let el;
    if (opts){ el=document.createElement("select"); opts.forEach(([v,t])=>{const o=document.createElement("option");o.value=v;o.textContent=t;el.append(o)}); el.value=value; }
    else { el=document.createElement("input"); el.type=type; el.value=value; }
    el.onchange=()=>{ commit(); onChange(type==="number"?+el.value:el.value); fixZones(); renderSide(); resize(); draw(); };
    row.append(el); return row;
  }
  function renderProps(){
    const box=$("#props"); box.textContent="";
    if (!sel){ const p=document.createElement("p"); p.textContent="Nichts ausgewählt. Klick ein Objekt mit dem Zeiger an. Plattformen kannst du am rechten Rand breiter ziehen, Entf löscht."; box.append(p); return; }
    const it=listOf(sel.k)?.[sel.i];
    const names={ground:"Boden",float:"Plattform",coin:"Münze",heart:"Herz",enemy:"Gegner",spring:"Trampolin",hazard:"Stacheln",mover:"Bewegte Plattform",updraft:"Aufwind",sign:"Schild",flag:"Ziel-Fahne"};
    const h=document.createElement("p"); h.textContent=names[sel.k]; box.append(h);
    if (sel.k==="enemy"){ box.append(field("Typ",it[1],v=>it[1]=+v,"text",[["0","Bär"],["1","Fuchs"],["2","Giraffe"],["3","Nilpferd"],["4","Bug"]])); box.append(field("Reichweite",it[2]??72,v=>it[2]=v,"number")); }
    if (sel.k==="mover"){ box.append(field("Art",it.style,v=>it.style=v,"text",[["boat","Boot"],["lift","Kranlast"],["gondel","Gondel"],["korb","Korb"],["seilbahn","Seilbahn"]]));
      box.append(field("Weg x",it.dx,v=>it.dx=v,"number")); box.append(field("Weg y",it.dy,v=>it.dy=v,"number")); box.append(field("Tempo",it.speed,v=>it.speed=v,"number")); }
    if (sel.k==="sign") box.append(field("Text",it[1],v=>it[1]=v.slice(0,3).toUpperCase()));
    if (sel.k==="updraft") box.append(field("Obergrenze",it[2],v=>it[2]=v,"number"));
    if (sel.k!=="flag"){ const b=document.createElement("button"); b.textContent="LÖSCHEN"; b.onclick=()=>{commit();removeItem(sel);renderSide();draw()}; box.append(b); }
  }
  function renderSide(){
    renderProps();
    $("#title").value=lvl.title; $("#worldW").value=lvl.worldW;
    const zb=$("#zones"); zb.textContent="";
    const bd=Object.keys(backdrops).map(k=>[k,k]), mu=musicNames.map(k=>[k,k]);
    const st=Object.keys(styleCol).map(k=>[k,k]), gp=[["abyss","Abgrund"],["water","Wasser"],["fan","Abgrund (Lüfter)"]];
    lvl.zones.forEach((z,i)=>{
      const d=document.createElement("div"); d.className="zone";
      if (i) d.append(field("Beginnt",z.start,v=>z.start=Math.max(50,Math.min(lvl.worldW-50,v)),"number"));
      d.append(field("Name",z.name,v=>z.name=v.toUpperCase()));
      d.append(field("Hintergrund",z.backdrop,v=>z.backdrop=v,"text",bd));
      d.append(field("Musik",z.music,v=>z.music=v,"text",mu));
      d.append(field("Material",z.style,v=>z.style=v,"text",st));
      d.append(field("Lücken",z.gap,v=>z.gap=v,"text",gp));
      d.append(field("Ziel-Text",z.objective,v=>z.objective=v));
      if (i){ const b=document.createElement("button"); b.textContent="ZONE ENTFERNEN"; b.onclick=()=>{commit();lvl.zones.splice(i,1);fixZones();renderSide();draw()}; d.append(b); }
      zb.append(d);
    });
  }

  // ------------------------------------------------------------ Maus & Tasten
  const world = e => { const r=canvas.getBoundingClientRect(); return {x:(e.clientX-r.left)/zoom, y:(e.clientY-r.top)/zoom}; };
  canvas.addEventListener("pointerdown",e=>{
    const p=world(e);
    if (tool==="erase"){ const o=hit(p.x,p.y); if(o&&o.k!=="flag"){commit();removeItem(o);renderSide();draw();status("Gelöscht.")} return; }
    if (tool!=="select"){ commit(); if(place(p.x,p.y)){ status("Gesetzt. Zeiger wählen zum Verschieben."); renderSide(); draw(); } return; }
    const o=hit(p.x,p.y); sel=o?{k:o.k,i:o.i}:null; renderSide(); draw();
    if (o){ commit(); const edge=["ground","float","hazard","mover","updraft"].includes(o.k)&&p.x>o.x+o.w-16; drag={o,last:p,edge,acc:{x:0,y:0}}; canvas.setPointerCapture(e.pointerId); }
  });
  canvas.addEventListener("pointermove",e=>{
    const p=world(e);
    if (!drag){ const o=tool==="select"?hit(p.x,p.y):null; canvas.style.cursor=o?(["ground","float","hazard","mover","updraft"].includes(o.k)&&p.x>o.x+o.w-16?"ew-resize":"move"):"crosshair"; status(`x ${Math.round(p.x)} · y ${Math.round(p.y)}`); return; }
    drag.acc.x+=p.x-drag.last.x; drag.acc.y+=p.y-drag.last.y; drag.last=p;
    const dx=snap(drag.acc.x), dy=snap(drag.acc.y);
    if (dx||dy){ if(drag.edge)resizeItem(drag.o,dx);else moveItem(drag.o,dx,dy); drag.acc.x-=dx; drag.acc.y-=dy; draw(); }
  });
  canvas.addEventListener("pointerup",()=>{ if(drag){drag=null;saveDraft();renderSide()} });
  view.addEventListener("wheel",e=>{ if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){ view.scrollLeft+=e.deltaY; e.preventDefault(); } },{passive:false});
  addEventListener("keydown",e=>{
    if (e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA") return;
    if ((e.key==="Delete"||e.key==="Backspace")&&sel){ commit(); removeItem(sel); renderSide(); draw(); }
    if (e.key==="z"&&(e.ctrlKey||e.metaKey)) undo();
  });
  function undo(){ const prev=history.pop(); if(prev){ lvl=JSON.parse(prev); fixZones(); sel=null; renderSide(); resize(); draw(); saveDraft(); status("Rückgängig."); } }

  // ------------------------------------------------------------ Bedienleiste
  document.querySelectorAll("[data-tool]").forEach(b=>b.onclick=()=>{ tool=b.dataset.tool; document.querySelectorAll("[data-tool]").forEach(x=>x.classList.toggle("on",x===b)); status(b.textContent); });
  const tpl=$("#tpl"); chapters.filter(c=>!c.custom).forEach(c=>{const o=document.createElement("option");o.value=chapters.indexOf(c);o.textContent=c.title;tpl.append(o)});
  $("#loadTpl").onclick=()=>{ if(confirmLoss()) load(fromChapter(chapters[+tpl.value])); };
  $("#newLvl").onclick=()=>{ if(confirmLoss()) load(blank()); };
  $("#zoom").onchange=e=>{ zoom=+e.target.value; resize(); draw(); };
  $("#undo").onclick=undo;
  $("#title").onchange=e=>{ commit(); lvl.title=e.target.value.toUpperCase(); };
  $("#worldW").onchange=e=>{ commit(); lvl.worldW=Math.max(1400,snap(+e.target.value)); fixZones(); resize(); renderSide(); draw(); };
  $("#addZone").onclick=()=>{ commit(); const last=lvl.zones[lvl.zones.length-1]; lvl.zones.push({...clone(last),start:snap((last.start+lvl.worldW)/2),name:"NEUE ZONE"}); fixZones(); renderSide(); draw(); };
  let confirmed=false; function confirmLoss(){ if(!history.length||confirmed) return true; confirmed=true; status("Ungespeicherte Änderungen bleiben als Entwurf erhalten. Nochmal klicken zum Laden."); setTimeout(()=>confirmed=false,4000); return false; }

  function prepared(){ fixZones(); const out=clone(lvl); out.ground.sort((a,b)=>a[0]-b[0]); return out; }
  $("#play").onclick=()=>{ try { localStorage.setItem("dinoGirl.customLevel", JSON.stringify(prepared())); location.href="index.html#eigenes"; } catch(e){ status("Speichern im Browser nicht möglich: "+e.message); } };
  const dlg=$("#dlg"); let dlgMode="";
  $("#exportBtn").onclick=()=>{ dlgMode="export"; $("#dlgText").textContent="Dein Level als JSON. Kopieren und sichern, oder in js/levels.js als neues Kapitel eintragen."; $("#dlgArea").value=JSON.stringify(prepared(),null,1); $("#dlgOk").hidden=true; dlg.showModal(); };
  $("#importBtn").onclick=()=>{ dlgMode="import"; $("#dlgText").textContent="Level-JSON hier einfügen und übernehmen."; $("#dlgArea").value=""; $("#dlgOk").hidden=false; dlg.showModal(); };
  $("#dlgCopy").onclick=async()=>{ try { await navigator.clipboard.writeText($("#dlgArea").value); status("Kopiert."); } catch(e){ $("#dlgArea").select(); status("Bitte mit Strg+C kopieren."); } };
  $("#dlgClose").onclick=()=>dlg.close();
  $("#dlgOk").onclick=()=>{ try { const l=JSON.parse($("#dlgArea").value); if(!l.ground||!l.zones) throw new Error("ground oder zones fehlt"); for (const k of ["floats","movers","springs","coins","hearts","enemies","hazards","updrafts","signs","decor"]) l[k]=l[k]||[]; l.goal=l.goal||{type:"flag",x:l.worldW-150,y:G}; load(l); dlg.close(); status("Importiert."); } catch(e){ $("#dlgText").textContent="Das ging nicht: "+e.message; } };

  // Start: Entwurf, sonst eigenes Level, sonst leeres Level
  let start=null;
  try { start=JSON.parse(localStorage.getItem("dinoGirl.editorDraft")) || JSON.parse(localStorage.getItem("dinoGirl.customLevel")); } catch(e){}
  { const fit=Math.max(.35,Math.min(1,Math.floor((view.clientHeight-24)/720*100)/100)); const o=document.createElement("option"); o.value=fit; o.textContent=`PASSEND (${Math.round(fit*100)} %)`; $("#zoom").prepend(o); $("#zoom").value=String(fit); zoom=fit; }
  load(start && start.ground ? start : blank());
  window.__editor={get lvl(){return lvl},load,draw};
}
