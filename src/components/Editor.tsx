import { useCallback, useEffect, useRef, useState } from 'react'
import draw, {
  setCtx,
  setGlobalState,
  ctx,
  setWidth,
  setHeight,
  setPreviewing,
} from '../editor/draw'
import { globalState } from '../lib'
import ContextMenu from './ContextMenu'
import HiSpeedPanel from './HiSpeedPanel'
import BPMChangePanel from './BPMChangePanel'
import TimeSignaturePanel from './TimeSignaturePanel'
import { twMerge } from 'tailwind-merge'
import { ChartArea, Eye } from 'lucide-react'
import drawPreview, {
  setPreviewContext,
  ctx as previewCtx,
} from '../preview/draw'

const MIN_SIDEBAR_WIDTH = 215
const MIN_EDITOR_SIZE = 200

const Editor = ({ globalState }: { globalState: globalState }) => {
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(300)
  const [screenWidth, setScreenWidth] = useState(window.innerWidth)
  const startWidth = useRef(0)
  const startX = useRef(0)
  const raf = useRef(0)
  const isPreviewingRef = useRef(isPreviewing)

  const currentCtxRef = useRef<CanvasRenderingContext2D | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  const onMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX
    startWidth.current = sidebarWidth

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      const newWidth = startWidth.current - (e.clientX - startX.current)
      setSidebarWidth(
        newWidth < MIN_SIDEBAR_WIDTH
          ? MIN_SIDEBAR_WIDTH
          : screenWidth - newWidth < MIN_EDITOR_SIZE
            ? screenWidth - MIN_EDITOR_SIZE
            : newWidth,
      )
    },
    [screenWidth],
  )

  const onMouseUp = useCallback(() => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }, [onMouseMove])

  useEffect(() => {
    currentCtxRef.current = isPreviewing ? previewCtx : ctx
  }, [isPreviewing])

  const runDrawLoop = useCallback(
    (timeStamp: number) => {
      const canvas = isPreviewing ? previewCanvasRef.current : canvasRef.current
      if (!canvas) return

      if (currentCtxRef.current === null) {
        const setContext = isPreviewing ? setPreviewContext : setCtx
        setContext(canvas.getContext('2d')!)
      }

      // Only schedule the next frame when not previewing. Use a ref so
      // the latest `isPreviewing` value is visible inside this callback
      // without recreating the function.
      if (!isPreviewingRef.current) {
        draw(timeStamp)
      } else {
        drawPreview(timeStamp)
      }

      raf.current = requestAnimationFrame(runDrawLoop)
    },
    [isPreviewing],
  )

  useEffect(() => {
    const ipcListenerHandler = (_: any, size: any) => {
      setScreenWidth(size.width)
    }

    window.ipcRenderer.on('resize', ipcListenerHandler)

    const editorCanvas = canvasRef.current!
    const previewCanvas = previewCanvasRef.current!

    const resetSize = () => {
      const rect = isPreviewing
        ? previewCanvas.getBoundingClientRect()
        : editorCanvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      editorCanvas.width = rect.width * dpr
      editorCanvas.height = rect.height * dpr

      previewCanvas.width = rect.width * dpr
      previewCanvas.height = rect.height * dpr

      setWidth(editorCanvas.width)
      setHeight(editorCanvas.height)
    }

    resetSize()
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(runDrawLoop)

    const ro = new ResizeObserver(resetSize)
    ro.observe(editorCanvas)
    ro.observe(previewCanvas)

    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      // window.ipcRenderer.off('resize', ipcListenerHandler)
      window.ipcRenderer.removeAllListeners('resize')
      ro.disconnect()
    }
  }, [onMouseMove, onMouseUp, runDrawLoop, isPreviewing])

  // Keep a ref in sync so the draw loop can check the current preview
  // state without capturing stale state in its closure.
  useEffect(() => {
    isPreviewingRef.current = isPreviewing
    setPreviewing(isPreviewing)
  }, [isPreviewing])

  useEffect(() => {
    setGlobalState(globalState)
  }, [globalState])

  return (
    <>
      <div
        className="h-full relative pl-2 bg-linear-180 from-neutral-800 to-neutral-700"
        style={{
          width: `${screenWidth - sidebarWidth}px`,
        }}
      >
        {/* <img
          className='w-full h-full absolute inset-0 object-cover z-1'
          src='bg_image/default.png'
        /> */}
        <canvas
          className={twMerge(
            'w-full h-[calc(100%-28px)] z-10 rounded-md',
            isPreviewing && 'hidden',
          )}
          ref={canvasRef}
          style={{
            backgroundImage: "url('bg_image/default.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          onClick={(e) => e.currentTarget.focus()}
        />
        <canvas
          className={twMerge(
            'w-full h-[calc(100%-28px)] z-10 rounded-md',
            !isPreviewing && 'hidden',
          )}
          ref={previewCanvasRef}
          style={{
            backgroundImage: "url('bg_image/default.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          onClick={(e) => e.currentTarget.focus()}
        />

        <div className="absolute bottom-9 right-2 w-18 h-9 bg-neutral-800 hover:bg-neutral-700 rounded-md opacity-75 hover:opacity-100 transition-all flex items-center justify-center gap-0.5 p-1">
          <div
            className={twMerge(
              'flex items-center justify-center h-full w-full',
              isPreviewing && 'bg-accent rounded-sm',
            )}
            onClick={() => setIsPreviewing(true)}
          >
            <Eye className="size-4 text-white" />
          </div>
          <div
            className={twMerge(
              'flex items-center justify-center h-full w-full',
              !isPreviewing && 'bg-accent rounded-sm',
            )}
            onClick={() => setIsPreviewing(false)}
          >
            <ChartArea className="size-4 text-white" />
          </div>
        </div>
      </div>
      <div
        className="h-full w-3 -mx-1.5 cursor-col-resize group z-50"
        onMouseDown={onMouseDown}
      >
        <div className="h-full w-0.5 group-hover:bg-accent delay-100 transition-all rounded-full mx-auto" />
      </div>

      <ContextMenu />
      <HiSpeedPanel />
      <BPMChangePanel />
      <TimeSignaturePanel />
    </>
  )
}

export default Editor
