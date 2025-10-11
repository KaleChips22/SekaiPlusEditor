import { app as o, BrowserWindow as s, Menu as a } from "electron";
import { fileURLToPath as p } from "node:url";
import t from "node:path";
const m = {
  h: 14
}, d = 36, u = [
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
], i = t.dirname(p(import.meta.url));
process.env.APP_ROOT = t.join(i, "..");
const l = process.env.VITE_DEV_SERVER_URL, S = t.join(process.env.APP_ROOT, "dist-electron"), n = t.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = l ? t.join(process.env.APP_ROOT, "public") : n;
let e;
function c() {
  const r = (d - m.h) / 2;
  e = new s({
    icon: t.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: t.join(i, "preload.mjs")
    },
    frame: !1,
    titleBarStyle: "hidden",
    trafficLightPosition: {
      x: r,
      y: r - 1
    },
    minWidth: 724,
    minHeight: 350,
    title: "Sekai Plus Editor"
    // ...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {}),
  }), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", {
      platform: process.platform
    });
  }), l ? e.loadURL(l) : e.loadFile(t.join(n, "index.html")), e.on("enter-full-screen", () => {
    e == null || e.webContents.send("main-process-message", {
      isFullScreen: !0
    });
  }), e.on("leave-full-screen", () => {
    e == null || e.webContents.send("main-process-message", {
      isFullScreen: !1
    });
  }), e.webContents.ipc.on("minimize-window", () => {
    e == null || e.minimize();
  }), e.webContents.ipc.on("maximize-window", () => {
    e != null && e.isMaximized() ? e == null || e.unmaximize() : e == null || e.maximize();
  }), e.webContents.ipc.on("close-window", () => {
    e == null || e.close();
  });
}
o.on("window-all-closed", () => {
  process.platform !== "darwin" && (o.quit(), e = null);
});
o.on("activate", () => {
  s.getAllWindows().length === 0 && c();
});
const f = [
  {
    label: "Sekai Plus Editor",
    submenu: [{ role: "about" }]
  },
  ...u
];
o.whenReady().then(() => {
  const r = a.buildFromTemplate(f);
  a.setApplicationMenu(r), o.setAboutPanelOptions({
    applicationName: "Sekai Plus Editor",
    applicationVersion: o.getVersion(),
    version: "1.0.0",
    copyright: "Copyright © 2025 Sekai Plus Editor"
  }), c();
});
o.setName("Sekai Plus Editor");
export {
  S as MAIN_DIST,
  n as RENDERER_DIST,
  l as VITE_DEV_SERVER_URL
};
