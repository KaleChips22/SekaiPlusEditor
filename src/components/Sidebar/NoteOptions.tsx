import { useState } from 'react'
import { EasingType, FlickDirection, TickType } from '../../editor/note'
import { setNextNoteOptions } from '../../editor/draw'

const NoteOptions = () => {
  const [formData, setFormData] = useState({
    noteSize: 3,
    easeType: EasingType.Linear,
    tickType: TickType.Normal,
    flickDir: FlickDirection.Default,
  })

  return (
    <div className="grid grid-cols-2 gap-x-1 gap-y-1.5 mb-3">
      <span>Note Size</span>
      <input
        className="bg-neutral-800/50 outline-none ring-0"
        value={formData.noteSize}
        type="number"
        min={1}
        max={12}
        onChange={(e) => {
          setFormData({
            ...formData,
            noteSize: parseInt(e.currentTarget.value),
          })
          setNextNoteOptions({
            size: (parseInt(e.currentTarget.value) || 3) / 2,
          })
        }}
        onBlur={(e) => {
          if (e.currentTarget.value === '') e.currentTarget.value = '3'
        }}
      />
      <span>Tick Type</span>
      <select
        value={formData.tickType}
        className="bg-neutral-800/50 outline-none ring-0 rounded-sm px-1"
        onChange={(e) => {
          setFormData({
            ...formData,
            tickType: parseInt(e.currentTarget.value),
          })
          setNextNoteOptions({
            tickType: parseInt(e.currentTarget.value),
          })
        }}
      >
        <option value={TickType.Normal}>Normal</option>
        <option value={TickType.Hidden}>Hidden</option>
        <option value={TickType.Skip}>Skip</option>
      </select>
      <span>Ease Type</span>
      <select
        value={formData.easeType}
        className="bg-neutral-800/50 outline-none ring-0 rounded-sm px-1"
        onChange={(e) => {
          setFormData({
            ...formData,
            easeType: parseInt(e.currentTarget.value),
          })
          setNextNoteOptions({
            easeType: parseInt(e.currentTarget.value),
          })
        }}
      >
        <option value={EasingType.Linear}>Linear</option>
        <option value={EasingType.EaseIn}>Ease In</option>
        <option value={EasingType.EaseOut}>Ease Out</option>
      </select>
      <span>Flick Direction</span>
      <select
        value={formData.flickDir}
        className="bg-neutral-800/50 outline-none ring-0 rounded-sm px-1"
        onChange={(e) => {
          setFormData({
            ...formData,
            flickDir: parseInt(e.currentTarget.value),
          })
          setNextNoteOptions({
            flickDir: parseInt(e.currentTarget.value),
          })
        }}
      >
        <option value={FlickDirection.Default}>Default</option>
        <option value={FlickDirection.Left}>Left</option>
        <option value={FlickDirection.Right}>Right</option>
      </select>
    </div>
  )
}

export default NoteOptions
