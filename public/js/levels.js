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
 *   enemies:  [x, typ, reichweite?]         typ 0 Bär, 1 Fuchs, 2 Giraffe, 3 Nilpferd, 4 Bug
 *   hazards:  [x, y, breite, höhe]          Stacheln
 *   signs:    [x, "Text"]                   Zonenschilder (dort landet der Kolkrabe)
 *   zone.music: Stück aus js/music.js, zone.raven: eigener Spruch des Raben
 *   decor:    [typ, x]                      reine Deko
 *   updrafts: [x, breite, obergrenze]       Lüfter-Aufwind (Kapitel 4)
 *   tvs:      [x, y, "ziel"]                Rausch-Fernseher: "bonus" = Geheimlevel, "zurueck" = Ausgang
 *   goal:     {type:"nest", x} | {type:"boss", arena, bossX} | {type:"flag", x, y}
 *             | {type:"dragon", arena, bossX} | {type:"exit"}
 *   blocks:   [x, breite, höhe]             massive Hindernisse auf dem Boden (Kisten, Barken)
 *   beats:    [x, y, breite, phase]         Disko-Plattformen, nur im Takt begehbar (phase 0/1)
 *   lasers:   [x, phase]                    Laser im Takt (phase 0/1)
 *   helpers:  Freunde, die helfen, wenn man ihre Art schon einmal befreundet hat:
 *             {type:1, x, reveal:[[x,y]…]}  Fuchs zeigt versteckte Münzen
 *             {type:3, gap:[von,bis]}       Nilpferd als Brücke über eine Lücke
 *             {type:2, x, heart:[x,y]}      Giraffe reicht ein Herz herunter
 *             {type:0, x, ledge:[x,y,w], coins:[[x,y]…]}  Bär macht Räuberleiter
 *   autoscroll: {speed, max}                Bildschirm scrollt von selbst (Verfolgungsjagd)
 *   zone.weather: rain | leaves | snow | sparks | confetti | fireflies
 *   win:      Texte für den Siegerbildschirm
 */
window.DINO_LEVELS = (() => {
  const ground = 610;

  const kapitel1 = {
    id: 1,
    title: "KAPITEL 1 · NACHTPARK",
    worldW: 7600,
    enemySpeed: 1,
    zones: [
      {start:0,end:2240,name:"LEVEL 01 · NACHTPARK",music:"park",objective:"Erreiche den Dächerweg →",checkpoint:100,sky:["#091563","#132a8e","#171d52"],backdrop:"park",gap:"abyss",style:"brick"},
      {start:2240,end:4620,name:"LEVEL 02 · DÄCHERWEG",music:"daecher",objective:"Überquere die Skyline →",checkpoint:2290,sky:["#10105c","#24207b","#1b1747"],backdrop:"park",gap:"abyss",style:"brick"},
      {start:4620,end:7600,name:"LEVEL 03 · ALTSTADT",weather:"rain",music:"altstadt",objective:"Rette das Dino-Nest →",checkpoint:4670,sky:["#210d46","#3d175a","#1a1234"],backdrop:"park",gap:"abyss",style:"brick"}
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
    tvs: [[4080,305,"bonus"]],
    goal: {type:"nest", x:7480},
    win: {eyebrow:"DAS NEST IST GERETTET!", title:"SAURIER-STARK!", text:"Moment mal … waren da nicht drei Eier?"}
  };

  const kapitel2 = {
    id: 2,
    title: "KAPITEL 2 · DAS VERSCHWUNDENE EI",
    worldW: 9900,
    enemySpeed: 1.15,
    oneWayFloats: true, // schwebende Plattformen von unten durchspringbar
    zones: [
      {start:0,end:3200,name:"LEVEL 04 · RHEINUFER",music:"rhein",objective:"Folge der Spur am Fluss →",checkpoint:100,sky:["#081a6e","#0f2b8c","#0a1747"],backdrop:"rhein",gap:"water",style:"quay"},
      {start:3200,end:6400,name:"LEVEL 05 · KIRMES",weather:"confetti",music:"kirmes",objective:"Quer über den Rummel →",checkpoint:3250,sky:["#140f5e","#2b1f80","#1a1447"],backdrop:"kirmes",gap:"abyss",style:"brick"},
      {start:6400,end:8620,name:"LEVEL 06 · BAUSTELLE",weather:"sparks",music:"bau",objective:"Hoch hinaus über die Kräne →",checkpoint:6450,sky:["#0d1560","#1d2a85","#141a45"],backdrop:"bau",gap:"abyss",style:"girder"},
      {start:8620,end:9900,name:"FINALE · KRANPLATZ",raven:"BÄR VORAUS. ICH BIN RAUS!",music:"bau",objective:"Hol das Ei zurück!",checkpoint:8680,sky:["#1e0c3e","#3a1554","#170f30"],backdrop:"bau",gap:"abyss",style:"girder"}
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
    goal: {type:"boss", arena:8620, bossX:9500, name:"DER GROSSE BÄR"},
    hatch: true,
    win: {eyebrow:"DAS EI IST ZURÜCK IM NEST!", title:"DINO-MÄSSIG!", text:"Der Kleine ist geschlüpft und begleitet dich ab Kapitel 3."}
  };

  const kapitel3 = {
    id: 3,
    title: "KAPITEL 3 · DIE LAHN HINAUF",
    worldW: 9600,
    enemySpeed: 1.2,
    oneWayFloats: true,
    companion: true,
    zones: [
      {start:0,end:3200,name:"LEVEL 07 · WEINBERGE",weather:"leaves",music:"weinberge",objective:"Durch die Reben, die Lahn hinauf →",checkpoint:100,sky:["#081a6e","#10298a","#0a1747"],backdrop:"weinberge",gap:"water",style:"crate"},
      {start:3200,end:6200,name:"LEVEL 08 · KNEIPENVIERTEL",weather:"rain",music:"kneipe",objective:"Quer durchs Kneipenviertel →",checkpoint:3250,sky:["#0d1460","#1e2a84","#141a45"],backdrop:"kneipen",gap:"abyss",style:"cobble",raven:"EINE APFELSCHORLE, BITTE. KRAH."},
      {start:6200,end:9600,name:"LEVEL 09 · BURG LAHNECK",weather:"snow",music:"burg",objective:"Hiss die Fahne auf dem Turm!",checkpoint:6250,sky:["#140c4a","#26196e","#120f36"],backdrop:"burg",gap:"abyss",style:"castle",raven:"DIE BURG. ICH WAR SCHON OBEN. ANGEBER."}
    ],
    ground: [
      [0,700],[860,440],[1460,520],[2160,380],[2700,500],
      [3200,560],[3920,480],[4560,560],[5280,420],[5860,340],
      [6200,440],[6820,360],[7360,440],[7980,300],[8460,1140]
    ],
    floats: [
      [300,500,150],[520,400,140],[760,470,120],[1440,260,150],[1580,480,150],[1800,390,150],[2020,300,140],[2220,480,150],[2440,380,140],[2570,250,150],[2760,480,150],[2980,390,150],
      [3400,490,150],[3620,380,140],[3780,470,110],[4000,400,150],[4220,310,150],[4420,450,110],[4700,480,150],[4900,370,150],[5130,470,120],[5400,380,150],[5620,280,150],[5900,470,150],[6050,370,140],
      [6300,490,140],[6500,380,140],[6680,470,110],[6900,390,140],[7100,300,140],[7400,480,140],[7600,380,140],[7820,470,120],[8000,380,140],[8200,290,140],[8330,480,130],[8700,380,140],[8900,280,140],[9100,190,160],[9380,200,180]
    ],
    movers: [
      {x:1000,y:560,w:140,dx:280,dy:-250,speed:.6,style:"seilbahn"},
      {x:7200,y:560,w:120,dx:0,dy:-240,speed:.9,style:"korb"}
    ],
    springs: [2470,5520],
    coins: [
      [370,450],[585,350],[820,420],[1080,500],[1180,430],[1280,360],[1515,210],[1650,430],[1870,340],[2090,250],[2290,430],[2505,330],[2640,200],[2830,430],[3050,340],
      [3475,440],[3690,330],[3835,420],[4075,350],[4475,400],[4775,430],[4975,320],[5190,420],[5475,330],[5695,230],[5760,230],[5975,420],[6120,320],
      [6370,440],[6570,330],[6735,420],[6970,340],[7260,480],[7260,380],[7470,430],[7670,330],[7880,420],[8070,330],[8270,240],[8395,430],[8770,330],[8970,230],[9180,140],[9300,560],[9540,560]
    ],
    hearts: [[1580,210],[4295,260],[7170,250]],
    enemies: [
      [1100,1],[1600,3],[2300,0],[2850,2],
      [3450,1],[4100,2],[4700,3],[4950,0],[5450,1],[6000,3],
      [6350,0],[6950,2],[7450,1],[7650,3],[8100,0],[8600,1],[8950,2],[9300,3]
    ],
    hazards: [[1880,590,60,20],[3100,590,60,20],[3700,590,50,20],[4300,590,60,20],[5650,590,40,20],[6550,590,60,20],[7700,590,60,20],[8750,590,70,20],[9150,590,70,20]],
    signs: [[3200,"08"],[6200,"09"]],
    decor: [
      ...[150,550,980,1200,1650,2300,2800,3100].map(x=>["fass",x]),
      ...[3350,3900,4600,5300,5900].map(x=>["lamp",x]),
      ...[6300,6900,7500,8100,8600,9200].map(x=>["fackel",x])
    ],
    helpers: [
      {type:1, x:620, reveal:[[560,170],[620,150],[680,170]]},
      {type:3, gap:[1980,2160]},
      {type:2, x:3560, heart:[3600,100]},
      {type:0, x:8500, ledge:[8560,150,150], coins:[[8600,100],[8660,100]]}
    ],
    goal: {type:"flag", x:9470, y:200},
    win: {eyebrow:"DIE FAHNE WEHT ÜBER LAHNECK!", title:"TURM-T-REX!", text:"Und der Kleine hat kein einziges Mal geweint. Fast."}
  };

  const kapitel4 = {
    id: 4,
    title: "KAPITEL 4 · SERVERRAUM",
    worldW: 9400,
    enemySpeed: 1.25,
    oneWayFloats: true,
    companion: true,
    zones: [
      {start:0,end:3400,name:"LEVEL 10 · RECHENZENTRUM",music:"server",objective:"Finde den Helpdesk →",checkpoint:100,sky:["#040a28","#081446","#040a28"],backdrop:"server",gap:"abyss",style:"rack"},
      {start:3400,end:6600,name:"LEVEL 11 · KÜHLGANG",weather:"snow",music:"kuehl",objective:"Lass dich von den Lüftern tragen →",checkpoint:3450,sky:["#04122e","#0a2050","#04122e"],backdrop:"server",gap:"fan",style:"rack",raven:"HAST DU'S MAL AUS- UND WIEDER EINGESCHALTET?"},
      {start:6600,end:8120,name:"LEVEL 12 · KABELSALAT",music:"server",objective:"Bugs fixen, bevor sie sich vermehren!",checkpoint:6650,sky:["#0a0a30","#16124e","#0a0a30"],backdrop:"server",gap:"abyss",style:"rack",raven:"TICKET #4711: DINO ZU SCHNELL. GESCHLOSSEN."},
      {start:8120,end:9400,name:"FINALE · HELPDESK",music:"server",objective:"Schließ das Ticket!",checkpoint:8170,sky:["#1a0830","#30104e","#1a0830"],backdrop:"server",gap:"abyss",style:"rack",raven:"DRACHE AM TELEFON. ICH BIN IN DER MITTAGSPAUSE."}
    ],
    ground: [
      [0,640],[800,480],[1440,560],[2160,420],[2760,640],
      [3400,520],[4240,480],[5100,560],[5900,700],
      [6600,420],[7180,380],[7720,400],
      [8120,1280]
    ],
    floats: [
      [300,500,140],[520,400,140],[700,470,110],[950,380,140],[1150,290,140],[1500,480,140],[1720,380,140],[1900,470,110],[2250,480,140],[2450,380,140],[2620,470,120],[2900,400,140],[3150,300,140],
      [3550,480,140],[3780,380,120],[4040,200,160],[4400,470,140],[4580,370,120],[4840,220,140],[5250,480,140],[5450,380,140],[5700,470,140],[6050,480,140],[6300,380,140],
      [6700,480,140],[6900,380,140],[7050,470,110],[7250,380,140],[7450,290,140],[7600,460,100],[7800,480,140],[7980,380,120],
      [8300,450,170],[8650,330,170],[9000,450,170]
    ],
    movers: [],
    springs: [1000],
    updrafts: [[3920,320,170],[4720,380,170]],
    coins: [
      [370,450],[590,350],[755,420],[1020,330],[1220,240],[1570,430],[1790,330],[1955,420],[2320,430],[2520,330],[2680,420],[2970,350],[3220,250],
      [3620,430],[3840,330],[3990,420],[4060,300],[4120,150],[4180,300],[4470,420],[4640,320],[4800,420],[4910,170],[4980,420],[5320,430],[5520,330],[5770,420],[6120,430],[6370,330],
      [6770,430],[6970,330],[7110,420],[7320,330],[7520,240],[7650,410],[7870,430],[8040,330],
      [8385,400],[9085,400]
    ],
    hearts: [[4120,110],[7450,240],[8735,280]],
    enemies: [
      [900,4],[1600,1],[2300,4],[2900,3],
      [3600,4],[4400,0],[5250,4],[5450,2],[6100,4],[6350,1],
      [6800,4],[7300,3],[7850,4]
    ],
    hazards: [[1180,590,50,20],[2520,590,60,20],[3700,590,60,20],[5520,590,60,20],[6950,590,60,20]],
    signs: [[3400,"11"],[6600,"12"],[8120,"??"]],
    decor: [
      ...[200,1000,1700,2400,3000].map(x=>["kabel",x]),
      ...[3600,4400,5300,6100].map(x=>["kabel",x]),
      ...[6700,7300,7900].map(x=>["kabel",x])
    ],
    helpers: [
      {type:1, x:1300, reveal:[[1240,140],[1300,120],[1360,140]]},
      {type:3, gap:[2580,2760]},
      {type:2, x:5280, heart:[5330,90]},
      {type:0, x:6200, ledge:[6280,160,140], coins:[[6320,110],[6380,110]]}
    ],
    bearHelps: true,
    goal: {type:"dragon", arena:8120, bossX:9050, name:"DER DAU-DRACHE"},
    win: {eyebrow:"TICKET GESCHLOSSEN!", title:"FEIERABEND!", text:"Der DAU-Drache ruft morgen nochmal an. Bis dahin: Kaffee."}
  };


  // Kapitel 5: Verfolgungsjagd. Münzreihen werden aus den Bodenstücken erzeugt.
  const chaseGround = [[0,900],[1060,700],[1920,600],[2680,520],[3360,640],[4000,1100],[5260,900],[6320,1080],[7400,700],[8420,560],[9180,700],[10080,1120]];
  const chaseBlocks = [[600,60,70],[1300,60,100],[1500,100,60],[2150,60,90],[2900,60,70],[3600,120,60],[3800,60,100],
    [4300,60,80],[4600,120,60],[4900,60,100],[5500,60,90],[5800,60,70],[6000,60,100],[6600,100,60],[6950,60,90],
    [7700,60,80],[7950,60,60],[8600,60,100],[8800,100,60],[9400,60,90],[9650,60,70],[10300,60,80]];
  const chaseCoins = [];
  chaseGround.forEach(([gx,gw])=>{ for(let x=gx+120;x<gx+gw-80;x+=150){ const blk=chaseBlocks.find(([bx,bw])=>x>bx-40&&x<bx+bw+40); chaseCoins.push([x, blk ? 610-blk[2]-60 : 560]); } });
  chaseGround.slice(0,-1).forEach(([gx,gw],i)=>{ const a=gx+gw, b=chaseGround[i+1][0], m=(a+b)/2; if(b-a<=220) chaseCoins.push([m,470]); });

  const kapitel5 = {
    id: 5,
    title: "KAPITEL 5 · DER KUCHEN-KLAU",
    worldW: 11200,
    enemySpeed: 1.1,
    oneWayFloats: true,
    companion: true,
    autoscroll: {speed:240, max:310},
    zones: [
      {start:0,end:4000,name:"LEVEL 13 · B42",music:"jagd",weather:"leaves",objective:"Bleib am Lieferwagen dran! →",checkpoint:100,sky:["#081a6e","#0f2b8c","#0a1747"],backdrop:"rhein",gap:"water",style:"asphalt"},
      {start:4000,end:7400,name:"LEVEL 14 · TUNNEL",music:"tunnel",objective:"Durch den Tunnel →",checkpoint:4050,sky:["#0e0c16","#16141f","#0e0c16"],backdrop:"tunnel",gap:"abyss",style:"asphalt",raven:"IM TUNNEL KEIN EMPFANG. KRAH?"},
      {start:7400,end:11200,name:"LEVEL 15 · BRÜCKE",music:"jagd",weather:"rain",objective:"Gleich hast du ihn! →",checkpoint:7450,sky:["#0a1450","#142a78","#0a1240"],backdrop:"rhein",gap:"water",style:"asphalt",raven:"DER WAGEN! LINKS! NEIN, RECHTS!"}
    ],
    ground: chaseGround,
    blocks: chaseBlocks,
    floats: [[700,470,140],[1200,430,140],[2000,450,140],[2400,400,140],[3000,450,140],[4700,420,140],[5600,440,140],[6800,430,140],[8150,430,120],[9000,440,120]],
    movers: [], springs: [],
    coins: chaseCoins,
    hearts: [[2470,350],[5670,390],[9060,390]],
    enemies: [[1200,1],[2300,3],[3500,2],[4450,4],[5700,1],[6750,0],[7800,1],[9500,2],[10400,3]],
    hazards: [[2450,590,40,20],[3050,590,40,20],[6420,590,40,20],[10500,590,40,20]],
    signs: [[4000,"14"],[7400,"15"]],
    decor: [...[300,1700,2800,3500].map(x=>["bollard",x]), ...[7600,8700,9600,10700].map(x=>["bollard",x])],
    helpers: [{type:3, gap:[8100,8420]}],
    goal: {type:"van", x:10950},
    win: {eyebrow:"WAGEN EINGEHOLT!", title:"KUCHEN GERETTET!", text:"Am Steuer saß das Nilpferd. Der Kuchen war für die Disko-Nacht. Du bist eingeladen!"}
  };

  const kapitel6 = {
    id: 6,
    title: "KAPITEL 6 · DISKO-NACHT",
    worldW: 8400,
    enemySpeed: 1,
    oneWayFloats: true,
    companion: true,
    zones: [
      {start:0,end:2800,name:"LEVEL 16 · TANZFLÄCHE",music:"disko",weather:"confetti",objective:"Hüpf im Takt! →",checkpoint:100,sky:["#1a0630","#2a0a46","#14041f"],backdrop:"disko",gap:"abyss",style:"disco"},
      {start:2800,end:5600,name:"LEVEL 17 · LASERGANG",music:"disko",weather:"confetti",objective:"Laser an, Laser aus …",checkpoint:2850,sky:["#1a0630","#2a0a46","#14041f"],backdrop:"disko",gap:"abyss",style:"disco",raven:"IM TAKT HÜPFEN. EINS, ZWEI … KRAH!"},
      {start:5600,end:8400,name:"FINALE · DJ-PULT",music:"dj",weather:"confetti",objective:"Rauf zum DJ-Pult!",checkpoint:5650,sky:["#200830","#3a0c50","#1a0626"],backdrop:"disko",gap:"abyss",style:"disco",raven:"ICH LEG GLEICH AUF. BLEIB DRAN!"}
    ],
    ground: [[0,800],[1100,600],[2000,800],[2800,700],[3700,600],[4500,1100],[5600,500],[6400,500],[7200,1200]],
    floats: [[300,480,140],[520,380,140],[1300,470,140],[2200,470,140],[2450,380,140],[3600,330,120],[4520,470,140],[5000,420,140],[5300,330,140],[5800,470,140],[7400,500,140],[7800,330,260]],
    beats: [[880,540,140,0],[1740,540,110,0],[1880,490,110,1],[3520,500,120,1],[4330,500,120,0],[6140,520,100,0],[6260,450,100,1],[6940,520,100,1],[7060,450,100,0],[7560,420,120,0],[7690,370,90,1]],
    lasers: [[3000,0],[3200,1],[3400,0],[3900,1],[4100,0],[4700,1],[4900,0],[5100,1],[5300,0]],
    movers: [], springs: [2600],
    coins: [[370,430],[590,330],[950,490],[1370,420],[1795,490],[1935,440],[2270,420],[2520,330],[2660,180],
      [3100,560],[3300,560],[3580,450],[3660,280],[3820,560],[4020,560],[4390,450],[4590,420],[4800,560],[5070,370],[5370,280],
      [5870,420],[6190,470],[6310,400],[6600,560],[6990,470],[7110,400],[7470,450],[7620,370],[7735,320]],
    hearts: [[2660,130],[5070,320]],
    enemies: [[500,1],[2300,3],[3800,2],[5800,0],[6600,1],[7400,3]],
    hazards: [[1500,590,40,20],[6700,590,40,20]],
    signs: [[2800,"17"],[5600,"DJ"]],
    decor: [],
    helpers: [
      {type:1, x:1500, reveal:[[1450,200],[1520,180],[1590,200]]},
      {type:0, x:4700, ledge:[4780,170,140], coins:[[4820,120],[4880,120]]},
      {type:2, x:5800, heart:[5850,90]}
    ],
    goal: {type:"dj", x:7930, y:330},
    win: {eyebrow:"DIE NACHT GEHÖRT DIR!", title:"DISKO-DINO!", text:"Der Kolkrabe legt bis zum Morgengrauen auf. Danke fürs Spielen!"}
  };

  const bonus = {
    id: 90,
    bonus: true,
    title: "BONUS · RAUSCHEN",
    worldW: 4300,
    enemySpeed: 1,
    oneWayFloats: true,
    zones: [
      {start:0,end:4300,name:"BONUS · RAUSCHEN",weather:"fireflies",music:"rauschen",objective:"Einfach mal treiben lassen …",checkpoint:120,sky:["#06041e","#160c40","#0a2840"],backdrop:"rauschen",gap:"abyss",style:"neon"}
    ],
    ground: [[0,520],[660,300],[1120,400],[1680,300],[2120,520],[2780,300],[3240,1060]],
    floats: [
      [420,470,120],[560,370,120],[700,270,120],[980,440,120],[1290,360,140],[1520,470,120],[1560,280,120],[1820,380,140],[2000,280,120],
      [2340,470,120],[2500,370,120],[2660,270,120],[2900,420,120],[3080,320,120],[3400,470,120],[3600,370,120],[3800,270,120]
    ],
    movers: [],
    springs: [2240],
    coins: [
      ...[0,1,2,3,4].map(i=>[220+i*60,520-Math.sin(i/4*Math.PI)*90]),
      [480,420],[620,320],[760,220],[1040,390],[1360,310],[1580,420],[1620,230],[1890,330],[2060,230],
      ...[0,1,2,3,4,5].map(i=>[2200+i*28,520-i*60]),
      [2400,420],[2560,320],[2720,220],[2960,370],[3140,270],[3460,420],[3660,320],[3860,220],
      ...[0,1,2,3,4,5,6].map(i=>[3300+i*80,560])
    ],
    hearts: [],
    enemies: [],
    hazards: [],
    signs: [[260,"??"]],
    decor: [],
    tvs: [[4100,610,"zurueck"]],
    ravenStart: {x:260,line:"PSST. HIER WAR NIE JEMAND."},
    goal: {type:"exit"},
    win: {eyebrow:"DAS RAUSCHEN IST VORBEI", title:"GANZ ENTSPANNT.", text:"Die Münzen aus dem Bonuslevel liegen schon im Laden-Konto."}
  };

  // Eigenes Level aus dem Editor (localStorage), falls vorhanden
  let custom = null;
  try {
    const raw = localStorage.getItem("dinoGirl.customLevel");
    if (raw) { custom = JSON.parse(raw); custom.id = 99; custom.custom = true; custom.title = custom.title || "EIGENES LEVEL"; }
  } catch(e) { custom = null; }

  const chapters = [kapitel1, kapitel2, kapitel3, kapitel4, kapitel5, kapitel6, bonus];
  if (custom) chapters.push(custom);
  return {ground, chapters, story:[kapitel1, kapitel2, kapitel3, kapitel4, kapitel5, kapitel6]};
})();
