import {
  clearHistory,
  setChartNotes,
  setIsExtendedChart,
  setMusicOffset,
  setChartMetadata,
  resetChartMetadata,
} from './draw'
import { PJSKToNotes } from './PJSK'
import { USCToNotes } from './USC'
import { susToUSC } from './SUStoUSC'
// import { uscToLevelData } from './USCtoLevelData'

let currentFilePath: string | null = null
const updateCurrentFilePath = (s: string | null) => (currentFilePath = s)

export const openFile = () => {
  // const input = document.createElement('input')
  // input.type = 'file'
  // input.accept = '.usc,.json,.pjsk,.sus'
  // window.ipcRenderer.send('open-file')
  const loadFile = async () => {
    const result = await window.ipcRenderer.openFile()

    if (result) {
      let json = {}
      if (result.filePath.endsWith('.sus'))
        json = { usc: susToUSC(result.content) }
      else json = JSON.parse(result.content)

      if ('usc' in json) {
        // console.log(json)
        updateCurrentFilePath(null)
        const { notes, offset } = USCToNotes(json as any)

        notes.push({
          beat: 0,
          type: 'TimeSignature',
          bottom: 4,
          top: 4,
          isEvent: true,
        })

        setMusicOffset(offset)
        setChartNotes(notes)
        resetChartMetadata()
        clearHistory()
        window.dispatchEvent(new CustomEvent('metadataLoaded'))
      } else {
        updateCurrentFilePath(result.filePath)
        const { notes, offset, isExtendedChart, metadata } = PJSKToNotes(json)

        // console.log(notes)

        setIsExtendedChart(true)
        setMusicOffset(offset)
        setChartNotes(notes)
        setIsExtendedChart(isExtendedChart)
        if (metadata) {
          setChartMetadata(metadata)
        }
        clearHistory()
        window.dispatchEvent(new CustomEvent('metadataLoaded'))
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

  setIsExtendedChart(true)

  setChartNotes([
    {
      beat: 0,
      type: 'HiSpeed',
      speed: 1,
      isEvent: true,
    },
    {
      beat: 0,
      type: 'TimeSignature',
      bottom: 4,
      top: 4,
      isEvent: true,
    },
    {
      beat: 0,
      type: 'BPMChange',
      BPM: 160,
      isEvent: true,
    },
  ])

  setIsExtendedChart(false)

  resetChartMetadata()

  updateCurrentFilePath(null)
  clearHistory()
  window.dispatchEvent(new CustomEvent('metadataLoaded'))
}
