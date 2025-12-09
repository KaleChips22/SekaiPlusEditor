import { useEffect, useState } from 'react'
import {
  addChartLayer,
  chartLayers,
  removeChartLayer,
  selectedLayerIndex,
  setChartLayers,
  setSelectedLayerIndex,
} from '../../editor/draw'
import { twMerge } from 'tailwind-merge'
import { Check, Pencil, Plus, Trash, X } from 'lucide-react'
import { HiSpeedLayer } from '../../editor/note'

const Layers = () => {
  const [selectedLayer, setSelectedLayer] = useState(selectedLayerIndex)
  const [layers, setLayers] = useState(chartLayers)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')

  const addLayer = (name: string) => {
    addChartLayer(name)
    setLayers(chartLayers)
    setSelectedLayer(layers.length - 1)
  }

  useEffect(() => {
    if (selectedLayer >= layers.length) {
      setSelectedLayer(layers.length - 1)
    } else if (selectedLayer < 0) {
      setSelectedLayer(0)
    }
  }, [selectedLayer, layers])

  useEffect(() => {
    setSelectedLayerIndex(selectedLayer)
  }, [selectedLayer])

  const startEditing = (index: number, currentName: string) => {
    setEditingIndex(index)
    setEditingName(currentName)
  }

  const confirmEdit = (index: number) => {
    if (editingName !== null && editingName !== '') {
      const newLayer: HiSpeedLayer = {
        name: editingName,
      }
      const newLayers = chartLayers.map((l, i) => (i === index ? newLayer : l))
      setChartLayers(newLayers)
      setLayers(newLayers)
    }
    setEditingIndex(null)
    setEditingName('')
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditingName('')
  }

  return (
    <div className="flex flex-col gap-1 overflow-y-scroll max-h-full">
      {layers.map((layer, index) => (
        <Layer
          key={index}
          isSelected={selectedLayer === index}
          onClick={() => editingIndex !== index && setSelectedLayer(index)}
        >
          {editingIndex === index ? (
            <>
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    confirmEdit(index)
                  } else if (e.key === 'Escape') {
                    cancelEdit()
                  }
                }}
                className="flex-1 bg-neutral-700 text-white rounded px-1 py-0.5 text-xs outline-none"
                autoFocus
              />
              <div className="flex items-center justify-center gap-1">
                <Check
                  className="size-3"
                  onClick={(e) => {
                    e.stopPropagation()
                    confirmEdit(index)
                  }}
                />
                <X
                  className="size-3"
                  onClick={(e) => {
                    e.stopPropagation()
                    cancelEdit()
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <span className="flex-1">{layer.name}</span>
              <div className="flex items-center justify-center gap-1">
                <Pencil
                  className="size-3"
                  onClick={(e) => {
                    e.stopPropagation()
                    startEditing(index, layer.name)
                  }}
                />
                <Trash
                  className="size-3"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeChartLayer(layer)
                    setLayers(chartLayers.filter((l) => l !== layer))
                    if (layers[selectedLayer] === layer) {
                      setSelectedLayer(0)
                    } else {
                      setSelectedLayer(selectedLayer - 1)
                    }
                  }}
                />
              </div>
            </>
          )}
        </Layer>
      ))}

      <Layer
        isSelected={false}
        onClick={() => addLayer('Layer #' + (layers.length + 1))}
      >
        <Plus className="size-3" />
        Add Layer
      </Layer>
    </div>
  )
}

export default Layers

const Layer = ({
  children,
  isSelected,
  onClick,
}: {
  children: React.ReactNode
  isSelected: boolean
  onClick: () => void
}) => {
  return (
    <div
      className={twMerge(
        'px-1.5 py-0.5 text-white rounded-xs ml-1 line-clamp-1 text-xs cursor-pointer flex items-center justify-start gap-1',
        isSelected ? 'bg-accent' : 'bg-neutral-800/50',
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
