import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { menuData, titleBarHeight, trafficLightsSize } from '../shared'
import fs from 'fs/promises'
import electronUpdater, { type AppUpdater } from 'electron-updater'

function getAutoUpdater(): AppUpdater {
  const { autoUpdater } = electronUpdater
  return autoUpdater
}

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

    win?.webContents.send('update-options', options)
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  win.on('close', () => (settingsWindow = null))

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

let settingsWindow: BrowserWindow | null

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'icon/icon_512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: {
      x: 10,
      y: 10,
    },
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    vibrancy: 'fullscreen-ui',
    visualEffectState: 'active',
    parent: win!,
    title: 'Settings',
    width: 500,
    height: 350,
    minWidth: 250,
    minHeight: 200,
    acceptFirstMouse: true,
  })

  settingsWindow.webContents.on('did-finish-load', () => {
    // win?.webContents.send('main-process-message', new Date().toLocaleString())
    settingsWindow?.webContents.send('main-process-message', {
      platform: process.platform,
    })

    settingsWindow?.webContents.send('update-options', options)
  })

  settingsWindow.on('close', () => (settingsWindow = null))

  if (VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(VITE_DEV_SERVER_URL + '/settings.html')
  } else {
    // win.loadFile('dist/index.html')
    settingsWindow.loadFile(path.join(RENDERER_DIST, 'settings.html'))
  }

  settingsWindow.webContents.ipc.on('set-options', (_, newOptions: any) => {
    for (const [k, v] of Object.entries(newOptions)) {
      if (k in options) {
        ;(options as any)[k] = v
      }
    }

    win?.webContents.send('update-options', options)
    settingsWindow?.webContents.send('update-options', options)
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
  // win!.webContents.send('command', 'hi')

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

ipcMain.handle('show-open-dialog', async () => {
  const result = await dialog.showOpenDialog(win!, {
    properties: ['openFile'],
    filters: [{ name: 'Sekai Plus Editor Files', extensions: ['pjsk', 'usc'] }],
  })

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0]
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return { filePath, content }
    } catch (error) {
      console.error('Failed to read file:', error)
      dialog.showErrorBox('Error', 'Could not read file.')
      return null
    }
  }
  return null
})

ipcMain.handle('show-save-dialog', async (_, defaultPath, content) => {
  const result = await dialog.showSaveDialog(win!, {
    defaultPath: defaultPath || 'Untitled.pjsk',
    filters: [{ name: 'Sekai Plus Editor Files', extensions: ['pjsk', 'usc'] }],
  })

  if (!result.canceled && result.filePath) {
    try {
      await fs.writeFile(result.filePath, content, 'utf-8')
      return result.filePath
    } catch (error) {
      console.error('Failed to save file:', error)
      dialog.showErrorBox('Error', 'Could not save file.')
      return null
    }
  }
  return null
})

ipcMain.handle('save-file', async (_, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8')
    return filePath
  } catch (error) {
    console.error('Failed to save file directly:', error)
    dialog.showErrorBox('Error', 'Could not save file.')
    return null
  }
})

let options = {
  accentColor: 'purple',
  hideTickOutlines: false,
  hideTickOutlinesOnPlay: true,
  laneWidth: 55,
}

ipcMain.handle('show-settings', () => {
  createSettingsWindow()
})

app.on('ready', () => {
  getAutoUpdater().checkForUpdatesAndNotify()
})
