import * as noteSprites from '../sprite_sheet/notes.json'

export const getRect = (partName: string) => {
  if (!(partName in noteSprites)) return null

  const [x, y, w, h] = (noteSprites as any)[partName]

  return { x, y, w, h }
}
