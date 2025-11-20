/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: import('electron').IpcRenderer & {
    openFile: () => any
    saveFileAs: (defaultPath: string | null, content: string) => any
    saveFile: (filePath: string, content: string) => any
    showSettings: () => void
    exportChart: (
      uscContent: string,
      levelDataContent: any,
      defaultName: string,
    ) => Promise<{
      success: boolean
      filePath?: string
      error?: string
      canceled?: boolean
    }>
  }
}
