let invokeFn = null;
try {
  const { invoke } = window.__TAURI__.core;
  invokeFn = invoke;
} catch (e) {
  console.error(e);
}

const updateFreqMs = 500;

console.dir(await invokeFn("get_system_summary"));

let autoUpdate = true;
let intervalId = null;

const $ = (id) => document.getElementById(id);
$("refreshBtn").addEventListener("click", fetchAndRender);
$("toggleAuto").addEventListener("click", () => {
  autoUpdate = !autoUpdate;
  $("toggleAuto").textContent = `Auto Refresh: ${autoUpdate ? "ON" : "OFF"}`;
  if (autoUpdate) startAuto();
  else stopAuto();
});

function startAuto() {
  stopAuto();
  intervalId = setInterval(fetchAndRender, updateFreqMs);
}
function stopAuto() {
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
}

// 初回
fetchAndRender();
if (autoUpdate) startAuto();

let lastNetworkUpKb = 0;
let lastNetworkDownKb = 0;

async function fetchAndRender() {
  try {
    // Rust 側に実装したコマンド名: get_system_summary
    const info = await invokeFn("get_system_summary");
    render(info);
  } catch (err) {
    console.error(err);
    alert("Cannot get system info - Check your console");
  }
}

function render(info) {
  // CPU
  $("cpu-brand").textContent = info.cpu.details[0]?.brand ?? "—";
  $("cpu-physical").textContent = info.cpu.physical_cores ?? "—";
  $("cpu-logical").textContent = info.cpu.logical_cores ?? "-";

  $("cpu-cache").innerHTML = "";
  info.cpu.caches.forEach((cache) => {
    let size = cache.size_kb;
    if (cache.level <= 2) size *= info.cpu.physical_cores;
    $("cpu-cache").innerHTML += `
    <div class="item">
      <div class="k">L${cache.level} Cache - ${cache.type}</div>
      <div class="v">${size < 1024 ? `${size} KB` : `${size / 1024} MB`}</div>
    </div>`;
  });

  let cpuCount = 0;
  let cpuUsageTotal = 0;
  $("cpu-list").innerHTML = "";
  info.cpu.details.forEach((core) => {
    cpuCount++;
    cpuUsageTotal += core.usage;
    /*$("cpu-list").innerHTML += `
    <div class="item">
      <div class="k">${core.name}</div>
      <div class="v">${core.usage.toFixed(1)}%&emsp;${core.frequency} MHz</div>
    </div>`;*/
  });

  const cpuUsage = (cpuUsageTotal / cpuCount).toFixed(1);
  $("cpu-usage-text").textContent = `${cpuUsage}%`;
  $("cpu-usage-bar").style.width = Math.min(100, cpuUsage) + "%";

  // Memory
  const total = Number(info.memory?.total ?? 0);
  const used = Number(info.memory?.used ?? 0);
  $("mem-total").textContent = humanBytes(total);
  $("mem-used").textContent = humanBytes(used);
  const memPerc = total > 0 ? ((used / total) * 100).toFixed(1) : 0;
  $("mem-usage-text").textContent = `${memPerc}%`;
  $("mem-usage-bar").style.width = memPerc + "%";

  // GPU
  const gpus = info.gpus ?? [];
  const gpuList = $("gpu-list");
  gpuList.innerHTML = "";
  if (gpus.length === 0) {
    gpuList.innerHTML = '<div class="small">Nothing Found</div>';
  } else {
    gpus.forEach((g) => {
      if (g.name == "Microsoft Basic Render Driver") return;
      const el = document.createElement("div");
      el.className = "item";
      const name = document.createElement("div");
      name.className = "k";
      name.textContent = g.name.replace(/NVIDIA GEFORCE|GPU|\(TM\)|\(R\)/gi, "") || "Unknown GPU";
      const val = document.createElement("div");
      val.className = "v";
      val.textContent = g.vram ? `${Math.round(g.vram / 1024 / 1024)} MB` : "—";
      el.appendChild(name);
      el.appendChild(val);
      gpuList.appendChild(el);
    });
  }

  // Disks
  const disks = info.disks ?? [];
  const diskList = $("disk-list");
  diskList.innerHTML = "";
  if (disks.length === 0) diskList.innerHTML = '<div class="small">Nothing Found</div>';
  else {
    disks.forEach((d) => {
      const row = document.createElement("div");
      row.className = "item";
      const left = document.createElement("div");
      left.textContent = d.name || d.mountpoint || "Disk";
      left.className = "k";
      const right = document.createElement("div");
      right.className = "v";
      right.textContent = `${humanBytes(d.total - d.available)} / ${humanBytes(d.total).replace(/.00/, "")}`;
      row.appendChild(left);
      row.appendChild(right);
      diskList.appendChild(row);
    });
  }

  // Network
  const nets = info.networks ?? [];
  const netList = $("net-list");
  netList.innerHTML = "";
  if (nets.length === 0) netList.innerHTML = '<div class="small">No Connection</div>';
  else {
    let n = nets[0];
    const downKb = n.received || n.rx || 0;
    const upKb = n.transmitted || n.tx || 0;
    const downKbDiff = lastNetworkDownKb ? downKb - lastNetworkDownKb : 0;
    const upKbDiff = lastNetworkUpKb ? upKb - lastNetworkUpKb : 0;
    lastNetworkDownKb = downKb;
    lastNetworkUpKb = upKb;

    const mbpsDown = ((downKbDiff / updateFreqMs / 1024) * 8).toFixed(2);
    const mbpsUp = ((upKbDiff / updateFreqMs / 1024) * 8).toFixed(2);

    netList.innerHTML += `
      <div>
        <div class="item">
          <div class="k">Download</div>
          <div class="v">${mbpsDown} Mbps</div>
        </div>
        <div class="item">
          <div class="k">Upload</div>
          <div class="v">${mbpsUp} Mbps</div>
        </div>
      </div>
      <div>
        <div class="item">
          <div class="k">Received</div>
          <div class="v">${humanBytes(downKb)}</div>
        </div>
        <div class="item">
          <div class="k">Sent</div>
          <div class="v">${humanBytes(upKb)}</div>
        </div>
      </div>`;
  }

  // OS
  const { architecture, os_type, bitness, version } = info.os;
  let osBit = 32;
  if (bitness.match(/64/)) osBit = 64;
  let arch = "Unknown";
  if (architecture.match(/x86/i)) arch = osBit == 64 ? "x64" : "x86";
  if (architecture.match(/Arm/i)) arch = osBit == 64 ? "Arm64" : "Arm32";

  const osVerString = version.Semantic.join(".");
  const minorVer = version.Semantic[2];

  const winVer = {
    19042: " 10 20H2",
    19043: " 10 21H1",
    19044: " 10 21H2",
    19045: " 10 22H2",
    22000: " 11 21H2",
    22621: " 11 22H2",
    22631: " 11 23H2",
    26100: " 11 24H2",
    26200: " 11 25H2",
  }[minorVer];

  $("os-info").innerHTML = `
  <div class="item">
    <div class="k">OS</div>
    <div class="v">${os_type == "Windows" ? os_type + winVer : os_type}</div>
  </div>
  <div class="item">
    <div class="k">Build</div>
    <div class="v">${osVerString}</div>
  </div>`;
}

// ヘルパー
function computeAvg(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  const s = arr.reduce((a, b) => a + Number(b || 0), 0);
  return s / arr.length;
}
function humanBytes(kb) {
  if (!kb) return "0 B";
  let bytes = kb;
  if (bytes > 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  if (bytes > 1024) return (bytes / 1024).toFixed(2) + " KB";
  return bytes + " B";
}
