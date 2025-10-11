import { titleBarHeight, trafficLightsSize } from '../../shared'

const trafficLightOffset = (titleBarHeight - trafficLightsSize.h) / 2

const Titlebar = ({
  isMac,
  isFullscreen,
}: {
  isMac: boolean
  isFullscreen: boolean
}) => {
  return (
    <div
      className='bg-neutral-800 flex items-center justify-center p-2 drag w-fit'
      style={{ height: `${titleBarHeight}px` }}
    >
      {isMac && (
        <div
          className='transition-all'
          style={{
            margin: `${trafficLightOffset}px`,
            marginLeft: '2px',
            width: isFullscreen ? 0 : `${trafficLightsSize.w}px`,
            height: `${trafficLightsSize.h}px`,
          }}
        />
      )}
      <div className='flex-1'>
        <h1 className='text-white font-bold line-clamp-1 w-34'>
          Sekai Plus Editor
        </h1>
      </div>
    </div>
  )
}

export default Titlebar
