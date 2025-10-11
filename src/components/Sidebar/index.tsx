import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import ChartProperties from './ChartProperties'

const MIN_SIDEBAR_WIDTH = 205

const Sidebar = () => {
  const [sidebarWidth, setSidebarWidth] = useState(300)
  const startWidth = useRef(0)
  const startX = useRef(0)

  const onMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX
    startWidth.current = sidebarWidth

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  const onMouseMove = (e: MouseEvent) => {
    const newWidth = startWidth.current - (e.clientX - startX.current)
    setSidebarWidth(newWidth > MIN_SIDEBAR_WIDTH ? newWidth : MIN_SIDEBAR_WIDTH)
  }

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const [tabSelection1, setTabSelection1] = useState<
    'chartProperties' | 'noteProperties'
  >('chartProperties')

  const [tabSelection2, setTabSelection2] = useState<'options'>('options')

  return (
    <>
      <div
        className='h-full w-3 -mx-1.5 cursor-col-resize group z-50'
        onMouseDown={onMouseDown}
      >
        <div className='h-full w-0.5 group-hover:bg-accent delay-100 transition-all rounded-full mx-auto' />
      </div>
      <div
        className='bg-neutral-800 flex flex-col'
        style={{
          width: `${sidebarWidth}px`,
        }}
      >
        <div className='flex-1 text-xs bg-neutral-800 border-b border-accent flex'>
          <div
            className={twMerge(
              'px-1 py-0.5 text-white rounded-t-xs ml-1 line-clamp-1',
              tabSelection1 === 'chartProperties'
                ? 'bg-accent'
                : 'bg-neutral-700'
            )}
            onClick={() => setTabSelection1('chartProperties')}
          >
            Chart Properties
          </div>
          <div
            className={twMerge(
              'px-1 py-0.5 text-white rounded-t-xs ml-0.5 line-clamp-1',
              tabSelection1 === 'noteProperties'
                ? 'bg-accent'
                : 'bg-neutral-700'
            )}
            onClick={() => setTabSelection1('noteProperties')}
          >
            Note Properties
          </div>
        </div>
        <div className='w-full h-full bg-neutral-700 p-2 text-sm text-white'>
          {tabSelection1 === 'chartProperties' && <ChartProperties />}
          {tabSelection1 === 'noteProperties' && <div>TODO</div>}
        </div>
        <div className='pt-1 flex-1 text-xs bg-neutral-800 border-b border-accent flex'>
          <div
            className={twMerge(
              'px-1 py-0.5 text-white rounded-t-xs ml-1 line-clamp-1',
              tabSelection2 === 'options' ? 'bg-accent' : 'bg-neutral-700'
            )}
            onClick={() => setTabSelection2('options')}
          >
            Options
          </div>
        </div>
        <div className='w-full h-[50%] bg-neutral-700 p-2 text-sm text-white'>
          {tabSelection2 === 'options' && <div>TODO</div>}
        </div>
      </div>
    </>
  )
}

export default Sidebar
