import { clearHistory, setChartNotes, setMusicOffset } from './draw'
import { PJSKToNotes } from './PJSK'
import { USCToNotes } from './USC'

let currentFilePath: string | null = null
const updateCurrentFilePath = (s: string | null) => (currentFilePath = s)

export const openFile = () => {
  // const input = document.createElement('input')
  // input.type = 'file'
  // input.accept = '.usc,.json,.pjsk'
  // window.ipcRenderer.send('open-file')
  const loadFile = async () => {
    const result = await window.ipcRenderer.openFile()

    if (result) {
      const json = JSON.parse(result.content)

      if ('usc' in json) {
        updateCurrentFilePath(null)
        const { notes, offset } = USCToNotes(json)

        setMusicOffset(offset)
        setChartNotes(notes)
        clearHistory()
      } else {
        updateCurrentFilePath(result.filePath)
        const { notes, offset } = PJSKToNotes(json)

        // console.log(notes)

        setMusicOffset(offset)
        setChartNotes(notes)
        clearHistory()
      }
    }
  }

  loadFile()
}

export const saveFile = (content: string) => {
  const trySave = async () => {
    if (currentFilePath) {
      await window.ipcRenderer.saveFile(currentFilePath, content)
    } else {
      const savedPath = await window.ipcRenderer.saveFileAs(null, content)
      if (savedPath) updateCurrentFilePath(savedPath)
    }
  }

  trySave()
}

export const saveFileAs = (content: string) => {
  const trySaveAs = async () => {
    const defaultPath = currentFilePath || 'Untitled.pjsk'

    const savedPath = await window.ipcRenderer.saveFileAs(defaultPath, content)
    if (savedPath) updateCurrentFilePath(savedPath)
  }

  trySaveAs()
}

export const newFile = () => {
  if (
    !confirm('Are you sure you want to do this? You may lose unsaved canges.')
  )
    return

  setChartNotes([])
  updateCurrentFilePath(null)
  clearHistory()
}
