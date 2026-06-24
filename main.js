import { plastic_rng } from "./data.js";

const roll_result = document.getElementById("roll_result");
const roll_button = document.getElementById("roll_button");
const money_total = document.getElementById("money_total");
const splash = document.getElementById("splash");
const sprite = document.getElementById("sprite");
const item_name = document.getElementById("item_name");
const item_rarity = document.getElementById("item_rarity");
const item_value = document.getElementById("item_value");
const roll_sound = document.getElementById("roll_sound");
const rarity_sound = document.getElementById("rarity_sound");
const tax_sound = document.getElementById("tax_sound");
const robot_sound = document.getElementById("robot_sound");
const robot_boost = document.getElementById("robot_boost");
const boost_status = document.getElementById("boost_status");
const tutorial_popup = document.getElementById("tutorial_popup");
const tutorial_close = document.getElementById("tutorial_close");
const settings_popup = document.getElementById("settings_popup");
const settings_open = document.getElementById("settings_open");
const settings_close = document.getElementById("settings_close");
const mute_toggle = document.getElementById("mute_toggle");
const reset_account = document.getElementById("reset_account");
const ocean_stage = document.querySelector(".ocean-stage");
const wallet = document.querySelector(".wallet");
const tax_payer = document.getElementById("tax_payer");
const tax_hits = document.getElementById("tax_hits");

const MONEY_STORAGE_KEY = "plastic_tide_money";
const MUTE_STORAGE_KEY = "plastic_tide_muted";
const EVENT_SPAWN_MS = 300000;
const ROBOT_DESPAWN_MS = 15000;
const ROBOT_BOOST_DURATION_MS = 15000;
const ROBOT_BOOST_POWER = 10;
const FRENZY_BOOST_POWER = 10;
const ROBOT_FLEE_RADIUS = 120;
const ROBOT_FLEE_STEP = 34;
const TAX_HITS_REQUIRED = 4;
const TAX_TRAVEL_MS = 12000;
const FRENZY_WEIGHTS = {
    Common: 3,
    Uncommon: 7,
    Rare: 24,
    Epic: 51,
    Legendary: 11
};
const RARITY_VOLUMES = {
    Common: 0.2,
    Uncommon: 0.38,
    Rare: 0.58,
    Epic: 0.78,
    Legendary: 1
};

let money = loadMoney();
let muted = loadMuted();
let robotBoost = 0;
let rolling = false;
let robotDespawnTimer = null;
let boostEndTime = 0;
let boostTimer = null;
let boostCountdownTimer = null;
let taxHitsLeft = TAX_HITS_REQUIRED;
let taxAnimationFrame = null;
let taxActive = false;

money_total.textContent = `$${money}`;
updateBoostStatus();
updateMuteButton();
robot_boost.addEventListener("click", activateRobotBoost);
ocean_stage.addEventListener("mousemove", moveRobotAwayFromCursor);
tutorial_close.addEventListener("click", closeTutorial);
settings_open.addEventListener("click", openSettings);
settings_close.addEventListener("click", closeSettings);
mute_toggle.addEventListener("click", toggleMute);
reset_account.addEventListener("click", resetAccount);
tax_payer.addEventListener("click", hitTaxPayer);
window.setInterval(spawnTimedEvent, EVENT_SPAWN_MS);

function roll() {
    if (rolling) return;

    stopRaritySound();
    playRollSound();
    rolling = true;
    roll_button.disabled = true;
    roll_result.className = "result rolling";
    roll_result.textContent = "Scanning the current...";
    splash.textContent = "+$0";
    sprite.className = "plastic-sprite mystery";
    item_name.textContent = "Ocean Drift";
    item_name.className = "";
    item_rarity.textContent = "Rolling...";
    item_rarity.className = "";
    item_value.textContent = "1.5s";

    window.setTimeout(() => {
        const plastic = getWeightedPlastic();
        money += plastic.value;

        roll_result.className = `result ${plastic.rarity.toLowerCase()}`;
        roll_result.textContent = `${plastic.rarity} plastic found`;
        splash.textContent = `+$${plastic.value}`;
        sprite.className = `plastic-sprite ${plastic.sprite} reveal`;
        item_name.textContent = plastic.name;
        item_name.className = plastic.rarity.toLowerCase();
        item_rarity.textContent = plastic.rarity;
        item_rarity.className = plastic.rarity.toLowerCase();
        item_value.textContent = `$${plastic.value}`;
        money_total.textContent = `$${money}`;
        saveMoney();
        playRaritySound(plastic.rarity);

        rolling = false;
        roll_button.disabled = false;
    }, 1500);
}

function loadMoney() {
    const savedMoney = Number(window.localStorage.getItem(MONEY_STORAGE_KEY));
    return Number.isFinite(savedMoney) && savedMoney >= 0 ? savedMoney : 0;
}

function saveMoney() {
    window.localStorage.setItem(MONEY_STORAGE_KEY, String(money));
}

function loadMuted() {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === "true";
}

function saveMuted() {
    window.localStorage.setItem(MUTE_STORAGE_KEY, String(muted));
}

function spawnTimedEvent() {
    if (Math.random() < 0.5) {
        spawnRobot();
        return;
    }

    spawnTaxPayer();
}

function spawnRobot() {
    placeRobotRandomly();
    robot_boost.classList.add("active");
    window.clearTimeout(robotDespawnTimer);
    robotDespawnTimer = window.setTimeout(hideRobot, ROBOT_DESPAWN_MS);
}

function hideRobot() {
    robot_boost.classList.remove("active");
}

function spawnTaxPayer() {
    if (taxActive) return;

    taxActive = true;
    taxHitsLeft = TAX_HITS_REQUIRED;
    tax_hits.textContent = String(taxHitsLeft);
    tax_payer.classList.add("active");

    if (!muted && tax_sound) {
        tax_sound.currentTime = 0;
        tax_sound.play().catch(() => {});
    }

    const startX = Math.random() * Math.max(0, window.innerWidth - tax_payer.offsetWidth);
    const startY = window.innerHeight + 24;
    const walletBounds = wallet.getBoundingClientRect();
    const endX = walletBounds.left + walletBounds.width / 2 - tax_payer.offsetWidth / 2;
    const endY = walletBounds.top + walletBounds.height / 2 - tax_payer.offsetHeight / 2;
    const startTime = performance.now();

    window.cancelAnimationFrame(taxAnimationFrame);
    moveTaxPayer(startTime, startX, startY, endX, endY);
}

function moveTaxPayer(startTime, startX, startY, endX, endY) {
    taxAnimationFrame = window.requestAnimationFrame((now) => {
        if (!taxActive) return;

        const progress = Math.min(1, (now - startTime) / TAX_TRAVEL_MS);
        const easedProgress = progress * progress * (3 - 2 * progress);
        const currentX = startX + (endX - startX) * easedProgress;
        const currentY = startY + (endY - startY) * easedProgress;

        tax_payer.style.left = `${currentX}px`;
        tax_payer.style.top = `${currentY}px`;

        if (progress >= 1) {
            stealMoney();
            return;
        }

        moveTaxPayer(startTime, startX, startY, endX, endY);
    });
}

function hitTaxPayer() {
    if (!taxActive) return;

    taxHitsLeft -= 1;
    tax_hits.textContent = String(Math.max(0, taxHitsLeft));
    tax_payer.classList.remove("hit");
    void tax_payer.offsetWidth;
    tax_payer.classList.add("hit");

    if (taxHitsLeft <= 0) {
        stopTaxPayer("Tax payer stopped");
    }
}

function stealMoney() {
    const stolenMoney = Math.min(money, Math.max(8, Math.ceil(money * (0.12 + Math.random() * 0.18))));
    money -= stolenMoney;
    money_total.textContent = `$${money}`;
    saveMoney();
    stopTaxPayer(`Tax payer stole $${stolenMoney}`);
}

function stopTaxPayer(message) {
    taxActive = false;
    window.cancelAnimationFrame(taxAnimationFrame);
    tax_payer.classList.remove("active", "hit");

    if (tax_sound) {
        tax_sound.pause();
        tax_sound.currentTime = 0;
    }

    roll_result.className = message.includes("stole") ? "result epic" : "result uncommon";
    roll_result.textContent = message;
}

function activateRobotBoost() {
    if (!robot_boost.classList.contains("active")) return;

    startTimedBoost(ROBOT_BOOST_POWER);
    hideRobot();
    roll_result.className = "result rare";
    roll_result.textContent = "Robot boost active";
}

function startTimedBoost(power) {
    robotBoost = power;
    boostEndTime = Date.now() + ROBOT_BOOST_DURATION_MS;
    document.body.classList.add("frenzy-active");

    if (!muted && robot_sound) {
        robot_sound.currentTime = 0;
        robot_sound.play().catch(() => {});
    }

    window.clearTimeout(boostTimer);
    window.clearInterval(boostCountdownTimer);
    boostTimer = window.setTimeout(endTimedBoost, ROBOT_BOOST_DURATION_MS);
    boostCountdownTimer = window.setInterval(updateBoostStatus, 250);
    updateBoostStatus();
}

function endTimedBoost() {
    robotBoost = 0;
    boostEndTime = 0;
    document.body.classList.remove("frenzy-active");

    if (robot_sound) {
        robot_sound.pause();
        robot_sound.currentTime = 0;
    }

    window.clearTimeout(boostTimer);
    window.clearInterval(boostCountdownTimer);
    updateBoostStatus();
}

function robot() {
    spawnRobot();
    roll_result.className = "result legendary";
    roll_result.textContent = "Secret robot summoned";
    return "Secret robot summoned";
}

function tax() {
    spawnTaxPayer();
    roll_result.className = "result epic";
    roll_result.textContent = "Tax payer summoned";
    return "Tax payer summoned";
}

function closeTutorial() {
    tutorial_popup.classList.add("hidden");
}

function openSettings() {
    settings_popup.classList.remove("hidden");
}

function closeSettings() {
    settings_popup.classList.add("hidden");
}

function toggleMute() {
    muted = !muted;
    saveMuted();
    updateMuteButton();
    if (muted) {
        stopRaritySound();
        roll_sound.pause();
        roll_sound.currentTime = 0;

        if (tax_sound) {
            tax_sound.pause();
            tax_sound.currentTime = 0;
        }
        if (robot_sound) {
            robot_sound.pause();
            robot_sound.currentTime = 0;
        }
    }
}

function updateMuteButton() {
    mute_toggle.textContent = muted ? "Unmute game" : "Mute game";
}

function resetAccount() {
    money = 0;
    money_total.textContent = "$0";
    splash.textContent = "+$0";
    roll_result.className = "result";
    roll_result.textContent = "Money reset";
    window.localStorage.removeItem(MONEY_STORAGE_KEY);
    closeSettings();
}

function placeRobotRandomly() {
    const bounds = ocean_stage.getBoundingClientRect();
    const robotWidth = robot_boost.offsetWidth || 96;
    const robotHeight = robot_boost.offsetHeight || 112;
    const maxX = Math.max(0, bounds.width - robotWidth - 18);
    const maxY = Math.max(0, bounds.height - robotHeight - 18);

    robot_boost.style.left = `${18 + Math.random() * maxX}px`;
    robot_boost.style.top = `${18 + Math.random() * maxY}px`;
}

function moveRobotAwayFromCursor(event) {
    if (!robot_boost.classList.contains("active")) return;

    const stageBounds = ocean_stage.getBoundingClientRect();
    const robotBounds = robot_boost.getBoundingClientRect();
    const robotCenterX = robotBounds.left + robotBounds.width / 2;
    const robotCenterY = robotBounds.top + robotBounds.height / 2;
    const deltaX = robotCenterX - event.clientX;
    const deltaY = robotCenterY - event.clientY;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance === 0 || distance > ROBOT_FLEE_RADIUS) return;

    const currentLeft = robotBounds.left - stageBounds.left;
    const currentTop = robotBounds.top - stageBounds.top;
    const push = (ROBOT_FLEE_RADIUS - distance) / ROBOT_FLEE_RADIUS;
    const nextLeft = currentLeft + (deltaX / distance) * ROBOT_FLEE_STEP * push;
    const nextTop = currentTop + (deltaY / distance) * ROBOT_FLEE_STEP * push;

    setRobotPosition(nextLeft, nextTop);
}

function setRobotPosition(left, top) {
    const stageBounds = ocean_stage.getBoundingClientRect();
    const robotWidth = robot_boost.offsetWidth || 96;
    const robotHeight = robot_boost.offsetHeight || 112;
    const maxLeft = Math.max(0, stageBounds.width - robotWidth);
    const maxTop = Math.max(0, stageBounds.height - robotHeight);

    robot_boost.style.left = `${Math.min(Math.max(0, left), maxLeft)}px`;
    robot_boost.style.top = `${Math.min(Math.max(0, top), maxTop)}px`;
}

function updateBoostStatus() {
    if (robotBoost <= 0 || boostEndTime <= Date.now()) {
        boost_status.textContent = "Boost ready";
        return;
    }

    const secondsLeft = Math.ceil((boostEndTime - Date.now()) / 1000);
    boost_status.textContent = `Boost ${secondsLeft}s`;
}

function playRollSound() {
    if (!roll_sound || muted) return;

    roll_sound.currentTime = 0;
    roll_sound.play().catch(() => {});
}

function stopRaritySound() {
    if (!rarity_sound) return;

    rarity_sound.pause();
    rarity_sound.currentTime = 0;
}

function playRaritySound(rarity) {
    if (!rarity_sound || muted) return;

    stopRaritySound();
    rarity_sound.volume = RARITY_VOLUMES[rarity] ?? 0.5;
    rarity_sound.play().catch(() => {});
}

function getWeightedPlastic() {
    if (robotBoost > 0) {
        return getFrenzyPlastic();
    }

    const weightedPlastic = plastic_rng.map((item, index) => {
        const rarityRank = index + 1;
        const boostMultiplier = 1 + (robotBoost * rarityRank * 0.16);
        const commonPenalty = item.rarity === "Common" ? Math.max(0.35, 1 - robotBoost * 0.06) : 1;

        return {
            ...item,
            adjustedWeight: item.weight * boostMultiplier * commonPenalty
        };
    });

    const totalWeight = weightedPlastic.reduce((sum, item) => sum + item.adjustedWeight, 0);
    let pick = Math.random() * totalWeight;

    for (const item of weightedPlastic) {
        pick -= item.adjustedWeight;
        if (pick <= 0) return item;
    }

    return weightedPlastic[weightedPlastic.length - 1];
}

function getFrenzyPlastic() {
    const frenzyPlastic = plastic_rng.map((item) => ({
        ...item,
        adjustedWeight: FRENZY_WEIGHTS[item.rarity] ?? item.weight
    }));
    const totalWeight = frenzyPlastic.reduce((sum, item) => sum + item.adjustedWeight, 0);
    let pick = Math.random() * totalWeight;

    for (const item of frenzyPlastic) {
        pick -= item.adjustedWeight;
        if (pick <= 0) return item;
    }

    return frenzyPlastic[frenzyPlastic.length - 1];
}

window.roll = roll;
window.activateSecretFrenzy = activateSecretFrenzy;
window.tax = tax;