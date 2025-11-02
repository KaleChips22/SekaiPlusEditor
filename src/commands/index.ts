import {
  copy,
  cut,
  deleteSelected,
  flipSelection,
  paste,
  selectAll,
} from '../editor/draw'

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

    default:
      break
  }
}

export default runCommand
