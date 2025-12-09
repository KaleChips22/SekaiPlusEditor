import { useState } from 'react'
import { twMerge } from 'tailwind-merge'
import ChartProperties from './ChartProperties'
import NoteOptions from './NoteOptions'
import Layers from './Layers'

const Sidebar = () => {
  const [tabSelection1, setTabSelection1] = useState<
    'chartProperties' | 'noteProperties'
  >('chartProperties')

  const [tabSelection2, setTabSelection2] = useState<'options' | 'layers'>(
    'options',
  )

  return (
    <>
      <div className="bg-neutral-800 flex flex-col flex-1">
        <div className="flex-1 text-xs bg-neutral-800 border-b border-accent flex">
          <div
            className={twMerge(
              'px-1 py-0.5 text-white rounded-t-xs ml-1 line-clamp-1',
              tabSelection1 === 'chartProperties'
                ? 'bg-accent'
                : 'bg-neutral-700',
            )}
            onClick={() => setTabSelection1('chartProperties')}
          >
            Chart Properties
          </div>
          {/*<div
            className={twMerge(
              'px-1 py-0.5 text-white rounded-t-xs ml-0.5 line-clamp-1',
              tabSelection1 === 'noteProperties'
                ? 'bg-accent'
                : 'bg-neutral-700',
            )}
            onClick={() => setTabSelection1('noteProperties')}
          >
            Note Properties
          </div>*/}
        </div>
        <div className="w-full h-full bg-neutral-700 p-2 text-sm text-white">
          {tabSelection1 === 'chartProperties' && <ChartProperties />}
          {/*{tabSelection1 === 'noteProperties' && <div>TODO</div>}*/}
        </div>
        <div className="pt-1 flex-1 text-xs bg-neutral-800 border-b border-accent flex">
          <div
            className={twMerge(
              'px-1 py-0.5 text-white rounded-t-xs ml-1 line-clamp-1',
              tabSelection2 === 'options' ? 'bg-accent' : 'bg-neutral-700',
            )}
            onClick={() => setTabSelection2('options')}
          >
            Options
          </div>
          <div
            className={twMerge(
              'px-1 py-0.5 text-white rounded-t-xs ml-1 line-clamp-1',
              tabSelection2 === 'layers' ? 'bg-accent' : 'bg-neutral-700',
            )}
            onClick={() => setTabSelection2('layers')}
          >
            Layers
          </div>
        </div>
        <div className="w-full h-[50%] bg-neutral-700 p-2 text-sm text-white overflow-y-scroll">
          {tabSelection2 === 'options' && <NoteOptions />}
          {tabSelection2 === 'layers' && <Layers />}
        </div>
      </div>
    </>
  )
}

export default Sidebar
