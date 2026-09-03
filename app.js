const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let W = canvas.width = window.innerWidth;
let H = canvas.height = window.innerHeight;
window.addEventListener('resize', () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; });

const particles = [];
const stars = [];
function randBetween(a, b) { return a + Math.random() * (b - a); }

for (let i = 0; i < 150; i++) { particles.push({ x: Math.random()*W, y: Math.random()*H, vx: randBetween(-0.4,0.4), vy: randBetween(-0.4,0.4), r: randBetween(1.5,3.5), alpha: randBetween(0.3,0.8), burst: false }); }
for (let i = 0; i < 350; i++) { stars.push({ x: Math.random()*W, y: Math.random()*H, r: randBetween(0.3,1.5), twinkle: Math.random()*Math.PI*2, speed: randBetween(0.005,0.02), blue: Math.random()>0.7 }); }

function spawnBurst(cx, cy, count, fast) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random()*Math.PI*2;
    const speed = fast ? randBetween(3,10) : randBetween(1,4);
    particles.push({ x: cx, y: cy, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed, r: randBetween(2, fast?6:4), alpha: 1, life: 1, burst: true });
  }
}

let charge = 0, charging = false, chargeStart = null, chargeRaf = null;
const CHARGE_DURATION = 2500;
let maxKiAchieved = parseInt(localStorage.getItem('maxKi') || '0');
const KI_STAGES = [0, 10000, 50000, 500000, 2000000, 10000000];
function getKiFromCharge(pct) { if (pct <= 0) return 0; if (pct >= 100) return Infinity; const idx = Math.min(Math.floor(pct/20), KI_STAGES.length-2); const t = (pct - idx*20)/20; return Math.floor(KI_STAGES[idx] + (KI_STAGES[idx+1]-KI_STAGES[idx])*t); }
function formatKi(n) { if (!isFinite(n)) return '∞'; if (n>=1000000) return (n/1000000).toFixed(1)+'M'; if (n>=1000) return (n/1000).toFixed(0)+'K'; return n.toLocaleString(); }

const powerBtn = document.getElementById('powerBtn');
const btnLabel = document.getElementById('btnLabel');
const btnPct = document.getElementById('btnPct');
const chargeStatus = document.getElementById('chargeStatus');
const kiCounter = document.getElementById('kiCounter');
const kiBarFill = document.getElementById('kiBarFill');
const kiBarLabel = document.getElementById('kiBarLabel');
const ringFill = document.getElementById('ringFill');
const maxKiNote = document.getElementById('maxKiNote');

const STATUS_MESSAGES = ['Channel your divine ki...','Ki stirring... keep going!','Aura expanding — push further!','Surpassing mortal limits!','DIVINE KI ERUPTING!','⚡ GENESIS BREAK UNLOCKED! ⚡'];
const RING_CIRC = 2*Math.PI*52;
if (ringFill) { ringFill.style.strokeDasharray = RING_CIRC; ringFill.style.strokeDashoffset = RING_CIRC; }

function updateChargeUI(pct) {
  if (!powerBtn) return;
  const ki = getKiFromCharge(pct);
  if (ringFill) ringFill.style.strokeDashoffset = RING_CIRC*(1-pct/100);
  if (btnPct) btnPct.textContent = Math.round(pct)+'%';
  if (kiBarFill) kiBarFill.style.width = pct+'%';
  if (kiBarLabel) kiBarLabel.textContent = 'KI LEVEL: '+Math.round(pct)+'%';
  if (kiCounter) kiCounter.textContent = 'KI: '+(isFinite(ki)?formatKi(ki):'∞');
  const msgIdx = Math.min(Math.floor(pct/20), STATUS_MESSAGES.length-1);
  if (chargeStatus) chargeStatus.textContent = STATUS_MESSAGES[msgIdx];
  const intensity = Math.round(pct*1.5);
  document.body.style.boxShadow = 'inset 0 0 '+intensity+'px rgba(0,210,255,'+(pct/200)+')';
  powerBtn.style.boxShadow = '0 0 '+(20+pct*0.8)+'px rgba(0,210,255,'+(0.4+pct/200)+'), 0 0 '+pct+'px rgba(0,180,255,0.3)';
}

function startCharge() {
  if (charging) return;
  charging = true;
  chargeStart = performance.now() - (charge/100)*CHARGE_DURATION;
  if (btnLabel) btnLabel.innerHTML = 'CHARGING<br>KI...';
  function loop(now) {
    if (!charging) return;
    const elapsed = now - chargeStart;
    charge = Math.min((elapsed/CHARGE_DURATION)*100, 100);
    updateChargeUI(charge);
    if (charge > 50) {
      const btn = powerBtn.getBoundingClientRect();
      const cx = btn.left+btn.width/2, cy = btn.top+btn.height/2;
      particles.forEach(p => {
        if (p.burst) return;
        const dx = cx-p.x, dy = cy-p.y;
        const dist = Math.sqrt(dx*dx+dy*dy);
        const pull = (charge/100)*0.015;
        p.vx += (dx/dist)*pull; p.vy += (dy/dist)*pull;
        const spd = Math.sqrt(p.vx*p.vx+p.vy*p.vy);
        if (spd > 2) { p.vx=(p.vx/spd)*2; p.vy=(p.vy/spd)*2; }
      });
    }
    if (charge >= 100) { charging = false; onMaxCharge(); return; }
    chargeRaf = requestAnimationFrame(loop);
  }
  chargeRaf = requestAnimationFrame(loop);
}

function stopCharge() {
  if (!charging) return;
  charging = false;
  cancelAnimationFrame(chargeRaf);
  const btn = powerBtn.getBoundingClientRect();
  spawnBurst(btn.left+btn.width/2, btn.top+btn.height/2, Math.round(charge*0.6), false);
  const ki = getKiFromCharge(charge);
  if (isFinite(ki) && ki > maxKiAchieved) { maxKiAchieved = ki; localStorage.setItem('maxKi', maxKiAchieved); }
  if (maxKiNote) maxKiNote.textContent = 'MAX KI ACHIEVED: '+formatKi(maxKiAchieved);
  if (btnLabel) btnLabel.innerHTML = 'HOLD TO<br>POWER UP';
  if (chargeStatus) chargeStatus.textContent = 'Ki released at '+Math.round(charge)+'% — '+formatKi(ki)+' output';
}

function onMaxCharge() {
  const btn = powerBtn.getBoundingClientRect();
  spawnBurst(btn.left+btn.width/2, btn.top+btn.height/2, 200, true);
  document.body.classList.add('shake');
  setTimeout(() => document.body.classList.remove('shake'), 600);
  document.body.style.boxShadow = 'inset 0 0 300px rgba(0,210,255,0.7)';
  setTimeout(() => { document.body.style.boxShadow = ''; }, 800);
  if (chargeStatus) chargeStatus.textContent = '⚡ KI OUTPUT: MAXIMUM! — GENESIS BREAK UNLOCKED ⚡';
  if (btnLabel) btnLabel.innerHTML = 'MAXIMUM<br>POWER!';
  if (kiCounter) kiCounter.textContent = 'KI: ∞';
  localStorage.setItem('maxKi', 'Infinity');
  if (maxKiNote) maxKiNote.textContent = 'MAX KI ACHIEVED: ∞ — GENESIS BREAK';
  setTimeout(() => { charge = 0; updateChargeUI(0); if (btnLabel) btnLabel.innerHTML = 'HOLD TO<br>POWER UP'; document.body.style.boxShadow = ''; }, 3000);
}

if (powerBtn) {
  powerBtn.addEventListener('mousedown', startCharge);
  powerBtn.addEventListener('touchstart', e => { e.preventDefault(); startCharge(); }, { passive: false });
  window.addEventListener('mouseup', stopCharge);
  window.addEventListener('touchend', stopCharge);
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  stars.forEach(s => {
    s.twinkle += s.speed;
    const alpha = 0.3+0.5*Math.abs(Math.sin(s.twinkle));
    ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = s.blue?'#00d2ff':'#ffffff';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill(); ctx.restore();
  });
  for (let i = particles.length-1; i >= 0; i--) {
    const p = particles[i];
    if (p.burst) { p.life -= 0.018; p.alpha = p.life; p.vy -= 0.04; if (p.life <= 0) { particles.splice(i,1); i--; continue; } }
    else { if (p.x<0) p.x=W; if (p.x>W) p.x=0; if (p.y<0) p.y=H; if (p.y>H) p.y=0; p.x+=p.vx; p.y+=p.vy; if (!charging||charge<50) { p.vx*=0.99; p.vy*=0.99; p.vx+=randBetween(-0.01,0.01); p.vy+=randBetween(-0.01,0.01); } }
    ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = 'rgba(0,200,255,1)'; ctx.shadowColor = '#00d2ff'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill(); ctx.restore();
    if (!p.burst) { for (let j=i+1; j<particles.length; j++) { const q=particles[j]; if (q.burst) continue; const dx=p.x-q.x, dy=p.y-q.y, dist=Math.sqrt(dx*dx+dy*dy); if (dist<120) { ctx.save(); ctx.globalAlpha=(1-dist/120)*0.25; ctx.strokeStyle='#00d2ff'; ctx.lineWidth=0.5; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y); ctx.stroke(); ctx.restore(); } } }
  }
  requestAnimationFrame(draw);
}
draw();

function openModal(imgSrc, title, lore, atk, spd, def, pl) {
  const overlay = document.getElementById('modalOverlay');
  if (!overlay) return;
  document.getElementById('modalImg').src = imgSrc;
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalLore').textContent = lore;
  const plStr = pl===-1?'∞':(pl>=1000000?(pl/1000000).toFixed(1)+'M':pl>=1000?(pl/1000).toFixed(0)+'K':pl.toLocaleString());
  document.getElementById('modalStats').innerHTML = '<div class="stat-row"><span>Power Level</span><div class="stat-bar"><div class="stat-fill" style="width:'+atk+'%"></div></div><span>'+plStr+'</span></div><div class="stat-row"><span>Speed</span><div class="stat-bar"><div class="stat-fill" style="width:'+spd+'%"></div></div><span>'+spd+'</span></div><div class="stat-row"><span>Defense</span><div class="stat-bar"><div class="stat-fill" style="width:'+def+'%"></div></div><span>'+def+'</span></div>';
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeModal() { const o=document.getElementById('modalOverlay'); if(o) o.classList.remove('active'); document.body.style.overflow=''; }
document.addEventListener('keydown', e => { if (e.key==='Escape') closeModal(); });

const navToggle = document.getElementById('navToggle');
const navMobile = document.getElementById('navMobile');
if (navToggle&&navMobile) navToggle.addEventListener('click', () => navMobile.classList.toggle('open'));

if (maxKiNote && maxKiAchieved > 0) { const stored = localStorage.getItem('maxKi'); maxKiNote.textContent = 'MAX KI ACHIEVED: '+(stored==='Infinity'?'∞ — GENESIS BREAK':formatKi(maxKiAchieved)); }
