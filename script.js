// ===== Casino HG - Tragamonedas realista =====
const SYMBOLS = ['seven', 'bar', 'bell', 'cherry', 'lemon', 'diamond'];
const WEIGHTS  = [4, 6, 10, 26, 30, 24];

function symbolMarkup(id) {
  switch (id) {
    case 'seven':
      return '<span class="sym-seven">7</span>';
    case 'bar':
      return '<span class="sym-bar">BAR</span>';
    case 'bell':
      return '<svg class="sym-svg" viewBox="0 0 64 64"><path d="M32 8c-2 0-4 1-5 3-6 2-10 8-10 16v10l-4 6h38l-4-6V27c0-8-4-14-10-16-1-2-3-3-5-3z" fill="#f5a623" stroke="#b8740a" stroke-width="2"/><circle cx="32" cy="52" r="4" fill="#f5a623" stroke="#b8740a" stroke-width="2"/></svg>';
    case 'cherry':
      return '<svg class="sym-svg" viewBox="0 0 64 64"><path d="M20 24c-6 0-10 5-10 11s4 11 10 11 10-5 10-11-4-11-10-11zm24 0c-6 0-10 5-10 11s4 11 10 11 10-5 10-11-4-11-10-11z" fill="#d32f2f" stroke="#8b1a1a" stroke-width="2"/><path d="M20 24c0-9 7-16 16-18M44 24c0-9-7-16-16-18" stroke="#2e7d32" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
    case 'lemon':
      return '<svg class="sym-svg" viewBox="0 0 64 64"><ellipse cx="32" cy="34" rx="15" ry="21" fill="#fdd835" stroke="#c9a20a" stroke-width="2"/><path d="M32 13v-6" stroke="#2e7d32" stroke-width="3" stroke-linecap="round"/><ellipse cx="38" cy="11" rx="5" ry="2.5" fill="#43a047"/></svg>';
    case 'diamond':
      return '<svg class="sym-svg" viewBox="0 0 64 64"><polygon points="32,6 58,26 46,58 18,58 6,26" fill="#00e5ff" stroke="#00838f" stroke-width="2"/><polygon points="32,6 46,26 32,26 18,26" fill="#80f7ff" opacity="0.7"/><line x1="6" y1="26" x2="58" y2="26" stroke="#00838f" stroke-width="1.5"/></svg>';
    default: return '';
  }
}

const PAYTABLE = [
  { ids: ['seven','seven','seven'], mult: 50, label: 'TRES 7' },
  { ids: ['diamond','diamond','diamond'], mult: 25, label: 'TRES DIAMANTES' },
  { ids: ['bar','bar','bar'], mult: 12, label: 'TRES BAR' },
  { ids: ['bell','bell','bell'], mult: 15, label: 'TRES CAMPANAS' },
  { ids: ['lemon','lemon','lemon'], mult: 8,  label: 'TRES LIMONES' },
  { ids: ['cherry','cherry','cherry'], mult: 5,  label: 'TRES CEREZAS' },
  { cherry2: true, mult: 2, label: 'DOS CEREZAS' },
];

// Migración desde claves antiguas (para no perder el saldo guardado)
(function migrateStorage() {
  const pairs = [
    ['casino_balance', 'casino_balance_v2'],
    ['casino_spins', 'casino_spins_v2'],
    ['casino_best', 'casino_best_v2'],
    ['casino_muted', 'casino_muted_v2'],
  ];
  pairs.forEach(([oldK, newK]) => {
    if (localStorage.getItem(newK) === null && localStorage.getItem(oldK) !== null) {
      localStorage.setItem(newK, localStorage.getItem(oldK));
    }
  });
})();

// Estado
const DEFAULT_BALANCE = 5000; // <- cambia este número para poner más saldo
const storedDefault = parseInt(localStorage.getItem('casino_default_balance_v2') || '0', 10);
let balance;
if (storedDefault !== DEFAULT_BALANCE) {
  balance = DEFAULT_BALANCE;
  localStorage.setItem('casino_balance_v2', String(balance));
  localStorage.setItem('casino_default_balance_v2', String(DEFAULT_BALANCE));
} else {
  balance = parseInt(localStorage.getItem('casino_balance_v2') || String(DEFAULT_BALANCE), 10);
}
let spins = parseInt(localStorage.getItem('casino_spins_v2') || '0', 10);
let bestWin = parseInt(localStorage.getItem('casino_best_v2') || '0', 10);
let lastWin = 0;
let spinning = false;
let muted = localStorage.getItem('casino_muted_v2') === '1';
let autoSpin = false;
let turbo = false;

const els = {
  balance: document.getElementById('balance'),
  bet: document.getElementById('bet'),
  spinBtn: document.getElementById('spinBtn'),
  maxBtn: document.getElementById('maxBtn'),
  marquee: document.getElementById('marquee'),
  lastWin: document.getElementById('lastWin'),
  spins: document.getElementById('spins'),
  bestWin: document.getElementById('bestWin'),
  frame: document.getElementById('reelsFrame'),
  strips: [0,1,2].map(i => document.getElementById('strip'+i)),
  mute: document.getElementById('muteBtn'),
  autoBtn: document.getElementById('autoBtn'),
  turboBtn: document.getElementById('turboBtn'),
  leverArm: document.getElementById('leverArm'),
  winOverlay: document.getElementById('winOverlay'),
  winOverlayText: document.getElementById('winOverlayText'),
  winOverlayAmount: document.getElementById('winOverlayAmount'),
  lightStrip: document.getElementById('lightStrip'),
  lightStrip2: document.getElementById('lightStrip2'),
  balanceTop: document.getElementById('balanceTop'),
  lastWinTop: document.getElementById('lastWinTop'),
  autoBtnTop: document.getElementById('autoBtnTop'),
  turboBtnTop: document.getElementById('turboBtnTop'),
  autoSpeed: document.getElementById('autoSpeed'),
};

function saveState() {
  localStorage.setItem('casino_balance_v2', balance);
  localStorage.setItem('casino_spins_v2', spins);
  localStorage.setItem('casino_best_v2', bestWin);
}

function renderStats() {
  els.balance.textContent = balance.toLocaleString();
  els.lastWin.textContent = lastWin.toLocaleString();
  els.spins.textContent = spins.toLocaleString();
  els.bestWin.textContent = bestWin.toLocaleString();
  if (els.balanceTop) els.balanceTop.textContent = balance.toLocaleString();
  if (els.lastWinTop) els.lastWinTop.textContent = lastWin.toLocaleString();
}

function weightedRandom() {
  const total = WEIGHTS.reduce((a,b)=>a+b,0);
  let r = Math.random() * total;
  for (let i=0;i<SYMBOLS.length;i++){ r -= WEIGHTS[i]; if (r <= 0) return SYMBOLS[i]; }
  return SYMBOLS[SYMBOLS.length-1];
}

function buildStrip(strip, finalSym, extra) {
  const n = turbo ? 12 : 26;
  const count = extra || n;
  strip.innerHTML = '';
  const cells = [];
  for (let i=0;i<count;i++) cells.push(weightedRandom());
  cells.push(weightedRandom()); // celda superior visible
  cells.push(finalSym);         // resultado (centro)
  cells.push(weightedRandom()); // celda inferior visible
  const frag = document.createDocumentFragment();
  cells.forEach(s => {
    const d = document.createElement('div');
    d.className = 'reel-cell';
    d.innerHTML = symbolMarkup(s);
    frag.appendChild(d);
  });
  strip.appendChild(frag);
  return cells.length;
}

function spinReel(index, finalSym, duration, delay) {
  return new Promise(resolve => {
    const strip = els.strips[index];
    const n = buildStrip(strip, finalSym);
    const cellH = (window.innerWidth <= 520) ? 108 : 132;
    const totalH = n * cellH;
    strip.style.transition = 'none';
    strip.style.transform = 'translateY(0px)';
    void strip.offsetHeight;
    strip.parentElement.classList.add('spinning');
    setTimeout(() => {
      strip.style.transition = 'transform ' + duration + 'ms cubic-bezier(0.12, 0.8, 0.2, 1.05)';
      strip.style.transform = 'translateY(-' + (totalH - 3 * cellH) + 'px)';
    }, delay);
    setTimeout(() => {
      strip.parentElement.classList.remove('spinning');
      strip.parentElement.classList.add('stopping');
      setTimeout(()=>strip.parentElement.classList.remove('stopping'), 280);
      resolve();
    }, delay + duration);
  });
}

function evaluate(result) {
  const [a,b,c] = result;
  if (a === b && b === c) {
    const entry = PAYTABLE.find(p => p.ids && p.ids[0]===a && p.ids[1]===b && p.ids[2]===c);
    if (entry) return { win: true, mult: entry.mult, label: entry.label };
  }
  const cherries = result.filter(s => s === 'cherry').length;
  if (cherries === 2) {
    const entry = PAYTABLE.find(p => p.cherry2);
    return { win: true, mult: entry.mult, label: 'DOS CEREZAS' };
  }
  return { win: false, mult: 0, label: 'Sin premio' };
}

// ===== Audio engine =====
let audioCtx = null;
function getAudioCtx() {
  if (muted) return null;
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { return null; }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function makeNoiseBuffer(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1);
  return buf;
}

let sharedNoiseBuffer = null;
let clickNoiseBuffer = null;
function getNoiseBuffer(ctx) {
  if (!sharedNoiseBuffer || sharedNoiseBuffer.sampleRate !== ctx.sampleRate) {
    sharedNoiseBuffer = makeNoiseBuffer(ctx, 2);
  }
  return sharedNoiseBuffer;
}
function getClickNoiseBuffer(ctx) {
  if (!clickNoiseBuffer || clickNoiseBuffer.sampleRate !== ctx.sampleRate) {
    clickNoiseBuffer = makeNoiseBuffer(ctx, 0.05);
  }
  return clickNoiseBuffer;
}

let spinClickTimer = null;

function startSpinSound(totalMs) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const dur = totalMs / 1000;

  // Motor grave
  const motor1 = ctx.createOscillator();
  motor1.type = 'sine'; motor1.frequency.value = 55;
  const motor2 = ctx.createOscillator();
  motor2.type = 'sine'; motor2.frequency.value = 110;
  const motorGain = ctx.createGain();
  motorGain.gain.setValueAtTime(0.001, now);
  motorGain.gain.exponentialRampToValueAtTime(0.12, now + 0.15);
  motorGain.gain.setValueAtTime(0.12, now + dur - 0.4);
  motorGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  motor1.connect(motorGain); motor2.connect(motorGain);
  motorGain.connect(ctx.destination);
  motor1.start(now); motor2.start(now);
  motor1.stop(now + dur + 0.1); motor2.stop(now + dur + 0.1);

  // Ruido de traqueteo
  const noiseBuf = getNoiseBuffer(ctx);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf; noise.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 2;
  const lfo = ctx.createOscillator();
  lfo.type = 'square'; lfo.frequency.value = 22;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 600;
  lfo.connect(lfoGain).connect(bp.frequency);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.18, now + 0.12);
  noiseGain.gain.setValueAtTime(0.18, now + dur - 0.35);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  noise.connect(bp).connect(noiseGain).connect(ctx.destination);
  noise.start(now); lfo.start(now);
  noise.stop(now + dur + 0.1); lfo.stop(now + dur + 0.1);

  // Clicks periodicos
  const interval = turbo ? 70 : 110;
  let clicks = 0;
  const maxClicks = Math.floor(dur * 1000 / interval);
  spinClickTimer = setInterval(() => {
    clicks++;
    if (clicks > maxClicks) { clearInterval(spinClickTimer); spinClickTimer = null; return; }
    playClick(0.07, 1800 + Math.random()*1200);
  }, interval);
}

function stopSpinSound() {
  if (spinClickTimer) { clearInterval(spinClickTimer); spinClickTimer = null; }
}

function playClick(vol, freq) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const buf = getClickNoiseBuffer(ctx);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = freq || 2500;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  src.connect(hp).connect(gain).connect(ctx.destination);
  src.start(now);
  src.stop(now + 0.04);
}

function playThunk() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.24);
  playClick(0.2, 3000);
}

function playLever() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(500, now);
  osc.frequency.exponentialRampToValueAtTime(100, now + 0.22);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.27);
  // clunk
  setTimeout(() => {
    const c = getAudioCtx();
    if (!c) return;
    const n = c.currentTime;
    const o = c.createOscillator();
    o.type = 'square'; o.frequency.value = 80;
    const g = c.createGain();
    g.gain.setValueAtTime(0.25, n);
    g.gain.exponentialRampToValueAtTime(0.001, n + 0.12);
    o.connect(g).connect(c.destination);
    o.start(n); o.stop(n + 0.14);
  }, 180);
}

function playWinSound(big) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const base = big ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [523.25, 659.25, 783.99];
  base.forEach((f, i) => {
    const now = ctx.currentTime + i * 0.12;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
  });
  // acorde final
  setTimeout(() => {
    const c = getAudioCtx();
    if (!c) return;
    const n = c.currentTime;
    [523.25, 659.25, 783.99].forEach(f => {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = c.createGain();
      g.gain.setValueAtTime(0.1, n);
      g.gain.exponentialRampToValueAtTime(0.001, n + 0.7);
      o.connect(g).connect(c.destination);
      o.start(n); o.stop(n + 0.75);
    });
  }, big ? 650 : 400);
  // monedas
  if (big) {
    for (let i=0;i<6;i++) {
      setTimeout(() => playClick(0.12, 4000 + Math.random()*2000), 700 + i*120);
    }
  }
}

function playLoseSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.5);
}

// ===== Luces marquesina =====
function buildLights(container, count) {
  container.innerHTML = '';
  for (let i=0;i<count;i++) {
    const b = document.createElement('div');
    b.className = 'bulb';
    container.appendChild(b);
  }
}
let lightTimer = null;
function animateLights() {
  if (lightTimer) { clearInterval(lightTimer); lightTimer = null; }
  const bulbs = els.lightStrip.querySelectorAll('.bulb');
  const bulbs2 = els.lightStrip2.querySelectorAll('.bulb');
  if (spinning) {
    lightTimer = setInterval(() => {
      const t = Date.now();
      bulbs.forEach((b, i) => { b.className = 'bulb ' + (Math.sin(t/120 + i) > 0 ? 'on-pink' : ''); });
      bulbs2.forEach((b, i) => { b.className = 'bulb ' + (Math.sin(t/120 + i + 3) > 0 ? 'on-gold' : ''); });
    }, 130);
  } else {
    bulbs.forEach((b, i) => { b.className = 'bulb ' + (i % 2 === 0 ? 'on-pink' : ''); });
    bulbs2.forEach((b, i) => { b.className = 'bulb ' + (i % 2 === 0 ? 'on-gold' : ''); });
  }
}

// ===== Win overlay =====
function showWinOverlay(text, amount, duration) {
  els.winOverlayText.textContent = text;
  els.winOverlayAmount.textContent = amount.toLocaleString();
  els.winOverlay.classList.add('show');
  setTimeout(() => els.winOverlay.classList.remove('show'), duration);
}

function coinRain() {
  for (let i = 0; i < 40; i++) {
    const c = document.createElement('div');
    c.className = 'coin';
    c.textContent = '\u25CF';
    c.style.left = (Math.random() * 100) + 'vw';
    c.style.animationDelay = (Math.random() * 0.6) + 's';
    c.style.animationDuration = (1.4 + Math.random() * 1.2) + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3000);
  }
}

function countUp(el, from, to, duration) {
  const start = performance.now();
  function step(now) {
    const p = Math.min(1, (now - start) / duration);
    const val = Math.floor(from + (to - from) * (1 - Math.pow(1-p, 3)));
    el.textContent = val.toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ===== Spin =====
async function spin() {
  if (spinning) return;
  let bet = parseInt(els.bet.value, 10);
  if (isNaN(bet) || bet < 500) { bet = 500; els.bet.value = 500; }
  if (bet > balance) {
    setMarquee('SALDO INSUFICIENTE', 'lose');
    els.frame.classList.add('shake');
    setTimeout(()=>els.frame.classList.remove('shake'), 300);
    return;
  }
  spinning = true;
  els.spinBtn.disabled = true;
  els.leverArm.classList.add('pulled');
  balance -= bet;
  spins++;
  renderStats();
  saveState();
  setMarquee('GIRANDO...', '');
  animateLights();

  playLever();
  const totalSpinMs = turbo ? 900 : 2480;
  const reelDurations = turbo ? [600, 720, 840] : [1500, 1850, 2200];
  const reelDelays = turbo ? [0, 80, 160] : [0, 140, 280];
  startSpinSound(totalSpinMs);
  // thunks programados
  setTimeout(playThunk, reelDelays[0] + reelDurations[0]);
  setTimeout(playThunk, reelDelays[1] + reelDurations[1]);
  setTimeout(playThunk, reelDelays[2] + reelDurations[2]);

  const result = [weightedRandom(), weightedRandom(), weightedRandom()];

  await Promise.all([
    spinReel(0, result[0], reelDurations[0], reelDelays[0]),
    spinReel(1, result[1], reelDurations[1], reelDelays[1]),
    spinReel(2, result[2], reelDurations[2], reelDelays[2]),
  ]);

  stopSpinSound();
  els.leverArm.classList.remove('pulled');
  animateLights();

  const outcome = evaluate(result);
  if (outcome.win) {
    const winAmt = bet * outcome.mult;
    balance += winAmt;
    lastWin = winAmt;
    if (winAmt > bestWin) bestWin = winAmt;
    const big = outcome.mult >= 10;
    setMarquee('GANASTE ' + winAmt + ' - ' + outcome.label, 'win');
    els.frame.classList.add('win');
    setTimeout(()=>els.frame.classList.remove('win'), 2000);
    playWinSound(big);
    // count-up en ganancia
    countUp(els.lastWin, 0, winAmt, 900);
    if (big) {
      showWinOverlay(outcome.mult >= 25 ? 'MEGA WIN' : 'BIG WIN', winAmt, 2600);
      coinRain();
    }
  } else {
    lastWin = 0;
    setMarquee('SIN PREMIO - INTENTA DE NUEVO', 'lose');
    playLoseSound();
    els.lastWin.textContent = '0';
  }
  renderStats();
  saveState();
  spinning = false;
  els.spinBtn.disabled = false;

  if (autoSpin && balance >= bet) {
    const delays = { slow: 1700, medium: 1100, fast: 700 };
    const d = delays[(els.autoSpeed && els.autoSpeed.value) || 'medium'] || 1100;
    setTimeout(spin, d);
  }
}

function setMarquee(text, cls) {
  els.marquee.textContent = text;
  els.marquee.className = 'lcd' + (cls ? ' ' + cls : '');
}

function buildPaytable() {
  const grid = document.getElementById('paytable');
  const rows = [
    { html: symbolMarkup('seven')+' '+symbolMarkup('seven')+' '+symbolMarkup('seven'), mult: 50 },
    { html: symbolMarkup('diamond')+' '+symbolMarkup('diamond')+' '+symbolMarkup('diamond'), mult: 25 },
    { html: symbolMarkup('bar')+' '+symbolMarkup('bar')+' '+symbolMarkup('bar'), mult: 12 },
    { html: symbolMarkup('bell')+' '+symbolMarkup('bell')+' '+symbolMarkup('bell'), mult: 15 },
    { html: symbolMarkup('lemon')+' '+symbolMarkup('lemon')+' '+symbolMarkup('lemon'), mult: 8 },
    { html: symbolMarkup('cherry')+' '+symbolMarkup('cherry')+' '+symbolMarkup('cherry'), mult: 5 },
    { html: symbolMarkup('cherry')+' '+symbolMarkup('cherry')+' (dos)', mult: 2 },
  ];
  rows.forEach(r => {
    const div = document.createElement('div');
    div.className = 'pay-row';
    div.innerHTML = '<span class="pay-syms">' + r.html + '</span><span class="pay-mult">x' + r.mult + '</span>';
    grid.appendChild(div);
  });
}

// Eventos
els.spinBtn.addEventListener('click', spin);
els.maxBtn.addEventListener('click', () => { els.bet.value = balance; });
const betDown = document.getElementById('betDown');
const betUp = document.getElementById('betUp');
if (betDown) betDown.addEventListener('click', () => {
  let v = parseInt(els.bet.value, 10) || 500;
  v = Math.max(500, v - 500);
  els.bet.value = v;
});
if (betUp) betUp.addEventListener('click', () => {
  let v = parseInt(els.bet.value, 10) || 500;
  v = Math.min(balance, v + 500);
  if (v < 500) v = 500;
  els.bet.value = v;
});
document.querySelectorAll('.quick-btn').forEach(b => {
  b.addEventListener('click', () => { els.bet.value = b.dataset.bet; });
});
els.autoBtnTop.addEventListener('click', () => els.autoBtn.click());
els.turboBtnTop.addEventListener('click', () => els.turboBtn.click());
els.mute.addEventListener('click', () => {
  muted = !muted;
  localStorage.setItem('casino_muted_v2', muted ? '1' : '0');
  if (!muted && audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  updateMuteUI();
});
els.autoBtn.addEventListener('click', () => {
  autoSpin = !autoSpin;
  const label = 'AUTO: ' + (autoSpin ? 'ON' : 'OFF');
  els.autoBtn.textContent = label;
  els.autoBtn.classList.toggle('active', autoSpin);
  if (els.autoBtnTop) { els.autoBtnTop.textContent = label; els.autoBtnTop.classList.toggle('active', autoSpin); }
  if (autoSpin && !spinning) spin();
});
els.turboBtn.addEventListener('click', () => {
  turbo = !turbo;
  const label = 'TURBO: ' + (turbo ? 'ON' : 'OFF');
  els.turboBtn.textContent = label;
  els.turboBtn.classList.toggle('active', turbo);
  if (els.turboBtnTop) { els.turboBtnTop.textContent = label; els.turboBtnTop.classList.toggle('active', turbo); }
});
els.bet.addEventListener('input', () => {
  let v = parseInt(els.bet.value, 10);
  if (isNaN(v) || v < 500) v = 500;
  if (v > balance) v = balance;
  els.bet.value = v;
});
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !spinning) { e.preventDefault(); spin(); }
});
// Palanca clic
els.leverArm.querySelector('.lever-knob').addEventListener('click', () => {
  if (!spinning) spin();
});

function updateMuteUI() {
  if (!els.mute) return;
  els.mute.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
  els.mute.classList.toggle('off', muted);
}

// Init
buildLights(els.lightStrip, 14);
buildLights(els.lightStrip2, 14);
// Reels iniciales con 3 frutas visibles
els.strips.forEach(strip => {
  strip.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (let i=0;i<3;i++) {
    const d = document.createElement('div');
    d.className = 'reel-cell';
    d.innerHTML = symbolMarkup(weightedRandom());
    frag.appendChild(d);
  }
  strip.appendChild(frag);
});
buildPaytable();
renderStats();
updateMuteUI();
animateLights();
setMarquee('BIENVENIDO - GIRA Y GANA', '');
