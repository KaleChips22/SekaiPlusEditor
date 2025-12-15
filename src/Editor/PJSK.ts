import { Note } from './note'
import { ChartMetadata } from './draw'

export const notesToPJSK = (
  notes: Note[],
  offset: number,
  isExtendedChart: boolean,
  metadata?: ChartMetadata,
) => {
  const map = new Map<Note, any>()
  const clones: any[] = []

  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]
    let c: any

    if (n.type === 'Tap') {
      c = {
        type: 'Tap',
        beat: n.beat,
        lane: n.lane,
        size: n.size,
        isGold: n.isGold,
        isTrace: n.isTrace,
        flickDir: n.flickDir,
      }
    } else if (n.type === 'HoldStart') {
      c = {
        type: 'HoldStart',
        beat: n.beat,
        lane: n.lane,
        size: n.size,
        isGold: n.isGold,
        isTrace: n.isTrace,
        isHidden: n.isHidden,
        isGuide: n.isGuide,
        easingType: n.easingType,
        // placeholders; will rewire after all clones are created
        nextNode: {} as any,
      } as any
    } else if (n.type === 'HoldTick') {
      c = {
        type: 'HoldTick',
        beat: n.beat,
        lane: n.lane,
        size: n.size,
        isGold: n.isGold,
        isGuide: n.isGuide,
        tickType: n.tickType,
        easingType: n.easingType,
        nextNode: {} as any,
        prevNode: {} as any,
      } as any
    } else if (n.type === 'HoldEnd') {
      c = {
        type: 'HoldEnd',
        beat: n.beat,
        lane: n.lane,
        size: n.size,
        isGold: n.isGold,
        isTrace: n.isTrace,
        isHidden: n.isHidden,
        flickDir: n.flickDir,
        prevNode: {} as any,
      } as any
    } else if (n.type === 'BPMChange') {
      c = {
        type: 'BPMChange',
        beat: n.beat,
        BPM: n.BPM,
        isEvent: true,
      } as any
    } else if (n.type === 'HiSpeed') {
      c = {
        type: 'HiSpeed',
        beat: n.beat,
        speed: n.speed,
        isEvent: true,
      } as any
    } else if (n.type === 'TimeSignature') {
      c = {
        type: 'TimeSignature',
        beat: n.beat,
        top: n.top,
        bottom: n.bottom,
        isEvent: true,
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
    isExtendedChart,
    metadata: metadata || {
      title: '',
      designer: '',
      artist: '',
      jacket: '',
      masterVolume: 100,
      BGMVolume: 100,
      SEVolume: 100,
    },
  }
}

export const PJSKToNotes = (chart: any) => {
  const {
    notes,
    offset,
    isExtendedChart,
    metadata,
  }: {
    notes: any[]
    offset: number
    isExtendedChart: boolean
    metadata?: ChartMetadata
  } = chart
  const map = new Map<any, Note>()
  const clones: Note[] = []

  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]
    let c: Note

    if (n.type === 'Tap') {
      c = {
        type: 'Tap',
        beat: n.beat,
        lane: n.lane,
        size: n.size,
        isGold: n.isGold,
        isTrace: n.isTrace,
        flickDir: n.flickDir,
      }
    } else if (n.type === 'HoldStart') {
      c = {
        type: 'HoldStart',
        beat: n.beat,
        lane: n.lane,
        size: n.size,
        isGold: n.isGold,
        isTrace: n.isTrace,
        isHidden: n.isHidden,
        isGuide: n.isGuide,
        easingType: n.easingType,
        // placeholders; will rewire after all clones are created
        nextNode: {} as any,
      }
    } else if (n.type === 'HoldTick') {
      c = {
        type: 'HoldTick',
        beat: n.beat,
        lane: n.lane,
        size: n.size,
        isGold: n.isGold,
        isGuide: n.isGuide,
        tickType: n.tickType,
        easingType: n.easingType,
        nextNode: {} as any,
        prevNode: {} as any,
      }
    } else if (n.type === 'HoldEnd') {
      c = {
        type: 'HoldEnd',
        beat: n.beat,
        lane: n.lane,
        size: n.size,
        isGold: n.isGold,
        isTrace: n.isTrace,
        isHidden: n.isHidden,
        flickDir: n.flickDir,
        prevNode: {} as any,
      }
    } else if (n.type === 'BPMChange') {
      c = {
        type: 'BPMChange',
        beat: n.beat,
        BPM: n.BPM,
        isEvent: true,
      }
    } else if (n.type === 'HiSpeed') {
      c = {
        type: 'HiSpeed',
        beat: n.beat,
        speed: n.speed,
        isEvent: true,
      }
    } else if (n.type === 'TimeSignature') {
      c = {
        type: 'TimeSignature',
        beat: n.beat,
        top: n.top,
        bottom: n.bottom,
        isEvent: true,
      }
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
    isExtendedChart,
    metadata: metadata || {
      title: '',
      designer: '',
      artist: '',
      jacket: '',
      masterVolume: 100,
      BGMVolume: 100,
      SEVolume: 100,
    },
  }
}
