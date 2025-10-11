import { useEffect, useState } from 'react'
import Titlebar from './components/Titlebar'
import { titleBarHeight } from '../shared'
import { twMerge } from 'tailwind-merge'
import MenuBar from './components/Menubar'

const App = () => {
  const [platform, setPlatform] = useState<string | null>(null)

  const isMac = platform === 'darwin'

  useEffect(() => {
    window.ipcRenderer.on('main-process-message', (_event, message) => {
      if ('platform' in message) {
        setPlatform(message.platform)
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
        style={{ height: `${titleBarHeight + (isMac ? 0 : 32)}px` }}
      >
        <div className='flex flex-1 w-full'>
          <Titlebar isMac={isMac} />
          {!isMac && <MenuBar isMac={isMac} />}
        </div>
        <div className='w-full h-full bg-neutral-800 px-1.5 flex items-center justify-center text-white'>
          <div className='flex gap-1 items-center justify-start w-full h-full'>
            {new Array(16).fill(
              <div className='size-5 hover:bg-neutral-600 bg-neutral-700 active:bg-purple-500 rounded-xs' />
            )}
          </div>
        </div>
      </div>
      <div className='flex flex-1 bg-red-500'>
        <div className='h-full w-full bg-green-500 flex flex-col'>
          <div className='flex-1'>editor</div>
          <div className='w-full p-1 text-sm bg-blue-500'>Options</div>
        </div>
        <div className='w-80 bg-yellow-300'>side panel</div>
      </div>
    </div>
  )
}

export default App
