// ============================================================
// DOGS OF GRUNDSCHULE PLANETRIUM - WW2 FPS (Three.js) - REALISTIC UPDATE
// ============================================================

// ---- QUALITY DETECTION ----
function detectQuality() {
    const ua = navigator.userAgent || '';
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
    const cores = navigator.hardwareConcurrency || 2;
    const mem = navigator.deviceMemory || 4; // GB, defaults to 4 if unsupported

    let gpuTier = 'unknown';
    try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
        if (gl) {
            const dbg = gl.getExtension('WEBGL_debug_renderer_info');
            if (dbg) gpuTier = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL).toLowerCase();
        }
    } catch (_) { /* ignore */ }

    const isWeakGPU = /mali|adreno 3|adreno 4|intel hd|apple gpu/i.test(gpuTier);

    if (isMobile || mem <= 2 || cores <= 2 || isWeakGPU) return 'low';
    if (mem <= 4 || cores <= 4) return 'medium';
    return 'high';
}

const QUALITY = detectQuality();
console.log('[DogsOfGrunschulePlanetrium] Quality level:', QUALITY);

// ---- TOUCH DETECTION ----
const IS_TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// ---- CONFIG ----
const CFG = {
    PLAYER_HEIGHT: 1.7,
    PLAYER_SPEED: 7,
    SPRINT_SPEED: 12,
    JUMP_FORCE: 6,
    GRAVITY: -18,
    MOUSE_SENS: 0.002,
    TOUCH_SENS: 0.005,
    PLAYER_HP: 100,

    WEAPONS: [
        { name: 'M1 Garand', damage: 35, fireRate: 220, ammo: 8, maxAmmo: 8, reloadTime: 1800, spread: 0.012, range: 200, auto: false, recoilPitch: 0.025, recoilYaw: 0.008, shakeAmt: 0.012 },
        { name: 'Thompson', damage: 18, fireRate: 80, ammo: 30, maxAmmo: 30, reloadTime: 2000, spread: 0.035, range: 120, auto: true, recoilPitch: 0.012, recoilYaw: 0.005, shakeAmt: 0.006 },
        { name: 'Trench Gun', damage: 15, fireRate: 800, ammo: 6, maxAmmo: 6, reloadTime: 2500, spread: 0.12, range: 50, pellets: 8, auto: false, recoilPitch: 0.05, recoilYaw: 0.02, shakeAmt: 0.03 },
        { name: 'Springfield', damage: 90, fireRate: 1200, ammo: 5, maxAmmo: 5, reloadTime: 2800, spread: 0.003, range: 400, auto: false, sniper: true, recoilPitch: 0.04, recoilYaw: 0.01, shakeAmt: 0.02 },
    ],

    ENEMY: {
        grunt:  { hp: 60, speed: 3.5, damage: 10, fireRate: 1200, range: 40, detectRange: 50, score: 100, tunic: 0x8b1a1a, pants: 0x5c1010 },
        sniper: { hp: 35, speed: 2, damage: 25, fireRate: 2500, range: 80, detectRange: 80, score: 200, tunic: 0xa02020, pants: 0x6b1515 },
        brute:  { hp: 150, speed: 2.5, damage: 15, fireRate: 700, range: 30, detectRange: 40, score: 300, tunic: 0x701818, pants: 0x4a0e0e },
    },

    MAP_SIZE: 120,
    FOG_NEAR: 50,
    FOG_FAR: 130,
    WAVE_DELAY: 4000,
    MAX_PARTICLES: QUALITY === 'low' ? 30 : QUALITY === 'medium' ? 60 : 100,
    MAX_TRACERS: QUALITY === 'low' ? 8 : QUALITY === 'medium' ? 12 : 20,
    MAX_CASINGS: QUALITY === 'low' ? 10 : QUALITY === 'medium' ? 18 : 30,
    MAX_ENEMIES: QUALITY === 'low' ? 15 : QUALITY === 'medium' ? 30 : 50,
    MAX_AMBIENT_PARTICLES: 40,

    // Quality-driven scene counts
    SHADOW_ENABLED: QUALITY !== 'low',
    SHADOW_MAP_SIZE: QUALITY === 'high' ? 2048 : 1024,
    SHADOW_TYPE: QUALITY === 'high' ? 'PCFSoft' : 'Basic',
    ANTIALIAS: QUALITY !== 'low',
    PIXEL_RATIO: QUALITY === 'low' ? 1.0 : QUALITY === 'medium' ? 1.5 : 2.0,
    CLOUD_COUNT: QUALITY === 'low' ? 5 : QUALITY === 'medium' ? 10 : 20,
    DIRT_PATCH_COUNT: QUALITY === 'low' ? 8 : QUALITY === 'medium' ? 15 : 25,
    CRATER_COUNT: QUALITY === 'low' ? 4 : QUALITY === 'medium' ? 8 : 12,
    MOUNTAIN_COUNT: QUALITY === 'low' ? 8 : QUALITY === 'medium' ? 12 : 16,
    CRATE_COUNT: QUALITY === 'low' ? 6 : QUALITY === 'medium' ? 12 : 20,
    FIRE_LIGHTS: QUALITY !== 'low',
    FLAG_ANIM: QUALITY !== 'low',
    MAX_GRENADES_ACTIVE: 10,

    MAX_ALLIES: QUALITY === 'low' ? 3 : QUALITY === 'medium' ? 4 : 5,
    ALLY: {
        rifleman: { hp: 80, speed: 3.5, damage: 12, fireRate: 1000, range: 40, detectRange: 50, tunic: 0x1a3a8b, pants: 0x102a5c },
        medic:    { hp: 60, speed: 3,   damage: 8,  fireRate: 1400, range: 30, detectRange: 45, tunic: 0x2050a0, pants: 0x18406b, healRate: 10, healRange: 8 },
        support:  { hp: 100, speed: 3,  damage: 10, fireRate: 600,  range: 35, detectRange: 50, tunic: 0x182870, pants: 0x0e1e4a },
    },
};

// ---- TIMEOUT REGISTRY ----
const _timeoutIds = new Set();
function safeTimeout(fn, delay) {
    const id = setTimeout(() => {
        _timeoutIds.delete(id);
        fn();
    }, delay);
    _timeoutIds.add(id);
    return id;
}
function safeClearTimeout(id) {
    clearTimeout(id);
    _timeoutIds.delete(id);
}
function clearAllTimeouts() {
    for (const id of _timeoutIds) clearTimeout(id);
    _timeoutIds.clear();
}

// ---- EVENT LISTENER REGISTRY ----
const _listeners = [];
function addListener(target, event, fn, opts) {
    target.addEventListener(event, fn, opts);
    _listeners.push({ target, event, fn, opts });
}
function removeAllListeners() {
    for (const l of _listeners) l.target.removeEventListener(l.event, l.fn, l.opts);
    _listeners.length = 0;
}

// ---- GLOBALS ----
let scene, camera, renderer, clock;
let player, enemies = [], allies = [], bullets = [], particles = [];
let score = 0, kills = 0, wave = 0, waveActive = false, gameRunning = false;
let shellCasings = [];
let ambientSmoke = [];
let grenades = []; // active grenade projectiles
let aeroplanes = []; // flying planes
let bombs = []; // dropped bombs
const MAX_GRENADES_INVENTORY = 4;
let grenadeInventory = 3;

// ---- CACHED DOM ELEMENTS ----
const DOM = {};
function cacheDom() {
    DOM.healthBar = document.getElementById('healthBar');
    DOM.healthText = document.getElementById('healthText');
    DOM.ammoText = document.getElementById('ammoText');
    DOM.ammoMax = document.getElementById('ammoMax');
    DOM.weaponName = document.getElementById('weaponName');
    DOM.scoreText = document.getElementById('scoreText');
    DOM.killCount = document.getElementById('killCount');
    DOM.waveNum = document.getElementById('waveNum');
    DOM.enemyCount = document.getElementById('enemyCount');
    DOM.reloadBar = document.getElementById('reloadBar');
    DOM.reloadText = document.getElementById('reloadText');
    DOM.reloadBarFill = document.getElementById('reloadBarFill');
    DOM.hitMarker = document.getElementById('hitMarker');
    DOM.damageVignette = document.getElementById('damageVignette');
    DOM.waveBanner = document.getElementById('waveBanner');
    DOM.titleScreen = document.getElementById('titleScreen');
    DOM.hud = document.getElementById('hud');
    DOM.gameOver = document.getElementById('gameOver');
    DOM.finalScore = document.getElementById('finalScore');
    DOM.finalWave = document.getElementById('finalWave');
    DOM.finalKills = document.getElementById('finalKills');
    DOM.clickToPlay = document.getElementById('clickToPlay');
    DOM.scopeOverlay = document.getElementById('scopeOverlay');
    DOM.crosshair = document.getElementById('crosshair');
    DOM.bloodScreen = document.getElementById('bloodScreen');
    DOM.killFeed = document.getElementById('killFeed');
    DOM.grenadeCount = document.getElementById('grenadeCount');
    DOM.headshotText = document.getElementById('headshotText');
    DOM.compassInner = document.getElementById('compassInner');
    DOM.allyCount = document.getElementById('allyCount');
}

// ---- SHARED / POOLED GEOMETRY & MATERIALS ----
const POOL = {};
function createPools() {
    POOL.particleGeo = new THREE.SphereGeometry(0.05, 4, 4);
    POOL.tracerPoints = [new THREE.Vector3(), new THREE.Vector3()];
    POOL.particleMats = {};

    POOL.enemyTorsoGeo = new THREE.BoxGeometry(0.6, 0.9, 0.35);
    POOL.enemyHeadGeo = new THREE.SphereGeometry(0.2, 8, 8);
    POOL.enemyHelmetGeo = new THREE.SphereGeometry(0.24, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    POOL.enemyLegGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2);
    POOL.enemyBootGeo = new THREE.BoxGeometry(0.22, 0.3, 0.28);
    POOL.enemyArmGeo = new THREE.BoxGeometry(0.18, 0.6, 0.18);
    POOL.enemyGunGeo = new THREE.BoxGeometry(0.06, 0.06, 0.5);
    POOL.enemyBeltGeo = new THREE.BoxGeometry(0.62, 0.08, 0.37);
    POOL.enemyCollarGeo = new THREE.BoxGeometry(0.5, 0.08, 0.3);

    POOL.enemyTunicMats = {};
    POOL.enemyPantsMats = {};
    for (const [type, cfg] of Object.entries(CFG.ENEMY)) {
        POOL.enemyTunicMats[type] = new THREE.MeshStandardMaterial({ color: cfg.tunic, roughness: 0.85 });
        POOL.enemyPantsMats[type] = new THREE.MeshStandardMaterial({ color: cfg.pants, roughness: 0.9 });
    }
    POOL.enemyBootMat = new THREE.MeshStandardMaterial({ color: 0x1a1a18, roughness: 0.7, metalness: 0.1 });
    POOL.enemyBeltMat = new THREE.MeshStandardMaterial({ color: 0x2a2218, roughness: 0.7, metalness: 0.15 });
    POOL.enemyBuckleMat = new THREE.MeshStandardMaterial({ color: 0x888070, roughness: 0.4, metalness: 0.6 });

    // Ally materials
    POOL.allyTunicMats = {};
    POOL.allyPantsMats = {};
    for (const [role, cfg] of Object.entries(CFG.ALLY)) {
        POOL.allyTunicMats[role] = new THREE.MeshStandardMaterial({ color: cfg.tunic, roughness: 0.85 });
        POOL.allyPantsMats[role] = new THREE.MeshStandardMaterial({ color: cfg.pants, roughness: 0.9 });
    }
    POOL.allyBootMat = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.7, metalness: 0.1 });
    POOL.allyBeltMat = new THREE.MeshStandardMaterial({ color: 0x4a3a20, roughness: 0.7, metalness: 0.15 });

    POOL.tracerMat = new THREE.LineBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.6 });

    // Shell casing pool
    POOL.casingGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.03, 4);
    POOL.casingMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.3, metalness: 0.9 });

    // Grenade
    POOL.grenadeGeo = new THREE.SphereGeometry(0.08, 6, 6);
    POOL.grenadeMat = new THREE.MeshStandardMaterial({ color: 0x4a4a2a, roughness: 0.8, metalness: 0.2 });

    // Smoke particle
    POOL.smokeGeo = new THREE.PlaneGeometry(1, 1);
    POOL.smokeMat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false });

    // Pre-create smoke material pool instead of .clone() per instance
    POOL.smokeMatPool = [];
    for (let i = 0; i < 20; i++) {
        POOL.smokeMatPool.push(new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false }));
    }
    POOL._smokeMatIdx = 0;
}

function getParticleMat(color) {
    const key = color;
    if (!POOL.particleMats[key]) {
        POOL.particleMats[key] = new THREE.MeshBasicMaterial({ color, transparent: true });
    }
    return POOL.particleMats[key];
}

// ---- REUSABLE VECTORS ----
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _dir = new THREE.Vector3();

// ---- AUDIO SYSTEM ----
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
const _soundBufs = {};

function initAudio() {
    audioCtx = new AudioCtx();
    _initSoundBuffers();
}

function _initSoundBuffers() {
    // Pre-create noise buffers once instead of every playSound() call
    const sr = audioCtx.sampleRate;

    // Shoot noise (0.08s)
    const shootLen = Math.floor(sr * 0.08);
    _soundBufs.shoot = audioCtx.createBuffer(1, shootLen, sr);
    { const d = _soundBufs.shoot.getChannelData(0); for (let i = 0; i < shootLen; i++) { const t = i / shootLen; d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 30) * 0.6; } }

    // Impact noise (0.04s)
    const impactLen = Math.floor(sr * 0.04);
    _soundBufs.impact = audioCtx.createBuffer(1, impactLen, sr);
    { const d = _soundBufs.impact.getChannelData(0); for (let i = 0; i < impactLen; i++) { d[i] = (Math.random() * 2 - 1) * Math.exp(-(i / impactLen) * 20) * 0.3; } }

    // Explosion noise (0.3s)
    const exploLen = Math.floor(sr * 0.3);
    _soundBufs.explosion = audioCtx.createBuffer(1, exploLen, sr);
    { const d = _soundBufs.explosion.getChannelData(0); for (let i = 0; i < exploLen; i++) { const t = i / exploLen; d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 8) * 0.8; } }

    // Footstep noise (0.05s)
    const footLen = Math.floor(sr * 0.05);
    _soundBufs.footstep = audioCtx.createBuffer(1, footLen, sr);
    { const d = _soundBufs.footstep.getChannelData(0); for (let i = 0; i < footLen; i++) { const t = i / footLen; d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 40) * 0.2; } }

    // Enemy shoot noise (0.06s)
    const enemyLen = Math.floor(sr * 0.06);
    _soundBufs.enemyShoot = audioCtx.createBuffer(1, enemyLen, sr);
    { const d = _soundBufs.enemyShoot.getChannelData(0); for (let i = 0; i < enemyLen; i++) { d[i] = (Math.random() * 2 - 1) * Math.exp(-(i / enemyLen) * 25) * 0.4; } }
}

function playSound(type, volume, x, y, z) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;

    if (type === 'shoot') {
        const src = audioCtx.createBufferSource();
        src.buffer = _soundBufs.shoot;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(volume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        src.start(now);
        src.stop(now + 0.15);

        // Low boom
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.1);
        const boomGain = audioCtx.createGain();
        boomGain.gain.setValueAtTime(volume * 0.3, now);
        boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(boomGain);
        boomGain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
    }
    else if (type === 'impact') {
        const src = audioCtx.createBufferSource();
        src.buffer = _soundBufs.impact;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(volume * 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        src.connect(gain);
        gain.connect(audioCtx.destination);
        src.start(now);
        src.stop(now + 0.05);
    }
    else if (type === 'explosion') {
        const src = audioCtx.createBufferSource();
        src.buffer = _soundBufs.explosion;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(volume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        src.start(now);
        src.stop(now + 0.4);
    }
    else if (type === 'footstep') {
        const src = audioCtx.createBufferSource();
        src.buffer = _soundBufs.footstep;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400 + Math.random() * 200;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(volume * 0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        src.start(now);
        src.stop(now + 0.06);
    }
    else if (type === 'reload') {
        // Metallic click
        const osc = audioCtx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(volume * 0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
    }
    else if (type === 'enemyShoot') {
        const src = audioCtx.createBufferSource();
        src.buffer = _soundBufs.enemyShoot;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1500;
        const dist = x !== undefined ? Math.sqrt((x - player.x) ** 2 + (z - player.z) ** 2) : 30;
        const distVol = Math.max(0.02, 1 - dist / 80);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(volume * 0.2 * distVol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        src.start(now);
        src.stop(now + 0.1);
    }
    else if (type === 'hit') {
        // Thud when player takes damage
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(volume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
    }
    else if (type === 'bombWhistle') {
        // Falling bomb whistle — descending pitch
        const osc = audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 1.0);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1500;
        const gain = audioCtx.createGain();
        const dist = x !== undefined ? Math.sqrt((x - player.x) ** 2 + (z - player.z) ** 2) : 50;
        const distVol = Math.max(0.02, 1 - dist / 100);
        gain.gain.setValueAtTime(volume * 0.12 * distVol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 1.2);
    }
    else if (type === 'planeEngine') {
        // Distant propeller drone
        const osc = audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80 + Math.random() * 20, now);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300;
        const gain = audioCtx.createGain();
        const dist = x !== undefined ? Math.sqrt((x - player.x) ** 2 + (z - player.z) ** 2) : 60;
        const distVol = Math.max(0.01, 1 - dist / 150);
        gain.gain.setValueAtTime(volume * 0.08 * distVol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
    }
}

// ---- THREE.JS SETUP ----
function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x555560);
    scene.fog = new THREE.FogExp2(0x555560, 0.009);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);

    renderer = new THREE.WebGLRenderer({
        antialias: CFG.ANTIALIAS,
        stencil: false,
        powerPreference: QUALITY === 'low' ? 'low-power' : 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, CFG.PIXEL_RATIO));
    renderer.shadowMap.enabled = CFG.SHADOW_ENABLED;
    if (CFG.SHADOW_ENABLED) {
        renderer.shadowMap.type = CFG.SHADOW_TYPE === 'PCFSoft' ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.7;
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.prepend(renderer.domElement);

    clock = new THREE.Clock();

    addListener(window, 'resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// ---- LIGHTING (grey overcast WW2 battlefield) ----
function createLighting() {
    // Dim ambient for heavy overcast
    const ambient = new THREE.AmbientLight(0x556066, 0.5);
    scene.add(ambient);

    // Hemisphere: grey sky top, dark mud bottom
    const hemi = new THREE.HemisphereLight(0x778088, 0x3a2e20, 0.6);
    scene.add(hemi);

    // Overcast diffuse sun — cold and dim through cloud cover
    const sun = new THREE.DirectionalLight(0xccccbb, 0.9);
    sun.position.set(40, 45, 25);
    sun.castShadow = CFG.SHADOW_ENABLED;
    if (CFG.SHADOW_ENABLED) {
        sun.shadow.mapSize.width = CFG.SHADOW_MAP_SIZE;
        sun.shadow.mapSize.height = CFG.SHADOW_MAP_SIZE;
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 120;
        sun.shadow.camera.left = -60;
        sun.shadow.camera.right = 60;
        sun.shadow.camera.top = 60;
        sun.shadow.camera.bottom = -60;
        sun.shadow.bias = -0.0005;
        sun.shadow.normalBias = 0.02;
    }
    scene.add(sun);

    // Slight cool fill from opposite side
    const back = new THREE.DirectionalLight(0x556688, 0.25);
    back.position.set(-30, 20, -40);
    scene.add(back);
}

// ---- MATERIALS ----
const MAT = {};
function createMaterials() {
    MAT.ground = new THREE.MeshStandardMaterial({ color: 0x3e3220, roughness: 0.98, metalness: 0 });
    MAT.groundDark = new THREE.MeshStandardMaterial({ color: 0x2e2418, roughness: 0.98, metalness: 0 });
    MAT.dirt = new THREE.MeshStandardMaterial({ color: 0x5a4a30, roughness: 0.95, metalness: 0 });
    MAT.mud = new THREE.MeshStandardMaterial({ color: 0x3a2e1a, roughness: 0.99, metalness: 0 });
    MAT.mudWet = new THREE.MeshStandardMaterial({ color: 0x2a2010, roughness: 0.6, metalness: 0.05 });
    MAT.mudLight = new THREE.MeshStandardMaterial({ color: 0x5a4828, roughness: 0.95, metalness: 0 });
    MAT.road = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.92, metalness: 0 });
    MAT.brick = new THREE.MeshStandardMaterial({ color: 0x8b6e4e, roughness: 0.85, metalness: 0 });
    MAT.brickDark = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.88, metalness: 0 });
    MAT.brickLight = new THREE.MeshStandardMaterial({ color: 0x9a7e5e, roughness: 0.82, metalness: 0 });
    MAT.roof = new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 0.85, metalness: 0 });
    MAT.roofTile = new THREE.MeshStandardMaterial({ color: 0x6a3828, roughness: 0.8, metalness: 0 });
    MAT.wood = new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 0.9, metalness: 0 });
    MAT.woodDark = new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.9, metalness: 0 });
    MAT.sandbag = new THREE.MeshStandardMaterial({ color: 0xa09070, roughness: 0.95, metalness: 0 });
    MAT.concrete = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9, metalness: 0 });
    MAT.concreteDark = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9, metalness: 0 });
    MAT.metal = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.7 });
    MAT.darkMetal = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.8 });
    MAT.rustMetal = new THREE.MeshStandardMaterial({ color: 0x6a4030, roughness: 0.7, metalness: 0.4 });
    MAT.window = new THREE.MeshStandardMaterial({ color: 0x224466, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.4 });
    MAT.trench = new THREE.MeshStandardMaterial({ color: 0x3a2e1e, roughness: 0.95, metalness: 0 });
    MAT.crate = new THREE.MeshStandardMaterial({ color: 0x6b5030, roughness: 0.9, metalness: 0 });
    MAT.enemyHead = new THREE.MeshStandardMaterial({ color: 0xccaa88, roughness: 0.7, metalness: 0 });
    MAT.helmet = new THREE.MeshStandardMaterial({ color: 0x5a2020, roughness: 0.65, metalness: 0.2 });
    MAT.allyHelmet = new THREE.MeshStandardMaterial({ color: 0x1a3060, roughness: 0.65, metalness: 0.2 });
    MAT.door = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.85 });
    MAT.fire = new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.7 });
    MAT.fireGlow = new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.4 });
    MAT.scorch = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1, metalness: 0 });
    MAT.flag = new THREE.MeshStandardMaterial({ color: 0xcc4444, side: THREE.DoubleSide });
    MAT.wire = new THREE.LineBasicMaterial({ color: 0x777777 });
    MAT.mountain1 = new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 1 });
    MAT.mountain2 = new THREE.MeshStandardMaterial({ color: 0x3a3e42, roughness: 1 });
    MAT.cloud = new THREE.MeshBasicMaterial({ color: 0x777780, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
    MAT.planeMetal = new THREE.MeshStandardMaterial({ color: 0x4a5050, roughness: 0.5, metalness: 0.6 });
    MAT.planeWing = new THREE.MeshStandardMaterial({ color: 0x3a4040, roughness: 0.6, metalness: 0.4 });
    MAT.planeMark = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.3 });
}

// ---- COLLISION BOXES ----
const colliders = [];

function addCollider(x, z, w, d, h, y) {
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, minY: y || 0, maxY: (y || 0) + (h || 3) });
}

function checkCollision(x, z, radius) {
    const r2 = radius * radius;
    for (let i = 0, len = colliders.length; i < len; i++) {
        const c = colliders[i];
        const cx = x < c.minX ? c.minX : (x > c.maxX ? c.maxX : x);
        const cz = z < c.minZ ? c.minZ : (z > c.maxZ ? c.maxZ : z);
        const dx = x - cx, dz = z - cz;
        if (dx * dx + dz * dz < r2) return true;
    }
    return false;
}

function resolveCollision(x, z, radius) {
    let rx = x, rz = z;
    const r2 = radius * radius;
    for (let i = 0, len = colliders.length; i < len; i++) {
        const c = colliders[i];
        const cx = rx < c.minX ? c.minX : (rx > c.maxX ? c.maxX : rx);
        const cz = rz < c.minZ ? c.minZ : (rz > c.maxZ ? c.maxZ : rz);
        const dx = rx - cx, dz = rz - cz;
        const dd = dx * dx + dz * dz;
        if (dd < r2 && dd > 0.0001) {
            const d = Math.sqrt(dd);
            const push = radius - d;
            rx += (dx / d) * push;
            rz += (dz / d) * push;
        }
    }
    return { x: rx, z: rz };
}

// ---- MAP BUILDING ----
const _doorGeo = new THREE.BoxGeometry(1.5, 2.5, 0.15);
const _sandbagGeo = new THREE.BoxGeometry(0.7, 0.3, 0.4);

let flagMeshes = [];
let fireLights = []; // fire point lights for flickering

function createMap() {
    const S = CFG.MAP_SIZE;

    // Brown muddy ground — lower resolution for performance
    const groundGeo = new THREE.PlaneGeometry(S * 2, S * 2, 40, 40);
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i);
        const height = Math.sin(x * 0.06) * Math.cos(y * 0.06) * 0.7
            + Math.sin(x * 0.25 + 2) * Math.cos(y * 0.2) * 0.3
            + Math.random() * 0.12;
        pos.setZ(i, height);
    }
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeo, MAT.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Mud/dirt patches (reduced count)
    for (let i = 0; i < CFG.DIRT_PATCH_COUNT; i++) {
        const dx = (Math.random() - 0.5) * S * 1.6;
        const dz = (Math.random() - 0.5) * S * 1.6;
        const ds = 3 + Math.random() * 8;
        const dirtGeo = new THREE.CircleGeometry(ds, 6);
        const mats = [MAT.dirt, MAT.mud, MAT.mudWet, MAT.mudLight, MAT.groundDark];
        const dirtMesh = new THREE.Mesh(dirtGeo, mats[Math.floor(Math.random() * mats.length)]);
        dirtMesh.rotation.x = -Math.PI / 2;
        dirtMesh.position.set(dx, 0.03, dz);
        dirtMesh.receiveShadow = true;
        scene.add(dirtMesh);
    }

    // Craters (use base count, not tripled)
    for (let i = 0; i < CFG.CRATER_COUNT; i++) {
        const cx = (Math.random() - 0.5) * S * 1.4;
        const cz = (Math.random() - 0.5) * S * 1.4;
        const cr = 1 + Math.random() * 3;
        if (!checkCollision(cx, cz, cr + 1)) {
            createCrater(cx, cz, cr);
        }
    }

    // === TRENCH NETWORK (reduced — 6 trenches total) ===
    // Allied trenches (south)
    createTrench(0, 15, 50, 0);              // main allied front line
    createTrench(0, 28, 35, 0);              // rear support trench

    // No man's land craters
    for (let i = 0; i < 6; i++) {
        const cx = (Math.random() - 0.5) * 70;
        const cz = (Math.random() - 0.5) * 16;
        createCrater(cx, cz, 1.5 + Math.random() * 2);
    }

    // Enemy trenches (north)
    createTrench(0, -20, 50, 0);             // main enemy front line
    createTrench(0, -35, 35, 0);             // rear enemy trench

    // Communication trenches (connecting front to rear)
    createTrench(-10, 21, 14, Math.PI / 2);
    createTrench(10, -27, 16, Math.PI / 2);

    // === SANDBAG FORTIFICATIONS (reduced) ===
    createSandbagWall(-15, 12, 6, 0);
    createSandbagWall(15, 12, 6, 0);
    createSandbagWall(-15, -18, 6, 0);
    createSandbagWall(15, -18, 6, 0);
    // No man's land cover
    createSandbagWall(-20, 0, 4, Math.PI / 4);
    createSandbagWall(20, -5, 4, -Math.PI / 4);

    // === BARBED WIRE (reduced) ===
    if (QUALITY !== 'low') {
        createBarbedWire(-15, 8, 20, 0);
        createBarbedWire(15, 8, 20, 0);
        createBarbedWire(-10, -12, 18, 0);
        createBarbedWire(15, -12, 18, 0);
    }

    // === RUINS (reduced from 7 to 4) ===
    createRuin(-40, -15, 8, 8, 3);
    createRuin(40, -10, 6, 10, 2.5);
    createRuin(-35, 22, 8, 6, 3);
    createRuin(0, -50, 10, 8, 4);

    // Standing buildings far from front lines (reduced from 4 to 2)
    createBuilding(-45, 40, 10, 8, 6);
    createBuilding(50, -45, 10, 8, 5);

    // Supply road
    createRoad(0, 40, S * 1.2, 5);

    // === DESTROYED VEHICLES (reduced) ===
    createDestroyedTank(-15, 3);
    createDestroyedTank(20, -5);
    createDestroyedJeep(10, 25);
    createDestroyedJeep(35, -35);

    // === SUPPLY CRATES (halved) ===
    const crateCount = Math.floor(CFG.CRATE_COUNT / 2);
    for (let i = 0; i < crateCount; i++) {
        const cx = (Math.random() - 0.5) * S * 1.2;
        const cz = (Math.random() - 0.5) * S * 1.2;
        if (!checkCollision(cx, cz, 2)) {
            createCrate(cx, cz, 0.8 + Math.random() * 0.6);
        }
    }

    // Flags
    createFlagPole(-5, 35);
    createFlagPole(5, -35);

    // Boundary walls
    const wallH = 4, wallThick = 1;
    createBox(0, -S, S * 2, wallThick, wallH, MAT.concreteDark, true);
    createBox(0, S, S * 2, wallThick, wallH, MAT.concreteDark, true);
    createBox(-S, 0, wallThick, S * 2, wallH, MAT.concreteDark, true);
    createBox(S, 0, wallThick, S * 2, wallH, MAT.concreteDark, true);

    // Mountains (fewer segments)
    for (let i = 0; i < CFG.MOUNTAIN_COUNT; i++) {
        const ang = (i / CFG.MOUNTAIN_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const dist = 95 + Math.random() * 25;
        const mh = 15 + Math.random() * 25;
        const geo = new THREE.ConeGeometry(10 + Math.random() * 12, mh, 5);
        const mesh = new THREE.Mesh(geo, i % 2 === 0 ? MAT.mountain1 : MAT.mountain2);
        mesh.position.set(Math.cos(ang) * dist, mh / 2 - 3, Math.sin(ang) * dist);
        mesh.rotation.y = Math.random() * Math.PI;
        scene.add(mesh);
    }

    // Sky dome
    createSky();

    // === FIRES AND SMOKE (reduced — 4 fires, 3 smoke) ===
    createFire(-40, 0.5, -15);
    createFire(40, 0.5, -10);
    createFire(-15, 0.8, 3);
    createFire(20, 0.8, -5);

    if (QUALITY !== 'low') {
        spawnAmbientSmoke(-40, 2, -15);
        spawnAmbientSmoke(-15, 2, 3);
        spawnAmbientSmoke(20, 2, -5);
    }
}

function createCrater(x, z, radius) {
    const rimGeo = new THREE.RingGeometry(radius * 0.6, radius, 10);
    const rim = new THREE.Mesh(rimGeo, MAT.dirt);
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(x, 0.04, z);
    rim.receiveShadow = true;
    scene.add(rim);

    const innerGeo = new THREE.CircleGeometry(radius * 0.6, 8);
    const inner = new THREE.Mesh(innerGeo, MAT.mud);
    inner.rotation.x = -Math.PI / 2;
    inner.position.set(x, 0.02, z);
    inner.receiveShadow = true;
    scene.add(inner);
}

function createSky() {
    // Large sky dome — heavy grey overcast
    const skyGeo = new THREE.SphereGeometry(350, 16, 12);
    const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
            topColor: { value: new THREE.Color(0x3a3a42) },
            bottomColor: { value: new THREE.Color(0x666068) },
            offset: { value: 10 },
            exponent: { value: 0.4 },
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPos.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition + offset).y;
                gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
            }
        `,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // Cloud planes
    for (let i = 0; i < CFG.CLOUD_COUNT; i++) {
        const cw = 30 + Math.random() * 50;
        const ch = 15 + Math.random() * 20;
        const cloudGeo = new THREE.PlaneGeometry(cw, ch);
        const cloud = new THREE.Mesh(cloudGeo, MAT.cloud);
        cloud.rotation.x = -Math.PI / 2;
        const ang = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 200;
        cloud.position.set(Math.cos(ang) * dist, 60 + Math.random() * 30, Math.sin(ang) * dist);
        cloud.rotation.z = Math.random() * Math.PI;
        scene.add(cloud);
    }
}

function createFire(x, y, z) {
    // Fire group: several flame planes + point light
    const fireGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
        const fGeo = new THREE.PlaneGeometry(0.5 + Math.random() * 0.4, 1 + Math.random() * 0.8);
        const fMesh = new THREE.Mesh(fGeo, i < 2 ? MAT.fire : MAT.fireGlow);
        fMesh.position.set((Math.random() - 0.5) * 0.5, 0.5 + Math.random() * 0.3, (Math.random() - 0.5) * 0.5);
        fMesh.rotation.y = Math.random() * Math.PI;
        fMesh.userData.baseY = fMesh.position.y;
        fMesh.userData.phaseOffset = Math.random() * Math.PI * 2;
        fireGroup.add(fMesh);
    }
    fireGroup.position.set(x, y, z);
    scene.add(fireGroup);

    if (CFG.FIRE_LIGHTS) {
        const fireLight = new THREE.PointLight(0xff6622, 2, 15);
        fireLight.position.set(x, y + 1.5, z);
        fireLight.userData.baseIntensity = 2;
        fireLight.userData.phaseOffset = Math.random() * Math.PI * 2;
        scene.add(fireLight);
        fireLights.push({ light: fireLight, group: fireGroup });
    }
}

function spawnAmbientSmoke(x, y, z) {
    for (let i = 0; i < 3; i++) {
        const smokeMatFromPool = POOL.smokeMatPool[POOL._smokeMatIdx++ % POOL.smokeMatPool.length];
        const smoke = new THREE.Mesh(POOL.smokeGeo, smokeMatFromPool);
        smoke.position.set(x + (Math.random() - 0.5) * 2, y + i * 2 + Math.random(), z + (Math.random() - 0.5) * 2);
        smoke.rotation.set(Math.random(), Math.random(), Math.random());
        smoke.scale.setScalar(2 + Math.random() * 3);
        smoke.userData.baseY = smoke.position.y;
        smoke.userData.riseSpeed = 0.3 + Math.random() * 0.3;
        smoke.userData.driftX = (Math.random() - 0.5) * 0.2;
        smoke.userData.resetY = y;
        smoke.userData.maxY = y + 12;
        scene.add(smoke);
        ambientSmoke.push(smoke);
    }
}

function createBox(x, z, w, d, h, mat, collide, y) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, (y || 0) + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (collide) addCollider(x, z, w, d, h, y);
    return mesh;
}

function createRoad(x, z, w, d) {
    const geo = new THREE.PlaneGeometry(w, d);
    const mesh = new THREE.Mesh(geo, MAT.road);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.02, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
}

function createBuilding(x, z, w, d, h) {
    // Main walls
    createBox(x, z, w, d, h, MAT.brick, true);

    // Roof with slight overhang
    const roofGeo = new THREE.BoxGeometry(w + 1.2, 0.5, d + 1.2);
    const roof = new THREE.Mesh(roofGeo, MAT.roof);
    roof.position.set(x, h + 0.25, z);
    scene.add(roof);

    // Chimney on some buildings
    if (Math.random() > 0.4) {
        if (!createBuilding._chimGeo) createBuilding._chimGeo = new THREE.BoxGeometry(0.8, 2.5, 0.8);
        const chim = new THREE.Mesh(createBuilding._chimGeo, MAT.brickDark);
        chim.position.set(x + w * 0.3, h + 1.5, z + d * 0.3);
        scene.add(chim);
    }

    // Windows with frames (pooled geometries)
    const winSize = 1.2;
    if (!createBuilding._winGeoFront) {
        createBuilding._winGeoFront = new THREE.BoxGeometry(winSize, winSize * 1.3, 0.15);
        createBuilding._winGeoSide = new THREE.BoxGeometry(0.15, winSize * 1.3, winSize);
        createBuilding._frameGeoFront = new THREE.BoxGeometry(winSize + 0.15, winSize * 1.3 + 0.15, 0.06);
        createBuilding._frameGeoSide = new THREE.BoxGeometry(0.06, winSize * 1.3 + 0.15, winSize + 0.15);
    }
    for (let side = 0; side < 4; side++) {
        let wx, wz;
        const winH = h * 0.6;
        if (side === 0) { wx = x; wz = z - d / 2 - 0.01; }
        else if (side === 1) { wx = x; wz = z + d / 2 + 0.01; }
        else if (side === 2) { wx = x - w / 2 - 0.01; wz = z; }
        else { wx = x + w / 2 + 0.01; wz = z; }

        const isFront = side < 2;
        const spacing = isFront ? w : d;
        const count = Math.floor(spacing / 4);
        const winGeo = isFront ? createBuilding._winGeoFront : createBuilding._winGeoSide;
        const frameGeo = isFront ? createBuilding._frameGeoFront : createBuilding._frameGeoSide;
        for (let i = 0; i < count; i++) {
            const offset = (i - (count - 1) / 2) * 3.5;
            const px = wx + (isFront ? offset : 0);
            const pz = wz + (isFront ? 0 : offset);
            const wm = new THREE.Mesh(winGeo, MAT.window);
            wm.position.set(px, winH, pz);
            scene.add(wm);
            const frame = new THREE.Mesh(frameGeo, MAT.woodDark);
            frame.position.set(px, winH, pz);
            scene.add(frame);
        }
    }

    // Door with frame
    const door = new THREE.Mesh(_doorGeo, MAT.door);
    door.position.set(x, 1.25, z - d / 2 - 0.01);
    scene.add(door);
    // Door frame
    if (!createBuilding._dfGeo) createBuilding._dfGeo = new THREE.BoxGeometry(1.7, 2.7, 0.08);
    const df = new THREE.Mesh(createBuilding._dfGeo, MAT.woodDark);
    df.position.set(x, 1.35, z - d / 2 - 0.04);
    scene.add(df);

    // Foundation strip
    const foundGeo = new THREE.BoxGeometry(w + 0.2, 0.3, d + 0.2); // size varies per building
    const found = new THREE.Mesh(foundGeo, MAT.concreteDark);
    found.position.set(x, 0.15, z);
    found.receiveShadow = true;
    scene.add(found);
}

function createRuin(x, z, w, d, h) {
    const wallMat = MAT.brickDark;
    createBox(x, z - d / 2, w, 0.4, h + Math.random() * 2, wallMat, true);
    createBox(x, z + d / 2, w, 0.4, h, wallMat, true);
    createBox(x - w / 2, z, 0.4, d, h + Math.random(), wallMat, true);

    // Rubble pile (reduced)
    for (let i = 0; i < 4; i++) {
        const rx = x + (Math.random() - 0.5) * w;
        const rz = z + (Math.random() - 0.5) * d;
        const rs = 0.2 + Math.random() * 0.5;
        const rMat = Math.random() > 0.5 ? wallMat : MAT.concrete;
        createBox(rx, rz, rs, rs, rs, rMat, false);
    }

    // Scorched ground under ruins
    if (!createRuin._scorchGeo) createRuin._scorchGeo = new THREE.CircleGeometry(3, 8);
    const scorch = new THREE.Mesh(createRuin._scorchGeo, MAT.scorch);
    scorch.rotation.x = -Math.PI / 2;
    scorch.position.set(x, 0.025, z);
    scene.add(scorch);
}

function createSandbagWall(x, z, length, angle) {
    const group = new THREE.Group();
    // Single box per row instead of individual sandbags — 3 rows = 3 meshes
    for (let row = 0; row < 3; row++) {
        const wallGeo = new THREE.BoxGeometry(length, 0.3, 0.4);
        const wall = new THREE.Mesh(wallGeo, MAT.sandbag);
        wall.position.set(0, 0.15 + row * 0.3, (row % 2) * 0.05);
        wall.castShadow = true;
        wall.receiveShadow = true;
        group.add(wall);
    }
    group.position.set(x, 0, z);
    group.rotation.y = angle;
    scene.add(group);
    addCollider(x, z, length, 1, 1);
}

function createTrench(x, z, length, angle) {
    const trenchW = 3, trenchD = 1.6;
    const group = new THREE.Group();

    // Trench walls — mud/earth
    const wallGeo = new THREE.BoxGeometry(length, trenchD, 0.4);
    const w1 = new THREE.Mesh(wallGeo, MAT.trench);
    w1.position.set(0, -trenchD / 2, -trenchW / 2);
    group.add(w1);
    const w2 = new THREE.Mesh(wallGeo, MAT.trench);
    w2.position.set(0, -trenchD / 2, trenchW / 2);
    group.add(w2);

    // Muddy floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(length, 0.2, trenchW), MAT.mudWet);
    floor.position.set(0, -trenchD, 0);
    group.add(floor);

    // Duckboard — single long plank strip instead of many individual planks
    const duckboard = new THREE.Mesh(new THREE.BoxGeometry(length * 0.9, 0.06, trenchW * 0.7), MAT.woodDark);
    duckboard.position.set(0, -trenchD + 0.13, 0);
    group.add(duckboard);

    // Sandbag parapets — single long box per side instead of individual sandbags
    const parapetGeo = new THREE.BoxGeometry(length, 0.35, 0.5);
    const p1 = new THREE.Mesh(parapetGeo, MAT.sandbag);
    p1.position.set(0, 0.17, -trenchW / 2 - 0.2);
    group.add(p1);
    const p2 = new THREE.Mesh(parapetGeo, MAT.sandbag);
    p2.position.set(0, 0.17, trenchW / 2 + 0.2);
    group.add(p2);

    // A few support posts (sparse)
    const postGeo = new THREE.BoxGeometry(0.1, trenchD, 0.1);
    for (let i = -length / 2 + 4; i < length / 2; i += 8) {
        const post1 = new THREE.Mesh(postGeo, MAT.woodDark);
        post1.position.set(i, -trenchD / 2, -trenchW / 2 + 0.15);
        group.add(post1);
        const post2 = new THREE.Mesh(postGeo, MAT.woodDark);
        post2.position.set(i, -trenchD / 2, trenchW / 2 - 0.15);
        group.add(post2);
    }

    group.position.set(x, 0, z);
    group.rotation.y = angle;
    scene.add(group);
}

function createCrate(x, z, size) {
    const geo = new THREE.BoxGeometry(size, size, size);
    const mesh = new THREE.Mesh(geo, MAT.crate);
    mesh.position.set(x, size / 2, z);
    mesh.rotation.y = Math.random() * Math.PI;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    addCollider(x, z, size, size, size);

    // Metal corner bands
    const bandGeo = new THREE.BoxGeometry(size + 0.02, 0.06, size + 0.02);
    const band = new THREE.Mesh(bandGeo, MAT.rustMetal);
    band.position.set(x, size * 0.3, z);
    band.rotation.y = mesh.rotation.y;
    scene.add(band);
}

function createDestroyedTank(x, z) {
    const group = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 5), MAT.darkMetal);
    hull.position.y = 0.6; hull.castShadow = true;
    group.add(hull);
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.2, 0.8, 8), MAT.darkMetal);
    turret.position.set(0, 1.6, -0.5); turret.castShadow = true;
    group.add(turret);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 8), MAT.metal);
    barrel.rotation.z = Math.PI / 2; barrel.position.set(0, 1.6, -2.5);
    group.add(barrel);
    for (const side of [-1, 1]) {
        const track = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 5.2), MAT.darkMetal);
        track.position.set(side * 1.6, 0.4, 0);
        group.add(track);
    }
    // Rust/damage patches
    const rustGeo = new THREE.BoxGeometry(1, 0.5, 1.5);
    const rust = new THREE.Mesh(rustGeo, MAT.rustMetal);
    rust.position.set(0.8, 0.8, 1);
    group.add(rust);

    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI;
    scene.add(group);
    addCollider(x, z, 4, 6, 2.5);
}

function createDestroyedJeep(x, z) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 3.5), MAT.metal);
    body.position.y = 0.6; body.castShadow = true;
    group.add(body);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 1.5), MAT.metal);
    hood.position.set(0, 0.9, -1.2);
    group.add(hood);
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 8);
    for (const sx of [-1, 1]) {
        for (const sz of [-1, 0.8]) {
            const wheel = new THREE.Mesh(wheelGeo, MAT.darkMetal);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(sx * 1.1, 0.35, sz);
            group.add(wheel);
        }
    }
    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI;
    scene.add(group);
    addCollider(x, z, 3, 4, 1.5);
}

function createBarbedWire(x, z, length, angle) {
    const group = new THREE.Group();
    const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 4);
    for (let i = 0; i < length; i += 2) {
        const post = new THREE.Mesh(postGeo, MAT.rustMetal);
        post.position.set(i - length / 2, 0.6, 0);
        group.add(post);
    }
    const wireMat = MAT.wire;
    for (let h = 0.3; h <= 1; h += 0.35) {
        const pts = [];
        for (let i = 0; i <= length * 4; i++) {
            pts.push(new THREE.Vector3(
                (i / (length * 4)) * length - length / 2,
                h + Math.sin(i * 0.7) * 0.05,
                Math.sin(i * 1.3) * 0.08
            ));
        }
        const wireGeo = new THREE.BufferGeometry().setFromPoints(pts);
        group.add(new THREE.Line(wireGeo, wireMat));
    }
    group.position.set(x, 0, z);
    group.rotation.y = angle;
    scene.add(group);
}

function createFlagPole(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 6, 6), MAT.metal);
    pole.position.set(x, 3, z);
    scene.add(pole);
    const flagGeo = new THREE.PlaneGeometry(2, 1.2, 8, 4);
    const flag = new THREE.Mesh(flagGeo, MAT.flag);
    flag.position.set(x + 1, 5, z);
    scene.add(flag);
    flagMeshes.push(flag);
}

// ---- PLAYER ----
function createPlayer() {
    player = {
        x: 0, y: CFG.PLAYER_HEIGHT, z: 28,
        vx: 0, vy: 0, vz: 0,
        yaw: 0, pitch: 0,
        hp: CFG.PLAYER_HP, maxHp: CFG.PLAYER_HP,
        alive: true, grounded: true,
        sprinting: false,
        weaponIndex: 0,
        weapons: CFG.WEAPONS.map(w => ({ ...w })),
        lastShot: 0,
        reloading: false, reloadStart: 0,
        // Camera shake state
        shakeX: 0, shakeY: 0, shakeDecay: 0,
        // Landing dip
        landDip: 0, wasGrounded: true,
        // Footstep timing
        footstepPhase: 0, lastFootstep: 0,
        // COD health regen
        lastDamageTime: 0,
        regenDelay: 4.0, // seconds before regen starts
        regenRate: 25, // hp per second
    };
    camera.position.set(player.x, player.y, player.z);
}

// ---- INPUT ----
const keys = {};
let mouseDown = false;
let pointerLocked = false;

// ---- TOUCH STATE ----
let touchMoveX = 0, touchMoveY = 0;
let touchShootDown = false;
let touchSprint = false;
const _touches = {}; // identifier → { startX, startY, lastX, lastY, type }

function setupInput() {
    addListener(document, 'keydown', e => {
        keys[e.code] = true;
        if (e.code === 'Space') e.preventDefault();
        if (e.code === 'Digit1') switchWeapon(0);
        if (e.code === 'Digit2') switchWeapon(1);
        if (e.code === 'Digit3') switchWeapon(2);
        if (e.code === 'Digit4') switchWeapon(3);
        if (e.code === 'KeyR') reload();
        if (e.code === 'KeyG') throwGrenade();
        if (e.code === 'Space' && pointerLocked && gameRunning && player && player.alive) {
            const w = player.weapons[player.weaponIndex];
            if (!w.auto) shoot();
        }
    });
    addListener(document, 'keyup', e => { keys[e.code] = false; });

    addListener(document, 'mousemove', e => {
        if (!pointerLocked || !gameRunning) return;
        const sens = scoped ? CFG.MOUSE_SENS * 0.35 : CFG.MOUSE_SENS;
        player.yaw -= e.movementX * sens;
        player.pitch -= e.movementY * sens;
        player.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, player.pitch));
    });

    addListener(document, 'mousedown', e => {
        if (e.button === 0) mouseDown = true;
        if (e.button === 2 && pointerLocked && gameRunning) toggleScope(true);
    });
    addListener(document, 'mouseup', e => {
        if (e.button === 0) mouseDown = false;
        if (e.button === 2) toggleScope(false);
    });

    addListener(document, 'pointerlockchange', () => {
        if (IS_TOUCH) return; // touch devices ignore pointer lock
        pointerLocked = !!document.pointerLockElement;
        if (!pointerLocked && gameRunning) {
            DOM.clickToPlay.style.display = 'flex';
        } else {
            DOM.clickToPlay.style.display = 'none';
        }
    });

    if (!IS_TOUCH) {
        addListener(DOM.clickToPlay, 'click', () => {
            renderer.domElement.requestPointerLock();
        });
    }

    // Setup touch controls if on touch device
    if (IS_TOUCH) {
        document.body.classList.add('touch-device');
        pointerLocked = true; // always treat as "unlocked but playable"
        setupTouchInput();
    }
}

function setupTouchInput() {
    const touchControls = document.getElementById('touchControls');
    const moveStick = document.getElementById('moveStick');
    const moveStickKnob = document.getElementById('moveStickKnob');
    const shootBtn = document.getElementById('shootBtn');
    const adsBtn = document.getElementById('adsBtn');
    const reloadBtn = document.getElementById('reloadBtn');
    const jumpBtn = document.getElementById('jumpBtn');
    const sprintBtn = document.getElementById('sprintBtn');
    const grenadeBtn = document.getElementById('grenadeBtn');
    const lookArea = document.getElementById('lookArea');
    const weaponBtns = document.querySelectorAll('.weapon-btn');

    touchControls.style.display = 'block';

    // Prevent default on all touch elements to stop iOS scrolling/zooming
    const preventDef = e => e.preventDefault();
    addListener(document.body, 'touchmove', preventDef, { passive: false });
    addListener(renderer.domElement, 'touchstart', preventDef, { passive: false });

    // ---- LEFT JOYSTICK ----
    const stickRect = () => moveStick.getBoundingClientRect();
    const STICK_RADIUS = 35; // max knob offset from center

    addListener(moveStick, 'touchstart', e => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        _touches[touch.identifier] = { type: 'stick', startX: touch.clientX, startY: touch.clientY };
        moveStick.classList.add('active');
    }, { passive: false });

    addListener(moveStick, 'touchmove', e => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const t = _touches[touch.identifier];
            if (!t || t.type !== 'stick') continue;

            const rect = stickRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            let dx = touch.clientX - centerX;
            let dy = touch.clientY - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > STICK_RADIUS) {
                dx = (dx / dist) * STICK_RADIUS;
                dy = (dy / dist) * STICK_RADIUS;
            }

            // Normalize to -1..1
            touchMoveX = dx / STICK_RADIUS;
            touchMoveY = dy / STICK_RADIUS;

            // Visual feedback: move knob
            moveStickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
        }
    }, { passive: false });

    const resetStick = e => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const t = _touches[touch.identifier];
            if (t && t.type === 'stick') {
                touchMoveX = 0;
                touchMoveY = 0;
                moveStickKnob.style.transform = 'translate(0px, 0px)';
                moveStick.classList.remove('active');
                delete _touches[touch.identifier];
            }
        }
    };
    addListener(moveStick, 'touchend', resetStick, { passive: false });
    addListener(moveStick, 'touchcancel', resetStick, { passive: false });

    // ---- RIGHT SIDE LOOK AREA ----
    addListener(lookArea, 'touchstart', e => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            _touches[touch.identifier] = { type: 'look', lastX: touch.clientX, lastY: touch.clientY };
        }
    }, { passive: false });

    addListener(lookArea, 'touchmove', e => {
        e.preventDefault();
        if (!gameRunning || !player || !player.alive) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const t = _touches[touch.identifier];
            if (!t || t.type !== 'look') continue;

            const dx = touch.clientX - t.lastX;
            const dy = touch.clientY - t.lastY;
            t.lastX = touch.clientX;
            t.lastY = touch.clientY;

            const sens = scoped ? CFG.TOUCH_SENS * 0.35 : CFG.TOUCH_SENS;
            player.yaw -= dx * sens;
            player.pitch -= dy * sens;
            player.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, player.pitch));
        }
    }, { passive: false });

    const endLook = e => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (_touches[touch.identifier] && _touches[touch.identifier].type === 'look') {
                delete _touches[touch.identifier];
            }
        }
    };
    addListener(lookArea, 'touchend', endLook, { passive: false });
    addListener(lookArea, 'touchcancel', endLook, { passive: false });

    // ---- SHOOT BUTTON ----
    addListener(shootBtn, 'touchstart', e => {
        e.preventDefault();
        touchShootDown = true;
        shootBtn.classList.add('active');
        if (gameRunning && player && player.alive) {
            const w = player.weapons[player.weaponIndex];
            if (!w.auto) shoot();
        }
    }, { passive: false });
    const endShoot = e => { e.preventDefault(); touchShootDown = false; shootBtn.classList.remove('active'); };
    addListener(shootBtn, 'touchend', endShoot, { passive: false });
    addListener(shootBtn, 'touchcancel', endShoot, { passive: false });

    // ---- ADS BUTTON ----
    addListener(adsBtn, 'touchstart', e => {
        e.preventDefault();
        adsBtn.classList.add('active');
        if (gameRunning && player && player.alive) toggleScope(true);
    }, { passive: false });
    const endAds = e => { e.preventDefault(); adsBtn.classList.remove('active'); toggleScope(false); };
    addListener(adsBtn, 'touchend', endAds, { passive: false });
    addListener(adsBtn, 'touchcancel', endAds, { passive: false });

    // ---- RELOAD BUTTON ----
    addListener(reloadBtn, 'touchstart', e => {
        e.preventDefault();
        if (gameRunning && player && player.alive) reload();
    }, { passive: false });

    // ---- JUMP BUTTON ----
    addListener(jumpBtn, 'touchstart', e => {
        e.preventDefault();
        keys['KeyV'] = true;
    }, { passive: false });
    const endJump = e => { e.preventDefault(); keys['KeyV'] = false; };
    addListener(jumpBtn, 'touchend', endJump, { passive: false });
    addListener(jumpBtn, 'touchcancel', endJump, { passive: false });

    // ---- SPRINT BUTTON ----
    addListener(sprintBtn, 'touchstart', e => {
        e.preventDefault();
        touchSprint = true;
        sprintBtn.classList.add('active');
    }, { passive: false });
    const endSprint = e => { e.preventDefault(); touchSprint = false; sprintBtn.classList.remove('active'); };
    addListener(sprintBtn, 'touchend', endSprint, { passive: false });
    addListener(sprintBtn, 'touchcancel', endSprint, { passive: false });

    // ---- GRENADE BUTTON ----
    addListener(grenadeBtn, 'touchstart', e => {
        e.preventDefault();
        if (gameRunning && player && player.alive) throwGrenade();
    }, { passive: false });

    // ---- WEAPON SWITCH BUTTONS ----
    weaponBtns.forEach(btn => {
        addListener(btn, 'touchstart', e => {
            e.preventDefault();
            const idx = parseInt(btn.getAttribute('data-idx'));
            if (gameRunning && player && player.alive) switchWeapon(idx);
        }, { passive: false });
    });
}

function switchWeapon(idx) {
    if (player && idx < player.weapons.length) {
        player.weaponIndex = idx;
        player.reloading = false;
        toggleScope(false);
        createWeaponModel();
        playSound('reload', 0.8);
    }
}

function reload() {
    if (!player || !player.alive) return;
    const w = player.weapons[player.weaponIndex];
    if (player.reloading || w.ammo === w.maxAmmo) return;
    player.reloading = true;
    player.reloadStart = performance.now();
    playSound('reload', 1.0);
}

// ---- SCOPE / ADS ----
let scoped = false;
const DEFAULT_FOV = 75;
const SCOPE_FOV = 20;

function toggleScope(on) {
    if (!player || !player.alive) return;
    const w = player.weapons[player.weaponIndex];
    if (w.sniper) {
        scoped = on;
        DOM.scopeOverlay.style.display = scoped ? 'block' : 'none';
        DOM.crosshair.style.display = scoped ? 'none' : 'block';
        if (weaponModel) weaponModel.visible = !scoped;
    } else {
        scoped = on;
    }
}

// ---- WEAPON VIEW MODEL ----
let weaponModel = null;
let weaponBob = 0;
let weaponRecoil = 0;
let weaponSwayX = 0, weaponSwayY = 0; // idle sway

let _gunMat = null, _woodMat = null, _scopeLensMat1 = null, _scopeLensMat2 = null;
function getWeaponMats() {
    if (!_gunMat) {
        _gunMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5, metalness: 0.6 });
        _woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.8, metalness: 0 });
        _scopeLensMat1 = new THREE.MeshBasicMaterial({ color: 0x6688cc, transparent: true, opacity: 0.5 });
        _scopeLensMat2 = new THREE.MeshBasicMaterial({ color: 0x6688cc, transparent: true, opacity: 0.4 });
    }
    return { gunMat: _gunMat, woodMat: _woodMat };
}

function disposeGroup(group) {
    group.traverse(child => {
        if (child.geometry) child.geometry.dispose();
    });
}

function createWeaponModel() {
    if (weaponModel) {
        disposeGroup(weaponModel);
        camera.remove(weaponModel);
    }

    weaponModel = new THREE.Group();
    const { gunMat, woodMat } = getWeaponMats();
    const w = player.weapons[player.weaponIndex];

    if (w.name === 'M1 Garand') {
        weaponModel.add(makeMesh(new THREE.BoxGeometry(0.06, 0.08, 0.35), woodMat, 0, -0.02, 0.15));
        weaponModel.add(makeCylMesh(0.015, 0.6, gunMat, 0, 0.02, -0.25));
        weaponModel.add(makeMesh(new THREE.BoxGeometry(0.04, 0.06, 0.3), gunMat, 0, 0, -0.05));
        weaponModel.add(makeMesh(new THREE.BoxGeometry(0.05, 0.04, 0.15), gunMat, 0, 0.03, -0.1));
        // Trigger guard
        weaponModel.add(makeMesh(new THREE.BoxGeometry(0.03, 0.04, 0.06), gunMat, 0, -0.04, 0.02));
    } else if (w.name === 'Thompson') {
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 12), gunMat);
        drum.position.set(0, -0.06, -0.05); weaponModel.add(drum);
        weaponModel.add(makeMesh(new THREE.BoxGeometry(0.05, 0.06, 0.25), gunMat, 0, 0, -0.02));
        weaponModel.add(makeCylMesh(0.018, 0.3, gunMat, 0, 0.01, -0.28));
        weaponModel.add(makeMesh(new THREE.BoxGeometry(0.05, 0.05, 0.2), woodMat, 0, -0.01, 0.2));
        weaponModel.add(makeMesh(new THREE.BoxGeometry(0.03, 0.06, 0.05), woodMat, 0, -0.05, -0.12));
        // Compensator
        weaponModel.add(makeCylMesh(0.022, 0.06, gunMat, 0, 0.01, -0.44));
    } else if (w.name === 'Trench Gun') {
        weaponModel.add(makeCylMesh(0.02, 0.55, gunMat, 0, 0.02, -0.2));
        weaponModel.add(makeMesh(new THREE.BoxGeometry(0.05, 0.06, 0.2), gunMat, 0, 0, 0.05));
        weaponModel.add(makeMesh(new THREE.BoxGeometry(0.04, 0.04, 0.1), woodMat, 0, -0.02, -0.12));
        weaponModel.add(makeMesh(new THREE.BoxGeometry(0.05, 0.07, 0.3), woodMat, 0, -0.01, 0.25));
        // Pump handle
        weaponModel.add(makeMesh(new THREE.BoxGeometry(0.04, 0.035, 0.12), woodMat, 0, -0.01, -0.3));
    } else {
        // Springfield
        weaponModel.add(makeCylMesh(0.013, 0.8, gunMat, 0, 0.02, -0.35));
        weaponModel.add(makeMesh(new THREE.BoxGeometry(0.04, 0.05, 0.35), gunMat, 0, 0, 0));
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 6), gunMat);
        bolt.rotation.z = Math.PI / 2; bolt.position.set(0.04, 0.01, 0.02); weaponModel.add(bolt);
        weaponModel.add(makeCylMesh(0.02, 0.2, gunMat, 0, 0.055, -0.05));
        const lf = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 8), _scopeLensMat1);
        lf.rotation.x = Math.PI / 2; lf.position.set(0, 0.055, -0.15); weaponModel.add(lf);
        const lr = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.01, 8), _scopeLensMat2);
        lr.rotation.x = Math.PI / 2; lr.position.set(0, 0.055, 0.05); weaponModel.add(lr);
        for (const sz of [-0.04, 0.03]) {
            weaponModel.add(makeMesh(new THREE.BoxGeometry(0.015, 0.025, 0.015), gunMat, 0, 0.04, sz));
        }
        weaponModel.add(makeMesh(new THREE.BoxGeometry(0.05, 0.07, 0.4), woodMat, 0, -0.01, 0.3));
        weaponModel.add(makeMesh(new THREE.BoxGeometry(0.035, 0.03, 0.25), woodMat, 0, -0.02, -0.15));
    }

    weaponModel.position.set(0.25, -0.22, -0.4);
    camera.add(weaponModel);
}

function makeMesh(geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    return m;
}
function makeCylMesh(radius, height, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 8), mat);
    m.rotation.x = Math.PI / 2;
    m.position.set(x, y, z);
    return m;
}

// ---- MUZZLE FLASH ----
let muzzleFlash = null;
let muzzleFlashTime = 0;

function createMuzzleFlash() {
    if (muzzleFlash) {
        if (muzzleFlash.geometry) muzzleFlash.geometry.dispose();
        if (muzzleFlash.material) muzzleFlash.material.dispose();
        camera.remove(muzzleFlash);
        if (muzzleFlash.userData.light) camera.remove(muzzleFlash.userData.light);
    }
    const geo = new THREE.SphereGeometry(0.06, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffaa22, transparent: true, opacity: 0 });
    muzzleFlash = new THREE.Mesh(geo, mat);
    muzzleFlash.position.set(0.25, -0.18, -0.85);
    camera.add(muzzleFlash);

    const flashLight = new THREE.PointLight(0xffaa22, 0, 10);
    flashLight.position.copy(muzzleFlash.position);
    muzzleFlash.userData.light = flashLight;
    camera.add(flashLight);
}

// ---- SHOOT ----
function shoot() {
    if (!player.alive || player.reloading) return;
    const w = player.weapons[player.weaponIndex];
    const now = performance.now();
    if (now - player.lastShot < w.fireRate) return;
    if (w.ammo <= 0) { reload(); return; }

    player.lastShot = now;
    w.ammo--;
    weaponRecoil = 0.04;

    // Camera recoil
    player.pitch += w.recoilPitch * (0.8 + Math.random() * 0.4);
    player.yaw += (Math.random() - 0.5) * w.recoilYaw;
    // Camera shake
    player.shakeX = (Math.random() - 0.5) * w.shakeAmt;
    player.shakeY = (Math.random() - 0.5) * w.shakeAmt;
    player.shakeDecay = 0.15;

    muzzleFlashTime = 0.06;
    muzzleFlash.material.opacity = 1;
    muzzleFlash.userData.light.intensity = 4;

    // Sound
    playSound('shoot', 1.0);

    // Shell casing
    ejectCasing();

    const pellets = w.pellets || 1;
    for (let p = 0; p < pellets; p++) {
        _dir.set(0, 0, -1);
        _dir.x += (Math.random() - 0.5) * w.spread * 2;
        _dir.y += (Math.random() - 0.5) * w.spread * 2;
        _dir.applyQuaternion(camera.quaternion);
        _dir.normalize();

        let closestDist = w.range;
        let hitEnemy = null;

        for (let i = 0, len = enemies.length; i < len; i++) {
            const enemy = enemies[i];
            if (!enemy.alive) continue;
            _v1.set(enemy.group.position.x, enemy.group.position.y + 1, enemy.group.position.z);
            _v2.copy(_v1).sub(camera.position);
            const proj = _v2.dot(_dir);
            if (proj < 0 || proj > closestDist) continue;
            _v3.copy(camera.position).addScaledVector(_dir, proj);
            const hitDist = _v3.distanceTo(_v1);
            if (hitDist < 1.0) {
                closestDist = proj;
                hitEnemy = enemy;
            }
        }

        if (hitEnemy) {
            hitEnemy.hp -= w.damage;
            showHitMarker();
            _v1.copy(camera.position).addScaledVector(_dir, closestDist);
            spawnImpact(_v1.x, _v1.y, _v1.z, 0xff4444);
            playSound('impact', 0.5);
            // Check headshot (hit point above 1.6 is head area)
            const hitY = _v1.y;
            const enemyBaseY = hitEnemy.group.position.y;
            const isHeadshot = hitY > enemyBaseY + 1.6;
            if (isHeadshot) {
                hitEnemy.hp -= w.damage * 0.5; // extra headshot damage
                showHeadshot();
            }

            if (hitEnemy.hp <= 0) {
                hitEnemy.alive = false;
                const killScore = isHeadshot ? Math.round(hitEnemy.score * 1.5) : hitEnemy.score;
                score += killScore;
                kills++;
                const gp = hitEnemy.group.position;
                spawnExplosion(gp.x, gp.y + 1, gp.z);
                playSound('explosion', 0.8);
                showKillFeed(hitEnemy.type, w.name, killScore);
                spawnDeathEffect(hitEnemy);
                disposeEnemyGroup(hitEnemy);
            }
        } else {
            _v1.copy(camera.position).addScaledVector(_dir, closestDist * 0.95);
            spawnImpact(_v1.x, _v1.y, _v1.z, 0xffcc44);
            playSound('impact', 0.3);
        }

        createTracer(closestDist);
    }
}

// ---- SHELL CASINGS ----
function ejectCasing() {
    if (shellCasings.length >= CFG.MAX_CASINGS) {
        const old = shellCasings[0];
        scene.remove(old.mesh);
        shellCasings[0] = shellCasings[shellCasings.length - 1];
        shellCasings.length--;
    }
    const casing = new THREE.Mesh(POOL.casingGeo, POOL.casingMat);
    // Position near weapon ejection port
    _v1.set(0.3, -0.15, -0.4);
    _v1.applyQuaternion(camera.quaternion);
    _v1.add(camera.position);
    casing.position.copy(_v1);
    casing.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    scene.add(casing);

    // Eject velocity (to the right of camera)
    _v2.set(3 + Math.random() * 2, 2 + Math.random() * 2, (Math.random() - 0.5) * 2);
    _v2.applyQuaternion(camera.quaternion);

    shellCasings.push({
        mesh: casing,
        vx: _v2.x, vy: _v2.y, vz: _v2.z,
        life: 2.0,
        rotSpeed: (Math.random() - 0.5) * 15,
    });
}

// ---- DEATH EFFECT (enemy falls over) ----
function spawnDeathEffect(enemy) {
    // Spawn some blood-like particles and a "body" that falls
    const gp = enemy.group.position;
    const colors = [0x882222, 0x663333, 0x444444];
    const count = Math.min(6, CFG.MAX_PARTICLES - particles.length);
    for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(POOL.particleGeo, getParticleMat(colors[i % 3]));
        mesh.position.set(gp.x, gp.y + 1, gp.z);
        scene.add(mesh);
        particles.push({
            mesh,
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * 2 + 1,
            vz: (Math.random() - 0.5) * 3,
            life: 0.5 + Math.random() * 0.3,
        });
    }
}

// ---- TRACER ----
function createTracer(length) {
    if (bullets.length >= CFG.MAX_TRACERS) {
        const old = bullets[0];
        scene.remove(old.mesh);
        old.mesh.geometry.dispose();
        bullets[0] = bullets[bullets.length - 1];
        bullets.length--;
    }

    const start = _v2.copy(camera.position).addScaledVector(_dir, 1);
    const end = _v3.copy(camera.position).addScaledVector(_dir, length);
    const geo = new THREE.BufferGeometry().setFromPoints([start.clone(), end.clone()]);
    const line = new THREE.Line(geo, POOL.tracerMat);
    scene.add(line);
    bullets.push({ mesh: line, life: 0.08 });
}

// ---- HIT MARKER ----
let _hitMarkerTimeout = 0;
function showHitMarker() {
    DOM.hitMarker.style.opacity = '1';
    safeClearTimeout(_hitMarkerTimeout);
    _hitMarkerTimeout = safeTimeout(() => { DOM.hitMarker.style.opacity = '0'; }, 120);
}

// ---- PARTICLES ----
function spawnImpact(x, y, z, color) {
    const count = Math.min(4, CFG.MAX_PARTICLES - particles.length);
    for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(POOL.particleGeo, getParticleMat(color));
        mesh.position.set(x, y, z);
        scene.add(mesh);
        particles.push({
            mesh,
            vx: (Math.random() - 0.5) * 5,
            vy: Math.random() * 3,
            vz: (Math.random() - 0.5) * 5,
            life: 0.2 + Math.random() * 0.15,
        });
    }
}

function spawnExplosion(x, y, z) {
    const count = Math.min(8, CFG.MAX_PARTICLES - particles.length);
    const colors = [0xff4422, 0xff8844, 0xffcc44, 0x888888, 0x555555];
    for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(POOL.particleGeo, getParticleMat(colors[i % 5]));
        mesh.position.set(x, y, z);
        scene.add(mesh);
        particles.push({
            mesh,
            vx: (Math.random() - 0.5) * 9,
            vy: Math.random() * 7 + 2,
            vz: (Math.random() - 0.5) * 9,
            life: 0.4 + Math.random() * 0.35,
        });
    }
}

// ---- ENEMY ----
function createEnemy(x, z, type) {
    const cfg = CFG.ENEMY[type];
    const group = new THREE.Group();
    const tunicMat = POOL.enemyTunicMats[type];
    const pantsMat = POOL.enemyPantsMats[type];

    // Torso (Feldgrau tunic)
    const torso = new THREE.Mesh(POOL.enemyTorsoGeo, tunicMat);
    torso.position.y = 1.1; torso.castShadow = true;
    group.add(torso);

    // Collar detail
    const collar = new THREE.Mesh(POOL.enemyCollarGeo, tunicMat);
    collar.position.y = 1.58;
    group.add(collar);

    // Leather belt with buckle
    const belt = new THREE.Mesh(POOL.enemyBeltGeo, POOL.enemyBeltMat);
    belt.position.y = 0.72;
    group.add(belt);

    const head = new THREE.Mesh(POOL.enemyHeadGeo, MAT.enemyHead);
    head.position.y = 1.8;
    group.add(head);

    // Stahlhelm
    const helmet = new THREE.Mesh(POOL.enemyHelmetGeo, MAT.helmet);
    helmet.position.y = 1.85;
    group.add(helmet);

    // Legs (pants in darker Feldgrau)
    for (const sx of [-0.15, 0.15]) {
        const leg = new THREE.Mesh(POOL.enemyLegGeo, pantsMat);
        leg.position.set(sx, 0.35, 0);
        group.add(leg);
    }

    // Marching boots (Marschstiefel)
    for (const sx of [-0.15, 0.15]) {
        const boot = new THREE.Mesh(POOL.enemyBootGeo, POOL.enemyBootMat);
        boot.position.set(sx, 0.05, 0.02);
        group.add(boot);
    }

    // Arms (tunic sleeves)
    for (const sx of [-0.4, 0.4]) {
        const arm = new THREE.Mesh(POOL.enemyArmGeo, tunicMat);
        arm.position.set(sx, 1.1, 0);
        group.add(arm);
    }

    const gun = new THREE.Mesh(POOL.enemyGunGeo, MAT.darkMetal);
    gun.position.set(0.35, 1.0, -0.25);
    group.add(gun);

    group.position.set(x, 0, z);
    scene.add(group);

    return {
        group, type,
        hp: cfg.hp, maxHp: cfg.hp,
        speed: cfg.speed, damage: cfg.damage,
        fireRate: cfg.fireRate, range: cfg.range,
        detectRange: cfg.detectRange, score: cfg.score,
        alive: true, lastShot: 0, state: 'patrol',
        patrolTarget: { x: x + (Math.random() - 0.5) * 20, z: z + (Math.random() - 0.5) * 20 },
        // AI: strafe state
        strafeDir: Math.random() > 0.5 ? 1 : -1,
        strafeTimer: 0,
        // Cover seeking
        seekingCover: false,
    };
}

function disposeEnemyGroup(enemy) {
    scene.remove(enemy.group);
    enemy.group.clear();
}

// ---- ALLY ----
function createAlly(x, z, role) {
    const cfg = CFG.ALLY[role];
    const group = new THREE.Group();
    const tunicMat = POOL.allyTunicMats[role];
    const pantsMat = POOL.allyPantsMats[role];

    // Torso
    const torso = new THREE.Mesh(POOL.enemyTorsoGeo, tunicMat);
    torso.position.y = 1.1; torso.castShadow = true;
    group.add(torso);

    // Collar
    const collar = new THREE.Mesh(POOL.enemyCollarGeo, tunicMat);
    collar.position.y = 1.58;
    group.add(collar);

    // Belt
    const belt = new THREE.Mesh(POOL.enemyBeltGeo, POOL.allyBeltMat);
    belt.position.y = 0.72;
    group.add(belt);

    // Head
    const head = new THREE.Mesh(POOL.enemyHeadGeo, MAT.enemyHead);
    head.position.y = 1.8;
    group.add(head);

    // M1 Helmet (olive)
    const helmet = new THREE.Mesh(POOL.enemyHelmetGeo, MAT.allyHelmet);
    helmet.position.y = 1.85;
    group.add(helmet);

    // Legs — children index 5, 6
    for (const sx of [-0.15, 0.15]) {
        const leg = new THREE.Mesh(POOL.enemyLegGeo, pantsMat);
        leg.position.set(sx, 0.35, 0);
        group.add(leg);
    }

    // Boots
    for (const sx of [-0.15, 0.15]) {
        const boot = new THREE.Mesh(POOL.enemyBootGeo, POOL.allyBootMat);
        boot.position.set(sx, 0.05, 0.02);
        group.add(boot);
    }

    // Arms
    for (const sx of [-0.4, 0.4]) {
        const arm = new THREE.Mesh(POOL.enemyArmGeo, tunicMat);
        arm.position.set(sx, 1.1, 0);
        group.add(arm);
    }

    // Gun
    const gun = new THREE.Mesh(POOL.enemyGunGeo, MAT.darkMetal);
    gun.position.set(0.35, 1.0, -0.25);
    group.add(gun);

    group.position.set(x, 0, z);
    scene.add(group);

    return {
        group, role,
        hp: cfg.hp, maxHp: cfg.hp,
        speed: cfg.speed, damage: cfg.damage,
        fireRate: cfg.fireRate, range: cfg.range,
        detectRange: cfg.detectRange,
        alive: true, lastShot: 0, state: 'follow',
        strafeDir: Math.random() > 0.5 ? 1 : -1,
        strafeTimer: 0,
        healRate: cfg.healRate || 0,
        healRange: cfg.healRange || 0,
        lastHeal: 0,
    };
}

function disposeAllyGroup(ally) {
    scene.remove(ally.group);
    ally.group.clear();
}

function updateAlly(ally, dt) {
    if (!ally.alive) return;

    const ax = ally.group.position.x;
    const az = ally.group.position.z;
    const dpx = player.x - ax;
    const dpz = player.z - az;
    const distToPlayer = Math.sqrt(dpx * dpx + dpz * dpz);

    // Find nearest alive enemy within detectRange
    let nearestEnemy = null;
    let nearestEnemyDist = Infinity;
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.alive) continue;
        const edx = e.group.position.x - ax;
        const edz = e.group.position.z - az;
        const ed = Math.sqrt(edx * edx + edz * edz);
        if (ed < ally.detectRange && ed < nearestEnemyDist) {
            nearestEnemyDist = ed;
            nearestEnemy = e;
        }
    }

    // State determination
    if (distToPlayer > 25) {
        ally.state = 'regroup';
    } else if (nearestEnemy) {
        ally.state = 'engage';
    } else {
        ally.state = 'follow';
    }

    const spd = ally.speed * dt;
    let mx = 0, mz = 0;

    if (ally.state === 'regroup') {
        const angle = Math.atan2(dpx, dpz);
        mx = Math.sin(angle) * spd;
        mz = Math.cos(angle) * spd;
        ally.group.rotation.y = angle;
    } else if (ally.state === 'engage' && nearestEnemy) {
        const tex = nearestEnemy.group.position.x - ax;
        const tez = nearestEnemy.group.position.z - az;
        const angleToEnemy = Math.atan2(tex, tez);
        ally.group.rotation.y = angleToEnemy;

        if (nearestEnemyDist > ally.range * 0.6) {
            // Move toward enemy
            mx = Math.sin(angleToEnemy) * spd;
            mz = Math.cos(angleToEnemy) * spd;
        } else {
            // Strafe while in range
            ally.strafeTimer -= dt;
            if (ally.strafeTimer <= 0) {
                ally.strafeDir *= -1;
                ally.strafeTimer = 1.5 + Math.random() * 2;
            }
            const strafeAngle = angleToEnemy + Math.PI / 2 * ally.strafeDir;
            mx = Math.sin(strafeAngle) * spd * 0.4;
            mz = Math.cos(strafeAngle) * spd * 0.4;
        }

        // Shoot at enemy
        const now = performance.now();
        if (now - ally.lastShot > ally.fireRate && nearestEnemyDist <= ally.range) {
            ally.lastShot = now;
            const hitChance = Math.max(0.15, 1 - nearestEnemyDist / ally.range) * 0.7; // 0.7x accuracy
            if (Math.random() < hitChance) {
                nearestEnemy.hp -= ally.damage;
                const ep = nearestEnemy.group.position;
                spawnImpact(ep.x, 1, ep.z, 0xff4444);

                if (nearestEnemy.hp <= 0) {
                    nearestEnemy.alive = false;
                    const killScore = Math.round(nearestEnemy.score * 0.5);
                    score += killScore;
                    kills++;
                    spawnExplosion(ep.x, ep.y + 1, ep.z);
                    playSound('explosion', 0.8);
                    showKillFeed(nearestEnemy.type, 'Ally', killScore);
                    spawnDeathEffect(nearestEnemy);
                    disposeEnemyGroup(nearestEnemy);
                }
            }
            playSound('enemyShoot', 0.5, ax, 0, az);
            spawnImpact(
                ax + Math.sin(ally.group.rotation.y) * 0.8,
                1.0,
                az + Math.cos(ally.group.rotation.y) * 0.8,
                0xffaa22
            );
        }
    } else if (ally.state === 'follow') {
        if (distToPlayer > 10) {
            const angle = Math.atan2(dpx, dpz);
            mx = Math.sin(angle) * spd;
            mz = Math.cos(angle) * spd;
            ally.group.rotation.y = angle;
        } else if (distToPlayer > 5) {
            const angle = Math.atan2(dpx, dpz);
            mx = Math.sin(angle) * spd * 0.5;
            mz = Math.cos(angle) * spd * 0.5;
            ally.group.rotation.y = angle;
        }
        // Idle when within 5 units
    }

    // Apply movement with collision
    let nx = ax + mx, nz = az + mz;
    const res = resolveCollision(nx, nz, 0.5);
    ally.group.position.x = Math.max(-CFG.MAP_SIZE + 1, Math.min(CFG.MAP_SIZE - 1, res.x));
    ally.group.position.z = Math.max(-CFG.MAP_SIZE + 1, Math.min(CFG.MAP_SIZE - 1, res.z));

    // Leg animation (same child indices as enemies: 5=left leg, 6=right leg)
    const isMoving = Math.abs(mx) > 0.001 || Math.abs(mz) > 0.001;
    if (isMoving) {
        const legPhase = performance.now() * 0.006;
        const children = ally.group.children;
        if (children[5]) children[5].position.z = Math.sin(legPhase) * 0.15;
        if (children[6]) children[6].position.z = -Math.sin(legPhase) * 0.15;
        if (children[9]) children[9].rotation.x = Math.sin(legPhase) * 0.2;
        if (children[10]) children[10].rotation.x = -Math.sin(legPhase) * 0.2;
    }

    // Medic healing
    if (ally.healRate > 0) {
        const now = performance.now();
        if (now - ally.lastHeal > 1000) {
            ally.lastHeal = now;
            // Heal player if nearby and hurt
            if (distToPlayer <= ally.healRange && player.hp < player.maxHp && player.alive) {
                player.hp = Math.min(player.maxHp, player.hp + ally.healRate);
            }
            // Heal nearby allies
            for (let i = 0; i < allies.length; i++) {
                const other = allies[i];
                if (!other.alive || other === ally) continue;
                const odx = other.group.position.x - ax;
                const odz = other.group.position.z - az;
                const od = Math.sqrt(odx * odx + odz * odz);
                if (od <= ally.healRange && other.hp < other.maxHp) {
                    other.hp = Math.min(other.maxHp, other.hp + ally.healRate);
                }
            }
        }
    }
}

function updateEnemy(enemy, dt) {
    if (!enemy.alive) return;

    const ex = enemy.group.position.x;
    const ez = enemy.group.position.z;
    const dx = player.x - ex;
    const dz = player.z - ez;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const angleToPlayer = Math.atan2(dx, dz);

    // Find nearest alive ally
    let nearestAlly = null;
    let nearestAllyDist = Infinity;
    for (let i = 0; i < allies.length; i++) {
        const a = allies[i];
        if (!a.alive) continue;
        const adx = a.group.position.x - ex;
        const adz = a.group.position.z - ez;
        const ad = Math.sqrt(adx * adx + adz * adz);
        if (ad < nearestAllyDist) {
            nearestAllyDist = ad;
            nearestAlly = a;
        }
    }

    // Choose target: player or nearest ally (whichever is closer)
    let targetIsAlly = false;
    let targetDist = dist;
    let targetX = player.x;
    let targetZ = player.z;
    if (nearestAlly && nearestAllyDist < dist) {
        targetIsAlly = true;
        targetDist = nearestAllyDist;
        targetX = nearestAlly.group.position.x;
        targetZ = nearestAlly.group.position.z;
    }
    const tdx = targetX - ex;
    const tdz = targetZ - ez;
    const angleToTarget = Math.atan2(tdx, tdz);

    if (targetDist < enemy.range) {
        enemy.state = 'attack';
    } else if (targetDist < enemy.detectRange) {
        enemy.state = 'chase';
    } else {
        enemy.state = 'patrol';
    }

    const spd = enemy.speed * dt;
    let mx = 0, mz = 0;

    if (enemy.state === 'chase' || (enemy.state === 'attack' && targetDist > enemy.range * 0.5)) {
        mx = Math.sin(angleToTarget) * spd;
        mz = Math.cos(angleToTarget) * spd;
        enemy.group.rotation.y = angleToTarget;
    } else if (enemy.state === 'attack') {
        enemy.group.rotation.y = angleToTarget;

        // Strafe while attacking (more realistic)
        enemy.strafeTimer -= dt;
        if (enemy.strafeTimer <= 0) {
            enemy.strafeDir *= -1;
            enemy.strafeTimer = 1.5 + Math.random() * 2;
        }
        const strafeAngle = angleToTarget + Math.PI / 2 * enemy.strafeDir;
        mx = Math.sin(strafeAngle) * spd * 0.4;
        mz = Math.cos(strafeAngle) * spd * 0.4;
    } else {
        const ptDx = enemy.patrolTarget.x - ex;
        const ptDz = enemy.patrolTarget.z - ez;
        const ptDist = Math.sqrt(ptDx * ptDx + ptDz * ptDz);
        if (ptDist < 2) {
            enemy.patrolTarget.x = (Math.random() - 0.5) * CFG.MAP_SIZE * 1.2;
            enemy.patrolTarget.z = (Math.random() - 0.5) * CFG.MAP_SIZE * 1.2;
        } else {
            const pa = Math.atan2(ptDx, ptDz);
            mx = Math.sin(pa) * spd * 0.5;
            mz = Math.cos(pa) * spd * 0.5;
            enemy.group.rotation.y = pa;
        }
    }

    let nx = ex + mx, nz = ez + mz;
    const res = resolveCollision(nx, nz, 0.5);
    enemy.group.position.x = Math.max(-CFG.MAP_SIZE + 1, Math.min(CFG.MAP_SIZE - 1, res.x));
    enemy.group.position.z = Math.max(-CFG.MAP_SIZE + 1, Math.min(CFG.MAP_SIZE - 1, res.z));

    // Leg animation
    if (enemy.state !== 'attack' || targetDist > enemy.range * 0.5) {
        const legPhase = performance.now() * 0.006;
        const children = enemy.group.children;
        if (children[3]) children[3].position.z = Math.sin(legPhase) * 0.15;
        if (children[4]) children[4].position.z = -Math.sin(legPhase) * 0.15;
        // Arm swing too
        if (children[5]) children[5].rotation.x = Math.sin(legPhase) * 0.2;
        if (children[6]) children[6].rotation.x = -Math.sin(legPhase) * 0.2;
    }

    // Shoot at target (player or ally)
    if (enemy.state === 'attack' && (player.alive || (targetIsAlly && nearestAlly && nearestAlly.alive))) {
        const now = performance.now();
        if (now - enemy.lastShot > enemy.fireRate) {
            enemy.lastShot = now;
            const hitChance = Math.max(0.15, 1 - targetDist / enemy.range);
            if (Math.random() < hitChance) {
                if (targetIsAlly && nearestAlly && nearestAlly.alive) {
                    nearestAlly.hp -= enemy.damage;
                    if (nearestAlly.hp <= 0) {
                        nearestAlly.alive = false;
                        const gp = nearestAlly.group.position;
                        spawnDeathEffect({ group: nearestAlly.group });
                        disposeAllyGroup(nearestAlly);
                    }
                } else {
                    player.hp -= enemy.damage;
                    player.lastDamageTime = performance.now();
                    showDamageVignette();
                    playSound('hit', 1.0);
                    player.shakeX = (Math.random() - 0.5) * 0.02;
                    player.shakeY = (Math.random() - 0.5) * 0.02;
                    player.shakeDecay = 0.2;
                    if (player.hp <= 0) { player.hp = 0; player.alive = false; }
                }
            }
            playSound('enemyShoot', 0.6, ex, 0, ez);
            spawnImpact(
                ex + Math.sin(angleToTarget) * 0.8,
                1.0,
                ez + Math.cos(angleToTarget) * 0.8,
                0xffaa22
            );
        }
    }
}

let _vignetteTimeout = 0;
function showDamageVignette() {
    DOM.damageVignette.style.opacity = '1';
    safeClearTimeout(_vignetteTimeout);
    _vignetteTimeout = safeTimeout(() => { DOM.damageVignette.style.opacity = '0'; }, 200);
}

// ---- AEROPLANE SYSTEM ----
function createAeroplane() {
    const group = new THREE.Group();

    // Fuselage
    const fuselage = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 8), MAT.planeMetal);
    fuselage.castShadow = true;
    group.add(fuselage);

    // Wings
    const wing = new THREE.Mesh(new THREE.BoxGeometry(12, 0.15, 2.5), MAT.planeWing);
    wing.position.y = 0.1;
    wing.castShadow = true;
    group.add(wing);

    // Tail vertical fin
    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 1.2), MAT.planeWing);
    tailFin.position.set(0, 0.7, 3.5);
    group.add(tailFin);

    // Tail horizontal stabilizer
    const tailH = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 1), MAT.planeWing);
    tailH.position.set(0, 0.1, 3.5);
    group.add(tailH);

    // Nose cone
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 6), MAT.planeMetal);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0, -4.5);
    group.add(nose);

    // Engine cowling
    const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.6, 8), MAT.darkMetal);
    cowl.rotation.x = Math.PI / 2;
    cowl.position.set(0, 0, -3.8);
    group.add(cowl);

    // Propeller disc (spinning visual)
    const propGeo = new THREE.CircleGeometry(1.2, 16);
    const propMat = new THREE.MeshBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
    const prop = new THREE.Mesh(propGeo, propMat);
    prop.position.set(0, 0, -5.2);
    group.add(prop);

    // Random flight direction across battlefield
    const side = Math.random() > 0.5 ? 1 : -1;
    const startX = side * (CFG.MAP_SIZE + 40);
    const endX = -side * (CFG.MAP_SIZE + 40);
    const startZ = (Math.random() - 0.5) * CFG.MAP_SIZE;
    const altitude = 35 + Math.random() * 20;
    const speed = 25 + Math.random() * 15;

    group.position.set(startX, altitude, startZ);
    // Point toward destination
    const angle = Math.atan2(endX - startX, 0);
    group.rotation.y = angle;
    // Slight bank
    group.rotation.z = side * 0.05;

    scene.add(group);

    return {
        group,
        vx: -side * speed,
        vz: (Math.random() - 0.5) * 3,
        endX,
        alive: true,
        nextBomb: performance.now() + 1500 + Math.random() * 3000,
        bombsLeft: 1 + Math.floor(Math.random() * 2),
        propMat,
    };
}

function updateAeroplanes(dt) {
    const now = performance.now();

    // Update bombs (write-index compaction)
    {
        let w = 0;
        for (let i = 0; i < bombs.length; i++) {
            const b = bombs[i];
            b.mesh.position.x += b.vx * dt;
            b.mesh.position.y += b.vy * dt;
            b.mesh.position.z += b.vz * dt;
            b.vy -= 12 * dt;
            b.mesh.rotation.x += dt * 3;

            if (b.mesh.position.y <= 0.2) {
                // BOOM — bomb explodes on ground
                const bx = b.mesh.position.x;
                const bz = b.mesh.position.z;
                scene.remove(b.mesh);

                spawnExplosion(bx, 1, bz);
                playSound('explosion', 1.0);

                // Camera shake if player is close
                const distToPlayer = Math.sqrt((bx - player.x) ** 2 + (bz - player.z) ** 2);
                if (distToPlayer < 25) {
                    const shakeScale = 1 - distToPlayer / 25;
                    player.shakeX = (Math.random() - 0.5) * 0.08 * shakeScale;
                    player.shakeY = (Math.random() - 0.5) * 0.08 * shakeScale;
                    player.shakeDecay = 0.5;
                }
                // Damage player if close
                if (distToPlayer < 12) {
                    const dmg = Math.round(40 * (1 - distToPlayer / 12));
                    player.hp -= dmg;
                    player.lastDamageTime = now;
                    showDamageVignette();
                    playSound('hit', 1.0);
                    if (player.hp <= 0) { player.hp = 0; player.alive = false; }
                }
                // Damage enemies in radius
                for (let j = 0; j < enemies.length; j++) {
                    const e = enemies[j];
                    if (!e.alive) continue;
                    const eDist = Math.sqrt((bx - e.group.position.x) ** 2 + (bz - e.group.position.z) ** 2);
                    if (eDist < 12) {
                        const dmg = Math.round(60 * (1 - eDist / 12));
                        e.hp -= dmg;
                        if (e.hp <= 0) {
                            e.alive = false;
                            score += Math.round(e.score * 0.3);
                            kills++;
                            spawnExplosion(e.group.position.x, 1, e.group.position.z);
                            showKillFeed(e.type, 'Bomb', Math.round(e.score * 0.3));
                            spawnDeathEffect(e);
                            disposeEnemyGroup(e);
                        }
                    }
                }
                // Damage allies in radius
                for (let j = 0; j < allies.length; j++) {
                    const a = allies[j];
                    if (!a.alive) continue;
                    const aDist = Math.sqrt((bx - a.group.position.x) ** 2 + (bz - a.group.position.z) ** 2);
                    if (aDist < 12) {
                        const dmg = Math.round(40 * (1 - aDist / 12));
                        a.hp -= dmg;
                        if (a.hp <= 0) {
                            a.alive = false;
                            spawnDeathEffect({ group: a.group });
                            disposeAllyGroup(a);
                        }
                    }
                }
            } else {
                bombs[w++] = b;
            }
        }
        bombs.length = w;
    }

    // Update planes
    {
        let w = 0;
        for (let i = 0; i < aeroplanes.length; i++) {
            const p = aeroplanes[i];
            p.group.position.x += p.vx * dt;
            p.group.position.z += p.vz * dt;

            // Slight wobble for realism
            p.group.rotation.z = Math.sin(now * 0.001 + i) * 0.03;

            // Engine drone (throttled)
            if (!p.lastEngine || now - p.lastEngine > 800) {
                p.lastEngine = now;
                playSound('planeEngine', 0.6, p.group.position.x, 0, p.group.position.z);
            }

            // Drop bombs while over the battlefield
            if (p.bombsLeft > 0 && now > p.nextBomb) {
                const px = p.group.position.x;
                const pz = p.group.position.z;
                if (Math.abs(px) < CFG.MAP_SIZE && Math.abs(pz) < CFG.MAP_SIZE) {
                    p.nextBomb = now + 1500 + Math.random() * 2000;
                    p.bombsLeft--;

                    // Create bomb
                    const bombMesh = new THREE.Mesh(POOL.grenadeGeo, MAT.darkMetal);
                    bombMesh.scale.set(3, 3, 4);
                    bombMesh.position.copy(p.group.position);
                    scene.add(bombMesh);
                    bombs.push({
                        mesh: bombMesh,
                        vx: p.vx * 0.5,
                        vy: -2,
                        vz: p.vz * 0.5,
                    });

                    // Bomb whistle sound
                    playSound('bombWhistle', 0.8, px, 0, pz);
                }
            }

            // Remove once off the map
            const absX = Math.abs(p.group.position.x);
            if (absX > CFG.MAP_SIZE + 60) {
                scene.remove(p.group);
                p.propMat.dispose();
                p.alive = false;
            } else {
                aeroplanes[w++] = p;
            }
        }
        aeroplanes.length = w;
    }
}

function spawnAeroplaneWave() {
    if (aeroplanes.length >= 2) return; // cap active planes
    aeroplanes.push(createAeroplane());
}

// ---- ALLY SPAWNING ----
function spawnAllies() {
    const roles = ['rifleman', 'rifleman', 'support', 'medic'];
    const count = Math.min(roles.length, CFG.MAX_ALLIES);
    for (let i = 0; i < count; i++) {
        const angle = Math.PI + (i / count) * Math.PI - Math.PI / 2; // semicircle behind player
        const dist = 4 + Math.random() * 2;
        const sx = player.x + Math.sin(player.yaw + angle) * dist;
        const sz = player.z + Math.cos(player.yaw + angle) * dist;
        const cx = Math.max(-CFG.MAP_SIZE + 5, Math.min(CFG.MAP_SIZE - 5, sx));
        const cz = Math.max(-CFG.MAP_SIZE + 5, Math.min(CFG.MAP_SIZE - 5, sz));
        allies.push(createAlly(cx, cz, roles[i]));
    }
}

function reinforceAllies() {
    // Respawn up to 2 dead allies per wave
    let respawned = 0;
    const roles = ['rifleman', 'rifleman', 'support', 'medic'];
    let aliveCount = 0;
    for (let j = 0; j < allies.length; j++) if (allies[j].alive) aliveCount++;
    const maxToSpawn = Math.min(2, CFG.MAX_ALLIES - aliveCount);
    for (let i = 0; i < maxToSpawn && respawned < 2; i++) {
        const angle = Math.PI + Math.random() * Math.PI;
        const dist = 5 + Math.random() * 3;
        const sx = player.x + Math.sin(player.yaw + angle) * dist;
        const sz = player.z + Math.cos(player.yaw + angle) * dist;
        const cx = Math.max(-CFG.MAP_SIZE + 5, Math.min(CFG.MAP_SIZE - 5, sx));
        const cz = Math.max(-CFG.MAP_SIZE + 5, Math.min(CFG.MAP_SIZE - 5, sz));
        const role = roles[Math.floor(Math.random() * roles.length)];
        allies.push(createAlly(cx, cz, role));
        respawned++;
    }
}

// ---- WAVE SYSTEM ----
function nextWave() {
    wave++;
    waveActive = true;

    // Replenish grenades each wave
    grenadeInventory = Math.min(MAX_GRENADES_INVENTORY, grenadeInventory + 2);

    // Reinforce dead allies
    if (wave > 1) reinforceAllies();

    // Aeroplane bombing run every wave (starting wave 2)
    if (wave >= 2) {
        safeTimeout(() => { if (gameRunning) spawnAeroplaneWave(); }, 2000 + Math.random() * 3000);
    }

    DOM.waveBanner.textContent = `WAVE ${wave}`;
    DOM.waveBanner.style.opacity = '1';
    safeTimeout(() => { DOM.waveBanner.style.opacity = '0'; }, 2500);

    const count = Math.min(4 + wave * 3, CFG.MAX_ENEMIES - enemies.length);
    for (let i = 0; i < count; i++) {
        let ex, ez, attempts = 0;
        do {
            // Enemies spawn from the north (enemy) side of the battlefield
            ex = (Math.random() - 0.5) * CFG.MAP_SIZE * 1.2;
            ez = -30 - Math.random() * 40; // behind enemy trenches
            ex = Math.max(-CFG.MAP_SIZE + 5, Math.min(CFG.MAP_SIZE - 5, ex));
            ez = Math.max(-CFG.MAP_SIZE + 5, Math.min(CFG.MAP_SIZE - 5, ez));
            attempts++;
        } while (checkCollision(ex, ez, 1.5) && attempts < 30);

        let type = 'grunt';
        if (wave >= 3 && Math.random() < 0.25) type = 'sniper';
        if (wave >= 5 && Math.random() < 0.15) type = 'brute';

        enemies.push(createEnemy(ex, ez, type));
    }
}

// ---- GRENADE ----
function throwGrenade() {
    if (!player || !player.alive || !gameRunning || (!pointerLocked && !IS_TOUCH)) return;
    if (grenadeInventory <= 0) return;
    if (grenades.length >= CFG.MAX_GRENADES_ACTIVE) return;
    grenadeInventory--;

    const mesh = new THREE.Mesh(POOL.grenadeGeo, POOL.grenadeMat);
    mesh.position.copy(camera.position);
    scene.add(mesh);

    // Throw direction (forward + up arc)
    _dir.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    const throwSpeed = 18;
    grenades.push({
        mesh,
        vx: _dir.x * throwSpeed,
        vy: _dir.y * throwSpeed + 5,
        vz: _dir.z * throwSpeed,
        life: 2.5, // fuse time
        bounced: false,
    });

    playSound('reload', 0.5); // click sound for throw
}

function updateGrenades(dt) {
    let w = 0;
    for (let i = 0; i < grenades.length; i++) {
        const g = grenades[i];
        g.life -= dt;
        g.mesh.position.x += g.vx * dt;
        g.mesh.position.y += g.vy * dt;
        g.mesh.position.z += g.vz * dt;
        g.vy -= 15 * dt;
        g.mesh.rotation.x += dt * 8;

        // Bounce on ground
        if (g.mesh.position.y < 0.1) {
            g.mesh.position.y = 0.1;
            g.vy *= -0.3;
            g.vx *= 0.7;
            g.vz *= 0.7;
        }

        if (g.life <= 0) {
            // Explode
            const gx = g.mesh.position.x;
            const gy = g.mesh.position.y;
            const gz = g.mesh.position.z;
            scene.remove(g.mesh);

            // Big explosion
            spawnExplosion(gx, gy + 0.5, gz);
            spawnExplosion(gx + 0.5, gy, gz + 0.5);
            playSound('explosion', 1.0);

            // Camera shake if close
            const distToPlayer = Math.sqrt((gx - player.x) ** 2 + (gz - player.z) ** 2);
            if (distToPlayer < 15) {
                const shakeScale = 1 - distToPlayer / 15;
                player.shakeX = (Math.random() - 0.5) * 0.06 * shakeScale;
                player.shakeY = (Math.random() - 0.5) * 0.06 * shakeScale;
                player.shakeDecay = 0.4;
            }
            // Damage player if close
            if (distToPlayer < 8) {
                const dmg = Math.round(50 * (1 - distToPlayer / 8));
                player.hp -= dmg;
                player.lastDamageTime = performance.now();
                showDamageVignette();
                playSound('hit', 1.0);
                if (player.hp <= 0) { player.hp = 0; player.alive = false; }
            }

            // Damage enemies in radius
            for (let j = 0; j < enemies.length; j++) {
                const e = enemies[j];
                if (!e.alive) continue;
                const ex = e.group.position.x;
                const ez = e.group.position.z;
                const eDist = Math.sqrt((gx - ex) ** 2 + (gz - ez) ** 2);
                if (eDist < 10) {
                    const dmg = Math.round(80 * (1 - eDist / 10));
                    e.hp -= dmg;
                    spawnImpact(ex, 1, ez, 0xff4444);
                    if (e.hp <= 0) {
                        e.alive = false;
                        score += e.score;
                        kills++;
                        spawnExplosion(ex, 1, ez);
                        showKillFeed(e.type, 'Grenade', e.score);
                        spawnDeathEffect(e);
                        disposeEnemyGroup(e);
                    }
                }
            }
        } else {
            grenades[w++] = g;
        }
    }
    grenades.length = w;
}

// ---- KILL FEED ----
function showKillFeed(enemyType, weaponName, scoreVal) {
    const entry = document.createElement('div');
    entry.className = 'kill-entry';
    entry.innerHTML = `Killed <b>${enemyType.toUpperCase()}</b> <span class="kill-weapon">[${weaponName}]</span><span class="kill-score">+${scoreVal}</span>`;
    DOM.killFeed.appendChild(entry);
    // Remove after animation
    safeTimeout(() => { if (entry.parentNode) entry.parentNode.removeChild(entry); }, 3000);
    // Cap visible entries
    while (DOM.killFeed.children.length > 5) {
        DOM.killFeed.removeChild(DOM.killFeed.firstChild);
    }
}

// ---- HEADSHOT TEXT ----
let _headshotTimeout = 0;
function showHeadshot() {
    DOM.headshotText.style.opacity = '1';
    safeClearTimeout(_headshotTimeout);
    _headshotTimeout = safeTimeout(() => { DOM.headshotText.style.opacity = '0'; }, 800);
}

// ---- COMPASS ----
let _compassHtmlCached = false;
function updateCompass() {
    if (!player || !DOM.compassInner) return;
    // Build compass strip only once
    if (!_compassHtmlCached) {
        const dirs = ['N', '', '', '', 'W', '', '', '', 'S', '', '', '', 'E', '', '', ''];
        let html = '';
        for (let i = 0; i < dirs.length * 2; i++) {
            const d = dirs[i % dirs.length];
            const cls = (d === 'N' || d === 'S' || d === 'E' || d === 'W') ? ' compass-cardinal' : '';
            html += `<span class="compass-mark${cls}">${d || '|'}</span>`;
        }
        DOM.compassInner.innerHTML = html;
        _compassHtmlCached = true;
    }
    const deg = ((player.yaw * 180 / Math.PI) % 360 + 360) % 360;
    const offset = -(deg / 360) * (16 * 40) + 150;
    DOM.compassInner.style.transform = `translateX(${offset}px)`;
}

// ---- UPDATE ----
let _hudFrame = 0;

function update(dt) {
    if (!gameRunning || !player.alive) return;

    // Player movement
    let moveX = 0, moveZ = 0;
    const sinYaw = Math.sin(player.yaw), cosYaw = Math.cos(player.yaw);

    if (keys['KeyW']) { moveX -= sinYaw; moveZ -= cosYaw; }
    if (keys['KeyS']) { moveX += sinYaw; moveZ += cosYaw; }
    if (keys['KeyA']) { moveX -= cosYaw; moveZ += sinYaw; }
    if (keys['KeyD']) { moveX += cosYaw; moveZ -= sinYaw; }

    // Touch joystick input (additive — both work)
    if (IS_TOUCH && (touchMoveX !== 0 || touchMoveY !== 0)) {
        moveX += -touchMoveY * sinYaw + -touchMoveX * cosYaw;
        moveZ += -touchMoveY * cosYaw + touchMoveX * sinYaw;
    }

    const isMoving = moveX !== 0 || moveZ !== 0;
    player.sprinting = (keys['ShiftLeft'] || touchSprint) && isMoving;
    const speed = player.sprinting ? CFG.SPRINT_SPEED : CFG.PLAYER_SPEED;

    if (isMoving) {
        const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
        moveX = (moveX / len) * speed * dt;
        moveZ = (moveZ / len) * speed * dt;
    }

    // Jump
    if (keys['KeyV'] && player.grounded) {
        player.vy = CFG.JUMP_FORCE;
        player.grounded = false;
    }
    player.vy += CFG.GRAVITY * dt;
    player.y += player.vy * dt;
    if (player.y <= CFG.PLAYER_HEIGHT) {
        player.y = CFG.PLAYER_HEIGHT;
        // Landing dip
        if (!player.wasGrounded && player.vy < -3) {
            player.landDip = Math.min(0.15, Math.abs(player.vy) * 0.01);
            playSound('footstep', 0.8);
        }
        player.vy = 0;
        player.grounded = true;
    }
    player.wasGrounded = player.grounded;

    // Landing camera dip recovery
    if (player.landDip > 0) {
        player.landDip *= 0.85;
        if (player.landDip < 0.001) player.landDip = 0;
    }

    // Collision
    const resolved = resolveCollision(player.x + moveX, player.z + moveZ, 0.4);
    player.x = Math.max(-CFG.MAP_SIZE + 1, Math.min(CFG.MAP_SIZE - 1, resolved.x));
    player.z = Math.max(-CFG.MAP_SIZE + 1, Math.min(CFG.MAP_SIZE - 1, resolved.z));

    // Camera
    camera.position.set(player.x, player.y - player.landDip, player.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;

    // Camera shake
    if (player.shakeDecay > 0) {
        camera.rotation.x += player.shakeX * player.shakeDecay;
        camera.rotation.y += player.shakeY * player.shakeDecay;
        player.shakeDecay *= 0.8;
        if (player.shakeDecay < 0.001) player.shakeDecay = 0;
    }

    // Scope zoom
    const w2 = player.weapons[player.weaponIndex];
    const targetFov = scoped ? (w2.sniper ? SCOPE_FOV : 55) : DEFAULT_FOV;
    // Sprint FOV boost
    const fovTarget = player.sprinting ? targetFov + 5 : targetFov;
    if (Math.abs(camera.fov - fovTarget) > 0.1) {
        camera.fov += (fovTarget - camera.fov) * 0.12;
        camera.updateProjectionMatrix();
    }

    // Head bob with footstep sounds
    if (isMoving && player.grounded) {
        const bobSpeed = player.sprinting ? 14 : 10;
        const prevBob = weaponBob;
        weaponBob += dt * bobSpeed;
        camera.position.y += Math.sin(weaponBob) * (player.sprinting ? 0.05 : 0.025);

        // Footstep sound on bob cycle
        const prevSin = Math.sin(prevBob);
        const curSin = Math.sin(weaponBob);
        if (prevSin >= 0 && curSin < 0) {
            playSound('footstep', player.sprinting ? 0.6 : 0.4);
        }
    }

    // Weapon idle sway
    const time = clock.elapsedTime;
    weaponSwayX = Math.sin(time * 1.2) * 0.003;
    weaponSwayY = Math.sin(time * 0.9 + 0.5) * 0.002;

    // Weapon bob + sway + recoil
    if (weaponModel) {
        const moveSwayX = isMoving ? Math.sin(weaponBob) * 0.015 : 0;
        const moveSwayY = isMoving ? Math.abs(Math.cos(weaponBob)) * 0.01 : 0;
        const targetX = 0.25 + moveSwayX + weaponSwayX;
        const targetY = -0.22 + moveSwayY + weaponSwayY - weaponRecoil;
        const targetZ = -0.4 + (scoped && !w2.sniper ? 0.15 : 0);
        weaponModel.position.x += (targetX - weaponModel.position.x) * 0.12;
        weaponModel.position.y += (targetY - weaponModel.position.y) * 0.12;
        weaponModel.position.z += (targetZ - weaponModel.position.z) * 0.12;
        // Weapon tilt during strafe
        const strafing = keys['KeyA'] || touchMoveX < -0.2 ? 0.02 : (keys['KeyD'] || touchMoveX > 0.2 ? -0.02 : 0);
        const targetTilt = strafing;
        weaponModel.rotation.z += (targetTilt - weaponModel.rotation.z) * 0.1;
    }
    weaponRecoil *= 0.82;

    // Shooting
    const w = player.weapons[player.weaponIndex];
    if ((mouseDown || touchShootDown || keys['Space']) && (pointerLocked || IS_TOUCH) && w.auto) {
        shoot();
    }

    // Reload
    if (player.reloading) {
        const elapsed = performance.now() - player.reloadStart;
        const pct = Math.min(elapsed / w.reloadTime, 1);
        DOM.reloadBar.style.display = 'block';
        DOM.reloadText.style.display = 'block';
        DOM.reloadBarFill.style.width = (pct * 100) + '%';
        if (pct >= 1) {
            w.ammo = w.maxAmmo;
            player.reloading = false;
            DOM.reloadBar.style.display = 'none';
            DOM.reloadText.style.display = 'none';
            playSound('reload', 0.8);
        }
    }

    // Muzzle flash
    if (muzzleFlashTime > 0) {
        muzzleFlashTime -= dt;
        if (muzzleFlashTime <= 0) {
            muzzleFlash.material.opacity = 0;
            muzzleFlash.userData.light.intensity = 0;
        }
    }

    // Enemies (write-index compaction)
    let aliveCount = 0;
    {
        let w = 0;
        for (let i = 0; i < enemies.length; i++) {
            if (enemies[i].alive) {
                updateEnemy(enemies[i], dt);
                aliveCount++;
                enemies[w++] = enemies[i];
            }
        }
        enemies.length = w;
    }

    // Allies (write-index compaction)
    let allyAliveCount = 0;
    {
        let w = 0;
        for (let i = 0; i < allies.length; i++) {
            if (allies[i].alive) {
                updateAlly(allies[i], dt);
                allyAliveCount++;
                allies[w++] = allies[i];
            }
        }
        allies.length = w;
    }

    // Bullets (tracers, write-index compaction)
    {
        let w = 0;
        for (let i = 0; i < bullets.length; i++) {
            bullets[i].life -= dt;
            if (bullets[i].life <= 0) {
                scene.remove(bullets[i].mesh);
                bullets[i].mesh.geometry.dispose();
            } else {
                bullets[w++] = bullets[i];
            }
        }
        bullets.length = w;
    }

    // Shell casings (write-index compaction)
    {
        let w = 0;
        for (let i = 0; i < shellCasings.length; i++) {
            const c = shellCasings[i];
            c.life -= dt;
            if (c.life <= 0) {
                scene.remove(c.mesh);
            } else {
                c.mesh.position.x += c.vx * dt;
                c.mesh.position.y += c.vy * dt;
                c.mesh.position.z += c.vz * dt;
                c.vy -= 12 * dt;
                c.mesh.rotation.x += c.rotSpeed * dt;
                if (c.mesh.position.y < 0.02) {
                    c.mesh.position.y = 0.02;
                    c.vy *= -0.3;
                    c.vx *= 0.5;
                    c.vz *= 0.5;
                    c.rotSpeed *= 0.5;
                }
                shellCasings[w++] = c;
            }
        }
        shellCasings.length = w;
    }

    // Particles (write-index compaction)
    {
        let w = 0;
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                scene.remove(p.mesh);
            } else {
                p.mesh.position.x += p.vx * dt;
                p.mesh.position.y += p.vy * dt;
                p.mesh.position.z += p.vz * dt;
                p.vy -= 10 * dt;
                if (p.mesh.material.opacity !== undefined) {
                    p.mesh.material.opacity = Math.max(0, p.life * 3);
                }
                particles[w++] = p;
            }
        }
        particles.length = w;
    }

    // Animate flags (skip on low, throttle to every 3rd frame on medium/high)
    if (CFG.FLAG_ANIM && _hudFrame % 3 === 0) {
        for (let i = 0; i < flagMeshes.length; i++) {
            const flag = flagMeshes[i];
            const pos = flag.geometry.attributes.position;
            for (let j = 0; j < pos.count; j++) {
                pos.setZ(j, Math.sin(pos.getX(j) * 2 + time * 3) * 0.15);
            }
            pos.needsUpdate = true;
        }
    }

    // Animate ambient smoke
    for (let i = 0; i < ambientSmoke.length; i++) {
        const s = ambientSmoke[i];
        s.position.y += s.userData.riseSpeed * dt;
        s.position.x += s.userData.driftX * dt;
        s.rotation.z += dt * 0.1;
        // Fade as it rises
        const t = (s.position.y - s.userData.resetY) / (s.userData.maxY - s.userData.resetY);
        s.material.opacity = 0.15 * (1 - t);
        // Reset when too high
        if (s.position.y > s.userData.maxY) {
            s.position.y = s.userData.resetY;
            s.material.opacity = 0.15;
        }
    }

    // Animate fire lights (flicker, skip on low)
    if (!CFG.FIRE_LIGHTS) { /* skip */ } else for (let i = 0; i < fireLights.length; i++) {
        const f = fireLights[i];
        f.light.intensity = f.light.userData.baseIntensity + Math.sin(time * 8 + f.light.userData.phaseOffset) * 0.8 + Math.random() * 0.3;
        // Animate fire planes
        const children = f.group.children;
        for (let j = 0; j < children.length; j++) {
            const c = children[j];
            c.position.y = c.userData.baseY + Math.sin(time * 6 + c.userData.phaseOffset) * 0.15;
            c.rotation.y += dt * 2;
        }
    }

    // Wave check
    if (aliveCount === 0 && waveActive) {
        waveActive = false;
        safeTimeout(() => {
            if (gameRunning && player.alive) nextWave();
        }, CFG.WAVE_DELAY);
    }

    // Grenades
    updateGrenades(dt);

    // Aeroplanes
    updateAeroplanes(dt);

    // COD-style health regen
    const timeSinceDmg = (performance.now() - player.lastDamageTime) / 1000;
    if (timeSinceDmg > player.regenDelay && player.hp < player.maxHp && player.alive) {
        player.hp = Math.min(player.maxHp, player.hp + player.regenRate * dt);
    }

    // Blood screen overlay (COD style - appears when hurt, fades with regen)
    const hpPct = player.hp / player.maxHp;
    if (hpPct < 0.5) {
        DOM.bloodScreen.style.opacity = String(Math.min(1, (1 - hpPct * 2) * 0.8));
    } else {
        DOM.bloodScreen.style.opacity = '0';
    }

    // Game over
    if (!player.alive) { gameOver(); }

    // Throttled HUD update
    if (++_hudFrame % 3 === 0) updateHUD(aliveCount, allyAliveCount);

    // Compass update (every 3 frames)
    if (_hudFrame % 3 === 0) updateCompass();
}

function updateHUD(aliveCount, allyAliveCount) {
    const w = player.weapons[player.weaponIndex];
    DOM.healthBar.style.width = ((player.hp / player.maxHp) * 100) + '%';
    DOM.healthText.textContent = Math.max(0, Math.ceil(player.hp));
    DOM.ammoText.textContent = w.ammo;
    DOM.ammoMax.textContent = w.maxAmmo;
    DOM.weaponName.textContent = w.name;
    DOM.scoreText.textContent = score;
    DOM.killCount.textContent = kills;
    DOM.waveNum.textContent = wave;
    DOM.enemyCount.textContent = aliveCount !== undefined ? aliveCount : enemies.length;
    DOM.grenadeCount.textContent = grenadeInventory;
    if (DOM.allyCount) {
        if (allyAliveCount !== undefined) { DOM.allyCount.textContent = allyAliveCount; }
        else { let ac = 0; for (let j = 0; j < allies.length; j++) if (allies[j].alive) ac++; DOM.allyCount.textContent = ac; }
    }
    // Update touch weapon button highlights
    if (IS_TOUCH) {
        const btns = document.querySelectorAll('.weapon-btn');
        for (let i = 0; i < btns.length; i++) {
            btns[i].classList.toggle('active', i === player.weaponIndex);
        }
    }
}

// ---- GAME FLOW ----
function startGame() {
    clearAllTimeouts();

    DOM.titleScreen.style.display = 'none';
    DOM.hud.style.display = 'block';
    DOM.gameOver.style.display = 'none';

    for (const e of enemies) disposeEnemyGroup(e);
    for (const a of allies) disposeAllyGroup(a);
    for (const b of bullets) { scene.remove(b.mesh); b.mesh.geometry.dispose(); }
    for (const p of particles) { scene.remove(p.mesh); }
    for (const c of shellCasings) { scene.remove(c.mesh); }
    for (const g of grenades) { scene.remove(g.mesh); }
    for (const p of aeroplanes) { scene.remove(p.group); p.propMat.dispose(); }
    for (const b of bombs) { scene.remove(b.mesh); }
    enemies = [];
    allies = [];
    bullets = [];
    particles = [];
    shellCasings = [];
    grenades = [];
    aeroplanes = [];
    bombs = [];
    grenadeInventory = 3;
    score = 0;
    kills = 0;
    wave = 0;
    waveActive = false;
    _compassHtmlCached = false;

    createPlayer();
    createWeaponModel();
    createMuzzleFlash();

    if (!audioCtx) initAudio();

    gameRunning = true;
    if (!IS_TOUCH) {
        renderer.domElement.requestPointerLock();
    } else {
        pointerLocked = true;
        document.getElementById('touchControls').style.display = 'block';
    }
    // Reset touch state
    touchMoveX = 0; touchMoveY = 0;
    touchShootDown = false; touchSprint = false;
    nextWave();
    spawnAllies();
}

function gameOver() {
    gameRunning = false;
    clearAllTimeouts();
    if (!IS_TOUCH) document.exitPointerLock();
    DOM.hud.style.display = 'none';
    DOM.gameOver.style.display = 'flex';
    DOM.finalScore.textContent = score;
    DOM.finalWave.textContent = wave;
    DOM.finalKills.textContent = kills;
    // Reset touch state
    touchMoveX = 0; touchMoveY = 0;
    touchShootDown = false; touchSprint = false;
    if (IS_TOUCH) {
        document.getElementById('touchControls').style.display = 'none';
    }
}

// ---- RENDER LOOP ----
function gameLoop() {
    requestAnimationFrame(gameLoop);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (gameRunning) update(dt);
    renderer.render(scene, camera);
}

// ---- SINGLE FIRE HANDLER ----
function onMouseClick(e) {
    if (e.button !== 0 || (!pointerLocked && !IS_TOUCH) || !gameRunning || !player || !player.alive) return;
    const w = player.weapons[player.weaponIndex];
    if (!w.auto) shoot();
}

// ---- INIT ----
function init() {
    cacheDom();
    initThree();
    createMaterials();
    createPools();
    createLighting();
    createMap();
    setupInput();

    addListener(document, 'click', onMouseClick);
    addListener(document.getElementById('startBtn'), 'click', startGame);
    addListener(document.getElementById('restartBtn'), 'click', startGame);

    scene.add(camera);
    gameLoop();
}

init();
