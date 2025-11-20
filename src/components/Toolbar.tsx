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
import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import {
  copy,
  cut,
  exportUSC,
  nextNoteOptions,
  paste,
  savePJSK,
} from '../editor/draw'
import { FlickDirection, TickType } from '../editor/note'
import { newFile, openFile } from '../editor/fileOps'

const ToolBar = ({
  selectedTool,
  setSelectedTool,
}: {
  selectedTool: number
  setSelectedTool: (x: number) => void
}) => {
  // const [activeTool, setActiveTool] = useState(12) // Default to 'cursor' tool

  const [tickIconNum, setTickIconNum] = useState(0)
  const [flickIconNum, setFlickIconNum] = useState(0)

  const tools = [
    { label: 'new', icon: <FilePlus2 />, action: () => newFile() },
    { label: 'open', icon: <FolderOpen />, action: () => openFile() },
    { label: 'save', icon: <Save />, action: () => savePJSK() },
    { label: 'export', icon: <FileOutput />, action: () => exportUSC() },
    { type: 'separator' },
    { label: 'cut', icon: <Scissors />, action: () => cut() },
    { label: 'copy', icon: <Copy />, action: () => copy() },
    { label: 'paste', icon: <Clipboard />, action: () => paste() },
    { type: 'separator' },
    { label: 'undo', icon: <Undo2 />, action: () => {} },
    { label: 'redo', icon: <Redo2 />, action: () => {} },
    { type: 'separator' },
    {
      label: 'cursor',
      icon: 'timeline_select',
      action: () => setSelectedTool(0),
    },
    {
      label: 'tap_note',
      icon: 'timeline_tap',
      action: () => setSelectedTool(1),
    },
    {
      label: 'hold_note',
      icon: 'timeline_hold',
      action: () => setSelectedTool(2),
    },
    {
      label: 'hold_tick',
      icon:
        tickIconNum === 0
          ? 'timeline_hold_step_normal'
          : tickIconNum === 1
            ? 'timeline_hold_step_hidden'
            : 'timeline_hold_step_skip',
      action: () => setSelectedTool(3),
    },
    {
      label: 'flick_note',
      icon:
        flickIconNum === 0
          ? 'timeline_flick_default'
          : flickIconNum === 1
            ? 'timeline_flick_left'
            : 'timeline_flick_right',
      action: () => setSelectedTool(4),
    },
    {
      label: 'gold_note',
      icon: 'timeline_critical',
      action: () => setSelectedTool(5),
    },
    {
      label: 'trace_note',
      icon: 'timeline_trace',
      action: () => setSelectedTool(6),
    },
    {
      label: 'guide',
      icon: 'timeline_guide_green',
      action: () => setSelectedTool(7),
    },
    {
      label: 'bpm_change',
      icon: 'timeline_bpm',
      action: () => setSelectedTool(8),
    },
    {
      label: 'time_signature',
      icon: 'timeline_time_signature',
      action: () => setSelectedTool(9),
    },
    {
      label: 'hi_speed',
      icon: 'timeline_hi_speed',
      action: () => setSelectedTool(10),
    },
  ]

  useEffect(() => {
    const updateTool = (e: KeyboardEvent) => {
      if (document.activeElement?.nodeName === 'INPUT') return

      const keyNum = parseInt(e.key)
      if (isNaN(keyNum)) return
      const newTool = keyNum === 0 ? 10 : keyNum - 1 + +(keyNum > 7)
      if (newTool === selectedTool) {
        if (newTool === 3) {
          setTickIconNum((tickIconNum + 1) % 3)
          nextNoteOptions.tickType = [
            TickType.Hidden,
            TickType.Skip,
            TickType.Normal,
          ][tickIconNum]
        }

        if (newTool === 4) {
          setFlickIconNum((flickIconNum + 1) % 3)
          nextNoteOptions.flickDir = [
            FlickDirection.Left,
            FlickDirection.Right,
            FlickDirection.Default,
          ][flickIconNum]
        }
      }
      setSelectedTool(newTool)
    }
    window.addEventListener('keyup', updateTool)

    return () => window.removeEventListener('keyup', updateTool)
  }, [selectedTool, tickIconNum, flickIconNum])

  return (
    <div className="h-full w-full bg-neutral-800 px-1.5 flex items-center text-white">
      <div className="flex gap-1 items-center justify-start w-full h-full">
        {tools.map((tool, index) =>
          tool.type === 'separator' ? (
            <div key={index} className="h-5 w-[1px] bg-neutral-700" />
          ) : (
            <div
              className={twMerge(
                'size-5 hover:bg-neutral-700 rounded-xs overflow-hidden flex items-center justify-center p-0.5',
                selectedTool + 12 === index && 'bg-accent hover:bg-accent',
              )}
              onClick={tool.action}
              key={index}
            >
              {typeof tool.icon === 'string' ? (
                <img src={`timeline_icons/${tool.icon}.png`} />
              ) : (
                tool.icon
              )}
            </div>
          ),
        )}
      </div>
    </div>
  )
}

export default ToolBar
