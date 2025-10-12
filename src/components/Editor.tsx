import { useEffect, useRef, useState } from 'react'
import draw from '../Editor/draw'

const MIN_SIDEBAR_WIDTH = 215
const MIN_EDITOR_SIZE = 200

const Editor = () => {
  const [sidebarWidth, setSidebarWidth] = useState(300)
  const [screenWidth, setScreenWidth] = useState(window.innerWidth)
  const startWidth = useRef(0)
  const startX = useRef(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)

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
    setSidebarWidth(
      newWidth < MIN_SIDEBAR_WIDTH
        ? MIN_SIDEBAR_WIDTH
        : screenWidth - newWidth < MIN_EDITOR_SIZE
        ? screenWidth - MIN_EDITOR_SIZE
        : newWidth
    )
  }

  useEffect(() => {
    window.ipcRenderer.on('resize', (_e, size) => {
      setScreenWidth(size.width)
    })

    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    let raf: number

    const resetSize = () => {
      cancelAnimationFrame(raf)
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      runDrawLoop()
    }

    const runDrawLoop = () => {
      draw(ctx, canvas.width, canvas.height)

      raf = requestAnimationFrame(runDrawLoop)
    }

    runDrawLoop()

    resetSize()

    const ro = new ResizeObserver(resetSize)
    ro.observe(canvas)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      ro.disconnect()
    }
  }, [])

  return (
    <>
      <div
        className='h-full relative pl-2 bg-linear-180 from-neutral-800 to-neutral-700'
        style={{
          width: `${screenWidth - sidebarWidth}px`,
        }}
      >
        {/* <img
          className='w-full h-full absolute inset-0 object-cover z-1'
          src='bg_image/default.png'
        /> */}
        <canvas
          className='w-full h-[calc(100%-28px)] z-10 rounded-md'
          ref={canvasRef}
          style={{
            backgroundImage: "url('bg_image/default.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </div>
      <div
        className='h-full w-3 -mx-1.5 cursor-col-resize group z-50'
        onMouseDown={onMouseDown}
      >
        <div className='h-full w-0.5 group-hover:bg-accent delay-100 transition-all rounded-full mx-auto' />
      </div>
    </>
  )
}

export default Editor
