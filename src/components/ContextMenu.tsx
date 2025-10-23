import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { deleteSelected } from '../editor/draw'

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
      action: deleteSelected,
    },
    {
      type: 'separator',
    },
    {
      label: 'Cut',
      action: () => {},
    },
    {
      label: 'Copy',
      action: () => {},
    },
    {
      label: 'Paste',
      action: () => {},
    },
    {
      label: 'Flip Paste',
      action: () => {},
    },
    {
      label: 'Flip',
      action: () => {},
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
      action: () => {},
    },
    {
      label: 'Shrink Down',
      action: () => {},
    },
    {
      type: 'separator',
    },
    {
      label: 'Connect Holds',
      action: () => {},
    },
    {
      label: 'Split Hold',
      action: () => {},
    },
  ]

  return (
    <>
      <div
        className={twMerge(
          'p-1 rounded-md bg-neutral-800 border-1 border-neutral-700 text-white z-9999 fixed text-sm min-w-40 flex flex-col items-center justify-center',
          isHidden && 'hidden'
        )}
        style={{
          top: pos.y,
          left: pos.x,
        }}
      >
        {items.map((i) =>
          i.type === 'separator' ? (
            <div className='h-[1px] w-full m-1 bg-neutral-600' />
          ) : (
            <div
              className='w-full p-1 rounded-sm hover:bg-neutral-700/50 text-xs text-neutral-300 hover:text-white'
              onClick={() => {
                i.action!()
                setIsHidden(true)
              }}
            >
              {i.label}
            </div>
          )
        )}
      </div>
      <div
        className={twMerge(
          'w-screen h-screen fixed top-0 left-0 bottom-0 right-0 z-9998',
          isHidden && 'hidden'
        )}
        onClick={() => setIsHidden(true)}
      />
    </>
  )
}

export default ContextMenu
