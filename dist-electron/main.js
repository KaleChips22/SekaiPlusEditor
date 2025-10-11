import { app, BrowserWindow, Menu } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
const trafficLightsSize = {
  h: 14
};
const titleBarHeight = 36;
const menuData = [
  {
    label: "File",
    submenu: [
      { label: "New File", accelerator: "CmdOrCtrl+N" },
      { label: "Open File", accelerator: "CmdOrCtrl+O" },
      { type: "separator" },
      { label: "Save", accelerator: "CmdOrCtrl+S" },
      { label: "Save As", accelerator: "CmdOrCtrl+Shift+S" },
      { label: "Export", accelerator: "CmdOrCtrl+E" },
      { type: "separator" },
      { role: "quit" }
    ]
  },
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "delete", accelerator: "Backspace" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { type: "separator" },
      { label: "Select All", accelerator: "CmdOrCtrl+A" },
      { type: "separator" },
      { label: "Settings", accelerator: "CmdOrCtrl+," }
    ]
  }
];
createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  const trafficLightsOffest = (titleBarHeight - trafficLightsSize.h) / 2;
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs")
    },
    frame: false,
    titleBarStyle: "hidden",
    trafficLightPosition: {
      x: trafficLightsOffest,
      y: trafficLightsOffest - 1
    },
    minWidth: 613,
    minHeight: 350,
    title: "Sekai Plus Editor",
    ...process.platform !== "darwin" ? { titleBarOverlay: true } : {}
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", {
      platform: process.platform
    });
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
const menuTemplate = [
  {
    label: "Sekai Plus Editor",
    submenu: [{ role: "about" }]
  },
  ...menuData
];
app.whenReady().then(() => {
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
  app.setAboutPanelOptions({
    applicationName: "Sekai Plus Editor",
    applicationVersion: app.getVersion(),
    version: "1.0.0",
    copyright: "Copyright © 2025 Sekai Plus Editor"
  });
  createWindow();
});
app.setName("Sekai Plus Editor");
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
