import { useEffect, useRef, useState } from 'react'

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

  return (
    <>
      <div
        className='h-full w-3 -mx-1.5 cursor-col-resize group z-50'
        onMouseDown={onMouseDown}
      >
        <div className='h-full w-0.5 group-hover:bg-accent delay-100 transition-all rounded-full mx-auto' />
      </div>
      <div
        className='bg-neutral-800'
        style={{
          width: `${sidebarWidth}px`,
        }}
      >
        <div className='w-full text-xs bg-neutral-800 border-b border-accent flex'>
          <div className='bg-accent px-1 py-0.5 text-white rounded-t-xs ml-1 line-clamp-1'>
            Chart Properties
          </div>
          <div className='bg-neutral-700 px-1 py-0.5 text-white rounded-t-xs ml-0.5 line-clamp-1'>
            Note Properties
          </div>
        </div>
        {sidebarWidth}
      </div>
    </>
  )
}

export default Sidebar
