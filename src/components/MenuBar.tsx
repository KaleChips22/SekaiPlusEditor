import { Minus, Square, X } from 'lucide-react'
import { menuData, titleBarHeight } from '../../shared'
import { getAccelerator, getMenuItemName, shortcutString } from '../lib'
import runCommand from '../commands'

const MenuBar = ({ isMac }: { isMac: boolean }) => (
  <div className='flex-1 w-full bg-neutral-800 text-neutral-200 flex items-center justify-start gap-1'>
    {menuData.map((item) => (
      <div
        key={item.label}
        className='relative group'
      >
        <div className='group-hover:bg-neutral-700 rounded-sm px-2 py-1 cursor-pointer'>
          {item.label}
        </div>

        <div className='absolute top-full hidden group-hover:block py-1 z-9999'>
          <div className='p-2 bg-neutral-700 rounded-sm min-w-3xs'>
            {item.submenu.map((subItem, index) =>
              (subItem as any)?.type === 'separator' ? (
                <hr
                  key={index}
                  className='my-0.5 text-neutral-800'
                />
              ) : (
                <div
                  key={index}
                  className='hover:bg-neutral-800/50 rounded-sm px-2 py-1 cursor-pointer whitespace-nowrap'
                >
                  <SubmenuItem
                    item={subItem}
                    isMac={isMac}
                  />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    ))}
    <div className='flex-1 w-full h-full drag'></div>
    <div className='flex items-center justify-end'>
      <div
        className='aspect-square flex items-center justify-center hover:bg-neutral-700 text-xl p-2.5'
        style={{
          height: `${titleBarHeight}px`,
        }}
        onClick={() => {
          window.ipcRenderer.send('minimize-window')
        }}
      >
        <Minus />
      </div>
      <div
        className='aspect-square flex items-center justify-center hover:bg-neutral-700 text-xl p-2.5'
        style={{
          height: `${titleBarHeight}px`,
        }}
        onClick={() => {
          window.ipcRenderer.send('maximize-window')
        }}
      >
        <Square />
      </div>
      <div
        className='aspect-square flex items-center justify-center hover:bg-red-700 text-xl p-2.5'
        style={{
          height: `${titleBarHeight}px`,
        }}
        onClick={() => {
          window.ipcRenderer.send('close-window')
        }}
      >
        <X />
      </div>
    </div>
  </div>
)

export default MenuBar

const SubmenuItem = ({ item, isMac }: { item: any; isMac: boolean }) => (
  <div
    className='w-full flex items-center justify-between'
    onClick={() => runCommand(item.action)}
  >
    {item?.label ?? getMenuItemName(item.role)}
    <span className='text-sm text-neutral-500'>
      {shortcutString(item?.accelerator ?? getAccelerator(item.role), isMac)}
    </span>
  </div>
)
