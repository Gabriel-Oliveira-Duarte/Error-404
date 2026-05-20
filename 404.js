// V10 - JS estável: removidos cursor JS, observers e overlays pesados
// V6 - Painel estável sem redimensionamento por digitação
// V5 - Sem barras internas e transições de setor mais lentas
// V4 - Transições mais lentas
const screens = Array.from(document.querySelectorAll(".screen"));
const hudStatus = document.getElementById("hudStatus");
const progressBar = document.getElementById("progressBar");
const progressLabel = document.getElementById("progressLabel");
const effectsButton = document.getElementById("effectsButton");
const audioButton = document.getElementById("audioButton");
const transitionLayer = document.getElementById("transitionLayer");
const transitionText = document.getElementById("transitionText");
const matrixCanvas = document.getElementById("matrixCanvas");
const STORAGE_KEY = "erro404-progress";
const EFFECTS_KEY = "erro404-effects";
const AUDIO_KEY = "erro404-audio";

const glitchTexts = [
  "erro detectado", "memória corrompida", "usuário desconhecido",
  "arquivo ausente", "sistema instável", "mundo não encontrado",
  "rota reescrita", "backup incompleto", "setor renderizando"
];

const screenDetails = {
  menu: "Interface inicial estabilizada.",
  intro: "Setor 01 carregado: memória ausente.",
  room: "Objetos renderizados: monitores, registro, falha local.",
  corridor: "Escolha detectada: rota em bifurcação.",
  terminalRoom: "Terminal de manutenção conectado.",
  city: "Setor central parcialmente corrompido.",
  luno: "NPC Luno identificado na narrativa.",
  alone: "Rota alternativa registrada.",
  truth: "Núcleo exposto: arquivos críticos liberados.",
  choice: "Decisão final aguardando confirmação.",
  goodEnding: "Restauração executada com perda de memória.",
  badEnding: "Colapso completo do mundo narrativo.",
  credits: "Créditos e informações do projeto."
};

let audioContext = null;
let masterGain = null;
let musicNodes = [];
let audioEnabled = false;
let matrixAnimation = null;

function getScreen(id){ return document.getElementById(id); }
function effectsOff(){ return document.body.classList.contains("effects-off"); }

function updateHud(screen){
  const progress = Number(screen.dataset.progress || 0);
  const status = screen.dataset.status || "SISTEMA INSTÁVEL";
  hudStatus.textContent = status;
  progressBar.style.width = `${progress}%`;
  progressLabel.textContent = `Progresso: ${progress}%`;
}

function typeSceneText(screen){
  // V6: efeito de digitação removido para evitar redimensionamento do painel central.
  // O texto agora aparece estável, sem alterar a altura do retângulo durante o carregamento.
  restoreText(screen);
}

function restoreText(screen){
  screen.querySelectorAll("[data-original-text]").forEach(el => {
    el.textContent = el.dataset.originalText;
    el.classList.remove("typing-text");
  });
}

function goToScreen(screenId, save = true){
  const target = getScreen(screenId);
  if(!target) return;

  const current = document.querySelector(".screen.active");
  if(current && current !== target) current.classList.add("leaving");

  runTransition(screenId);

  const trocaDeTelaDelay = effectsOff() ? 0 : 1650;

  window.setTimeout(() => {
    screens.forEach(screen => {
      restoreText(screen);
      screen.classList.remove("active", "leaving");
    });

    target.classList.add("active");
    updateHud(target);
    screenFlash();
    createDataBurst(target);
    restoreText(target);
    playUiSound("transition");

    if(save && screenId !== "credits" && screenId !== "menu"){
      localStorage.setItem(STORAGE_KEY, screenId);
      updateContinueButton();
    }
  }, trocaDeTelaDelay);
}

function runTransition(screenId){
  if(effectsOff() || !transitionLayer) return;
  transitionText.textContent = (screenDetails[screenId] || "Carregando novo setor.").toLowerCase();
  transitionLayer.classList.add("active");

  window.clearTimeout(window.__erro404TransitionTimer);
  window.__erro404TransitionTimer = window.setTimeout(() => {
    transitionLayer.classList.remove("active");
  }, 2900);
}

function startGame(){
  localStorage.removeItem(STORAGE_KEY);
  if(!audioEnabled) toggleAudio(true);
  updateContinueButton();
  playStartCutscene(function(){
    goToScreen("intro");
  });
}

function continueGame(){
  const saved = localStorage.getItem(STORAGE_KEY);
  if(!saved) return;
  if(!audioEnabled) toggleAudio(true);
  goToScreen(saved || "intro");
}

function updateContinueButton(){
  const continueButton = document.getElementById("continueButton");
  if(!continueButton) return;

  const saved = localStorage.getItem(STORAGE_KEY);
  const hasSave = Boolean(saved && saved !== "menu");

  continueButton.disabled = !hasSave;
  continueButton.classList.toggle("disabled", !hasSave);
  continueButton.title = hasSave ? "Continuar do último setor salvo" : "Nenhum progresso salvo ainda";
}

function finishGame(screenId){
  localStorage.setItem(STORAGE_KEY, screenId);
  goToScreen(screenId, false);
}

function restartGame(){
  localStorage.removeItem(STORAGE_KEY);
  goToScreen("menu", false);
  updateContinueButton();
}

function screenFlash(){
  if(effectsOff()) return;
  const flash = document.createElement("div");
  flash.className = "screen-flash";
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 170);
}

function createGlitchMessage(){
  if(effectsOff()) return;
  const message = document.createElement("div");
  message.className = "glitch-message";
  message.textContent = glitchTexts[Math.floor(Math.random() * glitchTexts.length)];
  message.style.top = `${Math.random() * 78 + 10}%`;
  message.style.left = `${Math.random() * 72 + 6}%`;
  document.body.appendChild(message);
  setTimeout(() => message.remove(), 1350);
}

function createDataBurst(screen){
  if(effectsOff()) return;
  const rect = (screen.querySelector(".dialog-box, .panel") || screen).getBoundingClientRect();
  for(let i = 0; i < 18; i++){
    const dot = document.createElement("span");
    dot.className = "data-particle";
    dot.textContent = Math.random() > .5 ? "0" : "1";
    dot.style.left = `${rect.left + Math.random() * rect.width}px`;
    dot.style.top = `${rect.top + Math.random() * rect.height}px`;
    dot.style.setProperty("--dx", `${(Math.random() - .5) * 160}px`);
    dot.style.setProperty("--dy", `${(Math.random() - .5) * 120}px`);
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 900);
  }
}

function toggleEffects(){
  const disabled = document.body.classList.toggle("effects-off");
  localStorage.setItem(EFFECTS_KEY, disabled ? "off" : "on");
  effectsButton.textContent = disabled ? "Efeitos: OFF" : "Efeitos: ON";
}

function initAudio(){
  if(audioContext) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0.0001;
  masterGain.connect(audioContext.destination);

  const delay = audioContext.createDelay();
  delay.delayTime.value = 0.42;
  const feedback = audioContext.createGain();
  feedback.gain.value = 0.22;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(masterGain);

  const notes = [55, 82.41, 110, 146.83];
  notes.forEach((freq, index) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = index % 2 ? "triangle" : "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.025 / (index + 1);
    osc.connect(gain);
    gain.connect(masterGain);
    gain.connect(delay);
    osc.start();
    musicNodes.push({osc, gain});
  });

  const lfo = audioContext.createOscillator();
  const lfoGain = audioContext.createGain();
  lfo.frequency.value = 0.08;
  lfoGain.gain.value = 6;
  lfo.connect(lfoGain);
  musicNodes.forEach(({osc}) => lfoGain.connect(osc.frequency));
  lfo.start();
  musicNodes.push({osc: lfo});
}

function toggleAudio(forceOn = false){
  initAudio();
  if(audioContext.state === "suspended") audioContext.resume();
  audioEnabled = forceOn ? true : !audioEnabled;
  localStorage.setItem(AUDIO_KEY, audioEnabled ? "on" : "off");
  const now = audioContext.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.linearRampToValueAtTime(audioEnabled ? 0.55 : 0.0001, now + 0.7);
  audioButton.textContent = audioEnabled ? "Áudio: ON" : "Áudio: OFF";
  playUiSound(audioEnabled ? "on" : "off");
}

function playUiSound(type = "click"){
  if(!audioEnabled || !audioContext || !masterGain) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  const frequencies = { click: 520, hover: 740, transition: 196, on: 880, off: 180 };
  osc.type = type === "transition" ? "sawtooth" : "square";
  osc.frequency.setValueAtTime(frequencies[type] || 440, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(type === "transition" ? 0.055 : 0.035, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (type === "transition" ? 0.22 : 0.08));
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.25);
}

function startMatrix(){
  if(!matrixCanvas) return;
  const ctx = matrixCanvas.getContext("2d");
  const chars = "010101 ERRO404 SENAI BETIM FILE NULL".split("");
  let columns = [];
  function resize(){
    matrixCanvas.width = window.innerWidth;
    matrixCanvas.height = window.innerHeight;
    columns = Array(Math.floor(matrixCanvas.width / 18)).fill(0).map(() => Math.random() * -100);
  }
  function draw(){
    if(!effectsOff()){
      ctx.fillStyle = "rgba(4, 4, 15, 0.08)";
      ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
      ctx.font = "14px Consolas, monospace";
      ctx.fillStyle = "rgba(0, 245, 255, 0.18)";
      columns.forEach((y, i) => {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * 18, y * 18);
        columns[i] = y * 18 > matrixCanvas.height && Math.random() > 0.985 ? 0 : y + 1;
      });
    }
    matrixAnimation = requestAnimationFrame(draw);
  }
  resize();
  window.addEventListener("resize", resize);
  draw();
}

function enhanceButtons(){
  document.querySelectorAll("button").forEach(button => {
    button.addEventListener("mouseenter", () => playUiSound("hover"));
    button.addEventListener("click", () => playUiSound("click"));
  });
}

function boot(){
  const effects = localStorage.getItem(EFFECTS_KEY);
  if(effects === "off"){
    document.body.classList.add("effects-off");
    effectsButton.textContent = "Efeitos: OFF";
  }

  updateContinueButton();
  enhanceButtons();
  startMatrix();

  const active = document.querySelector(".screen.active") || getScreen("menu");
  updateHud(active);
  typeSceneText(active);

  setInterval(createGlitchMessage, 4200);

  document.addEventListener("keydown", event => {
    if(event.key === "Escape") goToScreen("menu", false);
    if(event.key.toLowerCase() === "r") restartGame();
    if(event.key.toLowerCase() === "m") toggleAudio();
  });

  console.log("ERRO 404: experiência narrativa carregada com efeitos e áudio ambiente.");
}

document.addEventListener("DOMContentLoaded", boot);



/* =========================================================
   V11 - Melhorias funcionais seguras
   Sem MutationObserver, sem setInterval e sem cursor JS.
   ========================================================= */
(function(){
  function createPresentationBadge(){
    if(document.querySelector(".presentation-badge")) return;

    const badge = document.createElement("div");
    badge.className = "presentation-badge";
    badge.textContent = "ATALHO: F = TELA CHEIA";
    document.body.appendChild(badge);

    window.setTimeout(function(){
      if(badge && badge.parentNode){
        badge.style.transition = "opacity .6s ease";
        badge.style.opacity = "0";
        window.setTimeout(function(){
          if(badge && badge.parentNode) badge.parentNode.removeChild(badge);
        }, 700);
      }
    }, 6500);
  }

  function toggleFullscreen(){
    const doc = document;
    const root = doc.documentElement;

    if(!doc.fullscreenElement){
      if(root.requestFullscreen) root.requestFullscreen().catch(function(){});
    }else{
      if(doc.exitFullscreen) doc.exitFullscreen().catch(function(){});
    }
  }

  document.addEventListener("keydown", function(event){
    if(event.key && event.key.toLowerCase() === "f"){
      toggleFullscreen();
    }
  });

  window.addEventListener("load", createPresentationBadge, {once:true});
})();

/* =========================================================
   VISUAL NOVEL PATCH - cria quadrinhos, cenários e sprites CSS
   ========================================================= */
const visualScenes = {
  intro:{label:"02. DESPERTAR", kind:"room", hero:"hero-left", props:['window','bed'], bubble:"Onde estou...?"},
  room:{label:"03. SALA ABANDONADA", kind:"room", hero:"hero-left glitching", props:['window','bed','monitor'], bubble:"Memória corrompida"},
  corridor:{label:"04. CORREDOR", kind:"corridor", hero:"hero-small facing-right", props:[], bubble:"Duas rotas..."},
  terminalRoom:{label:"05. TERMINAL", kind:"core", hero:"hero-small facing-right", props:['monitor'], bubble:"Sistema instável"},
  city:{label:"06. CIDADE INICIAL", kind:"city", hero:"hero-small facing-right", props:['sign','luno','bubble'], bubble:"...", lunoClass:"facing-left distant"},
  luno:{label:"07. CONVERSA COM LUNO", kind:"city", hero:"hero-left hero-small facing-right", props:['sign','luno','bubble'], bubble:"Tenha cuidado.", lunoClass:"facing-left talking"},
  alone:{label:"08. ROTA SOLITÁRIA", kind:"city", hero:"hero-small facing-right glitching", props:['sign'], bubble:"404"},
  truth:{label:"09. NÚCLEO", kind:"core", hero:"glitching", props:['monitor'], bubble:"Substituto detectado"},
  choice:{label:"10. DECISÃO FINAL", kind:"core", hero:"glitching", props:['monitor','bubble'], bubble:"Escolha uma rota"},
  goodEnding:{label:"11. RESTAURAÇÃO", kind:"city", hero:"hero-small facing-right", props:['sign'], bubble:"Sistema restaurado"},
  badEnding:{label:"12. MUNDO NÃO ENCONTRADO", kind:"core", hero:"glitching", props:['monitor','bubble'], bubble:"ERRO 404"}
};

function makeHero(extraClass){
  return `<div class="character ${extraClass || ''}" aria-hidden="true"><span class="hair"></span><span class="head"></span><span class="eye l"></span><span class="eye r"></span><span class="mouth"></span><span class="body"></span><span class="arm l"></span><span class="arm r"></span><span class="leg l"></span><span class="leg r"></span></div>`;
}
function makeLuno(extraClass = ''){
  return `<div class="character luno ${extraClass}" aria-hidden="true"><span class="hair"></span><span class="head"></span><span class="eye l"></span><span class="eye r"></span><span class="mouth"></span><span class="body"></span><span class="arm l"></span><span class="arm r"></span><span class="leg l"></span><span class="leg r"></span></div>`;
}
function buildScene(sceneId, config){
  const parts = [];
  if(config.props?.includes('window')) parts.push('<span class="window"></span>');
  if(config.props?.includes('bed')) parts.push('<span class="bed"></span>');
  if(config.props?.includes('monitor')) parts.push('<span class="pixel-prop monitor"></span>');
  if(config.props?.includes('sign')) parts.push('<span class="pixel-prop sign"></span>');
  if(config.props?.includes('luno')) parts.push(makeLuno(config.lunoClass || ''));
  if(config.bubble || config.props?.includes('bubble')) parts.push(`<span class="speech-bubble">${config.bubble || '...'}</span>`);
  parts.push('<span class="neon-floor"></span>');
  parts.push(makeHero(config.hero));
  return `<div class="scene-stage" aria-label="Cena visual ${config.label}"><div class="scene-title"><span>${config.label}</span><span>${sceneId.toUpperCase()}</span></div><div class="pixel-bg ${config.kind}">${parts.join('')}</div></div>`;
}
function enhanceVisualNovel(){
  Object.entries(visualScenes).forEach(([id, config]) => {
    const screen = document.getElementById(id);
    const box = screen?.querySelector('.dialog-box');
    if(!box || box.querySelector('.scene-stage')) return;
    const content = document.createElement('div');
    content.className = 'story-content';
    while(box.firstChild) content.appendChild(box.firstChild);
    box.insertAdjacentHTML('afterbegin', buildScene(id, config));
    box.appendChild(content);
  });
}

document.addEventListener('DOMContentLoaded', enhanceVisualNovel);
if(document.readyState !== 'loading') enhanceVisualNovel();
















/* ===== CUTSCENE COM TRAFEGO E PERSONAGEM ELABORADO ===== */
let cutscenePlaying = false;
let cutsceneTimers = [];

function clearCutsceneTimers(){
  cutsceneTimers.forEach(timer => clearTimeout(timer));
  cutsceneTimers = [];
}

function playStartCutscene(onFinish){
  const cutscene = document.getElementById("startCutscene");

  if(!cutscene || cutscenePlaying){
    if(typeof onFinish === "function") onFinish();
    return;
  }

  cutscenePlaying = true;
  clearCutsceneTimers();

  document.body.classList.add("cutscene-active");
  cutscene.classList.remove("finishing", "phase-empty", "phase-glitch");
  cutscene.classList.add("playing");
  cutscene.setAttribute("aria-hidden", "false");

  const status = cutscene.querySelector(".cutscene-status");
  if(status) status.textContent = "SISTEMA: INSTÁVEL";

  const finish = () => {
    if(!cutscenePlaying) return;

    clearCutsceneTimers();
    cutscenePlaying = false;
    cutscene.classList.add("finishing");

    const fadeTimer = setTimeout(() => {
      cutscene.classList.remove("playing", "finishing", "phase-empty", "phase-glitch");
      cutscene.setAttribute("aria-hidden", "true");
      document.body.classList.remove("cutscene-active");

      if(status) status.textContent = "SISTEMA: INSTÁVEL";
      if(typeof onFinish === "function") onFinish();
    }, 980);

    cutsceneTimers.push(fadeTimer);
  };

  cutscene.__finishCutscene = finish;

  cutsceneTimers.push(setTimeout(() => {
    cutscene.classList.add("phase-empty");
    if(status) status.textContent = "USUÁRIO: AUSENTE";
  }, 4100));

  cutsceneTimers.push(setTimeout(() => {
    cutscene.classList.add("phase-glitch");
    if(status) status.textContent = "SISTEMA: CRÍTICO";
  }, 7600));

  cutsceneTimers.push(setTimeout(finish, 10900));
}

document.addEventListener("keydown", function(event){
  if(event.key === "Enter"){
    const cutscene = document.getElementById("startCutscene");
    if(cutscene && cutscenePlaying && typeof cutscene.__finishCutscene === "function"){
      cutscene.__finishCutscene();
    }
  }
});
