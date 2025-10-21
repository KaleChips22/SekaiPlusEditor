import { deleteSelected, selectAll } from '../editor/draw'

const runCommand = (command: string) => {
  switch (command) {
    case 'deleteSelected':
      deleteSelected()
      break

    case 'selectAll':
      selectAll()
      break

    default:
      break
  }
}

export default runCommand
