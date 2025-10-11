import { useEffect, useState } from 'react'
import Titlebar from './components/Titlebar'
import { titleBarHeight } from '../shared'
import { twMerge } from 'tailwind-merge'
import MenuBar from './components/MenuBar'
import ToolBar from './components/Toolbar'
import Sidebar from './components/Sidebar'

const App = () => {
  const [platform, setPlatform] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const isMac = platform === 'darwin'

  useEffect(() => {
    window.ipcRenderer.on('main-process-message', (_event, message) => {
      if ('platform' in message) {
        setPlatform(message.platform)
      }
      if ('isFullScreen' in message) {
        setIsFullscreen(message.isFullScreen)
      }
    })
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
        <ToolBar />
      </div>
      <div className='flex flex-1 bg-red-500'>
        <div className='flex-1 bg-green-500 flex flex-col'>
          <div className='flex-1'>editor</div>
          <div className='w-full p-1 text-sm bg-blue-500'>Options</div>
        </div>
        <Sidebar />
      </div>
    </div>
  )
}

export default App
