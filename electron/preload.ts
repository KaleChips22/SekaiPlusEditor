import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
  removeAllListeners(
    ...args: Parameters<typeof ipcRenderer.removeAllListeners>
  ) {
    const [channel, ...omit] = args
    return ipcRenderer.removeAllListeners(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...

  openFile: () => ipcRenderer.invoke('show-open-dialog'),
  saveFileAs: (defaultPath: string, content: string) =>
    ipcRenderer.invoke('show-save-dialog', defaultPath, content),
  saveFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('save-file', filePath, content),
  showSettings: () => ipcRenderer.invoke('show-settings'),
  exportChart: (
    uscContent: string,
    levelDataContent: any,
    susContent: string,
    canExportSus: boolean,
    defaultName: string,
  ) =>
    ipcRenderer.invoke(
      'export-chart',
      uscContent,
      levelDataContent,
      susContent,
      canExportSus,
      defaultName,
    ),
})
