import { useEffect, useState } from 'react'
import {
  bpmChangePanelShown,
  getDefaultBPM,
  hideBPMChangePanel,
  setBPM,
  updateOffsetCache,
} from '../editor/draw'

const BPMChangePanel = () => {
  const [r, sr] = useState(false)

  useEffect(() => {
    const q = () => sr((p) => !p)
    document.addEventListener('mouseup', q)

    return () => document.removeEventListener('mouseup', q)
  }, [r, sr])

  const hide = () => {
    hideBPMChangePanel()
    sr((p) => !p)
  }

  return (
    <>
      {bpmChangePanelShown && (
        <div className="fixed inset-0 z-9999 bg-black/20 flex items-center justify-center">
          <div className="p-2 text-xs text-white bg-neutral-800 border border-neutral-700 rounded-sm flex flex-col gap-4 items-center justify-center z-101">
            <h2 className="font-bold text-sm">Set BPM</h2>
            <div className="flex gap-3 items-center justify-center">
              <span>BPM: </span>
              <input
                type="number"
                defaultValue={getDefaultBPM()}
                className="ring-0 outline-0 bg-neutral-900 px-2 py-1"
                onChange={(e) => {
                  setBPM(parseFloat(e.target.value) || 0)
                  updateOffsetCache()
                }}
              />
            </div>
            <button
              onClick={hide}
              className="bg-neutral-900 px-2 py-1 rounded-sm"
            >
              Ok
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default BPMChangePanel
