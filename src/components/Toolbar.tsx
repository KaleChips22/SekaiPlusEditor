const ToolBar = () => (
  <div className='h-full w-full bg-neutral-800 px-1.5 flex items-center text-white'>
    <div className='flex gap-1 items-center justify-start w-full h-full'>
      {new Array(16).fill(
        <div className='size-5 hover:bg-neutral-600 bg-neutral-700 active:bg-purple-500 rounded-xs' />
      )}
    </div>
  </div>
)

export default ToolBar
