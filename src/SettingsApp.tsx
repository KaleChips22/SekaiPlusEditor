import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { accentColorList, defaultOptions, setAccentColor } from '../shared'
import { XIcon } from 'lucide-react'

const SettingsApp = () => {
  const [platform, setPlatform] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<
    'visual' | 'preview' | 'timeline'
  >('visual')

  const [allOptions, setAllOptions] = useState(defaultOptions)

  const isMac = platform === 'darwin'

  useEffect(() => {
    const mainHandler = (_event: any, message: any) => {
      if ('platform' in message) {
        setPlatform(message.platform)
      }
    }
    window.ipcRenderer.on('main-process-message', mainHandler)

    window.ipcRenderer.on('update-options', (_, options) => {
      setAccentColor(options.accentColor)

      const newOptions = JSON.parse(JSON.stringify(allOptions))
      for (const [k, v] of Object.entries(options)) {
        if (k in allOptions) {
          newOptions[k] = v
        }
      }
      setAllOptions(newOptions)
    })

    return () => {
      // window.ipcRenderer.off('main-process-message', mainHandler)
      window.ipcRenderer.removeAllListeners('main-process-message')
      window.ipcRenderer.removeAllListeners('update-options')
    }
  }, [allOptions])
  return (
    <div
      className={twMerge(
        'w-screen h-screen overflow-hidden flex flex-col text-white select-none',
        !isMac && 'bg-neutral-800',
      )}
    >
      <div className="w-full h-9 bg-black/20 flex items-center justify-center">
        <h1 className="w-[calc(100%-16*var(--spacing))] drag font-bold text-md h-full text-center flex items-center justify-center">
          Settings
        </h1>
        {!isMac && (
          <div
            className="fixed top-2 right-2 size-5 flex items-center justify-center p-0.5 bg-white/10 hover:bg-white/25 rounded-sm cursor-pointer"
            onClick={() => window.ipcRenderer.send('close-settings')}
          >
            <XIcon className="w-full h-full" />
          </div>
        )}
      </div>
      <div className="flex-1 flex items-center justify-center flex-col">
        <div className="w-full bg-black/10 flex items-center justify-start gap-1 p-1 text-sm font-semibold">
          <div
            className={twMerge(
              'rounded-md w-full px-2 py-1 bg-white/10 hover:bg-white/15 max-w-30 cursor-pointer',
              selectedTab === 'visual' && 'bg-accent hover:bg-accent',
            )}
            onClick={() => setSelectedTab('visual')}
          >
            Visual
          </div>
          <div
            className={twMerge(
              'rounded-md w-full px-2 py-1 bg-white/10 hover:bg-white/15 max-w-30 cursor-pointer',
              selectedTab === 'timeline' && 'bg-accent hover:bg-accent',
            )}
            onClick={() => setSelectedTab('timeline')}
          >
            Timeline
          </div>
          <div
            className={twMerge(
              'rounded-md w-full px-2 py-1 bg-white/10 hover:bg-white/15 max-w-30 cursor-pointer',
              selectedTab === 'preview' && 'bg-accent hover:bg-accent',
            )}
            onClick={() => setSelectedTab('preview')}
          >
            Preview
          </div>
        </div>
        <div className="flex-1 p-2 flex items-start justify-center flex-col gap-1.5 text-sm min-w-3/5">
          {selectedTab === 'visual' && (
            <>
              <div className="flex w-full flex-col sm:flex-row items-start justify-center sm:items-center sm:justify-between gap-0.5">
                <h2 className="font-medium text-md flex-1">Accent Color</h2>
                <div className="flex w-full sm:w-[unset] items-center justify-start gap-1">
                  {accentColorList.map((c, i) => (
                    <div
                      key={i}
                      className={`size-6 rounded-sm bg-accent ${c} transition-transform duration-75 hover:scale-110 active:scale-95`}
                      onClick={() =>
                        window.ipcRenderer.send('set-options', {
                          accentColor: c,
                        })
                      }
                    />
                  ))}
                </div>
              </div>
              <hr className="border-white/20 w-full my-1" />
              <div className="flex w-full items-start justify-between gap-0.5">
                <h2 className="font-medium text-md">Hide Tick Outlines</h2>
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={allOptions.hideTickOutlines}
                  onClick={() =>
                    window.ipcRenderer.send('set-options', {
                      hideTickOutlines: !allOptions.hideTickOutlines,
                    })
                  }
                />
              </div>
              <div className="flex w-full items-start justify-between gap-0.5">
                <h2 className="font-medium text-md">
                  Hide Tick Outlines on Play
                </h2>
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={allOptions.hideTickOutlinesOnPlay}
                  onClick={() =>
                    window.ipcRenderer.send('set-options', {
                      hideTickOutlinesOnPlay:
                        !allOptions.hideTickOutlinesOnPlay,
                    })
                  }
                />
              </div>
              <div className="flex w-full items-start justify-between gap-0.5">
                <h2 className="font-medium text-md">
                  Show Editor and Preview Side-by-Side
                </h2>
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={allOptions.editorSideBySide}
                  onClick={() =>
                    window.ipcRenderer.send('set-options', {
                      editorSideBySide: !allOptions.editorSideBySide,
                    })
                  }
                />
              </div>
              {allOptions.editorSideBySide && (
                <div className="flex w-full items-start justify-between gap-0.5">
                  <h2 className="font-medium text-md">Flip Side-by-Side</h2>
                  <input
                    type="checkbox"
                    className="accent-accent"
                    checked={allOptions.sideBySideFlip}
                    onClick={() =>
                      window.ipcRenderer.send('set-options', {
                        sideBySideFlip: !allOptions.sideBySideFlip,
                      })
                    }
                  />
                </div>
              )}
            </>
          )}
          {selectedTab === 'timeline' && (
            <>
              <div className="flex w-full items-start justify-between gap-0.5 flex-col">
                <h2 className="font-medium text-md">Lane Width</h2>
                <input
                  type="range"
                  min={15}
                  max={65}
                  step={5}
                  className="accent-accent bg-black/40 w-full slider"
                  value={allOptions.laneWidth}
                  onChange={(e) =>
                    window.ipcRenderer.send('set-options', {
                      laneWidth: e.currentTarget.value,
                    })
                  }
                />
              </div>
            </>
          )}
          {selectedTab === 'preview' && (
            <>
              <div className="flex w-full items-start justify-between gap-0.5 flex-col">
                <h2 className="font-medium text-md">Note Speed</h2>
                <input
                  type="range"
                  min={1}
                  max={12}
                  step={0.1}
                  className="accent-accent bg-black/40 w-full slider"
                  value={allOptions.noteSpeed}
                  onChange={(e) => {
                    window.ipcRenderer.send('set-options', {
                      noteSpeed: e.currentTarget.value,
                    })
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsApp
