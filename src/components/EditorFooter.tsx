import {
  FastForward,
  Play,
  Rewind,
  Square,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const EditorFooter = ({
  zoom,
  setZoom,
  division,
  setDivision,
}: {
  zoom: number
  setZoom: (x: number) => void
  division: number
  setDivision: (x: number) => void
}) => {
  // const [formData, setFormData] = useState({
  //   division: 16,
  //   zoom: 3.0,
  // })

  const [version, setVersion] = useState('0.0.0')

  useEffect(() => {
    window.ipcRenderer.on('version', (_event, version) => {
      setVersion(version)
    })

    return () => {
      window.ipcRenderer.removeAllListeners('version')
    }
  }, [setVersion])

  return (
    <div className="flex bg-neutral-700 text-sm text-white items-center justify-center px-1 absolute bottom-0 left-0 right-0 z-100">
      <div className="flex items-center justify-center p-0.5">
        <Rewind className="size-5 p-0.5" />
        <Square className="size-5 p-0.5" />
        <Play className="size-5 p-0.5" />
        <FastForward className="size-5 p-0.5" />
      </div>
      <select
        value={division}
        onChange={(e) => setDivision(parseInt(e.currentTarget.value))}
        className="px-1 m-1 bg-neutral-800 rounded-xs outline-0 ring-0"
      >
        <option value={4}>4 Divison</option>
        <option value={8}>8 Divison</option>
        <option value={12}>12 Divison</option>
        <option value={16}>16 Divison</option>
        <option value={24}>24 Divison</option>
        <option value={32}>32 Divison</option>
        <option value={48}>48 Divison</option>
        <option value={64}>64 Divison</option>
        <option value={96}>96 Divison</option>
        <option value={128}>128 Divison</option>
        <option value={192}>192 Divison</option>
        <option value={1920}>1920 Divison</option>
      </select>
      <div className="flex flex-1 items-center justify-center min-w-md">
        <ZoomOut className="size-5 p-0.5" />
        <input
          type="range"
          min={0.5}
          max={10.0}
          step={0.1}
          value={zoom}
          data-suffix="x"
          onChange={(e) => setZoom(parseFloat(e.currentTarget.value))}
          className="slider px-1 m-1 bg-neutral-800 flex-12"
        />
        <ZoomIn className="size-5 p-0.5" />
      </div>
      <div className="flex-1 max-w-sm h-full flex items-baseline justify-end text-[7px] text-neutral-300 line-clamp-1">
        v{version}
      </div>
    </div>
  )
}

export default EditorFooter
