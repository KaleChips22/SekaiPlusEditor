import { useEffect, useState } from 'react'
import {
  getDefaultTimeSignature,
  hideTimeSignaturePanel,
  setTimeSignature,
  TimeSignaturePanelShown,
} from '../editor/draw'

const TimeSignaturePanel = () => {
  const [r, sr] = useState(false)

  useEffect(() => {
    const q = () => sr((p) => !p)
    document.addEventListener('mouseup', q)

    return () => document.removeEventListener('mouseup', q)
  }, [r, sr])

  const hide = () => {
    hideTimeSignaturePanel()
    sr((p) => !p)
  }

  return (
    <>
      {TimeSignaturePanelShown && (
        <div className='fixed inset-0 z-9999 bg-black/20 flex items-center justify-center'>
          <div className='p-2 text-xs text-white bg-neutral-800 border border-neutral-700 rounded-sm flex flex-col gap-4 items-center justify-center z-101'>
            <h2 className='font-bold text-sm'>Set Time Signature</h2>
            <div className='flex gap-1 items-center justify-center'>
              <span className='pr-2'>Time Signature: </span>
              <input
                type='number'
                defaultValue={getDefaultTimeSignature().top}
                className='ring-0 outline-0 bg-neutral-900 px-2 py-1 w-20'
                onChange={(e) =>
                  setTimeSignature(
                    parseInt(e.target.value) || 0,
                    getDefaultTimeSignature().bottom
                  )
                }
              />
              <span>/</span>
              <input
                type='number'
                defaultValue={getDefaultTimeSignature().bottom}
                className='ring-0 outline-0 bg-neutral-900 px-2 py-1 w-20'
                onChange={(e) =>
                  setTimeSignature(
                    getDefaultTimeSignature().top,
                    parseInt(e.target.value) || 4
                  )
                }
              />
            </div>
            <button
              onClick={hide}
              className='bg-neutral-900 px-2 py-1 rounded-sm'
            >
              Ok
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default TimeSignaturePanel
