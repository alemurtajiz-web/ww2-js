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
        { name: 'Bazooka', damage: 300, fireRate: 2000, ammo: 1, maxAmmo: 1, reloadTime: 3000, spread: 0.015, range: 150, auto: false, rocket: true, recoilPitch: 0.06, recoilYaw: 0.015, shakeAmt: 0.05, blastRadius: 8 },
    ],

    ENEMY: {
        grunt:  { hp: 60, speed: 3.5, damage: 10, fireRate: 1200, range: 40, detectRange: 50, score: 100, tunic: 0x1a3a8b, pants: 0x102a5c },
        sniper: { hp: 35, speed: 2, damage: 25, fireRate: 2500, range: 80, detectRange: 80, score: 200, tunic: 0x2050a0, pants: 0x18406b },
        brute:  { hp: 150, speed: 2.5, damage: 15, fireRate: 700, range: 30, detectRange: 40, score: 300, tunic: 0x182870, pants: 0x0e1e4a },
    },

    MAP_SIZE: 120,
    FOG_NEAR: 50,
    FOG_FAR: 130,
    WAVE_DELAY: 4000,
    MAX_WAVES: 3,
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
        rifleman: { hp: 80, speed: 3.5, damage: 12, fireRate: 1000, range: 40, detectRange: 50, tunic: 0x2a5c1a, pants: 0x1e4a10 },
        medic:    { hp: 60, speed: 3,   damage: 8,  fireRate: 1400, range: 30, detectRange: 45, tunic: 0x3a6b20, pants: 0x2a5518, healRate: 10, healRange: 8 },
        support:  { hp: 100, speed: 3,  damage: 10, fireRate: 600,  range: 35, detectRange: 50, tunic: 0x1e4a18, pants: 0x14380e },
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
let rockets = []; // bazooka rocket projectiles
let aeroplanes = []; // flying planes
let bombs = []; // dropped bombs
let rainDrops = []; // rain particle system
let rainGroup = null; // rain mesh group
let corpses = []; // dead enemy bodies lying on ground
const MAX_CORPSES = QUALITY === 'low' ? 8 : QUALITY === 'medium' ? 15 : 25;
let enemyTanks = []; // moving enemy tanks
let allyTanks = []; // allied bot tanks
let cutsceneActive = false;
let cutsceneStartTime = 0;
let cutsceneDuration = 8;
let cutsceneWaypoints = [];
let cutsceneTypewriterTimer = null;
let playerFlying = false;
let playerPlane = null; // { group, hp, maxHp, pitch, roll, yaw, speed, bombsLeft, alive }
let groundedPlane = null; // the stationary plane on the map the player can enter
let planeRespawnTimer = 0;
let planeCamMode = 'first'; // 'first' or 'third'
let playerInTank = false;
let playerTank = null; // the tank object the player is driving
let tankCamMode = 'first'; // 'first' or 'third'
const MAX_GRENADES_INVENTORY = 4;
let grenadeInventory = 3;

// ---- MULTIPLAYER GLOBALS ----
let isMultiplayer = false;
let isHost = false;
let socket = null;
let roomCode = null;
let partnerName = '';
let partnerAlive = true;
let partnerKills = 0;
let otherPlayer = null; // { group, nameSprite, targetPos, targetRot, hp, maxHp }
let _nextEnemyId = 1;
let _syncInterval = null;
let _enemySyncInterval = null;

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
    DOM.winScreen = document.getElementById('winScreen');
    DOM.winScore = document.getElementById('winScore');
    DOM.winKills = document.getElementById('winKills');
    DOM.clickToPlay = document.getElementById('clickToPlay');
    DOM.scopeOverlay = document.getElementById('scopeOverlay');
    DOM.crosshair = document.getElementById('crosshair');
    DOM.bloodScreen = document.getElementById('bloodScreen');
    DOM.killFeed = document.getElementById('killFeed');
    DOM.grenadeCount = document.getElementById('grenadeCount');
    DOM.headshotText = document.getElementById('headshotText');
    DOM.compassInner = document.getElementById('compassInner');
    DOM.allyCount = document.getElementById('allyCount');
    DOM.partnerHud = document.getElementById('partnerHud');
    DOM.partnerNameHud = document.getElementById('partnerNameHud');
    DOM.partnerHpBar = document.getElementById('partnerHpBar');
    DOM.partnerKills = document.getElementById('partnerKills');
    DOM.partnerDownBanner = document.getElementById('partnerDownBanner');
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
    POOL.enemyHandGeo = new THREE.BoxGeometry(0.1, 0.1, 0.12);
    POOL.enemyForearmGeo = new THREE.BoxGeometry(0.13, 0.13, 0.3);
    POOL.enemyBeltGeo = new THREE.BoxGeometry(0.62, 0.08, 0.37);
    POOL.enemyCollarGeo = new THREE.BoxGeometry(0.5, 0.08, 0.3);

    POOL.enemyTunicMats = {};
    POOL.enemyPantsMats = {};
    for (const [type, cfg] of Object.entries(CFG.ENEMY)) {
        POOL.enemyTunicMats[type] = new THREE.MeshStandardMaterial({ color: cfg.tunic, roughness: 0.85 });
        POOL.enemyPantsMats[type] = new THREE.MeshStandardMaterial({ color: cfg.pants, roughness: 0.9 });
    }
    POOL.enemyBootMat = new THREE.MeshStandardMaterial({ color: 0x1a1a18, roughness: 0.7, metalness: 0.1 });
    POOL.skinMat = new THREE.MeshStandardMaterial({ color: 0xccaa88, roughness: 0.8, metalness: 0 });
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

    // Bomb — reusable dark metal material
    POOL.bombMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.8 });
    POOL.bombFinMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5, metalness: 0.6 });

    // Smoke particle — use soft circle geometry for volume
    POOL.smokeGeo = new THREE.CircleGeometry(0.5, 6);
    POOL.smokeMat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false });

    // Smoke material pool with varied dark/light tones
    const smokeColors = [0x444444, 0x555555, 0x666666, 0x777777, 0x888888, 0x3a3a3a, 0x4e4e4e, 0x5a5550, 0x6a6560, 0x504a40];
    POOL.smokeMatPool = [];
    for (let i = 0; i < 20; i++) {
        POOL.smokeMatPool.push(new THREE.MeshBasicMaterial({
            color: smokeColors[i % smokeColors.length],
            transparent: true, opacity: 0.12 + Math.random() * 0.06,
            side: THREE.DoubleSide, depthWrite: false
        }));
    }
    POOL._smokeMatIdx = 0;

    // Particle mesh pool — reuse instead of create/destroy
    POOL.particlePool = [];
    POOL.particlePoolMax = CFG.MAX_PARTICLES + 20;
    for (let i = 0; i < POOL.particlePoolMax; i++) {
        const m = new THREE.Mesh(POOL.particleGeo, POOL.particleMats[0xffffff] || new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
        m.visible = false;
        scene.add(m);
        POOL.particlePool.push(m);
    }
    POOL._particlePoolIdx = 0;

    // Shell casing pool
    POOL.casingPool = [];
    POOL.casingPoolMax = CFG.MAX_CASINGS + 5;
    for (let i = 0; i < POOL.casingPoolMax; i++) {
        const m = new THREE.Mesh(POOL.casingGeo, POOL.casingMat);
        m.visible = false;
        scene.add(m);
        POOL.casingPool.push(m);
    }
    POOL._casingPoolIdx = 0;

    // Weapon geometry cache — avoid recreating on every weapon switch
    POOL.weaponGeos = {};
    // Box geometries keyed by dimensions
    POOL.getBoxGeo = function(w, h, d) {
        const key = `b${w}_${h}_${d}`;
        if (!POOL.weaponGeos[key]) POOL.weaponGeos[key] = new THREE.BoxGeometry(w, h, d);
        return POOL.weaponGeos[key];
    };
    // Cylinder geometries keyed by radius+height
    POOL.getCylGeo = function(r, h) {
        const key = `c${r}_${h}`;
        if (!POOL.weaponGeos[key]) POOL.weaponGeos[key] = new THREE.CylinderGeometry(r, r, h, 8);
        return POOL.weaponGeos[key];
    };
    POOL.getCylGeo2 = function(rTop, rBot, h, seg) {
        const key = `c2_${rTop}_${rBot}_${h}_${seg}`;
        if (!POOL.weaponGeos[key]) POOL.weaponGeos[key] = new THREE.CylinderGeometry(rTop, rBot, h, seg);
        return POOL.weaponGeos[key];
    };
    // Bazooka tube material (was recreated every switch)
    POOL.tubeMat = new THREE.MeshStandardMaterial({ color: 0x4a5a2a, roughness: 0.8, metalness: 0.3 });

    // Rain
    POOL.rainGeo = new THREE.BufferGeometry();
    POOL.rainMat = new THREE.PointsMaterial({ color: 0xaabbcc, size: 0.08, transparent: true, opacity: 0.5, depthWrite: false });

    // Enemy tank
    POOL.tankBodyGeo = new THREE.BoxGeometry(3.2, 1.4, 5.5);
    POOL.tankTurretGeo = new THREE.CylinderGeometry(0.9, 1.1, 0.9, 8);
    POOL.tankBarrelGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.5, 6);
    POOL.tankTrackGeo = new THREE.BoxGeometry(0.6, 0.9, 5.8);
    POOL.tankMat = new THREE.MeshStandardMaterial({ color: 0x4a4a3a, roughness: 0.7, metalness: 0.5 });
    POOL.tankDarkMat = new THREE.MeshStandardMaterial({ color: 0x2a2a22, roughness: 0.5, metalness: 0.6 });
    // Allied tank — olive drab green (US/Allied color)
    POOL.allyTankMat = new THREE.MeshStandardMaterial({ color: 0x4b6b3a, roughness: 0.7, metalness: 0.5 });
    POOL.allyTankDarkMat = new THREE.MeshStandardMaterial({ color: 0x2d4422, roughness: 0.5, metalness: 0.6 });
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
let _sceneLights = { ambient: null, hemi: null, sun: null, back: null };
function createLighting() {
    const ambient = new THREE.AmbientLight(0x556066, 0.5);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0x778088, 0x3a2e20, 0.6);
    scene.add(hemi);
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
    const back = new THREE.DirectionalLight(0x556688, 0.25);
    back.position.set(-30, 20, -40);
    scene.add(back);
    _sceneLights = { ambient, hemi, sun, back };
}

function updateLightingForTheme(theme) {
    if (!_sceneLights.ambient) return;
    _sceneLights.ambient.color.set(theme.ambientColor);
    _sceneLights.ambient.intensity = theme.ambientIntensity;
    _sceneLights.hemi.color.set(theme.hemiTop);
    _sceneLights.hemi.groundColor.set(theme.hemiBottom);
    _sceneLights.hemi.intensity = theme.hemiIntensity;
    _sceneLights.sun.color.set(theme.sunColor);
    _sceneLights.sun.intensity = theme.sunIntensity;
}

// ---- MATERIALS ----
const MAT = {};
function createMaterials() {
    MAT.ground = new THREE.MeshStandardMaterial({ color: 0x3e3220, roughness: 0.85, metalness: 0.02, vertexColors: true });
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
    MAT.helmet = new THREE.MeshStandardMaterial({ color: 0x1a3060, roughness: 0.65, metalness: 0.2 });
    MAT.allyHelmet = new THREE.MeshStandardMaterial({ color: 0x2a4a1a, roughness: 0.65, metalness: 0.2 });
    MAT.door = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.85 });
    MAT.fire = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
    MAT.fireGlow = new THREE.MeshBasicMaterial({ color: 0xffaa22, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
    MAT.fireCore = new THREE.MeshBasicMaterial({ color: 0xffdd66, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
    MAT.fireSmoke = new THREE.MeshBasicMaterial({ color: 0x332200, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false });
    MAT.scorch = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1, metalness: 0 });
    // German flag (ally) — black, red, gold horizontal stripes
    const gerCanvas = document.createElement('canvas');
    gerCanvas.width = 64; gerCanvas.height = 48;
    const gerCtx = gerCanvas.getContext('2d');
    gerCtx.fillStyle = '#000000'; gerCtx.fillRect(0, 0, 64, 16);
    gerCtx.fillStyle = '#dd0000'; gerCtx.fillRect(0, 16, 64, 16);
    gerCtx.fillStyle = '#ffcc00'; gerCtx.fillRect(0, 32, 64, 16);
    MAT.flagGerman = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(gerCanvas), side: THREE.DoubleSide });
    // Russian flag (enemy) — white, blue, red horizontal stripes
    const rusCanvas = document.createElement('canvas');
    rusCanvas.width = 64; rusCanvas.height = 48;
    const rusCtx = rusCanvas.getContext('2d');
    rusCtx.fillStyle = '#ffffff'; rusCtx.fillRect(0, 0, 64, 16);
    rusCtx.fillStyle = '#0039a6'; rusCtx.fillRect(0, 16, 64, 16);
    rusCtx.fillStyle = '#d52b1e'; rusCtx.fillRect(0, 32, 64, 16);
    MAT.flagRussian = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(rusCanvas), side: THREE.DoubleSide });
    MAT.wire = new THREE.LineBasicMaterial({ color: 0x777777 });
    MAT.mountain1 = new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 1 });
    MAT.mountain2 = new THREE.MeshStandardMaterial({ color: 0x3a3e42, roughness: 1 });
    MAT.cloud = new THREE.MeshBasicMaterial({ color: 0x777780, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
    MAT.planeMetal = new THREE.MeshStandardMaterial({ color: 0x4a5050, roughness: 0.5, metalness: 0.6 });
    MAT.planeWing = new THREE.MeshStandardMaterial({ color: 0x3a4040, roughness: 0.6, metalness: 0.4 });
    MAT.planeMark = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.3 });
    // Map-theme materials
    MAT.sand = new THREE.MeshStandardMaterial({ color: 0xc2b280, roughness: 0.92, metalness: 0, vertexColors: true });
    MAT.foliage = new THREE.MeshStandardMaterial({ color: 0x3a5a2a, roughness: 0.88, metalness: 0, vertexColors: true });
    MAT.snow = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.8, metalness: 0 });
    MAT.rubble = new THREE.MeshStandardMaterial({ color: 0x555550, roughness: 0.95, metalness: 0, vertexColors: true });
    MAT.treeTrunk = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9, metalness: 0 });
    MAT.treeLeaves = new THREE.MeshStandardMaterial({ color: 0x2a4a1a, roughness: 0.85, metalness: 0 });
    MAT.treeLeavesDark = new THREE.MeshStandardMaterial({ color: 0x1a3a10, roughness: 0.85, metalness: 0 });
    MAT.hedgehog = new THREE.MeshStandardMaterial({ color: 0x3a3a38, roughness: 0.5, metalness: 0.7 });
    MAT.bunkerWall = new THREE.MeshStandardMaterial({ color: 0x606060, roughness: 0.9, metalness: 0.1 });
    MAT.log = new THREE.MeshStandardMaterial({ color: 0x5a4020, roughness: 0.95, metalness: 0 });
    MAT.rock = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.9, metalness: 0.05 });
    MAT.boatWood = new THREE.MeshStandardMaterial({ color: 0x5a5040, roughness: 0.85, metalness: 0.1 });
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
let mapObjects = []; // track all map meshes for cleanup
let selectedMap = 'normandy'; // current map theme key

// ---- CAMPAIGN PROGRESSION ----
const CAMPAIGN_ORDER = [
    'normandy', 'dunkirk', 'elalamein', 'tobruk', 'montecassino',
    'guadalcanal', 'midway', 'iwojima', 'okinawa', 'kursk',
    'stalingrad', 'leningrad', 'sevastopol', 'bastogne', 'ardennes',
    'hurtgen', 'caen', 'rhine', 'warsaw', 'berlin'
];
let unlockedLevel = 20; // all levels unlocked for testing
let currentLevelIndex = 0;
let snowParticles = null; // snow particle system

// ---- CUTSCENE DATA ----
const CUTSCENE_DATA = {
    normandy: {
        title: 'NORMANDY BEACH',
        subtitle: 'D-DAY — JUNE 6, 1944',
        theater: 'WESTERN FRONT — FRANCE',
        briefing: 'Allied forces storm the beaches of Normandy. Break through the German defenses and establish a beachhead. The fate of Europe depends on this assault.',
    },
    dunkirk: {
        title: 'DUNKIRK',
        subtitle: 'OPERATION DYNAMO — MAY 26, 1940',
        theater: 'WESTERN FRONT — FRANCE',
        briefing: 'The British Expeditionary Force is trapped. Hold the perimeter while evacuation ships load. Every minute bought saves thousands of lives.',
    },
    elalamein: {
        title: 'EL ALAMEIN',
        subtitle: 'OCTOBER 23, 1942',
        theater: 'NORTH AFRICA — EGYPT',
        briefing: 'Rommel\'s Afrika Korps must be stopped here. Advance through the desert minefields and break the Axis line. The desert war ends today.',
    },
    tobruk: {
        title: 'TOBRUK',
        subtitle: 'THE SIEGE — APRIL 1941',
        theater: 'NORTH AFRICA — LIBYA',
        briefing: 'The fortress of Tobruk is under siege. Defend the sandbag perimeter against relentless Axis assault. Hold the line at all costs.',
    },
    montecassino: {
        title: 'MONTE CASSINO',
        subtitle: 'BATTLE OF THE MONASTERY — FEBRUARY 1944',
        theater: 'ITALIAN FRONT — ITALY',
        briefing: 'The ancient monastery crowns the hilltop, now a German stronghold. Fight uphill through rubble and rain to break the Gustav Line.',
    },
    guadalcanal: {
        title: 'GUADALCANAL',
        subtitle: 'OPERATION WATCHTOWER — AUGUST 1942',
        theater: 'PACIFIC THEATER — SOLOMON ISLANDS',
        briefing: 'Deep in the jungle, Japanese forces hold Henderson Field. Push through dense tropical terrain and secure the airstrip.',
    },
    midway: {
        title: 'MIDWAY',
        subtitle: 'BATTLE OF MIDWAY — JUNE 4, 1942',
        theater: 'PACIFIC THEATER — MIDWAY ATOLL',
        briefing: 'The Imperial Japanese Navy approaches. Defend the island airfield and turn the tide of the Pacific war.',
    },
    iwojima: {
        title: 'IWO JIMA',
        subtitle: 'OPERATION DETACHMENT — FEBRUARY 19, 1945',
        theater: 'PACIFIC THEATER — VOLCANO ISLANDS',
        briefing: 'Black volcanic sand and fortified bunkers await. Storm the beaches of this fortress island and raise the flag on Mount Suribachi.',
    },
    okinawa: {
        title: 'OKINAWA',
        subtitle: 'OPERATION ICEBERG — APRIL 1, 1945',
        theater: 'PACIFIC THEATER — RYUKYU ISLANDS',
        briefing: 'The last major island before Japan. Expect fierce resistance from entrenched defenders in caves and bunkers along the cliffs.',
    },
    kursk: {
        title: 'KURSK',
        subtitle: 'OPERATION CITADEL — JULY 5, 1943',
        theater: 'EASTERN FRONT — SOVIET UNION',
        briefing: 'The largest tank battle in history unfolds on the open steppe. Blunt the German armored offensive and turn the tide on the Eastern Front.',
    },
    stalingrad: {
        title: 'STALINGRAD RUINS',
        subtitle: 'NOT ONE STEP BACK — NOVEMBER 1942',
        theater: 'EASTERN FRONT — SOVIET UNION',
        briefing: 'The city lies in ruins. Fight through burning buildings and rubble in the most brutal urban combat of the war. Every building is a fortress.',
    },
    leningrad: {
        title: 'LENINGRAD',
        subtitle: 'THE 900-DAY SIEGE — JANUARY 1943',
        theater: 'EASTERN FRONT — SOVIET UNION',
        briefing: 'The frozen city endures. Break through enemy lines in bitter cold to open a supply corridor. The starving city depends on you.',
    },
    sevastopol: {
        title: 'SEVASTOPOL',
        subtitle: 'THE BLACK SEA FORTRESS — JUNE 1942',
        theater: 'EASTERN FRONT — CRIMEA',
        briefing: 'The coastal fortress is under heavy bombardment. Defend the naval base against overwhelming force. The Black Sea fleet must survive.',
    },
    bastogne: {
        title: 'BASTOGNE',
        subtitle: 'BATTLE OF THE BULGE — DECEMBER 1944',
        theater: 'WESTERN FRONT — BELGIUM',
        briefing: 'Surrounded and outnumbered in the frozen Ardennes. Hold the crossroads town against the German winter offensive. "NUTS!" is our answer.',
    },
    ardennes: {
        title: 'ARDENNES FOREST',
        subtitle: 'WINTER OFFENSIVE — DECEMBER 1944',
        theater: 'WESTERN FRONT — BELGIUM',
        briefing: 'Snow-covered pine forests hide enemy positions. Push through the frozen woodland and halt the last German counter-attack.',
    },
    hurtgen: {
        title: 'HURTGEN FOREST',
        subtitle: 'THE DEATH FACTORY — NOVEMBER 1944',
        theater: 'WESTERN FRONT — GERMANY',
        briefing: 'The darkest forest on the Western Front. Dense trees, mud, and hidden positions make every step deadly. Clear the forest at all costs.',
    },
    caen: {
        title: 'CAEN',
        subtitle: 'OPERATION CHARNWOOD — JULY 1944',
        theater: 'WESTERN FRONT — FRANCE',
        briefing: 'The key city of Normandy must fall. Fight through hedgerows and streets to liberate this strategic crossroads from German occupation.',
    },
    rhine: {
        title: 'RHINE CROSSING',
        subtitle: 'OPERATION PLUNDER — MARCH 1945',
        theater: 'WESTERN FRONT — GERMANY',
        briefing: 'The last great river barrier into the heart of Germany. Cross the bridge under fire and establish a foothold on the far bank.',
    },
    warsaw: {
        title: 'WARSAW',
        subtitle: 'THE UPRISING — AUGUST 1944',
        theater: 'EASTERN FRONT — POLAND',
        briefing: 'The city rises against the occupiers. Fight through burning streets and dense rubble. The resistance needs every fighter.',
    },
    berlin: {
        title: 'BERLIN',
        subtitle: 'THE FALL OF THE REICH — APRIL 30, 1945',
        theater: 'EASTERN FRONT — GERMANY',
        briefing: 'The final battle. Push through the burning ruins of the capital to the Reichstag. End the war in Europe once and for all.',
    },
};

function getCutscenePath(mapKey) {
    const theme = MAP_THEMES[mapKey];
    if (!theme) return [];
    const spawn = theme.playerSpawn;
    const enemyZ = theme.enemySpawnZ ? (theme.enemySpawnZ[0] + theme.enemySpawnZ[1]) / 2 : -50;
    const S = CFG.MAP_SIZE;
    return [
        { x: -S * 0.4, y: 60, z: spawn.z + 30, lookX: 0, lookY: 0, lookZ: enemyZ },
        { x: S * 0.15, y: 35, z: (spawn.z + enemyZ) / 2, lookX: 0, lookY: 5, lookZ: enemyZ },
        { x: spawn.x + 5, y: 12, z: spawn.z + 8, lookX: spawn.x, lookY: 3, lookZ: enemyZ },
    ];
}

// ---- MAP THEMES ----
const MAP_THEMES = {
    normandy: {
        name: 'Normandy Beach',
        groundColor: [
            [0.76, 0.70, 0.50], [0.72, 0.65, 0.45], [0.68, 0.60, 0.42],
            [0.80, 0.74, 0.55], [0.65, 0.58, 0.40], [0.74, 0.68, 0.48],
            [0.70, 0.63, 0.44], [0.78, 0.72, 0.52], [0.66, 0.60, 0.43],
            [0.73, 0.67, 0.47],
        ],
        groundMat: 'sand',
        skyTop: 0x8899aa, skyBottom: 0xbbbbcc,
        fogColor: 0x99aabb, fogDensity: 0.007,
        ambientColor: 0x889099, ambientIntensity: 0.6,
        hemiTop: 0x99aabb, hemiBottom: 0x6a5a40, hemiIntensity: 0.5,
        sunColor: 0xeeeedd, sunIntensity: 1.0,
        rain: false, snow: false,
        trenches: 2, ruins: 0, buildings: 0, sandbagWalls: 4,
        bunkers: 2, beachObstacles: 10, trees: 0, landingCraft: 2,
        destroyedVehicles: 2, fires: 3, smoke: 2,
        playerSpawn: { x: 0, z: 50 },
        enemySpawnZ: [-30, -70],
        planePos: { x: 6, z: 46 },
    },
    stalingrad: {
        name: 'Stalingrad Ruins',
        groundColor: [
            [0.35, 0.33, 0.30], [0.30, 0.28, 0.26], [0.40, 0.37, 0.33],
            [0.32, 0.30, 0.28], [0.38, 0.35, 0.31], [0.28, 0.26, 0.24],
            [0.36, 0.34, 0.30], [0.42, 0.39, 0.35], [0.33, 0.31, 0.28],
            [0.37, 0.34, 0.31],
        ],
        groundMat: 'rubble',
        skyTop: 0x222228, skyBottom: 0x444448,
        fogColor: 0x333338, fogDensity: 0.012,
        ambientColor: 0x445055, ambientIntensity: 0.4,
        hemiTop: 0x556060, hemiBottom: 0x2a2220, hemiIntensity: 0.5,
        sunColor: 0xaa9988, sunIntensity: 0.6,
        rain: true, snow: false,
        trenches: 2, ruins: 7, buildings: 3, sandbagWalls: 6,
        bunkers: 0, beachObstacles: 0, trees: 0, landingCraft: 0,
        destroyedVehicles: 5, fires: 8, smoke: 6,
        playerSpawn: { x: 0, z: 28 },
        enemySpawnZ: [-30, -70],
        planePos: { x: 6, z: 24 },
    },
    ardennes: {
        name: 'Ardennes Forest',
        groundColor: [
            [0.22, 0.28, 0.15], [0.25, 0.30, 0.18], [0.30, 0.34, 0.20],
            [0.28, 0.32, 0.17], [0.20, 0.26, 0.14], [0.32, 0.35, 0.22],
            [0.24, 0.29, 0.16], [0.27, 0.31, 0.19], [0.35, 0.38, 0.24],
            [0.23, 0.27, 0.15],
        ],
        groundMat: 'foliage',
        skyTop: 0x556666, skyBottom: 0x889999,
        fogColor: 0x778888, fogDensity: 0.011,
        ambientColor: 0x667077, ambientIntensity: 0.45,
        hemiTop: 0x778888, hemiBottom: 0x3a3a2a, hemiIntensity: 0.55,
        sunColor: 0xcccccc, sunIntensity: 0.7,
        rain: false, snow: true,
        trenches: 3, ruins: 0, buildings: 1, sandbagWalls: 3,
        bunkers: 0, beachObstacles: 0, trees: 40, landingCraft: 0,
        destroyedVehicles: 2, fires: 2, smoke: 2,
        playerSpawn: { x: 0, z: 28 },
        enemySpawnZ: [-30, -70],
        planePos: { x: 6, z: 24 },
    },
    berlin: {
        name: 'Berlin',
        groundColor: [
            [0.30, 0.28, 0.26], [0.25, 0.24, 0.22], [0.35, 0.32, 0.30],
            [0.28, 0.26, 0.24], [0.38, 0.35, 0.32], [0.22, 0.20, 0.19],
            [0.33, 0.30, 0.28], [0.40, 0.37, 0.34], [0.27, 0.25, 0.23],
            [0.36, 0.33, 0.30],
        ],
        groundMat: 'rubble',
        skyTop: 0x1a1a20, skyBottom: 0x3a3a40,
        fogColor: 0x2a2a30, fogDensity: 0.013,
        ambientColor: 0x445055, ambientIntensity: 0.35,
        hemiTop: 0x444450, hemiBottom: 0x2a2018, hemiIntensity: 0.4,
        sunColor: 0x998877, sunIntensity: 0.5,
        rain: false, snow: false,
        trenches: 2, ruins: 7, buildings: 3, sandbagWalls: 8,
        bunkers: 0, beachObstacles: 0, trees: 0, landingCraft: 0,
        destroyedVehicles: 5, fires: 8, smoke: 8,
        playerSpawn: { x: 0, z: 28 },
        enemySpawnZ: [-30, -70],
        planePos: { x: 6, z: 24 },
    },
    elalamein: {
        name: 'El Alamein',
        groundColor: [
            [0.85, 0.78, 0.55], [0.80, 0.72, 0.50], [0.90, 0.82, 0.58],
            [0.82, 0.75, 0.52], [0.88, 0.80, 0.56], [0.78, 0.70, 0.48],
            [0.86, 0.78, 0.54], [0.92, 0.84, 0.60], [0.83, 0.76, 0.53],
            [0.87, 0.79, 0.55],
        ],
        groundMat: 'sand',
        skyTop: 0xccbb88, skyBottom: 0xeeddaa,
        fogColor: 0xddcc99, fogDensity: 0.005,
        ambientColor: 0xbbaa77, ambientIntensity: 0.7,
        hemiTop: 0xddcc99, hemiBottom: 0x8a7a50, hemiIntensity: 0.6,
        sunColor: 0xffeecc, sunIntensity: 1.3,
        rain: false, snow: false,
        trenches: 3, ruins: 1, buildings: 0, sandbagWalls: 6,
        bunkers: 1, beachObstacles: 0, trees: 0, landingCraft: 0,
        destroyedVehicles: 4, fires: 2, smoke: 2,
        playerSpawn: { x: 0, z: 28 },
        enemySpawnZ: [-30, -70],
        planePos: { x: 6, z: 24 },
    },
    iwojima: {
        name: 'Iwo Jima',
        groundColor: [
            [0.18, 0.18, 0.16], [0.22, 0.22, 0.20], [0.15, 0.15, 0.14],
            [0.20, 0.20, 0.18], [0.25, 0.24, 0.22], [0.16, 0.16, 0.15],
            [0.19, 0.19, 0.17], [0.23, 0.22, 0.20], [0.17, 0.17, 0.16],
            [0.21, 0.21, 0.19],
        ],
        groundMat: 'rubble',
        skyTop: 0x667788, skyBottom: 0x99aabb,
        fogColor: 0x778899, fogDensity: 0.008,
        ambientColor: 0x778088, ambientIntensity: 0.5,
        hemiTop: 0x889999, hemiBottom: 0x333330, hemiIntensity: 0.5,
        sunColor: 0xccccbb, sunIntensity: 0.8,
        rain: false, snow: false,
        trenches: 4, ruins: 0, buildings: 0, sandbagWalls: 6,
        bunkers: 2, beachObstacles: 8, trees: 0, landingCraft: 2,
        destroyedVehicles: 3, fires: 3, smoke: 4,
        playerSpawn: { x: 0, z: 50 },
        enemySpawnZ: [-30, -70],
        planePos: { x: 6, z: 46 },
    },
    kursk: {
        name: 'Kursk',
        groundColor: [
            [0.35, 0.40, 0.20], [0.40, 0.45, 0.22], [0.38, 0.42, 0.21],
            [0.42, 0.47, 0.24], [0.33, 0.38, 0.19], [0.45, 0.48, 0.26],
            [0.37, 0.41, 0.20], [0.43, 0.46, 0.23], [0.36, 0.40, 0.20],
            [0.41, 0.44, 0.22],
        ],
        groundMat: 'foliage',
        skyTop: 0x6688aa, skyBottom: 0x99bbcc,
        fogColor: 0x88aabb, fogDensity: 0.005,
        ambientColor: 0x88aa88, ambientIntensity: 0.6,
        hemiTop: 0x99bbaa, hemiBottom: 0x4a4a2a, hemiIntensity: 0.6,
        sunColor: 0xffeecc, sunIntensity: 1.2,
        rain: false, snow: false,
        trenches: 4, ruins: 1, buildings: 0, sandbagWalls: 4,
        bunkers: 0, beachObstacles: 0, trees: 5, landingCraft: 0,
        destroyedVehicles: 5, fires: 3, smoke: 3,
        playerSpawn: { x: 0, z: 28 },
        enemySpawnZ: [-30, -70],
        planePos: { x: 6, z: 24 },
    },
    montecassino: {
        name: 'Monte Cassino',
        groundColor: [
            [0.40, 0.38, 0.30], [0.35, 0.33, 0.28], [0.45, 0.42, 0.33],
            [0.38, 0.36, 0.29], [0.42, 0.40, 0.32], [0.33, 0.31, 0.26],
            [0.44, 0.41, 0.32], [0.37, 0.35, 0.28], [0.46, 0.43, 0.34],
            [0.39, 0.37, 0.30],
        ],
        groundMat: 'ground',
        skyTop: 0x556666, skyBottom: 0x889999,
        fogColor: 0x667777, fogDensity: 0.010,
        ambientColor: 0x667070, ambientIntensity: 0.45,
        hemiTop: 0x778888, hemiBottom: 0x3a3020, hemiIntensity: 0.5,
        sunColor: 0xbbbbaa, sunIntensity: 0.7,
        rain: true, snow: false,
        trenches: 3, ruins: 5, buildings: 1, sandbagWalls: 5,
        bunkers: 1, beachObstacles: 0, trees: 8, landingCraft: 0,
        destroyedVehicles: 3, fires: 5, smoke: 5,
        playerSpawn: { x: 0, z: 28 },
        enemySpawnZ: [-30, -70],
        planePos: { x: 6, z: 24 },
    },
    bastogne: {
        name: 'Bastogne',
        groundColor: [
            [0.70, 0.72, 0.75], [0.65, 0.68, 0.72], [0.75, 0.77, 0.80],
            [0.68, 0.70, 0.74], [0.72, 0.74, 0.78], [0.62, 0.65, 0.70],
            [0.73, 0.75, 0.78], [0.66, 0.69, 0.73], [0.77, 0.79, 0.82],
            [0.69, 0.71, 0.75],
        ],
        groundMat: 'snow',
        skyTop: 0x445566, skyBottom: 0x889aaa,
        fogColor: 0x667788, fogDensity: 0.012,
        ambientColor: 0x6688aa, ambientIntensity: 0.5,
        hemiTop: 0x778899, hemiBottom: 0x444440, hemiIntensity: 0.5,
        sunColor: 0xbbbbcc, sunIntensity: 0.6,
        rain: false, snow: true,
        trenches: 2, ruins: 3, buildings: 3, sandbagWalls: 5,
        bunkers: 0, beachObstacles: 0, trees: 15, landingCraft: 0,
        destroyedVehicles: 4, fires: 4, smoke: 3,
        playerSpawn: { x: 0, z: 28 },
        enemySpawnZ: [-30, -70],
        planePos: { x: 6, z: 24 },
    },
    tobruk: {
        name: 'Tobruk',
        groundColor: [
            [0.80, 0.72, 0.50], [0.75, 0.68, 0.48], [0.85, 0.76, 0.52],
            [0.78, 0.70, 0.49], [0.82, 0.74, 0.51], [0.73, 0.66, 0.46],
            [0.83, 0.75, 0.52], [0.77, 0.69, 0.48], [0.86, 0.78, 0.54],
            [0.79, 0.71, 0.50],
        ],
        groundMat: 'sand',
        skyTop: 0xbbaa77, skyBottom: 0xddcc99,
        fogColor: 0xccbb88, fogDensity: 0.006,
        ambientColor: 0xaa9966, ambientIntensity: 0.65,
        hemiTop: 0xccbb88, hemiBottom: 0x7a6a40, hemiIntensity: 0.55,
        sunColor: 0xffeecc, sunIntensity: 1.2,
        rain: false, snow: false,
        trenches: 3, ruins: 2, buildings: 1, sandbagWalls: 8,
        bunkers: 2, beachObstacles: 0, trees: 0, landingCraft: 0,
        destroyedVehicles: 3, fires: 2, smoke: 2,
        playerSpawn: { x: 0, z: 28 },
        enemySpawnZ: [-30, -70],
        planePos: { x: 6, z: 24 },
    },
    guadalcanal: {
        name: 'Guadalcanal',
        groundColor: [
            [0.20, 0.30, 0.12], [0.18, 0.28, 0.10], [0.24, 0.34, 0.14],
            [0.22, 0.32, 0.13], [0.16, 0.26, 0.09], [0.26, 0.36, 0.16],
            [0.19, 0.29, 0.11], [0.23, 0.33, 0.14], [0.25, 0.35, 0.15],
            [0.21, 0.31, 0.12],
        ],
        groundMat: 'foliage',
        skyTop: 0x556655, skyBottom: 0x889988,
        fogColor: 0x667766, fogDensity: 0.013,
        ambientColor: 0x558855, ambientIntensity: 0.5,
        hemiTop: 0x669966, hemiBottom: 0x3a4a2a, hemiIntensity: 0.6,
        sunColor: 0xccddbb, sunIntensity: 0.7,
        rain: true, snow: false,
        trenches: 2, ruins: 0, buildings: 1, sandbagWalls: 3,
        bunkers: 1, beachObstacles: 0, trees: 50, landingCraft: 1,
        destroyedVehicles: 2, fires: 2, smoke: 3,
        playerSpawn: { x: 0, z: 28 },
        enemySpawnZ: [-30, -70],
        planePos: { x: 6, z: 24 },
    },
    leningrad: {
        name: 'Leningrad',
        groundColor: [
            [0.65, 0.68, 0.72], [0.60, 0.63, 0.68], [0.70, 0.72, 0.76],
            [0.58, 0.61, 0.66], [0.67, 0.70, 0.74], [0.55, 0.58, 0.64],
            [0.63, 0.66, 0.70], [0.72, 0.74, 0.78], [0.62, 0.65, 0.69],
            [0.68, 0.71, 0.75],
        ],
        groundMat: 'snow',
        skyTop: 0x222233, skyBottom: 0x445566,
        fogColor: 0x334455, fogDensity: 0.013,
        ambientColor: 0x556677, ambientIntensity: 0.35,
        hemiTop: 0x556677, hemiBottom: 0x333330, hemiIntensity: 0.4,
        sunColor: 0x999aaa, sunIntensity: 0.5,
        rain: false, snow: true,
        trenches: 2, ruins: 6, buildings: 3, sandbagWalls: 6,
        bunkers: 0, beachObstacles: 0, trees: 5, landingCraft: 0,
        destroyedVehicles: 5, fires: 6, smoke: 6,
        playerSpawn: { x: 0, z: 28 },
        enemySpawnZ: [-30, -70],
        planePos: { x: 6, z: 24 },
    },
    midway: {
        name: 'Midway',
        groundColor: [
            [0.78, 0.74, 0.55], [0.75, 0.70, 0.52], [0.82, 0.78, 0.58],
            [0.76, 0.72, 0.53], [0.80, 0.76, 0.56], [0.73, 0.69, 0.50],
            [0.79, 0.75, 0.55], [0.84, 0.80, 0.60], [0.77, 0.73, 0.54],
            [0.81, 0.77, 0.57],
        ],
        groundMat: 'sand',
        skyTop: 0x5588bb, skyBottom: 0x88bbdd,
        fogColor: 0x77aabb, fogDensity: 0.006,
        ambientColor: 0x7799aa, ambientIntensity: 0.6,
        hemiTop: 0x88bbcc, hemiBottom: 0x6a6a40, hemiIntensity: 0.55,
        sunColor: 0xffeecc, sunIntensity: 1.1,
        rain: false, snow: false,
        trenches: 2, ruins: 0, buildings: 1, sandbagWalls: 4,
        bunkers: 2, beachObstacles: 4, trees: 3, landingCraft: 0,
        destroyedVehicles: 2, fires: 2, smoke: 2,
        playerSpawn: { x: 0, z: 28 },
        enemySpawnZ: [-30, -70],
        planePos: { x: 6, z: 24 },
    },
    dunkirk: {
        name: 'Dunkirk',
        groundColor: [
            [0.72, 0.68, 0.52], [0.68, 0.64, 0.48], [0.76, 0.72, 0.55],
            [0.70, 0.66, 0.50], [0.74, 0.70, 0.54], [0.66, 0.62, 0.46],
            [0.73, 0.69, 0.53], [0.78, 0.74, 0.57], [0.71, 0.67, 0.51],
            [0.75, 0.71, 0.55],
        ],
        groundMat: 'sand',
        skyTop: 0x667788, skyBottom: 0x99aabb,
        fogColor: 0x889999, fogDensity: 0.009,
        ambientColor: 0x778899, ambientIntensity: 0.5,
        hemiTop: 0x88999a, hemiBottom: 0x5a5a40, hemiIntensity: 0.5,
        sunColor: 0xccccbb, sunIntensity: 0.8,
        rain: false, snow: false,
        trenches: 1, ruins: 2, buildings: 0, sandbagWalls: 4,
        bunkers: 0, beachObstacles: 6, trees: 0, landingCraft: 2,
        destroyedVehicles: 5, fires: 5, smoke: 5,
        playerSpawn: { x: 0, z: 50 },
        enemySpawnZ: [-30, -70],
        planePos: { x: 6, z: 46 },
    },
    caen: {
        name: 'Caen',
        groundColor: [
            [0.30, 0.35, 0.20], [0.28, 0.33, 0.18], [0.34, 0.38, 0.22],
            [0.32, 0.36, 0.21], [0.26, 0.31, 0.17], [0.36, 0.40, 0.24],
            [0.29, 0.34, 0.19], [0.33, 0.37, 0.22], [0.35, 0.39, 0.23],
            [0.31, 0.35, 0.20],
        ],
        groundMat: 'foliage',
        skyTop: 0x667788, skyBottom: 0x99aabb,
        fogColor: 0x88999a, fogDensity: 0.008,
        ambientColor: 0x778088, ambientIntensity: 0.55,
        hemiTop: 0x88999a, hemiBottom: 0x3a3a22, hemiIntensity: 0.55,
        sunColor: 0xddddcc, sunIntensity: 0.9,
        rain: false, snow: false,
        trenches: 2, ruins: 3, buildings: 3, sandbagWalls: 5,
        bunkers: 0, beachObstacles: 0, trees: 12, landingCraft: 0,
        destroyedVehicles: 4, fires: 4, smoke: 3,
        playerSpawn: { x: 0, z: 28 },
        enemySpawnZ: [-30, -70],
        planePos: { x: 6, z: 24 },
    },
    warsaw: {
        name: 'Warsaw',
        groundColor: [
            [0.32, 0.30, 0.28], [0.28, 0.26, 0.24], [0.36, 0.34, 0.32],
            [0.30, 0.28, 0.26], [0.34, 0.32, 0.30], [0.26, 0.24, 0.22],
            [0.35, 0.33, 0.30], [0.29, 0.27, 0.25], [0.38, 0.36, 0.33],
            [0.31, 0.29, 0.27],
        ],
        groundMat: 'rubble',
        skyTop: 0x222228, skyBottom: 0x444448,
        fogColor: 0x333338, fogDensity: 0.014,
        ambientColor: 0x444450, ambientIntensity: 0.35,
        hemiTop: 0x555558, hemiBottom: 0x2a2018, hemiIntensity: 0.4,
        sunColor: 0x998877, sunIntensity: 0.5,
        rain: true, snow: false,
        trenches: 1, ruins: 7, buildings: 2, sandbagWalls: 6,
        bunkers: 0, beachObstacles: 0, trees: 0, landingCraft: 0,
        destroyedVehicles: 5, fires: 8, smoke: 8,
        playerSpawn: { x: 0, z: 28 },
        enemySpawnZ: [-30, -70],
        planePos: { x: 6, z: 24 },
    },
    okinawa: {
        name: 'Okinawa',
        groundColor: [
            [0.25, 0.35, 0.18], [0.22, 0.32, 0.16], [0.28, 0.38, 0.20],
            [0.24, 0.34, 0.17], [0.30, 0.40, 0.22], [0.20, 0.30, 0.14],
            [0.26, 0.36, 0.19], [0.29, 0.39, 0.21], [0.23, 0.33, 0.16],
            [0.27, 0.37, 0.20],
        ],
        groundMat: 'foliage',
        skyTop: 0x556666, skyBottom: 0x889999,
        fogColor: 0x778888, fogDensity: 0.010,
        ambientColor: 0x668877, ambientIntensity: 0.5,
        hemiTop: 0x779988, hemiBottom: 0x3a4a2a, hemiIntensity: 0.55,
        sunColor: 0xccddbb, sunIntensity: 0.8,
        rain: true, snow: false,
        trenches: 3, ruins: 1, buildings: 1, sandbagWalls: 4,
        bunkers: 2, beachObstacles: 4, trees: 20, landingCraft: 1,
        destroyedVehicles: 3, fires: 3, smoke: 3,
        playerSpawn: { x: 0, z: 28 },
        enemySpawnZ: [-30, -70],
        planePos: { x: 6, z: 24 },
    },
    rhine: {
        name: 'Rhine Crossing',
        groundColor: [
            [0.28, 0.33, 0.18], [0.25, 0.30, 0.16], [0.32, 0.37, 0.20],
            [0.30, 0.35, 0.19], [0.34, 0.38, 0.22], [0.26, 0.31, 0.17],
            [0.29, 0.34, 0.19], [0.33, 0.37, 0.21], [0.27, 0.32, 0.18],
            [0.31, 0.36, 0.20],
        ],
        groundMat: 'foliage',
        skyTop: 0x778899, skyBottom: 0xaabbcc,
        fogColor: 0x99aabb, fogDensity: 0.007,
        ambientColor: 0x889999, ambientIntensity: 0.55,
        hemiTop: 0x99aabb, hemiBottom: 0x4a4a30, hemiIntensity: 0.5,
        sunColor: 0xddddcc, sunIntensity: 0.9,
        rain: false, snow: false,
        trenches: 2, ruins: 2, buildings: 1, sandbagWalls: 5,
        bunkers: 1, beachObstacles: 0, trees: 8, landingCraft: 0,
        destroyedVehicles: 4, fires: 3, smoke: 3,
        playerSpawn: { x: 0, z: 28 },
        enemySpawnZ: [-30, -70],
        planePos: { x: 6, z: 24 },
    },
    hurtgen: {
        name: 'Hurtgen Forest',
        groundColor: [
            [0.18, 0.22, 0.12], [0.15, 0.20, 0.10], [0.22, 0.26, 0.14],
            [0.20, 0.24, 0.13], [0.16, 0.21, 0.11], [0.24, 0.28, 0.16],
            [0.19, 0.23, 0.12], [0.23, 0.27, 0.15], [0.17, 0.22, 0.11],
            [0.21, 0.25, 0.14],
        ],
        groundMat: 'foliage',
        skyTop: 0x334444, skyBottom: 0x556666,
        fogColor: 0x445555, fogDensity: 0.015,
        ambientColor: 0x446655, ambientIntensity: 0.35,
        hemiTop: 0x556655, hemiBottom: 0x2a2a1a, hemiIntensity: 0.45,
        sunColor: 0xaaaaaa, sunIntensity: 0.5,
        rain: true, snow: false,
        trenches: 3, ruins: 0, buildings: 0, sandbagWalls: 3,
        bunkers: 0, beachObstacles: 0, trees: 50, landingCraft: 0,
        destroyedVehicles: 2, fires: 2, smoke: 3,
        playerSpawn: { x: 0, z: 28 },
        enemySpawnZ: [-30, -70],
        planePos: { x: 6, z: 24 },
    },
    sevastopol: {
        name: 'Sevastopol',
        groundColor: [
            [0.38, 0.36, 0.30], [0.34, 0.32, 0.28], [0.42, 0.40, 0.33],
            [0.36, 0.34, 0.29], [0.40, 0.38, 0.32], [0.32, 0.30, 0.26],
            [0.39, 0.37, 0.31], [0.44, 0.42, 0.35], [0.35, 0.33, 0.28],
            [0.41, 0.39, 0.33],
        ],
        groundMat: 'ground',
        skyTop: 0x556677, skyBottom: 0x889aaa,
        fogColor: 0x778899, fogDensity: 0.010,
        ambientColor: 0x668088, ambientIntensity: 0.45,
        hemiTop: 0x778899, hemiBottom: 0x3a3020, hemiIntensity: 0.5,
        sunColor: 0xbbbbaa, sunIntensity: 0.7,
        rain: true, snow: false,
        trenches: 3, ruins: 4, buildings: 2, sandbagWalls: 6,
        bunkers: 2, beachObstacles: 0, trees: 3, landingCraft: 0,
        destroyedVehicles: 4, fires: 5, smoke: 5,
        playerSpawn: { x: 0, z: 28 },
        enemySpawnZ: [-30, -70],
        planePos: { x: 6, z: 24 },
    },
};

function createMap(themeKey) {
    clearMap();
    themeKey = themeKey || selectedMap;
    const theme = MAP_THEMES[themeKey];
    const S = CFG.MAP_SIZE;

    // Update scene fog, background, and lighting to match theme
    scene.background = new THREE.Color(theme.fogColor);
    scene.fog = new THREE.FogExp2(theme.fogColor, theme.fogDensity);
    updateLightingForTheme(theme);

    // Ground with theme-based vertex colors
    const groundGeo = new THREE.PlaneGeometry(S * 2, S * 2, 50, 50);
    const pos = groundGeo.attributes.position;
    const vertCount = pos.count;
    const colors = new Float32Array(vertCount * 3);
    const shades = theme.groundColor;

    for (let i = 0; i < vertCount; i++) {
        const x = pos.getX(i), y = pos.getY(i);
        const height = Math.sin(x * 0.06) * Math.cos(y * 0.06) * 0.7
            + Math.sin(x * 0.25 + 2) * Math.cos(y * 0.2) * 0.3
            + Math.random() * 0.12;
        pos.setZ(i, height);

        const n1 = Math.sin(x * 0.08 + 1.3) * Math.cos(y * 0.07 + 0.7);
        const n2 = Math.sin(x * 0.3 + 5.1) * Math.cos(y * 0.25 + 2.3) * 0.5;
        const n3 = (Math.random() - 0.5) * 0.3;
        const blend = Math.max(0, Math.min(1, (n1 + n2 + n3 + 1) * 0.5));

        const idx = Math.min(Math.floor(blend * (shades.length - 1)), shades.length - 1);
        const idx2 = (idx + 3) % shades.length;
        const t = (blend * (shades.length - 1)) - idx;
        const c1 = shades[idx], c2 = shades[idx2];

        const wetFactor = height < 0.1 ? 0.7 + height * 3 : 1.0;
        colors[i * 3]     = (c1[0] * (1 - t) + c2[0] * t) * wetFactor;
        colors[i * 3 + 1] = (c1[1] * (1 - t) + c2[1] * t) * wetFactor;
        colors[i * 3 + 2] = (c1[2] * (1 - t) + c2[2] * t) * wetFactor;
    }

    groundGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    groundGeo.computeVertexNormals();

    const groundMatKey = theme.groundMat;
    const ground = new THREE.Mesh(groundGeo, MAT[groundMatKey] || MAT.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    addMapObject(ground);

    // Dirt patches
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
        addMapObject(dirtMesh);
    }

    // Craters
    for (let i = 0; i < CFG.CRATER_COUNT; i++) {
        const cx = (Math.random() - 0.5) * S * 1.4;
        const cz = (Math.random() - 0.5) * S * 1.4;
        const cr = 1 + Math.random() * 3;
        if (!checkCollision(cx, cz, cr + 1)) {
            createCrater(cx, cz, cr);
        }
    }

    // Helper: random position with collision check
    function randPos(spread, radius) {
        let px, pz, attempts = 0;
        do {
            px = (Math.random() - 0.5) * S * spread;
            pz = (Math.random() - 0.5) * S * spread;
            attempts++;
        } while (checkCollision(px, pz, radius || 3) && attempts < 40);
        return { x: px, z: pz };
    }

    // === TRENCHES ===
    if (theme.trenches >= 2) {
        // Front lines
        createTrench(0, 15, 50, 0);
        createTrench(0, -20, 50, 0);
    }
    if (theme.trenches >= 3) {
        createTrench(0, 28, 35, 0);
    }
    if (theme.trenches >= 4) {
        createTrench(0, -35, 35, 0);
        createTrench(-10, 21, 14, Math.PI / 2);
        createTrench(10, -27, 16, Math.PI / 2);
    }

    // No man's land craters
    for (let i = 0; i < 6; i++) {
        const cx = (Math.random() - 0.5) * 70;
        const cz = (Math.random() - 0.5) * 16;
        createCrater(cx, cz, 1.5 + Math.random() * 2);
    }

    // === SANDBAG WALLS ===
    const sandbagPositions = [
        [-15, 12], [15, 12], [-15, -18], [15, -18],
        [-20, 0], [20, -5], [-30, 5], [30, -10],
    ];
    for (let i = 0; i < Math.min(theme.sandbagWalls, sandbagPositions.length); i++) {
        const p = sandbagPositions[i];
        createSandbagWall(p[0], p[1], 4 + Math.random() * 3, i >= 4 ? (Math.random() - 0.5) * Math.PI / 2 : 0);
    }

    // === BARBED WIRE ===
    if (QUALITY !== 'low' && themeKey !== 'ardennes') {
        createBarbedWire(-15, 8, 20, 0);
        createBarbedWire(15, 8, 20, 0);
        createBarbedWire(-10, -12, 18, 0);
        createBarbedWire(15, -12, 18, 0);
    }

    // === BUNKERS (Normandy) ===
    if (theme.bunkers > 0) {
        createBunker(-25, -25, 0);
        if (theme.bunkers >= 2) createBunker(25, -30, 0);
    }

    // === BEACH OBSTACLES (Normandy) ===
    for (let i = 0; i < theme.beachObstacles; i++) {
        const p = randPos(1.0, 2);
        createBeachObstacle(p.x, p.z);
    }

    // === LANDING CRAFT (Normandy) ===
    if (theme.landingCraft > 0) {
        createLandingCraft(-20, 55);
        if (theme.landingCraft >= 2) createLandingCraft(15, 58);
    }

    // === RUINS ===
    const ruinSlots = [
        [-40, -15, 8, 8, 3], [40, -10, 6, 10, 2.5],
        [-35, 22, 8, 6, 3], [0, -50, 10, 8, 4],
        [-20, -35, 7, 7, 3], [30, 15, 6, 8, 2.5],
        [50, -30, 8, 6, 3.5],
    ];
    for (let i = 0; i < Math.min(theme.ruins, ruinSlots.length); i++) {
        const r = ruinSlots[i];
        createRuin(r[0], r[1], r[2], r[3], r[4]);
    }

    // === BUILDINGS ===
    const buildingSlots = [
        [-45, 40, 10, 8, 6], [50, -45, 10, 8, 5],
        [-30, -40, 8, 7, 5],
    ];
    for (let i = 0; i < Math.min(theme.buildings, buildingSlots.length); i++) {
        const b = buildingSlots[i];
        createBuilding(b[0], b[1], b[2], b[3], b[4]);
    }

    // Supply road (skip for forest)
    if (themeKey !== 'ardennes') {
        createRoad(0, 40, S * 1.2, 5);
    }

    // === TREES (Ardennes) ===
    for (let i = 0; i < theme.trees; i++) {
        const p = randPos(1.3, 2);
        createTree(p.x, p.z);
    }

    // === FALLEN LOGS + ROCKS (Ardennes) ===
    if (themeKey === 'ardennes') {
        for (let i = 0; i < 8; i++) {
            const p = randPos(1.2, 2);
            createFallenLog(p.x, p.z);
        }
        for (let i = 0; i < 10; i++) {
            const p = randPos(1.2, 3);
            createRockCluster(p.x, p.z);
        }
    }

    // === DESTROYED VEHICLES ===
    const vehicleSlots = [
        { type: 'tank', x: -15, z: 3 }, { type: 'tank', x: 20, z: -5 },
        { type: 'jeep', x: 10, z: 25 }, { type: 'jeep', x: 35, z: -35 },
        { type: 'tank', x: -35, z: -20 },
    ];
    for (let i = 0; i < Math.min(theme.destroyedVehicles, vehicleSlots.length); i++) {
        const v = vehicleSlots[i];
        if (v.type === 'tank') createDestroyedTank(v.x, v.z);
        else createDestroyedJeep(v.x, v.z);
    }

    // === SUPPLY CRATES ===
    const crateCount = Math.floor(CFG.CRATE_COUNT / 2);
    for (let i = 0; i < crateCount; i++) {
        const cx = (Math.random() - 0.5) * S * 1.2;
        const cz = (Math.random() - 0.5) * S * 1.2;
        if (!checkCollision(cx, cz, 2)) {
            createCrate(cx, cz, 0.8 + Math.random() * 0.6);
        }
    }

    // Flags
    createFlagPole(-5, 35, 'ally');
    createFlagPole(5, -35, 'enemy');

    // Boundary walls
    const wallH = 4, wallThick = 1;
    createBox(0, -S, S * 2, wallThick, wallH, MAT.concreteDark, true);
    createBox(0, S, S * 2, wallThick, wallH, MAT.concreteDark, true);
    createBox(-S, 0, wallThick, S * 2, wallH, MAT.concreteDark, true);
    createBox(S, 0, wallThick, S * 2, wallH, MAT.concreteDark, true);

    // Mountains
    for (let i = 0; i < CFG.MOUNTAIN_COUNT; i++) {
        const ang = (i / CFG.MOUNTAIN_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const dist = 95 + Math.random() * 25;
        const mh = 15 + Math.random() * 25;
        const geo = new THREE.ConeGeometry(10 + Math.random() * 12, mh, 5);
        const mesh = new THREE.Mesh(geo, i % 2 === 0 ? MAT.mountain1 : MAT.mountain2);
        mesh.position.set(Math.cos(ang) * dist, mh / 2 - 3, Math.sin(ang) * dist);
        mesh.rotation.y = Math.random() * Math.PI;
        addMapObject(mesh);
    }

    // Sky dome (theme-aware)
    createSky(theme);

    // === FIRES AND SMOKE ===
    const fireSlots = [
        [-40, 0.5, -15], [-38, 1.5, -13], [40, 0.5, -10], [42, 1.2, -8],
        [-15, 0.8, 3], [20, 0.8, -5], [-45, 3, 40], [50, 2.5, -45],
    ];
    for (let i = 0; i < Math.min(theme.fires, fireSlots.length); i++) {
        const f = fireSlots[i];
        createFire(f[0], f[1], f[2]);
    }

    if (QUALITY !== 'low') {
        const smokeSlots = [
            [-40, 3, -15], [-35, 2, 22], [40, 3, -10], [0, 3, -50],
            [-45, 5, 40], [50, 4, -45], [-15, 2, 3], [20, 2, -5],
        ];
        for (let i = 0; i < Math.min(theme.smoke, smokeSlots.length); i++) {
            const s = smokeSlots[i];
            spawnAmbientSmoke(s[0], s[1], s[2]);
        }
    }

    // Weather
    if (theme.rain) createRain();
    if (theme.snow) createSnowSystem();

    // Player-flyable Luftwaffe plane
    createGroundedPlane();
}

function createCrater(x, z, radius) {
    const rimGeo = new THREE.RingGeometry(radius * 0.6, radius, 10);
    const rim = new THREE.Mesh(rimGeo, MAT.dirt);
    rim.rotation.x = -Math.PI / 2;
    rim.position.set(x, 0.04, z);
    rim.receiveShadow = true;
    addMapObject(rim);

    const innerGeo = new THREE.CircleGeometry(radius * 0.6, 8);
    const inner = new THREE.Mesh(innerGeo, MAT.mud);
    inner.rotation.x = -Math.PI / 2;
    inner.position.set(x, 0.02, z);
    inner.receiveShadow = true;
    addMapObject(inner);
}

function createSky(theme) {
    const t = theme || MAP_THEMES[selectedMap];
    const skyGeo = new THREE.SphereGeometry(350, 16, 12);
    const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
            topColor: { value: new THREE.Color(t.skyTop) },
            bottomColor: { value: new THREE.Color(t.skyBottom) },
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
    addMapObject(sky);

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
        addMapObject(cloud);
    }
}

function createFire(x, y, z) {
    const fireGroup = new THREE.Group();
    // Bright core flames (yellow-white, small, central)
    for (let i = 0; i < 2; i++) {
        const fGeo = new THREE.PlaneGeometry(0.3 + Math.random() * 0.2, 0.6 + Math.random() * 0.4);
        const fMesh = new THREE.Mesh(fGeo, MAT.fireCore);
        fMesh.position.set((Math.random() - 0.5) * 0.2, 0.3 + Math.random() * 0.2, (Math.random() - 0.5) * 0.2);
        fMesh.rotation.y = Math.random() * Math.PI;
        fMesh.userData.baseY = fMesh.position.y;
        fMesh.userData.phaseOffset = Math.random() * Math.PI * 2;
        fMesh.userData.flickerSpeed = 8 + Math.random() * 4;
        fMesh.userData.flickerAmt = 0.1 + Math.random() * 0.08;
        fMesh.userData.baseScale = 0.8 + Math.random() * 0.4;
        fireGroup.add(fMesh);
    }
    // Main orange/red flames (medium, surrounding core)
    for (let i = 0; i < 4; i++) {
        const fGeo = new THREE.PlaneGeometry(0.5 + Math.random() * 0.5, 1.0 + Math.random() * 0.8);
        const fMesh = new THREE.Mesh(fGeo, i < 2 ? MAT.fire : MAT.fireGlow);
        fMesh.position.set((Math.random() - 0.5) * 0.6, 0.5 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6);
        fMesh.rotation.y = Math.random() * Math.PI;
        fMesh.userData.baseY = fMesh.position.y;
        fMesh.userData.phaseOffset = Math.random() * Math.PI * 2;
        fMesh.userData.flickerSpeed = 5 + Math.random() * 3;
        fMesh.userData.flickerAmt = 0.12 + Math.random() * 0.1;
        fMesh.userData.baseScale = 1.0 + Math.random() * 0.3;
        fireGroup.add(fMesh);
    }
    // Dark smoke wisps rising from fire
    for (let i = 0; i < 2; i++) {
        const sGeo = new THREE.PlaneGeometry(0.8 + Math.random() * 0.6, 1.2 + Math.random() * 0.8);
        const sMesh = new THREE.Mesh(sGeo, MAT.fireSmoke);
        sMesh.position.set((Math.random() - 0.5) * 0.4, 1.2 + Math.random() * 0.5, (Math.random() - 0.5) * 0.4);
        sMesh.rotation.y = Math.random() * Math.PI;
        sMesh.userData.baseY = sMesh.position.y;
        sMesh.userData.phaseOffset = Math.random() * Math.PI * 2;
        sMesh.userData.flickerSpeed = 2 + Math.random() * 2;
        sMesh.userData.flickerAmt = 0.2;
        sMesh.userData.baseScale = 1.0;
        sMesh.userData.isFireSmoke = true;
        fireGroup.add(sMesh);
    }
    fireGroup.position.set(x, y, z);
    addMapObject(fireGroup);

    if (CFG.FIRE_LIGHTS) {
        const fireLight = new THREE.PointLight(0xff5511, 2.5, 18);
        fireLight.position.set(x, y + 1.5, z);
        fireLight.userData.baseIntensity = 2.5;
        fireLight.userData.phaseOffset = Math.random() * Math.PI * 2;
        addMapObject(fireLight);
        fireLights.push({ light: fireLight, group: fireGroup });
    }
}

function spawnAmbientSmoke(x, y, z) {
    for (let i = 0; i < 5; i++) {
        const smokeMatFromPool = POOL.smokeMatPool[POOL._smokeMatIdx++ % POOL.smokeMatPool.length];
        const smoke = new THREE.Mesh(POOL.smokeGeo, smokeMatFromPool);
        smoke.position.set(x + (Math.random() - 0.5) * 3, y + i * 1.5 + Math.random() * 2, z + (Math.random() - 0.5) * 3);
        smoke.rotation.set(Math.random(), Math.random(), Math.random());
        const baseSize = 1.5 + Math.random() * 3.5;
        smoke.scale.setScalar(baseSize);
        smoke.userData.baseY = smoke.position.y;
        smoke.userData.baseX = smoke.position.x;
        smoke.userData.baseZ = smoke.position.z;
        smoke.userData.riseSpeed = 0.4 + Math.random() * 0.5;
        smoke.userData.driftX = (Math.random() - 0.5) * 0.3;
        smoke.userData.driftZ = (Math.random() - 0.5) * 0.2;
        smoke.userData.turbulencePhase = Math.random() * Math.PI * 2;
        smoke.userData.turbulenceAmt = 0.3 + Math.random() * 0.4;
        smoke.userData.growRate = 0.3 + Math.random() * 0.3;
        smoke.userData.baseScale = baseSize;
        smoke.userData.resetY = y;
        smoke.userData.maxY = y + 15;
        smoke.userData.maxOpacity = smokeMatFromPool.opacity;
        addMapObject(smoke);
        ambientSmoke.push(smoke);
    }
}

function createBox(x, z, w, d, h, mat, collide, y) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, (y || 0) + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    addMapObject(mesh);
    if (collide) addCollider(x, z, w, d, h, y);
    return mesh;
}

function createRoad(x, z, w, d) {
    const geo = new THREE.PlaneGeometry(w, d);
    const mesh = new THREE.Mesh(geo, MAT.road);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.02, z);
    mesh.receiveShadow = true;
    addMapObject(mesh);
}

function createBuilding(x, z, w, d, h) {
    // Main walls
    createBox(x, z, w, d, h, MAT.brick, true);

    // Roof with slight overhang
    const roofGeo = new THREE.BoxGeometry(w + 1.2, 0.5, d + 1.2);
    const roof = new THREE.Mesh(roofGeo, MAT.roof);
    roof.position.set(x, h + 0.25, z);
    addMapObject(roof);

    // Chimney on some buildings
    if (Math.random() > 0.4) {
        if (!createBuilding._chimGeo) createBuilding._chimGeo = new THREE.BoxGeometry(0.8, 2.5, 0.8);
        const chim = new THREE.Mesh(createBuilding._chimGeo, MAT.brickDark);
        chim.position.set(x + w * 0.3, h + 1.5, z + d * 0.3);
        addMapObject(chim);
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
            addMapObject(wm);
            const frame = new THREE.Mesh(frameGeo, MAT.woodDark);
            frame.position.set(px, winH, pz);
            addMapObject(frame);
        }
    }

    // Door with frame
    const door = new THREE.Mesh(_doorGeo, MAT.door);
    door.position.set(x, 1.25, z - d / 2 - 0.01);
    addMapObject(door);
    // Door frame
    if (!createBuilding._dfGeo) createBuilding._dfGeo = new THREE.BoxGeometry(1.7, 2.7, 0.08);
    const df = new THREE.Mesh(createBuilding._dfGeo, MAT.woodDark);
    df.position.set(x, 1.35, z - d / 2 - 0.04);
    addMapObject(df);

    // Foundation strip
    const foundGeo = new THREE.BoxGeometry(w + 0.2, 0.3, d + 0.2); // size varies per building
    const found = new THREE.Mesh(foundGeo, MAT.concreteDark);
    found.position.set(x, 0.15, z);
    found.receiveShadow = true;
    addMapObject(found);
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
    addMapObject(scorch);
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
    addMapObject(group);
    addCollider(x, z, length, 1, 1);
}

function createTrench(x, z, length, angle) {
    const trenchW = 3, trenchD = 3.5;
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
    const parapetGeo = new THREE.BoxGeometry(length, 0.5, 0.6);
    const p1 = new THREE.Mesh(parapetGeo, MAT.sandbag);
    p1.position.set(0, 0.25, -trenchW / 2 - 0.25);
    group.add(p1);
    const p2 = new THREE.Mesh(parapetGeo, MAT.sandbag);
    p2.position.set(0, 0.25, trenchW / 2 + 0.25);
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
    addMapObject(group);
}

function createCrate(x, z, size) {
    const geo = new THREE.BoxGeometry(size, size, size);
    const mesh = new THREE.Mesh(geo, MAT.crate);
    mesh.position.set(x, size / 2, z);
    mesh.rotation.y = Math.random() * Math.PI;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    addMapObject(mesh);
    addCollider(x, z, size, size, size);

    // Metal corner bands
    const bandGeo = new THREE.BoxGeometry(size + 0.02, 0.06, size + 0.02);
    const band = new THREE.Mesh(bandGeo, MAT.rustMetal);
    band.position.set(x, size * 0.3, z);
    band.rotation.y = mesh.rotation.y;
    addMapObject(band);
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
    addMapObject(group);
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
    addMapObject(group);
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
    addMapObject(group);
}

function createFlagPole(x, z, team) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 6, 6), MAT.metal);
    pole.position.set(x, 3, z);
    addMapObject(pole);
    const flagGeo = new THREE.PlaneGeometry(2, 1.2, 10, 5);
    const flagMat = team === 'ally' ? MAT.flagGerman : MAT.flagRussian;
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(x + 1, 5, z);
    flag.userData.windPhase = Math.random() * Math.PI * 2;
    addMapObject(flag);
    flagMeshes.push(flag);
}

// ---- MAP OBJECT TRACKING ----
function addMapObject(obj) {
    scene.add(obj);
    mapObjects.push(obj);
    return obj;
}

function clearMap() {
    for (const obj of mapObjects) {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose && m.dispose());
            else if (obj.material.dispose) obj.material.dispose();
        }
        if (obj.children) {
            obj.traverse(child => {
                if (child.geometry) child.geometry.dispose();
            });
            obj.clear();
        }
    }
    mapObjects = [];
    colliders.length = 0;
    flagMeshes = [];
    fireLights = [];
    ambientSmoke = [];
    if (rainGroup) { scene.remove(rainGroup); rainGroup = null; }
    if (snowParticles) { scene.remove(snowParticles); snowParticles = null; }
    groundedPlane = null;
}

// ---- THEME-SPECIFIC HELPERS ----
function createTree(x, z) {
    const group = new THREE.Group();
    const trunkH = 4 + Math.random() * 4;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, trunkH, 6), MAT.treeTrunk);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);
    // Pine cone shape: 2-3 layers
    const layers = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < layers; i++) {
        const r = 2.5 - i * 0.6 + Math.random() * 0.3;
        const h = 2.5 - i * 0.3;
        const leafMat = Math.random() > 0.5 ? MAT.treeLeaves : MAT.treeLeavesDark;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), leafMat);
        cone.position.y = trunkH - 0.5 + i * 1.8;
        cone.castShadow = true;
        group.add(cone);
    }
    group.position.set(x, 0, z);
    addMapObject(group);
    addCollider(x, z, 1, 1, trunkH);
}

function createBeachObstacle(x, z) {
    // Czech hedgehog (3 crossed beams)
    const group = new THREE.Group();
    const beamGeo = new THREE.BoxGeometry(0.2, 3, 0.2);
    for (let i = 0; i < 3; i++) {
        const beam = new THREE.Mesh(beamGeo, MAT.hedgehog);
        beam.rotation.z = (i / 3) * Math.PI;
        beam.rotation.x = Math.PI / 4;
        beam.castShadow = true;
        group.add(beam);
    }
    group.position.set(x, 1.2, z);
    group.rotation.y = Math.random() * Math.PI;
    addMapObject(group);
    addCollider(x, z, 2, 2, 2.5);
}

function createBunker(x, z, angle) {
    const group = new THREE.Group();
    // Thick concrete walls
    const back = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 1), MAT.bunkerWall);
    back.position.set(0, 1.5, 2); back.castShadow = true; group.add(back);
    const left = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 5), MAT.bunkerWall);
    left.position.set(-3.5, 1.5, 0); left.castShadow = true; group.add(left);
    const right = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 5), MAT.bunkerWall);
    right.position.set(3.5, 1.5, 0); right.castShadow = true; group.add(right);
    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 5), MAT.bunkerWall);
    roof.position.set(0, 3, 0); roof.castShadow = true; group.add(roof);
    // Firing slit (dark gap in front)
    const front = new THREE.Mesh(new THREE.BoxGeometry(8, 1.5, 0.6), MAT.bunkerWall);
    front.position.set(0, 0.75, -2.2); front.castShadow = true; group.add(front);
    const frontTop = new THREE.Mesh(new THREE.BoxGeometry(8, 0.8, 0.6), MAT.bunkerWall);
    frontTop.position.set(0, 2.6, -2.2); group.add(frontTop);

    group.position.set(x, 0, z);
    group.rotation.y = angle || 0;
    addMapObject(group);
    addCollider(x, z, 8, 5, 3.5);
}

function createLandingCraft(x, z) {
    const group = new THREE.Group();
    // Hull
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.5, 7), MAT.boatWood);
    hull.position.y = 0.75; hull.castShadow = true; group.add(hull);
    // Side walls
    const sideGeo = new THREE.BoxGeometry(0.2, 1.2, 7);
    const s1 = new THREE.Mesh(sideGeo, MAT.darkMetal);
    s1.position.set(-1.7, 1.5, 0); group.add(s1);
    const s2 = new THREE.Mesh(sideGeo, MAT.darkMetal);
    s2.position.set(1.7, 1.5, 0); group.add(s2);
    // Ramp (front, dropped)
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.15, 3), MAT.darkMetal);
    ramp.position.set(0, 0.1, -4.5);
    ramp.rotation.x = -0.2;
    group.add(ramp);

    group.position.set(x, -0.3, z);
    group.rotation.y = Math.PI + (Math.random() - 0.5) * 0.4;
    addMapObject(group);
    addCollider(x, z, 4, 7, 2);
}

function createFallenLog(x, z) {
    const len = 3 + Math.random() * 4;
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, len, 6), MAT.log);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = Math.random() * Math.PI;
    log.position.set(x, 0.25, z);
    log.castShadow = true;
    addMapObject(log);
    addCollider(x, z, len, 0.6, 0.6);
}

function createRockCluster(x, z) {
    const group = new THREE.Group();
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
        const r = 0.5 + Math.random() * 1;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), MAT.rock);
        rock.position.set((Math.random() - 0.5) * 2, r * 0.5, (Math.random() - 0.5) * 2);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        group.add(rock);
    }
    group.position.set(x, 0, z);
    addMapObject(group);
    addCollider(x, z, 3, 3, 2);
}

function createSnowSystem() {
    const count = QUALITY === 'low' ? 500 : QUALITY === 'medium' ? 1500 : 3000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 1] = Math.random() * 40;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.7, depthWrite: false });
    snowParticles = new THREE.Points(geo, mat);
    scene.add(snowParticles);
}

function updateSnow(dt) {
    if (!snowParticles) return;
    const pos = snowParticles.geometry.attributes.position;
    const arr = pos.array;
    const count = arr.length / 3;
    const fallSpeed = 3 * dt;
    const driftX = 1.5 * dt;
    const driftZ = 0.5 * dt;
    for (let i = 0; i < count; i++) {
        arr[i * 3] += driftX + Math.sin(arr[i * 3 + 1] * 0.5) * 0.5 * dt;
        arr[i * 3 + 1] -= fallSpeed;
        arr[i * 3 + 2] += driftZ;
        if (arr[i * 3 + 1] < 0) {
            arr[i * 3] = player.x + (Math.random() - 0.5) * 100;
            arr[i * 3 + 1] = 35 + Math.random() * 5;
            arr[i * 3 + 2] = player.z + (Math.random() - 0.5) * 100;
        }
    }
    pos.needsUpdate = true;
}

// ---- PLAYER ----
function createPlayer() {
    const theme = MAP_THEMES[selectedMap];
    const spawn = theme ? theme.playerSpawn : { x: 0, z: 28 };
    player = {
        x: spawn.x, y: CFG.PLAYER_HEIGHT, z: spawn.z,
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
        // Skip cutscene
        if (cutsceneActive && (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape')) {
            endCutscene();
            return;
        }
        if (e.code === 'Digit1') switchWeapon(0);
        if (e.code === 'Digit2') switchWeapon(1);
        if (e.code === 'Digit3') switchWeapon(2);
        if (e.code === 'Digit4') switchWeapon(3);
        if (e.code === 'Digit5') switchWeapon(4);
        if (e.code === 'KeyR' && !playerFlying && !playerInTank) reload();
        if (e.code === 'KeyG' && !playerFlying && !playerInTank) throwGrenade();
        if (e.code === 'KeyF' && gameRunning && player && player.alive) {
            if (playerInTank) { exitTank(); }
            else if (playerFlying) { exitPlane(); }
            else { if (!tryEnterTank()) togglePlane(); }
        }
        if (e.code === 'KeyC' && playerFlying) planeCamMode = planeCamMode === 'first' ? 'third' : 'first';
        if (e.code === 'KeyC' && playerInTank) tankCamMode = tankCamMode === 'first' ? 'third' : 'first';
        if (e.code === 'Space' && pointerLocked && gameRunning && player && player.alive) {
            if (playerFlying) {
                dropPlayerBomb();
            } else if (playerInTank) {
                firePlayerTankCannon();
            } else {
                const w = player.weapons[player.weaponIndex];
                if (!w.auto) shoot();
            }
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
        if (!pointerLocked && gameRunning && !cutsceneActive) {
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
let _fpSkinMat = null, _fpSleeveMat = null;
function getWeaponMats() {
    if (!_gunMat) {
        _gunMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5, metalness: 0.6 });
        _woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.8, metalness: 0 });
        _scopeLensMat1 = new THREE.MeshBasicMaterial({ color: 0x6688cc, transparent: true, opacity: 0.5 });
        _scopeLensMat2 = new THREE.MeshBasicMaterial({ color: 0x6688cc, transparent: true, opacity: 0.4 });
        _fpSkinMat = new THREE.MeshStandardMaterial({ color: 0xd4a878, roughness: 0.75, metalness: 0 });
        _fpSleeveMat = new THREE.MeshStandardMaterial({ color: 0x2a4a1a, roughness: 0.85, metalness: 0 }); // OD green sleeve
    }
    return { gunMat: _gunMat, woodMat: _woodMat };
}

function createWeaponModel() {
    if (weaponModel) {
        camera.remove(weaponModel);
        // No geometry dispose needed — geometries are pooled
    }

    weaponModel = new THREE.Group();
    const { gunMat, woodMat } = getWeaponMats();
    const w = player.weapons[player.weaponIndex];
    const B = POOL.getBoxGeo, C = POOL.getCylGeo, C2 = POOL.getCylGeo2;

    if (w.name === 'M1 Garand') {
        weaponModel.add(makeMesh(B(0.06, 0.08, 0.35), woodMat, 0, -0.02, 0.15));
        weaponModel.add(makeCylMesh(0.015, 0.6, gunMat, 0, 0.02, -0.25));
        weaponModel.add(makeMesh(B(0.04, 0.06, 0.3), gunMat, 0, 0, -0.05));
        weaponModel.add(makeMesh(B(0.05, 0.04, 0.15), gunMat, 0, 0.03, -0.1));
        weaponModel.add(makeMesh(B(0.03, 0.04, 0.06), gunMat, 0, -0.04, 0.02));
    } else if (w.name === 'Thompson') {
        const drum = new THREE.Mesh(C2(0.04, 0.04, 0.06, 12), gunMat);
        drum.position.set(0, -0.06, -0.05); weaponModel.add(drum);
        weaponModel.add(makeMesh(B(0.05, 0.06, 0.25), gunMat, 0, 0, -0.02));
        weaponModel.add(makeCylMesh(0.018, 0.3, gunMat, 0, 0.01, -0.28));
        weaponModel.add(makeMesh(B(0.05, 0.05, 0.2), woodMat, 0, -0.01, 0.2));
        weaponModel.add(makeMesh(B(0.03, 0.06, 0.05), woodMat, 0, -0.05, -0.12));
        weaponModel.add(makeCylMesh(0.022, 0.06, gunMat, 0, 0.01, -0.44));
    } else if (w.name === 'Trench Gun') {
        weaponModel.add(makeCylMesh(0.02, 0.55, gunMat, 0, 0.02, -0.2));
        weaponModel.add(makeMesh(B(0.05, 0.06, 0.2), gunMat, 0, 0, 0.05));
        weaponModel.add(makeMesh(B(0.04, 0.04, 0.1), woodMat, 0, -0.02, -0.12));
        weaponModel.add(makeMesh(B(0.05, 0.07, 0.3), woodMat, 0, -0.01, 0.25));
        weaponModel.add(makeMesh(B(0.04, 0.035, 0.12), woodMat, 0, -0.01, -0.3));
    } else if (w.name === 'Bazooka') {
        const tubeMat = POOL.tubeMat;
        weaponModel.add(makeCylMesh(0.035, 0.9, tubeMat, 0, 0.02, -0.15));
        const frontFlare = new THREE.Mesh(C2(0.04, 0.035, 0.06, 8), tubeMat);
        frontFlare.rotation.x = Math.PI / 2; frontFlare.position.set(0, 0.02, -0.62); weaponModel.add(frontFlare);
        const rearFlare = new THREE.Mesh(C2(0.035, 0.04, 0.06, 8), tubeMat);
        rearFlare.rotation.x = Math.PI / 2; rearFlare.position.set(0, 0.02, 0.32); weaponModel.add(rearFlare);
        weaponModel.add(makeMesh(B(0.05, 0.04, 0.15), woodMat, 0, -0.02, 0.1));
        weaponModel.add(makeMesh(B(0.03, 0.07, 0.04), woodMat, 0, -0.04, -0.15));
        weaponModel.add(makeMesh(B(0.03, 0.08, 0.04), woodMat, 0, -0.04, 0.05));
        weaponModel.add(makeMesh(B(0.02, 0.03, 0.02), gunMat, 0, -0.06, 0.03));
        weaponModel.add(makeMesh(B(0.002, 0.04, 0.002), gunMat, 0, 0.06, -0.4));
        weaponModel.add(makeMesh(B(0.002, 0.04, 0.002), gunMat, 0, 0.06, -0.1));
    } else {
        // Springfield
        weaponModel.add(makeCylMesh(0.013, 0.8, gunMat, 0, 0.02, -0.35));
        weaponModel.add(makeMesh(B(0.04, 0.05, 0.35), gunMat, 0, 0, 0));
        const bolt = new THREE.Mesh(C2(0.012, 0.012, 0.06, 6), gunMat);
        bolt.rotation.z = Math.PI / 2; bolt.position.set(0.04, 0.01, 0.02); weaponModel.add(bolt);
        weaponModel.add(makeCylMesh(0.02, 0.2, gunMat, 0, 0.055, -0.05));
        const lf = new THREE.Mesh(C2(0.022, 0.022, 0.01, 8), _scopeLensMat1);
        lf.rotation.x = Math.PI / 2; lf.position.set(0, 0.055, -0.15); weaponModel.add(lf);
        const lr = new THREE.Mesh(C2(0.018, 0.018, 0.01, 8), _scopeLensMat2);
        lr.rotation.x = Math.PI / 2; lr.position.set(0, 0.055, 0.05); weaponModel.add(lr);
        for (const sz of [-0.04, 0.03]) {
            weaponModel.add(makeMesh(B(0.015, 0.025, 0.015), gunMat, 0, 0.04, sz));
        }
        weaponModel.add(makeMesh(B(0.05, 0.07, 0.4), woodMat, 0, -0.01, 0.3));
        weaponModel.add(makeMesh(B(0.035, 0.03, 0.25), woodMat, 0, -0.02, -0.15));
    }

    // ---- First-person arms and hands ----
    const skin = _fpSkinMat;
    const sleeve = _fpSleeveMat;
    const B2 = POOL.getBoxGeo;

    if (w.name === 'Bazooka') {
        // Right arm — shoulder on tube
        const rSleeve = makeMesh(B2(0.09, 0.09, 0.28), sleeve, 0.12, -0.08, 0.2);
        rSleeve.rotation.x = 0.3;
        weaponModel.add(rSleeve);
        const rHand = makeMesh(B2(0.07, 0.05, 0.1), skin, 0.12, -0.1, 0.05);
        weaponModel.add(rHand);
        // Fingers wrapped around grip
        weaponModel.add(makeMesh(B2(0.06, 0.03, 0.04), skin, 0.12, -0.12, 0.03));

        // Left arm — forward grip
        const lSleeve = makeMesh(B2(0.09, 0.09, 0.28), sleeve, -0.08, -0.06, -0.08);
        lSleeve.rotation.x = -0.2;
        weaponModel.add(lSleeve);
        const lHand = makeMesh(B2(0.07, 0.05, 0.1), skin, -0.08, -0.08, -0.18);
        weaponModel.add(lHand);
        weaponModel.add(makeMesh(B2(0.06, 0.03, 0.04), skin, -0.08, -0.1, -0.18));
    } else {
        // Right arm — trigger hand (close to body, gripping stock/pistol grip)
        const rUpperSleeve = makeMesh(B2(0.09, 0.09, 0.22), sleeve, 0.06, -0.1, 0.22);
        rUpperSleeve.rotation.x = 0.5;
        weaponModel.add(rUpperSleeve);
        const rForearm = makeMesh(B2(0.08, 0.08, 0.18), sleeve, 0.06, -0.12, 0.08);
        rForearm.rotation.x = 0.15;
        weaponModel.add(rForearm);
        // Right hand wrapped around grip
        const rHand = makeMesh(B2(0.07, 0.06, 0.1), skin, 0.06, -0.13, 0.0);
        weaponModel.add(rHand);
        // Fingers curled on trigger
        weaponModel.add(makeMesh(B2(0.05, 0.025, 0.05), skin, 0.06, -0.15, -0.02));
        // Thumb on top
        weaponModel.add(makeMesh(B2(0.03, 0.025, 0.06), skin, 0.04, -0.1, -0.02));

        // Left arm — support hand (reaching forward under barrel/handguard)
        const lUpperSleeve = makeMesh(B2(0.09, 0.09, 0.25), sleeve, -0.1, -0.08, 0.0);
        lUpperSleeve.rotation.x = -0.3;
        lUpperSleeve.rotation.y = 0.25;
        weaponModel.add(lUpperSleeve);
        const lForearm = makeMesh(B2(0.08, 0.08, 0.2), sleeve, -0.06, -0.08, -0.16);
        lForearm.rotation.x = -0.15;
        weaponModel.add(lForearm);
        // Left hand cupping under the barrel/forend
        const lHand = makeMesh(B2(0.08, 0.05, 0.1), skin, -0.04, -0.06, -0.25);
        weaponModel.add(lHand);
        // Fingers wrapped underneath
        weaponModel.add(makeMesh(B2(0.06, 0.025, 0.08), skin, -0.04, -0.04, -0.25));
        // Thumb on side
        weaponModel.add(makeMesh(B2(0.025, 0.03, 0.06), skin, -0.01, -0.04, -0.24));
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
    const m = new THREE.Mesh(POOL.getCylGeo(radius, height), mat);
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
    playSound(w.rocket ? 'explosion' : 'shoot', 1.0);

    // Multiplayer: emit shot to partner
    if (isMultiplayer && socket) {
        const shootDir = new THREE.Vector3(0, 0, -1);
        shootDir.applyQuaternion(camera.quaternion);
        socket.emit('playerShoot', {
            x: camera.position.x, y: camera.position.y, z: camera.position.z,
            dx: shootDir.x, dy: shootDir.y, dz: shootDir.z,
            range: w.range,
        });
    }

    // Rocket weapon — fire a projectile instead of hitscan
    if (w.rocket) {
        fireRocket(w);
        return;
    }

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
                // Multiplayer: tell partner about the kill
                if (isMultiplayer && socket) {
                    socket.emit('enemyKilled', { enemyId: hitEnemy.netId });
                }
            }
        } else {
            // Check tank hits if no enemy hit
            let hitTank = null;
            let tankDist = w.range;
            for (let i = 0; i < enemyTanks.length; i++) {
                const tank = enemyTanks[i];
                if (!tank.alive) continue;
                _v1.set(tank.group.position.x, tank.group.position.y + 1, tank.group.position.z);
                _v2.copy(_v1).sub(camera.position);
                const proj = _v2.dot(_dir);
                if (proj < 0 || proj > tankDist) continue;
                _v3.copy(camera.position).addScaledVector(_dir, proj);
                const hitDist = _v3.distanceTo(_v1);
                if (hitDist < 2.5) { // tanks are bigger than soldiers
                    tankDist = proj;
                    hitTank = tank;
                }
            }
            if (hitTank) {
                hitTank.hp -= w.damage * 0.5; // bullets do reduced damage to tanks
                showHitMarker();
                _v1.copy(camera.position).addScaledVector(_dir, tankDist);
                spawnImpact(_v1.x, _v1.y, _v1.z, 0xffaa00);
                playSound('impact', 0.5);
                if (hitTank.hp <= 0) {
                    hitTank.alive = false;
                    score += hitTank.score;
                    kills++;
                }
            } else {
                _v1.copy(camera.position).addScaledVector(_dir, closestDist * 0.95);
                spawnImpact(_v1.x, _v1.y, _v1.z, 0xffcc44);
                playSound('impact', 0.3);
            }
        }

        createTracer(closestDist);
    }
}

// ---- SHELL CASINGS ----
function ejectCasing() {
    if (shellCasings.length >= CFG.MAX_CASINGS) {
        const old = shellCasings[0];
        old.mesh.visible = false;
        shellCasings[0] = shellCasings[shellCasings.length - 1];
        shellCasings.length--;
    }
    // Get casing from pool
    const pool = POOL.casingPool;
    let casing = null;
    for (let j = 0; j < pool.length; j++) {
        const idx = (POOL._casingPoolIdx + j) % pool.length;
        if (!pool[idx].visible) {
            POOL._casingPoolIdx = (idx + 1) % pool.length;
            casing = pool[idx];
            break;
        }
    }
    if (!casing) return;
    casing.visible = true;
    // Position near weapon ejection port
    _v1.set(0.3, -0.15, -0.4);
    _v1.applyQuaternion(camera.quaternion);
    _v1.add(camera.position);
    casing.position.copy(_v1);
    casing.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

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
    const gp = enemy.group.position;

    // Blood splatter particles — more and redder
    const bloodColors = [0xaa1111, 0x880000, 0x660000, 0x551515, 0x772222];
    const count = Math.min(12, CFG.MAX_PARTICLES - particles.length);
    for (let i = 0; i < count; i++) {
        const mesh = getPooledParticle(bloodColors[i % bloodColors.length]);
        if (!mesh) break;
        mesh.position.set(
            gp.x + (Math.random() - 0.5) * 0.3,
            gp.y + 0.8 + Math.random() * 0.6,
            gp.z + (Math.random() - 0.5) * 0.3
        );
        mesh.scale.setScalar(1.5 + Math.random());
        particles.push({
            mesh,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 3 + 0.5,
            vz: (Math.random() - 0.5) * 4,
            life: 0.6 + Math.random() * 0.5,
        });
    }

    // Blood pool on ground
    const poolGeo = new THREE.CircleGeometry(0.3 + Math.random() * 0.4, 8);
    const poolMat = new THREE.MeshStandardMaterial({
        color: 0x550000, roughness: 0.95, metalness: 0.0,
        transparent: true, opacity: 0.8, depthWrite: false
    });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(gp.x + (Math.random() - 0.5) * 0.5, 0.02, gp.z + (Math.random() - 0.5) * 0.5);
    scene.add(pool);

    // Blood pool grows and fades over time
    const poolData = { mesh: pool, life: 12, maxLife: 12, growTarget: 1.0 + Math.random() * 0.6 };
    corpses.push({ type: 'bloodpool', data: poolData });
}

function updateCorpses(dt) {
    for (let i = corpses.length - 1; i >= 0; i--) {
        const c = corpses[i];

        if (c.type === 'bloodpool') {
            const d = c.data;
            d.life -= dt;
            // Grow pool slowly
            const scale = d.mesh.scale.x;
            if (scale < d.growTarget) {
                d.mesh.scale.setScalar(Math.min(d.growTarget, scale + dt * 0.5));
            }
            // Fade in last 3 seconds
            if (d.life < 3) {
                d.mesh.material.opacity = Math.max(0, 0.8 * (d.life / 3));
            }
            if (d.life <= 0) {
                scene.remove(d.mesh);
                d.mesh.geometry.dispose();
                d.mesh.material.dispose();
                corpses.splice(i, 1);
            }
            continue;
        }

        if (c.type === 'body') {
            const d = c.data;
            const g = d.group;

            if (d.phase === 'falling') {
                // Animate falling over
                d.fallProgress += d.fallSpeed * dt;
                const t = Math.min(1, d.fallProgress);
                // Ease out — fast start, slow finish
                const eased = 1 - (1 - t) * (1 - t);

                // Rotate body sideways to lie flat
                g.rotation.z = d.targetRotX * eased;
                // Slight forward pitch
                g.rotation.x = eased * 0.2;
                // Drop Y as body falls (pivot around feet)
                g.position.y = d.startY - eased * 0.4;

                // Slide slightly in fall direction
                g.position.x += Math.sin(d.fallAngle) * dt * 0.5 * (1 - eased);
                g.position.z += Math.cos(d.fallAngle) * dt * 0.5 * (1 - eased);

                if (t >= 1) {
                    d.phase = 'lying';
                    // Thud sound
                    playSound('footstep', 0.4, g.position.x, 0, g.position.z);
                }
            } else if (d.phase === 'lying') {
                d.life -= dt;
                if (d.life < 2) {
                    d.phase = 'sinking';
                }
            } else if (d.phase === 'sinking') {
                d.life -= dt;
                // Sink body into ground — don't touch materials (they're shared across all enemies)
                g.position.y -= dt * 0.3;
                if (d.life <= 0 || g.position.y < -2) {
                    scene.remove(g);
                    g.clear();
                    corpses.splice(i, 1);
                }
            }
        }
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
function getPooledParticle(color) {
    // Try to reuse from pool
    const pool = POOL.particlePool;
    for (let j = 0; j < pool.length; j++) {
        const idx = (POOL._particlePoolIdx + j) % pool.length;
        if (!pool[idx].visible) {
            POOL._particlePoolIdx = (idx + 1) % pool.length;
            pool[idx].material = getParticleMat(color);
            pool[idx].visible = true;
            pool[idx].scale.setScalar(1);
            return pool[idx];
        }
    }
    return null; // pool exhausted
}

function spawnImpact(x, y, z, color) {
    const count = Math.min(4, CFG.MAX_PARTICLES - particles.length);
    for (let i = 0; i < count; i++) {
        const mesh = getPooledParticle(color);
        if (!mesh) break;
        mesh.position.set(x, y, z);
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
    // Fast fiery debris
    const fireColors = [0xff2200, 0xff4400, 0xff6600, 0xff8822, 0xffbb33, 0xffdd55];
    const fireCount = Math.min(6, CFG.MAX_PARTICLES - particles.length);
    for (let i = 0; i < fireCount; i++) {
        const mesh = getPooledParticle(fireColors[i % fireColors.length]);
        if (!mesh) break;
        mesh.position.set(x, y, z);
        mesh.scale.setScalar(0.8 + Math.random() * 0.6);
        particles.push({
            mesh,
            vx: (Math.random() - 0.5) * 10,
            vy: Math.random() * 8 + 3,
            vz: (Math.random() - 0.5) * 10,
            life: 0.3 + Math.random() * 0.3,
        });
    }
    // Slower dark smoke/ash particles that linger
    const smokeColors = [0x333333, 0x444444, 0x555555, 0x3a3020, 0x2a2218];
    const smokeCount = Math.min(6, CFG.MAX_PARTICLES - particles.length);
    for (let i = 0; i < smokeCount; i++) {
        const mesh = getPooledParticle(smokeColors[i % smokeColors.length]);
        if (!mesh) break;
        mesh.position.set(x + (Math.random() - 0.5), y + Math.random() * 0.5, z + (Math.random() - 0.5));
        mesh.scale.setScalar(1.0 + Math.random() * 1.0);
        particles.push({
            mesh,
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * 4 + 1,
            vz: (Math.random() - 0.5) * 3,
            life: 0.8 + Math.random() * 0.6,
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

    // Left arm (at side)
    const armL = new THREE.Mesh(POOL.enemyArmGeo, tunicMat);
    armL.position.set(-0.4, 1.1, 0);
    group.add(armL);

    // Right upper arm (raised to hold gun)
    const armR = new THREE.Mesh(POOL.enemyArmGeo, tunicMat);
    armR.position.set(0.4, 1.1, -0.1);
    armR.rotation.x = -0.4;
    group.add(armR);

    // Right forearm + hand gripping gun
    const forearmR = new THREE.Mesh(POOL.enemyForearmGeo, tunicMat);
    forearmR.position.set(0.38, 0.9, -0.3);
    forearmR.rotation.x = -0.8;
    group.add(forearmR);
    const handR = new THREE.Mesh(POOL.enemyHandGeo, POOL.skinMat);
    handR.position.set(0.38, 0.85, -0.38);
    group.add(handR);

    // Left forearm reaching forward to support gun
    const forearmL = new THREE.Mesh(POOL.enemyForearmGeo, tunicMat);
    forearmL.position.set(-0.15, 0.9, -0.35);
    forearmL.rotation.x = -1.0;
    forearmL.rotation.y = 0.5;
    group.add(forearmL);
    const handL = new THREE.Mesh(POOL.enemyHandGeo, POOL.skinMat);
    handL.position.set(-0.05, 0.85, -0.45);
    group.add(handL);

    // Gun held in hands
    const gun = new THREE.Mesh(POOL.enemyGunGeo, MAT.darkMetal);
    gun.position.set(0.15, 0.88, -0.4);
    gun.rotation.x = -0.1;
    group.add(gun);

    group.position.set(x, 0, z);
    scene.add(group);

    const enemy = {
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
        // Network ID for multiplayer sync
        netId: _nextEnemyId++,
    };
    return enemy;
}

function disposeEnemyGroup(enemy) {
    // Instead of removing, turn into a ragdoll corpse that falls to the ground
    const group = enemy.group;
    if (!group || !group.parent) return;

    // If too many corpses, remove the oldest body
    const bodyCorpses = corpses.filter(c => c.type === 'body');
    if (bodyCorpses.length >= MAX_CORPSES) {
        const oldest = bodyCorpses[0];
        scene.remove(oldest.data.group);
        oldest.data.group.clear();
        corpses.splice(corpses.indexOf(oldest), 1);
    }

    const gp = group.position;
    // Random fall direction
    const fallDir = Math.random() * Math.PI * 2;
    const fallSide = Math.random() > 0.5 ? 1 : -1; // fall left or right

    corpses.push({
        type: 'body',
        data: {
            group: group,
            phase: 'falling', // 'falling' -> 'lying' -> 'fading'
            fallProgress: 0,
            fallSpeed: 2.5 + Math.random() * 1.5,
            fallAngle: fallDir,
            fallSide: fallSide,
            targetRotX: fallSide * (Math.PI / 2 * 0.85 + Math.random() * 0.2),
            life: 10 + Math.random() * 4, // seconds before fade
            maxLife: 10,
            startY: gp.y,
        }
    });
    // Don't remove from scene — corpse system manages it now
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

    // Left arm (at side)
    const armL = new THREE.Mesh(POOL.enemyArmGeo, tunicMat);
    armL.position.set(-0.4, 1.1, 0);
    group.add(armL);

    // Right upper arm (raised to hold gun)
    const armR = new THREE.Mesh(POOL.enemyArmGeo, tunicMat);
    armR.position.set(0.4, 1.1, -0.1);
    armR.rotation.x = -0.4;
    group.add(armR);

    // Right forearm + hand gripping gun
    const forearmR = new THREE.Mesh(POOL.enemyForearmGeo, tunicMat);
    forearmR.position.set(0.38, 0.9, -0.3);
    forearmR.rotation.x = -0.8;
    group.add(forearmR);
    const handR = new THREE.Mesh(POOL.enemyHandGeo, POOL.skinMat);
    handR.position.set(0.38, 0.85, -0.38);
    group.add(handR);

    // Left forearm reaching forward to support gun
    const forearmL = new THREE.Mesh(POOL.enemyForearmGeo, tunicMat);
    forearmL.position.set(-0.15, 0.9, -0.35);
    forearmL.rotation.x = -1.0;
    forearmL.rotation.y = 0.5;
    group.add(forearmL);
    const handL = new THREE.Mesh(POOL.enemyHandGeo, POOL.skinMat);
    handL.position.set(-0.05, 0.85, -0.45);
    group.add(handL);

    // Gun held in hands
    const gun = new THREE.Mesh(POOL.enemyGunGeo, MAT.darkMetal);
    gun.position.set(0.15, 0.88, -0.4);
    gun.rotation.x = -0.1;
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
                } else if (playerFlying && playerPlane) {
                    // Enemies shoot at plane (reduced accuracy)
                    if (Math.random() < 0.3) {
                        playerPlane.hp -= enemy.damage;
                        showDamageVignette();
                        if (playerPlane.hp <= 0) { playerPlane.hp = 0; playerPlane.alive = false; ejectFromPlane(); }
                    }
                } else if (playerInTank && playerTank) {
                    // Enemies shoot at player's tank (reduced damage from small arms)
                    playerTank.hp -= enemy.damage * 0.3;
                    showDamageVignette();
                    player.shakeX = (Math.random() - 0.5) * 0.01;
                    player.shakeY = (Math.random() - 0.5) * 0.01;
                    player.shakeDecay = 0.1;
                    if (playerTank.hp <= 0) { playerTank.hp = 0; playerTank.alive = false; ejectFromTank(); }
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

// ---- BOMB MESH ----
function createBombMesh() {
    const group = new THREE.Group();
    // Body — elongated cylinder with rounded ends
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.7, 8), POOL.bombMat);
    body.rotation.x = Math.PI / 2; // orient along Z
    group.add(body);
    // Nose cone
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 8), POOL.bombMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -0.47;
    group.add(nose);
    // Tail cone (narrowing)
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.15, 8), POOL.bombMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.z = 0.42;
    group.add(tail);
    // Tail fins — 4 fins in cross pattern
    for (let i = 0; i < 4; i++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.14, 0.12), POOL.bombFinMat);
        fin.position.set(0, 0, 0.45);
        fin.rotation.z = i * Math.PI / 2;
        // Offset outward from center based on rotation
        const fx = Math.sin(i * Math.PI / 2) * 0.07;
        const fy = Math.cos(i * Math.PI / 2) * 0.07;
        fin.position.x = fx;
        fin.position.y = fy;
        group.add(fin);
    }
    // Band stripe (yellow marking ring)
    const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.125, 0.125, 0.04, 8),
        new THREE.MeshStandardMaterial({ color: 0xccaa22, roughness: 0.5, metalness: 0.4 })
    );
    band.rotation.x = Math.PI / 2;
    band.position.z = -0.15;
    group.add(band);
    return group;
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
            // Tilt nose down as bomb falls — point velocity direction
            const speed2d = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
            const fallAngle = Math.atan2(-b.vy, speed2d);
            b.mesh.rotation.x = fallAngle;
            // Face travel direction
            b.mesh.rotation.y = Math.atan2(b.vx, b.vz);

            if (b.mesh.position.y <= 0.2) {
                // BOOM — bomb explodes on ground
                const bx = b.mesh.position.x;
                const bz = b.mesh.position.z;
                scene.remove(b.mesh);
                if (b.mesh.isGroup || b.mesh.children) b.mesh.traverse(c => { if (c.geometry) c.geometry.dispose(); });

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
                    if (playerInTank && playerTank) {
                        playerTank.hp -= dmg;
                        showDamageVignette();
                        if (playerTank.hp <= 0) { playerTank.hp = 0; playerTank.alive = false; ejectFromTank(); }
                    } else {
                        player.hp -= dmg;
                        player.lastDamageTime = now;
                        showDamageVignette();
                        playSound('hit', 1.0);
                        if (player.hp <= 0) { player.hp = 0; player.alive = false; }
                    }
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
                    const bombMesh = createBombMesh();
                    bombMesh.scale.set(2.5, 2.5, 2.5);
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
    if (aeroplanes.length >= 4) return; // allow more planes
    const count = wave >= 5 ? 2 : 1; // double planes from wave 5
    for (let i = 0; i < count; i++) {
        if (aeroplanes.length < 4) aeroplanes.push(createAeroplane());
    }
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
    // In multiplayer, only host spawns enemies + triggers waves
    if (isMultiplayer && !isHost) return;

    wave++;
    waveActive = true;

    // Replenish grenades each wave
    grenadeInventory = Math.min(MAX_GRENADES_INVENTORY, grenadeInventory + 2);

    // Reinforce dead allies
    if (wave > 1) reinforceAllies();

    // Aeroplane bombing runs — start wave 1, extra runs on later waves
    safeTimeout(() => { if (gameRunning) spawnAeroplaneWave(); }, 1500 + Math.random() * 2000);
    if (wave >= 3) {
        safeTimeout(() => { if (gameRunning) spawnAeroplaneWave(); }, 8000 + Math.random() * 4000);
    }
    if (wave >= 6) {
        safeTimeout(() => { if (gameRunning) spawnAeroplaneWave(); }, 15000 + Math.random() * 5000);
    }

    DOM.waveBanner.textContent = `WAVE ${wave}`;
    DOM.waveBanner.style.opacity = '1';
    safeTimeout(() => { DOM.waveBanner.style.opacity = '0'; }, 2500);

    const count = Math.min(4 + wave * 3, CFG.MAX_ENEMIES - enemies.length);
    for (let i = 0; i < count; i++) {
        let ex, ez, attempts = 0;
        do {
            // Enemies spawn from the enemy side of the battlefield
            const espZ = MAP_THEMES[selectedMap] ? MAP_THEMES[selectedMap].enemySpawnZ : [-30, -70];
            ex = (Math.random() - 0.5) * CFG.MAP_SIZE * 1.2;
            ez = espZ[0] - Math.random() * Math.abs(espZ[1] - espZ[0]);
            ex = Math.max(-CFG.MAP_SIZE + 5, Math.min(CFG.MAP_SIZE - 5, ex));
            ez = Math.max(-CFG.MAP_SIZE + 5, Math.min(CFG.MAP_SIZE - 5, ez));
            attempts++;
        } while (checkCollision(ex, ez, 1.5) && attempts < 30);

        let type = 'grunt';
        if (wave >= 3 && Math.random() < 0.25) type = 'sniper';
        if (wave >= 5 && Math.random() < 0.15) type = 'brute';

        enemies.push(createEnemy(ex, ez, type));
    }

    // Spawn enemy tanks starting wave 3
    if (wave >= 3 && enemyTanks.length < MAX_ENEMY_TANKS) {
        const tankX = (Math.random() - 0.5) * CFG.MAP_SIZE * 0.8;
        const tankZ = -35 - Math.random() * 30;
        enemyTanks.push(createEnemyTank(tankX, tankZ));
    }

    // Spawn allied tank on player's left side every wave if under max
    if (allyTanks.length < MAX_ALLY_TANKS && !playerInTank) {
        const leftDir = player.yaw + Math.PI / 2; // left of player facing direction
        const spawnDist = 5;
        const aTankX = player.x - Math.sin(leftDir) * spawnDist;
        const aTankZ = player.z - Math.cos(leftDir) * spawnDist;
        const cx = Math.max(-CFG.MAP_SIZE + 5, Math.min(CFG.MAP_SIZE - 5, aTankX));
        const cz = Math.max(-CFG.MAP_SIZE + 5, Math.min(CFG.MAP_SIZE - 5, aTankZ));
        allyTanks.push(createAllyTank(cx, cz));
    }

    // Multiplayer: tell joiner about the wave
    if (isMultiplayer && isHost && socket) {
        socket.emit('waveStart', { wave: wave });
    }
}

// ---- ROCKET (BAZOOKA) ----
function fireRocket(w) {
    // Create visible rocket projectile
    const rocketGroup = new THREE.Group();
    // Rocket body
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.04, 0.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x4a5a2a, roughness: 0.7 })
    );
    body.rotation.x = Math.PI / 2;
    rocketGroup.add(body);
    // Warhead (dark tip)
    const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.15, 6),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.4 })
    );
    tip.rotation.x = -Math.PI / 2;
    tip.position.set(0, 0, -0.3);
    rocketGroup.add(tip);
    // Exhaust flame (tail)
    const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.04, 0.2, 6),
        new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.8 })
    );
    flame.rotation.x = Math.PI / 2;
    flame.position.set(0, 0, 0.35);
    rocketGroup.add(flame);
    // Smoke trail light
    const rLight = new THREE.PointLight(0xff6622, 2, 8);
    rLight.position.set(0, 0, 0.3);
    rocketGroup.add(rLight);

    // Direction from camera
    _dir.set(0, 0, -1);
    _dir.x += (Math.random() - 0.5) * w.spread * 2;
    _dir.y += (Math.random() - 0.5) * w.spread * 2;
    _dir.applyQuaternion(camera.quaternion);
    _dir.normalize();

    // Start position slightly in front of camera
    const startPos = camera.position.clone().addScaledVector(_dir, 1.5);
    rocketGroup.position.copy(startPos);
    rocketGroup.lookAt(startPos.clone().add(_dir));
    scene.add(rocketGroup);

    rockets.push({
        mesh: rocketGroup,
        flame: flame,
        vx: _dir.x * 60,
        vy: _dir.y * 60,
        vz: _dir.z * 60,
        damage: w.damage,
        blastRadius: w.blastRadius || 8,
        life: 3.0, // seconds before self-destruct
    });
}

function updateRockets(dt) {
    for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.life -= dt;
        // Move
        r.mesh.position.x += r.vx * dt;
        r.mesh.position.y += r.vy * dt - 1.5 * dt * dt; // slight gravity drop
        r.mesh.position.z += r.vz * dt;
        r.vy -= 3 * dt; // gravity

        // Flicker flame
        r.flame.material.opacity = 0.6 + Math.random() * 0.4;
        r.flame.scale.setScalar(0.8 + Math.random() * 0.4);

        // Smoke trail particles
        if (Math.random() < 0.4) {
            spawnImpact(r.mesh.position.x, r.mesh.position.y, r.mesh.position.z, 0x888888);
        }

        const rx = r.mesh.position.x;
        const ry = r.mesh.position.y;
        const rz = r.mesh.position.z;

        // Check hit ground
        let explode = ry <= 0.5 || r.life <= 0;

        // Check hit enemy tanks
        if (!explode) {
            for (let j = 0; j < enemyTanks.length; j++) {
                const t = enemyTanks[j];
                if (!t.alive) continue;
                const tdx = t.group.position.x - rx;
                const tdz = t.group.position.z - rz;
                const tdy = (t.group.position.y + 1) - ry;
                if (tdx * tdx + tdz * tdz + tdy * tdy < 9) { // 3 unit radius
                    explode = true;
                    break;
                }
            }
        }

        // Check hit enemy soldiers
        if (!explode) {
            for (let j = 0; j < enemies.length; j++) {
                const e = enemies[j];
                if (!e.alive) continue;
                const edx = e.group.position.x - rx;
                const edz = e.group.position.z - rz;
                const edy = (e.group.position.y + 1) - ry;
                if (edx * edx + edz * edz + edy * edy < 4) { // 2 unit radius
                    explode = true;
                    break;
                }
            }
        }

        if (explode) {
            // BOOM — big explosion
            spawnExplosion(rx, ry, rz);
            spawnExplosion(rx + 0.5, ry + 1, rz + 0.5);
            spawnExplosion(rx - 0.5, ry + 0.5, rz - 0.5);
            playSound('explosion', 1.0);

            // Camera shake if close to player
            const pdx = player.x - rx;
            const pdz = player.z - rz;
            const pDist = Math.sqrt(pdx * pdx + pdz * pdz);
            if (pDist < 20) {
                player.shakeX = (Math.random() - 0.5) * 0.08;
                player.shakeY = (Math.random() - 0.5) * 0.08;
                player.shakeDecay = 0.4;
            }

            // Blast damage — enemy tanks (full damage)
            for (let j = 0; j < enemyTanks.length; j++) {
                const t = enemyTanks[j];
                if (!t.alive) continue;
                const tdx = t.group.position.x - rx;
                const tdz = t.group.position.z - rz;
                const td = Math.sqrt(tdx * tdx + tdz * tdz);
                if (td < r.blastRadius) {
                    const dmgMult = 1 - (td / r.blastRadius) * 0.5; // 50-100% damage based on distance
                    t.hp -= r.damage * dmgMult;
                    if (t.hp <= 0) {
                        t.hp = 0;
                        t.alive = false;
                        score += t.score;
                        kills++;
                        showKillFeed('TANK', 'Bazooka', t.score);
                    }
                }
            }

            // Blast damage — enemy soldiers (kills most in blast)
            for (let j = 0; j < enemies.length; j++) {
                const e = enemies[j];
                if (!e.alive) continue;
                const edx = e.group.position.x - rx;
                const edz = e.group.position.z - rz;
                const ed = Math.sqrt(edx * edx + edz * edz);
                if (ed < r.blastRadius) {
                    const dmgMult = 1 - (ed / r.blastRadius) * 0.5;
                    e.hp -= r.damage * dmgMult;
                    if (e.hp <= 0) {
                        e.hp = 0;
                        e.alive = false;
                        score += e.score;
                        kills++;
                        showKillFeed(e.type, 'Bazooka', e.score);
                        spawnDeathEffect(e);
                        disposeEnemyGroup(e);
                    }
                }
            }

            // Remove rocket
            scene.remove(r.mesh);
            r.mesh.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
            rockets.splice(i, 1);
        }
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
                if (playerInTank && playerTank) {
                    playerTank.hp -= dmg;
                    showDamageVignette();
                    if (playerTank.hp <= 0) { playerTank.hp = 0; playerTank.alive = false; ejectFromTank(); }
                } else {
                    player.hp -= dmg;
                    player.lastDamageTime = performance.now();
                    showDamageVignette();
                    playSound('hit', 1.0);
                    if (player.hp <= 0) { player.hp = 0; player.alive = false; }
                }
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

// ---- RAIN SYSTEM ----
const RAIN_COUNT = QUALITY === 'low' ? 800 : QUALITY === 'medium' ? 2000 : 4000;
const RAIN_AREA = 80;
const RAIN_HEIGHT = 40;

function createRain() {
    const positions = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
        positions[i * 3]     = (Math.random() - 0.5) * RAIN_AREA;
        positions[i * 3 + 1] = Math.random() * RAIN_HEIGHT;
        positions[i * 3 + 2] = (Math.random() - 0.5) * RAIN_AREA;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    rainGroup = new THREE.Points(geo, POOL.rainMat);
    addMapObject(rainGroup);
}

function updateRain(dt) {
    if (!rainGroup) return;
    const pos = rainGroup.geometry.attributes.position;
    const arr = pos.array;
    const fallSpeed = 25 * dt;
    const windX = 2 * dt; // slight wind drift
    for (let i = 0; i < RAIN_COUNT; i++) {
        arr[i * 3]     += windX; // wind pushes rain sideways
        arr[i * 3 + 1] -= fallSpeed;
        if (arr[i * 3 + 1] < 0) {
            arr[i * 3]     = player.x + (Math.random() - 0.5) * RAIN_AREA;
            arr[i * 3 + 1] = RAIN_HEIGHT + Math.random() * 5;
            arr[i * 3 + 2] = player.z + (Math.random() - 0.5) * RAIN_AREA;
        }
    }
    // Keep rain centered on player
    rainGroup.position.set(0, 0, 0);
    pos.needsUpdate = true;
}

// ---- ENEMY TANK SYSTEM ----
const MAX_ENEMY_TANKS = 2;

function createEnemyTank(x, z) {
    const group = new THREE.Group();

    const hull = new THREE.Mesh(POOL.tankBodyGeo, POOL.tankMat);
    hull.position.y = 0.7; hull.castShadow = true;
    group.add(hull);

    const turret = new THREE.Mesh(POOL.tankTurretGeo, POOL.tankDarkMat);
    turret.position.set(0, 1.8, -0.3); turret.castShadow = true;
    group.add(turret);

    const barrel = new THREE.Mesh(POOL.tankBarrelGeo, POOL.tankDarkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 1.7, -2.8);
    group.add(barrel);

    for (const side of [-1, 1]) {
        const track = new THREE.Mesh(POOL.tankTrackGeo, POOL.tankDarkMat);
        track.position.set(side * 1.7, 0.45, 0);
        track.castShadow = true;
        group.add(track);
    }

    group.position.set(x, 0, z);
    scene.add(group);

    return {
        group,
        hp: 300,
        maxHp: 300,
        speed: 4,
        damage: 30,
        fireRate: 3000,
        range: 60,
        detectRange: 70,
        score: 500,
        alive: true,
        lastShot: 0,
        state: 'patrol',
        angle: Math.random() * Math.PI * 2,
        patrolTarget: { x: (Math.random() - 0.5) * CFG.MAP_SIZE, z: (Math.random() - 0.5) * CFG.MAP_SIZE },
    };
}

function updateEnemyTanks(dt) {
    const now = performance.now();
    for (let i = enemyTanks.length - 1; i >= 0; i--) {
        const tank = enemyTanks[i];
        if (!tank.alive) {
            const tp = tank.group.position;
            spawnExplosion(tp.x, tp.y + 1.5, tp.z);
            spawnExplosion(tp.x + 1, tp.y + 2, tp.z);
            playSound('explosion', 1.0);
            showKillFeed('TANK', 'Player', tank.score);
            scene.remove(tank.group);
            tank.group.clear();
            enemyTanks.splice(i, 1);
            continue;
        }

        const tx = tank.group.position.x;
        const tz = tank.group.position.z;

        // Find nearest target: player, allied soldiers, or allied tanks
        let tgtX = player.x, tgtZ = player.z;
        let tgtDist = Math.sqrt((player.x - tx) * (player.x - tx) + (player.z - tz) * (player.z - tz));
        let tgtRef = null; // null means player
        let tgtType = 'player';

        // Check allied soldiers
        for (let j = 0; j < allies.length; j++) {
            const a = allies[j];
            if (!a.alive) continue;
            const adx = a.group.position.x - tx;
            const adz = a.group.position.z - tz;
            const ad = Math.sqrt(adx * adx + adz * adz);
            if (ad < tgtDist) {
                tgtDist = ad;
                tgtX = a.group.position.x;
                tgtZ = a.group.position.z;
                tgtRef = a;
                tgtType = 'ally';
            }
        }

        // Check allied tanks (prioritize tank-vs-tank)
        for (let j = 0; j < allyTanks.length; j++) {
            const at = allyTanks[j];
            if (!at.alive) continue;
            const adx = at.group.position.x - tx;
            const adz = at.group.position.z - tz;
            const ad = Math.sqrt(adx * adx + adz * adz);
            if (ad < tgtDist * 0.8) { // prefer targeting allied tanks slightly
                tgtDist = ad;
                tgtX = at.group.position.x;
                tgtZ = at.group.position.z;
                tgtRef = at;
                tgtType = 'allyTank';
            }
        }

        const angleToTarget = Math.atan2(tgtX - tx, tgtZ - tz);

        if (tgtDist < tank.range) {
            tank.state = 'attack';
        } else if (tgtDist < tank.detectRange) {
            tank.state = 'chase';
        } else {
            tank.state = 'patrol';
        }

        const spd = tank.speed * dt;
        let mx = 0, mz = 0;

        if (tank.state === 'chase' || (tank.state === 'attack' && tgtDist > tank.range * 0.4)) {
            mx = Math.sin(angleToTarget) * spd;
            mz = Math.cos(angleToTarget) * spd;
            tank.angle = angleToTarget;
        } else if (tank.state === 'patrol') {
            const ptDx = tank.patrolTarget.x - tx;
            const ptDz = tank.patrolTarget.z - tz;
            const ptDist = Math.sqrt(ptDx * ptDx + ptDz * ptDz);
            if (ptDist < 5) {
                tank.patrolTarget.x = (Math.random() - 0.5) * CFG.MAP_SIZE;
                tank.patrolTarget.z = (Math.random() - 0.5) * CFG.MAP_SIZE;
            } else {
                const pa = Math.atan2(ptDx, ptDz);
                mx = Math.sin(pa) * spd * 0.5;
                mz = Math.cos(pa) * spd * 0.5;
                tank.angle = pa;
            }
        }

        tank.group.rotation.y += (tank.angle - tank.group.rotation.y) * 0.05;

        // Turret tracks target
        const turret = tank.group.children[1];
        if (turret && tank.state === 'attack') {
            turret.rotation.y = angleToTarget - tank.group.rotation.y;
            const barrel = tank.group.children[2];
            if (barrel) barrel.rotation.y = angleToTarget - tank.group.rotation.y;
        }

        const res = resolveCollision(tx + mx, tz + mz, 1.5);
        tank.group.position.x = Math.max(-CFG.MAP_SIZE + 3, Math.min(CFG.MAP_SIZE - 3, res.x));
        tank.group.position.z = Math.max(-CFG.MAP_SIZE + 3, Math.min(CFG.MAP_SIZE - 3, res.z));

        // Hull bob when moving
        const moving = Math.abs(mx) > 0.001 || Math.abs(mz) > 0.001;
        if (moving) {
            tank.group.position.y = Math.sin(now * 0.005) * 0.08;
            tank.group.rotation.x = Math.sin(now * 0.004) * 0.015;
        } else {
            tank.group.position.y = 0;
            tank.group.rotation.x = 0;
        }

        if (!tank.lastEngineSound || now - tank.lastEngineSound > 1200) {
            tank.lastEngineSound = now;
            playSound('planeEngine', 0.3, tx, 0, tz);
        }

        // Shoot at target
        if (tank.state === 'attack') {
            if (now - tank.lastShot > tank.fireRate) {
                tank.lastShot = now;
                const hitChance = tgtType === 'player' && playerFlying
                    ? Math.max(0.1, 1 - tgtDist / (tank.range * 1.5))
                    : Math.max(0.2, 1 - tgtDist / tank.range);
                if (Math.random() < hitChance) {
                    if (tgtType === 'player') {
                        if (playerFlying && playerPlane) {
                            playerPlane.hp -= tank.damage;
                            if (playerPlane.hp <= 0) { playerPlane.hp = 0; playerPlane.alive = false; ejectFromPlane(); }
                        } else if (playerInTank && playerTank) {
                            playerTank.hp -= tank.damage;
                            if (playerTank.hp <= 0) { playerTank.hp = 0; playerTank.alive = false; ejectFromTank(); }
                        } else {
                            player.hp -= tank.damage;
                        }
                        player.lastDamageTime = now;
                        showDamageVignette();
                        playSound('hit', 1.0);
                        player.shakeX = (Math.random() - 0.5) * 0.05;
                        player.shakeY = (Math.random() - 0.5) * 0.05;
                        player.shakeDecay = 0.35;
                        if (!playerInTank && player.hp <= 0) { player.hp = 0; player.alive = false; }
                    } else if (tgtType === 'ally') {
                        tgtRef.hp -= tank.damage;
                        if (tgtRef.hp <= 0) {
                            tgtRef.hp = 0;
                            tgtRef.alive = false;
                            showKillFeed('Ally', 'Enemy Tank', 0);
                            spawnDeathEffect(tgtRef);
                            disposeAllyGroup(tgtRef);
                        }
                    } else if (tgtType === 'allyTank') {
                        tgtRef.hp -= tank.damage * 1.2;
                        if (tgtRef.hp <= 0) {
                            tgtRef.hp = 0;
                            tgtRef.alive = false;
                        }
                    }
                }
                playSound('explosion', 0.7, tx, 0, tz);
                spawnImpact(tx + Math.sin(angleToTarget) * 3, 1.7, tz + Math.cos(angleToTarget) * 3, 0xffaa22);
            }
        }
    }
}

// ---- ALLIED TANK SYSTEM ----
const MAX_ALLY_TANKS = 2;

function createAllyTank(x, z) {
    const group = new THREE.Group();

    const hull = new THREE.Mesh(POOL.tankBodyGeo, POOL.allyTankMat);
    hull.position.y = 0.7; hull.castShadow = true;
    group.add(hull);

    const turret = new THREE.Mesh(POOL.tankTurretGeo, POOL.allyTankDarkMat);
    turret.position.set(0, 1.8, -0.3); turret.castShadow = true;
    group.add(turret);

    const barrel = new THREE.Mesh(POOL.tankBarrelGeo, POOL.allyTankDarkMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 1.7, -2.8);
    group.add(barrel);

    for (const side of [-1, 1]) {
        const track = new THREE.Mesh(POOL.tankTrackGeo, POOL.allyTankDarkMat);
        track.position.set(side * 1.7, 0.45, 0);
        track.castShadow = true;
        group.add(track);
    }

    // White star marking on turret
    const star = new THREE.Mesh(
        new THREE.CircleGeometry(0.35, 5),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
    );
    star.rotation.x = -Math.PI / 2;
    star.position.set(0, 2.3, -0.3);
    group.add(star);

    group.position.set(x, 0, z);
    scene.add(group);

    return {
        group,
        hp: 350,
        maxHp: 350,
        speed: 3.5,
        damage: 35,
        fireRate: 2800,
        range: 55,
        detectRange: 65,
        alive: true,
        lastShot: 0,
        state: 'patrol',
        angle: Math.random() * Math.PI * 2,
        patrolTarget: { x: (Math.random() - 0.5) * CFG.MAP_SIZE * 0.5, z: (Math.random() - 0.5) * CFG.MAP_SIZE * 0.5 },
    };
}

function updateAllyTanks(dt) {
    const now = performance.now();
    for (let i = allyTanks.length - 1; i >= 0; i--) {
        const tank = allyTanks[i];
        if (!tank.alive) {
            const tp = tank.group.position;
            spawnExplosion(tp.x, tp.y + 1.5, tp.z);
            spawnExplosion(tp.x + 1, tp.y + 2, tp.z);
            playSound('explosion', 1.0);
            showKillFeed('ALLIED TANK', 'Enemy', 0);
            scene.remove(tank.group);
            tank.group.clear();
            allyTanks.splice(i, 1);
            continue;
        }

        const tx = tank.group.position.x;
        const tz = tank.group.position.z;

        // Find nearest target: enemy soldiers or enemy tanks
        let targetX = null, targetZ = null, targetDist = Infinity, targetRef = null, targetType = null;

        // Check enemy soldiers
        for (let j = 0; j < enemies.length; j++) {
            const e = enemies[j];
            if (!e.alive) continue;
            const edx = e.group.position.x - tx;
            const edz = e.group.position.z - tz;
            const ed = Math.sqrt(edx * edx + edz * edz);
            if (ed < targetDist) {
                targetDist = ed;
                targetX = e.group.position.x;
                targetZ = e.group.position.z;
                targetRef = e;
                targetType = 'enemy';
            }
        }

        // Check enemy tanks
        for (let j = 0; j < enemyTanks.length; j++) {
            const et = enemyTanks[j];
            if (!et.alive) continue;
            const edx = et.group.position.x - tx;
            const edz = et.group.position.z - tz;
            const ed = Math.sqrt(edx * edx + edz * edz);
            if (ed < targetDist) {
                targetDist = ed;
                targetX = et.group.position.x;
                targetZ = et.group.position.z;
                targetRef = et;
                targetType = 'enemyTank';
            }
        }

        // Determine state
        if (targetDist < tank.range) {
            tank.state = 'attack';
        } else if (targetDist < tank.detectRange) {
            tank.state = 'chase';
        } else {
            tank.state = 'patrol';
        }

        const spd = tank.speed * dt;
        let mx = 0, mz = 0;

        if (targetX !== null && (tank.state === 'chase' || (tank.state === 'attack' && targetDist > tank.range * 0.4))) {
            const angleToTarget = Math.atan2(targetX - tx, targetZ - tz);
            mx = Math.sin(angleToTarget) * spd;
            mz = Math.cos(angleToTarget) * spd;
            tank.angle = angleToTarget;
        } else if (tank.state === 'patrol') {
            const ptDx = tank.patrolTarget.x - tx;
            const ptDz = tank.patrolTarget.z - tz;
            const ptDist = Math.sqrt(ptDx * ptDx + ptDz * ptDz);
            if (ptDist < 5) {
                tank.patrolTarget.x = (Math.random() - 0.5) * CFG.MAP_SIZE * 0.5;
                tank.patrolTarget.z = (Math.random() - 0.5) * CFG.MAP_SIZE * 0.5;
            } else {
                const pa = Math.atan2(ptDx, ptDz);
                mx = Math.sin(pa) * spd * 0.5;
                mz = Math.cos(pa) * spd * 0.5;
                tank.angle = pa;
            }
        }

        // Smooth rotation
        tank.group.rotation.y += (tank.angle - tank.group.rotation.y) * 0.05;

        // Turret tracks target
        if (targetX !== null && tank.state === 'attack') {
            const angleToTarget = Math.atan2(targetX - tx, targetZ - tz);
            const turret = tank.group.children[1];
            if (turret) turret.rotation.y = angleToTarget - tank.group.rotation.y;
            const barrel = tank.group.children[2];
            if (barrel) barrel.rotation.y = angleToTarget - tank.group.rotation.y;
        }

        // Move with collision
        const res = resolveCollision(tx + mx, tz + mz, 1.5);
        tank.group.position.x = Math.max(-CFG.MAP_SIZE + 3, Math.min(CFG.MAP_SIZE - 3, res.x));
        tank.group.position.z = Math.max(-CFG.MAP_SIZE + 3, Math.min(CFG.MAP_SIZE - 3, res.z));

        // Hull bob when moving
        const moving = Math.abs(mx) > 0.001 || Math.abs(mz) > 0.001;
        if (moving) {
            tank.group.position.y = Math.sin(now * 0.005) * 0.08;
            tank.group.rotation.x = Math.sin(now * 0.004) * 0.015;
        } else {
            tank.group.position.y = 0;
            tank.group.rotation.x = 0;
        }

        // Engine rumble
        if (!tank.lastEngineSound || now - tank.lastEngineSound > 1200) {
            tank.lastEngineSound = now;
            playSound('planeEngine', 0.25, tx, 0, tz);
        }

        // Shoot at target
        if (tank.state === 'attack' && targetRef && targetDist < tank.range) {
            if (now - tank.lastShot > tank.fireRate) {
                tank.lastShot = now;
                const hitChance = Math.max(0.25, 1 - targetDist / tank.range);
                if (Math.random() < hitChance) {
                    if (targetType === 'enemy') {
                        targetRef.hp -= tank.damage;
                        if (targetRef.hp <= 0) {
                            targetRef.hp = 0;
                            targetRef.alive = false;
                            score += targetRef.score || 50;
                            kills++;
                            showKillFeed(targetRef.type || 'Enemy', 'Allied Tank', targetRef.score || 50);
                            spawnDeathEffect(targetRef);
                            disposeEnemyGroup(targetRef);
                        }
                    } else if (targetType === 'enemyTank') {
                        targetRef.hp -= tank.damage * 1.5; // tank shells do extra to tanks
                        if (targetRef.hp <= 0) {
                            targetRef.hp = 0;
                            targetRef.alive = false;
                            score += targetRef.score || 500;
                            kills++;
                            showKillFeed('TANK', 'Allied Tank', targetRef.score || 500);
                        }
                    }
                }
                // Cannon sound + muzzle flash
                const angleToTarget = Math.atan2(targetX - tx, targetZ - tz);
                playSound('explosion', 0.6, tx, 0, tz);
                spawnImpact(tx + Math.sin(angleToTarget) * 3, 1.7, tz + Math.cos(angleToTarget) * 3, 0xffaa22);
            }
        }
    }
}

// ---- PLAYER TANK SYSTEM ----

function buildTankCockpit(tankGroup) {
    // Cockpit is just bottom-edge detail — dashboard, levers, seat below the camera.
    // Upper view is completely open so the player can see the battlefield.
    // The CSS #tankScope overlay provides the viewport-slit framing effect instead.
    const cockpit = new THREE.Group();
    const cFrame = new THREE.MeshStandardMaterial({ color: 0x2d2d24, roughness: 0.85, metalness: 0.25 });
    const cPanel = new THREE.MeshStandardMaterial({ color: 0x1a1a14, roughness: 0.7, metalness: 0.35 });
    const cMetal = new THREE.MeshStandardMaterial({ color: 0x555548, roughness: 0.4, metalness: 0.65 });
    const cLeather = new THREE.MeshStandardMaterial({ color: 0x3a2e22, roughness: 0.9, metalness: 0.1 });

    // Floor only
    const floor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.06, 4.8), cFrame);
    floor.position.set(0, 0.15, 0); cockpit.add(floor);

    // Low side rails (knee-height, won't block view)
    for (const s of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 4.0), cFrame);
        rail.position.set(s * 1.4, 0.35, 0); cockpit.add(rail);
    }

    // Dashboard — low, below camera eye level
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 0.12), cPanel);
    dash.position.set(0, 0.5, -1.8); dash.rotation.x = 0.3; cockpit.add(dash);

    // Gauges on dashboard (all below eye line)
    const cGaugeFace = new THREE.MeshBasicMaterial({ color: 0x0a0a08 });
    const cNeedle = new THREE.MeshBasicMaterial({ color: 0xff2200 });
    for (let gi = 0; gi < 4; gi++) {
        const gx = (gi - 1.5) * 0.32;
        const face = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), cGaugeFace);
        face.position.set(gx, 0.58, -1.74); cockpit.add(face);
        const needle = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.05, 0.004), cNeedle);
        needle.position.set(gx, 0.58, -1.73);
        needle.rotation.z = Math.random() * 1.5 - 0.75;
        cockpit.add(needle);
        const bezel = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.07, 16), cMetal);
        bezel.position.set(gx, 0.58, -1.73); cockpit.add(bezel);
    }

    // Steering levers (low, beside knees)
    for (const s of [-1, 1]) {
        const lever = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.04), cMetal);
        lever.position.set(s * 0.35, 0.4, -1.3); lever.rotation.x = -0.3; cockpit.add(lever);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.06), cLeather);
        grip.position.set(s * 0.35, 0.56, -1.36); cockpit.add(grip);
    }

    // Seat (below camera)
    const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.6), cLeather);
    seatBase.position.set(0, 0.25, 0.3); cockpit.add(seatBase);
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.06), cLeather);
    seatBack.position.set(0, 0.45, 0.6); seatBack.rotation.x = -0.1; cockpit.add(seatBack);

    // Interior dim light
    const iLight = new THREE.PointLight(0xffddaa, 0.3, 4);
    iLight.position.set(0, 1.0, -0.5);
    cockpit.add(iLight);

    tankGroup.add(cockpit);
    return cockpit;
}

function tryEnterTank() {
    if (playerInTank || playerFlying || !player || !player.alive) return false;
    // Find nearest ally tank within range
    let nearest = null, nearDist = 8;
    for (let i = 0; i < allyTanks.length; i++) {
        const t = allyTanks[i];
        if (!t.alive) continue;
        const dx = player.x - t.group.position.x;
        const dz = player.z - t.group.position.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < nearDist) { nearDist = d; nearest = t; }
    }
    if (!nearest) return false;
    enterTank(nearest);
    return true;
}

function enterTank(tankObj) {
    if (playerInTank || playerFlying) return;
    playerInTank = true;
    playerTank = tankObj;
    tankCamMode = 'first';

    // Remove from allyTanks so AI stops controlling it
    const idx = allyTanks.indexOf(tankObj);
    if (idx !== -1) allyTanks.splice(idx, 1);

    // Initialize player tank state — aim turret where player is looking
    playerTank.turretAngle = player.yaw + Math.PI;
    playerTank.lastCannonShot = playerTank.lastShot || 0;
    playerTank.cannonCooldown = 2500; // ms
    playerTank.moveSpeed = 0;

    // Build cockpit interior
    playerTank.cockpit = buildTankCockpit(playerTank.group);

    // Smooth camera transition: snap camera close to cockpit position to avoid a jarring jump
    const tp = playerTank.group.position;
    const sinT = Math.sin(playerTank.turretAngle), cosT = Math.cos(playerTank.turretAngle);
    camera.position.set(tp.x + sinT * 0.3, tp.y + 2.4, tp.z + cosT * 0.3);

    // Hide weapon model, show tank HUD
    if (weaponModel) weaponModel.visible = false;
    document.getElementById('tankHud').style.display = 'block';
    document.getElementById('tankScope').style.display = 'block';
    document.getElementById('tankPrompt').style.display = 'none';
    document.getElementById('planePrompt').style.display = 'none';

    // Brief screen blackout for mount transition
    DOM.damageVignette.style.opacity = '0.6';
    safeTimeout(() => { DOM.damageVignette.style.opacity = '0'; }, 250);

    playSound('planeEngine', 0.6);
}

function exitTank() {
    if (!playerInTank || !playerTank) return;
    playerInTank = false;
    const tp = playerTank.group.position;
    const hullAngle = playerTank.angle;

    // Place player on the left side of the tank hull, facing forward
    const leftAngle = hullAngle + Math.PI / 2;
    player.x = tp.x + Math.sin(leftAngle) * 3.5;
    player.z = tp.z + Math.cos(leftAngle) * 3.5;
    player.y = CFG.PLAYER_HEIGHT;
    player.vy = 0;
    player.grounded = true;
    player.yaw = hullAngle - Math.PI; // face same direction as tank hull
    player.pitch = 0;

    // Snap camera to new player position for smooth transition
    camera.position.set(player.x, player.y, player.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = 0;

    // Remove cockpit meshes
    if (playerTank.cockpit) {
        playerTank.group.remove(playerTank.cockpit);
        playerTank.cockpit = null;
    }

    // Make tank exterior visible again before handing to AI
    for (let ci = 0; ci < 6; ci++) {
        if (playerTank.group.children[ci]) playerTank.group.children[ci].visible = true;
    }

    // Push tank back into allyTanks for AI
    playerTank.lastShot = playerTank.lastCannonShot;
    allyTanks.push(playerTank);
    playerTank = null;

    // Show weapon model, hide tank HUD
    if (weaponModel) weaponModel.visible = true;
    document.getElementById('tankHud').style.display = 'none';
    document.getElementById('tankScope').style.display = 'none';
    document.getElementById('tankCrosshair').style.display = 'none';

    // Brief transition vignette
    DOM.damageVignette.style.opacity = '0.5';
    safeTimeout(() => { DOM.damageVignette.style.opacity = '0'; }, 200);

    playSound('footstep', 0.8);
}

function ejectFromTank() {
    if (!playerInTank || !playerTank) return;
    const tp = playerTank.group.position;
    playerInTank = false;

    // Place player at tank position
    player.x = tp.x;
    player.z = tp.z;
    player.y = CFG.PLAYER_HEIGHT;
    player.vy = 0;
    player.grounded = true;
    player.yaw = playerTank.turretAngle || playerTank.angle;
    player.pitch = 0;

    // Explosion effects
    spawnExplosion(tp.x, tp.y + 1.5, tp.z);
    spawnExplosion(tp.x + 1, tp.y + 2, tp.z);
    playSound('explosion', 1.0);

    // Remove cockpit
    if (playerTank.cockpit) {
        playerTank.group.remove(playerTank.cockpit);
        playerTank.cockpit = null;
    }

    // Destroy the tank visually
    scene.remove(playerTank.group);
    playerTank.group.clear();
    playerTank = null;

    // Show weapon, hide tank HUD
    if (weaponModel) weaponModel.visible = true;
    document.getElementById('tankHud').style.display = 'none';
    document.getElementById('tankScope').style.display = 'none';
    document.getElementById('tankCrosshair').style.display = 'none';

    // Eject damage
    player.hp -= 30;
    player.lastDamageTime = performance.now();
    showDamageVignette();
    if (player.hp <= 0) { player.hp = 0; player.alive = false; }
}

function firePlayerTankCannon() {
    if (!playerInTank || !playerTank) return;
    const now = performance.now();
    if (now - playerTank.lastCannonShot < playerTank.cannonCooldown) return;
    playerTank.lastCannonShot = now;

    const tp = playerTank.group.position;
    const angle = playerTank.turretAngle;
    const sinA = Math.sin(angle), cosA = Math.cos(angle);

    // Fire hitscan in turret direction
    const shellRange = 60;
    let hitTarget = null, hitType = null, hitDist = shellRange;

    // Check enemy soldiers
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.alive) continue;
        const dx = e.group.position.x - tp.x;
        const dz = e.group.position.z - tp.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > shellRange) continue;
        // Check if enemy is roughly in the direction we're aiming
        const angleToE = Math.atan2(dx, dz);
        let da = angleToE - angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) < 0.15 && dist < hitDist) {
            hitDist = dist; hitTarget = e; hitType = 'enemy';
        }
    }

    // Check enemy tanks
    for (let i = 0; i < enemyTanks.length; i++) {
        const et = enemyTanks[i];
        if (!et.alive) continue;
        const dx = et.group.position.x - tp.x;
        const dz = et.group.position.z - tp.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > shellRange) continue;
        const angleToE = Math.atan2(dx, dz);
        let da = angleToE - angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) < 0.2 && dist < hitDist) {
            hitDist = dist; hitTarget = et; hitType = 'enemyTank';
        }
    }

    // Apply damage
    if (hitTarget) {
        if (hitType === 'enemy') {
            hitTarget.hp -= 60;
            if (hitTarget.hp <= 0) {
                hitTarget.hp = 0;
                hitTarget.alive = false;
                score += hitTarget.score || 100;
                kills++;
                showKillFeed(hitTarget.type || 'Enemy', 'Player Tank', hitTarget.score || 100);
                spawnDeathEffect(hitTarget);
                disposeEnemyGroup(hitTarget);
            }
        } else if (hitType === 'enemyTank') {
            hitTarget.hp -= 55;
            if (hitTarget.hp <= 0) {
                hitTarget.hp = 0;
                hitTarget.alive = false;
                score += hitTarget.score || 500;
                kills++;
                showKillFeed('TANK', 'Player Tank', hitTarget.score || 500);
            }
        }
        // Impact at hit location
        spawnImpact(hitTarget.group.position.x, 1.5, hitTarget.group.position.z, 0xff6622);
    }

    // Muzzle flash and sound
    spawnImpact(tp.x + sinA * 3.5, 1.7, tp.z + cosA * 3.5, 0xffaa22);
    playSound('explosion', 0.7);

    // Camera shake
    player.shakeX = (Math.random() - 0.5) * 0.06;
    player.shakeY = (Math.random() - 0.5) * 0.04;
    player.shakeDecay = 0.4;
}

function updatePlayerTank(dt) {
    if (!playerInTank || !playerTank || !playerTank.alive) return;
    const now = performance.now();
    const tank = playerTank;
    const tp = tank.group.position;

    // Hull movement - W/S drive, A/D rotate hull
    const driveSpeed = 6;
    const sprintSpeed = 9;
    const turnSpeed = 1.8;
    let driving = 0;

    if (keys['KeyW'] || (IS_TOUCH && touchMoveY > 0.2)) driving = 1;
    if (keys['KeyS'] || (IS_TOUCH && touchMoveY < -0.2)) driving = -1;

    const isSprint = keys['ShiftLeft'] || touchSprint;
    const speed = isSprint ? sprintSpeed : driveSpeed;
    tank.moveSpeed += ((driving * speed) - tank.moveSpeed) * 0.1;

    // A/D turn hull
    let turning = 0;
    if (keys['KeyA'] || (IS_TOUCH && touchMoveX < -0.2)) turning = 1;
    if (keys['KeyD'] || (IS_TOUCH && touchMoveX > 0.2)) turning = -1;
    if (turning !== 0 && Math.abs(tank.moveSpeed) > 0.3) {
        tank.angle += turning * turnSpeed * dt;
    } else if (turning !== 0) {
        // Pivot turn when nearly stationary
        tank.angle += turning * turnSpeed * 0.5 * dt;
    }

    // Move in hull direction
    const sinH = Math.sin(tank.angle), cosH = Math.cos(tank.angle);
    const mx = sinH * tank.moveSpeed * dt;
    const mz = cosH * tank.moveSpeed * dt;

    // Collision
    const res = resolveCollision(tp.x + mx, tp.z + mz, 1.5);
    tp.x = Math.max(-CFG.MAP_SIZE + 3, Math.min(CFG.MAP_SIZE - 3, res.x));
    tp.z = Math.max(-CFG.MAP_SIZE + 3, Math.min(CFG.MAP_SIZE - 3, res.z));

    // Smooth hull rotation
    tank.group.rotation.y += (tank.angle - tank.group.rotation.y) * 0.1;

    // Hull bob when moving
    const moving = Math.abs(tank.moveSpeed) > 0.3;
    if (moving) {
        tp.y = Math.sin(now * 0.005) * 0.08;
        tank.group.rotation.x = Math.sin(now * 0.004) * 0.015;
    } else {
        tp.y += (0 - tp.y) * 0.1;
        tank.group.rotation.x *= 0.9;
    }

    // Turret aims where player looks (mouse)
    tank.turretAngle = player.yaw + Math.PI; // player yaw faces -Z, tank faces +angle
    const turretLocal = tank.turretAngle - tank.angle;
    const turret = tank.group.children[1]; // turret mesh
    const barrel = tank.group.children[2]; // barrel mesh
    if (turret) turret.rotation.y = turretLocal;
    if (barrel) barrel.rotation.y = turretLocal;

    // Toggle cockpit visibility
    if (tank.cockpit) {
        tank.cockpit.visible = (tankCamMode === 'first');
        // Hide outer tank meshes in first person (hull, turret, barrel, tracks, star = children 0-5)
        for (let ci = 0; ci < 6; ci++) {
            if (tank.group.children[ci]) tank.group.children[ci].visible = (tankCamMode !== 'first');
        }
    }

    // Camera
    const sinT = Math.sin(tank.turretAngle), cosT = Math.cos(tank.turretAngle);
    if (tankCamMode === 'first') {
        // First person: camera at hatch level, looking out over the dashboard
        const fpX = tp.x + sinT * 0.3;
        const fpZ = tp.z + cosT * 0.3;
        const fpY = tp.y + 2.4; // head poking out of hatch
        camera.position.x += (fpX - camera.position.x) * 0.25;
        camera.position.y += (fpY - camera.position.y) * 0.25;
        camera.position.z += (fpZ - camera.position.z) * 0.25;
        // Look in turret direction
        _v1.set(tp.x + sinT * 30, tp.y + 2.2 + player.pitch * 8, tp.z + cosT * 30);
        camera.lookAt(_v1);

        // Show tank scope, hide 3rd person crosshair
        document.getElementById('tankScope').style.display = 'block';
        document.getElementById('tankCrosshair').style.display = 'none';
    } else {
        // Third person: camera behind turret, looking forward over the tank
        const camDist = 10;
        const camHeight = 5;
        const camX = tp.x - sinT * camDist;
        const camZ = tp.z - cosT * camDist;
        const camY = tp.y + camHeight;
        camera.position.x += (camX - camera.position.x) * 0.1;
        camera.position.y += (camY - camera.position.y) * 0.1;
        camera.position.z += (camZ - camera.position.z) * 0.1;
        // Look ahead past the tank in turret direction, pitch controls up/down
        _v1.set(tp.x + sinT * 15, tp.y + 1 + player.pitch * 12, tp.z + cosT * 15);
        camera.lookAt(_v1);

        // Hide tank scope, show 3rd person crosshair
        document.getElementById('tankScope').style.display = 'none';
    document.getElementById('tankCrosshair').style.display = 'none';
        document.getElementById('tankCrosshair').style.display = 'block';
    }

    // Track player position to tank (for enemy targeting, etc.)
    player.x = tp.x;
    player.z = tp.z;
    player.y = tp.y + 1.5;

    // Engine sound
    if (!tank.lastEngineSound || now - tank.lastEngineSound > 1000) {
        tank.lastEngineSound = now;
        playSound('planeEngine', 0.3, tp.x, 0, tp.z);
    }

    // Update tank HUD
    const hpPct = Math.max(0, tank.hp / tank.maxHp * 100);
    document.getElementById('tankHpText').textContent = Math.ceil(tank.hp);
    const hpFill = document.getElementById('tankHpFill');
    hpFill.style.width = hpPct + '%';
    hpFill.style.background = hpPct > 50 ? '#88ff88' : hpPct > 25 ? '#ffaa44' : '#ff4444';
    const cooldownLeft = Math.max(0, tank.cannonCooldown - (now - tank.lastCannonShot));
    document.getElementById('tankCannon').textContent = cooldownLeft <= 0 ? 'READY' : (cooldownLeft / 1000).toFixed(1) + 's';
    document.getElementById('tankSpd').textContent = Math.round(Math.abs(tank.moveSpeed));

    // Touch: fire button fires cannon
    if (IS_TOUCH && touchShootDown) {
        firePlayerTankCannon();
    }
}

function updateTankPrompt() {
    if (playerInTank || playerFlying) {
        document.getElementById('tankPrompt').style.display = 'none';
        return;
    }
    let near = false;
    for (let i = 0; i < allyTanks.length; i++) {
        const t = allyTanks[i];
        if (!t.alive) continue;
        const dx = player.x - t.group.position.x;
        const dz = player.z - t.group.position.z;
        if (Math.sqrt(dx * dx + dz * dz) < 8) { near = true; break; }
    }
    document.getElementById('tankPrompt').style.display = near ? 'block' : 'none';
    // Hide plane prompt when tank prompt is showing so they don't overlap
    if (near) document.getElementById('planePrompt').style.display = 'none';
}

// ---- PLAYER PLANE (LUFTWAFFE) ----
function createGroundedPlane() {
    if (groundedPlane) { scene.remove(groundedPlane.group); groundedPlane.group.clear(); }
    const group = new THREE.Group();
    // Fuselage — darker Luftwaffe grey-green
    const lwMat = new THREE.MeshStandardMaterial({ color: 0x556b4e, roughness: 0.6, metalness: 0.4 });
    const lwDark = new THREE.MeshStandardMaterial({ color: 0x3a4a35, roughness: 0.5, metalness: 0.5 });
    const fuselage = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 9), lwMat);
    fuselage.castShadow = true; group.add(fuselage);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(14, 0.15, 2.8), lwMat);
    wing.position.y = 0.1; wing.castShadow = true; group.add(wing);
    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 1.4), lwMat);
    tailFin.position.set(0, 0.8, 4); group.add(tailFin);
    const tailH = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.1, 1.1), lwMat);
    tailH.position.set(0, 0.1, 4); group.add(tailH);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 6), lwDark);
    nose.rotation.x = Math.PI / 2; nose.position.set(0, 0, -5.2); group.add(nose);
    // Iron cross marking on side
    const crossMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 1.2), crossMat);
    crossH.position.set(0.71, 0, 1); group.add(crossH);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.2, 0.5), crossMat);
    crossV.position.set(0.71, 0, 1); group.add(crossV);
    // Landing gear (so it sits on ground)
    for (const sx of [-2.5, 2.5]) {
        const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 6), lwDark);
        gear.position.set(sx, -0.9, -1); group.add(gear);
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.15, 8), lwDark);
        wheel.rotation.z = Math.PI / 2; wheel.position.set(sx, -1.6, -1); group.add(wheel);
    }
    // Tail wheel
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 6), lwDark);
    tw.rotation.z = Math.PI / 2; tw.position.set(0, -1.0, 3.8); group.add(tw);

    const planeTheme = MAP_THEMES[selectedMap];
    const pp = planeTheme ? planeTheme.planePos : { x: 6, z: 24 };
    group.position.set(pp.x, 1.8, pp.z); // beside player spawn
    group.rotation.y = Math.PI; // facing north toward enemy
    group.scale.set(1.2, 1.2, 1.2); // slightly bigger so it's easy to spot
    addMapObject(group);
    groundedPlane = { group, lwMat, lwDark };
}

function togglePlane() {
    if (!gameRunning || !player || !player.alive) return;
    if (playerFlying) {
        exitPlane();
    } else {
        enterPlane();
    }
}

function enterPlane() {
    if (!groundedPlane || playerFlying) return;
    const gp = groundedPlane.group.position;
    const dx = player.x - gp.x, dz = player.z - gp.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 12) return; // too far

    playerFlying = true;
    // Remove grounded plane mesh
    scene.remove(groundedPlane.group);

    // Create flying player plane
    const group = new THREE.Group();
    const lwMat = groundedPlane.lwMat;
    const lwDark = groundedPlane.lwDark;
    const fuselage = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 9), lwMat);
    fuselage.castShadow = true; group.add(fuselage);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(14, 0.15, 2.8), lwMat);
    wing.position.y = 0.1; wing.castShadow = true; group.add(wing);
    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 1.4), lwMat);
    tailFin.position.set(0, 0.8, 4); group.add(tailFin);
    const tailH = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.1, 1.1), lwMat);
    tailH.position.set(0, 0.1, 4); group.add(tailH);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 6), lwDark);
    nose.rotation.x = Math.PI / 2; nose.position.set(0, 0, -5.2); group.add(nose);
    // Spinning prop disc
    const propGeo = new THREE.CircleGeometry(1.3, 16);
    const propMat = new THREE.MeshBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    const prop = new THREE.Mesh(propGeo, propMat);
    prop.position.set(0, 0, -5.8); group.add(prop);

    // ---- COCKPIT INTERIOR (Bf 109 style, visible in first-person) ----
    const cockpit = new THREE.Group();
    // Materials
    const cFrame = new THREE.MeshStandardMaterial({ color: 0x2d2d24, roughness: 0.85, metalness: 0.25 }); // dark olive frame
    const cPanel = new THREE.MeshStandardMaterial({ color: 0x1a1a14, roughness: 0.7, metalness: 0.35 }); // instrument panel black
    const cMetal = new THREE.MeshStandardMaterial({ color: 0x555548, roughness: 0.4, metalness: 0.65 }); // brushed metal
    const cLeather = new THREE.MeshStandardMaterial({ color: 0x3a2e22, roughness: 0.9, metalness: 0.1 }); // leather brown
    const cRubber = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95, metalness: 0.05 });
    const cGlass = new THREE.MeshStandardMaterial({ color: 0x8ab4cc, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.9, side: THREE.DoubleSide });
    const cGaugeFace = new THREE.MeshBasicMaterial({ color: 0x0a0a08 });
    const cNeedle = new THREE.MeshBasicMaterial({ color: 0xff2200 });
    const cGaugeWhite = new THREE.MeshBasicMaterial({ color: 0xccccaa });
    const cSight = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.85 });
    const cWarn = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    const cRed = new THREE.MeshBasicMaterial({ color: 0xcc2200 });

    // === COCKPIT TUB (surrounds the pilot) ===
    // Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 4.0), cFrame);
    floor.position.set(0, -0.5, -1.0); cockpit.add(floor);
    // Side walls (lower fuselage interior)
    for (const s of [-1, 1]) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 4.2), cFrame);
        wall.position.set(s * 0.68, -0.1, -1.0); cockpit.add(wall);
        // Interior padding (leather strips on walls)
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 2.0), cLeather);
        pad.position.set(s * 0.65, 0.0, -1.3); cockpit.add(pad);
        // Armrest
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.5), cLeather);
        arm.position.set(s * 0.62, 0.05, -1.2); cockpit.add(arm);
    }
    // Rear bulkhead (behind pilot's head, with armor plate)
    const bulkhead = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 0.08), cFrame);
    bulkhead.position.set(0, 0.0, 0.8); cockpit.add(bulkhead);
    const armorPlate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.04), cMetal);
    armorPlate.position.set(0, 0.15, 0.76); cockpit.add(armorPlate);

    // === SEAT ===
    const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), cLeather);
    seatBase.position.set(0, -0.32, -0.3); cockpit.add(seatBase);
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.08), cLeather);
    seatBack.position.set(0, 0.0, 0.0); seatBack.rotation.x = -0.1; cockpit.add(seatBack);
    // Seat cushion detail
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.95 }));
    cushion.position.set(0, -0.28, -0.3); cockpit.add(cushion);
    // Harness straps
    for (const s of [-1, 1]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.015), new THREE.MeshStandardMaterial({ color: 0x6b5b3a, roughness: 0.8 }));
        strap.position.set(s * 0.12, -0.05, -0.15); strap.rotation.x = -0.15; cockpit.add(strap);
    }
    // Harness buckle
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02), cMetal);
    buckle.position.set(0, -0.18, -0.3); cockpit.add(buckle);

    // === INSTRUMENT PANEL ===
    // Main panel — slightly angled back
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.5, 0.1), cPanel);
    dash.position.set(0, -0.35, -2.1); dash.rotation.x = -0.08; cockpit.add(dash);
    // Top cowl / dashboard lip
    const dashLip = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.25), cFrame);
    dashLip.position.set(0, -0.12, -2.15); cockpit.add(dashLip);
    // Side panels angling to walls
    for (const s of [-1, 1]) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, 0.08), cPanel);
        sp.position.set(s * 0.62, -0.3, -2.0); sp.rotation.y = s * 0.3; cockpit.add(sp);
        // Small sub-gauges on side panels
        const sg = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 12), cMetal);
        sg.position.set(s * 0.62, -0.25, -1.96); cockpit.add(sg);
        const sgf = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), cGaugeFace);
        sgf.position.set(s * 0.62, -0.25, -1.955); cockpit.add(sgf);
    }

    // Main gauges — 6 instruments in 2 rows of 3
    const gaugePositions = [
        { x: -0.3, y: -0.2, r: 0.07 }, { x: 0, y: -0.2, r: 0.085 }, { x: 0.3, y: -0.2, r: 0.07 },
        { x: -0.25, y: -0.42, r: 0.06 }, { x: 0.05, y: -0.42, r: 0.06 }, { x: 0.3, y: -0.42, r: 0.055 },
    ];
    const gaugeNeedleAngles = [0.4, -0.2, 0.7, -0.5, 0.1, -0.8];
    for (let gi = 0; gi < gaugePositions.length; gi++) {
        const gp2 = gaugePositions[gi];
        // Bezel ring
        const bezel = new THREE.Mesh(new THREE.TorusGeometry(gp2.r, 0.012, 8, 20), cMetal);
        bezel.position.set(gp2.x, gp2.y, -2.04); cockpit.add(bezel);
        // Face
        const face = new THREE.Mesh(new THREE.CircleGeometry(gp2.r - 0.005, 20), cGaugeFace);
        face.position.set(gp2.x, gp2.y, -2.035); cockpit.add(face);
        // Needle
        const nl = new THREE.Mesh(new THREE.BoxGeometry(0.006, gp2.r * 0.8, 0.003), cNeedle);
        nl.position.set(gp2.x, gp2.y + gp2.r * 0.15, -2.03);
        nl.rotation.z = gaugeNeedleAngles[gi]; cockpit.add(nl);
        // Scale markings
        for (let m = 0; m < 10; m++) {
            const a = (m / 10) * Math.PI * 1.6 - Math.PI * 0.8;
            const mr = gp2.r * 0.78;
            const tick = new THREE.Mesh(new THREE.BoxGeometry(m % 2 === 0 ? 0.008 : 0.004, 0.004, 0.002), cGaugeWhite);
            tick.position.set(gp2.x + Math.sin(a) * mr, gp2.y + Math.cos(a) * mr, -2.032);
            tick.rotation.z = -a; cockpit.add(tick);
        }
        // Center pivot dot
        const pvt = new THREE.Mesh(new THREE.CircleGeometry(0.006, 8), cMetal);
        pvt.position.set(gp2.x, gp2.y, -2.028); cockpit.add(pvt);
    }

    // Switch panel below main gauges
    const switchPanel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.06), cPanel);
    switchPanel.position.set(0, -0.56, -2.05); cockpit.add(switchPanel);
    // Toggle switches
    for (let sw = 0; sw < 4; sw++) {
        const swBase = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 6), cMetal);
        swBase.position.set(-0.18 + sw * 0.12, -0.56, -2.02); swBase.rotation.x = Math.PI / 2; cockpit.add(swBase);
        const swToggle = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.035, 4), cMetal);
        swToggle.position.set(-0.18 + sw * 0.12, -0.54, -2.01); swToggle.rotation.x = sw < 2 ? 0.5 : -0.5; cockpit.add(swToggle);
    }

    // Warning lights (2 small circles)
    for (let wl = 0; wl < 2; wl++) {
        const wlm = new THREE.Mesh(new THREE.CircleGeometry(0.015, 8), wl === 0 ? cWarn : cRed);
        wlm.position.set(-0.42 + wl * 0.84, -0.5, -2.04); cockpit.add(wlm);
    }

    // === THROTTLE QUADRANT (left wall) ===
    const tqBase = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.2), cFrame);
    tqBase.position.set(-0.62, -0.1, -1.6); cockpit.add(tqBase);
    const tqRail = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.3), cMetal);
    tqRail.position.set(-0.6, -0.05, -1.6); cockpit.add(tqRail);
    const tqHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.025), cRubber);
    tqHandle.position.set(-0.6, -0.02, -1.52); cockpit.add(tqHandle);
    // Prop pitch lever
    const ppLever = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.02), cMetal);
    ppLever.position.set(-0.6, -0.02, -1.68); cockpit.add(ppLever);
    // Mixture lever (red knob)
    const mixLever = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.05, 0.015), cRed);
    mixLever.position.set(-0.6, -0.02, -1.75); cockpit.add(mixLever);

    // === CONTROL STICK ===
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.5, 8), cFrame);
    stick.position.set(0, -0.22, -1.3); cockpit.add(stick);
    const stickGrip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.05), cLeather);
    stickGrip.position.set(0, 0.04, -1.3); cockpit.add(stickGrip);
    // Trigger
    const trig = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.025), cRed);
    trig.position.set(0, 0.08, -1.33); cockpit.add(trig);
    // Thumb button
    const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), cRubber);
    thumb.position.set(0.02, 0.1, -1.28); cockpit.add(thumb);

    // === RUDDER PEDALS ===
    for (const s of [-1, 1]) {
        const pedalBar = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.5), cMetal);
        pedalBar.position.set(s * 0.22, -0.42, -1.8); cockpit.add(pedalBar);
        const pedalFoot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.18), cRubber);
        pedalFoot.position.set(s * 0.22, -0.42, -2.0); pedalFoot.rotation.x = 0.25; cockpit.add(pedalFoot);
    }

    // === CANOPY FRAME (Bf 109 greenhouse style) ===
    // Heavy front windscreen frame (triangular armored glass frame)
    const fwFrame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), cFrame);
    fwFrame.position.set(0, 0.5, -2.6); cockpit.add(fwFrame);
    // Front windscreen armor post (center)
    const armorPost = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.4, 0.025), cFrame);
    armorPost.position.set(0, 0.65, -2.55); armorPost.rotation.x = 0.2; cockpit.add(armorPost);
    // Angled side windscreen frames
    for (const s of [-1, 1]) {
        const fwSide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), cFrame);
        fwSide.position.set(s * 0.55, 0.5, -2.4);
        fwSide.rotation.x = 0.15; fwSide.rotation.z = s * -0.25; cockpit.add(fwSide);
    }

    // Side rails (lower canopy rail — where canopy slides)
    for (const s of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 3.8), cFrame);
        rail.position.set(s * 0.68, 0.25, -0.8); cockpit.add(rail);
        // Canopy sliding track
        const track = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 3.0), cMetal);
        track.position.set(s * 0.7, 0.28, -0.8); cockpit.add(track);
    }

    // Canopy arch ribs (5 curved ribs from side to side over the pilot)
    for (let r = 0; r < 5; r++) {
        const rz = -2.2 + r * 0.8;
        // Simulate an arch with 5 segments per rib
        for (let seg = 0; seg < 5; seg++) {
            const t = (seg / 4) * Math.PI; // 0 to PI = left to right
            const rx = Math.cos(t) * 0.68;
            const ry = 0.25 + Math.sin(t) * 0.55;
            const nextT = ((seg + 1) / 4) * Math.PI;
            const nrx = Math.cos(nextT) * 0.68;
            const nry = 0.25 + Math.sin(nextT) * 0.55;
            const mx = (rx + nrx) / 2, my = (ry + nry) / 2;
            const len = Math.sqrt((nrx - rx) ** 2 + (nry - ry) ** 2);
            const ang = Math.atan2(nry - ry, nrx - rx);
            const rib = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.03), cFrame);
            rib.position.set(mx, my, rz);
            rib.rotation.z = ang; cockpit.add(rib);
        }
    }

    // Top spine (center longitudinal bar)
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 4.0), cFrame);
    spine.position.set(0, 0.82, -0.8); cockpit.add(spine);

    // Vertical struts (connecting rails to ribs on each side)
    for (const s of [-1, 1]) {
        for (let v = 0; v < 5; v++) {
            const vz = -2.2 + v * 0.8;
            const strut = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.5, 0.025), cFrame);
            strut.position.set(s * 0.67, 0.5, vz);
            strut.rotation.z = s * 0.06; cockpit.add(strut);
        }
    }

    // === GLASS PANELS ===
    // Front windscreen (3 panels — center flat, 2 angled sides)
    const fwGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.55), cGlass);
    fwGlass.position.set(0, 0.55, -2.5); fwGlass.rotation.x = 0.2; cockpit.add(fwGlass);
    for (const s of [-1, 1]) {
        const fwSideGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), cGlass);
        fwSideGlass.position.set(s * 0.35, 0.52, -2.4);
        fwSideGlass.rotation.x = 0.15; fwSideGlass.rotation.y = s * 0.4; cockpit.add(fwSideGlass);
    }
    // Side glass panels (between canopy ribs)
    for (const s of [-1, 1]) {
        for (let gp2 = 0; gp2 < 4; gp2++) {
            const gz = -2.0 + gp2 * 0.8;
            const sg = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), cGlass);
            sg.position.set(s * 0.69, 0.5, gz);
            sg.rotation.y = s * Math.PI / 2; cockpit.add(sg);
        }
    }
    // Top glass panels (between ribs and spine)
    for (let tg = 0; tg < 4; tg++) {
        const tgz = -2.0 + tg * 0.8;
        for (const s of [-1, 1]) {
            const topG = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.7), cGlass);
            topG.position.set(s * 0.2, 0.78, tgz);
            topG.rotation.x = Math.PI / 2 + s * 0.15; cockpit.add(topG);
        }
    }

    // === REVI GUNSIGHT (reflector sight) ===
    // Mounting bracket
    const sightBracket = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.06), cMetal);
    sightBracket.position.set(0, 0.32, -2.35); cockpit.add(sightBracket);
    // Sight post
    const sightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8), cMetal);
    sightPost.position.set(0, 0.38, -2.35); cockpit.add(sightPost);
    // Sight body (the housing)
    const sightBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.08), cFrame);
    sightBody.position.set(0, 0.44, -2.35); cockpit.add(sightBody);
    // Reflector glass (angled)
    const reflector = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.05),
        new THREE.MeshBasicMaterial({ color: 0x224433, transparent: true, opacity: 0.25 }));
    reflector.position.set(0, 0.48, -2.36); reflector.rotation.x = 0.2; cockpit.add(reflector);
    // Aiming reticle — outer ring
    const reticle = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0025, 8, 20), cSight);
    reticle.position.set(0, 0.48, -2.355); cockpit.add(reticle);
    // Inner ring
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.01, 0.002, 6, 16), cSight);
    innerRing.position.set(0, 0.48, -2.352); cockpit.add(innerRing);
    // Center pipper
    const pipper = new THREE.Mesh(new THREE.CircleGeometry(0.004, 8), cSight);
    pipper.position.set(0, 0.48, -2.35); cockpit.add(pipper);
    // Range lines (4 small ticks on reticle)
    for (let rl = 0; rl < 4; rl++) {
        const a = (rl / 4) * Math.PI * 2;
        const rlm = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.008, 0.001), cSight);
        rlm.position.set(Math.sin(a) * 0.02, 0.48 + Math.cos(a) * 0.02, -2.349);
        rlm.rotation.z = -a; cockpit.add(rlm);
    }

    // === MISC COCKPIT DETAILS ===
    // Canopy handle (inside, left side)
    const canopyHandle = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.04, 0.1), cMetal);
    canopyHandle.position.set(-0.6, 0.35, -0.5); cockpit.add(canopyHandle);
    // Oxygen valve (right wall)
    const o2Valve = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 8), cMetal);
    o2Valve.position.set(0.62, -0.05, -1.0); o2Valve.rotation.z = Math.PI / 2; cockpit.add(o2Valve);
    // Trim wheel (left side, small wheel)
    const trimWheel = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 12), cMetal);
    trimWheel.position.set(-0.62, -0.15, -1.3); trimWheel.rotation.y = Math.PI / 2; cockpit.add(trimWheel);
    // Compass (small ball compass on dash)
    const compassBall = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshStandardMaterial({ color: 0x334433, transparent: true, opacity: 0.6, roughness: 0.1, metalness: 0.8 }));
    compassBall.position.set(0, 0.25, -2.1); cockpit.add(compassBall);
    const compassRim = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.005, 6, 12), cMetal);
    compassRim.position.set(0, 0.25, -2.08); cockpit.add(compassRim);
    // Map holder clips (right wall)
    for (let mc = 0; mc < 2; mc++) {
        const clip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.02), cMetal);
        clip.position.set(0.62, 0.1 - mc * 0.15, -0.6); cockpit.add(clip);
    }
    // Rivets along canopy frame (small dots along spine)
    for (let rv = 0; rv < 20; rv++) {
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.005, 4, 4), cMetal);
        rivet.position.set(0, 0.84, -2.5 + rv * 0.2); cockpit.add(rivet);
    }

    group.add(cockpit);

    group.position.set(gp.x, 5, gp.z);
    scene.add(group);

    playerPlane = {
        group, cockpit,
        hp: 200, maxHp: 200,
        pitch: 0, roll: 0, yaw: Math.PI, // facing north
        speed: 35,
        bombsLeft: 5,
        alive: true,
        lwMat, lwDark, propMat,
        lastBomb: 0,
    };

    // Hide weapon model
    if (weaponModel) weaponModel.visible = false;
    // Show flight HUD, hide normal ammo hud
    document.getElementById('flightHud').style.display = 'block';
    document.getElementById('planePrompt').style.display = 'none';
    playSound('planeEngine', 0.8);
}

function exitPlane() {
    if (!playerFlying || !playerPlane) return;
    const pp = playerPlane.group.position;
    // Only exit if low enough
    if (pp.y > 12) return;

    playerFlying = false;
    // Place player at plane position
    player.x = pp.x;
    player.z = pp.z;
    player.y = CFG.PLAYER_HEIGHT;
    player.vy = 0;
    player.grounded = true;
    player.yaw = playerPlane.yaw;
    player.pitch = 0;

    // Remove flying plane
    scene.remove(playerPlane.group);
    playerPlane.group.clear();
    if (playerPlane.propMat) playerPlane.propMat.dispose();
    playerPlane = null;

    // Show weapon model
    if (weaponModel) weaponModel.visible = true;
    // Hide flight HUD
    document.getElementById('flightHud').style.display = 'none';

    // Respawn grounded plane after a delay
    planeRespawnTimer = performance.now() + 15000;

    playSound('footstep', 0.8);
}

function ejectFromPlane() {
    if (!playerFlying || !playerPlane) return;
    const pp = playerPlane.group.position;
    playerFlying = false;
    player.x = pp.x;
    player.z = pp.z;
    player.y = Math.max(CFG.PLAYER_HEIGHT, pp.y);
    player.vy = -2;
    player.grounded = false;
    player.yaw = playerPlane.yaw;
    player.pitch = 0;

    // Explosion
    spawnExplosion(pp.x, pp.y, pp.z);
    spawnExplosion(pp.x + 2, pp.y + 1, pp.z);
    playSound('explosion', 1.0);

    scene.remove(playerPlane.group);
    playerPlane.group.clear();
    if (playerPlane.propMat) playerPlane.propMat.dispose();
    playerPlane = null;

    if (weaponModel) weaponModel.visible = true;
    document.getElementById('flightHud').style.display = 'none';

    // Fall damage
    player.hp -= 25;
    player.lastDamageTime = performance.now();
    showDamageVignette();
    if (player.hp <= 0) { player.hp = 0; player.alive = false; }

    planeRespawnTimer = performance.now() + 20000;
}

function dropPlayerBomb() {
    if (!playerFlying || !playerPlane) return;
    const now = performance.now();
    if (now - playerPlane.lastBomb < 300) return; // fast cooldown
    playerPlane.lastBomb = now;

    const pp = playerPlane.group.position;
    const bombMesh = createBombMesh();
    bombMesh.scale.set(2.5, 2.5, 2.5);
    bombMesh.position.copy(pp);
    scene.add(bombMesh);

    // Bomb inherits plane velocity
    const sinY = Math.sin(playerPlane.yaw);
    const cosY = Math.cos(playerPlane.yaw);
    bombs.push({
        mesh: bombMesh,
        vx: -sinY * playerPlane.speed * 0.5,
        vy: -2,
        vz: -cosY * playerPlane.speed * 0.5,
    });
    playSound('bombWhistle', 0.8, pp.x, 0, pp.z);
}

function updatePlayerPlane(dt) {
    if (!playerFlying || !playerPlane || !playerPlane.alive) return;
    const pp = playerPlane;
    const now = performance.now();

    // Flight controls
    const pitchRate = 1.5 * dt;
    const rollRate = 2.0 * dt;

    if (keys['KeyW'] || (IS_TOUCH && touchMoveY > 0.2)) pp.pitch -= pitchRate; // nose down
    if (keys['KeyS'] || (IS_TOUCH && touchMoveY < -0.2)) pp.pitch += pitchRate; // nose up
    if (keys['KeyA'] || (IS_TOUCH && touchMoveX < -0.2)) pp.roll += rollRate; // bank left
    if (keys['KeyD'] || (IS_TOUCH && touchMoveX > 0.2)) pp.roll -= rollRate; // bank right

    // Clamp pitch
    pp.pitch = Math.max(-0.6, Math.min(0.6, pp.pitch));
    // Roll decays toward 0
    pp.roll *= 0.97;
    pp.roll = Math.max(-1.2, Math.min(1.2, pp.roll));

    // Roll causes yaw turn (bank-to-turn)
    pp.yaw += pp.roll * 0.8 * dt;

    // Speed — boost with shift
    const targetSpeed = (keys['ShiftLeft'] || touchSprint) ? 55 : 35;
    pp.speed += (targetSpeed - pp.speed) * 0.05;

    // Move forward in plane's facing direction
    const sinY = Math.sin(pp.yaw);
    const cosY = Math.cos(pp.yaw);
    const forward = pp.speed * dt;
    pp.group.position.x -= sinY * forward;
    pp.group.position.z -= cosY * forward;
    // Pitch affects altitude
    pp.group.position.y += pp.pitch * pp.speed * 0.5 * dt;

    // Clamp altitude and map bounds
    if (pp.group.position.y < 4) {
        pp.group.position.y = 4;
        pp.pitch = Math.max(pp.pitch, 0);
    }
    if (pp.group.position.y > 80) {
        pp.group.position.y = 80;
        pp.pitch = Math.min(pp.pitch, 0);
    }
    const mapLim = CFG.MAP_SIZE + 30;
    pp.group.position.x = Math.max(-mapLim, Math.min(mapLim, pp.group.position.x));
    pp.group.position.z = Math.max(-mapLim, Math.min(mapLim, pp.group.position.z));

    // Apply rotation to group
    pp.group.rotation.order = 'YXZ';
    pp.group.rotation.y = pp.yaw;
    pp.group.rotation.x = -pp.pitch * 0.5;
    pp.group.rotation.z = pp.roll;

    // Toggle cockpit visibility based on camera mode
    if (pp.cockpit) {
        pp.cockpit.visible = (planeCamMode === 'first');
        // In first-person, hide outer fuselage/wings so they don't block view
        // Children 0-5 are fuselage, wing, tailFin, tailH, nose, prop
        for (let ci = 0; ci < 6; ci++) {
            if (pp.group.children[ci]) pp.group.children[ci].visible = (planeCamMode !== 'first');
        }
    }

    // Camera — first-person cockpit or third-person chase (toggle with C)
    if (planeCamMode === 'first') {
        // Cockpit view: camera inside the nose of the plane, looking forward
        const fpX = pp.group.position.x - sinY * 3;
        const fpZ = pp.group.position.z - cosY * 3;
        const fpY = pp.group.position.y + 0.8;
        camera.position.x += (fpX - camera.position.x) * 0.2;
        camera.position.y += (fpY - camera.position.y) * 0.2;
        camera.position.z += (fpZ - camera.position.z) * 0.2;
        // Look in flight direction with slight pitch influence
        _v1.set(
            pp.group.position.x - sinY * 30,
            pp.group.position.y + pp.pitch * 10,
            pp.group.position.z - cosY * 30
        );
        camera.lookAt(_v1);
        // Apply roll to camera for immersion
        camera.rotation.z = -pp.roll * 0.5;
    } else {
        // Third-person chase camera
        const camDist = 18;
        const camHeight = 6;
        const camX = pp.group.position.x + sinY * camDist;
        const camZ = pp.group.position.z + cosY * camDist;
        const camY = pp.group.position.y + camHeight;
        camera.position.x += (camX - camera.position.x) * 0.08;
        camera.position.y += (camY - camera.position.y) * 0.08;
        camera.position.z += (camZ - camera.position.z) * 0.08;
        camera.lookAt(pp.group.position);
    }

    // Track player position to plane position (for enemy targeting, rain centering, etc.)
    player.x = pp.group.position.x;
    player.z = pp.group.position.z;
    player.y = pp.group.position.y;

    // Engine sound
    if (!pp.lastEngine || now - pp.lastEngine > 600) {
        pp.lastEngine = now;
        playSound('planeEngine', 0.9);
    }

    // Touch: fire button drops bombs
    if (IS_TOUCH && touchShootDown) {
        dropPlayerBomb();
    }

    // Update flight HUD
    document.getElementById('flightAlt').textContent = Math.round(pp.group.position.y);
    document.getElementById('flightSpd').textContent = Math.round(pp.speed);
    document.getElementById('flightBombs').textContent = '\u221E';
    const hpPct = Math.max(0, pp.hp / pp.maxHp * 100);
    const hpFill = document.getElementById('flightHpFill');
    hpFill.style.width = hpPct + '%';
    hpFill.style.background = hpPct > 50 ? '#88ff88' : hpPct > 25 ? '#ffaa44' : '#ff4444';
}

function updateGroundedPlanePrompt() {
    if (!groundedPlane || playerFlying) {
        document.getElementById('planePrompt').style.display = 'none';
        return;
    }
    const gp = groundedPlane.group.position;
    const dx = player.x - gp.x, dz = player.z - gp.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    document.getElementById('planePrompt').style.display = dist < 12 ? 'block' : 'none';
}

// ---- UPDATE ----
let _hudFrame = 0;

function update(dt) {
    if (!gameRunning || !player.alive) return;

    // Plane respawn check
    if (!groundedPlane && !playerFlying && planeRespawnTimer > 0 && performance.now() > planeRespawnTimer) {
        createGroundedPlane();
        planeRespawnTimer = 0;
    }

    // If flying, use flight update instead of ground movement
    if (playerFlying) {
        updatePlayerPlane(dt);
    } else if (playerInTank) {
        updatePlayerTank(dt);
    } else {
        updateGroundedPlanePrompt();
        updateTankPrompt();
    }

    if (playerFlying || playerInTank) {
        // Skip ground movement, jump to enemy/bullet/effects updates
    } else {

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

    } // end of !playerFlying/!playerInTank else block

    // Shooting (only when on ground, not in vehicle)
    if (!playerFlying && !playerInTank) {
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
    } // end of !playerFlying/!playerInTank shooting/reload block

    // Update partner model in multiplayer
    if (isMultiplayer) updatePartnerModel(dt);

    // Enemies (write-index compaction)
    let aliveCount = 0;
    {
        let w = 0;
        for (let i = 0; i < enemies.length; i++) {
            if (enemies[i].alive) {
                // In multiplayer, only host runs enemy AI; joiner gets positions from sync
                if (!isMultiplayer || isHost) updateEnemy(enemies[i], dt);
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
                c.mesh.visible = false;
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

    // Particles (write-index compaction) — return to pool instead of removing
    {
        let w = 0;
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                p.mesh.visible = false;
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

    // Animate flags — strong wind ripple and flapping
    if (CFG.FLAG_ANIM && _hudFrame % 2 === 0) {
        // Gusting wind speed
        const gust = 1 + Math.sin(time * 0.8) * 0.3 + Math.sin(time * 1.7) * 0.2;
        for (let i = 0; i < flagMeshes.length; i++) {
            const flag = flagMeshes[i];
            const pos = flag.geometry.attributes.position;
            const phase = flag.userData.windPhase || 0;
            for (let j = 0; j < pos.count; j++) {
                const vx = pos.getX(j);
                const vy = pos.getY(j);
                // Distance from pole edge — tip flaps more
                const dist = (vx + 1) / 2;
                const amp = dist * dist;
                // Big wave + medium ripple + fast flutter
                const w1 = Math.sin(vx * 2.5 + time * 4 * gust + phase) * 0.4;
                const w2 = Math.sin(vx * 5 + time * 7 * gust + phase * 1.5) * 0.15;
                const w3 = Math.sin(vx * 9 + vy * 4 + time * 12 * gust + phase) * 0.07;
                pos.setZ(j, (w1 + w2 + w3) * amp);
            }
            pos.needsUpdate = true;
        }
    }

    // Animate ambient smoke — turbulent rising with expansion and billboarding
    for (let i = 0; i < ambientSmoke.length; i++) {
        const s = ambientSmoke[i];
        s.position.y += s.userData.riseSpeed * dt;
        // Turbulent lateral drift
        const turb = s.userData.turbulencePhase + time * 0.8;
        s.position.x += (s.userData.driftX + Math.sin(turb) * s.userData.turbulenceAmt * 0.3) * dt;
        s.position.z += (s.userData.driftZ + Math.cos(turb * 0.7) * s.userData.turbulenceAmt * 0.2) * dt;
        s.rotation.z += dt * 0.15;
        // Expand as it rises
        const t = (s.position.y - s.userData.resetY) / (s.userData.maxY - s.userData.resetY);
        const growScale = s.userData.baseScale * (1 + t * s.userData.growRate * 3);
        s.scale.setScalar(growScale);
        // Fade out smoothly — thick near base, fading at top
        const fadeIn = Math.min(1, t * 5);
        const fadeOut = 1 - t * t;
        s.material.opacity = s.userData.maxOpacity * fadeIn * fadeOut;
        // Billboard: face camera
        if (camera) s.quaternion.copy(camera.quaternion);
        // Reset when too high
        if (s.position.y > s.userData.maxY) {
            s.position.y = s.userData.resetY + Math.random() * 2;
            s.position.x = s.userData.baseX + (Math.random() - 0.5) * 2;
            s.position.z = s.userData.baseZ + (Math.random() - 0.5) * 2;
            s.scale.setScalar(s.userData.baseScale);
            s.material.opacity = 0;
        }
    }

    // Animate fire lights and flame planes — realistic flicker with scale pulsing
    if (!CFG.FIRE_LIGHTS) { /* skip */ } else for (let i = 0; i < fireLights.length; i++) {
        const f = fireLights[i];
        // Chaotic light flicker
        const flicker1 = Math.sin(time * 10 + f.light.userData.phaseOffset) * 0.6;
        const flicker2 = Math.sin(time * 17 + f.light.userData.phaseOffset * 1.3) * 0.3;
        const flicker3 = Math.random() * 0.4;
        f.light.intensity = f.light.userData.baseIntensity + flicker1 + flicker2 + flicker3;
        // Slight color temperature shift
        const tempShift = Math.sin(time * 5 + f.light.userData.phaseOffset) * 0.1;
        f.light.color.setRGB(1.0, 0.35 + tempShift, 0.07);
        // Animate fire planes
        const children = f.group.children;
        for (let j = 0; j < children.length; j++) {
            const c = children[j];
            const spd = c.userData.flickerSpeed || 6;
            const amt = c.userData.flickerAmt || 0.15;
            const phase = c.userData.phaseOffset;
            // Vertical dance
            c.position.y = c.userData.baseY + Math.sin(time * spd + phase) * amt
                + Math.sin(time * spd * 1.7 + phase * 2.3) * amt * 0.5;
            // Scale pulsing — flames grow and shrink
            const scalePulse = (c.userData.baseScale || 1) * (1 + Math.sin(time * spd * 0.8 + phase) * 0.15);
            c.scale.setScalar(scalePulse);
            // Rotate to face camera + slight wobble
            c.rotation.y += dt * (1.5 + Math.sin(time * 3 + phase) * 0.5);
            // Fire smoke rises faster
            if (c.userData.isFireSmoke) {
                c.position.y = c.userData.baseY + ((time * 0.5 + phase) % 2.0);
                const smokeT = ((time * 0.5 + phase) % 2.0) / 2.0;
                c.material.opacity = 0.25 * (1 - smokeT);
                c.scale.setScalar((c.userData.baseScale || 1) * (1 + smokeT * 2));
            }
        }
    }

    // Wave check (only host triggers next wave in multiplayer)
    if (aliveCount === 0 && waveActive && (!isMultiplayer || isHost)) {
        waveActive = false;
        if (wave >= CFG.MAX_WAVES) {
            safeTimeout(() => { if (gameRunning) gameWin(); }, 1500);
        } else {
            safeTimeout(() => {
                if (gameRunning && player.alive) nextWave();
            }, CFG.WAVE_DELAY);
        }
    }

    // Grenades
    updateGrenades(dt);

    // Aeroplanes
    updateAeroplanes(dt);

    // Weather
    updateRain(dt);
    updateSnow(dt);

    // Enemy tanks
    updateEnemyTanks(dt);

    // Allied tanks
    updateAllyTanks(dt);

    // Rockets (bazooka)
    updateRockets(dt);

    // Corpses (ragdoll bodies + blood pools)
    updateCorpses(dt);

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
    if (!player.alive) {
        if (isMultiplayer) {
            // Notify partner
            if (socket) socket.emit('playerDied');
            // Only game over if partner is also dead
            if (!partnerAlive) {
                if (socket) socket.emit('gameOverMulti');
                gameOver();
            } else {
                // Player is dead but partner still alive - show death screen but let partner keep playing
                gameOver();
            }
        } else {
            gameOver();
        }
    }

    // Throttled HUD update
    if (++_hudFrame % 3 === 0) updateHUD(aliveCount, allyAliveCount);

    // Compass update (every 3 frames)
    if (_hudFrame % 3 === 0) updateCompass();
}

function updateHUD(aliveCount, allyAliveCount) {
    const w = player.weapons[player.weaponIndex];
    if (playerFlying && playerPlane) {
        DOM.healthBar.style.width = ((playerPlane.hp / playerPlane.maxHp) * 100) + '%';
        DOM.healthText.textContent = Math.max(0, Math.ceil(playerPlane.hp));
        DOM.ammoText.textContent = '\u221E';
        DOM.ammoMax.textContent = '\u221E';
        DOM.weaponName.textContent = 'LUFTWAFFE';
    } else if (playerInTank && playerTank) {
        DOM.healthBar.style.width = ((playerTank.hp / playerTank.maxHp) * 100) + '%';
        DOM.healthText.textContent = Math.max(0, Math.ceil(playerTank.hp));
        DOM.ammoText.textContent = '\u221E';
        DOM.ammoMax.textContent = '\u221E';
        DOM.weaponName.textContent = 'TANK CANNON';
    } else {
        DOM.healthBar.style.width = ((player.hp / player.maxHp) * 100) + '%';
        DOM.healthText.textContent = Math.max(0, Math.ceil(player.hp));
        DOM.ammoText.textContent = w.ammo;
        DOM.ammoMax.textContent = w.maxAmmo;
        DOM.weaponName.textContent = w.name;
    }
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

// ---- MULTIPLAYER FUNCTIONS ----
function createPartnerModel(name) {
    const group = new THREE.Group();
    // Reuse ally-style soldier model (blue/olive uniform)
    const tunicMat = new THREE.MeshStandardMaterial({ color: 0x2a5a1a, roughness: 0.85 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1a3a10, roughness: 0.85 });

    const torso = new THREE.Mesh(POOL.enemyTorsoGeo, tunicMat);
    torso.position.y = 1.1; torso.castShadow = true;
    group.add(torso);
    const collar = new THREE.Mesh(POOL.enemyCollarGeo, tunicMat);
    collar.position.y = 1.58;
    group.add(collar);
    const belt = new THREE.Mesh(POOL.enemyBeltGeo, POOL.allyBeltMat || new THREE.MeshStandardMaterial({ color: 0x3a2a1a }));
    belt.position.y = 0.72;
    group.add(belt);
    const head = new THREE.Mesh(POOL.enemyHeadGeo, MAT.enemyHead);
    head.position.y = 1.8;
    group.add(head);
    const helmet = new THREE.Mesh(POOL.enemyHelmetGeo, MAT.allyHelmet || new THREE.MeshStandardMaterial({ color: 0x4a5a2a }));
    helmet.position.y = 1.85;
    group.add(helmet);
    for (const sx of [-0.15, 0.15]) {
        const leg = new THREE.Mesh(POOL.enemyLegGeo, pantsMat);
        leg.position.set(sx, 0.35, 0);
        group.add(leg);
    }
    for (const sx of [-0.15, 0.15]) {
        const boot = new THREE.Mesh(POOL.enemyBootGeo, POOL.allyBootMat || new THREE.MeshStandardMaterial({ color: 0x2a1a0a }));
        boot.position.set(sx, 0.05, 0.02);
        group.add(boot);
    }
    // Left arm (at side)
    const pArmL = new THREE.Mesh(POOL.enemyArmGeo, tunicMat);
    pArmL.position.set(-0.4, 1.1, 0);
    group.add(pArmL);
    // Right upper arm (raised to hold gun)
    const pArmR = new THREE.Mesh(POOL.enemyArmGeo, tunicMat);
    pArmR.position.set(0.4, 1.1, -0.1);
    pArmR.rotation.x = -0.4;
    group.add(pArmR);
    // Right forearm + hand
    const pForeR = new THREE.Mesh(POOL.enemyForearmGeo, tunicMat);
    pForeR.position.set(0.38, 0.9, -0.3);
    pForeR.rotation.x = -0.8;
    group.add(pForeR);
    const pHandR = new THREE.Mesh(POOL.enemyHandGeo, POOL.skinMat);
    pHandR.position.set(0.38, 0.85, -0.38);
    group.add(pHandR);
    // Left forearm + hand supporting gun
    const pForeL = new THREE.Mesh(POOL.enemyForearmGeo, tunicMat);
    pForeL.position.set(-0.15, 0.9, -0.35);
    pForeL.rotation.x = -1.0;
    pForeL.rotation.y = 0.5;
    group.add(pForeL);
    const pHandL = new THREE.Mesh(POOL.enemyHandGeo, POOL.skinMat);
    pHandL.position.set(-0.05, 0.85, -0.45);
    group.add(pHandL);
    // Gun in hands
    const gun = new THREE.Mesh(POOL.enemyGunGeo, MAT.darkMetal);
    gun.position.set(0.15, 0.88, -0.4);
    gun.rotation.x = -0.1;
    group.add(gun);

    // Nameplate (canvas sprite above head)
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#00000088';
    ctx.fillRect(0, 0, 256, 64);
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#5ea04a';
    ctx.textAlign = 'center';
    ctx.fillText(name, 128, 40);
    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const nameSprite = new THREE.Sprite(spriteMat);
    nameSprite.position.y = 2.5;
    nameSprite.scale.set(2, 0.5, 1);
    group.add(nameSprite);

    const pSpawn = MAP_THEMES[selectedMap] ? MAP_THEMES[selectedMap].playerSpawn : { x: 0, z: 28 };
    group.position.set(pSpawn.x + 5, 0, pSpawn.z);
    scene.add(group);

    otherPlayer = {
        group,
        nameSprite,
        targetPos: { x: pSpawn.x + 5, y: 0, z: pSpawn.z },
        targetRot: 0,
        hp: CFG.PLAYER_HP,
        maxHp: CFG.PLAYER_HP,
        alive: true,
    };
}

function removePartnerModel() {
    if (otherPlayer) {
        scene.remove(otherPlayer.group);
        otherPlayer.group.clear();
        otherPlayer = null;
    }
}

function startPlayerSync() {
    if (_syncInterval) clearInterval(_syncInterval);
    _syncInterval = setInterval(() => {
        if (!socket || !gameRunning || !player) return;
        socket.emit('playerUpdate', {
            x: player.x, y: player.y, z: player.z,
            yaw: player.yaw,
            hp: player.hp,
            kills: kills,
            alive: player.alive,
            weaponIndex: player.weaponIndex,
        });
    }, 1000 / 30); // 30Hz
}

function startEnemySync() {
    if (_enemySyncInterval) clearInterval(_enemySyncInterval);
    if (!isHost) return;
    _enemySyncInterval = setInterval(() => {
        if (!socket || !gameRunning) return;
        const data = [];
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (!e.alive) continue;
            data.push({
                id: e.netId,
                x: e.group.position.x,
                y: e.group.position.y,
                z: e.group.position.z,
                rotY: e.group.rotation.y,
                hp: e.hp,
                type: e.type,
                state: e.state,
            });
        }
        socket.emit('enemiesSync', data);
    }, 1000 / 15); // 15Hz for enemies (less frequent)
}

function stopSyncIntervals() {
    if (_syncInterval) { clearInterval(_syncInterval); _syncInterval = null; }
    if (_enemySyncInterval) { clearInterval(_enemySyncInterval); _enemySyncInterval = null; }
}

function setupSocketListeners() {
    if (!socket) return;

    socket.on('playerUpdate', (data) => {
        if (!otherPlayer) return;
        otherPlayer.targetPos.x = data.x;
        otherPlayer.targetPos.y = data.y;
        otherPlayer.targetPos.z = data.z;
        otherPlayer.targetRot = data.yaw;
        otherPlayer.hp = data.hp;
        otherPlayer.alive = data.alive;
        partnerKills = data.kills || 0;
    });

    socket.on('playerShoot', (data) => {
        if (!otherPlayer || !otherPlayer.alive) return;
        // Spawn tracer from partner position
        const startPos = new THREE.Vector3(data.x, data.y, data.z);
        const dir = new THREE.Vector3(data.dx, data.dy, data.dz);
        const tracerGeo = new THREE.BufferGeometry().setFromPoints([
            startPos, startPos.clone().addScaledVector(dir, data.range || 50)
        ]);
        const tracerMat = new THREE.LineBasicMaterial({ color: 0xffff88, transparent: true, opacity: 0.6 });
        const tracer = new THREE.Line(tracerGeo, tracerMat);
        scene.add(tracer);
        bullets.push({ mesh: tracer, life: 0.1 });
        // Muzzle flash sound from partner position
        playSound('shoot', 0.4, data.x, data.y, data.z);
    });

    socket.on('enemiesSync', (data) => {
        if (isHost) return; // host doesn't receive this
        // Map existing enemies by netId
        const byId = {};
        for (let i = 0; i < enemies.length; i++) {
            if (enemies[i].netId) byId[enemies[i].netId] = enemies[i];
        }
        const seen = {};
        for (let i = 0; i < data.length; i++) {
            const d = data[i];
            seen[d.id] = true;
            let e = byId[d.id];
            if (!e) {
                // Create new enemy that joiner doesn't have
                e = createEnemy(d.x, d.z, d.type);
                e.netId = d.id;
                e._isNetworked = true;
                enemies.push(e);
            }
            // Update position
            e.group.position.set(d.x, d.y, d.z);
            e.group.rotation.y = d.rotY;
            e.hp = d.hp;
            e.state = d.state;
            if (d.hp <= 0 && e.alive) {
                e.alive = false;
                spawnExplosion(d.x, d.y + 1, d.z);
                spawnDeathEffect(e);
                disposeEnemyGroup(e);
            }
        }
        // Remove enemies that host no longer has
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            if (e._isNetworked && e.netId && !seen[e.netId] && e.alive) {
                e.alive = false;
                disposeEnemyGroup(e);
            }
        }
    });

    socket.on('waveStart', (data) => {
        if (isHost) return;
        wave = data.wave;
        waveActive = true;
        grenadeInventory = Math.min(MAX_GRENADES_INVENTORY, grenadeInventory + 2);
        if (wave > 1) reinforceAllies();
        DOM.waveBanner.textContent = `WAVE ${wave}`;
        DOM.waveBanner.style.opacity = '1';
        safeTimeout(() => { DOM.waveBanner.style.opacity = '0'; }, 2500);
    });

    socket.on('enemyKilled', (data) => {
        // Other player killed an enemy
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (e.netId === data.enemyId && e.alive) {
                e.alive = false;
                e.hp = 0;
                const gp = e.group.position;
                spawnExplosion(gp.x, gp.y + 1, gp.z);
                playSound('explosion', 0.8);
                spawnDeathEffect(e);
                disposeEnemyGroup(e);
                break;
            }
        }
    });

    socket.on('partnerDied', () => {
        partnerAlive = false;
        if (DOM.partnerDownBanner) {
            DOM.partnerDownBanner.style.opacity = '1';
            safeTimeout(() => { DOM.partnerDownBanner.style.opacity = '0'; }, 3000);
        }
    });

    socket.on('gameOverMulti', () => {
        gameOver();
    });

    socket.on('partnerDisconnected', () => {
        partnerAlive = false;
        removePartnerModel();
        if (gameRunning) {
            // Continue in solo-ish mode
            if (DOM.partnerDownBanner) {
                DOM.partnerDownBanner.textContent = 'PARTNER DISCONNECTED';
                DOM.partnerDownBanner.style.opacity = '1';
                safeTimeout(() => { DOM.partnerDownBanner.style.opacity = '0'; }, 3000);
            }
        }
    });
}

function updatePartnerModel(dt) {
    if (!otherPlayer || !isMultiplayer) return;
    const g = otherPlayer.group;
    if (!otherPlayer.alive) {
        if (g.visible) g.visible = false;
        return;
    }
    if (!g.visible) g.visible = true;
    // Smooth interpolation
    g.position.x += (otherPlayer.targetPos.x - g.position.x) * 0.2;
    g.position.y += (otherPlayer.targetPos.y - CFG.PLAYER_HEIGHT - g.position.y) * 0.2;
    g.position.z += (otherPlayer.targetPos.z - g.position.z) * 0.2;
    // Smooth rotation
    let dRot = otherPlayer.targetRot - g.rotation.y;
    while (dRot > Math.PI) dRot -= Math.PI * 2;
    while (dRot < -Math.PI) dRot += Math.PI * 2;
    g.rotation.y += dRot * 0.2;
    // Leg animation (walking look)
    const dx = otherPlayer.targetPos.x - g.position.x;
    const dz = otherPlayer.targetPos.z - g.position.z;
    const moving = Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01;
    if (moving) {
        const phase = performance.now() * 0.006;
        const children = g.children;
        if (children[5]) children[5].position.z = Math.sin(phase) * 0.15;
        if (children[6]) children[6].position.z = -Math.sin(phase) * 0.15;
        if (children[9]) children[9].rotation.x = Math.sin(phase) * 0.2;
        if (children[10]) children[10].rotation.x = -Math.sin(phase) * 0.2;
    }
    // Update partner HUD
    if (DOM.partnerHud) {
        DOM.partnerHud.style.display = 'block';
        DOM.partnerHpBar.style.width = ((otherPlayer.hp / otherPlayer.maxHp) * 100) + '%';
        DOM.partnerKills.textContent = partnerKills;
    }
}

// ---- GAME FLOW ----
// ---- CUTSCENE SYSTEM ----
function startCutscene() {
    const data = CUTSCENE_DATA[selectedMap];
    if (!data) { endCutscene(); return; }

    cutsceneActive = true;
    cutsceneDuration = 8;
    cutsceneWaypoints = getCutscenePath(selectedMap);
    cutsceneStartTime = performance.now() / 1000;

    // Position camera at first waypoint
    if (cutsceneWaypoints.length > 0) {
        const wp = cutsceneWaypoints[0];
        camera.position.set(wp.x, wp.y, wp.z);
        camera.lookAt(wp.lookX, wp.lookY, wp.lookZ);
    }

    // Show overlay
    const overlay = document.getElementById('cutsceneOverlay');
    overlay.style.display = 'flex';

    const titleEl = document.getElementById('cutsceneTitle');
    const subtitleEl = document.getElementById('cutsceneSubtitle');
    const theaterEl = document.getElementById('cutsceneTheater');
    const briefingEl = document.getElementById('cutsceneBriefing');
    const skipEl = document.getElementById('cutsceneSkip');

    titleEl.textContent = data.title;
    subtitleEl.textContent = data.subtitle;
    theaterEl.textContent = data.theater;
    briefingEl.textContent = '';

    // Reset visibility classes
    titleEl.classList.remove('visible');
    subtitleEl.classList.remove('visible');
    theaterEl.classList.remove('visible');
    briefingEl.classList.remove('visible');

    if (IS_TOUCH) {
        skipEl.textContent = 'TAP TO SKIP';
    } else {
        skipEl.textContent = 'PRESS SPACE TO SKIP';
    }

    // Animate text in
    requestAnimationFrame(() => {
        titleEl.classList.add('visible');
        subtitleEl.classList.add('visible');
        theaterEl.classList.add('visible');
    });

    // Typewriter effect for briefing
    if (cutsceneTypewriterTimer) clearInterval(cutsceneTypewriterTimer);
    const briefingText = data.briefing;
    let charIdx = 0;
    setTimeout(() => {
        briefingEl.classList.add('visible');
        cutsceneTypewriterTimer = setInterval(() => {
            if (charIdx < briefingText.length) {
                briefingEl.textContent += briefingText[charIdx];
                charIdx++;
            } else {
                clearInterval(cutsceneTypewriterTimer);
                cutsceneTypewriterTimer = null;
            }
        }, 30);
    }, 1200);

    // Auto-end after duration
    safeTimeout(() => {
        if (cutsceneActive) endCutscene();
    }, cutsceneDuration * 1000);
}

function updateCutsceneCamera() {
    if (!cutsceneActive || cutsceneWaypoints.length < 2) return;

    const now = performance.now() / 1000;
    const elapsed = now - cutsceneStartTime;
    const t = Math.min(elapsed / cutsceneDuration, 1);

    // Smooth easing
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const wps = cutsceneWaypoints;
    const totalSegments = wps.length - 1;
    const segProgress = eased * totalSegments;
    const segIdx = Math.min(Math.floor(segProgress), totalSegments - 1);
    const segT = segProgress - segIdx;

    const a = wps[segIdx];
    const b = wps[segIdx + 1];

    camera.position.set(
        a.x + (b.x - a.x) * segT,
        a.y + (b.y - a.y) * segT,
        a.z + (b.z - a.z) * segT
    );
    camera.lookAt(
        a.lookX + (b.lookX - a.lookX) * segT,
        a.lookY + (b.lookY - a.lookY) * segT,
        a.lookZ + (b.lookZ - a.lookZ) * segT
    );
}

function endCutscene() {
    if (!cutsceneActive) return;
    cutsceneActive = false;

    if (cutsceneTypewriterTimer) {
        clearInterval(cutsceneTypewriterTimer);
        cutsceneTypewriterTimer = null;
    }

    // Hide overlay, show HUD
    document.getElementById('cutsceneOverlay').style.display = 'none';
    DOM.hud.style.display = 'block';

    // Now do the stuff that was previously in startGame after createMap
    createPlayer();
    createWeaponModel();
    createMuzzleFlash();

    // Reset flight HUD
    document.getElementById('flightHud').style.display = 'none';
    document.getElementById('planePrompt').style.display = 'none';

    if (!audioCtx) initAudio();

    // Clean up multiplayer state from previous game
    removePartnerModel();
    stopSyncIntervals();
    partnerAlive = true;
    partnerKills = 0;
    _nextEnemyId = 1;
    if (DOM.partnerHud) DOM.partnerHud.style.display = 'none';
    if (DOM.partnerDownBanner) DOM.partnerDownBanner.style.opacity = '0';

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

    if (isMultiplayer) {
        createPartnerModel(partnerName);
        startPlayerSync();
        if (isHost) startEnemySync();
    }

    nextWave();
    spawnAllies();
}

// ---- BERLIN ENDING CINEMATIC ----
let berlinCinematicActive = false;
let berlinCinematicActors = [];
let berlinCinematicExtras = []; // loose objects: dropped rifle, helmet, blood pools, muzzle flash
let berlinCinematicPhase = 0;
let berlinCinematicTimer = 0;
let berlinCamTarget = { x: 0, y: 0, z: 0 }; // smooth camera target
let berlinCamPos = { x: 0, y: 0, z: 0 };

function _berlinMakeSoldier(colors, hasHelmet, helmetColor) {
    const g = new THREE.Group();
    const tunicMat = new THREE.MeshLambertMaterial({ color: colors.tunic });
    const pantsMat = new THREE.MeshLambertMaterial({ color: colors.pants });
    const skinMat = POOL.skinMat || MAT.enemyHead || new THREE.MeshLambertMaterial({ color: 0xd4a574 });
    const eyeWhiteMat = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
    const eyePupilMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const lipMat = new THREE.MeshLambertMaterial({ color: 0xb07060 });
    const browMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });

    // 0: torso
    const torso = new THREE.Mesh(POOL.enemyTorsoGeo, tunicMat);
    torso.position.y = 1.1; torso.castShadow = true; g.add(torso);
    // 1: collar
    const collar = new THREE.Mesh(POOL.enemyCollarGeo, tunicMat);
    collar.position.y = 1.58; g.add(collar);
    // 2: belt
    const belt = new THREE.Mesh(POOL.enemyBeltGeo, POOL.enemyBeltMat);
    belt.position.y = 0.72; g.add(belt);
    // 3: head (group with face details)
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.8;
    const headMesh = new THREE.Mesh(POOL.enemyHeadGeo, skinMat);
    headGroup.add(headMesh);

    // -- FACE DETAILS --
    // Eyes (white + pupil + iris)
    for (const side of [-1, 1]) {
        // Eye socket slight indent
        const eyeWhite = new THREE.Mesh(
            new THREE.SphereGeometry(0.045, 8, 6),
            eyeWhiteMat
        );
        eyeWhite.position.set(side * 0.09, 0.04, -0.18);
        eyeWhite.scale.z = 0.5;
        headGroup.add(eyeWhite);

        // Iris (brown/blue)
        const irisMat = new THREE.MeshLambertMaterial({
            color: Math.random() > 0.5 ? 0x4a6a8a : 0x5a4a2a
        });
        const iris = new THREE.Mesh(
            new THREE.SphereGeometry(0.028, 8, 6),
            irisMat
        );
        iris.position.set(side * 0.09, 0.04, -0.2);
        iris.scale.z = 0.4;
        headGroup.add(iris);

        // Pupil
        const pupil = new THREE.Mesh(
            new THREE.SphereGeometry(0.015, 6, 6),
            eyePupilMat
        );
        pupil.position.set(side * 0.09, 0.04, -0.21);
        pupil.scale.z = 0.3;
        headGroup.add(pupil);

        // Eyebrow
        const brow = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.015, 0.02),
            browMat
        );
        brow.position.set(side * 0.09, 0.08, -0.17);
        headGroup.add(brow);

        // Eyelid (upper)
        const lid = new THREE.Mesh(
            new THREE.BoxGeometry(0.09, 0.01, 0.03),
            skinMat
        );
        lid.position.set(side * 0.09, 0.065, -0.18);
        headGroup.add(lid);
    }

    // Nose
    const noseGeo = new THREE.ConeGeometry(0.025, 0.07, 4);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, 0.01, -0.22);
    nose.rotation.x = -Math.PI / 2;
    headGroup.add(nose);
    // Nose bridge
    const noseBridge = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.05, 0.02),
        skinMat
    );
    noseBridge.position.set(0, 0.04, -0.19);
    headGroup.add(noseBridge);
    // Nostrils
    for (const side of [-1, 1]) {
        const nostril = new THREE.Mesh(
            new THREE.SphereGeometry(0.012, 4, 4),
            new THREE.MeshLambertMaterial({ color: 0x8a6050 })
        );
        nostril.position.set(side * 0.015, -0.02, -0.22);
        headGroup.add(nostril);
    }

    // Mouth
    const mouthGeo = new THREE.BoxGeometry(0.06, 0.012, 0.015);
    const mouth = new THREE.Mesh(mouthGeo, lipMat);
    mouth.position.set(0, -0.06, -0.19);
    headGroup.add(mouth);
    // Lower lip
    const lowerLip = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.008, 0.012),
        lipMat
    );
    lowerLip.position.set(0, -0.072, -0.185);
    headGroup.add(lowerLip);
    // Chin
    const chin = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 6, 6),
        skinMat
    );
    chin.position.set(0, -0.1, -0.16);
    chin.scale.set(1, 0.6, 0.7);
    headGroup.add(chin);

    // Ears
    for (const side of [-1, 1]) {
        const earGeo = new THREE.SphereGeometry(0.04, 6, 6);
        const ear = new THREE.Mesh(earGeo, skinMat);
        ear.position.set(side * 0.19, 0.0, -0.05);
        ear.scale.set(0.4, 0.7, 0.5);
        headGroup.add(ear);
        // Inner ear
        const innerEar = new THREE.Mesh(
            new THREE.SphereGeometry(0.02, 4, 4),
            new THREE.MeshLambertMaterial({ color: 0xc09080 })
        );
        innerEar.position.set(side * 0.19, 0.0, -0.06);
        innerEar.scale.set(0.3, 0.5, 0.3);
        headGroup.add(innerEar);
    }

    // Jaw line (makes face less round)
    const jaw = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.04, 0.15),
        skinMat
    );
    jaw.position.set(0, -0.06, -0.08);
    headGroup.add(jaw);

    // Cheekbones
    for (const side of [-1, 1]) {
        const cheek = new THREE.Mesh(
            new THREE.SphereGeometry(0.03, 5, 5),
            skinMat
        );
        cheek.position.set(side * 0.12, -0.01, -0.15);
        cheek.scale.set(1, 0.6, 0.6);
        headGroup.add(cheek);
    }

    g.add(headGroup);

    // 4: helmet
    if (hasHelmet) {
        const hMat = new THREE.MeshLambertMaterial({ color: helmetColor || 0x3a3a30 });
        const helmet = new THREE.Mesh(POOL.enemyHelmetGeo, hMat);
        helmet.position.y = 1.85; g.add(helmet);
    } else {
        const dummy = new THREE.Object3D(); g.add(dummy);
    }
    // 5,6: legs
    for (const sx of [-0.15, 0.15]) {
        const leg = new THREE.Mesh(POOL.enemyLegGeo, pantsMat);
        leg.position.set(sx, 0.35, 0); g.add(leg);
    }
    // 7,8: boots
    for (const sx of [-0.15, 0.15]) {
        const boot = new THREE.Mesh(POOL.enemyBootGeo, POOL.enemyBootMat);
        boot.position.set(sx, 0.05, 0.02); g.add(boot);
    }
    // 9: left arm + hand
    const armLGroup = new THREE.Group();
    armLGroup.position.set(-0.4, 1.1, 0);
    const armLMesh = new THREE.Mesh(POOL.enemyArmGeo, tunicMat);
    armLGroup.add(armLMesh);
    // Left hand
    const handL = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.04, 0.08),
        skinMat
    );
    handL.position.set(0, -0.28, 0);
    armLGroup.add(handL);
    // Fingers (3 simple boxes)
    for (let fi = 0; fi < 4; fi++) {
        const finger = new THREE.Mesh(
            new THREE.BoxGeometry(0.012, 0.03, 0.012),
            skinMat
        );
        finger.position.set(-0.02 + fi * 0.013, -0.31, 0);
        armLGroup.add(finger);
    }
    g.add(armLGroup);

    // 10: right arm + hand
    const armRGroup = new THREE.Group();
    armRGroup.position.set(0.4, 1.1, 0);
    const armRMesh = new THREE.Mesh(POOL.enemyArmGeo, tunicMat);
    armRGroup.add(armRMesh);
    // Right hand
    const handR = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.04, 0.08),
        skinMat
    );
    handR.position.set(0, -0.28, 0);
    armRGroup.add(handR);
    for (let fi = 0; fi < 4; fi++) {
        const finger = new THREE.Mesh(
            new THREE.BoxGeometry(0.012, 0.03, 0.012),
            skinMat
        );
        finger.position.set(-0.02 + fi * 0.013, -0.31, 0);
        armRGroup.add(finger);
    }
    g.add(armRGroup);

    return g;
}

function startBerlinEndCinematic() {
    berlinCinematicActive = true;
    berlinCinematicPhase = 0;
    berlinCinematicTimer = 0;
    berlinCinematicActors = [];
    berlinCinematicExtras = [];

    // Stop normal game
    gameRunning = false;
    playerFlying = false;
    playerInTank = false;
    playerTank = null;
    clearAllTimeouts();
    stopSyncIntervals();
    if (!IS_TOUCH) document.exitPointerLock();

    // Hide all game UI
    DOM.hud.style.display = 'none';
    DOM.gameOver.style.display = 'none';
    document.getElementById('flightHud').style.display = 'none';
    document.getElementById('planePrompt').style.display = 'none';
    document.getElementById('tankHud').style.display = 'none';
    document.getElementById('tankScope').style.display = 'none';
    document.getElementById('tankCrosshair').style.display = 'none';
    document.getElementById('tankPrompt').style.display = 'none';
    if (DOM.partnerHud) DOM.partnerHud.style.display = 'none';
    if (IS_TOUCH) document.getElementById('touchControls').style.display = 'none';

    // Show overlay
    document.getElementById('berlinEndOverlay').style.display = 'block';
    document.getElementById('berlinAnnouncement').classList.remove('visible');
    document.getElementById('berlinHurra').classList.remove('visible');
    document.getElementById('berlinFadeBlack').classList.remove('active');
    document.getElementById('berlinFinalTitle').classList.remove('visible');
    document.getElementById('berlinFinalBtn').style.display = 'none';

    const theme = MAP_THEMES.berlin;
    const spawnZ = theme.playerSpawn.z;
    const sceneZ = spawnZ - 15; // center of action

    // ===== GERMAN SOLDIER (wounded, no weapon, clutching side) — green uniform =====
    const germanGroup = _berlinMakeSoldier(
        { tunic: 0x4a5a2a, pants: 0x3a4a1a }, true, 0x3a3a30
    );
    germanGroup.position.set(8, 0, sceneZ + 12);
    germanGroup.rotation.y = Math.PI;
    // Wounded posture: torso leaning, left arm across stomach (clutching wound)
    germanGroup.children[0].rotation.x = 0.2;  // torso hunched
    germanGroup.children[9].rotation.x = -0.6;  // left arm across body
    germanGroup.children[9].rotation.z = 0.5;
    germanGroup.children[10].rotation.x = 0.15; // right arm hanging limp
    germanGroup.children[10].rotation.z = -0.1;
    scene.add(germanGroup);

    // Dropped rifle on the ground behind him (he already dropped it)
    const droppedRifle = new THREE.Mesh(POOL.enemyGunGeo, MAT.darkMetal);
    droppedRifle.position.set(9.5, 0.05, sceneZ + 18);
    droppedRifle.rotation.x = -Math.PI / 2;
    droppedRifle.rotation.z = 0.3;
    scene.add(droppedRifle);
    berlinCinematicExtras.push(droppedRifle);

    berlinCinematicActors.push({
        group: germanGroup, type: 'german', state: 'stumbling',
        speed: 1.2, timer: 0, dead: false,
        stumbleTimer: 3 + Math.random(), // will stumble and fall to knees
        hasStumbled: false, gotUp: false, gotUpTimer: 0,
    });

    // ===== RUSSIAN SOLDIER (approaching from ahead, weapon raised) — blue uniform =====
    const russianGroup = _berlinMakeSoldier(
        { tunic: 0x1a3a8b, pants: 0x102a5c }, true, 0x3a4a5a
    );
    // Gun in hands
    const rGun = new THREE.Mesh(POOL.enemyGunGeo, MAT.darkMetal);
    rGun.position.set(0.15, 0.88, -0.4);
    rGun.rotation.x = -0.1;
    russianGroup.add(rGun); // child 11
    // Right arm raised holding gun
    russianGroup.children[10].rotation.x = -0.4;
    russianGroup.children[10].position.z = -0.1;

    russianGroup.position.set(8, 0, sceneZ - 18);
    russianGroup.rotation.y = 0; // faces positive z (toward german)
    russianGroup.visible = false; // hidden at start, appears when german stumbles
    scene.add(russianGroup);

    berlinCinematicActors.push({
        group: russianGroup, type: 'russian', state: 'hidden',
        timer: 0, dead: false, hasFired: false, hasApproached: false,
    });

    // ===== CIVILIANS + SOLDIERS (celebration crowd) =====
    const crowdColors = [
        { tunic: 0x1a3a8b, pants: 0x102a5c, soldier: true },  // russian soldier (blue)
        { tunic: 0x1a3a8b, pants: 0x102a5c, soldier: true },  // russian soldier (blue)
        { tunic: 0x2050a0, pants: 0x18406b, soldier: true },  // russian soldier (blue)
        { tunic: 0x6a5a4a, pants: 0x4a3a2a, soldier: false }, // civilian brown coat
        { tunic: 0x5a5a5a, pants: 0x3a3a3a, soldier: false }, // civilian grey
        { tunic: 0x7a6050, pants: 0x4a3a2a, soldier: false }, // civilian tan
        { tunic: 0x4a4a5a, pants: 0x2a2a3a, soldier: false }, // civilian dark
        { tunic: 0x8a7060, pants: 0x5a4a3a, soldier: false }, // civilian warm
        { tunic: 0x6a5040, pants: 0x3a2a1a, soldier: false }, // civilian
        { tunic: 0x1a3a8b, pants: 0x102a5c, soldier: true },  // russian soldier (blue)
        { tunic: 0x7a6a5a, pants: 0x4a4a3a, soldier: false }, // civilian
        { tunic: 0x555555, pants: 0x333333, soldier: false },  // civilian dark coat
        { tunic: 0x182870, pants: 0x0e1e4a, soldier: true },  // russian soldier (blue)
        { tunic: 0x8a7a6a, pants: 0x5a5a4a, soldier: false }, // civilian
    ];
    const crowdSpawns = [];
    for (let i = 0; i < crowdColors.length; i++) {
        const angle = (i / crowdColors.length) * Math.PI * 2;
        const dist = 12 + Math.random() * 18;
        crowdSpawns.push({
            x: 8 + Math.sin(angle) * dist + (Math.random() - 0.5) * 6,
            z: sceneZ - 20 + Math.cos(angle) * dist * 0.5 + (Math.random() - 0.5) * 8,
        });
    }

    for (let i = 0; i < crowdColors.length; i++) {
        const cc = crowdColors[i];
        const cg = _berlinMakeSoldier(
            { tunic: cc.tunic, pants: cc.pants },
            cc.soldier, cc.soldier ? 0x3a4a5a : 0
        );
        cg.position.set(crowdSpawns[i].x, 0, crowdSpawns[i].z);
        cg.visible = false;
        scene.add(cg);

        // Decide behavior: jumping, kneeling/crying, waving arms, hugging
        const behaviors = ['jumping', 'jumping', 'jumping', 'kneeling', 'waving', 'jumping', 'waving', 'kneeling'];
        berlinCinematicActors.push({
            group: cg, type: 'crowd', state: 'hidden',
            behavior: behaviors[i % behaviors.length],
            isSoldier: cc.soldier,
            timer: 0,
            jumpPhase: Math.random() * Math.PI * 2,
            jumpSpeed: 2.5 + Math.random() * 2,
            spawnDelay: 0.15 * i, // staggered appearance
            targetX: 8 + (Math.random() - 0.5) * 15,
            targetZ: sceneZ - 18 + (Math.random() - 0.5) * 10,
            runSpeed: 3 + Math.random() * 2,
        });
    }

    // ===== MUZZLE FLASH LIGHT (reusable) =====
    const flashLight = new THREE.PointLight(0xffaa44, 0, 15);
    flashLight.position.set(0, 1, 0);
    scene.add(flashLight);
    berlinCinematicExtras.push(flashLight);

    // Initial camera — behind german, low angle, watching him stumble away
    berlinCamPos = { x: 8, y: 2.5, z: sceneZ + 18 };
    berlinCamTarget = { x: 8, y: 1.2, z: sceneZ + 10 };
    camera.position.set(berlinCamPos.x, berlinCamPos.y, berlinCamPos.z);
    camera.lookAt(berlinCamTarget.x, berlinCamTarget.y, berlinCamTarget.z);
}

function _berlinLerpCam(dt, tx, ty, tz, lx, ly, lz, speed) {
    const s = 1 - Math.pow(0.001, dt * (speed || 1.5));
    berlinCamPos.x += (tx - berlinCamPos.x) * s;
    berlinCamPos.y += (ty - berlinCamPos.y) * s;
    berlinCamPos.z += (tz - berlinCamPos.z) * s;
    berlinCamTarget.x += (lx - berlinCamTarget.x) * s;
    berlinCamTarget.y += (ly - berlinCamTarget.y) * s;
    berlinCamTarget.z += (lz - berlinCamTarget.z) * s;
    camera.position.set(berlinCamPos.x, berlinCamPos.y, berlinCamPos.z);
    camera.lookAt(berlinCamTarget.x, berlinCamTarget.y, berlinCamTarget.z);
}

function _berlinPlayGunshot() {
    if (!audioCtx) return;
    try {
        // Layered gunshot: sharp crack + low boom
        const t = audioCtx.currentTime;
        // Crack
        const n1 = audioCtx.createBufferSource();
        const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.15, audioCtx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) {
            d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.02));
        }
        n1.buffer = buf;
        const g1 = audioCtx.createGain();
        g1.gain.setValueAtTime(0.5, t);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        const hp = audioCtx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 800;
        n1.connect(hp); hp.connect(g1); g1.connect(audioCtx.destination);
        n1.start(t);
        // Low boom
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, t);
        osc.frequency.exponentialRampToValueAtTime(20, t + 0.4);
        const g2 = audioCtx.createGain();
        g2.gain.setValueAtTime(0.4, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(g2); g2.connect(audioCtx.destination);
        osc.start(t); osc.stop(t + 0.4);
        // Echo
        const delay = audioCtx.createDelay();
        delay.delayTime.value = 0.25;
        const g3 = audioCtx.createGain();
        g3.gain.value = 0.15;
        g1.connect(delay); delay.connect(g3); g3.connect(audioCtx.destination);
    } catch (_) {}
}

function updateBerlinCinematic(dt) {
    if (!berlinCinematicActive) return;
    berlinCinematicTimer += dt;

    const german = berlinCinematicActors.find(a => a.type === 'german');
    const russian = berlinCinematicActors.find(a => a.type === 'russian');
    const crowd = berlinCinematicActors.filter(a => a.type === 'crowd');
    const theme = MAP_THEMES.berlin;
    const sceneZ = theme.playerSpawn.z - 15;
    const flashLight = berlinCinematicExtras.find(e => e.isLight);

    // ====== PHASE 0: German stumbles through ruins alone ======
    if (berlinCinematicPhase === 0) {
        const g = german.group;
        const phase = berlinCinematicTimer * 2.8;

        // Limping walk — uneven gait, body rocking
        g.position.z -= german.speed * dt;
        // Asymmetric limp: one leg drags
        g.children[5].rotation.x = Math.sin(phase) * 0.25;
        g.children[6].rotation.x = Math.sin(phase + Math.PI) * 0.12; // injured leg barely moves
        g.children[7].rotation.x = g.children[5].rotation.x * 0.3;
        g.children[8].rotation.x = g.children[6].rotation.x * 0.3;
        // Body rocks side to side, hunched
        g.rotation.z = Math.sin(phase * 0.5) * 0.06;
        g.children[0].rotation.x = 0.22 + Math.sin(phase * 0.4) * 0.04;
        // Head droops
        g.children[3].rotation.x = 0.15;
        // Left arm clutching wound (stays across body)
        g.children[9].rotation.x = -0.7 + Math.sin(phase * 0.3) * 0.05;
        g.children[9].rotation.z = 0.5;
        // Right arm limp, swinging slightly
        g.children[10].rotation.x = Math.sin(phase) * 0.08;

        // Camera: starts behind, slowly orbits to the side
        const camAngle = Math.min(berlinCinematicTimer * 0.08, 0.45);
        const camDist = 8;
        _berlinLerpCam(dt,
            g.position.x + Math.sin(camAngle) * camDist, 2.8, g.position.z + Math.cos(camAngle) * 4,
            g.position.x, 1.3, g.position.z - 1,
            2.0
        );

        // After stumbleTimer — german stumbles, falls to knees
        german.timer += dt;
        if (!german.hasStumbled && german.timer > german.stumbleTimer) {
            german.hasStumbled = true;
            german.state = 'onKnees';
            german.gotUpTimer = 0;
            german.speed = 0;
        }

        if (german.state === 'onKnees') {
            german.gotUpTimer += dt;
            // Knees buckling — legs bend, body drops
            const kneelT = Math.min(german.gotUpTimer / 0.6, 1);
            const eased = 1 - Math.pow(1 - kneelT, 3);
            g.position.y = -eased * 0.6;
            g.children[5].rotation.x = -eased * 1.2;
            g.children[6].rotation.x = -eased * 1.2;
            g.children[0].rotation.x = 0.22 + eased * 0.15;
            g.children[3].rotation.x = 0.15 + eased * 0.2; // head drops more

            // After 2s on knees, struggle back up
            if (german.gotUpTimer > 2.0 && !german.gotUp) {
                german.gotUp = true;
                german.gotUpTimer = 0;
                german.state = 'gettingUp';
            }
        }

        if (german.state === 'gettingUp') {
            german.gotUpTimer += dt;
            const upT = Math.min(german.gotUpTimer / 1.2, 1);
            const eased = upT * upT;
            g.position.y = -0.6 * (1 - eased);
            g.children[5].rotation.x = -1.2 * (1 - eased);
            g.children[6].rotation.x = -1.2 * (1 - eased);
            g.children[0].rotation.x = 0.37 - eased * 0.12;
            g.children[3].rotation.x = 0.35 - eased * 0.15;

            if (upT >= 1) {
                german.state = 'stumbling';
                german.speed = 0.8; // even slower now
                // Russian appears in the distance
                russian.group.visible = true;
                russian.state = 'approaching';
            }
        }

        // Check if german is close enough for phase 1
        if (russian.state === 'approaching') {
            // Russian walks toward german
            const rg = russian.group;
            const dirZ = g.position.z - rg.position.z;
            const dist = Math.abs(dirZ);
            if (dist > 5) {
                rg.position.z += Math.sign(dirZ) * 4 * dt;
                // Walking animation
                const rPhase = berlinCinematicTimer * 5;
                rg.children[5].rotation.x = Math.sin(rPhase) * 0.3;
                rg.children[6].rotation.x = Math.sin(rPhase + Math.PI) * 0.3;
                rg.children[9].rotation.x = Math.sin(rPhase + Math.PI) * 0.15;
                // Aim gun forward
                rg.children[10].rotation.x = -0.5;
            } else {
                // Stop, aim
                rg.children[5].rotation.x = 0;
                rg.children[6].rotation.x = 0;
                rg.children[10].rotation.x = -0.7; // arm raised to aim
                russian.state = 'aiming';
                berlinCinematicPhase = 1;
                berlinCinematicTimer = 0;
            }

            // Camera: wide side shot showing both
            const midZ = (g.position.z + rg.position.z) / 2;
            _berlinLerpCam(dt,
                g.position.x + 14, 3.5, midZ,
                (g.position.x + rg.position.x) / 2, 1.2, midZ,
                1.2
            );
        }
    }

    // ====== PHASE 1: Confrontation — Russian shoots German ======
    if (berlinCinematicPhase === 1) {
        const g = german.group;
        const rg = russian.group;
        const midZ = (g.position.z + rg.position.z) / 2;

        // German stops, half-turns to see the Russian (slow realization)
        if (!german.dead) {
            const turnT = Math.min(berlinCinematicTimer / 1.5, 0.3);
            g.rotation.y = Math.PI - turnT * Math.PI * 0.4; // partial turn

            // Camera: close-up side angle on both
            _berlinLerpCam(dt,
                g.position.x + 10, 2.5, midZ + 2,
                midZ > 0 ? g.position.x : rg.position.x, 1.4, midZ,
                2.0
            );
        }

        // Fire at 1.5s
        if (berlinCinematicTimer > 1.5 && !russian.hasFired) {
            russian.hasFired = true;
            german.dead = true;
            german.state = 'shot';
            german.timer = 0;

            _berlinPlayGunshot();

            // Muzzle flash
            if (flashLight) {
                flashLight.position.copy(rg.position);
                flashLight.position.y = 1;
                flashLight.position.z += 0.5;
                flashLight.intensity = 6;
            }
            // Russian recoil
            rg.children[10].rotation.x = -0.3;

            // Blood spray particles
            const gp = g.position;
            for (let i = 0; i < 8; i++) {
                const bloodGeo = new THREE.SphereGeometry(0.04 + Math.random() * 0.04, 4, 4);
                const bloodMat = new THREE.MeshBasicMaterial({ color: 0x880000 });
                const bloodMesh = new THREE.Mesh(bloodGeo, bloodMat);
                bloodMesh.position.set(gp.x, 1.2 + Math.random() * 0.3, gp.z);
                scene.add(bloodMesh);
                berlinCinematicExtras.push(bloodMesh);
                bloodMesh.userData.vel = {
                    x: (Math.random() - 0.5) * 3,
                    y: Math.random() * 2 + 1,
                    z: (Math.random() - 0.5) * 3,
                };
                bloodMesh.userData.isBloodParticle = true;
                bloodMesh.userData.life = 1.5;
            }
        }

        // Fade muzzle flash
        if (flashLight && flashLight.intensity > 0) {
            flashLight.intensity = Math.max(0, flashLight.intensity - dt * 20);
        }

        // Blood particles physics
        for (const ex of berlinCinematicExtras) {
            if (ex.userData && ex.userData.isBloodParticle) {
                ex.userData.life -= dt;
                if (ex.userData.life > 0) {
                    ex.position.x += ex.userData.vel.x * dt;
                    ex.position.y += ex.userData.vel.y * dt;
                    ex.position.z += ex.userData.vel.z * dt;
                    ex.userData.vel.y -= 9.8 * dt;
                    if (ex.position.y < 0.02) {
                        ex.position.y = 0.02;
                        ex.userData.vel.x *= 0.3;
                        ex.userData.vel.z *= 0.3;
                        ex.userData.vel.y = 0;
                    }
                } else {
                    ex.visible = false;
                }
            }
        }

        // German death animation — hit reaction then crumple
        if (german.dead) {
            german.timer += dt;
            const t = german.timer;

            if (t < 0.3) {
                // Impact — jerks backward
                const impactT = t / 0.3;
                g.children[0].rotation.x = 0.2 - impactT * 0.4;
                g.children[3].rotation.x = 0.15 - impactT * 0.3;
            } else if (t < 1.5) {
                // Crumples forward and sideways
                const fallT = (t - 0.3) / 1.2;
                const eased = 1 - Math.pow(1 - fallT, 2);
                g.rotation.x = eased * 0.3;
                g.rotation.z = eased * 0.7; // falls to the side
                g.position.y = -eased * 0.9;
                // Legs give out
                g.children[5].rotation.x = -eased * 0.8;
                g.children[6].rotation.x = -eased * 1.0;
                // Arms go limp
                g.children[9].rotation.x = -eased * 0.5;
                g.children[9].rotation.z = eased * 0.8;
                g.children[10].rotation.x = eased * 0.3;
                // Head slumps
                g.children[3].rotation.x = eased * 0.5;
                g.children[3].rotation.z = eased * 0.3;

                // Helmet falls off at t=0.6
                if (t > 0.6 && g.children[4] && g.children[4].visible !== false && g.children[4].isMesh) {
                    // Detach helmet — create loose one
                    g.children[4].visible = false;
                    const looseHelmet = new THREE.Mesh(POOL.enemyHelmetGeo, MAT.helmet);
                    looseHelmet.position.set(g.position.x + 0.3, 0.5, g.position.z - 0.2);
                    scene.add(looseHelmet);
                    berlinCinematicExtras.push(looseHelmet);
                    looseHelmet.userData.isHelmet = true;
                    looseHelmet.userData.vel = { x: 0.8, y: 1.5, z: -1.2 };
                    looseHelmet.userData.rot = { x: 3, y: 2, z: 1 };
                }

                // Camera: drops low, close to the falling body
                _berlinLerpCam(dt,
                    g.position.x + 5, 1.5, g.position.z + 3,
                    g.position.x, 0.5, g.position.z,
                    1.5
                );
            } else if (t < 3.5) {
                // Lying still — camera holds, moment of silence
                _berlinLerpCam(dt,
                    g.position.x + 4, 1.8, g.position.z + 2,
                    g.position.x, 0.3, g.position.z,
                    0.8
                );
            }

            // Helmet physics
            for (const ex of berlinCinematicExtras) {
                if (ex.userData && ex.userData.isHelmet) {
                    ex.position.x += ex.userData.vel.x * dt;
                    ex.position.y += ex.userData.vel.y * dt;
                    ex.position.z += ex.userData.vel.z * dt;
                    ex.userData.vel.y -= 9.8 * dt;
                    ex.rotation.x += ex.userData.rot.x * dt;
                    ex.rotation.z += ex.userData.rot.z * dt;
                    if (ex.position.y < 0.08) {
                        ex.position.y = 0.08;
                        ex.userData.vel.y = -ex.userData.vel.y * 0.25;
                        ex.userData.vel.x *= 0.5;
                        ex.userData.vel.z *= 0.5;
                        ex.userData.rot.x *= 0.5;
                        ex.userData.rot.z *= 0.5;
                        if (Math.abs(ex.userData.vel.y) < 0.1) ex.userData.vel.y = 0;
                    }
                }
            }

            // Blood pool grows under body
            if (t > 0.8 && !german.bloodPoolCreated) {
                german.bloodPoolCreated = true;
                const poolGeo = new THREE.CircleGeometry(0.1, 8);
                const poolMat = new THREE.MeshStandardMaterial({
                    color: 0x550000, roughness: 0.95, transparent: true, opacity: 0.8, depthWrite: false
                });
                const pool = new THREE.Mesh(poolGeo, poolMat);
                pool.rotation.x = -Math.PI / 2;
                pool.position.set(g.position.x, 0.02, g.position.z);
                scene.add(pool);
                berlinCinematicExtras.push(pool);
                pool.userData.isBloodPool = true;
                pool.userData.growTarget = 1.5;
            }

            // Grow blood pool
            for (const ex of berlinCinematicExtras) {
                if (ex.userData && ex.userData.isBloodPool) {
                    if (ex.scale.x < ex.userData.growTarget) {
                        ex.scale.setScalar(Math.min(ex.userData.growTarget, ex.scale.x + dt * 0.3));
                    }
                }
            }

            // Russian lowers weapon, stands over body
            if (t > 2.0 && !russian.hasApproached) {
                russian.hasApproached = true;
                russian.state = 'standing';
                // Lower arm
                rg.children[10].rotation.x = -0.1;
            }

            if (t > 3.5) {
                berlinCinematicPhase = 2;
                berlinCinematicTimer = 0;
            }
        }
    }

    // ====== PHASE 2: Silence, then loudspeaker ======
    if (berlinCinematicPhase === 2) {
        const rg = russian.group;

        // Russian looks up (hearing the loudspeaker)
        if (berlinCinematicTimer > 1.0) {
            rg.children[3].rotation.x = -0.15; // head tilts up
        }

        // Camera slowly rises, pulling back
        _berlinLerpCam(dt,
            rg.position.x + 18, 8, sceneZ - 5,
            rg.position.x, 2, sceneZ - 10,
            0.7
        );

        // Loudspeaker announcement at 1.5s
        if (berlinCinematicTimer > 1.5 && berlinCinematicTimer < 1.7) {
            document.getElementById('berlinAnnouncement').classList.add('visible');
        }

        if (berlinCinematicTimer > 4.0) {
            berlinCinematicPhase = 3;
            berlinCinematicTimer = 0;
        }
    }

    // ====== PHASE 3: Crowd appears — staggered, running in, celebrating ======
    if (berlinCinematicPhase === 3) {
        // Spawn crowd with staggered delays
        for (const c of crowd) {
            if (c.state === 'hidden' && berlinCinematicTimer > c.spawnDelay) {
                c.group.visible = true;
                c.state = 'running';
                c.timer = 0;
            }
        }

        // Animate crowd
        for (const c of crowd) {
            if (c.state === 'running') {
                c.timer += dt;
                const g = c.group;
                // Run toward center
                const dx = c.targetX - g.position.x;
                const dz = c.targetZ - g.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist > 1.5) {
                    g.position.x += (dx / dist) * c.runSpeed * dt;
                    g.position.z += (dz / dist) * c.runSpeed * dt;
                    g.rotation.y = Math.atan2(dx, dz);
                    // Run animation
                    const rp = c.timer * 8;
                    g.children[5].rotation.x = Math.sin(rp) * 0.5;
                    g.children[6].rotation.x = Math.sin(rp + Math.PI) * 0.5;
                    g.children[9].rotation.x = Math.sin(rp + Math.PI) * 0.3;
                    g.children[10].rotation.x = Math.sin(rp) * 0.3;
                } else {
                    c.state = 'celebrating';
                    c.timer = 0;
                }
            }
            if (c.state === 'celebrating') {
                c.timer += dt;
                const g = c.group;
                const jp = c.jumpPhase + c.timer * c.jumpSpeed;

                if (c.behavior === 'jumping') {
                    g.position.y = Math.abs(Math.sin(jp)) * 0.8;
                    // Arms up
                    g.children[9].rotation.x = -2.5 + Math.sin(jp * 1.3) * 0.3;
                    g.children[10].rotation.x = -2.5 + Math.sin(jp * 1.3 + 1) * 0.3;
                    g.children[9].rotation.z = -0.3;
                    g.children[10].rotation.z = 0.3;
                    // Slight turn
                    g.rotation.y += Math.sin(jp * 0.4) * dt * 0.5;
                } else if (c.behavior === 'kneeling') {
                    // On knees, head down, hands covering face (crying with relief)
                    const kT = Math.min(c.timer / 0.8, 1);
                    g.position.y = -kT * 0.6;
                    g.children[5].rotation.x = -kT * 1.2;
                    g.children[6].rotation.x = -kT * 1.2;
                    g.children[0].rotation.x = kT * 0.25;
                    g.children[3].rotation.x = kT * 0.3;
                    g.children[9].rotation.x = -kT * 1.0;
                    g.children[9].rotation.z = kT * 0.3;
                    g.children[10].rotation.x = -kT * 1.0;
                    g.children[10].rotation.z = -kT * 0.3;
                    // Subtle shaking (sobbing)
                    g.children[0].rotation.z = Math.sin(c.timer * 8) * 0.02;
                } else if (c.behavior === 'waving') {
                    // One arm waving high, other at side
                    g.children[10].rotation.x = -2.8 + Math.sin(jp * 3) * 0.4;
                    g.children[10].rotation.z = 0.2;
                    g.children[9].rotation.x = 0;
                    g.position.y = Math.abs(Math.sin(jp * 0.8)) * 0.3;
                    g.rotation.y += dt * 0.3;
                }
            }
        }

        // HURRA text
        if (berlinCinematicTimer > 1.5 && berlinCinematicTimer < 1.7) {
            document.getElementById('berlinHurra').classList.add('visible');
        }

        // Russian soldier also celebrates — raises fist
        const rg = russian.group;
        if (berlinCinematicTimer > 1.0) {
            rg.children[9].rotation.x = -2.5 + Math.sin(berlinCinematicTimer * 3) * 0.3;
            rg.children[9].rotation.z = -0.3;
        }

        // Camera: wide cinematic pull-back showing everyone
        _berlinLerpCam(dt,
            8 + Math.sin(berlinCinematicTimer * 0.15) * 5, 14, sceneZ - 30,
            8, 1.5, sceneZ - 10,
            0.6
        );

        if (berlinCinematicTimer > 8.0) {
            berlinCinematicPhase = 4;
            berlinCinematicTimer = 0;

            document.getElementById('berlinAnnouncement').classList.remove('visible');
            document.getElementById('berlinHurra').classList.remove('visible');
            document.getElementById('berlinFadeBlack').classList.add('active');
        }
    }

    // ====== PHASE 4: Slow fade to black ======
    if (berlinCinematicPhase === 4) {
        // Keep crowd animating during fade
        for (const c of crowd) {
            if (c.state === 'celebrating') {
                c.timer += dt;
                const g = c.group;
                const jp = c.jumpPhase + c.timer * c.jumpSpeed;
                if (c.behavior === 'jumping') {
                    g.position.y = Math.abs(Math.sin(jp)) * 0.8;
                } else if (c.behavior === 'kneeling') {
                    g.children[0].rotation.z = Math.sin(c.timer * 8) * 0.02;
                }
            }
        }

        if (berlinCinematicTimer > 4.0) {
            berlinCinematicPhase = 5;
            berlinCinematicTimer = 0;
            document.getElementById('berlinFinalTitle').classList.add('visible');
        }
    }

    // ====== PHASE 5: Title card ======
    if (berlinCinematicPhase === 5) {
        if (berlinCinematicTimer > 3.0) {
            document.getElementById('berlinFinalBtn').style.display = 'block';
        }
    }
}

function endBerlinCinematic() {
    berlinCinematicActive = false;

    for (const actor of berlinCinematicActors) {
        scene.remove(actor.group);
    }
    for (const ex of berlinCinematicExtras) {
        scene.remove(ex);
    }
    berlinCinematicActors = [];
    berlinCinematicExtras = [];

    document.getElementById('berlinEndOverlay').style.display = 'none';
    DOM.titleScreen.style.display = 'flex';
}

function startGame() {
    clearAllTimeouts();

    DOM.titleScreen.style.display = 'none';
    DOM.hud.style.display = 'none';
    DOM.gameOver.style.display = 'none';
    DOM.winScreen.style.display = 'none';

    for (const e of enemies) { scene.remove(e.group); e.group.clear(); }
    for (const a of allies) disposeAllyGroup(a);
    for (const b of bullets) { scene.remove(b.mesh); b.mesh.geometry.dispose(); }
    for (const p of particles) { p.mesh.visible = false; }
    for (const c of shellCasings) { c.mesh.visible = false; }
    for (const g of grenades) { scene.remove(g.mesh); }
    for (const r of rockets) { scene.remove(r.mesh); }
    for (const p of aeroplanes) { scene.remove(p.group); p.propMat.dispose(); }
    for (const b of bombs) { scene.remove(b.mesh); }
    // Clean up all corpses and blood pools
    for (const c of corpses) {
        if (c.type === 'body') { scene.remove(c.data.group); c.data.group.clear(); }
        else if (c.type === 'bloodpool') { scene.remove(c.data.mesh); c.data.mesh.geometry.dispose(); c.data.mesh.material.dispose(); }
    }
    corpses.length = 0;
    for (const t of enemyTanks) { scene.remove(t.group); t.group.clear(); }
    for (const t of allyTanks) { scene.remove(t.group); t.group.clear(); }
    if (playerPlane) { scene.remove(playerPlane.group); playerPlane.group.clear(); if (playerPlane.propMat) playerPlane.propMat.dispose(); playerPlane = null; }
    if (groundedPlane) { scene.remove(groundedPlane.group); groundedPlane.group.clear(); groundedPlane = null; }
    playerFlying = false;
    planeRespawnTimer = 0;
    enemies = [];
    allies = [];
    bullets = [];
    particles = [];
    shellCasings = [];
    grenades = [];
    rockets = [];
    aeroplanes = [];
    bombs = [];
    enemyTanks = [];
    allyTanks = [];
    grenadeInventory = 3;
    score = 0;
    kills = 0;
    wave = 0;
    waveActive = false;
    _compassHtmlCached = false;

    // Build map for selected theme (clears previous map objects)
    createMap(selectedMap);

    // Start cutscene flyover — endCutscene() will create player and begin gameplay
    startCutscene();
}

function gameWin() {
    gameRunning = false;
    playerFlying = false;
    playerInTank = false;
    playerTank = null;
    clearAllTimeouts();
    stopSyncIntervals();
    if (!IS_TOUCH) document.exitPointerLock();
    DOM.hud.style.display = 'none';
    DOM.winScreen.style.display = 'flex';
    document.getElementById('flightHud').style.display = 'none';
    document.getElementById('planePrompt').style.display = 'none';
    document.getElementById('tankHud').style.display = 'none';
    document.getElementById('tankScope').style.display = 'none';
    document.getElementById('tankCrosshair').style.display = 'none';
    document.getElementById('tankPrompt').style.display = 'none';
    DOM.winScore.textContent = score;
    DOM.winKills.textContent = kills;
    if (DOM.partnerHud) DOM.partnerHud.style.display = 'none';

    // Campaign progression
    const newUnlock = Math.max(unlockedLevel, currentLevelIndex + 2);
    if (newUnlock > unlockedLevel) {
        unlockedLevel = Math.min(newUnlock, CAMPAIGN_ORDER.length);
        localStorage.setItem('unlockedLevel', unlockedLevel);
    }
    refreshCampaignUI();

    // Show/hide NEXT MISSION vs CAMPAIGN COMPLETE
    const nextMissionBtn = document.getElementById('nextMissionBtn');
    const campaignComplete = document.getElementById('campaignComplete');
    const winTitle = document.getElementById('winTitle');
    const isFinalLevel = currentLevelIndex >= CAMPAIGN_ORDER.length - 1;
    if (isFinalLevel) {
        nextMissionBtn.style.display = 'none';
        campaignComplete.style.display = 'block';
        winTitle.textContent = 'VICTORY!';
    } else {
        nextMissionBtn.style.display = 'block';
        campaignComplete.style.display = 'none';
        winTitle.textContent = 'YOU WIN!';
    }
    touchMoveX = 0; touchMoveY = 0;
    touchShootDown = false; touchSprint = false;
    if (IS_TOUCH) {
        document.getElementById('touchControls').style.display = 'none';
    }
    if (isMultiplayer) {
        removePartnerModel();
    }
}

function gameOver() {
    // Berlin final level: trigger special ending cinematic instead of normal game over
    const isFinalLevel = currentLevelIndex >= CAMPAIGN_ORDER.length - 1;
    if (isFinalLevel && selectedMap === 'berlin' && !berlinCinematicActive) {
        startBerlinEndCinematic();
        return;
    }

    gameRunning = false;
    playerFlying = false;
    clearAllTimeouts();
    stopSyncIntervals();
    if (!IS_TOUCH) document.exitPointerLock();
    DOM.hud.style.display = 'none';
    DOM.gameOver.style.display = 'flex';
    document.getElementById('flightHud').style.display = 'none';
    document.getElementById('planePrompt').style.display = 'none';
    document.getElementById('tankHud').style.display = 'none';
    document.getElementById('tankScope').style.display = 'none';
    document.getElementById('tankCrosshair').style.display = 'none';
    document.getElementById('tankPrompt').style.display = 'none';
    playerInTank = false;
    playerTank = null;
    DOM.finalScore.textContent = score;
    DOM.finalWave.textContent = wave;
    DOM.finalKills.textContent = kills;
    if (DOM.partnerHud) DOM.partnerHud.style.display = 'none';
    // Reset touch state
    touchMoveX = 0; touchMoveY = 0;
    touchShootDown = false; touchSprint = false;
    if (IS_TOUCH) {
        document.getElementById('touchControls').style.display = 'none';
    }
    // Reset multiplayer state for next game
    if (isMultiplayer) {
        removePartnerModel();
    }
}

// ---- RENDER LOOP ----
function gameLoop() {
    requestAnimationFrame(gameLoop);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (cutsceneActive) {
        updateCutsceneCamera();
    } else if (berlinCinematicActive) {
        updateBerlinCinematic(dt);
    } else if (gameRunning) {
        update(dt);
    }
    renderer.render(scene, camera);
}

// ---- SINGLE FIRE HANDLER ----
function onMouseClick(e) {
    if (e.button !== 0 || (!pointerLocked && !IS_TOUCH) || !gameRunning || !player || !player.alive) return;
    const w = player.weapons[player.weaponIndex];
    if (!w.auto) shoot();
}

// ---- CAMPAIGN UI ----
function refreshCampaignUI() {
    const mapCards = document.querySelectorAll('.map-card');
    mapCards.forEach(card => {
        const mapKey = card.dataset.map;
        const idx = CAMPAIGN_ORDER.indexOf(mapKey);
        const levelNum = idx + 1;
        // Add or update level badge
        let badge = card.querySelector('.map-card-level');
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'map-card-level';
            card.insertBefore(badge, card.firstChild);
        }
        if (idx === CAMPAIGN_ORDER.length - 1) {
            badge.textContent = 'LEVEL ' + levelNum + ' — FINAL';
        } else {
            badge.textContent = 'LEVEL ' + levelNum;
        }
        // Lock/unlock
        if (levelNum <= unlockedLevel) {
            card.classList.remove('locked');
        } else {
            card.classList.add('locked');
        }
    });
}

// ---- INIT ----
function init() {
    cacheDom();

    // --- Name input & deploy gate (attach BEFORE heavy 3D init) ---
    const soldierNameInput = document.getElementById('soldierName');
    const startBtn = document.getElementById('startBtn');
    const randomNameBtn = document.getElementById('randomNameBtn');

    const ranks = ['Pvt.', 'Cpl.', 'Sgt.', 'Lt.', 'Cpt.', 'Maj.'];
    const callsigns = [
        'Wolf', 'Hawk', 'Viper', 'Ghost', 'Reaper', 'Falcon',
        'Bravo', 'Thunder', 'Iron', 'Shadow', 'Blaze', 'Storm',
        'Bullet', 'Tank', 'Eagle', 'Cobra', 'Raven', 'Fox'
    ];
    const surnames = [
        'Miller', 'Johnson', 'Davis', 'Clark', 'Baker',
        'Harris', 'Walker', 'Mitchell', 'Cooper', 'Ross',
        'Hayes', 'Sullivan', 'Morgan', 'Reed', 'Price'
    ];

    function randomMilitaryName() {
        const rank = ranks[Math.floor(Math.random() * ranks.length)];
        if (Math.random() < 0.5) {
            const cs = callsigns[Math.floor(Math.random() * callsigns.length)];
            return `${rank} "${cs}"`;
        }
        const sn = surnames[Math.floor(Math.random() * surnames.length)];
        return `${rank} ${sn}`;
    }

    // --- Map select + Multiplayer menu elements ---
    const mapSelect = document.getElementById('mapSelect');
    const mapCards = document.querySelectorAll('.map-card');
    const mpMenu = document.getElementById('mpMenu');
    const mpLobby = document.getElementById('mpLobby');
    const hostBtn = document.getElementById('hostBtn');
    const joinBtn = document.getElementById('joinBtn');
    const soloBtn = document.getElementById('soloBtn');
    const lobbyTitle = document.getElementById('lobbyTitle');
    const roomCodeDisplay = document.getElementById('roomCodeDisplay');
    const lobbyWaiting = document.getElementById('lobbyWaiting');
    const lobbyPartner = document.getElementById('lobbyPartner');
    const joinInput = document.getElementById('joinInput');
    const joinConfirmBtn = document.getElementById('joinConfirmBtn');
    const joinError = document.getElementById('joinError');
    const lobbyStartBtn = document.getElementById('lobbyStartBtn');
    const lobbyBackBtn = document.getElementById('lobbyBackBtn');

    function showMapSelect() {
        mapSelect.style.display = 'flex';
        mpMenu.style.display = 'none';
        mpLobby.style.display = 'none';
        startBtn.style.display = 'none';
    }

    function showMpMenu() {
        mpMenu.style.display = 'flex';
        mpLobby.style.display = 'none';
        startBtn.style.display = 'none';
    }

    function hideMpMenu() {
        mapSelect.style.display = 'none';
        mpMenu.style.display = 'none';
        mpLobby.style.display = 'none';
    }

    // Map card click handlers
    mapCards.forEach(card => {
        card.addEventListener('click', () => {
            mapCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedMap = card.dataset.map;
            currentLevelIndex = CAMPAIGN_ORDER.indexOf(selectedMap);
            showMpMenu();
        });
    });

    // Apply campaign lock state on load
    refreshCampaignUI();

    function showLobby(mode) {
        mpMenu.style.display = 'none';
        mpLobby.style.display = 'flex';
        joinError.textContent = '';
        lobbyPartner.textContent = '';
        lobbyStartBtn.style.display = 'none';
        if (mode === 'host') {
            lobbyTitle.textContent = 'HOSTING GAME';
            lobbyWaiting.style.display = 'block';
            lobbyWaiting.textContent = 'WAITING FOR PARTNER...';
            joinInput.style.display = 'none';
            joinConfirmBtn.style.display = 'none';
        } else {
            lobbyTitle.textContent = 'JOIN GAME';
            roomCodeDisplay.textContent = '';
            lobbyWaiting.style.display = 'none';
            joinInput.style.display = 'block';
            joinConfirmBtn.style.display = 'block';
            joinInput.value = '';
            joinInput.focus();
        }
    }

    function connectSocket() {
        if (socket) return true;
        try {
            socket = io();
        } catch (e) {
            // socket.io not available (direct file open)
            joinError.textContent = 'Server not available. Run npm start.';
            return false;
        }
        return true;
    }

    soldierNameInput.addEventListener('input', () => {
        const hasName = soldierNameInput.value.trim().length > 0;
        startBtn.disabled = !hasName;
        if (hasName) {
            showMapSelect();
        } else {
            hideMpMenu();
        }
    });

    function doRandomName(e) {
        if (e) e.preventDefault();
        soldierNameInput.value = randomMilitaryName();
        soldierNameInput.dispatchEvent(new Event('input'));
        startBtn.disabled = false;
        showMapSelect();
    }
    randomNameBtn.addEventListener('click', doRandomName);
    randomNameBtn.addEventListener('touchend', doRandomName);

    // SOLO button - play without server
    soloBtn.addEventListener('click', () => {
        isMultiplayer = false;
        isHost = false;
        socket = null;
        hideMpMenu();
        startGame();
    });

    // HOST button
    hostBtn.addEventListener('click', () => {
        if (!connectSocket()) return;
        isMultiplayer = true;
        isHost = true;
        const myName = soldierNameInput.value.trim();
        showLobby('host');

        socket.emit('createRoom', myName);

        socket.on('roomCreated', (code) => {
            roomCode = code;
            roomCodeDisplay.textContent = code;
        });

        socket.on('partnerJoined', (name) => {
            partnerName = name;
            lobbyWaiting.style.display = 'none';
            lobbyPartner.textContent = `${name} JOINED`;
            lobbyStartBtn.style.display = 'block';
        });

        socket.on('gameStarted', (data) => {
            partnerName = data.joinerName;
            hideMpMenu();
            setupSocketListeners();
            startGame();
        });
    });

    // JOIN button
    joinBtn.addEventListener('click', () => {
        if (!connectSocket()) return;
        isMultiplayer = true;
        isHost = false;
        showLobby('join');

        socket.on('joinedRoom', (data) => {
            roomCode = data.code;
            partnerName = data.hostName;
            roomCodeDisplay.textContent = data.code;
            joinInput.style.display = 'none';
            joinConfirmBtn.style.display = 'none';
            lobbyWaiting.style.display = 'block';
            lobbyWaiting.textContent = 'WAITING FOR HOST TO START...';
            lobbyPartner.textContent = `HOST: ${data.hostName}`;
        });

        socket.on('joinError', (msg) => {
            joinError.textContent = msg;
        });

        socket.on('gameStarted', (data) => {
            partnerName = data.hostName;
            hideMpMenu();
            setupSocketListeners();
            startGame();
        });
    });

    joinConfirmBtn.addEventListener('click', () => {
        const code = joinInput.value.trim();
        if (code.length !== 4) {
            joinError.textContent = 'Enter a 4-digit code';
            return;
        }
        joinError.textContent = '';
        const myName = soldierNameInput.value.trim();
        socket.emit('joinRoom', { code, playerName: myName });
    });

    joinInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') joinConfirmBtn.click();
    });

    lobbyStartBtn.addEventListener('click', () => {
        if (socket && isHost) {
            socket.emit('startGame');
        }
    });

    lobbyBackBtn.addEventListener('click', () => {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        isMultiplayer = false;
        isHost = false;
        roomCode = null;
        showMpMenu(); // back to SOLO/HOST/JOIN
    });

    // Old deploy button now acts as solo
    addListener(startBtn, 'click', () => {
        isMultiplayer = false;
        startGame();
    });
    // Cutscene skip via click/touch
    addListener(document.getElementById('cutsceneOverlay'), 'click', () => {
        if (cutsceneActive) endCutscene();
    });

    // Berlin ending cinematic — back to lobby button
    addListener(document.getElementById('berlinFinalBtn'), 'click', () => {
        endBerlinCinematic();
    });

    addListener(document.getElementById('restartBtn'), 'click', () => {
        // On restart, reset multiplayer
        isMultiplayer = false;
        isHost = false;
        if (socket) { socket.disconnect(); socket = null; }
        startGame();
    });
    addListener(document.getElementById('nextMissionBtn'), 'click', () => {
        DOM.winScreen.style.display = 'none';
        isMultiplayer = false;
        isHost = false;
        if (socket) { socket.disconnect(); socket = null; }
        currentLevelIndex = Math.min(currentLevelIndex + 1, CAMPAIGN_ORDER.length - 1);
        selectedMap = CAMPAIGN_ORDER[currentLevelIndex];
        startGame();
    });
    addListener(document.getElementById('lobbyBtn'), 'click', () => {
        DOM.winScreen.style.display = 'none';
        isMultiplayer = false;
        isHost = false;
        if (socket) { socket.disconnect(); socket = null; }
        DOM.titleScreen.style.display = 'flex';
    });

    // --- Heavy 3D initialization (after UI listeners are attached) ---
    initThree();
    createMaterials();
    createPools();
    createLighting();
    setupInput();

    addListener(document, 'click', onMouseClick);

    scene.add(camera);
    gameLoop();
}

init();
