import { Triangle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { setMusic, setMusicOffset } from '../../editor/draw'

const ChartProperties = () => {
  const [formData, setFormData] = useState({
    title: '',
    designer: '',
    artist: '',
    jacket: null as string | null,
    musicFile: null as string | null,
    musicOffset: 0,
    masterVolume: 100,
    BGMVolume: 100,
    SEVolume: 100,
  })

  const [metadataExpanded, setMetadataExpanded] = useState(true)
  const [audioExpanded, setAudioExpanded] = useState(true)

  const dragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartValue = useRef(0)

  useEffect(() => {
    return () => {
      // cleanup: ensure cursor and selection restored if unmounted while dragging
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [])

  return (
    <div>
      <div
        className='bg-neutral-800 px-2 py-0.5 flex gap-2 items-center justify-start mb-1'
        onClick={() => setMetadataExpanded((p) => !p)}
      >
        <Triangle
          className={twMerge(
            'size-3.5 transition-all',
            metadataExpanded ? 'rotate-180' : 'rotate-90'
          )}
        />
        Metadata
      </div>

      <div
        className={twMerge(
          'grid grid-cols-2 gap-x-1 gap-y-1.5 mb-3',
          !metadataExpanded && 'hidden'
        )}
      >
        <span>Title</span>
        <input
          className='bg-neutral-800/50 outline-none ring-0'
          value={formData.title}
          onChange={(e) =>
            setFormData({ ...formData, title: e.currentTarget.value })
          }
        />
        <span>Designer</span>
        <input
          className='bg-neutral-800/50 outline-none ring-0'
          value={formData.designer}
          onChange={(e) =>
            setFormData({ ...formData, designer: e.currentTarget.value })
          }
        />
        <span>Artist</span>
        <input
          className='bg-neutral-800/50 outline-none ring-0'
          value={formData.artist}
          onChange={(e) =>
            setFormData({ ...formData, artist: e.currentTarget.value })
          }
        />
        <span>Jacket</span>
        <input
          className='bg-neutral-800/50 outline-none ring-0'
          value={formData.jacket as string}
          onChange={(e) =>
            setFormData({ ...formData, jacket: e.currentTarget.value })
          }
        />
      </div>
      <div
        className='bg-neutral-800 px-2 py-0.5 flex gap-2 items-center justify-start mb-1'
        onClick={() => setAudioExpanded((p) => !p)}
      >
        <Triangle
          className={twMerge(
            'size-3.5 transition-all',
            audioExpanded ? 'rotate-180' : 'rotate-90'
          )}
        />
        Audio
      </div>
      <div
        className={twMerge(
          'grid grid-cols-2 gap-x-1 gap-y-1.5 mb-3',
          !audioExpanded && 'hidden'
        )}
      >
        <span>Music File</span>
        <input
          className='bg-neutral-800/50 outline-none ring-0 hide-before'
          type='file'
          accept='.mp3, .wav'
          onChange={(e) => {
            const f = e.target.files
            if (f && f.length <= 0) return
            const file = f![0]

            setMusic(file)

            // const blobUrl = URL.createObjectURL(file)
            // setMusic(blobUrl)

            e.target.blur()
          }}
        />
        <span>Music Offset</span>
        <div className='flex items-center w-full'>
          <input
            className='bg-neutral-800/50 outline-none ring-0 text-center w-full flex-1'
            value={`${formData.musicOffset} ms`}
            type='text'
            // No min/max attributes so value is unbounded
            onChange={(e) => {
              const raw = e.currentTarget.value
              const m = raw.match(/-?\d+(?:\.\d+)?/)
              const v = m ? parseFloat(m[0]) : 0
              setFormData((prev) => ({ ...prev, musicOffset: v }))
              setMusicOffset(Number.isFinite(v) ? v : 0)
            }}
            onPointerDown={(e) => {
              // start drag-to-change behavior
              e.currentTarget.setPointerCapture(e.pointerId)
              e.preventDefault()
              dragging.current = true
              dragStartX.current = e.clientX
              dragStartValue.current = Number.isFinite(formData.musicOffset)
                ? formData.musicOffset
                : 0
              // visual feedback: horizontal resize cursor and disable text selection
              document.body.style.cursor = 'ew-resize'
              document.body.style.userSelect = 'none'
            }}
            onPointerMove={(e) => {
              if (!dragging.current) return
              // sensitivity: Shift = fine (0.1 ms/px), Alt = coarse (10 ms/px), default = 1 ms/px
              const sensitivity = e.shiftKey ? 0.1 : e.altKey ? 10 : 1
              const delta = e.clientX - dragStartX.current
              const newVal = Math.round(
                (dragStartValue.current + delta * sensitivity) * 1
              ) // ms integer
              setFormData((prev) => ({ ...prev, musicOffset: newVal }))
              setMusicOffset(newVal)
            }}
            onPointerUp={(e) => {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId)
              } catch {}
              dragging.current = false
              document.body.style.cursor = ''
              document.body.style.userSelect = ''
            }}
            // show horizontal-resize cursor on hover to indicate draggable
            style={{ cursor: 'ew-resize' }}
          />
          {/* ms suffix is shown inside the input value now */}
        </div>
        <span>Master Volume</span>
        <input
          className='bg-neutral-800/50 outline-none ring-0 slider'
          value={formData.masterVolume}
          type='range'
          min={0}
          max={100}
          step={0.1}
          data-suffix='%'
          onChange={(e) =>
            setFormData({
              ...formData,
              masterVolume: parseFloat(e.currentTarget.value),
            })
          }
        />
        <span>BGM Volume</span>
        <input
          className='bg-neutral-800/50 outline-none ring-0 slider'
          value={formData.BGMVolume}
          type='range'
          min={0}
          max={100}
          step={0.1}
          data-suffix='%'
          onChange={(e) =>
            setFormData({
              ...formData,
              BGMVolume: parseFloat(e.currentTarget.value),
            })
          }
        />
        <span>SE Volume</span>
        <input
          className='bg-neutral-800/50 outline-none ring-0 slider'
          value={formData.SEVolume}
          type='range'
          min={0}
          max={100}
          step={0.1}
          data-suffix='%'
          onChange={(e) =>
            setFormData({
              ...formData,
              SEVolume: parseFloat(e.currentTarget.value),
            })
          }
        />
      </div>
    </div>
  )
}

export default ChartProperties
