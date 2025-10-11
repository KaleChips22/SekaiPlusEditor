import { useState } from 'react'
import { twMerge } from 'tailwind-merge'

const tools = [
  'new',
  'open',
  'save',
  'export',
  'separator',
  'undo',
  'redo',
  'separator',
  'copy',
  'paste',
  'cut',
  'separator',
  'editor-1',
  'editor-2',
  'editor-3',
  'editor-4',
  'editor-5',
  'editor-6',
  'editor-7',
  'editor-8',
  'editor-9',
  'editor-10',
  'editor-11',
]

const ToolBar = () => {
  const [activeTool, setActiveTool] = useState(0)

  return (
    <div className='h-full w-full bg-neutral-800 px-1.5 flex items-center text-white'>
      <div className='flex gap-1 items-center justify-start w-full h-full'>
        {tools.map((tool, index) =>
          tool === 'separator' ? (
            <div
              key={index}
              className='h-5 w-[1px] bg-neutral-700'
            />
          ) : (
            <div
              className={twMerge(
                'size-5 hover:bg-neutral-600 rounded-xs overflow-hidden flex items-center justify-center',
                activeTool === index
                  ? 'bg-purple-700'
                  : 'bg-neutral-700'
              )}
              onClick={() => setActiveTool(index)}
              key={index}
            >
              <img src={`./assets/icons/${tool}.png`} />
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default ToolBar
