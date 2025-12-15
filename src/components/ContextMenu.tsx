import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import {
  connectHolds,
  copy,
  cut,
  deleteSelected,
  flipSelection,
  paste,
  repeatHoldMids,
  setSelectedEaseType,
  setSelectedFlickType,
  setSelectedHoldsHidden,
  setSelectedTickType,
  shrinkSelectedDown,
  shrinkSelectedUp,
  splitHold,
} from '../editor/draw'
import { ChevronRight } from 'lucide-react'
import { EasingType, FlickDirection, TickType } from '../editor/note'

const ContextMenu = () => {
  const [isHidden, setIsHidden] = useState(true)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const eh = (e: MouseEvent) => {
      e.preventDefault()
      setPos({ x: e.x, y: e.y })
      setIsHidden(false)
    }

    window.addEventListener('contextmenu', eh)
    return () => window.removeEventListener('contextmenu', eh)
  }, [])

  const items = [
    {
      label: 'Delete',
      action: () => deleteSelected(),
    },
    {
      type: 'separator',
    },
    {
      label: 'Cut',
      action: () => cut(),
    },
    {
      label: 'Copy',
      action: () => copy(),
    },
    {
      label: 'Paste',
      action: () => paste(),
    },
    {
      label: 'Flip Paste',
      action: () => paste(true),
    },
    {
      label: 'Flip',
      action: () => flipSelection(),
    },
    {
      type: 'separator',
    },
    {
      label: 'Ease Type',
      submenu: [
        {
          label: 'Linear',
          action: () => setSelectedEaseType(EasingType.Linear),
        },
        {
          label: 'Ease In',
          action: () => setSelectedEaseType(EasingType.EaseIn),
        },
        {
          label: 'Ease Out',
          action: () => setSelectedEaseType(EasingType.EaseOut),
        },
      ],
    },
    {
      label: 'Step Type',
      submenu: [
        {
          label: 'Normal',
          action: () => setSelectedTickType(TickType.Normal),
        },
        {
          label: 'Hidden',
          action: () => setSelectedTickType(TickType.Hidden),
        },
        {
          label: 'Skip',
          action: () => setSelectedTickType(TickType.Skip),
        },
      ],
    },
    {
      label: 'Flick Type',
      submenu: [
        {
          label: 'Default',
          action: () => setSelectedFlickType(FlickDirection.Default),
        },
        {
          label: 'Left',
          action: () => setSelectedFlickType(FlickDirection.Left),
        },
        {
          label: 'Right',
          action: () => setSelectedFlickType(FlickDirection.Right),
        },
      ],
    },
    {
      label: 'Hold Type',
      submenu: [
        {
          label: 'Normal',
          action: () => setSelectedHoldsHidden(false),
        },
        {
          label: 'Hidden',
          action: () => setSelectedHoldsHidden(true),
        },
      ],
    },
    {
      type: 'separator',
    },
    {
      label: 'Shrink Up',
      action: () => shrinkSelectedUp(),
    },
    {
      label: 'Shrink Down',
      action: () => shrinkSelectedDown(),
    },
    {
      type: 'separator',
    },
    {
      label: 'Repeat Hold Mids',
      action: () => repeatHoldMids(),
    },
    {
      label: 'Connect Holds',
      action: () => connectHolds(),
    },
    {
      label: 'Split Hold',
      action: () => splitHold(),
    },
  ]

  const height = items.reduce(
    (s, x) => (x?.type === 'separator' ? s + 9 : s + 21),
    0,
  )

  return (
    <>
      <div
        className={twMerge(
          'p-1 rounded-md bg-neutral-800 border-1 border-neutral-700 text-white z-9999 fixed text-xs min-w-40 flex flex-col items-center justify-center',
          isHidden && 'hidden',
        )}
        style={{
          top:
            Math.max(
              30,
              Math.min(pos.y, document.body.clientHeight - height - 30),
            ) + 'px',
          left: pos.x + 'px',
        }}
      >
        {items.map((i, idx) =>
          i.type === 'separator' ? (
            <div className="h-[1px] w-full m-1 bg-neutral-600" key={idx} />
          ) : (
            <div
              className={twMerge(
                'w-full px-2 py-0.5 rounded-sm hover:bg-neutral-700/50 text-xs text-neutral-300 hover:text-white relative',
                'submenu' in i ? 'group' : '',
              )}
              {...('action' in i
                ? {
                    onClick: () => {
                      i.action!()
                      setIsHidden(true)
                    },
                  }
                : {})}
              key={idx}
            >
              <div className="flex w-full items-center justify-center gap-1">
                <span className="flex-1">{i.label}</span>
                {'submenu' in i && (
                  <ChevronRight className="size-3 color-inherit" />
                )}
              </div>
              {'submenu' in i && (
                <div className="hidden group-hover:flex absolute -top-1 left-full z-100 w-fit min-h-full p-2">
                  <div className="p-1 rounded-md bg-neutral-800 border-1 border-neutral-700 text-white z-9999 text-xs min-w-25 flex flex-col items-center justify-center">
                    {i.submenu!.map((subI, subIndex) => (
                      <div
                        key={subIndex}
                        className="w-full px-2 py-0.5 rounded-sm hover:bg-neutral-700/50 text-xs text-neutral-300 hover:text-white relative"
                        onClick={() => {
                          subI.action()
                          setIsHidden(true)
                        }}
                      >
                        {subI.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ),
        )}
      </div>
      <div
        className={twMerge(
          'w-screen h-screen fixed top-0 left-0 bottom-0 right-0 z-9998',
          isHidden && 'hidden',
        )}
        onClick={() => setIsHidden(true)}
      />
    </>
  )
}

export default ContextMenu
