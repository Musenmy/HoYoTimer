const { app, BrowserWindow, ipcMain, Tray, Menu } = require("electron");
const path = require("path");
const settings = require("electron-settings");
settings.configure({
  file: "./my-settings.json", // カスタムファイル名
});
let mainWindow;
let tray;

app.on("ready", () => {
  Menu.setApplicationMenu(null);
  if (process.platform === "win32") {
    app.setAppUserModelId("ほよタイマー");
  }

  mainWindow = new BrowserWindow({
    width: 500,
    height: 335,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
    },
    autoHideMenuBar: true,
    show: false,
  });

  mainWindow.loadFile("index.html");
  //mainWindow.show()
  mainWindow.maximize();

  // ウィンドウを閉じる代わりに非表示にする
  mainWindow.on("close", (event) => {
    event.preventDefault(); // デフォルト閉じ動作を無効化
    mainWindow.hide();
  });

  // タスクトレイを作成
  tray = new Tray(path.join(__dirname, "tray-icon.png"));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "ウィンドウを開く",
      click: () => mainWindow.show(),
    },
    {
      label: "アプリを終了",
      click: () => {
        mainWindow.destroy();
        app.quit();
      },
    },
  ]);
  tray.setToolTip("HoYoTimer from Musenmy");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    mainWindow.show();
  });
  ipcMain.on("show-window", () => {
    mainWindow.show();
    mainWindow.focus();
  });
});

// IPCハンドラーを登録
ipcMain.handle("writeStorage", async (event, key, data) => {
  await settings.set(key, data);
  console.log("saved", key, data);
  return true;
});

ipcMain.handle("readStorage", async (event, key) => {
  const data = await settings.get(key);
  console.log("loaded", key, data);
  return data;
});
