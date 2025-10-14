export const getMenuItemName = (role: string | undefined) =>
  ({
    quit: 'Quit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    delete: 'Delete',
  }[role || ''])

export const getAccelerator = (role: string | undefined) =>
  ({
    quit: 'CmdOrCtrl+Q',
    undo: 'CmdOrCtrl+Z',
    redo: 'CmdOrCtrl+Shift+Z',
    cut: 'CmdOrCtrl+X',
    copy: 'CmdOrCtrl+C',
    paste: 'CmdOrCtrl+V',
  }[role || ''] || '')

// mac cmd key character: ⌘
export const shortcutString = (shortcut: string, isMac: boolean) => {
  if (shortcut === '') return ''
  const parts = shortcut.split('+')
  return parts
    .map((part) => {
      if (part.toLowerCase() === 'cmdorctrl') return isMac ? '⌘' : 'Ctrl'
      if (part.toLowerCase() === 'shift') return isMac ? '⇧' : 'Shift'
      if (part.toLowerCase() === 'alt') return isMac ? '⌥' : 'Alt'
      if (part.toLowerCase() === 'ctrl') return isMac ? '⌃' : 'Ctrl'
      if (part.toLowerCase() === 'backspace') return '⌫'
      if (part.toLowerCase() === 'delete') return isMac ? '⌦' : 'Del'
      return part.toUpperCase()
    })
    .join(isMac ? ' ' : ' + ')
    .replace('⌘ ⇧', '⇧ ⌘')
}

export interface globalState {
  division: number
  zoom: number
  selectedTool: number

  visualOptions: {
    drawHolds: 'lite' | 'full-render'
  }
}
