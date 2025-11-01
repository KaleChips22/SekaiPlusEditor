import { useEffect, useState } from 'react'
import Titlebar from './components/Titlebar'
import { titleBarHeight } from '../shared'
import { twMerge } from 'tailwind-merge'
import MenuBar from './components/MenuBar'
import ToolBar from './components/Toolbar'
import Sidebar from './components/Sidebar'
import EditorFooter from './components/EditorFooter'
import Editor from './components/Editor'
import { globalState } from './lib'
import runCommand from './commands'

const App = () => {
  const [platform, setPlatform] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const [globalState, setGlobalState] = useState<globalState>({
    division: 16,
    selectedTool: 0,
    zoom: 1,
  })

  const setZoom = (newZoom: number) =>
    setGlobalState((p) => ({ ...p, zoom: newZoom }))

  const setDivision = (newDivision: number) =>
    setGlobalState((p) => ({ ...p, division: newDivision }))

  const setSelectedTool = (newTool: number) =>
    setGlobalState((p) => ({ ...p, selectedTool: newTool }))

  const isMac = platform === 'darwin'

  useEffect(() => {
    const mainHandler = (_event: any, message: any) => {
      if ('platform' in message) {
        setPlatform(message.platform)
      }
      if ('isFullScreen' in message) {
        setIsFullscreen(message.isFullScreen)
      }
    }
    window.ipcRenderer.on('main-process-message', mainHandler)

    const commandHandler = (_: any, message: string) => {
      runCommand(message)
    }
    window.ipcRenderer.on('command', commandHandler)

    return () => {
      window.ipcRenderer.off('main-process-message', mainHandler)
      window.ipcRenderer.off('command', commandHandler)
    }
  }, [])

  return (
    <div className='w-screen h-screen flex flex-col select-none'>
      <div
        className={twMerge(
          'flex items-center justify-center',
          isMac ? '' : 'flex-col'
        )}
        style={{
          height: `${titleBarHeight + (isMac ? 0 : 32)}px`,
        }}
      >
        <div className='flex flex-1 w-full'>
          <Titlebar
            isMac={isMac}
            isFullscreen={isFullscreen}
          />
          {!isMac && <MenuBar isMac={isMac} />}
        </div>
        <ToolBar
          selectedTool={globalState.selectedTool}
          setSelectedTool={setSelectedTool}
        />
      </div>
      <div className='flex flex-1 h-full'>
        {/* <div className='flex-1'>editor</div> */}
        <Editor globalState={globalState} />
        {/* <EditorFooter /> */}
        <Sidebar />
      </div>

      <EditorFooter
        zoom={globalState.zoom}
        setZoom={setZoom}
        division={globalState.division}
        setDivision={setDivision}
      />
    </div>
  )
}

export default App
