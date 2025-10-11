import {
  Clipboard,
  Copy,
  FileOutput,
  FilePlus2,
  FolderOpen,
  Redo2,
  Save,
  Scissors,
  Undo2,
} from 'lucide-react'
import { useState } from 'react'
import { twMerge } from 'tailwind-merge'

const ToolBar = () => {
  const [activeTool, setActiveTool] = useState(12) // Default to 'cursor' tool

  const tools = [
    { label: 'new', icon: <FilePlus2 />, action: () => {} },
    { label: 'open', icon: <FolderOpen />, action: () => {} },
    { label: 'save', icon: <Save />, action: () => {} },
    { label: 'export', icon: <FileOutput />, action: () => {} },
    { type: 'separator' },
    { label: 'cut', icon: <Scissors />, action: () => {} },
    { label: 'copy', icon: <Copy />, action: () => {} },
    { label: 'paste', icon: <Clipboard />, action: () => {} },
    { type: 'separator' },
    { label: 'undo', icon: <Undo2 />, action: () => {} },
    { label: 'redo', icon: <Redo2 />, action: () => {} },
    { type: 'separator' },
    {
      label: 'cursor',
      icon: 'timeline_select',
      action: () => setActiveTool(12),
    },
    {
      label: 'tap_note',
      icon: 'timeline_tap',
      action: () => setActiveTool(13),
    },
    {
      label: 'hold_note',
      icon: 'timeline_hold',
      action: () => setActiveTool(14),
    },
    {
      label: 'hold_tick',
      icon: 'timeline_hold_step_normal',
      action: () => setActiveTool(15),
    },
    {
      label: 'flick_note',
      icon: 'timeline_flick_default',
      action: () => setActiveTool(16),
    },
    {
      label: 'gold_note',
      icon: 'timeline_critical',
      action: () => setActiveTool(17),
    },
    {
      label: 'trace_note',
      icon: 'timeline_trace',
      action: () => setActiveTool(18),
    },
    {
      label: 'guide',
      icon: 'timeline_guide_green',
      action: () => setActiveTool(19),
    },
    {
      label: 'bpm_change',
      icon: 'timeline_bpm',
      action: () => setActiveTool(20),
    },
    {
      label: 'time_signature',
      icon: 'timeline_time_signature',
      action: () => setActiveTool(21),
    },
    {
      label: 'hi_speed',
      icon: 'timeline_hi_speed',
      action: () => setActiveTool(22),
    },
  ]

  return (
    <div className='h-full w-full bg-neutral-800 px-1.5 flex items-center text-white'>
      <div className='flex gap-1 items-center justify-start w-full h-full'>
        {tools.map((tool, index) =>
          tool.type === 'separator' ? (
            <div
              key={index}
              className='h-5 w-[1px] bg-neutral-700'
            />
          ) : (
            <div
              className={twMerge(
                'size-5 hover:bg-neutral-700 rounded-xs overflow-hidden flex items-center justify-center p-0.5',
                activeTool === index && 'bg-purple-600 hover:bg-purple-600'
              )}
              onClick={tool.action}
              key={index}
            >
              {typeof tool.icon === 'string' ? (
                <img src={`/timeline_icons/${tool.icon}.png`} />
              ) : (
                tool.icon
              )}
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default ToolBar
