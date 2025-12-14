import { Triangle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import {
  setMusic,
  setMusicOffset,
  setMusicScoreName,
  getChartMetadata,
  setChartMetadata,
  getIsExtendedChart,
} from '../../editor/draw'

const ChartProperties = ({
  setIsExtendedChart,
}: {
  setIsExtendedChart: (value: boolean) => void
}) => {
  const [formData, setFormData] = useState(() => {
    const metadata = getChartMetadata()
    return {
      title: metadata.title,
      designer: metadata.designer,
      artist: metadata.artist,
      jacket: metadata.jacket,
      musicFile: '',
      musicOffset: 0,
      masterVolume: metadata.masterVolume,
      BGMVolume: metadata.BGMVolume,
      SEVolume: metadata.SEVolume,
      isExtendedChart: false,
    }
  })

  const [metadataExpanded, setMetadataExpanded] = useState(true)
  const [audioExpanded, setAudioExpanded] = useState(true)
  const [advancedExpanded, setAdvancedExpanded] = useState(false)

  const dragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartValue = useRef(0)

  useEffect(() => {
    const metadata = getChartMetadata()
    setFormData((prev) => ({
      ...prev,
      title: metadata.title,
      designer: metadata.designer,
      artist: metadata.artist,
      jacket: metadata.jacket,
      masterVolume: metadata.masterVolume,
      BGMVolume: metadata.BGMVolume,
      SEVolume: metadata.SEVolume,
    }))
  }, [])

  useEffect(() => {
    const handleMetadataLoaded = () => {
      const metadata = getChartMetadata()
      const extended = getIsExtendedChart()
      setFormData((prev) => ({
        ...prev,
        title: metadata.title,
        designer: metadata.designer,
        artist: metadata.artist,
        jacket: metadata.jacket,
        masterVolume: metadata.masterVolume,
        BGMVolume: metadata.BGMVolume,
        SEVolume: metadata.SEVolume,
        isExtendedChart: extended,
      }))
      setIsExtendedChart(extended)
    }

    window.addEventListener('metadataLoaded', handleMetadataLoaded)
    return () =>
      window.removeEventListener('metadataLoaded', handleMetadataLoaded)
  }, [setIsExtendedChart])

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
        className="bg-neutral-800 px-2 py-0.5 flex gap-2 items-center justify-start mb-1"
        onClick={() => setMetadataExpanded((p) => !p)}
      >
        <Triangle
          className={twMerge(
            'size-3.5 transition-all',
            metadataExpanded ? 'rotate-180' : 'rotate-90',
          )}
        />
        Metadata
      </div>

      <div
        className={twMerge(
          'grid grid-cols-2 gap-x-1 gap-y-1.5 mb-3',
          !metadataExpanded && 'hidden',
        )}
      >
        <span>Title</span>
        <input
          className="bg-neutral-800/50 outline-none ring-0"
          value={formData.title}
          onChange={(e) => {
            const value = e.currentTarget.value
            setFormData({ ...formData, title: value })
            setMusicScoreName(value)
            setChartMetadata({ title: value })
          }}
        />
        <span>Designer</span>
        <input
          className="bg-neutral-800/50 outline-none ring-0"
          value={formData.designer}
          onChange={(e) => {
            const value = e.currentTarget.value
            setFormData({ ...formData, designer: value })
            setChartMetadata({ designer: value })
          }}
        />
        <span>Artist</span>
        <input
          className="bg-neutral-800/50 outline-none ring-0"
          value={formData.artist}
          onChange={(e) => {
            const value = e.currentTarget.value
            setFormData({ ...formData, artist: value })
            setChartMetadata({ artist: value })
          }}
        />
        <span>Jacket</span>
        <input
          className="bg-neutral-800/50 outline-none ring-0"
          value={formData.jacket as string}
          onChange={(e) => {
            const value = e.currentTarget.value
            setFormData({ ...formData, jacket: value })
            setChartMetadata({ jacket: value })
          }}
        />
      </div>
      <div
        className="bg-neutral-800 px-2 py-0.5 flex gap-2 items-center justify-start mb-1"
        onClick={() => setAudioExpanded((p) => !p)}
      >
        <Triangle
          className={twMerge(
            'size-3.5 transition-all',
            audioExpanded ? 'rotate-180' : 'rotate-90',
          )}
        />
        Audio
      </div>
      <div
        className={twMerge(
          'grid grid-cols-2 gap-x-1 gap-y-1.5 mb-3',
          !audioExpanded && 'hidden',
        )}
      >
        <span>Music File</span>
        <input
          className="bg-neutral-800/50 outline-none ring-0 hide-before"
          type="file"
          accept=".mp3, .wav"
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
        <div className="flex items-center w-full">
          <input
            className="bg-neutral-800/50 outline-none ring-0 text-center w-full flex-1"
            value={`${formData.musicOffset} ms`}
            type="text"
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
                (dragStartValue.current + delta * sensitivity) * 1,
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
          className="bg-neutral-800/50 outline-none ring-0 slider"
          value={formData.masterVolume}
          type="range"
          min={0}
          max={100}
          step={0.1}
          data-suffix="%"
          onChange={(e) => {
            const value = parseFloat(e.currentTarget.value)
            setFormData({
              ...formData,
              masterVolume: value,
            })
            setChartMetadata({ masterVolume: value })
          }}
        />
        <span>BGM Volume</span>
        <input
          className="bg-neutral-800/50 outline-none ring-0 slider"
          value={formData.BGMVolume}
          type="range"
          min={0}
          max={100}
          step={0.1}
          data-suffix="%"
          onChange={(e) => {
            const value = parseFloat(e.currentTarget.value)
            setFormData({
              ...formData,
              BGMVolume: value,
            })
            setChartMetadata({ BGMVolume: value })
          }}
        />
        <span>SE Volume</span>
        <input
          className="bg-neutral-800/50 outline-none ring-0 slider"
          value={formData.SEVolume}
          type="range"
          min={0}
          max={100}
          step={0.1}
          data-suffix="%"
          onChange={(e) => {
            const value = parseFloat(e.currentTarget.value)
            setFormData({
              ...formData,
              SEVolume: value,
            })
            setChartMetadata({ SEVolume: value })
          }}
        />
      </div>

      <div
        className="bg-neutral-800 px-2 py-0.5 flex gap-2 items-center justify-start mb-1"
        onClick={() => setAdvancedExpanded((p) => !p)}
      >
        <Triangle
          className={twMerge(
            'size-3.5 transition-all',
            advancedExpanded ? 'rotate-180' : 'rotate-90',
          )}
        />
        Advanced
      </div>

      <div
        className={twMerge(
          'grid grid-cols-2 gap-x-1 gap-y-1.5 mb-3',
          !advancedExpanded && 'hidden',
        )}
      >
        <span className="flex-1">Extended Chart</span>
        <input
          className="bg-neutral-800/50 outline-none ring-0 accent-accent"
          type="checkbox"
          checked={formData.isExtendedChart}
          onChange={() => {
            if (
              formData.isExtendedChart ||
              !confirm(
                'Are you sure you want to enable extended chart features? You will not be able to revert this decision.',
              )
            )
              return
            setFormData({
              ...formData,
              isExtendedChart: true,
            })
            setIsExtendedChart(true)
          }}
        />
      </div>
    </div>
  )
}

export default ChartProperties
