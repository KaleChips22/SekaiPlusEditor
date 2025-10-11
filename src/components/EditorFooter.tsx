import {
  FastForward,
  Play,
  Rewind,
  Square,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useState } from 'react'

const EditorFooter = () => {
  const [formData, setFormData] = useState({
    division: 16,
    zoom: 3.0,
  })

  return (
    <div className='flex bg-neutral-700 text-sm text-white items-center justify-center px-1'>
      <div className='flex items-center justify-center p-0.5'>
        <Rewind className='size-5 p-0.5' />
        <Square className='size-5 p-0.5' />
        <Play className='size-5 p-0.5' />
        <FastForward className='size-5 p-0.5' />
      </div>
      <select
        value={formData.division}
        onChange={(e) =>
          setFormData({
            ...formData,
            division: parseInt(e.currentTarget.value),
          })
        }
        className='px-1 m-1 bg-neutral-800 rounded-xs outline-0 ring-0'
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
      </select>
      <div className='flex flex-1 items-center justify-center'>
        <ZoomOut className='size-5 p-0.5' />
        <input
          type='range'
          min={0.5}
          max={10.0}
          step={0.1}
          value={formData.zoom}
          data-suffix='x'
          onChange={(e) =>
            setFormData({
              ...formData,
              zoom: parseFloat(e.currentTarget.value),
            })
          }
          className='slider px-1 m-1 bg-neutral-800 flex-12'
        />
        <ZoomIn className='size-5 p-0.5' />
      </div>
    </div>
  )
}

export default EditorFooter
