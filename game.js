/* ===========================================================
   CIDADE DO FUTURO · ENERGIA EM JOGO
   Lógica completa do jogo de tabuleiro (2 a 4 jogadores)
   =========================================================== */

/* ===========================================================
   SOM (Web Audio API — sintetizado, sem arquivos externos)
   =========================================================== */
const SOUND = (()=>{
  let ctx = null, muted = false;
  function ensure(){
    if (!ctx){
      try { ctx = new (window.AudioContext||window.webkitAudioContext)(); }
      catch(e){ ctx = null; }
    }
    if (ctx && ctx.state==='suspended') ctx.resume();
    return ctx;
  }
  // toca uma nota simples
  function tone(freq, dur, type='sine', vol=0.18, when=0){
    const c = ensure(); if(!c||muted) return;
    const t = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t+0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    osc.connect(gain); gain.connect(c.destination);
    osc.start(t); osc.stop(t+dur+0.02);
  }
  // sequência de notas (freq, start, dur)
  function seq(notes, type='triangle', vol=0.18){
    notes.forEach(([f,s,d])=> tone(f,d,type,vol,s));
  }
  function noise(dur, vol=0.12){
    const c = ensure(); if(!c||muted) return;
    const n = Math.floor(c.sampleRate*dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0;i<n;i++) data[i] = (Math.random()*2-1)*(1-i/n);
    const src = c.createBufferSource(); src.buffer = buf;
    const gain = c.createGain(); gain.gain.value = vol;
    const hp = c.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=900;
    src.connect(hp); hp.connect(gain); gain.connect(c.destination);
    src.start();
  }
  return {
    unlock(){ ensure(); },
    setMuted(m){ muted = m; },
    isMuted(){ return muted; },
    click(){ tone(520,0.06,'square',0.10); },
    dice(){ noise(0.12,0.10); for(let i=0;i<3;i++) tone(180+Math.random()*120,0.05,'square',0.06,i*0.05); },
    adv(){ seq([[523,0,0.10],[659,0.09,0.10],[784,0.18,0.14]],'triangle',0.16); },
    back(){ seq([[392,0,0.12],[311,0.10,0.12],[247,0.20,0.18]],'sawtooth',0.13); },
    skip(){ tone(196,0.30,'sawtooth',0.14); tone(165,0.30,'sine',0.10,0.05); },
    sorte(){ seq([[659,0,0.10],[784,0.10,0.10],[988,0.20,0.10],[1319,0.30,0.22]],'triangle',0.16); },
    reves(){ seq([[330,0,0.16],[247,0.14,0.20],[175,0.30,0.30]],'square',0.14); },
    win(){ seq([[523,0,0.14],[659,0.13,0.14],[784,0.26,0.14],[1047,0.40,0.30],[1319,0.56,0.40]],'triangle',0.20); },
  };
})();

/* ---------- Definição das casas do caminho principal ----------
   index 0 = INÍCIO ... 33 = FIM
   Posição na grade 11x8 (row,col) seguindo a borda em sentido horário.
*/
const DICE_FACES = ['','⚀','⚁','⚂','⚃','⚄','⚅'];

const BOARD = [
  // idx, row, col, tipo, nome, ícone, ação
  { n:'INÍCIO', t:'inicio', ico:'🚩', nm:'INÍCIO',                act:{type:'none'},   desc:'Ponto de partida' },
  { n:1,  t:'energia',    ico:'☀️', nm:'Energia Solar',          act:{type:'adv',v:1} },
  { n:2,  t:'meio',       ico:'🌳', nm:'Plante uma Árvore',      act:{type:'adv',v:1} },
  { n:3,  t:'economia',   ico:'🪙', nm:'Dia de Feira',           act:{type:'again'} },
  { n:4,  t:'transporte', ico:'🚌', nm:'Ônibus Elétrico',        act:{type:'adv',v:1} },
  { n:5,  t:'sorte',      ico:'❓', nm:'Sorte ou Revés',         act:{type:'card'} },
  { n:6,  t:'energia',    ico:'⚡', nm:'Escolha da Energia',     act:{type:'choice6'} },
  { n:7,  t:'transporte', ico:'🚗', nm:'Fumaça no Trânsito',     act:{type:'back',v:2} },
  { n:8,  t:'meio',       ico:'♻️', nm:'Reciclagem',             act:{type:'adv',v:1} },
  { n:9,  t:'economia',   ico:'🔓', nm:'Cofre Vazio',            act:{type:'back',v:1} },
  { n:10, t:'sorte',      ico:'❓', nm:'Sorte ou Revés',         act:{type:'card'} },
  { n:11, t:'energia',    ico:'🌬️', nm:'Energia Eólica',         act:{type:'adv',v:1} },
  { n:12, t:'meio',       ico:'🌊', nm:'Rio Poluído',            act:{type:'skip'} },
  { n:13, t:'transporte', ico:'🚲', nm:'Ciclovia Nova',          act:{type:'adv',v:1} },
  { n:14, t:'economia',   ico:'🏭', nm:'Fábrica Verde',          act:{type:'adv',v:1} },
  { n:15, t:'energia',    ico:'🔌', nm:'Apagão!',                act:{type:'back',v:2} },
  { n:16, t:'meio',       ico:'🏞️', nm:'Parque Novo',            act:{type:'adv',v:2} },
  { n:17, t:'sorte',      ico:'❓', nm:'Sorte ou Revés',         act:{type:'card'} },
  { n:18, t:'economia',   ico:'📸', nm:'Turistas na Cidade',     act:{type:'again'} },
  { n:19, t:'transporte', ico:'🚇', nm:'Metrô Inaugurado',       act:{type:'adv',v:2} },
  { n:20, t:'energia',    ico:'💡', nm:'Desperdício de Energia', act:{type:'back',v:2} },
  { n:21, t:'meio',       ico:'🗑️', nm:'Lixão a Céu Aberto',     act:{type:'back',v:3} },
  { n:22, t:'transporte', ico:'🛣️', nm:'Escolha o Caminho',      act:{type:'choice22'} },
  { n:23, t:'economia',   ico:'🏆', nm:'Prêmio Cidade Limpa',    act:{type:'adv',v:1} },
  { n:24, t:'sorte',      ico:'❓', nm:'Sorte ou Revés',         act:{type:'card'} },
  { n:25, t:'energia',    ico:'💡', nm:'Lâmpadas de LED',        act:{type:'adv',v:1} },
  { n:26, t:'meio',       ico:'🥬', nm:'Horta Comunitária',      act:{type:'adv',v:1} },
  { n:27, t:'economia',   ico:'📉', nm:'Crise Econômica',        act:{type:'skip'} },
  { n:28, t:'transporte', ico:'🚧', nm:'Buraco na Rua',          act:{type:'back',v:1} },
  { n:29, t:'energia',    ico:'🏭', nm:'Usina a Carvão',         act:{type:'back',v:2} },
  { n:30, t:'meio',       ico:'🎉', nm:'Festival no Parque',     act:{type:'adv',v:1} },
  { n:31, t:'sorte',      ico:'❓', nm:'Sorte ou Revés',         act:{type:'card'} },
  { n:32, t:'economia',   ico:'🌱', nm:'Investimento Verde',     act:{type:'adv',v:1} },
  { n:'FIM', t:'fim', ico:'🏆', nm:'FIM', act:{type:'none'}, desc:'Chegada!' },
];

/* posições (row,col) na grade — borda em sentido horário */
const POS = [];
// topo: cols 0..10  (idx 0..10)
for (let c=0;c<=10;c++) POS.push([0,c]);
// direita: rows 1..6 (idx 11..16)
for (let r=1;r<=6;r++) POS.push([r,10]);
// base: cols 10..0  (idx 17..27)
for (let c=10;c>=0;c--) POS.push([7,c]);
// esquerda: rows 6..1 (idx 28..32, FIM=33)
for (let r=6;r>=1;r--) POS.push([r,0]);

/* ---------- Atalho da Fumaça (A1..A5) ---------- */
const SHORTCUT = [
  { id:'A1', nm:'Nuvem de Fumaça', ico:'🌫️', act:{type:'back',v:1},  pos:[6,4] },
  { id:'A2', nm:'Sorte ou Revés',  ico:'❓', act:{type:'card'},      pos:[5,3] },
  { id:'A3', nm:'Pneu Furado',     ico:'🛞', act:{type:'skip'},      pos:[4,3] },
  { id:'A4', nm:'Sorte ou Revés',  ico:'❓', act:{type:'card'},      pos:[3,2] },
  { id:'A5', nm:'Ar Pesado',       ico:'🌫️', act:{type:'back',v:1},  pos:[2,1] },
];

/* ---------- Cartas de Sorte ou Revés ---------- */
const CARDS = [
  { k:'sorte', t:'Dia de muito sol',            d:'Avance 2 casas.',        act:{type:'adv',v:2} },
  { k:'sorte', t:'Mutirão de reciclagem',       d:'Avance 2 casas.',        act:{type:'adv',v:2} },
  { k:'sorte', t:'Prêmio de cidade sustentável',d:'Avance 3 casas.',        act:{type:'adv',v:3} },
  { k:'sorte', t:'Chuva limpou o ar',           d:'Avance 1 casa.',         act:{type:'adv',v:1} },
  { k:'sorte', t:'Passeio de bicicleta',        d:'Jogue o dado novamente.',act:{type:'again'} },
  { k:'sorte', t:'Reservatórios cheios',        d:'Avance 1 casa.',         act:{type:'adv',v:1} },
  { k:'reves', t:'Vazamento de óleo',           d:'Volte 3 casas.',         act:{type:'back',v:3} },
  { k:'reves', t:'Engarrafamento gigante',      d:'Volte 2 casas.',         act:{type:'back',v:2} },
  { k:'reves', t:'Lixo na rua',                 d:'Volte 2 casas.',         act:{type:'back',v:2} },
  { k:'reves', t:'Esqueceram a luz acesa',      d:'Volte 1 casa.',          act:{type:'back',v:1} },
  { k:'reves', t:'Tempestade derrubou postes',  d:'Fique 1 rodada sem jogar.',act:{type:'skip'} },
  { k:'reves', t:'Fumaça na cidade',            d:'Fique 1 rodada sem jogar.',act:{type:'skip'} },
];

const COLORS = [
  { name:'Verde',   hex:'#3aaf57' },
  { name:'Azul',    hex:'#2f6fed' },
  { name:'Laranja', hex:'#f59331' },
  { name:'Roxo',    hex:'#9b51e0' },
];

/* ===========================================================
   ESTADO
   =========================================================== */
let state = null;

function makeDeck(){
  const d = CARDS.map((c,i)=>i);
  for (let i=d.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [d[i],d[j]]=[d[j],d[i]]; }
  return d;
}

/* ===========================================================
   TELA INICIAL
   =========================================================== */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

let chosenCount = 4;

function buildPlayerInputs(){
  const wrap = $('#player-inputs');
  wrap.innerHTML = '';
  for (let i=0;i<chosenCount;i++){
    const row = document.createElement('div');
    row.className = 'pi-row';
    row.innerHTML = `
      <span class="pi-swatch" style="background:${COLORS[i].hex}"></span>
      <input type="text" maxlength="14" value="Jogador ${i+1}" data-i="${i}" />`;
    wrap.appendChild(row);
  }
}

$('#player-count').addEventListener('click', e=>{
  const b = e.target.closest('button'); if(!b) return;
  $$('#player-count button').forEach(x=>x.classList.remove('sel'));
  b.classList.add('sel');
  chosenCount = +b.dataset.n;
  buildPlayerInputs();
});

$('#btn-rules').addEventListener('click', ()=> $('#rules-overlay').classList.add('show'));
$('#btn-close-rules').addEventListener('click', ()=> $('#rules-overlay').classList.remove('show'));

$('#btn-start').addEventListener('click', startGame);
$('#btn-restart').addEventListener('click', ()=>{ if(confirm('Reiniciar a partida?')) location.reload(); });
$('#btn-playagain').addEventListener('click', ()=> location.reload());

buildPlayerInputs();

/* botão de som (mudo/ligado) */
const btnSound = $('#btn-sound');
if (btnSound){
  btnSound.addEventListener('click', ()=>{
    const m = !SOUND.isMuted();
    SOUND.setMuted(m);
    btnSound.textContent = m ? '🔇' : '🔊';
    btnSound.title = m ? 'Som desligado' : 'Som ligado';
    if (!m){ SOUND.unlock(); SOUND.click(); }
  });
}

/* destrava o áudio no primeiro toque (iOS/Android) */
window.addEventListener('pointerdown', ()=> SOUND.unlock(), { once:true });

/* ===========================================================
   INICIAR JOGO
   =========================================================== */
function startGame(){
  SOUND.unlock();
  const players = [];
  $$('#player-inputs input').forEach((inp,i)=>{
    players.push({
      name: inp.value.trim() || `Jogador ${i+1}`,
      color: COLORS[i].hex,
      cell: 0,          // posição no caminho principal (0..33)
      track: 'main',    // 'main' | 'short'
      sCell: -1,        // posição no atalho (-1=junção, 0..4)
      skip: false,      // fica 1 rodada sem jogar
    });
  });
  state = {
    players,
    cur: 0,
    deck: makeDeck(),
    busy: false,
    finished: false,
  };
  $('#screen-start').classList.remove('active');
  $('#screen-game').classList.add('active');
  renderBoard();
  renderStatus();
  updateTurnBanner();
  log(`A partida começou! Boa sorte na <b>Cidade do Futuro</b>. 🌆`);
}

/* ===========================================================
   RENDER DO TABULEIRO
   =========================================================== */
function renderBoard(){
  const board = $('#board');
  board.innerHTML = '';

  // casas principais
  BOARD.forEach((cell,idx)=>{
    const [r,c] = POS[idx];
    const el = document.createElement('div');
    el.className = `cell t-${cell.t}`;
    el.style.gridRow = (r+1);
    el.style.gridColumn = (c+1);
    el.id = `cell-${idx}`;
    el.innerHTML = `
      <span class="num">${cell.n}</span>
      <span class="ico">${cell.ico}</span>
      <span class="nm">${cell.nm}</span>
      <span class="act">${actLabel(cell.act)}</span>`;
    board.appendChild(el);
  });

  // casas do atalho
  SHORTCUT.forEach((cell,i)=>{
    const [r,c] = cell.pos;
    const el = document.createElement('div');
    el.className = 'cell t-atalho';
    el.style.gridRow = (r+1);
    el.style.gridColumn = (c+1);
    el.id = `scell-${i}`;
    el.innerHTML = `
      <span class="num">${cell.id}</span>
      <span class="ico">${cell.ico}</span>
      <span class="nm">${cell.nm}</span>
      <span class="act">${actLabel(cell.act)}</span>`;
    board.appendChild(el);
  });

  renderTokens();
}

function actLabel(a){
  switch(a.type){
    case 'adv': return `▶ Avance ${a.v}`;
    case 'back': return `◀ Volte ${a.v}`;
    case 'again': return '🎲 Jogue de novo';
    case 'skip': return '⏸ Fique 1 rodada';
    case 'card': return 'Puxe uma carta';
    case 'choice6': return 'A/B · Escolha';
    case 'choice22': return 'A/B · Bifurcação';
    default: return '';
  }
}

/* posiciona os peões em % dentro do tabuleiro */
function renderTokens(){
  $$('.token').forEach(t=>t.remove());
  const board = $('#board');

  // agrupa por casa para distribuir lado a lado
  const groups = {};
  state.players.forEach((p,i)=>{
    const key = p.track==='short' ? `s${p.sCell}` : `m${p.cell}`;
    (groups[key] ||= []).push(i);
  });

  state.players.forEach((p,i)=>{
    const key = p.track==='short' ? `s${p.sCell}` : `m${p.cell}`;
    const grp = groups[key];
    const order = grp.indexOf(i);

    let r,c;
    if (p.track==='short'){
      if (p.sCell < 0){ [r,c] = POS[22]; }            // junção = casa 22
      else { [r,c] = SHORTCUT[Math.min(p.sCell,4)].pos; }
    } else {
      [r,c] = POS[p.cell];
    }

    // tamanho da célula em %
    const cellW = 100/11, cellH = 100/8;
    // offset para múltiplos peões na mesma casa
    const ox = (order%2)*0.42 - 0.21 + 0.5;
    const oy = (Math.floor(order/2))*0.42 - 0.1 + 0.5;

    const tk = document.createElement('div');
    tk.className = 'token' + (p.skip ? ' lying' : '');
    tk.style.background = p.color;
    tk.style.left = `calc(${(c*cellW)}% + ${ox*cellW}% - 9%)`;
    tk.style.top  = `calc(${(r*cellH)}% + ${oy*cellH}% - 9%)`;
    tk.textContent = (order>0 || grp.length>1) ? (i+1) : '';
    tk.title = p.name;
    board.appendChild(tk);
  });
}

function highlightCell(player){
  $$('.cell').forEach(c=>c.classList.remove('active-cell'));
  let el;
  if (player.track==='short' && player.sCell>=0) el = $(`#scell-${player.sCell}`);
  else el = $(`#cell-${player.cell}`);
  if (el) el.classList.add('active-cell');
}

/* ===========================================================
   PAINEL / STATUS
   =========================================================== */
function renderStatus(){
  const wrap = $('#players-status');
  wrap.innerHTML = '';
  state.players.forEach((p,i)=>{
    const row = document.createElement('div');
    row.className = 'ps-row' + (i===state.cur ? ' cur':'');
    let where;
    if (p.track==='short') where = p.sCell<0 ? 'Atalho' : SHORTCUT[Math.min(p.sCell,4)].id;
    else where = p.cell===0 ? 'INÍCIO' : (p.cell>=33 ? 'FIM' : 'Casa '+BOARD[p.cell].n);
    const meta = p.skip ? '⏸ parado' : where;
    row.innerHTML = `
      <span class="ps-swatch" style="background:${p.color}"></span>
      <span>${p.name}</span>
      <span class="ps-meta">${meta}</span>`;
    wrap.appendChild(row);
  });
}

function updateTurnBanner(){
  const p = state.players[state.cur];
  $('#turn-name').textContent = `Vez de ${p.name}`;
  $('#turn-banner .dot').style.background = p.color;
  $('#btn-roll').disabled = state.busy || state.finished;
}

let logCount = 0;
function log(html){
  const ul = $('#log');
  const li = document.createElement('li');
  li.innerHTML = html;
  ul.prepend(li);
  if (++logCount>40) ul.lastChild?.remove();
}

/* ===========================================================
   FLUXO DO TURNO
   =========================================================== */
$('#btn-roll').addEventListener('click', rollDice);

function rollDice(){
  if (state.busy || state.finished) return;
  const p = state.players[state.cur];

  // jogador parado: levanta o peão e passa a vez
  if (p.skip){
    p.skip = false;
    log(`<b>${p.name}</b> estava parado e volta ao jogo na próxima rodada. ⏸`);
    renderTokens(); renderStatus();
    endTurn();
    return;
  }

  state.busy = true;
  $('#btn-roll').disabled = true;
  const dice = $('#dice');
  dice.classList.add('rolling');
  SOUND.dice();

  // animação do dado
  let ticks = 0;
  const anim = setInterval(()=>{
    dice.textContent = DICE_FACES[1+Math.floor(Math.random()*6)];
    if (++ticks>8){
      clearInterval(anim);
      const roll = 1+Math.floor(Math.random()*6);
      dice.textContent = DICE_FACES[roll];
      dice.classList.remove('rolling');
      log(`<b>${p.name}</b> tirou <b>${roll}</b> no dado. 🎲`);
      movePlayer(p, roll, true);
    }
  }, 60);
}

/* move o jogador `steps` casas pelo dado; landed=true => ativa o efeito */
function movePlayer(p, steps, byDice){
  if (p.track==='short'){
    p.sCell += steps;
    if (p.sCell >= SHORTCUT.length){ return win(p); }   // A5 -> FIM
    renderTokens(); renderStatus(); highlightCell(p);
    setTimeout(()=> resolveCell(p, byDice), 480);
  } else {
    p.cell += steps;
    if (p.cell >= 33){ p.cell = 33; renderTokens(); return win(p); }
    renderTokens(); renderStatus(); highlightCell(p);
    setTimeout(()=> resolveCell(p, byDice), 480);
  }
}

/* aplica deslocamento SEM ativar a casa de destino (efeitos/cartas) */
function shiftPlayer(p, delta){
  if (p.track==='short'){
    p.sCell += delta;
    if (p.sCell >= SHORTCUT.length) return win(p);
    if (p.sCell < -1) p.sCell = -1;
  } else {
    p.cell += delta;
    if (p.cell >= 33){ p.cell = 33; renderTokens(); return win(p); }
    if (p.cell < 0) p.cell = 0;
  }
  renderTokens(); renderStatus(); highlightCell(p);
}

/* resolve o efeito da casa onde o jogador parou pelo dado */
function resolveCell(p, byDice){
  const cell = p.track==='short' ? SHORTCUT[p.sCell] : BOARD[p.cell];
  const a = cell.act;
  const nm = p.track==='short' ? `${cell.id} · ${cell.nm}` : `casa ${cell.n} · ${cell.nm}`;

  switch(a.type){
    case 'none':
      finishStep();
      break;
    case 'adv':
      log(`📍 <b>${p.name}</b> parou em ${nm}: avança ${a.v}.`);
      SOUND.adv();
      setTimeout(()=>{ if(shiftPlayer(p, a.v)!==true) finishStep(); }, 350);
      break;
    case 'back':
      log(`📍 <b>${p.name}</b> parou em ${nm}: volta ${a.v}.`);
      SOUND.back();
      setTimeout(()=>{ if(shiftPlayer(p, -a.v)!==true) finishStep(); }, 350);
      break;
    case 'again':
      log(`📍 <b>${p.name}</b> em ${nm}: joga o dado de novo! 🎲`);
      state.busy = false;
      $('#btn-roll').disabled = false;
      // mesmo jogador joga de novo
      break;
    case 'skip':
      p.skip = true;
      SOUND.skip();
      log(`📍 <b>${p.name}</b> em ${nm}: fica 1 rodada sem jogar. ⏸`);
      renderTokens(); renderStatus();
      finishStep();
      break;
    case 'card':
      drawCard(p);
      break;
    case 'choice6':
      showChoice6(p);
      break;
    case 'choice22':
      if (byDice) showChoice22(p);
      else finishStep();
      break;
    default: finishStep();
  }
}

/* fim da resolução -> passa a vez (a não ser que tenha vencido) */
function finishStep(){
  if (state.finished) return;
  endTurn();
}

function endTurn(){
  state.busy = false;
  // se o jogador atual ganhou "jogar de novo", rollDice já reabilitou o botão
  // procura próximo jogador
  state.cur = (state.cur + 1) % state.players.length;
  renderStatus();
  updateTurnBanner();
  $('#btn-roll').disabled = false;
  $$('.cell').forEach(c=>c.classList.remove('active-cell'));
}

/* ===========================================================
   CARTAS
   =========================================================== */
function drawCard(p){
  if (state.deck.length===0) state.deck = makeDeck();
  const ci = state.deck.shift();
  const card = CARDS[ci];

  const modal = $('#modal');
  modal.className = 'modal ' + (card.k==='sorte'?'sorte':'reves');
  card.k==='sorte' ? SOUND.sorte() : SOUND.reves();
  $('#modal-icon').textContent = card.k==='sorte' ? '🍀' : '⚠️';
  $('#modal-title').textContent = card.k==='sorte' ? 'SORTE!' : 'REVÉS!';
  $('#modal-text').innerHTML = `<b>${card.t}</b><br>${card.d}`;
  const actions = $('#modal-actions');
  actions.innerHTML = '';
  const ok = document.createElement('button');
  ok.className = 'btn-primary big';
  ok.textContent = 'Continuar';
  ok.onclick = ()=>{
    closeModal();
    log(`🎴 <b>${p.name}</b> puxou <b>${card.t}</b> — ${card.d}`);
    applyCardEffect(p, card);
  };
  actions.appendChild(ok);
  $('#modal-overlay').classList.add('show');
}

function applyCardEffect(p, card){
  const a = card.act;
  if (a.type==='adv'){ setTimeout(()=>{ if(shiftPlayer(p,a.v)!==true) finishStep(); },300); }
  else if (a.type==='back'){ setTimeout(()=>{ if(shiftPlayer(p,-a.v)!==true) finishStep(); },300); }
  else if (a.type==='skip'){ p.skip=true; renderStatus(); renderTokens(); finishStep(); }
  else if (a.type==='again'){
    state.busy=false; $('#btn-roll').disabled=false; // joga de novo, não passa a vez
  }
  else finishStep();
}

/* ===========================================================
   ESCOLHAS (casa 6 e casa 22)
   =========================================================== */
function showChoice6(p){
  const modal = $('#modal');
  modal.className = 'modal';
  $('#modal-icon').textContent = '⚡';
  $('#modal-title').textContent = 'Escolha da Energia';
  $('#modal-text').innerHTML = `<b>${p.name}</b>, qual energia a cidade vai usar?`;
  const actions = $('#modal-actions');
  actions.innerHTML = '';

  const a = document.createElement('button');
  a.className='btn-primary big';
  a.style.background='linear-gradient(135deg,#c0392b,#922)';
  a.style.boxShadow='0 8px 20px rgba(192,57,43,.35)';
  a.innerHTML='🏭 A · Usina a carvão<br><small>Avance 2, mas fique 1 rodada parado</small>';
  a.onclick=()=>{
    closeModal();
    log(`⚡ <b>${p.name}</b> escolheu a <b>usina a carvão</b>: avança 2 mas fica 1 rodada parado.`);
    p.skip = true;
    if (shiftPlayer(p,2)!==true){ renderStatus(); finishStep(); }
  };

  const b = document.createElement('button');
  b.className='btn-primary big';
  b.innerHTML='☀️ B · Energia solar<br><small>Avanço garantido de 1 casa</small>';
  b.onclick=()=>{
    closeModal();
    log(`⚡ <b>${p.name}</b> escolheu a <b>energia solar</b>: avança 1 casa.`);
    if (shiftPlayer(p,1)!==true) finishStep();
  };

  actions.appendChild(a); actions.appendChild(b);
  $('#modal-overlay').classList.add('show');
}

function showChoice22(p){
  const modal = $('#modal');
  modal.className = 'modal';
  $('#modal-icon').textContent = '🛣️';
  $('#modal-title').textContent = 'Escolha o Caminho';
  $('#modal-text').innerHTML = `<b>${p.name}</b>, qual rota até o FIM?`;
  const actions = $('#modal-actions');
  actions.innerHTML='';

  const a = document.createElement('button');
  a.className='btn-primary big';
  a.style.background='linear-gradient(135deg,#6b7280,#4b5563)';
  a.style.boxShadow='0 8px 20px rgba(75,85,99,.35)';
  a.innerHTML='🌫️ A · Atalho da Fumaça<br><small>Curto (5 casas), mas arriscado!</small>';
  a.onclick=()=>{
    closeModal();
    p.track='short'; p.sCell=-1;
    log(`🌫️ <b>${p.name}</b> entrou no <b>Atalho da Fumaça</b>! Curto, mas perigoso.`);
    renderTokens(); renderStatus();
    finishStep();
  };

  const b = document.createElement('button');
  b.className='btn-primary big';
  b.innerHTML='🌳 B · Caminho Verde<br><small>Rota segura até o FIM</small>';
  b.onclick=()=>{
    closeModal();
    log(`🌳 <b>${p.name}</b> seguiu pelo <b>Caminho Verde</b>.`);
    finishStep();
  };

  actions.appendChild(a); actions.appendChild(b);
  $('#modal-overlay').classList.add('show');
}

function closeModal(){ $('#modal-overlay').classList.remove('show'); }

/* ===========================================================
   VITÓRIA
   =========================================================== */
function win(p){
  state.finished = true;
  state.busy = true;
  renderTokens();
  SOUND.win();
  log(`🏆 <b>${p.name}</b> chegou ao FIM e venceu a partida!`);
  $('#win-name').textContent = `${p.name} venceu! 🎉`;
  setTimeout(()=> $('#win-overlay').classList.add('show'), 500);
  $('#btn-roll').disabled = true;
  return true;
}
