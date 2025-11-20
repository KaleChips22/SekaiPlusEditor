type Line = [string, string]

type MeasureChange = [number, number]
type TimeScaleGroupChange = [number, string]

type Meta = Map<string, string[]>

type BarLengthObject = {
  measure: number
  length: number
}

type RawObject = {
  tick: number
  value: string
}

type TimeScaleChangeObject = {
  tick: number
  timeScale: number
}

type BpmChangeObject = {
  tick: number
  bpm: number
}

type NoteObject = {
  tick: number
  lane: number
  width: number
  type: number
  timeScaleGroup: number
}

type SlideObject = {
  type: number
  notes: NoteObject[]
}

type Score = {
  offset: number
  ticksPerBeat: number
  timeScaleChanges: TimeScaleChangeObject[][]
  bpmChanges: BpmChangeObject[]
  tapNotes: NoteObject[]
  directionalNotes: NoteObject[]
  slides: SlideObject[]
  meta: Meta
}

type ToTick = (measure: number, p: number, q: number) => number

const analyze = (sus: string): Score => {
  if (!sus || sus.trim().length === 0) {
    throw new Error('The sus file does not exist')
  }
  const { lines, measureChanges, timeScaleGroupChanges, meta } = parse(sus)

  const offset = -+(meta.get('WAVEOFFSET') || '0')
  if (Number.isNaN(offset)) throw new Error('Unexpected offset')

  const ticksPerBeat = getTicksPerBeat(meta)
  if (!ticksPerBeat) throw new Error('Missing or unexpected ticks per beat')

  const barLengths = getBarLengths(lines, measureChanges)

  const toTick = getToTick(barLengths, ticksPerBeat)

  const bpms = new Map<string, number>()
  const bpmChanges: BpmChangeObject[] = []
  const timeScaleGroups = new Map<string, number>()
  const timeScaleChanges: TimeScaleChangeObject[][] = []
  const tapNotes: NoteObject[] = []
  const directionalNotes: NoteObject[] = []
  const streams = new Map<string, SlideObject>()

  for (const [, timeScaleGroup] of timeScaleGroupChanges) {
    if (timeScaleGroups.has(timeScaleGroup)) continue
    timeScaleGroups.set(timeScaleGroup, timeScaleGroups.size)
    timeScaleChanges.push([])
  }

  // Time Scale Changes
  for (const line of lines) {
    const [header] = line
    if (header.length === 5 && header.startsWith('TIL')) {
      const timeScaleGroup = header.substring(3, 5)
      const timeScaleIndex = timeScaleGroups.get(timeScaleGroup)
      if (timeScaleIndex === undefined) {
        continue
      }
      timeScaleChanges[timeScaleIndex].push(...toTimeScaleChanges(line, toTick))
    }
  }
  lines.forEach((line, index) => {
    const [header, data] = line
    const measureOffset =
      measureChanges.find(([changeIndex]) => changeIndex <= index)?.[1] ?? 0
    const timeScaleGroupName =
      timeScaleGroupChanges.find(
        ([changeIndex]) => changeIndex <= index,
      )?.[1] ?? '00'
    let timeScaleGroup = timeScaleGroups.get(timeScaleGroupName)
    if (timeScaleGroup === undefined) {
      timeScaleGroup = timeScaleGroups.size
      timeScaleGroups.set(timeScaleGroupName, timeScaleGroups.size)
      timeScaleChanges.push([])
    }

    // Hispeed definitions
    if (header.length === 5 && header.startsWith('TIL')) {
      return
    }

    // BPM
    if (header.length === 5 && header.startsWith('BPM')) {
      bpms.set(header.substring(3), +data)
      return
    }

    // BPM Changes
    if (header.length === 5 && header.endsWith('08')) {
      bpmChanges.push(...toBpmChanges(line, measureOffset, bpms, toTick))
      return
    }

    // Tap Notes
    if (header.length === 5 && header[3] === '1') {
      tapNotes.push(...toNotes(line, measureOffset, timeScaleGroup, toTick))
      return
    }

    // Streams
    if (header.length === 6 && (header[3] === '3' || header[3] === '9')) {
      const key = `${header[5]}-${header[3]}`
      const stream = streams.get(key)

      if (stream) {
        stream.notes.push(
          ...toNotes(line, measureOffset, timeScaleGroup, toTick),
        )
      } else {
        streams.set(key, {
          type: +header[3],
          notes: toNotes(line, measureOffset, timeScaleGroup, toTick),
        })
      }
      return
    }

    // Directional Notes
    if (header.length === 5 && header[3] === '5') {
      directionalNotes.push(
        ...toNotes(line, measureOffset, timeScaleGroup, toTick),
      )
      return
    }
  })

  const slides = [...streams.values()].flatMap(toSlides)

  return {
    offset,
    ticksPerBeat,
    timeScaleChanges,
    bpmChanges,
    tapNotes,
    directionalNotes,
    slides,
    meta,
  }
}

const parse = (
  sus: string,
): {
  lines: Line[]
  measureChanges: MeasureChange[]
  timeScaleGroupChanges: TimeScaleGroupChange[]
  meta: Meta
} => {
  const lines: Line[] = []
  const measureChanges: MeasureChange[] = []
  const timeScaleGroupChanges: TimeScaleGroupChange[] = []
  const meta: Meta = new Map()

  sus
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('#'))
    .forEach((line) => {
      const isLine = line.includes(':')

      const index = line.indexOf(isLine ? ':' : ' ')
      if (index === -1) return

      const left = line.substring(1, index).trim()
      const right = line.substring(index + 1).trim()

      if (isLine) {
        lines.push([left, right])
      } else if (left === 'MEASUREBS') {
        measureChanges.unshift([lines.length, +right])
      } else if (left === 'HISPEED') {
        timeScaleGroupChanges.unshift([lines.length, right])
      } else {
        if (!meta.has(left)) meta.set(left, [])
        meta.get(left)?.push(right)
      }
    })

  return {
    lines,
    measureChanges,
    timeScaleGroupChanges,
    meta,
  }
}

const getTicksPerBeat = (meta: Map<string, string[]>) => {
  const request = meta.get('REQUEST')
  if (!request) return

  const tpbRequest = request.find((r) =>
    JSON.parse(r).startsWith('ticks_per_beat'),
  )
  if (!tpbRequest) return

  return +JSON.parse(tpbRequest).split(' ')[1]
}

const getBarLengths = (lines: Line[], measureChanges: MeasureChange[]) => {
  const barLengths: BarLengthObject[] = []

  lines.forEach((line, index) => {
    const [header, data] = line

    if (header.length !== 5) return
    if (!header.endsWith('02')) return

    const measure =
      +header.substring(0, 3) +
      (measureChanges.find(([changeIndex]) => changeIndex <= index)?.[1] ?? 0)
    if (Number.isNaN(measure)) return

    barLengths.push({ measure, length: +data })
  })

  return barLengths
}

const getToTick = (
  barLengths: BarLengthObject[],
  ticksPerBeat: number,
): ToTick => {
  let ticks = 0
  const bars = barLengths
    .sort((a, b) => a.measure - b.measure)
    .map(({ measure, length }, i, values) => {
      if (i) {
        const prev = values[i - 1]
        ticks += (measure - prev.measure) * prev.length * ticksPerBeat
      }

      return { measure, ticksPerMeasure: length * ticksPerBeat, ticks }
    })
    .reverse()

  return (measure, p, q) => {
    const bar = bars.find((bar) => measure >= bar.measure)
    if (!bar) throw new Error('Unexpected missing bar')

    return (
      bar.ticks +
      (measure - bar.measure) * bar.ticksPerMeasure +
      (p * bar.ticksPerMeasure) / q
    )
  }
}

const toBpmChanges = (
  line: Line,
  measureOffset: number,
  bpms: Map<string, number>,
  toTick: ToTick,
) =>
  toRaws(line, measureOffset, toTick).map(({ tick, value }) => ({
    tick,
    bpm: bpms.get(value) ?? 0,
  }))

const toTimeScaleChanges = ([, data]: Line, toTick: ToTick) => {
  if (!data.startsWith('"') || !data.endsWith('"'))
    throw new Error('Unexpected time scale changes')

  return data
    .slice(1, -1)
    .split(',')
    .map((segment) => segment.trim())
    .filter((segment) => !!segment)
    .map((segment) => {
      const [l, rest] = segment.split("'")
      const [m, r] = rest.split(':')

      const measure = +l
      const tick = +m
      const timeScale = +r

      if (
        Number.isNaN(measure) ||
        Number.isNaN(tick) ||
        Number.isNaN(timeScale)
      )
        throw new Error('Unexpected time scale change')

      return {
        tick: toTick(measure, 0, 1) + tick,
        timeScale,
      }
    })
    .sort((a, b) => a.tick - b.tick)
}

const toNotes = (
  line: Line,
  measureOffset: number,
  timeScaleGroup: number,
  toTick: ToTick,
) => {
  const [header] = line
  const lane = parseInt(header[4], 36)

  return toRaws(line, measureOffset, toTick).map(({ tick, value }) => {
    const width = parseInt(value[1], 36)

    return {
      tick,
      lane,
      width,
      type: parseInt(value[0], 36),
      timeScaleGroup,
    }
  })
}

const toSlides = (stream: SlideObject) => {
  const slides: SlideObject[] = []

  let notes: NoteObject[] | undefined
  for (const note of stream.notes.sort((a, b) => a.tick - b.tick)) {
    if (!notes) {
      notes = []
      slides.push({
        type: stream.type,
        notes,
      })
    }

    notes.push(note)

    if (note.type === 2) {
      notes = undefined
    }
  }

  return slides
}

const toRaws = (
  [header, data]: Line,
  measureOffset: number,
  toTick: ToTick,
) => {
  const measure = +header.substring(0, 3) + measureOffset
  return (data.match(/.{2}/g) ?? [])
    .map(
      (value, i, values) =>
        value !== '00' && {
          tick: toTick(measure, i, values.length),
          value,
        },
    )
    .filter((object): object is RawObject => !!object)
}

/** Convert a SUS to a USC */
export const susToUSC = (sus: string) => chsLikeToUSC(analyze(sus))

export const chsLikeToUSC = (score: Score) => {
  const flickMods = new Map<string, 'left' | 'up' | 'right'>()
  const traceMods = new Set<string>()
  const criticalMods = new Set<string>()
  const tickRemoveMods = new Set<string>()
  const slideStartEndRemoveMods = new Set<string>()
  const easeMods = new Map<string, 'in' | 'out'>()

  const preventSingles = new Set<string>()
  const dedupeSingles = new Set<string>()
  const dedupeSlides = new Map<string, any>()

  const requests = {
    sideLane: false,
    laneOffset: 0,
  }
  const requestsRaw = score.meta.get('REQUEST')
  if (requestsRaw) {
    for (const request of requestsRaw) {
      try {
        const [key, value] = JSON.parse(request).split(' ', 2)
        switch (key) {
          case 'side_lane':
            requests.sideLane = value === 'true'
            break
          case 'lane_offset':
            requests.laneOffset = Number(value)
            break
        }
      } catch (e) {
        // Noop
      }
    }
  }

  for (const slide of score.slides) {
    if (slide.type !== 3) continue

    for (const note of slide.notes) {
      const key = getKey(note)
      switch (note.type) {
        case 1:
        case 2:
        case 3:
        case 5:
          preventSingles.add(key)
          break
      }
    }
  }

  for (const note of score.directionalNotes) {
    const key = getKey(note)
    switch (note.type) {
      case 1:
        flickMods.set(key, 'up')
        break
      case 3:
        flickMods.set(key, 'left')
        break
      case 4:
        flickMods.set(key, 'right')
        break
      case 2:
        easeMods.set(key, 'in')
        break
      case 5:
      case 6:
        easeMods.set(key, 'out')
        break
    }
  }
  for (const note of score.tapNotes) {
    const key = getKey(note)
    switch (note.type) {
      case 2:
        criticalMods.add(key)
        break
      case 5:
        traceMods.add(key)
        break
      case 6:
        traceMods.add(key)
        criticalMods.add(key)
        break
      case 3:
        tickRemoveMods.add(key)
        break
      case 7:
        slideStartEndRemoveMods.add(key)
        break
      case 8:
        criticalMods.add(key)
        slideStartEndRemoveMods.add(key)
        break
    }
  }

  const objects: any[] = []

  for (const timeScaleChanges of score.timeScaleChanges) {
    objects.push({
      type: 'timeScaleGroup',
      changes: timeScaleChanges.map((timeScaleChange) => ({
        beat: timeScaleChange.tick / score.ticksPerBeat,
        timeScale: timeScaleChange.timeScale,
      })),
    })
  }

  for (const bpmChange of score.bpmChanges) {
    objects.push({
      type: 'bpm',
      beat: bpmChange.tick / score.ticksPerBeat,
      bpm: bpmChange.bpm,
    })
  }

  for (const note of score.tapNotes) {
    if (note.lane === 0 && note.type === 4) {
      objects.push({
        type: 'skill',
        beat: note.tick / score.ticksPerBeat,
      })
      continue
    }

    if (note.lane === 15 && note.type === 1) {
      objects.push({
        type: 'feverChance',
        beat: note.tick / score.ticksPerBeat,
      })
      continue
    }

    if (note.lane === 15 && note.type === 2) {
      objects.push({
        type: 'feverStart',
        beat: note.tick / score.ticksPerBeat,
      })
      continue
    }

    if (!requests.sideLane && (note.lane <= 1 || note.lane >= 14)) continue
    if (
      note.type !== 1 &&
      note.type !== 2 &&
      note.type !== 5 &&
      note.type !== 6 &&
      note.type !== 4
    )
      continue

    const key = getKey(note)
    if (preventSingles.has(key)) continue

    if (dedupeSingles.has(key)) continue
    dedupeSingles.add(key)

    let object: any
    switch (note.type) {
      case 1:
      case 2:
      case 5:
      case 6: {
        object = {
          type: 'single',
          beat: note.tick / score.ticksPerBeat,
          lane: note.lane - 8 + note.width / 2 + requests.laneOffset,
          size: note.width / 2,
          critical: [2, 6].includes(note.type),
          trace: [5, 6].includes(note.type),

          timeScaleGroup: note.timeScaleGroup,
        }

        const flickMod = flickMods.get(key)
        if (flickMod) object.direction = flickMod
        break
      }
      case 4:
        object = {
          type: 'damage',
          beat: note.tick / score.ticksPerBeat,
          lane: note.lane - 8 + note.width / 2 + requests.laneOffset,
          size: note.width / 2,

          timeScaleGroup: note.timeScaleGroup,
        }
        break
      default:
        continue
    }

    objects.push(object)
  }

  for (const slide of score.slides) {
    const startNote = slide.notes.find(({ type }) => type === 1 || type === 2)
    if (!startNote) continue
    const isCritical = criticalMods.has(getKey(startNote))
    const object: any =
      slide.type === 3
        ? {
            type: 'slide',
            critical: isCritical,
            connections: [] as never,
          }
        : {
            type: 'guide',
            color: isCritical ? 'yellow' : 'green',
            connections: [] as never,
          }

    for (const note of slide.notes) {
      const key = getKey(note)

      const beat = note.tick / score.ticksPerBeat
      const lane = note.lane - 8 + note.width / 2 + requests.laneOffset
      const size = note.width / 2
      const timeScaleGroup = note.timeScaleGroup
      const critical =
        (object.type === 'slide'
          ? object.critical
          : object.color === 'yellow') || criticalMods.has(key)
      const ease = easeMods.get(key) ?? 'linear'

      let judgeType: 'normal' | 'trace' | 'none' = 'normal'
      if (traceMods.has(key)) judgeType = 'trace'
      switch (note.type) {
        case 1: {
          if (object.type == 'guide' || slideStartEndRemoveMods.has(key))
            judgeType = 'none'
          const connection: any = {
            type: 'start',
            beat,
            lane,
            size,
            critical,
            ease: easeMods.get(key) ?? 'linear',
            judgeType,

            timeScaleGroup,
          }

          object.connections.push(connection)
          break
        }
        case 2: {
          if (object.type == 'guide' || slideStartEndRemoveMods.has(key))
            judgeType = 'none'
          const connection: any = {
            type: 'end',
            beat,
            lane,
            size,
            critical,
            judgeType,

            timeScaleGroup,
          }

          const flickMod = flickMods.get(key)
          if (flickMod) connection.direction = flickMod

          object.connections.push(connection)
          break
        }
        case 3: {
          if (tickRemoveMods.has(key)) {
            const connection: any = {
              type: 'attach',
              beat,
              critical,
              timeScaleGroup,
              lane,
              size,
            }

            object.connections.push(connection)
          } else {
            const connection: any = {
              type: 'tick',
              beat,
              lane,
              size,
              critical,
              ease,
              judgeType,

              timeScaleGroup,
            }

            object.connections.push(connection)
          }
          break
        }
        case 5: {
          if (tickRemoveMods.has(key)) break

          const connection: any = {
            type: 'tick',
            beat,
            lane,
            size,
            ease,

            timeScaleGroup,
          }

          object.connections.push(connection)
          break
        }
      }
    }

    objects.push(object)

    if (object.type == 'guide') continue

    const key = getKey(startNote)
    const dupe = dedupeSlides.get(key)
    if (dupe) objects.splice(objects.indexOf(dupe), 1)

    dedupeSlides.set(key, object)
  }

  return {
    offset: score.offset,
    objects,
  }
}

const getKey = (note: NoteObject) => `${note.lane}-${note.tick}`
