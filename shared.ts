export const trafficLightsSize = {
  w: 60,
  h: 14,
}

export const titleBarHeight = 36

export const menuData = [
  {
    label: 'File',
    submenu: [
      { label: 'New File', accelerator: 'CmdOrCtrl+N', action: 'newFile' },
      { label: 'Open File', accelerator: 'CmdOrCtrl+O', action: 'open' },
      { type: 'separator' },
      { label: 'Save', accelerator: 'CmdOrCtrl+S', action: 'save' },
      { label: 'Save As', accelerator: 'CmdOrCtrl+Shift+S', action: 'saveAs' },
      { label: 'Export', accelerator: 'CmdOrCtrl+E', action: 'export' },
      { type: 'separator' },
      { role: 'quit' },
      { role: 'toggleDevTools' },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      {
        label: 'Delete',
        accelerator: 'Backspace',
        action: 'deleteSelected',
      },
      { label: 'Cut', accelerator: 'CmdOrCtrl+X', action: 'cut' },
      { label: 'Copy', accelerator: 'CmdOrCtrl+C', action: 'copy' },
      { label: 'Paste', accelerator: 'CmdOrCtrl+V', action: 'paste' },
      {
        label: 'Flip Paste',
        accelerator: 'CmdOrCtrl+Shift+V',
        action: 'flipPaste',
      },
      { type: 'separator' },
      { label: 'Select All', accelerator: 'CmdOrCtrl+A', action: 'selectAll' },
      { label: 'Flip', accelerator: 'CmdOrCtrl+F', action: 'flipSelection' },
      { type: 'separator' },
      { label: 'Settings', accelerator: 'CmdOrCtrl+,' },
    ],
  },
]
