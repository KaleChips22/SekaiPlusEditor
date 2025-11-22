import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import {
  connectHolds,
  copy,
  cut,
  deleteSelected,
  flipSelection,
  paste,
  shrinkSelectedDown,
  shrinkSelectedUp,
  splitHold,
} from '../editor/draw'

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
    // {
    //   type: 'separator',
    // },
    // {
    //   label: 'Ease Type',
    //   action: () => {},
    // },
    // {
    //   label: 'Step Type',
    //   action: () => {},
    // },
    // {
    //   label: 'Flick Type',
    //   action: () => {},
    // },
    // {
    //   label: 'Hold Type',
    //   action: () => {},
    // },
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
              className="w-full px-2 py-0.5 rounded-sm hover:bg-neutral-700/50 text-xs text-neutral-300 hover:text-white"
              onClick={() => {
                i.action!()
                setIsHidden(true)
              }}
              key={idx}
            >
              {i.label}
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
