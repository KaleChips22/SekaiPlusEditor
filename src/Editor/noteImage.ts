import * as noteSprites from '../../public/editor_sprites/notes.json'

export const getRect = (partName: string) => {
  if (!(partName in noteSprites)) return null

  const [x, y, w, h] = (noteSprites as any)[partName]

  return { x, y, w, h }
}
