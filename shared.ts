export const trafficLightsSize = {
  w: 54,
  h: 14,
}

export const titleBarHeight = 36

export const menuData = [
  {
    label: 'File',
    submenu: [
      { label: 'New File', accelerator: 'CmdOrCtrl+N' },
      { label: 'Open File', accelerator: 'CmdOrCtrl+O' },
      { type: 'separator' },
      { label: 'Save', accelerator: 'CmdOrCtrl+S' },
      { label: 'Save As', accelerator: 'CmdOrCtrl+Shift+S' },
      { label: 'Export', accelerator: 'CmdOrCtrl+E' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'delete', accelerator: 'Backspace' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { type: 'separator' },
      { label: 'Select All', accelerator: 'CmdOrCtrl+A' },
      { type: 'separator' },
      { label: 'Settings', accelerator: 'CmdOrCtrl+,' },
    ],
  },
]
