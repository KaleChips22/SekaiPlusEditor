import { deleteSelected, doReturn, selectAll } from '../editor/draw'

const runCommand = (command: string) => {
  switch (command) {
    case 'deleteSelected':
      deleteSelected()
      break

    case 'selectAll':
      selectAll()
      break

    case 'doReturn':
      doReturn()
      break

    default:
      break
  }
}

export default runCommand
