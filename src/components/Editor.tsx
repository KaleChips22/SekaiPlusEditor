import { useCallback, useEffect, useRef, useState } from 'react'
import draw, {
  setCtx,
  setGlobalState,
  ctx,
  setWidth,
  setHeight,
  setPreviewing,
  setEditorSideBySide as setEditorSideBySideEditor,
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
  gl as previewGl,
  updateBox,
} from '../preview/draw'
import { defaultOptions } from '../../shared'

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
  const [mouseOverPreview, setMouseOverPreview] = useState(false)

  const currentCtxRef = useRef<
    CanvasRenderingContext2D | WebGLRenderingContext | null
  >(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  const [editorSideBySide, setEditorSideBySide] = useState(
    defaultOptions.editorSideBySide,
  )

  const [sideBySideFlip, setSideBySideFlip] = useState(
    defaultOptions.sideBySideFlip,
  )

  const onMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX
    startWidth.current = sidebarWidth

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      const newWidth = startWidth.current - (e.clientX - startX.current)
      const calculatedWidth =
        newWidth < MIN_SIDEBAR_WIDTH
          ? MIN_SIDEBAR_WIDTH
          : screenWidth - newWidth < MIN_EDITOR_SIZE
            ? screenWidth - MIN_EDITOR_SIZE
            : newWidth

      setSidebarWidth(calculatedWidth)
      // ResizeObserver will handle updateBox when canvas size changes
    },
    [screenWidth],
  )

  const onMouseUp = useCallback(() => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }, [onMouseMove])

  useEffect(() => {
    currentCtxRef.current = isPreviewing ? previewGl : ctx
  }, [isPreviewing])

  useEffect(() => {
    window.ipcRenderer.on('update-options', (_, options) => {
      if ('editorSideBySide' in options) {
        setEditorSideBySide(options.editorSideBySide)
        setEditorSideBySideEditor(options.editorSideBySide)
        // Reset context ref to force reinitialization
        currentCtxRef.current = null
      }
      if ('sideBySideFlip' in options) {
        setSideBySideFlip(options.sideBySideFlip)
      }
    })

    return () => {
      window.ipcRenderer.removeAllListeners('options')
    }
  }, [])

  const runDrawLoop = useCallback(
    (timeStamp: number) => {
      const editorCanvas = canvasRef.current
      const previewCanvas = previewCanvasRef.current

      if (!editorCanvas || !previewCanvas) return

      // Initialize contexts if needed
      if (currentCtxRef.current === null) {
        if (isPreviewing || editorSideBySide) {
          const previewRect = previewCanvas.getBoundingClientRect()
          if (previewRect.width > 0 && previewRect.height > 0) {
            setPreviewContext(previewCanvas)
          }
        }
        if (!isPreviewing || editorSideBySide) {
          const editorRect = editorCanvas.getBoundingClientRect()
          if (editorRect.width > 0 && editorRect.height > 0) {
            setCtx(editorCanvas.getContext('2d')!)
          }
        }
        currentCtxRef.current = true as any // Mark as initialized
      }

      // In side-by-side mode, draw both
      if (editorSideBySide) {
        // Check if canvases are actually visible and have valid dimensions
        const editorRect = editorCanvas.getBoundingClientRect()
        const previewRect = previewCanvas.getBoundingClientRect()

        const editorVisible =
          editorCanvas.offsetParent !== null &&
          editorRect.width > 0 &&
          editorRect.height > 0
        const previewVisible =
          previewCanvas.offsetParent !== null &&
          previewRect.width > 0 &&
          previewRect.height > 0

        if (editorVisible) {
          draw(timeStamp)
        }
        if (previewVisible) {
          drawPreview(timeStamp)
        }
      } else {
        // Original behavior: draw only the active view
        if (isPreviewingRef.current) {
          const previewRect = previewCanvas.getBoundingClientRect()
          const previewVisible =
            previewCanvas.offsetParent !== null &&
            previewRect.width > 0 &&
            previewRect.height > 0
          if (previewVisible) {
            drawPreview(timeStamp)
          }
        } else {
          const editorRect = editorCanvas.getBoundingClientRect()
          const editorVisible =
            editorCanvas.offsetParent !== null &&
            editorRect.width > 0 &&
            editorRect.height > 0
          if (editorVisible) {
            draw(timeStamp)
          }
        }
      }

      raf.current = requestAnimationFrame(runDrawLoop)
    },
    [isPreviewing, editorSideBySide],
  )

  useEffect(() => {
    const ipcListenerHandler = (_: any, size: any) => {
      setScreenWidth(size.width)
      // ResizeObserver will handle updateBox when canvas size changes
    }

    window.ipcRenderer.on('resize', ipcListenerHandler)

    const editorCanvas = canvasRef.current!
    const previewCanvas = previewCanvasRef.current!

    const resetEditorSize = () => {
      const rect = editorCanvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      editorCanvas.width = rect.width * dpr
      editorCanvas.height = rect.height * dpr

      // Only set editor dimensions if not in preview-only mode
      if (!isPreviewing || editorSideBySide) {
        setWidth(rect.width * dpr)
        setHeight(rect.height * dpr)
      }
    }

    const resetPreviewSize = () => {
      const rect = previewCanvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      previewCanvas.width = rect.width * dpr
      previewCanvas.height = rect.height * dpr

      // Update preview box whenever preview canvas is visible and has valid dimensions
      if (
        rect.width > 0 &&
        rect.height > 0 &&
        (isPreviewing || editorSideBySide)
      ) {
        // Pass dimensions directly to updateBox to avoid global state timing issues
        updateBox(previewCanvas.width, previewCanvas.height) //rect.width * dpr, rect.height * dpr)

        // Set width/height after updateBox
        setWidth(rect.width * dpr)
        setHeight(rect.height * dpr)

        // Restore editor dimensions if in side-by-side mode
        if (editorSideBySide) {
          const editorRect = editorCanvas.getBoundingClientRect()
          setWidth(editorRect.width * dpr)
          setHeight(editorRect.height * dpr)
        }
      }
    }

    resetEditorSize()
    resetPreviewSize()
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(runDrawLoop)

    const editorRo = new ResizeObserver(resetEditorSize)
    const previewRo = new ResizeObserver(resetPreviewSize)
    editorRo.observe(editorCanvas)
    previewRo.observe(previewCanvas)

    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      // window.ipcRenderer.off('resize', ipcListenerHandler)
      window.ipcRenderer.removeAllListeners('resize')
      editorRo.disconnect()
      previewRo.disconnect()
    }
  }, [onMouseMove, onMouseUp, runDrawLoop, isPreviewing, editorSideBySide])

  // Keep a ref in sync so the draw loop can check the current preview
  // state without capturing stale state in its closure.
  useEffect(() => {
    // When side-by-side is enabled, use mouse hover to determine isPreviewing
    // Otherwise, use the toggle state
    const actualIsPreviewing = editorSideBySide
      ? mouseOverPreview
      : isPreviewing
    isPreviewingRef.current = actualIsPreviewing
    setPreviewing(actualIsPreviewing)
  }, [isPreviewing, editorSideBySide, mouseOverPreview])

  // Reset and reinitialize when editorSideBySide changes
  useEffect(() => {
    // Update the flag in the editor draw module
    setEditorSideBySideEditor(editorSideBySide)

    currentCtxRef.current = null
    // Give the DOM time to update before reinitializing
    const timer = setTimeout(() => {
      const editorCanvas = canvasRef.current
      const previewCanvas = previewCanvasRef.current
      if (editorCanvas && previewCanvas) {
        const editorRect = editorCanvas.getBoundingClientRect()
        const previewRect = previewCanvas.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1

        // Always reinitialize contexts when mode changes
        if (editorSideBySide) {
          // Reinitialize both contexts for side-by-side
          if (editorRect.width > 0 && editorRect.height > 0) {
            setCtx(editorCanvas.getContext('2d')!)
            setWidth(editorRect.width * dpr)
            setHeight(editorRect.height * dpr)
          }
          if (previewRect.width > 0 && previewRect.height > 0) {
            setPreviewContext(previewCanvas)
            updateBox(previewCanvas.width, previewCanvas.height) //rpreviewRect.width * dpr, previewRect.height * dpr)
            setWidth(previewRect.width * dpr)
            setHeight(previewRect.height * dpr)
          }
        } else {
          // Reinitialize for single view mode
          if (isPreviewing) {
            if (previewRect.width > 0 && previewRect.height > 0) {
              setPreviewContext(previewCanvas)
              updateBox(previewCanvas.width, previewCanvas.height) //rpreviewRect.width * dpr, previewRect.height * dpr)
              setWidth(previewRect.width * dpr)
              setHeight(previewRect.height * dpr)
            }
          } else {
            if (editorRect.width > 0 && editorRect.height > 0) {
              setCtx(editorCanvas.getContext('2d')!)
              setWidth(editorRect.width * dpr)
              setHeight(editorRect.height * dpr)
            }
          }
        }
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [editorSideBySide, isPreviewing])

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
        {editorSideBySide ? (
          <div
            className={twMerge(
              'flex gap-2 h-[calc(100%-28px)] w-full',
              sideBySideFlip ? 'flex-row-reverse' : 'flex-row',
            )}
            onMouseLeave={() => setMouseOverPreview(false)}
          >
            <canvas
              className="w-1/2 h-full z-10 rounded-md"
              ref={canvasRef}
              style={{
                backgroundImage: "url('bg_image/default.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              onClick={(e) => e.currentTarget.focus()}
              onMouseEnter={() => setMouseOverPreview(false)}
            />
            <canvas
              className="w-1/2 h-full z-10 rounded-md"
              ref={previewCanvasRef}
              style={{
                backgroundImage: "url('bg_image/default.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              onClick={(e) => e.currentTarget.focus()}
              onMouseEnter={() => setMouseOverPreview(true)}
            />
          </div>
        ) : (
          <>
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
          </>
        )}

        {!editorSideBySide && (
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
        )}
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
