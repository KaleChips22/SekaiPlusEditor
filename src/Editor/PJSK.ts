import {
  BPMChange,
  HiSpeed,
  HiSpeedLayer,
  HoldEnd,
  HoldStart,
  HoldTick,
  Note,
  TapNote,
  TimeSignature,
} from './note'

export const notesToPJSK = (
  layers: HiSpeedLayer[],
  notes: Note[],
  offset: number,
) => {
  const map = new Map<Note, any>()
  const clones: any[] = []

  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]
    let c: any

    if (n.type === 'Tap') {
      const t = n as TapNote
      c = {
        type: 'Tap',
        beat: t.beat,
        lane: t.lane,
        size: t.size,
        isGold: t.isGold,
        isTrace: t.isTrace,
        flickDir: t.flickDir,
        layer: t.layer ? layers.indexOf(t.layer) : undefined,
      } as any
    } else if (n.type === 'HoldStart') {
      const h = n as HoldStart
      c = {
        type: 'HoldStart',
        beat: h.beat,
        lane: h.lane,
        size: h.size,
        isGold: h.isGold,
        isTrace: h.isTrace,
        isHidden: h.isHidden,
        isGuide: h.isGuide,
        easingType: h.easingType,
        // placeholders; will rewire after all clones are created
        nextNode: {} as HoldEnd,
        layer: h.layer ? layers.indexOf(h.layer) : undefined,
      } as any
    } else if (n.type === 'HoldTick') {
      const h = n as HoldTick
      c = {
        type: 'HoldTick',
        beat: h.beat,
        lane: h.lane,
        size: h.size,
        isGold: h.isGold,
        isGuide: h.isGuide,
        tickType: h.tickType,
        easingType: h.easingType,
        nextNode: {} as HoldEnd,
        prevNode: {} as HoldStart,
        layer: h.layer ? layers.indexOf(h.layer) : undefined,
      } as any
    } else if (n.type === 'HoldEnd') {
      const h = n as HoldEnd
      c = {
        type: 'HoldEnd',
        beat: h.beat,
        lane: h.lane,
        size: h.size,
        isGold: h.isGold,
        isTrace: h.isTrace,
        isHidden: h.isHidden,
        flickDir: h.flickDir,
        prevNode: {} as HoldStart,
        layer: h.layer ? layers.indexOf(h.layer) : undefined,
      } as any
    } else if (n.type === 'BPMChange') {
      const b = n as BPMChange
      c = {
        type: 'BPMChange',
        beat: b.beat,
        lane: 0,
        size: 0,
        BPM: b.BPM,
      } as any
    } else if (n.type === 'HiSpeed') {
      const h = n as HiSpeed
      c = {
        type: 'HiSpeed',
        beat: h.beat,
        lane: 0,
        size: 0,
        speed: h.speed,
        layer: h.layer ? layers.indexOf(h.layer) : undefined,
      } as any
    } else if (n.type === 'TimeSignature') {
      const t = n as TimeSignature
      c = {
        type: 'TimeSignature',
        beat: t.beat,
        lane: 0,
        size: 0,
        top: t.top,
        bottom: t.bottom,
      } as any
    } else {
      // fallback shallow clone for unknown types
      c = JSON.parse(JSON.stringify(n))
    }

    c.id = i

    map.set(n, c)
    clones.push(c)
  }

  for (const orig of notes) {
    const clone = map.get(orig)!

    if ('nextNode' in (orig as any) && (orig as any).nextNode) {
      const on = (orig as any).nextNode as Note
      const cn = map.get(on)
      if (cn) clone.nextNode = cn.id
      else delete clone.nextNode
    }

    if ('prevNode' in (orig as any) && (orig as any).prevNode) {
      const on = (orig as any).prevNode as Note
      const cn = map.get(on)
      if (cn) clone.prevNode = cn.id
      else delete clone.prevNode
    }
  }

  return {
    offset,
    version: 1.0,
    notes: clones,
    layers: layers.map((layer) => ({ name: layer.name })),
  }
}

export const PJSKToNotes = (chart: any) => {
  const { notes, offset }: { notes: any[]; offset: number } = chart
  const layers: HiSpeedLayer[] = chart.layers
    ? chart.layers.map((layer: any) => ({ name: layer.name }))
    : [{ name: 'Default Layer' }]
  const map = new Map<any, Note>()
  const clones: Note[] = []

  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]
    let c: Note

    if (n.type === 'Tap') {
      const t = n as TapNote
      c = {
        type: 'Tap',
        beat: t.beat,
        lane: t.lane,
        size: t.size,
        isGold: t.isGold,
        isTrace: t.isTrace,
        flickDir: t.flickDir,
        layer: typeof t.layer === 'number' ? layers[t.layer] : layers[0],
      } as TapNote
    } else if (n.type === 'HoldStart') {
      const h = n as HoldStart
      c = {
        type: 'HoldStart',
        beat: h.beat,
        lane: h.lane,
        size: h.size,
        isGold: h.isGold,
        isTrace: h.isTrace,
        isHidden: h.isHidden,
        isGuide: h.isGuide,
        easingType: h.easingType,
        // placeholders; will rewire after all clones are created
        nextNode: {} as HoldEnd,
        layer: typeof h.layer === 'number' ? layers[h.layer] : layers[0],
      } as HoldStart
    } else if (n.type === 'HoldTick') {
      const h = n as HoldTick
      c = {
        type: 'HoldTick',
        beat: h.beat,
        lane: h.lane,
        size: h.size,
        isGold: h.isGold,
        isGuide: h.isGuide,
        tickType: h.tickType,
        easingType: h.easingType,
        nextNode: {} as HoldEnd,
        prevNode: {} as HoldStart,
        layer: typeof h.layer === 'number' ? layers[h.layer] : layers[0],
      } as HoldTick
    } else if (n.type === 'HoldEnd') {
      const h = n as HoldEnd
      c = {
        type: 'HoldEnd',
        beat: h.beat,
        lane: h.lane,
        size: h.size,
        isGold: h.isGold,
        isTrace: h.isTrace,
        isHidden: h.isHidden,
        flickDir: h.flickDir,
        prevNode: {} as HoldStart,
        layer: typeof h.layer === 'number' ? layers[h.layer] : layers[0],
      } as HoldEnd
    } else if (n.type === 'BPMChange') {
      const b = n as BPMChange
      c = {
        type: 'BPMChange',
        beat: b.beat,
        lane: 0,
        size: 0,
        BPM: b.BPM,
      } as BPMChange
    } else if (n.type === 'HiSpeed') {
      const h = n as HiSpeed
      c = {
        type: 'HiSpeed',
        beat: h.beat,
        lane: 0,
        size: 0,
        speed: h.speed,
        layer: typeof h.layer === 'number' ? layers[h.layer] : layers[0],
      } as HiSpeed
    } else if (n.type === 'TimeSignature') {
      const t = n as TimeSignature
      c = {
        type: 'TimeSignature',
        beat: t.beat,
        lane: 0,
        size: 0,
        top: t.top,
        bottom: t.bottom,
      } as TimeSignature
    } else {
      // fallback shallow clone for unknown types
      c = JSON.parse(JSON.stringify(n))
    }

    map.set(n, c)
    clones.push(c)
  }

  for (const orig of notes) {
    const clone = map.get(orig)!

    if ('nextNode' in (orig as any) && (orig as any).nextNode) {
      const on = notes.filter((n) => n.id === (orig as any).nextNode)[0]
      const cn = map.get(on)
      if (cn) (clone as any).nextNode = cn
      else delete (clone as any).nextNode
    }

    if ('prevNode' in (orig as any) && (orig as any).prevNode) {
      const on = notes.filter((n) => n.id === (orig as any).prevNode)[0]
      const cn = map.get(on)
      if (cn) (clone as any).prevNode = cn
      else delete (clone as any).prevNode
    }
  }

  return {
    offset,
    notes: clones,
    layers,
  }
}
