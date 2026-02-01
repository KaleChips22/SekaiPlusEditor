const SusNoteType = {
  Tap: {
    TAP: 1,
    C_TAP: 2,
    FLICK: 3,
    SKILL: 4,
    TRACE: 5,
    C_TRACE: 6,
    ELASER: 7,
    C_ELASER: 8,
  },
  Air: {
    UP: 1,
    DOWN: 2,
    LEFT_UP: 3,
    RIGHT_UP: 4,
    LEFT_DOWN: 5,
    RIGHT_DOWN: 6,
  },
  Slide: {
    START: 1,
    END: 2,
    VISIBLE_STEP: 3,
    STEP: 5,
  },
  Guide: {
    START: 1,
    END: 2,
    STEP: 5,
  },
}

interface SUSNote {
  tick: number
  lane: number
  width: number
  type: number
}

const beatToTick = (beat: number) => Math.round(480 * beat)
const uscLanesToSusLanes = (lane: number, size: number) =>
  Math.floor(lane - size + 8)
const uscSizeToSusSize = (size: number) => Math.ceil(size * 2)
const convertTils = (tils: Record<number, Array<any>>) => Object.values(tils)

const checkTsg = (dataObj: any) => {
  if (dataObj.timeScaleGroup != 0)
    throw new Error('Layers not supported in SUS')
}

export const USCtoSUS = (
  usc: any,
  metadata: {
    title: string
    artist: string
    designer: string
    waveoffset: number
  },
) => {
  const notes = usc.objects as any[]
  const taps = [] as SUSNote[]
  const directionals = [] as SUSNote[]
  const slides = [] as SUSNote[][]
  const guides = [] as SUSNote[][]
  const bpms = [] as [number, number][]
  const til = [] as [number, number][]

  for (const note of notes) {
    if (note.type === 'bpm') {
      const tick = beatToTick(note.beat)
      bpms.push([tick, note.bpm])
    } else if (note.type === 'timeScaleGroup') {
      for (const changePoint of note.changes) {
        const tick = beatToTick(changePoint.beat)
        til.push([tick, changePoint.timeScale])
      }
    } else if (['skill', 'feverChance', 'feverStart'].includes(note.type)) {
      const eventLane = {
        skill: 0,
        feverChance: 15,
        feverStart: 15,
      }
      const eventTapType = {
        skill: SusNoteType.Tap.SKILL,
        feverChance: SusNoteType.Tap.TAP,
        feverStart: SusNoteType.Tap.C_TAP,
      }
      const lane = uscLanesToSusLanes(
        eventLane[note.type as keyof typeof eventLane],
        1,
      )
      const width = uscSizeToSusSize(1)
      const tick = beatToTick(note.beat)
      taps.push({
        tick,
        lane,
        width,
        type: eventTapType[note.type as keyof typeof eventLane],
      })
    } else if (note.type === 'single') {
      const lane = uscLanesToSusLanes(note.lane, note.size)
      const width = uscSizeToSusSize(note.size)
      const tick = beatToTick(note.beat)
      checkTsg(note)
      if (note.trace)
        taps.push({
          tick,
          lane,
          width,
          type: note.critical ? SusNoteType.Tap.C_TRACE : SusNoteType.Tap.TRACE,
        })
      else
        taps.push({
          tick,
          lane,
          width,
          type: note.critical ? SusNoteType.Tap.C_TAP : SusNoteType.Tap.TAP,
        })

      if ('direction' in note) {
        if (note.direction === 'up')
          directionals.push({
            tick,
            lane,
            width,
            type: SusNoteType.Air.UP,
          })
        else if (note.direction === 'left')
          directionals.push({
            tick,
            lane,
            width,
            type: SusNoteType.Air.LEFT_UP,
          })
        else if (note.direction === 'right')
          directionals.push({
            tick,
            lane,
            width,
            type: SusNoteType.Air.RIGHT_UP,
          })
      }
    } else if (note.type === 'slide') {
      const slide = []
      for (const step of note.connections) {
        const tick = beatToTick(step.beat)
        const lane = uscLanesToSusLanes(step.lane, step.size)
        const width = uscSizeToSusSize(step.size)
        checkTsg(step)

        if (step.type === 'start') {
          if (step.ease === 'in') {
            directionals.push({
              tick,
              lane,
              width,
              type: SusNoteType.Air.DOWN,
            })
          } else if (step.ease === 'out') {
            directionals.push({
              tick,
              lane,
              width,
              type: SusNoteType.Air.RIGHT_DOWN,
            })
          }

          if (step.judgeType === 'none') {
            taps.push({
              tick,
              lane,
              width,
              type: step.critical
                ? SusNoteType.Tap.C_ELASER
                : SusNoteType.Tap.ELASER,
            })
          } else if (step.judgeType === 'trace') {
            taps.push({
              tick,
              lane,
              width,
              type: step.critical
                ? SusNoteType.Tap.C_TRACE
                : SusNoteType.Tap.TRACE,
            })
          } else {
            if (step.critical) {
              taps.push({
                tick,
                lane,
                width,
                type: SusNoteType.Tap.C_TAP,
              })
            }
          }

          slide.push({
            tick,
            lane,
            width,
            type: SusNoteType.Slide.START,
          })
        } else if (['tick', 'attach'].includes(step.type)) {
          if (step.ease === 'in') {
            taps.push({
              tick,
              lane,
              width,
              type: SusNoteType.Tap.TAP,
            })
            directionals.push({
              tick,
              lane,
              width,
              type: SusNoteType.Air.DOWN,
            })
          } else if (step.ease === 'out') {
            taps.push({
              tick,
              lane,
              width,
              type: SusNoteType.Tap.TAP,
            })
            directionals.push({
              tick,
              lane,
              width,
              type: SusNoteType.Air.RIGHT_DOWN,
            })
          }

          if (step.type === 'tick') {
            slide.push({
              tick,
              lane,
              width,
              type:
                'critical' in step
                  ? SusNoteType.Slide.VISIBLE_STEP
                  : SusNoteType.Slide.STEP,
            })
          } else if (step.type === 'attach') {
            taps.push({
              tick,
              lane,
              width,
              type: SusNoteType.Tap.FLICK,
            })
            slide.push({
              tick,
              lane,
              width,
              type: SusNoteType.Slide.VISIBLE_STEP,
            })
          }
        } else if (step.type === 'end') {
          if (step.judgeType === 'none') {
            taps.push({
              tick,
              lane,
              width,
              type: step.critical
                ? SusNoteType.Tap.C_ELASER
                : SusNoteType.Tap.ELASER,
            })
          } else if (step.judgeType === 'trace') {
            taps.push({
              tick,
              lane,
              width,
              type: step.critical
                ? SusNoteType.Tap.C_TRACE
                : SusNoteType.Tap.TRACE,
            })
          } else if (step.judgeType === 'normal') {
            if ('direction' in step && step.critical) {
              taps.push({
                tick,
                lane,
                width,
                type: SusNoteType.Tap.C_TAP,
              })
            }
          }
          if ('direction' in step) {
            if (step.direction === 'up') {
              directionals.push({
                tick,
                lane,
                width,
                type: SusNoteType.Air.UP,
              })
            } else if (step.direction === 'left') {
              directionals.push({
                tick,
                lane,
                width,
                type: SusNoteType.Air.LEFT_UP,
              })
            } else if (step.direction === 'right') {
              directionals.push({
                tick,
                lane,
                width,
                type: SusNoteType.Air.RIGHT_UP,
              })
            }
          }

          slide.push({
            tick,
            lane,
            width,
            type: SusNoteType.Slide.END,
          })
        }
      }
      slides.push(slide)
    } else if (note.type === 'guide') {
      const guide: SUSNote[] = []
      const mids = note[
        'midpoints' in note ? 'midpoints' : 'connections'
      ] as any[]
      mids.forEach((step, idx) => {
        const tick = beatToTick(step.beat)
        const lane = uscLanesToSusLanes(step.lane, step.size)
        const width = uscSizeToSusSize(step.size)
        checkTsg(step)

        if (idx === 0) {
          taps.push({
            tick,
            lane,
            width,
            type:
              note.color === 'yellow'
                ? SusNoteType.Tap.C_ELASER
                : SusNoteType.Tap.ELASER,
          })

          if (step.ease === 'in') {
            directionals.push({
              tick,
              lane,
              width,
              type: SusNoteType.Air.DOWN,
            })
          } else if (step.ease === 'out') {
            directionals.push({
              tick,
              lane,
              width,
              type: SusNoteType.Air.RIGHT_DOWN,
            })
          }

          guide.push({
            tick,
            lane,
            width,
            type: SusNoteType.Guide.START,
          })
        } else if (idx === mids.length - 1) {
          if (note.color === 'yellow') {
            taps.push({
              tick,
              lane,
              width,
              type: SusNoteType.Tap.C_ELASER,
            })
          }

          guide.push({
            tick,
            lane,
            width,
            type: SusNoteType.Guide.END,
          })
        } else {
          if (step.ease === 'in') {
            taps.push({
              tick,
              lane,
              width,
              type:
                note.color === 'yellow'
                  ? SusNoteType.Tap.C_ELASER
                  : SusNoteType.Tap.ELASER,
            })

            directionals.push({
              tick,
              lane,
              width,
              type: SusNoteType.Air.DOWN,
            })
          } else if (step.ease === 'out') {
            taps.push({
              tick,
              lane,
              width,
              type:
                note.color === 'yellow'
                  ? SusNoteType.Tap.C_ELASER
                  : SusNoteType.Tap.ELASER,
            })

            directionals.push({
              tick,
              lane,
              width,
              type: SusNoteType.Air.RIGHT_DOWN,
            })
          } else if (step.ease === 'linear') {
            if (note.color === 'yellow') {
              taps.push({
                tick,
                lane,
                width,
                type: SusNoteType.Tap.C_ELASER,
              })
            }
          }

          guide.push({
            tick,
            lane,
            width,
            type: SusNoteType.Guide.STEP,
          })
        }
      })
      guides.push(guide)
    }
  }

  if (bpms.length === 0) bpms.push([0, 160])

  const susMetadata = {
    title: metadata.title,
    artist: metadata.artist,
    designer: metadata.designer,
    waveoffset: metadata.waveoffset,
  }

  return dumps(
    {
      metadata: {
        requests: ['ticks_per_beat 480'],
        ...susMetadata,
      },
      taps,
      directionals,
      slides,
      guides,
      bpms,
      barLengths: [[0, 4]],
      tils: convertTils({ 0: til }),
    },
    'This file was generated by SekaiPlusEditor',
  )
}

const dumps = (
  score: {
    metadata: {
      title: string
      artist: string
      designer: string
      waveoffset: number
      requests: (string | number)[]
    }
    taps: SUSNote[]
    directionals: SUSNote[]
    slides: SUSNote[][]
    guides: SUSNote[][]
    bpms: [number, number][]
    barLengths: [number, number][]
    tils: [number, number][][]
  },
  comment?: string,
) => {
  const lines = []

  if (comment) lines.push(comment, '')

  let ticksPersBeat = 480
  for (const field of Object.keys(
    score.metadata,
  ) as (keyof typeof score.metadata)[]) {
    if (score.metadata[field]) {
      if (field !== 'requests') {
        lines.push(
          `#${field.toUpperCase()} ${formatValue(score.metadata[field], true)}`,
        )
      } else {
        lines.push('')
        for (const request of score.metadata.requests) {
          lines.push(`#REQUEST "${request}"`)
          if (
            typeof request === 'string' &&
            request.startsWith('ticks_per_beat')
          ) {
            ticksPersBeat = Number(request.split(' ')[1])
          }
        }
      }
    }
  }

  lines.push(`WAVEOFFSET ${score.metadata.waveoffset}`)

  const noteMaps = new DefaultDict<
    string,
    {
      raws: [number, string][]
      ticksPerMeasure: number
      // til: number[]
    }
  >(() => ({
    raws: [],
    ticksPerMeasure: 0,
    // til: null,
  }))

  const barLengths = score.barLengths.sort((a, b) => a[0] - b[0])
  const bpms = score.bpms.sort((a, b) => a[0] - b[0])
  const taps = score.taps.sort((a, b) => a.tick - b.tick)
  const directionals = score.directionals.sort((a, b) => a.tick - b.tick)
  const slides = score.slides.sort((a, b) => a[0].tick - b[0].tick)
  const guides = score.guides.sort((a, b) => a[0].tick - b[0].tick)
  const tils = score.tils.map((til) => til.sort((a, b) => a[0] - b[0]))

  for (const [measure, value] of barLengths) {
    lines.push(`#${colon3(measure)}02: ${formatNumber(value)}`)
  }
  lines.push('')

  let accumulatedTicks = 0

  const barLengthsInTicks: {
    startTick: number
    measure: number
    value: number
  }[] = []

  barLengths.forEach(([measure, value], index) => {
    const nextMeasure =
      index + 1 < barLengths.length ? barLengths[index + 1][0] : 0
    const startTick = accumulatedTicks
    accumulatedTicks += Math.floor(
      (nextMeasure - measure) * value * ticksPersBeat,
    )
    barLengthsInTicks.push({ startTick, measure, value })
  })

  barLengthsInTicks.reverse()

  const pushRaw = (tick: number, info: string, data: string) => {
    for (const barLength of barLengthsInTicks) {
      if (tick >= barLength.startTick) {
        const currentMeasure =
          barLength.measure +
          Math.floor(
            (tick - barLength.startTick) / ticksPersBeat / barLength.value,
          )
        const noteMap = noteMaps.get(`${colon3(currentMeasure)}${info}`)
        noteMap.raws.push([tick - barLength.startTick, data])
        noteMap.ticksPerMeasure = Math.floor(barLength.value * ticksPersBeat)
        break
      }
    }
  }

  if (bpms.length >= 36 ** 2 - 1) {
    throw new Error('Too many BPMs')
  }

  const bpmIdentifiers = new Map<number, string>()
  for (const [tick, value] of bpms) {
    const identifier = (bpmIdentifiers.size + 1).toString(36).padStart(2, '0')
    if (!bpmIdentifiers.has(value)) {
      bpmIdentifiers.set(value, identifier)
      lines.push(`#BPM${bpmIdentifiers.get(value)}: ${formatNumber(value)}`)
    }
    pushRaw(tick, '08', bpmIdentifiers.get(value)!)
  }
  lines.push('')

  if (tils.length >= 36 ** 2 - 1) {
    throw new Error('Too many TILs')
  }

  tils.forEach((til, i) => {
    const tilList = []
    const tilValues = dedupeTils(til)
    for (const [tick, value] of tilValues) {
      tilList.push(
        `${Math.floor(tick / (ticksPersBeat * 4))}'${tick % (ticksPersBeat * 4)}:${formatNumber(value)}`,
      )
    }
    lines.push(
      `#TIL${i.toString(36).padStart(2, '0').toUpperCase()}: "` +
        `${tilList.join(', ')}` +
        '"',
    )
  })

  lines.push('#HISPEED 00')
  lines.push('#MEASUREHS 00')
  lines.push('')

  for (const note of taps) {
    pushRaw(
      note.tick,
      `1${note.lane.toString(36)}`,
      `${note.type}${note.width.toString(36)}`,
    )
  }

  for (const note of directionals) {
    pushRaw(
      note.tick,
      `5${note.lane.toString(36)}`,
      `${note.type}${note.width.toString(36)}`,
    )
  }

  const slideProvider = new ChannelProvider()
  for (const steps of slides) {
    const startTick = steps[0].tick
    const endTick = steps[steps.length - 1].tick
    const channel = slideProvider.generateChannel(startTick, endTick)

    for (const note of steps) {
      pushRaw(
        note.tick,
        `3${note.lane.toString(36)}${channel.toString(36)}`,
        `${note.type}${note.width.toString(36)}`,
      )
    }
  }

  const guideProvider = new ChannelProvider()
  for (const steps of guides) {
    const startTick = steps[0].tick
    const endTick = steps[steps.length - 1].tick
    const channel = guideProvider.generateChannel(startTick, endTick)

    for (const note of steps) {
      pushRaw(
        note.tick,
        `9${note.lane.toString(36)}${channel.toString(36)}`,
        `${note.type}${note.width.toString(36)}`,
      )
    }
  }

  for (const [tag, noteMap] of noteMaps.entries()) {
    let gcd = noteMap.ticksPerMeasure
    for (const raw of noteMap.raws) gcd = getGcd(raw[0], gcd)
    const data = new Map<number, string>()
    for (const raw of noteMap.raws)
      data.set(raw[0] % noteMap.ticksPerMeasure, raw[1])

    const values = []
    for (let i = 0; i < noteMap.ticksPerMeasure; i += gcd) {
      values.push(data.get(i) ?? '00')
    }
    lines.push(`#${tag}:${values.join('')}`)
  }

  lines.push('')

  return lines.join('\n')
}

const dedupeTils = (tilData: [number, number][]): [number, number][] => {
  if (tilData.every(([, value]) => value === 1)) return []

  const tickDict = new Map<number, number>()
  const dedupedData: [number, number][] = []

  for (const [tick, value] of tilData) {
    if (tickDict.has(tick)) {
      if (tickDict.get(tick) !== value) {
        throw new Error(`Duplicate tick ${tick} with different values`)
      }
    } else {
      tickDict.set(tick, value)
      dedupedData.push([tick, value])
    }
  }

  return dedupedData
}

const formatNumber = (value: number) =>
  value % 1 === 0 ? Math.floor(value).toFixed(0) : value.toString()

const formatValue = (value: number | string, isString: boolean) =>
  isString ? `"${value}"` : formatNumber(value as number)

const colon3 = (value: number) => {
  return (value % 1000).toString().padStart(3, '0')
}

const getGcd = (a: number, b: number): number => {
  if (b === 0) return a
  return getGcd(b, a % b)
}

class DefaultDict<K, V> extends Map<K, V> {
  private defaultFactory: () => V

  constructor(defaultFactory: () => V) {
    super()
    this.defaultFactory = defaultFactory
  }

  get(key: K): V {
    if (!this.has(key)) {
      const value = this.defaultFactory()
      this.set(key, value)
    }
    return super.get(key) as V
  }
}

class ChannelProvider {
  private channelMap: Record<string, Array<[number, number]>>

  constructor() {
    this.channelMap = {}
    for (let i = 0; i < 36; i++) {
      this.channelMap[i.toString()] = []
    }
  }

  generateChannel(startTick: number, endTick: number): number {
    for (const [key, ranges] of Object.entries(this.channelMap)) {
      // Check if this channel is available (no overlapping ranges)
      const isAvailable = ranges.every(([start, end]) => {
        return endTick < start || end < startTick
      })

      if (isAvailable) {
        this.channelMap[key].push([startTick, endTick])
        console.log(key)
        return parseInt(key)
      }
    }
    throw new Error('No available channel')
  }
}
