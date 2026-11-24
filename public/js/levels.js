/* Level-Daten für Adventures of the Dino Girl.
 *
 * Jedes Kapitel ist eine durchgehende Welt mit mehreren Zonen.
 * Koordinaten in Spielpixeln (Bildschirm 1280 x 720, Boden bei y = 610).
 *
 *   ground:   [x, breite]                   Bodenstücke, Lücken = Abgrund/Wasser
 *   floats:   [x, y, breite]                schwebende Plattformen
 *   movers:   {x, y, w, dx, dy, speed, style}  bewegte Plattformen (Boot, Gondel, Lift)
 *   springs:  [x]                           Trampoline auf dem Boden
 *   coins:    [x, y]
 *   hearts:   [x, y]                        +1 Leben (oder Punkte, wenn voll)
 *   enemies:  [x, typ, reichweite?]         typ 0 Bär, 1 Fuchs, 2 Giraffe, 3 Nilpferd
 *   hazards:  [x, y, breite, höhe]          Stacheln
 *   signs:    [x, "Text"]                   Zonenschilder
 *   decor:    [typ, x]                      reine Deko
 *   goal:     {type:"nest", x} | {type:"boss", arena}
 */
window.DINO_LEVELS = (() => {
  const ground = 610;

  const kapitel1 = {
    id: 1,
    title: "KAPITEL 1 · NACHTPARK",
    worldW: 7600,
    enemySpeed: 1,
    zones: [
      {start:0,end:2240,name:"LEVEL 01 · NACHTPARK",objective:"Erreiche den Dächerweg →",checkpoint:100,sky:["#091563","#132a8e","#171d52"],backdrop:"park",gap:"abyss",style:"brick"},
      {start:2240,end:4620,name:"LEVEL 02 · DÄCHERWEG",objective:"Überquere die Skyline →",checkpoint:2290,sky:["#10105c","#24207b","#1b1747"],backdrop:"park",gap:"abyss",style:"brick"},
      {start:4620,end:7600,name:"LEVEL 03 · ALTSTADT",objective:"Rette das Dino-Nest →",checkpoint:4670,sky:["#210d46","#3d175a","#1a1234"],backdrop:"park",gap:"abyss",style:"brick"}
    ],
    ground: [[0,620],[760,520],[1420,680],[2240,370],[2740,520],[3380,340],[3840,650],[4620,430],[5180,520],[5840,330],[6310,430],[6880,720]],
    floats: [
      [340,500,170],[860,480,170],[1110,380,150],[1500,500,165],[1760,410,150],[1990,320,160],
      [2320,485,160],[2530,390,160],[2800,490,160],[3060,395,165],[3440,490,150],[3650,395,160],[3970,305,170],[4270,420,160],
      [4690,485,160],[4930,390,160],[5240,480,150],[5460,370,165],[5900,480,160],[6110,380,160],[6380,470,160],[6620,355,170],[6940,470,160],[7170,370,160]
    ],
    movers: [],
    springs: [],
    coins: [[400,450],[910,430],[1160,330],[1560,450],[1810,360],[2040,270],[2370,435],[2580,340],[2850,440],[3120,345],[3485,440],[3700,345],[4020,255],[4320,370],[4740,435],[4980,340],[5290,430],[5510,320],[5950,430],[6160,330],[6430,420],[6680,305],[6990,420],[7220,320]],
    hearts: [],
    // Original-Verteilung: Typ und Laufrichtung reihum
    enemies: [930,1680,2400,2930,3510,4110,4770,5370,5960,6500,7090].map((x,i)=>[x,i%4,72,i%2?1:-1]),
    hazards: [[1180,590,60,20],[2450,590,60,20],[3510,590,70,20],[4150,590,70,20],[4810,590,60,20],[5480,590,70,20],[5960,590,60,20],[7040,590,70,20]],
    signs: [[2240,"02"],[4620,"03"]],
    decor: Array.from({length:6},(_,i)=>["bench",640+i*1280]),
    goal: {type:"nest", x:7480}
  };

  const kapitel2 = {
    id: 2,
    title: "KAPITEL 2 · DAS VERSCHWUNDENE EI",
    worldW: 9900,
    enemySpeed: 1.15,
    oneWayFloats: true, // schwebende Plattformen von unten durchspringbar
    zones: [
      {start:0,end:3200,name:"LEVEL 04 · RHEINUFER",objective:"Folge der Spur am Fluss →",checkpoint:100,sky:["#081a6e","#0f2b8c","#0a1747"],backdrop:"rhein",gap:"water",style:"quay"},
      {start:3200,end:6400,name:"LEVEL 05 · KIRMES",objective:"Quer über den Rummel →",checkpoint:3250,sky:["#140f5e","#2b1f80","#1a1447"],backdrop:"kirmes",gap:"abyss",style:"brick"},
      {start:6400,end:8620,name:"LEVEL 06 · BAUSTELLE",objective:"Hoch hinaus über die Kräne →",checkpoint:6450,sky:["#0d1560","#1d2a85","#141a45"],backdrop:"bau",gap:"abyss",style:"girder"},
      {start:8620,end:9900,name:"FINALE · KRANPLATZ",objective:"Hol das Ei zurück!",checkpoint:8680,sky:["#1e0c3e","#3a1554","#170f30"],backdrop:"bau",gap:"abyss",style:"girder"}
    ],
    ground: [
      [0,620],[780,420],[1500,500],[2260,420],[2860,340],
      [3200,560],[3900,500],[4560,640],[5380,420],[5960,440],
      [6400,380],[6960,300],[7600,360],[8160,1740]
    ],
    floats: [
      [300,500,160],[560,400,150],[900,480,160],[1120,370,150],[1600,490,160],[1830,390,150],[2050,300,150],[2380,480,160],[2600,380,150],[2950,470,160],
      [3420,490,160],[3730,280,170],[3980,410,150],[4200,320,160],[4440,450,110],[4740,270,200],[4980,390,160],[5460,370,160],[5840,260,160],[6040,480,160],[6250,380,150],
      [6500,480,150],[6700,370,140],[7000,470,150],[7180,360,140],[7820,300,140],[8020,470,110],
      [8820,450,170],[9180,340,170],[9560,450,170]
    ],
    movers: [
      {x:1220,y:592,w:130,dx:140,dy:0,speed:1.0,style:"boat"},
      {x:2010,y:592,w:130,dx:110,dy:0,speed:1.2,style:"boat",phase:2},
      {x:5230,y:540,w:120,dx:0,dy:-180,speed:1.1,style:"gondel"},
      {x:7280,y:560,w:120,dx:180,dy:0,speed:.8,style:"lift"},
      {x:7660,y:586,w:120,dx:0,dy:-280,speed:.75,style:"lift"}
    ],
    springs: [3620,4640,5730],
    coins: [
      [380,450],[635,350],[980,430],[1195,320],[1290,540],[1430,540],[1680,440],[1905,340],[2095,250],[2460,430],[2675,330],[3030,420],
      [3500,440],[3620,420],[3640,330],[3780,230],[3850,230],[4055,360],[4280,270],[4495,400],[4790,220],[4890,220],[5060,340],[5290,300],[5540,320],[5900,210],[6120,430],[6325,330],
      [6575,430],[6770,320],[7075,420],[7250,310],[7370,500],[7520,500],[7720,470],[7720,370],[7860,250],[7930,250],[8075,420],
      [8905,400],[9645,400]
    ],
    hearts: [[2165,250],[4840,215],[9265,290]],
    enemies: [
      [1000,1],[1700,0],[2450,3],[3000,2],
      [3450,1],[4120,3],[4900,0],[5080,1],[5550,2],[6150,3],
      [6600,0],[7100,1],[7880,2,40],[8350,3]
    ],
    hazards: [[2540,590,60,20],[4250,590,60,20],[6300,590,60,20],[6680,590,60,20],[8480,590,70,20]],
    signs: [[3200,"05"],[6400,"06"],[8620,"!!"]],
    decor: [
      ...[180,520,900,1150,1640,1900,2340,2620,2950,3120].map(x=>["bollard",x]),
      ...[3300,3700,4000,4350,4650,5100,5450,5750,6050,6350].map(x=>["pole",x]),
      ...[6450,6740,7030,7680,8220,8560].map(x=>["bake",x])
    ],
    goal: {type:"boss", arena:8620, bossX:9500}
  };

  return {ground, chapters:[kapitel1, kapitel2]};
})();
