import { app, BrowserWindow, Menu } from 'electron'
// import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { menuData, titleBarHeight, trafficLightsSize } from '../shared'

// const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  const trafficLightsOffest = (titleBarHeight - trafficLightsSize.h) / 2
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'icon/icon_512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: {
      x: trafficLightsOffest - 1,
      y: trafficLightsOffest,
    },
    minWidth: 724,
    minHeight: 350,
    title: 'Sekai Plus Editor',
    // ...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {}),
  })
  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    // win?.webContents.send('main-process-message', new Date().toLocaleString())
    win?.webContents.send('main-process-message', {
      platform: process.platform,
    })
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  win.on('resize', () => {
    const { width, height } = win!.getContentBounds()
    win?.webContents.send('resize', {
      width,
      height,
    })
  })

  win.on('enter-full-screen', () => {
    win?.webContents.send('main-process-message', {
      isFullScreen: true,
    })
  })

  win.on('leave-full-screen', () => {
    win?.webContents.send('main-process-message', {
      isFullScreen: false,
    })
  })

  win.webContents.ipc.on('minimize-window', () => {
    win?.minimize()
  })

  win.webContents.ipc.on('maximize-window', () => {
    win?.isMaximized() ? win?.unmaximize() : win?.maximize()
  })

  win.webContents.ipc.on('close-window', () => {
    win?.close()
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()

  // console.log(win !== null && 'webContents' in win)
  win!.webContents.send('command', 'hi')

  const menuTemplate = [
    {
      label: 'Sekai Plus Editor',
      submenu: [{ role: 'about' }],
    },
    ...menuData.map((i) => ({
      ...i,
      submenu: i.submenu.map((j) => ({
        ...j,
        click:
          'action' in j
            ? () => win?.webContents.send('command', j.action)
            : () => {},
      })),
    })),
  ]

  const menu = Menu.buildFromTemplate(menuTemplate as any)
  Menu.setApplicationMenu(menu)

  app.setAboutPanelOptions({
    applicationName: 'Sekai Plus Editor',
    applicationVersion: app.getVersion(),
    version: app.getVersion(),
    copyright: 'Copyright © 2025 Sekai Plus Editor',
  })
})

app.setName('Sekai Plus Editor')
