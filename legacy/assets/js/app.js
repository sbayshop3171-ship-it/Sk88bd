/* ============================================================
   TK420 demo — shared UI logic
   Every page includes this file. Shared chrome (drawer, bottom
   nav, footer, modals, FABs) is injected so pages stay small.
   ============================================================ */

const BRAND = { name: 'TK420', light: 'TK', accent: '420', tag: 'bet', currency: '৳' };

// Wordmark markup — light half + gold half, styled by .logo__mark in style.css
const WORDMARK = `<span class="logo__mark"><i class="tk">${BRAND.light}</i><i class="num">${BRAND.accent}</i></span>`;

const money = n => BRAND.currency + n.toLocaleString('en-IN');

/* ---------- icons ---------- */
const I = {
  menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h12M4 17h16"/></svg>',
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  gift:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7S11 3 8.5 3 6 7 12 7zM12 7s1-4 3.5-4S18 7 12 7z"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  medal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><circle cx="12" cy="15" r="6"/><path d="M8.2 9.6 6 2h12l-2.2 7.6M12 13l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2L9 15.2l2-.3z"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>',
  chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/></svg>',
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>',
  speaker:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 4V5L7 9zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4m-2.5-8v2a6.5 6.5 0 0 1 0 12v2a8.5 8.5 0 0 0 0-16"/></svg>'
};

/* ---------- game catalogue (demo data) ---------- */
const ART = ['a1','a2','a3','a4','a5','a6','a7','a8','a9'];
const G = (n, e, p, tag) => ({ n, e, p, tag });

const CATALOGUE = {
  hot: {
    label: 'HOT GAMES',
    games: [
      G('Aviator','✈️','Spribe','hot'), G('Crazy Time','🎡','Evolution','hot'),
      G('Gates of Olympus','⚡','Pragmatic','top'), G('Teen Patti','🃏','Ezugi'),
      G('Sweet Bonanza','🍭','Pragmatic','hot'), G('Dragon Tiger','🐉','Ezugi'),
      G('Andar Bahar','♠️','Evolution','new'), G('Mines','💣','Spribe'),
      G('Lightning Roulette','🎯','Evolution','top')
    ]
  },
  slots: {
    label: 'SLOTS',
    games: [
      G('Sweet Bonanza','🍬','Pragmatic','hot'), G('Book of Dead','📖','Play\'n GO'),
      G('Big Bass Bonanza','🎣','Pragmatic'), G('Starburst','💫','NetEnt','top'),
      G('Wild West Gold','🤠','Pragmatic'), G('Fruit Party','🍉','Pragmatic'),
      G('Money Train 3','🚂','Relax','new'), G('Gonzo Quest','🗿','NetEnt'),
      G('Sugar Rush','🧁','Pragmatic','hot')
    ]
  },
  live: {
    label: 'LIVE CASINO',
    games: [
      G('Lightning Roulette','🎯','Evolution','hot'), G('Crazy Time','🎡','Evolution','top'),
      G('Baccarat VIP','🀄','Ezugi'), G('Blackjack Party','♣️','Evolution'),
      G('Andar Bahar Live','♦️','Ezugi','hot'), G('Dragon Tiger','🐲','Ezugi'),
      G('Monopoly Live','🎩','Evolution'), G('Sic Bo','🎲','Ezugi'),
      G('Mega Wheel','🛞','Pragmatic','new')
    ]
  },
  poker: {
    label: 'POKER & CARDS',
    games: [
      G('Teen Patti 3D','🃏','Ezugi','hot'), G('Rummy','🂡','KingMaker'),
      G('Texas Hold\'em','♠️','Evolution'), G('Call Break','🂮','KingMaker','new'),
      G('7 Up 7 Down','🎴','Ezugi'), G('32 Cards','🗂️','Ezugi'),
      G('Casino Hold\'em','💼','Evolution'), G('Bola Tangkas','🎰','CQ9'),
      G('Poker Pro','🏆','JILI')
    ]
  },
  fish: {
    label: 'FISHING',
    games: [
      G('Jackpot Fishing','🐟','JILI','hot'), G('Dragon Fortune','🐡','Pragmatic'),
      G('Ocean King 3','🦈','CQ9','top'), G('Bombing Fishing','💥','JILI'),
      G('Royal Fishing','👑','JILI'), G('Mega Fishing','🎣','JILI','new'),
      G('Fish Hunter','🔱','CQ9'), G('Golden Toad','🐸','JDB'),
      G('Boom Legend','⚓','JILI')
    ]
  },
  lottery: {
    label: 'LOTTERY',
    games: [
      G('Bingo 5','🎱','JILI','hot'), G('Keno Live','🔢','Evolution'),
      G('Lotto Instant','🎟️','Betgames'), G('Number King','🔟','JDB'),
      G('Lucky Draw','🍀','KingMaker','new'), G('Color Game','🌈','JILI')
    ]
  }
};

const MATCHES = [
  { league:'BPL T20', live:true, a:'Dhaka Capitals', b:'Chattogram Kings', as:'142/4 (16.2)', bs:'—', o:['1.72','—','2.15'] },
  { league:'IPL', live:true, a:'Mumbai', b:'Chennai', as:'88/2 (10.4)', bs:'—', o:['1.95','—','1.88'] },
  { league:'Premier League', live:false, a:'Arsenal', b:'Liverpool', as:'', bs:'', o:['2.40','3.30','2.75'] },
  { league:'La Liga', live:false, a:'Barcelona', b:'Real Madrid', as:'', bs:'', o:['2.10','3.50','3.10'] }
];

const PROVIDERS = ['PRAGMATIC','EVOLUTION','JILI','EZUGI','PG SOFT','NETENT','SPRIBE','CQ9','JDB','HABANERO','BETGAMES','RELAX'];

/* ---------- render helpers ---------- */
function gameCard(g, i) {
  const tag = g.tag ? `<i class="tag tag--${g.tag}">${g.tag}</i>` : '';
  const rtp = (i % 4 === 0) ? `<i class="rtp">RTP ${(95 + (i % 5)).toFixed(1)}%</i>` : '';
  return `<a class="game" href="#" data-game="${g.n}">
    ${tag}
    <div class="game__art ${ART[i % ART.length]}"><span>${g.e}</span></div>
    ${rtp}
    <div class="game__meta">
      <div class="game__name">${g.n}</div>
      <div class="game__prov">${g.p}</div>
    </div>
  </a>`;
}

function section(key, { layout = 'grid' } = {}) {
  const c = CATALOGUE[key];
  const cards = c.games.map(gameCard).join('');
  const body = layout === 'rail'
    ? `<div class="scroll-x"><div class="rail">${cards}</div></div>`
    : `<div class="grid">${cards}</div>`;
  return `<section class="sec" id="sec-${key}">
    <div class="sec__hd">
      <h2 class="sec__title">${c.label}</h2>
      <a class="sec__more" href="#" data-toast="Full ${c.label} lobby — demo">See All ›</a>
    </div>
    ${body}
  </section>`;
}

function matchCard(m) {
  const status = m.live ? `<span class="match__live">LIVE</span>` : `<span>Today 21:00</span>`;
  return `<div class="match">
    <div class="match__top"><span>${m.league}</span>${status}</div>
    <div class="match__teams">
      <div class="match__team"><span>${m.a}</span><b>${m.as || '-'}</b></div>
      <div class="match__team"><span>${m.b}</span><b>${m.bs || '-'}</b></div>
    </div>
    <div class="odds">
      <button data-toast="Bet slip — demo only">1 <small>${m.o[0]}</small></button>
      <button data-toast="Bet slip — demo only">X <small>${m.o[1]}</small></button>
      <button data-toast="Bet slip — demo only">2 <small>${m.o[2]}</small></button>
    </div>
  </div>`;
}

/* ---------- shared chrome ---------- */
const NAV = [
  { href:'index.html',     key:'home',      icon:I.home,  label:'Home' },
  { href:'promotion.html', key:'promotion', icon:I.gift,  label:'Promotion' },
  { href:'invite.html',    key:'invite',    icon:I.users, label:'Invite', mid:true },
  { href:'reward.html',    key:'reward',    icon:I.medal, label:'Reward' },
  { href:'member.html',    key:'member',    icon:I.user,  label:'Member' }
];

function injectChrome() {
  const page = document.body.dataset.page || 'home';

  const nav = NAV.map(n => n.mid
    ? `<a class="mid ${n.key === page ? 'on' : ''}" href="${n.href}"><i class="bubble">${n.icon}</i><span>${n.label}</span></a>`
    : `<a class="${n.key === page ? 'on' : ''}" href="${n.href}">${n.icon}<span>${n.label}</span></a>`
  ).join('');

  const drawerLinks = (title, items) =>
    `<h4>${title}</h4><ul>${items.map(([e, t, h]) =>
      `<li><a href="${h || '#'}" ${h ? '' : `data-toast="${t} — demo"`}><i class="e">${e}</i>${t}</a></li>`).join('')}</ul>`;

  document.body.insertAdjacentHTML('beforeend', `
    <nav class="nav">${nav}</nav>

    <div class="fabs">
      <button class="fab fab--chat" data-toast="Live chat — demo">${I.chat}</button>
      <button class="fab fab--top" id="toTop">${I.up}</button>
    </div>

    <div class="scrim" id="scrim"></div>

    <aside class="drawer" id="drawer">
      <div class="drawer__hd">
        <div class="logo">${WORDMARK}<span class="logo__sub">${BRAND.tag}</span></div>
      </div>
      ${drawerLinks('GAME CENTER', [
        ['🔥','Hot Games','index.html#sec-hot'], ['🎰','Slots','index.html#sec-slots'],
        ['🎲','Live Casino','index.html#sec-live'], ['🃏','Poker','index.html#sec-poker'],
        ['🐟','Fishing','index.html#sec-fish'], ['🏏','Sports','index.html#sec-sports'],
        ['🎮','E-Sports',''], ['🎟️','Lottery','index.html#sec-lottery']
      ])}
      ${drawerLinks('MY ACCOUNT', [
        ['💰','Deposit',''], ['💸','Withdraw',''], ['📋','Betting Record',''],
        ['🎁','Reward Center','reward.html'], ['👑','VIP Club','reward.html'],
        ['👥','Invite Friends','invite.html']
      ])}
      ${drawerLinks('SUPPORT', [
        ['🎧','Customer Service',''], ['📱','App Download',''],
        ['🌐','Language',''], ['🛡️','Security Center',''], ['❓','Help Center','']
      ])}
    </aside>

    <div class="modal" id="authModal">
      <button class="modal__x" data-close>×</button>
      <h3 id="authTitle">Login</h3>
      <p id="authSub">Welcome back to ${BRAND.name}</p>
      <form id="authForm">
        <div class="field"><label>Phone / Username</label><input type="text" placeholder="01XXXXXXXXX" autocomplete="off"></div>
        <div class="field"><label>Password</label><input type="password" placeholder="••••••••" autocomplete="off"></div>
        <div class="field" id="refField" hidden><label>Referral code (optional)</label><input type="text" placeholder="TK420XX"></div>
        <button type="submit" class="btn btn--gold btn--block">Continue</button>
      </form>
      <div class="modal__alt" id="authAlt">No account yet? <b data-switch>Register free</b></div>
      <div class="demo-note">Demo preview — no real account, no real money.</div>
    </div>

    <div class="toast" id="toast"></div>
  `);

  // active-state highlight for the sticky header logo etc. (no-op hook)
  return page;
}

/* ---------- behaviour ---------- */
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 1800);
}

function openAuth(mode) {
  const m = document.getElementById('authModal');
  const isReg = mode === 'register';
  document.getElementById('authTitle').textContent = isReg ? 'Create account' : 'Login';
  document.getElementById('authSub').textContent = isReg
    ? `Register and claim your ${BRAND.currency}999 welcome bonus`
    : `Welcome back to ${BRAND.name}`;
  document.getElementById('refField').hidden = !isReg;
  document.getElementById('authAlt').innerHTML = isReg
    ? 'Already a member? <b data-switch>Login</b>'
    : 'No account yet? <b data-switch>Register free</b>';
  m.dataset.mode = mode;
  m.classList.add('on');
  document.getElementById('scrim').classList.add('on');
}
function closeOverlays() {
  document.getElementById('authModal').classList.remove('on');
  document.getElementById('drawer').classList.remove('on');
  document.getElementById('scrim').classList.remove('on');
}

function wireGlobal() {
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-toast],[data-auth],[data-drawer],[data-close],[data-switch],[data-game],#toTop,#scrim');
    if (!t) return;

    if (t.id === 'scrim' || t.hasAttribute('data-close')) { closeOverlays(); return; }
    if (t.id === 'toTop') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    if (t.hasAttribute('data-drawer')) {
      e.preventDefault();
      document.getElementById('drawer').classList.add('on');
      document.getElementById('scrim').classList.add('on');
      return;
    }
    if (t.hasAttribute('data-auth')) { e.preventDefault(); openAuth(t.dataset.auth); return; }
    if (t.hasAttribute('data-switch')) {
      const cur = document.getElementById('authModal').dataset.mode;
      openAuth(cur === 'register' ? 'login' : 'register');
      return;
    }
    if (t.hasAttribute('data-game')) { e.preventDefault(); toast(`${t.dataset.game} — demo build, game not connected`); return; }
    if (t.hasAttribute('data-toast')) { e.preventDefault(); toast(t.dataset.toast); }
  });

  const form = document.getElementById('authForm');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    closeOverlays();
    toast('Demo only — backend is not connected');
  });

  window.addEventListener('scroll', () => {
    document.getElementById('toTop').classList.toggle('show', window.scrollY > 400);
  }, { passive: true });

  const bar = document.querySelector('.appbar__close');
  if (bar) bar.addEventListener('click', () => document.querySelector('.appbar').classList.add('is-hidden'));
}

/* ---------- home-only widgets ---------- */
function carousel() {
  const track = document.querySelector('.carousel__track');
  if (!track) return;
  const dots = document.querySelector('.dots');
  const n = track.children.length;
  dots.innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('');
  let i = 0, timer;
  const go = k => {
    i = (k + n) % n;
    track.style.transform = `translateX(-${i * 100}%)`;
    [...dots.children].forEach((d, j) => d.classList.toggle('on', j === i));
  };
  const play = () => { timer = setInterval(() => go(i + 1), 4000); };
  const stop = () => clearInterval(timer);
  play();

  let x0 = null;
  track.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; stop(); }, { passive: true });
  track.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
    x0 = null; play();
  });
}

function jackpot() {
  const el = document.getElementById('jackpot');
  if (!el) return;
  let v = 48213756.42;
  setInterval(() => {
    v += Math.random() * 260;
    el.textContent = BRAND.currency + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, 900);
}

function winners() {
  const el = document.getElementById('winners');
  if (!el) return;
  const names = ['Rahim***','Karim***','Sumon***','Nayan***','Jibon***','Tanvir***','Rakib***','Shanto***','Mizan***','Arif***'];
  const games = ['Aviator','Crazy Time','Sweet Bonanza','Teen Patti','Mines','Dragon Tiger','Big Bass','Lightning Roulette'];
  const avatars = ['🦁','🐯','🐺','🦅','🐉','🦈','🐧','🦊','🐻','🦄'];
  const row = i => {
    const amt = Math.floor(1200 + Math.random() * 98000);
    return `<li>
      <i class="winners__av">${avatars[i % avatars.length]}</i>
      <span class="winners__nm">${names[i % names.length]} won on <b>${games[i % games.length]}</b></span>
      <span class="winners__amt">${money(amt)}</span>
    </li>`;
  };
  const items = Array.from({ length: 10 }, (_, i) => row(i)).join('');
  el.innerHTML = items + items; // duplicated for a seamless loop
}

function categoryRail() {
  const rail = document.querySelector('.cats');
  if (!rail) return;
  rail.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    [...rail.children].forEach(x => x.classList.toggle('on', x === b));
    const target = document.getElementById('sec-' + b.dataset.go);
    if (target) window.scrollTo({ top: target.offsetTop - 110, behavior: 'smooth' });
  });
}


/* ---------- footer ---------- */
function footer() {
  const el = document.getElementById('siteFooter');
  if (!el) return;
  const grp = (t, items) => `<div class="ftr__grp"><div class="ftr__ttl">${t}</div>
    <div class="ftr__row">${items.map(i => `<span class="chip">${i}</span>`).join('')}</div></div>`;
  el.innerHTML = `<footer class="ftr">
    ${grp('PAYMENT METHODS', ['bKash','Nagad','Rocket','Upay','UPI','Bank Transfer','USDT'])}
    ${grp('GAME CENTER', ['Slots','Live Casino','Poker','Fish','Sports','E-sports','Lottery'])}
    ${grp('FOLLOW US', ['Telegram','Facebook','WhatsApp','YouTube'])}
    <p class="ftr__legal">
      ${BRAND.name} is a demonstration website built for client preview only.
      It does not accept deposits, does not run real games and is not affiliated with any
      licensed operator. All names, odds and balances shown are sample data.
    </p>
    <div class="ftr__age">18+</div>
  </footer>`;
}

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const mount = document.getElementById('gameSections');
  if (mount) {
    mount.innerHTML =
      section('hot') +
      `<section class="sec" id="sec-sports">
        <div class="sec__hd">
          <h2 class="sec__title">SPORTS &amp; CRICKET</h2>
          <a class="sec__more" href="#" data-toast="Sportsbook — demo">See All ›</a>
        </div>
        <div style="display:grid;gap:9px">${MATCHES.map(matchCard).join('')}</div>
      </section>` +
      section('slots') + section('live') + section('poker') + section('fish') + section('lottery') +
      `<section class="sec">
        <div class="sec__hd"><h2 class="sec__title">OUR PARTNERS</h2></div>
        <div class="scroll-x"><div class="provs">${PROVIDERS.map(p => `<span class="prov">${p}</span>`).join('')}</div></div>
      </section>`;
  }
  injectChrome();
  wireGlobal();
  carousel();
  jackpot();
  winners();
  categoryRail();
  footer();
});
