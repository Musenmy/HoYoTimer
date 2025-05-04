const $ = (e) => document.getElementById(e)

const testNotifyBtn = $("testNotifyBtn");

const giStamina = $("gi-stamina");
const giRemainingTime = $("gi-status");
const giMaxTime = $("gi-maxTime");
const hsrStamina = $("hsr-stamina");
const hsrRemainingTime = $("hsr-status");
const hsrMaxTime = $("hsr-maxTime");
const zzzStamina = $("zzz-stamina");
const zzzRemainingTime = $("zzz-status");
const zzzMaxTime = $("zzz-maxTime");

let giInterval, hsrInterval, zzzInterval;

const giNotifyThreshold = $("giNotifyThreshold");
const hsrNotifyThreshold = $("hsrNotifyThreshold");
const zzzNotifyThreshold = $("zzzNotifyThreshold");

window.onload = async () => {
  giNotifyThreshold.value = (await window.electronAPI.readStorage("giNotifyThreshold")) || 0;
  hsrNotifyThreshold.value = (await window.electronAPI.readStorage("hsrNotifyThreshold")) || 0;
  zzzNotifyThreshold.value = (await window.electronAPI.readStorage("zzzNotifyThreshold")) || 0;
};

giNotifyThreshold.addEventListener("input", () => {
  window.electronAPI.writeStorage("giNotifyThreshold", giNotifyThreshold.value);
});
hsrNotifyThreshold.addEventListener("input", () => {
  window.electronAPI.writeStorage("hsrNotifyThreshold", hsrNotifyThreshold.value);
});
zzzNotifyThreshold.addEventListener("input", () => {
  window.electronAPI.writeStorage("zzzNotifyThreshold", zzzNotifyThreshold.value);
});

function formatSec(s) {
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  return `${h}:${m}`;
}
function formatDate(date) {
  const now = new Date();
  const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = (targetDay - currentDay) / (1000 * 60 * 60 * 24);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  if (dayDiff === 0) {
    return `今日 ${hours}:${minutes}`;
  } else if (dayDiff === 1) {
    return `明日 ${hours}:${minutes}`;
  } else {
    return `明後日 ${hours}:${minutes}`;
  }
}

//サンプル通知セクション
testNotifyBtn.addEventListener("click", () => {
  const notification = new Notification("サンプル通知", {
    body: "これは通知のサンプルです",
    silent: false,
  });
  notification.onclick = () => {
    window.electronAPI.showWindow();
  };
});

const GI_ENERGY_TIME = 8 * 60;
const HSR_ENERGY_TIME = 6 * 60;
const ZZZ_ENERGY_TIME = 6 * 60;
let giNotifiable = false;
let hsrNotifiable = false;
let zzzNotifiable = false;
let giMaxDate = Date.now();
let hsrMaxDate = Date.now();
let zzzMaxDate = Date.now();

function updateGiTimer(energyDelta) {
  if (Number(giStamina.innerHTML) < -energyDelta) return;
  giMaxDate -= energyDelta * GI_ENERGY_TIME * 1000;
  if (giMaxDate < Date.now()) giMaxDate = Date.now();
  giMaxTime.innerHTML = formatDate(new Date(giMaxDate));
}
function updateHsrTimer(energyDelta) {
  if (Number(hsrStamina.innerHTML) < -energyDelta) return;
  hsrMaxDate -= energyDelta * HSR_ENERGY_TIME * 1000;
  if (hsrMaxDate < Date.now()) hsrMaxDate = Date.now();
  hsrMaxTime.innerHTML = formatDate(new Date(hsrMaxDate));
}
function updateZzzTimer(energyDelta) {
  if (Number(zzzStamina.innerHTML) < -energyDelta) return;
  zzzMaxDate -= energyDelta * ZZZ_ENERGY_TIME * 1000;
  if (zzzMaxDate < Date.now()) zzzMaxDate = Date.now();
  zzzMaxTime.innerHTML = formatDate(new Date(zzzMaxDate));
}

giInterval = setInterval(() => {
  const now = Date.now();
  const remainingTime = Math.max(0, Math.floor((giMaxDate - now) / 1000));
  let stamina = Math.floor(200 - remainingTime / GI_ENERGY_TIME);
  giStamina.innerHTML = stamina;
  giRemainingTime.textContent = formatSec(remainingTime);
  if (stamina >= giNotifyThreshold.value) {
    if (giNotifiable) {
      const notification = new Notification("原神回復通知", {
        body: `天然樹脂が${stamina}まで回復したよ！`,
        silent: false,
      });
      notification.onclick = () => {
        window.electronAPI.showWindow();
      };
      giNotifiable = false;
    }
  } else {
    giNotifiable = true;
  }
  if (remainingTime == 0) {
    giMaxDate = Date.now();
  }
}, 100);
hsrInterval = setInterval(() => {
  const now = Date.now();
  const remainingTime = Math.max(0, Math.floor((hsrMaxDate - now) / 1000));
  let stamina = Math.floor(300 - remainingTime / HSR_ENERGY_TIME);
  hsrStamina.innerHTML = stamina;
  hsrRemainingTime.textContent = formatSec(remainingTime);
  if (stamina >= hsrNotifyThreshold.value) {
    if (hsrNotifiable) {
      const notification = new Notification("スタレ回復通知", {
        body: `開拓力が${stamina}まで回復したよ！`,
        silent: false,
      });
      notification.onclick = () => {
        window.electronAPI.showWindow();
      };
      hsrNotifiable = false;
    }
  } else {
    hsrNotifiable = true;
  }
  if (remainingTime == 0) {
    hsrMaxDate = Date.now();
  }
}, 100);
zzzInterval = setInterval(() => {
  const now = Date.now();
  const remainingTime = Math.max(0, Math.floor((zzzMaxDate - now) / 1000));
  let stamina = Math.floor(240 - remainingTime / ZZZ_ENERGY_TIME);
  zzzStamina.innerHTML = stamina;
  zzzRemainingTime.textContent = formatSec(remainingTime);
  if (stamina >= zzzNotifyThreshold.value) {
    if (zzzNotifiable) {
      const notification = new Notification(`ゼンゼロ回復通知`, {
        body: `バッテリーが${stamina}まで回復したよ！`,
        silent: false,
      });
      notification.onclick = () => {
        window.electronAPI.showWindow();
      };
      zzzNotifiable = false;
    }
  } else {
    zzzNotifiable = true;
  }
  if (remainingTime == 0) {
    zzzMaxDate = Date.now();
  }
}, 100);
