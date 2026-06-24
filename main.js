import { plastic_rng } from "./data.js";

const roll_result = document.getElementById("roll_result");
const roll_button = document.getElementById("roll_button");
const money_total = document.getElementById("money_total");
const splash = document.getElementById("splash");
const sprite = document.getElementById("sprite");
const item_name = document.getElementById("item_name");
const item_rarity = document.getElementById("item_rarity");
const item_value = document.getElementById("item_value");

let money = 0;
let rolling = false;

function roll() {
    if (rolling) return;

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

        rolling = false;
        roll_button.disabled = false;
    }, 1500);
}

function getWeightedPlastic() {
    const totalWeight = plastic_rng.reduce((sum, item) => sum + item.weight, 0);
    let pick = Math.random() * totalWeight;

    for (const item of plastic_rng) {
        pick -= item.weight;
        if (pick <= 0) return item;
    }

    return plastic_rng[plastic_rng.length - 1];
}

window.roll = roll;
