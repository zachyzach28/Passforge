'use strict';

/* ── CHARACTER SETS ─────────────────────────── */
const LOWER   = 'abcdefghijklmnopqrstuvwxyz';
const UPPER   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS  = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';
const AMBIG   = new Set([...'O0lI1']);
const COMMON  = new Set([
  'password','123456','12345678','qwerty','abc123','111111',
  'letmein','iloveyou','admin','welcome','monkey','dragon',
  'pass','master','login','hello','sunshine','princess'
]);

/* ── STATE ──────────────────────────────────── */
const state = {
  length: 16,
  numbers: true,
  symbols: true,
  mixed: true,
  noAmbig: false,
  type: 'random'
};
let hasGenerated = false;

/* ── HELPERS ────────────────────────────────── */
const $ = id => document.getElementById(id);

function secureRand(max) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % max;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = secureRand(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ── THEME ──────────────────────────────────── */
let dark = false;
$('theme-btn').addEventListener('click', () => {
  dark = !dark;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  $('theme-btn').textContent = dark ? '☀️' : '🌙';
});

/* ── MAIN TAB NAVIGATION ────────────────────── */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $('panel-' + btn.dataset.panel).classList.add('active');
  });
});

/* ── PASSWORD TYPE TABS ─────────────────────── */
document.querySelectorAll('.type-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.type-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.type = tab.dataset.type;
    const pin = state.type === 'pin';
    ['tog-numbers', 'tog-symbols', 'tog-mixed', 'tog-ambiguous']
      .forEach(id => $(id).classList.toggle('disabled', pin));
    $('strength-row').style.display = pin ? 'none' : 'flex';
    if (hasGenerated) generate();
  });
});

/* ── TOGGLES ────────────────────────────────── */
[
  ['tog-numbers',   'tog-numbers-knob',   'numbers'],
  ['tog-symbols',   'tog-symbols-knob',   'symbols'],
  ['tog-mixed',     'tog-mixed-knob',     'mixed'],
  ['tog-ambiguous', 'tog-ambiguous-knob', 'noAmbig'],
].forEach(([wrapId, knobId, key]) => {
  $(wrapId).addEventListener('click', () => {
    state[key] = !state[key];
    $(knobId).classList.toggle('on', state[key]);
    if (hasGenerated) generate();
  });
});

/* ── LENGTH SLIDER ──────────────────────────── */
$('len-slider').addEventListener('input', function () {
  state.length = +this.value;
  $('len-val').textContent = state.length;
  this.style.setProperty('--pct', ((state.length - 8) / 24 * 100).toFixed(1) + '%');
  if (hasGenerated) generate();
});
$('len-slider').style.setProperty('--pct', ((16 - 8) / 24 * 100).toFixed(1) + '%');

/* ── PASSWORD GENERATION ────────────────────── */
function generateRandom() {
  let pool = LOWER;
  if (state.mixed)   pool += UPPER;
  if (state.numbers) pool += DIGITS;
  if (state.symbols) pool += SYMBOLS;
  if (state.noAmbig) pool = [...pool].filter(c => !AMBIG.has(c)).join('');
  if (!pool) pool = LOWER;

  // Guarantee at least one character from each enabled class
  const req = [];
  if (state.mixed)   req.push(UPPER[secureRand(UPPER.length)]);
  if (state.numbers) req.push(DIGITS[secureRand(DIGITS.length)]);
  if (state.symbols) req.push(SYMBOLS[secureRand(SYMBOLS.length)]);

  const chars = [...req];
  for (let i = 0; i < state.length - req.length; i++) {
    chars.push(pool[secureRand(pool.length)]);
  }
  return shuffle(chars).join('');
}

function generatePIN() {
  return Array.from({ length: state.length }, () => secureRand(10)).join('');
}

function generate() {
  const pw = state.type === 'pin' ? generatePIN() : generateRandom();
  const el = $('pw-output');
  el.textContent = pw;
  el.classList.add('has-pw');
  applyStrength($('strength-fill'), $('strength-badge'), scorePassword(pw));
  $('copy-btn').classList.remove('copied');
  $('copy-btn').textContent = '⎘';
}

/* ── STRENGTH SCORING ───────────────────────── */
function scorePassword(pw) {
  if (!pw || pw.length < 2) return 0;
  let s = 0;
  if (pw.length >= 8)  s++;
  if (pw.length >= 12) s++;
  if (pw.length >= 16) s++;
  if (pw.length >= 20) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s += 2;
  if (COMMON.has(pw.toLowerCase())) s = 0;
  if (/(.)\1{2,}/.test(pw)) s--;
  if (/^(abc|123|qwerty|pass)/i.test(pw)) s -= 2;
  return Math.min(4, Math.max(0, Math.round(s / 2.5)));
}

const STRENGTH_DATA = [
  { label: 'Weak',        fill: 'fill-1', badge: 'str-1', pct: 20  },
  { label: 'Fair',        fill: 'fill-2', badge: 'str-2', pct: 48  },
  { label: 'Strong',      fill: 'fill-3', badge: 'str-3', pct: 74  },
  { label: 'Very Strong', fill: 'fill-4', badge: 'str-4', pct: 100 },
];

function applyStrength(fill, badge, score) {
  fill.className  = 'strength-fill';
  badge.className = 'strength-badge';
  if (!score) {
    fill.style.width = '4%';
    fill.classList.add('str-0');
    badge.classList.add('str-0');
    badge.textContent = '—';
    return;
  }
  const d = STRENGTH_DATA[score - 1];
  fill.style.width = d.pct + '%';
  fill.classList.add(d.fill);
  badge.classList.add(d.badge);
  badge.textContent = d.label;
}

/* ── COPY BUTTON ────────────────────────────── */
$('copy-btn').addEventListener('click', () => {
  const pw = $('pw-output').textContent.trim();
  if (!pw || pw === 'Click generate to create a password') return;
  navigator.clipboard.writeText(pw).then(() => {
    $('copy-btn').textContent = '✓';
    $('copy-btn').classList.add('copied');
    const t = $('toast');
    t.classList.add('show');
    setTimeout(() => {
      $('copy-btn').textContent = '⎘';
      $('copy-btn').classList.remove('copied');
      t.classList.remove('show');
    }, 2200);
  });
});

$('gen-btn').addEventListener('click', () => { hasGenerated = true; generate(); });

/* ── EYE TOGGLE (CHECKER) ───────────────────── */
const eyeBtn = $('eye-btn');
let pwVisible = false;
eyeBtn.addEventListener('click', () => {
  pwVisible = !pwVisible;
  $('checker-input').type = pwVisible ? 'text' : 'password';
  eyeBtn.textContent = pwVisible ? '🙈' : '👁';
  eyeBtn.style.borderColor = pwVisible ? 'var(--accent)' : '';
  eyeBtn.style.color       = pwVisible ? 'var(--accent)' : '';
  eyeBtn.style.background  = pwVisible ? 'var(--accent-light)' : '';
});

/* ── CHECKER ────────────────────────────────── */
function calcEntropy(pw) {
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 32;
  return pool ? Math.round(pw.length * Math.log2(pool)) : 0;
}

function crackTime(entropy) {
  const s = Math.pow(2, entropy) / 1e10;
  if (s < 1)           return { t: 'Instant',          c: 'crack-instant' };
  if (s < 60)          return { t: `${~~s}s`,           c: 'crack-instant' };
  if (s < 3600)        return { t: `${~~(s/60)} min`,   c: 'crack-easy'    };
  if (s < 86400)       return { t: `${~~(s/3600)} hrs`, c: 'crack-easy'    };
  if (s < 2592000)     return { t: `${~~(s/86400)} days`,   c: 'crack-hard' };
  if (s < 31536000)    return { t: `${~~(s/2592000)} mo`,   c: 'crack-hard' };
  if (s < 3153600000)  return { t: `${~~(s/31536000)} yrs`, c: 'crack-safe' };
  return { t: 'Centuries', c: 'crack-safe' };
}

function getSuggestions(pw) {
  const tips = [];
  if (!pw) return tips;
  if (COMMON.has(pw.toLowerCase()))   tips.push({ text: 'Very common password — change it!', type: 'bad'  });
  if (pw.length < 12)                 tips.push({ text: 'Increase length to 12+ characters', type: 'warn' });
  if (!/[A-Z]/.test(pw))             tips.push({ text: 'Add uppercase letters',              type: 'warn' });
  if (!/[a-z]/.test(pw))             tips.push({ text: 'Add lowercase letters',              type: 'warn' });
  if (!/[0-9]/.test(pw))             tips.push({ text: 'Add numbers',                        type: 'warn' });
  if (!/[^a-zA-Z0-9]/.test(pw))      tips.push({ text: 'Add special characters',             type: 'warn' });
  if (/(.)\1{2,}/.test(pw))          tips.push({ text: 'Avoid repeated characters',          type: 'warn' });
  if (pw.length >= 12)                tips.push({ text: 'Good length ✓',                      type: 'ok'   });
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) tips.push({ text: 'Mixed case ✓',               type: 'ok'   });
  if (/[0-9]/.test(pw))              tips.push({ text: 'Has numbers ✓',                      type: 'ok'   });
  if (/[^a-zA-Z0-9]/.test(pw))       tips.push({ text: 'Has symbols ✓',                      type: 'ok'   });
  return tips;
}

const STRENGTH_LABELS = ['—', 'Weak', 'Fair', 'Strong', 'Very Strong'];

$('checker-input').addEventListener('input', function () {
  const pw = this.value;
  const chkFill  = $('chk-fill');
  const chkBadge = $('chk-badge');

  if (!pw) {
    ['chk-strength-val', 'chk-crack-val', 'chk-entropy-val', 'chk-len-val']
      .forEach(id => $(id).textContent = '—');
    $('chk-crack-val').className = 'stat-val';
    chkFill.style.width = '0%';
    chkBadge.className  = 'strength-badge str-0';
    chkBadge.textContent = '—';
    $('suggestions-wrap').innerHTML =
      '<span class="chip chip-warn">Enter a password above to analyze it</span>';
    return;
  }

  const score   = scorePassword(pw);
  const entropy = calcEntropy(pw);
  const crack   = crackTime(entropy);

  $('chk-strength-val').textContent = STRENGTH_LABELS[score] || '—';

  const crackEl = $('chk-crack-val');
  crackEl.textContent = crack.t;
  crackEl.className   = 'stat-val ' + crack.c;

  $('chk-entropy-val').textContent = entropy + ' bits';
  $('chk-len-val').textContent     = pw.length;

  applyStrength(chkFill, chkBadge, score);

  const tips = getSuggestions(pw);
  $('suggestions-wrap').innerHTML = tips.length
    ? tips.map((tip, i) =>
        `<span class="chip chip-${tip.type}" style="animation-delay:${i * .04}s">${tip.text}</span>`
      ).join('')
    : '<span class="chip chip-ok">Looks good!</span>';
});

/* ── INIT ───────────────────────────────────── */
// Password is generated only when the user clicks the button
