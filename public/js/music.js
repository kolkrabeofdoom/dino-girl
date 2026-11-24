/* Chiptune-Soundtrack für Dino Girl.
 *
 * Kleiner Step-Sequencer auf WebAudio: 16 Schritte pro Takt, 4 Takte pro Loop.
 * Jedes Stück hat Akkorde, ein Arpeggio (der Berlin-School-Motor), eine Basslinie,
 * eine kurze Melodie und Schlagzeug aus Rauschen und Sinus.
 *
 *   chords: [Grundton als MIDI-Note, "m" | "M" | "7" | "d"] pro Takt
 *   arp:    16 Indizes in die Akkordtöne (0–3 = Grundlage, 4–7 = eine Oktave höher)
 *   bass:   16 Schritte, Zahl = Halbtöne über dem Akkord-Grundton (zwei Oktaven tiefer), "." = Pause
 *   lead:   64 Schritte über alle 4 Takte, MIDI-Note oder 0 (Pause), "-" hält den Ton
 *   kick / snare / hat: "x" = Schlag
 */
window.DinoMusic = (() => {
  const Q = {m:[0,3,7,12], M:[0,4,7,12], "7":[0,4,7,10], d:[0,3,6,9]};
  const bar = s => s.replace(/\s/g,"").split("");

  const tracks = {
    park: { // Level 01: ruhige Nachtpark-Sequenz in a-Moll
      bpm:104, chords:[[57,"m"],[53,"M"],[60,"M"],[55,"M"]],
      arp:[0,1,2,4,2,1,0,1,0,2,4,5,4,2,1,2],
      bass:bar("0..0 ..7. 0... 7..."),
      lead:[76,"-","-",0, 74,"-",72,"-", 71,"-","-","-", 0,0,72,74,  72,"-","-",0, 69,"-","-","-", 0,0,0,0, 65,"-",67,"-",
            67,"-","-",0, 72,"-",76,"-", 79,"-","-","-", 0,0,77,76,  74,"-","-","-", 71,"-",72,"-", 74,"-","-","-", 0,0,0,0],
      kick:bar("x... .... x... ...."), snare:bar(".... x... .... x..."), hat:bar("..x. ..x. ..x. ..x."), arpVol:.020
    },
    daecher: { // Level 02: über den Dächern, schneller, offener
      bpm:118, chords:[[57,"m"],[55,"M"],[53,"M"],[52,"M"]],
      arp:[0,2,4,6,4,2,0,2,1,3,5,7,5,3,1,3],
      bass:bar("0.0. 0.0. 0.0. 0.07"),
      lead:[81,"-","-","-", 79,"-",76,"-", 0,0,76,"-", 79,"-",81,"-",  79,"-","-","-", 76,"-",74,"-", 0,0,72,"-", 74,"-",76,"-",
            77,"-","-","-", 76,"-",74,"-", 72,"-","-","-", 74,"-",76,"-", 76,"-","-","-", 75,"-","-","-", 76,"-","-","-", 0,0,0,0],
      kick:bar("x... ..x. x... ...."), snare:bar(".... x... .... x..."), hat:bar("x.x. x.x. x.x. x.xx"), arpVol:.020
    },
    altstadt: { // Level 03: Kopfsteinpflaster, d-Moll, ein bisschen Krimi
      bpm:96, chords:[[50,"m"],[55,"m"],[57,"7"],[50,"m"]],
      arp:[0,1,2,1,0,1,2,4,0,1,2,1,0,2,4,2],
      bass:bar("0... ..0. 7... ..5."),
      lead:[74,"-","-",0, 77,"-",76,"-", 74,"-",73,"-", 74,"-","-","-",  79,"-","-",0, 77,"-",76,"-", 74,"-","-","-", 70,"-","-","-",
            73,"-","-","-", 76,"-","-","-", 79,"-",77,"-", 76,"-",73,"-",  74,"-","-","-", 0,0,0,0, 62,"-",65,"-", 69,"-","-","-"],
      kick:bar("x... .... x.x. ...."), snare:bar(".... x... .... x..x"), hat:bar("..x. ..x. ..x. .xx."), arpVol:.019
    },
    rhein: { // Level 04: fließende Arpeggios, kaum Schlagzeug
      bpm:92, chords:[[50,"m"],[46,"M"],[53,"M"],[48,"M"]],
      arp:[0,1,2,3,4,5,6,7,6,5,4,3,2,1,2,3],
      bass:bar("0... .... 7... ...."),
      lead:[0,0,0,0, 81,"-","-","-", 77,"-","-","-", 74,"-","-","-",  0,0,0,0, 82,"-","-","-", 77,"-","-","-", 74,"-",77,"-",
            0,0,0,0, 81,"-","-","-", 77,"-","-","-", 72,"-","-","-",  76,"-","-","-", 79,"-","-","-", 76,"-","-","-", 0,0,0,0],
      kick:bar("x... .... .... ...."), snare:bar(".... .... .... ...."), hat:bar(".x.x .x.x .x.x .x.x"), arpVol:.022
    },
    kirmes: { // Level 05: Rummel, Dur, Humtata
      bpm:132, chords:[[60,"M"],[57,"m"],[53,"M"],[55,"7"]],
      arp:[4,2,0,2,5,2,1,2,4,2,0,2,6,4,2,4],
      bass:bar("0... 7... 0... 7..."),
      lead:[79,"-",76,"-", 79,"-",76,"-", 81,"-",79,"-", 76,"-",72,"-",  76,"-",72,"-", 76,"-",72,"-", 77,"-",76,"-", 72,"-",69,"-",
            72,"-",77,"-", 81,"-",77,"-", 72,"-",77,"-", 81,"-",84,"-",  83,"-",79,"-", 77,"-",74,"-", 79,"-","-","-", 0,0,0,0],
      kick:bar("x... x... x... x..."), snare:bar("..x. ..x. ..x. ..xx"), hat:bar("x.x. x.x. x.x. x.x."), arpVol:.017
    },
    bau: { // Level 06: Presslufthammer-Groove in e-Moll
      bpm:122, chords:[[52,"m"],[48,"M"],[50,"M"],[47,"M"]],
      arp:[0,2,4,2,0,2,4,6,1,3,5,3,1,3,5,7],
      bass:bar("0.0. 0.0. 0.0. 0.7."),
      lead:[76,"-","-","-", 0,0,79,"-", 76,"-",74,"-", 71,"-","-","-",  72,"-","-","-", 0,0,76,"-", 79,"-",76,"-", 72,"-","-","-",
            74,"-","-","-", 0,0,78,"-", 81,"-",78,"-", 74,"-","-","-",  75,"-","-","-", 78,"-","-","-", 83,"-","-","-", 0,0,0,0],
      kick:bar("x..x ..x. x..x ..x."), snare:bar(".... x... .... x..."), hat:bar("x.x. x.x. x.x. x.x."), arpVol:.019
    },
    boss: { // Finale: der große Bär
      bpm:152, chords:[[52,"m"],[53,"M"],[52,"m"],[51,"d"]],
      arp:[0,4,1,4,2,4,1,4,0,4,1,4,2,5,3,6],
      bass:bar("0000 0000 0000 0000"),
      lead:[76,"-",0,76, 0,76,79,"-", 76,"-",0,76, 0,76,82,"-",  77,"-",0,77, 0,77,81,"-", 84,"-",81,"-", 77,"-","-","-",
            76,"-",0,76, 0,76,79,"-", 83,"-",79,"-", 76,"-","-","-",  75,"-",78,"-", 81,"-",78,"-", 75,"-",72,"-", 69,"-","-","-"],
      kick:bar("x.x. x.x. x.x. x.x."), snare:bar(".... x... .... x.xx"), hat:bar("xxxx xxxx xxxx xxxx"), arpVol:.018
    },
    weinberge: { // Level 07: sonnig-schläfrig, F-Dur, wiegend
      bpm:100, chords:[[53,"M"],[50,"m"],[58,"M"],[48,"M"]],
      arp:[0,2,4,2,1,2,4,2,0,2,4,6,4,2,1,2],
      bass:bar("0... ..7. 0... ..7."),
      lead:[72,"-","-","-", 77,"-",76,"-", 74,"-",72,"-", 69,"-","-","-",  74,"-","-","-", 77,"-",81,"-", 79,"-",77,"-", 74,"-","-","-",
            70,"-","-","-", 74,"-",77,"-", 82,"-",81,"-", 79,"-",77,"-",  76,"-","-","-", 79,"-","-","-", 72,"-","-","-", 0,0,0,0],
      kick:bar("x... .... x... ...."), snare:bar(".... .... .... x..."), hat:bar("..x. ..x. ..x. ..x."), arpVol:.019
    },
    kneipe: { // Level 08: Polka aus der Musikbox
      bpm:140, chords:[[55,"M"],[50,"7"],[55,"M"],[50,"7"]],
      arp:[4,2,4,2,4,2,5,3,4,2,4,2,6,4,2,0],
      bass:bar("0... 7... 0... 7..."),
      lead:[79,"-",83,"-", 86,"-",83,"-", 79,"-","-","-", 74,"-","-","-",  78,"-",81,"-", 84,"-",81,"-", 78,"-","-","-", 74,"-","-","-",
            79,"-",83,"-", 86,"-",88,"-", 86,"-",83,"-", 79,"-",76,"-",  78,"-",74,"-", 72,"-",78,"-", 79,"-","-","-", 0,0,0,0],
      kick:bar("x... x... x... x..."), snare:bar("..x. ..x. ..x. ..x."), hat:bar(".... .... .... ...x"), arpVol:.015
    },
    burg: { // Level 09: heroisch, g-Moll, Trommeln auf den Zinnen
      bpm:112, chords:[[55,"m"],[51,"M"],[53,"M"],[50,"M"]],
      arp:[0,1,2,4,2,1,0,1,0,1,2,4,5,4,2,1],
      bass:bar("0.0. ..0. 0.0. ..7."),
      lead:[79,"-","-","-", 79,"-",82,"-", 86,"-","-","-", 84,"-",82,"-",  79,"-","-","-", 75,"-",79,"-", 82,"-","-","-", 0,0,0,0,
            77,"-","-","-", 81,"-",84,"-", 89,"-","-","-", 86,"-",84,"-",  86,"-","-","-", 81,"-",78,"-", 74,"-","-","-", 0,0,0,0],
      kick:bar("x... x.x. x... x.x."), snare:bar(".... x... .... x.xx"), hat:bar("x.x. x.x. x.x. x.x."), arpVol:.018
    },
    server: { // Level 10/12: Lüfterbrummen und Blinkenlights, schnelle Arps
      bpm:128, chords:[[45,"m"],[45,"m"],[41,"M"],[43,"M"]],
      arp:[0,4,1,5,2,6,3,7,0,4,1,5,2,6,3,7],
      bass:bar("0.00 0.00 0.00 0.0."),
      lead:[0,0,0,0, 69,"-",72,"-", 76,"-",74,"-", 72,"-","-","-",  0,0,0,0, 69,"-",72,"-", 79,"-",76,"-", 74,"-","-","-",
            0,0,0,0, 65,"-",69,"-", 72,"-",74,"-", 76,"-","-","-",  0,0,0,0, 67,"-",71,"-", 74,"-",71,"-", 67,"-","-","-"],
      kick:bar("x... x... x... x..."), snare:bar(".... x... .... x..."), hat:bar(".x.x .x.x .x.x .x.x"), arpVol:.016
    },
    kuehl: { // Level 11: kalter Gang, viel Luft
      bpm:96, chords:[[52,"m"],[48,"M"],[55,"M"],[50,"M"]],
      arp:[0,2,4,6,7,6,4,2,0,2,4,6,7,6,4,2],
      bass:bar("0... .... .... 7..."),
      lead:[0,0,0,0, 83,"-","-","-", 0,0,0,0, 79,"-","-","-",  0,0,0,0, 84,"-","-","-", 0,0,0,0, 79,"-","-","-",
            0,0,0,0, 86,"-","-","-", 0,0,0,0, 83,"-","-","-",  81,"-","-","-", 78,"-","-","-", 74,"-","-","-", 0,0,0,0],
      kick:bar("x... .... .... ...."), snare:bar(".... .... .... ...."), hat:bar("..x. ..x. ..x. ..x."), arpVol:.021
    },
    drache: { // Finale Kapitel 4: Warteschleifenmusik, die eskaliert
      bpm:160, chords:[[50,"m"],[46,"M"],[48,"M"],[49,"d"]],
      arp:[0,4,2,4,1,4,2,4,0,4,2,4,3,5,6,7],
      bass:bar("0000 0000 0000 0000"),
      lead:[74,"-",77,"-", 81,"-",77,"-", 74,"-",77,"-", 82,"-",81,"-",  77,"-",74,"-", 70,"-",74,"-", 77,"-","-","-", 0,0,0,0,
            72,"-",76,"-", 79,"-",76,"-", 72,"-",76,"-", 84,"-",82,"-",  81,"-",79,"-", 77,"-",76,"-", 73,"-","-","-", 0,0,0,0],
      kick:bar("x.x. x.x. x.x. x.x."), snare:bar(".... x... .... x.xx"), hat:bar("xxxx xxxx xxxx xxxx"), arpVol:.017
    },
    rauschen: { // Bonuslevel: Berlin School, langsam, ohne Schlagzeug
      bpm:74, chords:[[45,"m"],[41,"M"],[48,"M"],[43,"M"]],
      arp:[0,1,2,3,4,5,6,7,6,5,4,3,2,1,2,3],
      bass:bar("0... .... .... ...."),
      lead:[0,0,0,0, 0,0,0,0, 76,"-","-","-", "-","-","-","-",  0,0,0,0, 0,0,0,0, 72,"-","-","-", "-","-","-","-",
            0,0,0,0, 0,0,0,0, 79,"-","-","-", "-","-","-","-",  0,0,0,0, 0,0,0,0, 74,"-","-","-", 71,"-","-","-"],
      kick:bar("................"), snare:bar("................"), hat:bar("................"), arpVol:.024, soft:true
    }
  };

  let ac = null, out = null, noise = null, timer = null;
  let current = null, step = 0, nextTime = 0, enabled = true, paused = false, sid = false;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  function init(audioCtx){
    if (ac || !audioCtx) return;
    ac = audioCtx; out = ac.createGain(); out.gain.value = .9; out.connect(ac.destination);
    noise = ac.createBuffer(1, ac.sampleRate * .5, ac.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function voice(type, freq, t, dur, vol, slideTo, vib){
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 6.5; lg.gain.value = freq * .012; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur + .02); }
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + .02);
  }
  function hiss(t, dur, vol, cutoff){
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; f.type = "highpass"; f.frequency.value = cutoff;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + dur + .02);
  }
  function play(t, tr, i){
    const s16 = 60 / tr.bpm / 4, b = Math.floor(i / 16) % 4, s = i % 16;
    const [root, q] = tr.chords[b], tones = Q[q];
    const ai = tr.arp[s], arpNote = root + tones[ai % 4] + (ai >= 4 ? 12 : 0);
    if (tr.soft) voice(sid ? "sawtooth" : "triangle", hz(arpNote + 12), t, s16 * 2.4, tr.arpVol * 2.2);
    else voice(sid ? "sawtooth" : "square", hz(arpNote), t, s16 * .9, tr.arpVol * (sid ? .8 : 1));
    const bs = tr.bass[s]; if (bs !== ".") voice("triangle", hz(root - 12 + Number(bs)), t, s16 * 1.8, .11);
    const li = i % 64, ln = tr.lead[li];
    if (ln && ln !== "-") { let len = 1; while (tr.lead[(li + len) % 64] === "-" && len < 16) len++; voice("square", hz(ln), t, s16 * len * .95, .028, 0, sid); voice(sid ? "sawtooth" : "triangle", hz(ln), t, s16 * len * .95, .03); }
    if (tr.kick[s] === "x") voice("sine", 150, t, .14, .32, 42);
    if (tr.snare[s] === "x") { hiss(t, .13, .12, 1200); voice("triangle", 190, t, .06, .07, 120); }
    if (tr.hat[s] === "x") hiss(t, .035, .045, 7000);
  }
  function tick(){
    if (!ac || !current || !enabled || paused) return;
    const tr = tracks[current];
    if (nextTime < ac.currentTime) nextTime = ac.currentTime + .05;
    while (nextTime < ac.currentTime + .15) { play(nextTime, tr, step); nextTime += 60 / tr.bpm / 4; step++; }
  }
  return {
    tracks, init,
    play(name){
      if (!tracks[name] || current === name) return;
      current = name; step = 0; if (ac) nextTime = ac.currentTime + .06;
      if (!timer) timer = setInterval(tick, 25);
    },
    stop(){ current = null; },
    pause(v){ paused = v; if (!v && ac) nextTime = ac.currentTime + .05; },
    setEnabled(v){ enabled = v; if (v && ac) nextTime = ac.currentTime + .05; },
    setSid(v){ sid = v; },
    get enabled(){ return enabled; },
    get current(){ return current; }
  };
})();
