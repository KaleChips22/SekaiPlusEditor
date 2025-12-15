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
  redo,
  savePJSK,
  undo,
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
    {
      label: 'new',
      icon: <FilePlus2 />,
      action: () => newFile(),
      toolTip: 'New File',
    },
    {
      label: 'open',
      icon: <FolderOpen />,
      action: () => openFile(),
      toolTip: 'Open File',
    },
    {
      label: 'save',
      icon: <Save />,
      action: () => savePJSK(),
      toolTip: 'Save File',
    },
    {
      label: 'export',
      icon: <FileOutput />,
      action: () => exportUSC(),
      toolTip: 'Export File',
    },
    { type: 'separator' },
    { label: 'cut', icon: <Scissors />, action: () => cut(), toolTip: 'Cut' },
    { label: 'copy', icon: <Copy />, action: () => copy(), toolTip: 'Copy' },
    {
      label: 'paste',
      icon: <Clipboard />,
      action: () => paste(),
      toolTip: 'Paste',
    },
    { type: 'separator' },
    { label: 'undo', icon: <Undo2 />, action: () => undo(), toolTip: 'Undo' },
    { label: 'redo', icon: <Redo2 />, action: () => redo(), toolTip: 'Redo' },
    { type: 'separator' },
    {
      label: 'cursor',
      icon: 'timeline_select',
      action: () => setSelectedTool(0),
      toolTip: 'Select',
    },
    {
      label: 'tap_note',
      icon: 'timeline_tap',
      action: () => setSelectedTool(1),
      toolTip: 'Tap Note',
    },
    {
      label: 'hold_note',
      icon: 'timeline_hold',
      action: () => setSelectedTool(2),
      toolTip: 'Hold Note',
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
      toolTip: 'Hold Tick',
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
      toolTip: 'Flick Note',
    },
    {
      label: 'gold_note',
      icon: 'timeline_critical',
      action: () => setSelectedTool(5),
      toolTip: 'Gold Note',
    },
    {
      label: 'trace_note',
      icon: 'timeline_trace',
      action: () => setSelectedTool(6),
      toolTip: 'Trace Note',
    },
    {
      label: 'guide',
      icon: 'timeline_guide_green',
      action: () => setSelectedTool(7),
      toolTip: 'Guide',
    },
    {
      label: 'bpm_change',
      icon: 'timeline_bpm',
      action: () => setSelectedTool(8),
      toolTip: 'BPM Change',
    },
    {
      label: 'time_signature',
      icon: 'timeline_time_signature',
      action: () => setSelectedTool(9),
      toolTip: 'Time Signature',
    },
    {
      label: 'hi_speed',
      icon: 'timeline_hi_speed',
      action: () => setSelectedTool(10),
      toolTip: 'Hi Speed',
    },
    {
      label: 'fever',
      icon: 'timeline_fever',
      action: () => setSelectedTool(11),
      toolTip: 'Fever',
    },
    {
      label: 'skill',
      icon: 'timeline_skill',
      action: () => setSelectedTool(12),
      toolTip: 'Skill',
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
  }, [selectedTool, tickIconNum, flickIconNum, setSelectedTool])

  return (
    <div className="h-full w-full bg-neutral-800 px-1.5 flex items-center text-white">
      <div className="flex gap-1 items-center justify-start w-full h-full">
        {tools.map((tool, index) =>
          tool.type === 'separator' ? (
            <div key={index} className="h-5 w-[1px] bg-neutral-700" />
          ) : (
            <div
              className={twMerge(
                'size-5 hover:bg-neutral-700 rounded-xs flex items-center justify-center p-0.5 relative group',
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
              <div className="absolute top-full left-1/2 -translate-x-1/2 bg-neutral-900 hidden group-hover:flex p-0.5 text-xs z-900000 gap-0.5 flex-row">
                {tool.toolTip?.split(' ').map((word, i) => (
                  <span key={i}>{word}</span>
                ))}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}

export default ToolBar
