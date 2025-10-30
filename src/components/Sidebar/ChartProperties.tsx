import { Triangle } from 'lucide-react'
import { useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { setMusic } from '../../editor/draw'

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

            const blobUrl = URL.createObjectURL(file)
            setMusic(blobUrl)

            e.target.blur()
          }}
        />
        <span>Music Offset</span>
        <input
          className='bg-neutral-800/50 outline-none ring-0 text-center'
          value={formData.musicOffset}
          type='number'
          onChange={(e) =>
            setFormData({
              ...formData,
              musicOffset: parseFloat(e.currentTarget.value),
            })
          }
        />
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
