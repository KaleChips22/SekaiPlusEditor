import {
  copy,
  cut,
  deleteSelected,
  exportUSC,
  flipSelection,
  paste,
  saveAsPJSK,
  savePJSK,
  selectAll,
} from '../editor/draw'
import { newFile, openFile } from '../editor/fileOps'

const runCommand = (command: string) => {
  switch (command) {
    case 'deleteSelected':
      deleteSelected()
      break

    case 'selectAll':
      selectAll()
      break

    case 'copy':
      copy()
      break

    case 'paste':
      paste()
      break

    case 'cut':
      cut()
      break

    case 'flipSelection':
      flipSelection()
      break

    case 'flipPaste':
      paste(true)
      break

    case 'open':
      openFile()
      break

    case 'export':
      exportUSC()
      break

    case 'saveAs':
      saveAsPJSK()
      break

    case 'save':
      savePJSK()
      break

    case 'newFile':
      newFile()
      break

    case 'showSettings':
      window.ipcRenderer.showSettings()
      break

    default:
      break
  }
}

export default runCommand
