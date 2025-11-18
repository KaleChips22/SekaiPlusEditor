import { globalState } from '../lib'
import { saveFile, saveFileAs } from './fileOps'
import {
  BPMChange,
  EasingType,
  FlickDirection,
  HiSpeed,
  HoldEnd,
  HoldStart,
  HoldTick,
  TapNote,
  TickType,
  TimeSignature,
  type Note,
} from './note'
import { getRect } from './noteImage'
import { notesToPJSK } from './PJSK'
import { notesToUSC } from './USC'
import { historyManager } from './history'

const BEAT_HEIGHT = 220

let laneWidth = 55
const NOTE_HEIGHT = 45

// let tSigTop = 4
// let tSigBottom = 4
let yOffset = 0
let pZoom = 0

let cursorPos = 0

let isPlaying = false

let mouseIsPressed = false
let pMouseIsPressed = false
let mouseX: number | null = null
let mouseY: number | null = null

let selectionStartX: number | null = null
let selectionStartY: number | null = null

let dragStartX: number | null = null
let dragStartY: number | null = null

const clipboard: Note[] = []
let isPasting = false

let hideTickOutlines = false
let hideTickOutlinesOnPlay = true

export const setOptions = (options: any) => {
  for (const [k, v] of Object.entries(options) as [string, any]) {
    if (k === 'hideTickOutlines') hideTickOutlines = v
    if (k === 'hideTickOutlinesOnPlay') hideTickOutlinesOnPlay = v
    if (k === 'laneWidth') laneWidth = v
  }
}

enum DragMode {
  Move,
  ScaleLeft,
  ScaleRight,
  None,
}
let dragMode = DragMode.None

export const nextNoteOptions = {
  size: 1.5,
  tickType: TickType.Normal,
  flickDir: FlickDirection.Default,
}

let musicScoreName = ''
export const setMusicScoreName = (name: string) => (musicScoreName = name)

const musicPlayer = new Audio()
let currentMusicUrl: string | null = null

const noteFxPlayers = {
  critTick: new Audio('sound/note_sfx/se_live_connect_critical.mp3'),
  tick: new Audio('sound/note_sfx/se_live_connect.mp3'),
  critFlick: new Audio('sound/note_sfx/se_live_flick_critical.mp3'),
  flick: new Audio('sound/note_sfx/se_live_flick.mp3'),
  critTrace: new Audio('sound/note_sfx/se_live_trace_critical.mp3'),
  trace: new Audio('sound/note_sfx/se_live_trace.mp3'),
  critical: new Audio('sound/note_sfx/se_live_critical.mp3'),
  tap: new Audio('sound/note_sfx/se_live_perfect.mp3'),
}

let goldHoldsPlaying = 0
let holdsPlaying = 0

Object.values(noteFxPlayers).forEach((p) => p.load())

const longContext = new AudioContext()
const longGoldContext = new AudioContext()

let longBuffer: AudioBuffer, longGoldBuffer: AudioBuffer
let sourceLong: AudioBufferSourceNode, sourceLongGold: AudioBufferSourceNode

const loadSound = async (url: string, audioContext: AudioContext) => {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  return audioBuffer
}

const initSounds = async () => {
  longBuffer = await loadSound('sound/note_sfx/se_live_long.mp3', longContext)
  longGoldBuffer = await loadSound(
    'sound/note_sfx/se_live_long_critical.mp3',
    longGoldContext,
  )
}

const playLong = () => {
  sourceLong = longContext.createBufferSource()
  sourceLong.buffer = longBuffer
  sourceLong.connect(longContext.destination)
  sourceLong.loop = true
  sourceLong.start(0)
}

const stopLong = () => {
  sourceLong.stop()
}

const playLongGold = () => {
  sourceLongGold = longGoldContext.createBufferSource()
  sourceLongGold.buffer = longGoldBuffer
  sourceLongGold.connect(longGoldContext.destination)
  sourceLongGold.loop = true
  sourceLongGold.start(0)
}

const stopLongGold = () => {
  sourceLongGold.stop()
}

initSounds()

// let musicBytes = new Uint8Array()

// decoded PCM waveform (precomputed buckets of peak amplitude 0..1)
let waveform: Float32Array | null = null
let waveformDuration = 0 // seconds
let waveformReady = false
// music offset in milliseconds. Positive means the audio is ahead of the chart by this many ms.
export let musicOffsetMs = 0

export const setMusicOffset = (ms: number) => {
  musicOffsetMs = ms
}

export const setMusic = (file: File) => {
  if (!file) return

  // stop any currently playing music and revoke previous object URL
  const wasPlaying = isPlaying
  try {
    musicPlayer.pause()
    musicPlayer.currentTime = 0
  } catch (e) {}

  if (currentMusicUrl) {
    try {
      URL.revokeObjectURL(currentMusicUrl)
    } catch (e) {}
    currentMusicUrl = null
  }

  const url = URL.createObjectURL(file)
  currentMusicUrl = url

  musicPlayer.src = url
  musicPlayer.load()

  // if playback was active, continue playing the newly loaded track from cursor
  if (wasPlaying) {
    // apply music offset (convert ms -> seconds)
    const offsetSec = (musicOffsetMs ?? 0) / 1000
    let startTime = getTime(cursorPos) - offsetSec
    if (!Number.isFinite(startTime) || startTime < 0) startTime = 0
    try {
      if (musicPlayer.duration && !isNaN(musicPlayer.duration)) {
        startTime = Math.min(startTime, musicPlayer.duration)
      }
    } catch (e) {}

    try {
      musicPlayer.currentTime = startTime
      // re-trigger play; browsers may require user gesture but this mirrors toggleIsPlaying behavior
      void musicPlayer.play()
    } catch (e) {}
  }

  const loadBytes = async () => {
    const arrayBuffer = await file.arrayBuffer()

    // keep raw bytes for compatibility/debugging
    // musicBytes = new Uint8Array(arrayBuffer)

    // decode audio into PCM and precompute waveform buckets
    try {
      const audioBuffer = await longContext.decodeAudioData(
        arrayBuffer.slice(0),
      )

      waveformDuration = audioBuffer.duration

      // number of buckets to precompute - tradeoff between detail and memory
      const BUCKETS = 4096

      const numChannels = audioBuffer.numberOfChannels
      const len = audioBuffer.length

      const samplesPerBucket = Math.max(1, Math.floor(len / BUCKETS))
      const wf = new Float32Array(BUCKETS)

      for (let i = 0; i < BUCKETS; i++) {
        const start = i * samplesPerBucket
        const end = i === BUCKETS - 1 ? len : (i + 1) * samplesPerBucket
        let peak = 0

        for (let ch = 0; ch < numChannels; ch++) {
          const channelData = audioBuffer.getChannelData(ch)
          for (let s = start; s < end; s++) {
            const v = Math.abs(channelData[s])
            if (v > peak) peak = v
          }
        }

        // clamp to [0,1]
        wf[i] = Math.max(0, Math.min(1, peak))
      }

      waveform = wf
      waveformReady = true
      console.log('waveform ready', waveformDuration, waveform.length)
    } catch (e) {
      console.warn('failed to decode audio for waveform', e)
      waveform = null
      waveformReady = false
    }
  }

  loadBytes()
}

const imageSource = document.createElement('img')
imageSource.src = 'editor_sprites/notes.png'

const chartNotes: Note[] = [
  {
    type: 'HiSpeed',
    beat: 0,
    size: 0,
    lane: 0,
    speed: 1,
  } as HiSpeed,
  {
    type: 'TimeSignature',
    beat: 0,
    size: 0,
    lane: 0,
    top: 4,
    bottom: 4,
  } as TimeSignature,
  {
    type: 'BPMChange',
    beat: 0,
    size: 0,
    lane: 0,
    BPM: 160,
  } as BPMChange,
  /*{
    beat: 0.5,
    lane: 0,
    size: 2,
    type: 'Tap',
    isGold: false,
    isTrace: false,
    flickDir: FlickDirection.None,
  } as TapNote,
  {
    beat: 1,
    lane: 0,
    size: 2,
    type: 'Tap',
    isGold: true,
    isTrace: false,
    flickDir: FlickDirection.None,
  } as TapNote,
  {
    beat: 1.5,
    lane: 0,
    size: 2,
    type: 'Tap',
    isGold: false,
    isTrace: true,
    flickDir: FlickDirection.None,
  } as TapNote,
  {
    beat: 2,
    lane: 0,
    size: 2,
    type: 'Tap',
    isGold: true,
    isTrace: true,
    flickDir: FlickDirection.None,
  } as TapNote,
  {
    beat: 2.5,
    lane: 0,
    size: 2,
    type: 'Tap',
    isGold: false,
    isTrace: false,
    flickDir: FlickDirection.Default,
  } as TapNote,
  {
    beat: 3,
    lane: 0,
    size: 2,
    type: 'Tap',
    isGold: true,
    isTrace: false,
    flickDir: FlickDirection.Default,
  } as TapNote,
  {
    beat: 3.5,
    lane: 0,
    size: 2,
    type: 'Tap',
    isGold: false,
    isTrace: true,
    flickDir: FlickDirection.Default,
  } as TapNote,
  {
    beat: 4,
    lane: 0,
    size: 2,
    type: 'Tap',
    isGold: true,
    isTrace: true,
    flickDir: FlickDirection.Default,
  } as TapNote,
   */
]

export const setChartNotes = (notes: Note[]) => {
  chartNotes.splice(0)

  notes.forEach((n) => chartNotes.push(n))
}

/**
 * Save the current chart state to history before making modifications
 */
const saveHistory = () => {
  historyManager.saveState(chartNotes)
}

/**
 * Undo the last action
 */
export const undo = () => {
  const previousState = historyManager.undo(chartNotes)
  if (previousState) {
    setChartNotes(previousState)
    selectedIndeces.clear()
    console.log('Undo successful:', historyManager.getHistorySummary())
  }
}

/**
 * Redo the last undone action
 */
export const redo = () => {
  const nextState = historyManager.redo(chartNotes)
  if (nextState) {
    setChartNotes(nextState)
    selectedIndeces.clear()
    console.log('Redo successful:', historyManager.getHistorySummary())
  }
}

/**
 * Check if undo is available
 */
export const canUndo = () => historyManager.canUndo()

/**
 * Check if redo is available
 */
export const canRedo = () => historyManager.canRedo()

/**
 * Clear all history (useful when opening a new file)
 */
export const clearHistory = () => {
  historyManager.clear()
  console.log('History cleared')
}

export const exportUSC = () => {
  const usc = notesToUSC(chartNotes, musicOffsetMs)

  // console.log(usc)

  const blob = new Blob([JSON.stringify(usc)], { type: 'application/json' })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = (musicScoreName || 'Untitled') + '.usc'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const saveAsPJSK = () => {
  const pjsk = notesToPJSK(chartNotes, musicOffsetMs)
  const pjskString = JSON.stringify(pjsk)

  saveFileAs(pjskString)
}

export const savePJSK = () => {
  const pjsk = notesToPJSK(chartNotes, musicOffsetMs)
  const pjskString = JSON.stringify(pjsk)

  saveFile(pjskString)
}

// const holdStart = {
//   type: 'HoldStart',
//   beat: 4.5,
//   lane: 0,
//   size: 3,
//   isGold: false,
//   isTrace: false,
//   isHidden: false,
//   isGuide: false,
//   easingType: EasingType.Linear,
// } as HoldStart

// const holdTick = {
//   type: 'HoldTick',
//   beat: 5,
//   lane: 0,
//   size: 3,
//   isGold: false,
//   isGuide: false,
//   easingType: EasingType.Linear,
//   tickType: TickType.Normal,
//   prevNode: holdStart,
// } as HoldTick

// const holdEnd = {
//   type: 'HoldEnd',
//   beat: 6,
//   lane: 0,
//   size: 3,
//   isGold: false,
//   isTrace: false,
//   isHidden: false,
//   flickDir: FlickDirection.Default,

//   prevNode: holdTick,
// } as HoldEnd

// holdStart.nextNode = holdTick
// holdTick.nextNode = holdEnd

// chartNotes.push(holdStart, holdTick, holdEnd)

const selectedIndeces = new Set<number>()

export const deleteSelected = () => {
  saveHistory()
  chartNotes.forEach((n, i) => {
    if (!selectedIndeces.has(i)) return
    if (n.type === 'HoldStart') {
      let j = n as HoldStart | HoldTick | HoldEnd
      while ('nextNode' in j) {
        selectedIndeces.add(chartNotes.indexOf(j.nextNode))
        j = j.nextNode
      }
    } else if (n.type === 'HoldEnd') {
      let j = n as HoldStart | HoldTick | HoldEnd
      while ('prevNode' in j) {
        selectedIndeces.add(chartNotes.indexOf(j.prevNode))
        j = j.prevNode
      }
    } else if (n.type === 'HoldTick') {
      // console.log(n)
      const note = n as HoldTick
      note.prevNode.nextNode = note.nextNode
      note.nextNode.prevNode = note.prevNode
    }
  })
  for (let i = chartNotes.length - 1; i > 0; i--) {
    if (selectedIndeces.has(i)) chartNotes.splice(i, 1)
  }
  selectedIndeces.clear()
}

export const selectAll = () => {
  for (let i = 0; i < chartNotes.length; i++) {
    if (!['BPMChange', 'HiSpeed', 'TimeSignature'].includes(chartNotes[i].type))
      selectedIndeces.add(i)
  }
}

export const setHiSpeed = (speed: number) => {
  if (selectedIndeces.size === 1) {
    saveHistory()
    selectedIndeces.forEach((i) => {
      const note = chartNotes[i]

      if (note.type !== 'HiSpeed') return
      const n = note as HiSpeed

      n.speed = speed
    })
  }
}

export const getDefaultHiSpeed = () => {
  let speed = 1
  if (selectedIndeces.size === 1) {
    selectedIndeces.forEach((i) => {
      const note = chartNotes[i]

      if (note.type !== 'HiSpeed') return
      const n = note as HiSpeed

      speed = n.speed
    })
  }

  return speed
}

export const setBPM = (BPM: number) => {
  if (selectedIndeces.size === 1) {
    saveHistory()
    selectedIndeces.forEach((i) => {
      const note = chartNotes[i]

      if (note.type !== 'BPMChange') return
      const n = note as BPMChange

      n.BPM = BPM
    })
  }
}

export const getDefaultBPM = () => {
  let bpm = 160
  if (selectedIndeces.size === 1) {
    selectedIndeces.forEach((i) => {
      const note = chartNotes[i]

      if (note.type !== 'BPMChange') return
      const n = note as BPMChange

      bpm = n.BPM
    })
  }

  return bpm
}

export const setTimeSignature = (top: number, bottom: number) => {
  if (selectedIndeces.size === 1) {
    saveHistory()
    selectedIndeces.forEach((i) => {
      const note = chartNotes[i]

      if (note.type !== 'TimeSignature') return
      const n = note as TimeSignature

      n.top = top
      n.bottom = bottom
    })
  }
}

export const getDefaultTimeSignature = () => {
  let tSig = { top: 4, bottom: 4 }
  if (selectedIndeces.size === 1) {
    selectedIndeces.forEach((i) => {
      const note = chartNotes[i]

      if (note.type !== 'TimeSignature') return
      const n = note as TimeSignature

      tSig = { top: n.top, bottom: n.bottom }
    })
  }

  return tSig
}

const flipNotes = (notes: Note[]) => notes.forEach((n) => (n.lane *= -1))

export const flipSelection = () => {
  saveHistory()
  selectedIndeces.forEach((i) => (chartNotes[i].lane *= -1))
}

export const paste = (flip: boolean = false) => {
  if (flip) flipNotes(clipboard)

  isPasting = true
}

export const copy = () => {
  clipboard.splice(0)

  // Ensure full hold chains are included in the selection when copying.
  // Previously only HoldStart/HoldEnd expanded; include HoldTick so selecting
  // any part of a hold will copy the entire chain (start, ticks, end).
  chartNotes.forEach((n, i) => {
    if (!selectedIndeces.has(i)) return

    // If this note is any part of a hold chain, walk both directions and add
    // all connected nodes to the selection set.
    if (
      n.type === 'HoldStart' ||
      n.type === 'HoldTick' ||
      n.type === 'HoldEnd'
    ) {
      let j = n as HoldStart | HoldTick | HoldEnd

      // walk backwards to the HoldStart
      while ('prevNode' in j && j.prevNode) {
        const idx = chartNotes.indexOf(j.prevNode)
        if (idx >= 0) selectedIndeces.add(idx)
        j = j.prevNode
      }

      // reset to original and walk forwards to the HoldEnd
      j = n as HoldStart | HoldTick | HoldEnd
      while ('nextNode' in j && j.nextNode) {
        const idx = chartNotes.indexOf(j.nextNode)
        if (idx >= 0) selectedIndeces.add(idx)
        j = j.nextNode
      }
    }
  })

  // Build an ordered list of selected notes (stable by chart order)
  const selectedIndicesOrdered = Array.from(selectedIndeces).sort(
    (a, b) => a - b,
  )
  const selectedNotes = selectedIndicesOrdered.map((i) => chartNotes[i])

  // Map original -> clone so we can re-link hold prev/next pointers
  const map = new Map<Note, Note>()
  const clones: Note[] = []

  for (const n of selectedNotes) {
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

  // Re-link hold relationships to point to cloned nodes when applicable
  for (let i = 0; i < selectedNotes.length; i++) {
    const orig = selectedNotes[i]
    const clone = map.get(orig)!

    if ('nextNode' in (orig as any) && (orig as any).nextNode) {
      const on = (orig as any).nextNode as Note
      const cn = map.get(on)
      if (cn) (clone as any).nextNode = cn
      else delete (clone as any).nextNode
    }

    if ('prevNode' in (orig as any) && (orig as any).prevNode) {
      const on = (orig as any).prevNode as Note
      const cn = map.get(on)
      if (cn) (clone as any).prevNode = cn
      else delete (clone as any).prevNode
    }
  }

  // Normalize beat positions so the earliest selected note starts at beat 0
  const beats = clones.map((c) => c.beat ?? 0)
  const minBeat = beats.length > 0 ? Math.min(...beats) : 0
  clones.forEach((c) => (c.beat = (c.beat ?? 0) - minBeat))

  // Replace clipboard contents with freshly cloned notes
  clipboard.push(...clones)
}

export const cut = () => {
  copy()
  deleteSelected()
}

export let hiSpeedPanelShown = false
export let bpmChangePanelShown = false
export let TimeSignaturePanelShown = false

export const hideHiSpeedPanel = () => (hiSpeedPanelShown = false)
export const hideBPMChangePanel = () => (bpmChangePanelShown = false)
export const hideTimeSignaturePanel = () => (TimeSignaturePanelShown = false)

const sortHold = (baseNote: HoldStart | HoldTick | HoldEnd) => {
  let prevStart: HoldStart | null = null
  let prevEnd: HoldEnd | null = null

  const allNotes: Note[] = [baseNote]
  if (baseNote.type === 'HoldStart') prevStart = baseNote
  if (baseNote.type === 'HoldEnd') prevEnd = baseNote

  if ('prevNode' in baseNote) {
    let pN: HoldStart | HoldTick | HoldEnd = baseNote
    while ('prevNode' in pN) {
      pN = pN.prevNode
      allNotes.push(pN)

      if (pN.type === 'HoldStart') prevStart = pN
    }
  }
  if ('nextNode' in baseNote) {
    let nN: HoldStart | HoldTick | HoldEnd = baseNote
    while ('nextNode' in nN) {
      nN = nN.nextNode
      allNotes.push(nN)

      if (nN.type === 'HoldEnd') prevEnd = nN
    }
  }

  allNotes.sort((n1, n2) => n1.beat - n2.beat)

  for (let i = 0; i < allNotes.length; i++) {
    let n = allNotes[i] as HoldStart | HoldEnd | HoldTick
    // console.log(i, n.beat)

    if (i === 0) {
      n = n as HoldStart
      n.type = 'HoldStart'
      delete (n as any).prevNode

      n.isHidden = prevStart?.isHidden ?? false
      n.isGold = prevStart!.isGold
      n.isGuide = prevStart!.isGuide

      if (!('easingType' in (n as any))) n.easingType = EasingType.Linear
    } else if (i === allNotes.length - 1) {
      n = n as HoldEnd
      n.type = 'HoldEnd'
      delete (n as any).nextNode

      n.isHidden = prevEnd?.isHidden ?? false

      n.prevNode = allNotes[i - 1] as any
      n.prevNode.nextNode = n
      n.flickDir = prevEnd!.flickDir
      if (n.flickDir === FlickDirection.None) {
        n.isGold = prevStart!.isGold
      }
    } else {
      n = n as HoldTick
      n.type = 'HoldTick'

      n.isGold = prevStart!.isGold
      n.isGuide = prevStart!.isGuide

      n.prevNode = allNotes[i - 1] as any
      n.prevNode.nextNode = n
      if (!('easingType' in (n as any))) n.easingType = EasingType.Linear
      if (!('tickType' in (n as any))) n.tickType = TickType.Normal

      if (n.isGuide) n.tickType = TickType.Hidden
    }
  }
}

const toggleIsPlaying = () => {
  isPlaying = !isPlaying
  if (isPlaying) {
    musicPlayer.load()
    // apply music offset (convert ms -> seconds)
    const offsetSec = (musicOffsetMs ?? 0) / 1000
    let startTime = getTime(cursorPos) - offsetSec
    if (!Number.isFinite(startTime) || startTime < 0) startTime = 0
    // clamp to duration if available
    try {
      if (musicPlayer.duration && !isNaN(musicPlayer.duration)) {
        startTime = Math.min(startTime, musicPlayer.duration)
      }
    } catch (e) {
      // some browser environments may throw when accessing duration before metadata; ignore
    }

    musicPlayer.currentTime = startTime
    musicPlayer.play()
  } else {
    musicPlayer.pause()
    stopLong()
    stopLongGold()

    Object.values(noteFxPlayers).forEach((p) => {
      p.pause()
      p.currentTime = 0
    })
  }
}

document.addEventListener('mousemove', (e) => {
  if ((e.target as HTMLElement).tagName !== 'CANVAS') {
    mouseX = null
    mouseY = null

    return
  }

  mouseX = e.offsetX * window.devicePixelRatio
  mouseY = e.offsetY * window.devicePixelRatio
})

document.addEventListener('mousedown', () => (mouseIsPressed = true))
document.addEventListener('mouseup', () => (mouseIsPressed = false))

document.addEventListener('wheel', (e) => {
  // e.preventDefault()
  yOffset -= e.deltaY
})

document.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') {
    yOffset = -150
    cursorPos = 0
    if (isPlaying) toggleIsPlaying()
  }

  if (e.key === ' ') {
    toggleIsPlaying()
  }
})

const getBPM = (beat: number) => {
  return (
    chartNotes
      .filter((n) => n.type === 'BPMChange')
      .filter((n) => n.beat <= beat)
      .sort((a, b) => b.beat - a.beat)[0] as BPMChange
  ).BPM
}

const getTsig = (beat: number) => {
  const tSig = chartNotes
    .filter((n) => n.type === 'TimeSignature')
    .filter((n) => n.beat <= beat)
    .sort((a, b) => b.beat - a.beat)[0] as TimeSignature

  return {
    top: tSig.top,
    bottom: tSig.bottom,
  }
}

/**
 *
 * @returns time elapsed in seconds
 */
const getTime = (beat: number) => {
  let time = 0
  const changes = chartNotes.filter(
    (n) => n.type === 'BPMChange' && n.beat < beat,
  )

  for (let i = 0; i < changes.length; i++) {
    let beats = 0

    if (i === changes.length - 1) {
      beats = beat - changes[i].beat
    } else {
      beats = changes[i + 1].beat - changes[i].beat
    }

    time += (beats * 60) / (changes[i] as BPMChange).BPM
  }

  return time
}

const guideColor = '#38e584'
const goldGuideColor = '#ffcd36'

let lastTime: number

const draw = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  globalState: globalState,
  timeStamp: number,
) => {
  if (lastTime == undefined) {
    lastTime = timeStamp
  }

  const deltaTime = timeStamp - lastTime

  const { zoom, division, selectedTool } = globalState

  // Build time-signature segments (used by both mapping helpers and drawDivisions)
  const buildSegments = () => {
    const tsEvents = chartNotes
      .filter((n) => n.type === 'TimeSignature')
      .sort((a, b) => a.beat - b.beat) as TimeSignature[]

    if (tsEvents.length === 0 || tsEvents[0].beat !== 0) {
      tsEvents.unshift({
        type: 'TimeSignature',
        beat: 0,
        size: 0,
        lane: 0,
        top: 4,
        bottom: 4,
      } as TimeSignature)
    }

    const segs: { start: number; end: number; top: number; bottom: number }[] =
      []
    for (let i = 0; i < tsEvents.length; i++) {
      const start = tsEvents[i].beat
      const end = i + 1 < tsEvents.length ? tsEvents[i + 1].beat : Infinity
      segs.push({
        start,
        end,
        top: tsEvents[i].top,
        bottom: tsEvents[i].bottom,
      })
    }

    return segs
  }

  const segments = buildSegments()

  const getBeatFromMouse = (mouseY: number): number => {
    // Use a constant pixels-per-beat; beats always have the same height.
    const ppb = BEAT_HEIGHT * zoom
    // pixels from beat 0 measured downwards
    const pixelsFromZero = yOffset + height - mouseY

    if (pixelsFromZero <= 0) return 0

    const beat = pixelsFromZero / ppb
    return Math.max(0, beat)
  }
  //   let beat = 0
  //   let off = 0
  //   while (off < yOffset) {
  //     // const { bottom: tSigBottom } = getTsig(beat)
  //     off += (BEAT_HEIGHT * zoom * 4) / division
  //     beat += 4 / division
  //   }

  //   // if (off - yOffset !== 0 && yOffset > 0) {
  //   //   beat -= (off - yOffset) / (BEAT_HEIGHT * zoom)
  //   // }

  //   return beat
  // }

  const beatToY = (beat: number): number => {
    const ppb = BEAT_HEIGHT * zoom
    const pixelsFromZero = Math.max(0, beat) * ppb
    return height + yOffset - pixelsFromZero
  }

  const getPixelsFromZero = (beat: number): number => {
    const ppb = BEAT_HEIGHT * zoom
    return Math.max(0, beat) * ppb
  }

  const getLaneFromMouse = (mouseX: number): number =>
    Math.round(
      Math.max(-3, Math.min(3, (mouseX - width / 2) / (laneWidth * 2))) * 2,
    ) / 2

  const getNearestDivision = (beat: number): number => {
    // subdivisions per quarter-beat (keep beat unit as quarter notes)
    const divisionsPerQuarter = division / 4
    return Math.round(beat * divisionsPerQuarter) / divisionsPerQuarter
  }

  const getEventSize = (
    event: BPMChange | TimeSignature | HiSpeed,
  ): { width: number; height: number } => {
    const fontSize = '24px'
    const fontFamily = 'Arial'

    const textEl = document.createElement('p')
    textEl.style.fontSize = fontSize
    textEl.style.fontFamily = fontFamily
    textEl.style.display = 'inline'
    textEl.innerText =
      event.type === 'HiSpeed'
        ? `${(event as HiSpeed).speed}x`
        : event.type === 'BPMChange'
          ? `${(event as BPMChange).BPM} BPM`
          : `${(event as TimeSignature).top}/${(event as TimeSignature).bottom}`
    document.body.appendChild(textEl)
    const { width: textWidth, height: textHeight } =
      textEl.getBoundingClientRect()
    textEl.remove()
    const padding = 8

    return { width: textWidth + 2 * padding, height: textHeight + 2 * padding }
  }

  // Compute minimal horizontal offsets for timeline events so that
  // overlapping (vertically) events are nudged rightwards just enough to
  // avoid rectangle intersections. This runs once per draw and caches
  // results for use by hit-testing and rendering.
  const computeEventOffsets = () => {
    const eventTypes = ['BPMChange', 'TimeSignature', 'HiSpeed']
    const events = chartNotes.filter((n) => eventTypes.includes(n.type)) as (
      | BPMChange
      | TimeSignature
      | HiSpeed
    )[]

    const baseX = width / 2 + laneWidth * 6
    const spacing = 20

    // placed rects for already-placed events
    const placed: {
      top: number
      bottom: number
      left: number
      right: number
      event: BPMChange | TimeSignature | HiSpeed
    }[] = []

    // Sort by beat ascending and by type priority for identical beats so
    // BPMChange gets the smallest offset, then TimeSignature, then HiSpeed.
    events
      .slice()
      .sort((a, b) => {
        if (a.beat !== b.beat) return a.beat - b.beat
        const order: Record<string, number> = {
          BPMChange: 0,
          TimeSignature: 1,
          HiSpeed: 2,
        }
        return (order[a.type] ?? 99) - (order[b.type] ?? 99)
      })
      .forEach((ev) => {
        const size = getEventSize(ev)
        const bottom = beatToY(ev.beat)
        const top = bottom - size.height

        // try offsets starting from `spacing` and push right until no conflicts
        let offset = spacing
        while (true) {
          const left = baseX + offset
          const right = left + size.width

          // check conflicts with placed rects that vertically overlap
          let conflict: { r: (typeof placed)[0]; newOffset: number } | null =
            null

          for (const r of placed) {
            // vertical overlap?
            if (bottom < r.top || top > r.bottom) continue

            // horizontal overlap?
            if (!(right < r.left || left > r.right)) {
              // bump offset to right edge of this rect + spacing
              const suggested = r.right - baseX + spacing
              conflict = { r, newOffset: Math.max(offset + 1, suggested) }
              break
            }
          }

          if (!conflict) {
            // place it
            placed.push({ top, bottom, left, right, event: ev })
            return
          }

          offset = conflict.newOffset
        }
      })

    // convert to map for fast lookup
    const map = new Map<BPMChange | TimeSignature | HiSpeed, number>()
    for (const p of placed) map.set(p.event, p.left - baseX)
    return map
  }

  let _eventOffsetCache = computeEventOffsets()

  const getEventOffset = (
    event: BPMChange | TimeSignature | HiSpeed,
  ): number => {
    return _eventOffsetCache.get(event) ?? 20
  }

  if (
    dragMode !== DragMode.None &&
    dragStartX &&
    dragStartY &&
    mouseX &&
    mouseY &&
    !isPlaying
  ) {
    const xOff = dragStartX - mouseX

    if (xOff > laneWidth / 2) {
      dragStartX -= laneWidth

      if (
        dragMode === DragMode.Move &&
        chartNotes.filter(
          (n, i) => selectedIndeces.has(i) && n.lane - n.size / 2 <= -2.75,
        ).length === 0
      )
        chartNotes
          .filter((_, i) => selectedIndeces.has(i))
          .forEach((n) => (n.lane -= 0.5))
      else if (
        dragMode === DragMode.ScaleLeft &&
        chartNotes.filter(
          (n, i) =>
            selectedIndeces.has(i) &&
            (n.size > 5.5 || n.lane - n.size / 2 <= -3),
        ).length === 0
      )
        chartNotes
          .filter((_, i) => selectedIndeces.has(i))
          .forEach((n) => {
            n.lane -= 0.25
            n.size += 0.5
          })
      else if (
        dragMode === DragMode.ScaleRight &&
        chartNotes.filter((n, i) => selectedIndeces.has(i) && n.size <= 0.5)
          .length === 0
      )
        chartNotes
          .filter((_, i) => selectedIndeces.has(i))
          .forEach((n) => {
            n.lane -= 0.25
            n.size -= 0.5
          })
      else dragStartX += laneWidth
    } else if (xOff < -laneWidth / 2) {
      dragStartX += laneWidth

      if (
        dragMode === DragMode.Move &&
        chartNotes.filter(
          (n, i) => selectedIndeces.has(i) && n.lane + n.size / 2 >= 2.75,
        ).length === 0
      )
        chartNotes
          .filter((_, i) => selectedIndeces.has(i))
          .forEach((n) => (n.lane += 0.5))
      else if (
        dragMode === DragMode.ScaleLeft &&
        chartNotes.filter((n, i) => selectedIndeces.has(i) && n.size <= 0.5)
          .length === 0
      )
        chartNotes
          .filter((_, i) => selectedIndeces.has(i))
          .forEach((n) => {
            n.lane += 0.25
            n.size -= 0.5
          })
      else if (
        dragMode === DragMode.ScaleRight &&
        chartNotes.filter(
          (n, i) =>
            selectedIndeces.has(i) &&
            (n.size > 5.5 || n.lane + n.size / 2 >= 3),
        ).length === 0
      )
        chartNotes
          .filter((_, i) => selectedIndeces.has(i))
          .forEach((n) => {
            n.lane += 0.25
            n.size += 0.5
          })
      else dragStartX -= laneWidth
    }

    if (dragMode === DragMode.Move) {
      const yOff = dragStartY - mouseY

      const divisionHeight = (BEAT_HEIGHT * zoom) / (division / 4)
      const itter = Math.abs(Math.floor(yOff / divisionHeight))

      if (yOff > divisionHeight / 2) {
        dragStartY -= divisionHeight * itter

        chartNotes
          .filter((_, i) => selectedIndeces.has(i))
          .forEach((n) => (n.beat += (4 / division) * itter))
      } else if (yOff < -divisionHeight / 2) {
        if (
          chartNotes.filter(
            (n, i) => selectedIndeces.has(i) && n.beat < (4 / division) * itter,
          ).length === 0
        ) {
          dragStartY += divisionHeight * itter

          chartNotes
            .filter((_, i) => selectedIndeces.has(i))
            .forEach((n) => (n.beat -= (4 / division) * itter))
        }
      }
    }
  }

  mouseDown: if (!pMouseIsPressed && mouseIsPressed && !isPlaying) {
    // mouse down event
    if (mouseX === null || mouseY === null) break mouseDown

    const beatClicked = getBeatFromMouse(mouseY)
    const nearestBeat = getNearestDivision(beatClicked)
    cursorPos = nearestBeat

    // If we're in paste mode, commit the clipboard here where the user clicked.
    if (isPasting) {
      saveHistory()
      // Compute lane/beat offsets (same logic as preview) and create adjusted clones
      const rawLaneOffset = getLaneFromMouse(mouseX!)

      const groupLeft = Math.min(
        ...clipboard.map((n) => (n.lane ?? 0) - ((n as any).size ?? 1) / 2),
      )
      const groupRight = Math.max(
        ...clipboard.map((n) => (n.lane ?? 0) + ((n as any).size ?? 1) / 2),
      )
      const groupCenter = (groupLeft + groupRight) / 2
      const desiredLaneOffset = rawLaneOffset - groupCenter

      const allowedLows: number[] = []
      const allowedHighs: number[] = []
      for (const n of clipboard) {
        const size = (n as any).size ?? 1
        const minLane = -3 + size / 2
        const maxLane = 3 - size / 2
        allowedLows.push(minLane - (n.lane ?? 0))
        allowedHighs.push(maxLane - (n.lane ?? 0))
      }

      const overallLow =
        allowedLows.length > 0 ? Math.max(...allowedLows) : -Infinity
      const overallHigh =
        allowedHighs.length > 0 ? Math.min(...allowedHighs) : Infinity

      let laneOffset = desiredLaneOffset
      if (laneOffset < overallLow) laneOffset = overallLow
      if (laneOffset > overallHigh) laneOffset = overallHigh

      const minBeatInClipboard =
        clipboard.length > 0
          ? Math.min(...clipboard.map((n) => n.beat ?? 0))
          : 0
      const minBeatOffset = -minBeatInClipboard
      const beatOffset = Math.max(minBeatOffset, nearestBeat)

      const adjustedMap = new Map<Note, Note>()
      const adjusted: Note[] = clipboard.map((n) => {
        const copy: any = { ...(n as any) }
        copy.beat = (n.beat ?? 0) + beatOffset
        copy.lane = (n.lane ?? 0) + laneOffset
        adjustedMap.set(n, copy)
        return copy
      })

      for (let i = 0; i < clipboard.length; i++) {
        const orig = clipboard[i] as any
        const adj = adjusted[i] as any

        if ('nextNode' in orig && orig.nextNode) {
          const mapped = adjustedMap.get(orig.nextNode)
          if (mapped) adj.nextNode = mapped
          else delete adj.nextNode
        }

        if ('prevNode' in orig && orig.prevNode) {
          const mapped = adjustedMap.get(orig.prevNode)
          if (mapped) adj.prevNode = mapped
          else delete adj.prevNode
        }
      }

      // Insert adjusted notes into chartNotes and select them
      const startIndex = chartNotes.length
      chartNotes.push(...adjusted)
      selectedIndeces.clear()
      for (let i = 0; i < adjusted.length; i++)
        selectedIndeces.add(startIndex + i)

      isPasting = false

      break mouseDown
    }

    const notesAtPos = chartNotes.filter((n) => {
      const clickedLane = getLaneFromMouse(mouseX!)

      if (['HiSpeed', 'BPMChange', 'TimeSignature'].includes(n.type)) {
        const o =
          width / 2 +
          laneWidth * 6 +
          getEventOffset(n as BPMChange | TimeSignature | HiSpeed)
        const s = getEventSize(n as BPMChange | TimeSignature | HiSpeed)
        const b = beatToY(n.beat)
        return (
          mouseX! >= o &&
          mouseX! <= o + s.width &&
          mouseY! <= b &&
          mouseY! >= b - s.height
        )
      }

      return (
        n.beat === nearestBeat &&
        clickedLane <= n.lane + n.size / 2 &&
        clickedLane >= n.lane - n.size / 2
      )
    })

    if (
      selectedIndeces.size <= 0 ||
      notesAtPos.length <= 0 ||
      !selectedIndeces.has(chartNotes.indexOf(notesAtPos[0]))
    ) {
      selectedIndeces.clear()
      if (notesAtPos.length !== 0) {
        let note = notesAtPos[0]
        selectedIndeces.add(chartNotes.indexOf(note))

        if (selectedTool === 0) {
          dragStartX = mouseX
          dragStartY = mouseY

          let dragScaleLeftEdge =
            width / 2 + laneWidth * (note.lane - note.size / 2 + 1 / 6) * 2
          let dragScaleRightEdge =
            width / 2 + laneWidth * (note.lane + note.size / 2 - 1 / 6) * 2

          if (mouseX <= dragScaleLeftEdge) dragMode = DragMode.ScaleLeft
          else if (mouseX >= dragScaleRightEdge) dragMode = DragMode.ScaleRight
          else dragMode = DragMode.Move
        }
      } else if (selectedTool === 0) {
        selectionStartX = mouseX
        selectionStartY = mouseY
      }

      if (selectedIndeces.size === 1) {
        selectedIndeces.forEach((i) => {
          const n = chartNotes[i]

          if (n.type === 'HiSpeed') {
            hiSpeedPanelShown = true
          } else if (n.type === 'BPMChange') {
            bpmChangePanelShown = true
          } else if (n.type === 'TimeSignature') {
            TimeSignaturePanelShown = true
          }
        })
      }
    }

    if ([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(selectedTool)) {
      if (notesAtPos.length > 0 && ![8, 9, 10].includes(selectedTool)) {
        if (selectedTool === 0) {
          const noteToDrag = notesAtPos[0]

          dragStartX = mouseX
          dragStartY = mouseY

          let dragScaleLeftEdge =
            width / 2 +
            laneWidth * (noteToDrag.lane - noteToDrag.size / 2 + 1 / 6) * 2
          let dragScaleRightEdge =
            width / 2 +
            laneWidth * (noteToDrag.lane + noteToDrag.size / 2 - 1 / 6) * 2

          if (mouseX <= dragScaleLeftEdge) dragMode = DragMode.ScaleLeft
          else if (mouseX >= dragScaleRightEdge) dragMode = DragMode.ScaleRight
          else dragMode = DragMode.Move
        }

        selectedIndeces.forEach((i) => {
          if (selectedTool === 2) {
            let note = chartNotes[i] as HoldStart | HoldTick
            if (note.type !== 'HoldStart' && note.type !== 'HoldTick') return

            if (note.easingType === EasingType.Linear)
              note.easingType = EasingType.EaseIn
            else if (note.easingType === EasingType.EaseIn)
              note.easingType = EasingType.EaseOut
            else if (note.easingType === EasingType.EaseOut)
              note.easingType = EasingType.EaseInOut
            else if (note.easingType === EasingType.EaseInOut)
              note.easingType = EasingType.EaseOutIn
            else note.easingType = EasingType.Linear
          } else if (selectedTool === 3) {
            let note = chartNotes[i] as HoldTick
            if (note.type !== 'HoldTick') return

            if (note.isGuide) {
              note.tickType = TickType.Hidden
              return
            }

            if (note.tickType === TickType.Normal)
              note.tickType = TickType.Hidden
            else if (note.tickType === TickType.Hidden)
              note.tickType = TickType.Skip
            else if (note.tickType === TickType.Skip)
              note.tickType = TickType.Normal
          }

          let note = chartNotes[i] as TapNote

          saveHistory()

          if (selectedTool === 5) {
            if ((note as any).type !== 'HoldTick') {
              if (
                (note as any).type !== 'HoldEnd' ||
                (note as any as HoldEnd).flickDir !== FlickDirection.None
              ) {
                const newGoldStatus = !note.isGold
                note.isGold = newGoldStatus
                if ((note as any).type === 'HoldStart') {
                  let n = chartNotes[i] as HoldStart | HoldTick | HoldEnd

                  while ('nextNode' in n) {
                    n.nextNode.isGold = newGoldStatus
                    n = n.nextNode
                  }
                }
              }
            }
          }
          if (selectedTool === 6) note.isTrace = !note.isTrace

          if (selectedTool === 4) {
            if (!['HoldStart', 'HoldTick'].includes((note as any).type)) {
              const current = note.flickDir

              if (current === FlickDirection.None)
                note.flickDir = FlickDirection.Default
              else if (current === FlickDirection.Default)
                note.flickDir = FlickDirection.Left
              else if (current === FlickDirection.Left)
                note.flickDir = FlickDirection.Right
              else if (current === FlickDirection.Right) {
                note.flickDir = FlickDirection.None

                if ((note as any).type === 'HoldEnd') {
                  let n = note as any as HoldEnd
                  note.isGold = n.prevNode.isGold
                }
              }
            }
          }
        })
      } else if (selectedTool !== 0) {
        const newLane = Math.min(
          3 - nextNoteOptions.size / 2,
          Math.max(
            -3 + nextNoteOptions.size / 2,
            Math.floor(
              (mouseX - width / 2) / laneWidth +
                (nextNoteOptions.size % 1 === 0 ? 0.5 : 0),
            ) /
              2 +
              (nextNoteOptions.size % 1 === 0 ? 0 : 0.25),
          ),
        )

        if (selectedTool === 8) {
          if (
            chartNotes.filter(
              (n) => n.type === 'BPMChange' && n.beat === nearestBeat,
            ).length === 0
          ) {
            saveHistory()
            const newNote = {
              beat: nearestBeat,
              lane: 0,
              size: 0,
              type: 'BPMChange',
              BPM: 160,
            } as BPMChange

            chartNotes.push(newNote)
          }
        } else if (selectedTool === 9) {
          if (
            chartNotes.filter(
              (n) => n.type === 'TimeSignature' && n.beat === nearestBeat,
            ).length === 0
          ) {
            saveHistory()
            const newNote = {
              beat: nearestBeat,
              lane: 0,
              size: 0,
              type: 'TimeSignature',
              top: 4,
              bottom: 4,
            } as TimeSignature

            chartNotes.push(newNote)
          }
        } else if (selectedTool === 10) {
          if (
            chartNotes.filter(
              (n) => n.type === 'HiSpeed' && n.beat === nearestBeat,
            ).length === 0
          ) {
            saveHistory()
            const newNote = {
              beat: nearestBeat,
              lane: 0,
              size: 0,
              type: 'HiSpeed',
              speed: 1,
            } as HiSpeed

            chartNotes.push(newNote)
          }
        } else if (selectedTool === 2 || selectedTool === 7) {
          saveHistory()
          const newStartNote = {
            type: 'HoldStart',
            beat: nearestBeat,
            lane: newLane,
            size: nextNoteOptions.size,
            isGold: false,
            isTrace: false,
            easingType: EasingType.Linear,
            isGuide: selectedTool === 7,
            isHidden: selectedTool === 7,
          } as HoldStart

          const newEndNote = {
            type: 'HoldEnd',
            beat: nearestBeat + getTsig(nearestBeat).bottom / division,
            lane: newLane,
            size: nextNoteOptions.size,
            isGold: false,
            isTrace: false,
            flickDir: FlickDirection.None,
            isHidden: selectedTool === 7,
            prevNode: newStartNote,
          } as HoldEnd

          newStartNote.nextNode = newEndNote

          chartNotes.push(newStartNote)
          chartNotes.push(newEndNote)
        } else if (selectedTool === 3) {
          saveHistory()
          const viableNotes = chartNotes
            .filter((n) => {
              if (
                (n.type !== 'HoldStart' && n.type !== 'HoldTick') ||
                n.beat >= nearestBeat
              )
                return false
              const note = n as HoldStart | HoldTick

              let nN = note.nextNode
              while ('nextNode' in nN && nN.tickType === TickType.Skip)
                nN = nN.nextNode

              if (nN.beat <= nearestBeat) return false

              // console.log('beat works: ', n)

              const percentY = (nearestBeat - note.beat) / (nN.beat - note.beat)
              const easedY =
                note.easingType === EasingType.EaseIn
                  ? Math.pow(percentY, 2)
                  : note.easingType === EasingType.EaseOut
                    ? 1 - Math.pow(1 - percentY, 2)
                    : percentY

              const lanePos = (1 - easedY) * note.lane + easedY * nN.lane
              const sizePos = (1 - easedY) * note.size + easedY * nN.size

              const minX = (lanePos - sizePos / 2) * 2 * laneWidth + width / 2
              const maxX = (lanePos + sizePos / 2) * 2 * laneWidth + width / 2

              // console.log(minX, mouseX, maxX)

              if (!mouseX) return false

              if (mouseX < minX || mouseX > maxX) return false

              return true
            })
            .sort((a, b) => b.beat - a.beat)

          if (viableNotes.length > 0) {
            const base = viableNotes[0] as HoldStart | HoldTick
            const end = base.nextNode

            const newNote = {
              type: 'HoldTick',
              beat: nearestBeat,
              lane: newLane,
              size: nextNoteOptions.size,
              isGold: base.isGold,
              isGuide: base.isGuide,
              tickType: base.isGuide
                ? TickType.Hidden
                : nextNoteOptions.tickType,
              easingType: EasingType.Linear,
              nextNode: end,
              prevNode: base,
            } as HoldTick

            base.nextNode = newNote
            end.prevNode = newNote

            chartNotes.push(newNote)
          }
        } else {
          saveHistory()
          const newNote = {
            type: 'Tap',
            beat: nearestBeat,
            lane: newLane,
            size: nextNoteOptions.size,
            isGold: selectedTool === 5,
            isTrace: selectedTool === 6,
            flickDir:
              selectedTool === 4
                ? nextNoteOptions.flickDir
                : FlickDirection.None,
          } as TapNote

          chartNotes.push(newNote)
        }
      }
    }
  }

  mouseUp: if (pMouseIsPressed && !mouseIsPressed && !isPlaying) {
    dragStartX = null
    dragStartY = null
    dragMode = DragMode.None

    // mouse up event
    if (mouseX === null || mouseY === null) break mouseUp

    if (selectionStartX && selectionStartY) {
      const mX = Math.min(selectionStartX, mouseX)
      const MX = Math.max(selectionStartX, mouseX)
      const mY = Math.min(selectionStartY, mouseY)
      const MY = Math.max(selectionStartY, mouseY)
      const minLane = getLaneFromMouse(mX)
      const maxLane = getLaneFromMouse(MX)
      const minBeat = getBeatFromMouse(MY)
      const maxBeat = getBeatFromMouse(mY)

      chartNotes
        .filter((n) => {
          if (['HiSpeed', 'BPMChange', 'TimeSignature'].includes(n.type)) {
            const o =
              width / 2 +
              laneWidth * 6 +
              getEventOffset(n as BPMChange | TimeSignature | HiSpeed)
            const s = getEventSize(n as BPMChange | TimeSignature | HiSpeed)
            const b = beatToY(n.beat)
            return mX <= o && MX >= o + s.width && MY >= b && mY <= b - s.height
          }

          return (
            n.beat <= maxBeat &&
            n.beat >= minBeat &&
            n.lane - n.size / 2 <= maxLane &&
            n.lane + n.size / 2 >= minLane
          )
        })
        .forEach((n) => selectedIndeces.add(chartNotes.indexOf(n)))

      selectionStartX = null
      selectionStartY = null
    }

    if (selectedIndeces.size > 0) {
      chartNotes
        .filter((_, i) => selectedIndeces.has(i))
        .forEach((n) => {
          if (['HoldStart', 'HoldTick', 'HoldEnd'].includes(n.type))
            sortHold(n as HoldStart | HoldTick | HoldEnd)
        })
    }
  }

  if (isPlaying) {
    const pBeat = cursorPos
    cursorPos += (getBPM(cursorPos) * deltaTime) / 60000
    // compute pixel offset for current beat accounting for time-signature bottoms
    const pixels = getPixelsFromZero(cursorPos)
    // keep cursor at a fixed vertical position (height - 250)
    yOffset = pixels - 250

    // const pTime = getTime(cursorPos) - deltaTime

    chartNotes
      .filter((n) => n.beat >= pBeat && n.beat < cursorPos)
      .forEach((n) => {
        if (['Tap', 'HoldStart', 'HoldEnd', 'HoldTick'].includes(n.type)) {
          if (n.type === 'HoldStart') {
            if ((n as HoldStart).isGuide) return

            if ((n as HoldStart).isGold) {
              if (goldHoldsPlaying === 0) {
                playLongGold()
              }

              goldHoldsPlaying++
            } else {
              if (holdsPlaying === 0) {
                playLong()
              }

              holdsPlaying++
            }

            if ((n as HoldStart).isHidden) return
          }
          if (n.type === 'HoldEnd') {
            if ((n as HoldEnd).prevNode.isGuide) return

            if ((n as HoldEnd).prevNode.isGold) {
              goldHoldsPlaying--

              if (goldHoldsPlaying === 0) {
                stopLongGold()
              }
            } else {
              holdsPlaying--

              if (holdsPlaying === 0) {
                stopLong()
              }
            }

            if ((n as HoldEnd).isHidden) return
          }
          const note = n as TapNote
          let p: HTMLAudioElement
          if (n.type === 'HoldTick') {
            if ((n as HoldTick).tickType !== TickType.Hidden)
              p = note.isGold ? noteFxPlayers.critTick : noteFxPlayers.tick
            else return
          } else if (
            n.type !== 'HoldStart' &&
            note.flickDir !== FlickDirection.None
          ) {
            p = note.isGold ? noteFxPlayers.critFlick : noteFxPlayers.flick
          } else if (note.isTrace) {
            p = note.isGold ? noteFxPlayers.critTrace : noteFxPlayers.trace
          } else {
            p = note.isGold ? noteFxPlayers.critical : noteFxPlayers.tap
          }
          p.currentTime = 0
          p.play()
        }
      })
  }

  if (yOffset < -150) {
    yOffset = -150
  }

  if (pZoom !== zoom && pZoom !== 0) {
    yOffset *= zoom / pZoom
  }

  ctx.clearRect(0, 0, width, height)

  ctx.fillStyle = '#0007'
  ctx.fillRect(0, 0, width, height)

  const drawLanes = () => {
    ctx.fillStyle = '#2229'
    ctx.fillRect(width / 2 - 6 * laneWidth, 0, 12 * laneWidth, height)

    ctx.beginPath()
    for (let i = 0; i < 13; i += 2) {
      let xOff = width / 2 + laneWidth * (i - 6)
      ctx.moveTo(xOff, 0)
      ctx.lineTo(xOff, height)
    }
    ctx.strokeStyle = '#bbbb'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.beginPath()
    for (let i = 1; i < 13; i += 2) {
      let xOff = width / 2 + laneWidth * (i - 6)
      ctx.moveTo(xOff, 0)
      ctx.lineTo(xOff, height)
    }
    ctx.strokeStyle = '#888b'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  drawLanes()

  const drawDivisions = () => {
    // Draw division lines by iterating subdivision indices per time-signature segment.
    // This avoids floating-point accumulation by using integer subdivision indices (k).

    // visible beat range (bottom -> top)
    const visibleMinBeat = getBeatFromMouse(height)
    const visibleMaxBeat = getBeatFromMouse(0)

    // use prebuilt `segments` (constructed above) which already contains
    // contiguous time-signature segments starting at beat 0

    // iterate segments that overlap visible range
    for (const seg of segments) {
      const segStart = Math.max(seg.start, visibleMinBeat)
      const segEnd = Math.min(seg.end, visibleMaxBeat)
      if (!(segStart <= segEnd)) continue

      // subdivisions per quarter-beat (keep beat unit as quarter notes)
      const subsPerBeat = division / 4

      // integer subdivision indices that lie in this segment
      const kStart = Math.ceil(segStart * subsPerBeat - 1e-9)
      const kEnd = Math.floor(segEnd * subsPerBeat + 1e-9)

      // measure width in subdivisions: division * top / bottom
      const measureSubCount = Math.round((division * seg.top) / seg.bottom)

      // offset in subdivision units where this segment starts (so kRelative resets to 0 at segment start)
      const segOffsetK = Math.round(seg.start * subsPerBeat)

      for (let k = kStart; k <= kEnd; k++) {
        const beat = k / subsPerBeat
        // round beat to avoid tiny FP noise when rendering/labeling
        const beatRounded = Math.round((beat + Number.EPSILON) * 1e9) / 1e9
        const y = beatToY(beatRounded)
        if (y < -10 || y > height + 10) continue

        ctx.beginPath()

        const kRelative = k - segOffsetK
        const isMeasureLine =
          measureSubCount > 0 &&
          kRelative >= 0 &&
          kRelative % measureSubCount === 0

        // determine whether this line falls exactly on a beat according to the time-signature bottom
        // use kRelative (subdivision index relative to segment start) so beat lines reset per segment
        // beatTimesFactor = kRelative * seg.bottom / division -> integer when on a beat
        const beatTimesFactor = (kRelative * seg.bottom) / division
        const isBeatLine =
          kRelative >= 0 &&
          Math.abs(Math.round(beatTimesFactor) - beatTimesFactor) < 1e-9

        if (isMeasureLine) {
          ctx.moveTo(width / 2 - 7 * laneWidth, y)
          ctx.lineTo(width / 2 + 7 * laneWidth, y)
          ctx.strokeStyle = 'rgba(220,220,220,0.95)'
          ctx.lineWidth = 3
          ctx.stroke()

          ctx.fillStyle = ctx.strokeStyle
          ctx.textBaseline = 'middle'
          // measure number relative to segment start (1-based)
          const measureIndex = Math.floor(kRelative / measureSubCount) + 1
          // annotate first measure of a new time signature with the signature text

          ctx.fillText(
            measureIndex.toString(),
            width / 2 - 7 * laneWidth - 30,
            y,
          )
        } else if (isBeatLine) {
          // full beat lines are more visible than subdivisions
          ctx.moveTo(width / 2 - 6 * laneWidth, y)
          ctx.lineTo(width / 2 + 6 * laneWidth, y)
          ctx.strokeStyle = 'rgba(221,221,221,0.75)'
          ctx.lineWidth = 2
          ctx.stroke()
        } else {
          // subdivisions should be faint
          ctx.moveTo(width / 2 - 6 * laneWidth, y)
          ctx.lineTo(width / 2 + 6 * laneWidth, y)
          ctx.strokeStyle = 'rgba(119,119,119,0.67)'
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }
    }
  }

  drawDivisions()

  const drawWaveform = () => {
    if (!waveformReady || !waveform || waveform.length === 0) return

    // visible beat range (bottom -> top)
    const visibleMinBeat = getBeatFromMouse(height)
    const visibleMaxBeat = getBeatFromMouse(0)

    if (visibleMaxBeat <= visibleMinBeat) return

    const leftEdge = width / 2 - 6 * laneWidth
    const rightEdge = width / 2 + 6 * laneWidth
    const centerX = (leftEdge + rightEdge) / 2
    const maxHalfWidth = (rightEdge - leftEdge) / 2 - 6 // small padding

    const leftPoints: { x: number; y: number }[] = []
    const rightPoints: { x: number; y: number }[] = []

    // sample every N pixels vertically to keep it fast
    const step = Math.max(1, Math.floor(window.devicePixelRatio)) * 2

    for (let y = 0; y <= height; y += step) {
      const beat = getBeatFromMouse(y)

      // map beat -> time in seconds using chart BPM map
      const timeSec = getTime(beat)

      // apply music offset (ms -> seconds)
      const offsetSec = (musicOffsetMs ?? 0) / 1000
      const adjustedTime = timeSec - offsetSec

      const t = waveformDuration > 0 ? adjustedTime / waveformDuration : 0

      let amp = 0
      if (t >= 0 && t <= 1) {
        const idx = Math.floor(t * (waveform.length - 1))
        amp = waveform[idx] ?? 0
      }

      const halfW = amp * maxHalfWidth

      leftPoints.push({ x: centerX - halfW, y })
      rightPoints.push({ x: centerX + halfW, y })
    }

    // draw filled waveform (left side top->bottom, right side bottom->top)
    ctx.beginPath()
    // left side
    for (let i = 0; i < leftPoints.length; i++) {
      const p = leftPoints[i]
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }

    // right side (reverse)
    for (let i = rightPoints.length - 1; i >= 0; i--) {
      const p = rightPoints[i]
      ctx.lineTo(p.x, p.y)
    }

    ctx.closePath()

    // gradient fill to match guide style
    // const grad = ctx.createLinearGradient(0, 0, 0, height)
    // grad.addColorStop(0, guideColor + '66')
    // grad.addColorStop(1, guideColor + '11')
    // ctx.fillStyle = grad
    ctx.fillStyle = '#bbb3'
    ctx.fill()
  }

  drawWaveform()

  const cursorY = beatToY(cursorPos)

  if (cursorY >= 0 && cursorY <= height) {
    ctx.beginPath()
    ctx.moveTo(width / 2 - 6 * laneWidth - 1, cursorY)
    ctx.lineTo(width / 2 + 6 * laneWidth, cursorY)
    ctx.strokeStyle = 'red'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(width / 2 - 6 * laneWidth, cursorY)
    ctx.lineTo(width / 2 - 6 * laneWidth - 16, cursorY - 10)
    ctx.lineTo(width / 2 - 6 * laneWidth - 16, cursorY + 10)
    ctx.fillStyle = 'red'
    ctx.fill()
  }

  const minBeat = getBeatFromMouse(height + NOTE_HEIGHT * 2)
  const maxBeat = getBeatFromMouse(-NOTE_HEIGHT)

  const notesToRender = chartNotes.filter(
    (n) => n.beat >= minBeat && n.beat <= maxBeat,
  )

  const getNoteImageName = (n: Note): string => {
    let noteImageName = 'notes_2'
    if (n.type === 'HoldTick') return 'tick'
    else if (n.type === 'Tap') {
      const note = n as TapNote

      if (note.isTrace) {
        if (note.isGold) noteImageName = 'notes_5'
        else if (note.flickDir !== FlickDirection.None)
          noteImageName = 'notes_6'
        else noteImageName = 'notes_4'
      } else if (note.isGold) noteImageName = 'notes_0'
      else if (note.flickDir !== FlickDirection.None) noteImageName = 'notes_3'
    } else if (n.type === 'HoldStart' || n.type === 'HoldEnd') {
      const note = n as HoldStart | HoldEnd
      if (note.isHidden) return 'hidden'
      if (note.isTrace) {
        if (note.isGold) noteImageName = 'notes_5'
        else if (
          note.type === 'HoldEnd' &&
          note.flickDir !== FlickDirection.None
        )
          noteImageName = 'notes_6'
        else noteImageName = 'notes_4'
      } else if (note.isGold) noteImageName = 'notes_0'
      else if (note.type === 'HoldEnd' && note.flickDir !== FlickDirection.None)
        noteImageName = 'notes_3'
      else noteImageName = 'notes_1'
    } else {
      return 'none'
    }

    return noteImageName
  }

  const drawNote = (n: Note) => {
    const { lane, beat, size } = n

    if (n.type === 'HiSpeed') {
      const note = n as HiSpeed
      const y = beatToY(beat)
      const lanesEdge = width / 2 + 6 * laneWidth

      const startX = getEventOffset(note)

      ctx.beginPath()
      ctx.moveTo(lanesEdge, y)
      ctx.lineTo(lanesEdge + startX + 4, y)
      ctx.strokeStyle = 'red'
      ctx.lineWidth = 4
      if (selectedIndeces.has(chartNotes.indexOf(note)))
        ctx.strokeStyle = '#ff4444'
      ctx.stroke()

      const fontSize = '24px'
      const fontFamily = 'arial'

      const { width: eventWidth, height: eventHeight } = getEventSize(note)

      ctx.beginPath()
      // ctx.fillRect(lanesEdge + 40, y + 2, 200, -40)
      ctx.roundRect(lanesEdge + startX, y + 2, eventWidth, -eventHeight, 4)
      ctx.fillStyle = 'red'
      if (selectedIndeces.has(chartNotes.indexOf(note)))
        ctx.fillStyle = '#ff4444'
      ctx.fill()

      ctx.fillStyle = 'black'
      ctx.font = `${fontSize} ${fontFamily}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`${note.speed}x`, lanesEdge + startX + 8, y - 8)

      return
    } else if (n.type === 'TimeSignature') {
      const note = n as TimeSignature
      const y = beatToY(beat)
      const lanesEdge = width / 2 + 6 * laneWidth

      const startX = getEventOffset(note)

      ctx.beginPath()
      ctx.moveTo(lanesEdge, y)
      ctx.lineTo(lanesEdge + startX + 4, y)
      ctx.strokeStyle = 'yellow'
      ctx.lineWidth = 4
      if (selectedIndeces.has(chartNotes.indexOf(note)))
        ctx.strokeStyle = '#ffff99'
      ctx.stroke()

      const fontSize = '24px'
      const fontFamily = 'arial'

      const { width: eventWidth, height: eventHeight } = getEventSize(note)

      ctx.beginPath()
      // ctx.fillRect(lanesEdge + 40, y + 2, 200, -40)
      ctx.roundRect(lanesEdge + startX, y + 2, eventWidth, -eventHeight, 4)
      ctx.fillStyle = 'yellow'
      if (selectedIndeces.has(chartNotes.indexOf(note)))
        ctx.fillStyle = '#ffff99'
      ctx.fill()

      ctx.fillStyle = 'black'
      ctx.font = `${fontSize} ${fontFamily}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`${note.top}/${note.bottom}`, lanesEdge + startX + 8, y - 8)

      return
    } else if (n.type === 'BPMChange') {
      const note = n as BPMChange
      const y = beatToY(beat)
      const lanesEdge = width / 2 + 6 * laneWidth

      const startX = getEventOffset(note)

      ctx.beginPath()
      ctx.moveTo(lanesEdge, y)
      ctx.lineTo(lanesEdge + startX + 4, y)
      ctx.strokeStyle = 'lime'
      ctx.lineWidth = 4
      if (selectedIndeces.has(chartNotes.indexOf(note)))
        ctx.strokeStyle = '#99ff99'
      ctx.stroke()

      const fontSize = '24px'
      const fontFamily = 'arial'

      const { width: eventWidth, height: eventHeight } = getEventSize(note)

      ctx.beginPath()
      // ctx.fillRect(lanesEdge + 40, y + 2, 200, -40)
      ctx.roundRect(lanesEdge + startX, y + 2, eventWidth, -eventHeight, 4)
      ctx.fillStyle = 'lime'
      if (selectedIndeces.has(chartNotes.indexOf(note)))
        ctx.fillStyle = '#99ff99'
      ctx.fill()

      ctx.fillStyle = 'black'
      ctx.font = `${fontSize} ${fontFamily}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(note.BPM.toString() + ' BPM', lanesEdge + startX + 8, y - 8)

      return
    }

    let aspectRatio = 4

    const x = width / 2 + (lane * 2 - size) * laneWidth
    const w = size * 2 * laneWidth
    const y = beatToY(beat) - NOTE_HEIGHT / 2
    const h = NOTE_HEIGHT

    if (n.type === 'HoldTick') {
      if (!hideTickOutlines && !(hideTickOutlinesOnPlay && isPlaying)) {
        ctx.beginPath()
        ctx.roundRect(x, y + 16, w, h - 32, 4)

        ctx.strokeStyle = '#7fffd3'
        if ((n as HoldTick).tickType === TickType.Skip) ctx.strokeStyle = 'cyan'
        ctx.stroke()
      }
    } else {
      const noteImageName = getNoteImageName(n)
      if (noteImageName === 'none') return
      else if (noteImageName === 'hidden') {
        ctx.beginPath()
        ctx.roundRect(x, y + 16, w, h - 32, 4)

        ctx.fillStyle = guideColor
        if ((n as HoldStart).isGold) ctx.fillStyle = goldGuideColor
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 3
        ctx.fill()
        ctx.stroke()
        return
      }

      const rect = getRect(noteImageName)!

      const edgeSize = NOTE_HEIGHT
      aspectRatio = rect.h / NOTE_HEIGHT

      const x1 = x - 15
      const w1 = edgeSize

      const x3 = x + w - NOTE_HEIGHT + 15
      const w3 = w1

      const x2 = x1 + w1 //- 1
      const w2 = Math.abs(x1 - x3) - w1 //+ 2

      // first part
      ctx.drawImage(
        imageSource,
        rect.x,
        rect.y,
        w1 * aspectRatio,
        rect.h,
        x1,
        y,
        w1,
        h,
      )

      // last part
      ctx.drawImage(
        imageSource,
        rect.x + rect.w - w1 * aspectRatio,
        rect.y,
        w1 * aspectRatio,
        rect.h,
        x3,
        y,
        w3,
        h,
      )

      // middle part
      ctx.drawImage(
        imageSource,
        rect.x + edgeSize * aspectRatio,
        rect.y,
        rect.w - w1 * aspectRatio * 2,
        rect.h,
        x2,
        y,
        w2,
        h,
      )
    }

    if (
      n.type === 'Tap' ||
      n.type === 'HoldStart' ||
      n.type === 'HoldEnd' ||
      n.type === 'HoldTick'
    ) {
      let note: TapNote | HoldEnd
      if (n.type === 'Tap') note = n as TapNote
      else note = n as HoldEnd

      if (
        note.isTrace ||
        ((note as any).type === 'HoldTick' &&
          (note as any).tickType !== TickType.Hidden)
      ) {
        let traceSpriteName = 'notes_friction_among_'
        if (note.isGold) traceSpriteName += 'crtcl'
        else if (
          !['HoldStart', 'HoldTick'].includes((note as any).type) &&
          note.flickDir !== FlickDirection.None
        )
          traceSpriteName += 'flick'
        else traceSpriteName += 'long'

        const traceRect = getRect(traceSpriteName)!

        const tw = (1.75 * traceRect.w) / aspectRatio
        const th = (1.75 * traceRect.h) / aspectRatio
        let tx = (width - tw) / 2 + lane * 2 * laneWidth

        if (
          (note as any).type === 'HoldTick' &&
          (note as any).tickType === TickType.Skip
        ) {
          const n = note as any as HoldTick
          let pN = n.prevNode
          let nN = n.nextNode

          while ('prevNode' in pN && pN.tickType === TickType.Skip)
            pN = pN.prevNode

          while ('nextNode' in nN && nN.tickType === TickType.Skip)
            nN = nN.nextNode

          const percentY = (n.beat - pN.beat) / (nN.beat - pN.beat)
          const easedY =
            pN.easingType === EasingType.EaseIn
              ? Math.pow(percentY, 2)
              : pN.easingType === EasingType.EaseOut
                ? 1 - Math.pow(1 - percentY, 2)
                : percentY
          tx =
            (width - tw) / 2 +
            ((1 - easedY) * pN.lane + easedY * nN.lane) * 2 * laneWidth
        }

        const ty = y - NOTE_HEIGHT / 20

        ctx.drawImage(
          imageSource,
          traceRect.x,
          traceRect.y,
          traceRect.w,
          traceRect.h,
          tx,
          ty,
          tw,
          th,
        )
      }
    }
  }

  const drawFlickArrow = (n: Note) => {
    const { lane, beat } = n

    const noteImageName = getNoteImageName(n)

    const rect = getRect(noteImageName)!
    if (['none', 'tick', 'hidden'].includes(noteImageName)) return

    const aspectRatio = rect.h / NOTE_HEIGHT

    const y = beatToY(beat) - NOTE_HEIGHT / 2

    if (n.type === 'Tap' || n.type === 'HoldEnd') {
      let note: TapNote | HoldEnd
      if (n.type === 'Tap') note = n as TapNote
      else note = n as HoldEnd
      if (note.flickDir !== FlickDirection.None) {
        let flickSpriteName = 'notes_flick_arrow_'
        if (note.isGold) flickSpriteName += 'crtcl_'
        flickSpriteName += '0' + Math.min(6, n.size * 2)
        if (note.flickDir !== FlickDirection.Default)
          flickSpriteName += '_diagonal'

        const flickRect = getRect(flickSpriteName)!

        let fw = (1.25 * flickRect.w) / aspectRatio
        const fh = (1.25 * flickRect.h) / aspectRatio
        let fx = (width - fw) / 2 + lane * 2 * laneWidth
        const fy = y - fh

        if (note.flickDir === FlickDirection.Right) {
          ctx.scale(-1, 1)
          fw *= -1
          fx *= -1
        }

        ctx.drawImage(
          imageSource,
          flickRect.x,
          flickRect.y,
          flickRect.w,
          flickRect.h,
          fx,
          fy,
          fw,
          fh,
        )

        if (note.flickDir === FlickDirection.Right) ctx.scale(-1, 1)
      }
    }
  }

  const drawSelectionOutline = (n: Note) => {
    if (['HiSpeed', 'TimeSignature', 'BPMChange'].includes(n.type)) return

    const selectionOutlinePadding = 8

    const { lane, beat, size } = n

    const x =
      width / 2 + (lane * 2 - size) * laneWidth - selectionOutlinePadding
    const w = size * 2 * laneWidth + 2 * selectionOutlinePadding
    const y = beatToY(beat) - NOTE_HEIGHT / 2 + selectionOutlinePadding / 2
    const h = NOTE_HEIGHT - selectionOutlinePadding

    ctx.beginPath()
    ctx.roundRect(x, y, w, h, selectionOutlinePadding)
    ctx.fillStyle = '#ddd4'
    ctx.strokeStyle = '#ddd'
    ctx.fill()
    ctx.stroke()
  }

  const drawHoldLine = (n: Note) => {
    const note = n as HoldStart | HoldTick
    let nextNote = note.nextNode

    if (
      note.type === 'HoldTick' &&
      (note as HoldTick).tickType === TickType.Skip
    )
      return

    while ('nextNode' in nextNote && nextNote.tickType === TickType.Skip) {
      nextNote = nextNote.nextNode
    }

    const startX = width / 2 + (note.lane - note.size / 2) * 2 * laneWidth
    const startW = note.size * 2 * laneWidth
    const startY = beatToY(note.beat)

    const endX = width / 2 + (nextNote.lane - nextNote.size / 2) * 2 * laneWidth
    const endW = nextNote.size * 2 * laneWidth
    const endY = beatToY(nextNote.beat)

    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(startX + startW, startY)
    if (note.easingType === EasingType.EaseIn)
      ctx.quadraticCurveTo(
        startX + startW,
        (startY + endY) / 2,
        endX + endW,
        endY,
      )
    else if (note.easingType === EasingType.EaseOut)
      ctx.quadraticCurveTo(endX + endW, (startY + endY) / 2, endX + endW, endY)
    else if (note.easingType === EasingType.EaseInOut) {
      ctx.quadraticCurveTo(
        startX + startW,
        (startY + (startY + endY) / 2) / 2,
        (startX + endX) / 2 + (startW + endW) / 2,
        (startY + endY) / 2,
      )
      ctx.quadraticCurveTo(
        endX + endW,
        ((startY + endY) / 2 + endY) / 2,
        endX + endW,
        endY,
      )
    } else if (note.easingType === EasingType.EaseOutIn) {
      ctx.quadraticCurveTo(
        (startX + endX) / 2 + (startW + endW) / 2,
        (startY + (startY + endY) / 2) / 2,
        (startX + endX) / 2 + (startW + endW) / 2,
        (startY + endY) / 2,
      )
      ctx.quadraticCurveTo(
        (startX + endX) / 2 + (startW + endW) / 2,
        ((startY + endY) / 2 + endY) / 2,
        endX + endW,
        endY,
      )
    } else ctx.lineTo(endX + endW, endY)

    ctx.lineTo(endX, endY)
    if (note.easingType === EasingType.EaseIn)
      ctx.quadraticCurveTo(startX, (startY + endY) / 2, startX, startY)
    else if (note.easingType === EasingType.EaseOut)
      ctx.quadraticCurveTo(endX, (startY + endY) / 2, startX, startY)
    else if (note.easingType === EasingType.EaseInOut) {
      ctx.quadraticCurveTo(
        endX,
        ((startY + endY) / 2 + endY) / 2,
        (startX + endX) / 2,
        (startY + endY) / 2,
      )
      ctx.quadraticCurveTo(
        startX,
        (startY + (endY + startY) / 2) / 2,
        startX,
        startY,
      )
    } else if (note.easingType === EasingType.EaseOutIn) {
      ctx.quadraticCurveTo(
        (startX + endX) / 2,
        ((startY + endY) / 2 + endY) / 2,
        (startX + endX) / 2,
        (startY + endY) / 2,
      )
      ctx.quadraticCurveTo(
        (endX + startX) / 2,
        (startY + (endY + startY) / 2) / 2,
        startX,
        startY,
      )
    } else ctx.lineTo(startX, startY)

    if (note.isGuide) {
      let pN = note as HoldStart | HoldTick | HoldEnd
      while (pN.type !== 'HoldStart') pN = pN.prevNode
      let nN = note as HoldEnd | HoldTick | HoldEnd
      while (nN.type !== 'HoldEnd') nN = nN.nextNode
      const gY0 = beatToY(pN.beat)
      const gY1 = beatToY(nN.beat)
      const guideGradient = ctx.createLinearGradient(0, gY0, 0, gY1)
      guideGradient.addColorStop(
        0,
        (note.isGold ? goldGuideColor : guideColor) + 'bb',
      )
      guideGradient.addColorStop(
        1,
        (note.isGold ? goldGuideColor : guideColor) + '33',
      )
      ctx.fillStyle = guideGradient
    } else {
      if (note.isGold) ctx.fillStyle = '#fbffdcaa'
      else ctx.fillStyle = '#7fffd3aa'
    }
    ctx.fill()
  }

  notesToRender
    .filter((n) => selectedIndeces.has(chartNotes.indexOf(n)))
    .forEach((n) => drawSelectionOutline(n))

  chartNotes
    .filter((n) => {
      if (!['HoldTick', 'HoldStart'].includes(n.type)) return false

      let nextN = (n as any).nextNode

      while ('nextNode' in nextN && nextN.tickType === TickType.Skip)
        nextN = nextN.nextNode

      return (
        (n as any).beat < getBeatFromMouse(height) &&
        nextN.beat > getBeatFromMouse(0) &&
        !notesToRender.includes(n) &&
        !notesToRender.includes(nextN)
      )
    })
    .forEach((n) => drawHoldLine(n))

  notesToRender.forEach((n) => {
    if (n.type === 'HoldTick' && (n as HoldTick).tickType === TickType.Skip)
      return

    if (n.type === 'HoldEnd' || n.type === 'HoldTick') {
      let pN = (n as HoldTick | HoldEnd).prevNode

      while ('prevNode' in pN && pN.tickType === TickType.Skip) pN = pN.prevNode

      if (!notesToRender.includes(pN)) drawHoldLine(pN)
    }
    if (n.type === 'HoldStart' || n.type === 'HoldTick') {
      drawHoldLine(n)
    }
  })
  notesToRender.forEach((n) => drawNote(n))
  notesToRender.forEach((n) => drawFlickArrow(n))

  if (
    mouseIsPressed &&
    selectionStartX &&
    selectionStartY &&
    mouseX &&
    mouseY
  ) {
    ctx.fillStyle = '#ddd4'
    ctx.strokeStyle = '#ddd'
    ctx.lineWidth = 1
    const selectionRect: [number, number, number, number] = [
      selectionStartX,
      selectionStartY,
      mouseX - selectionStartX,
      mouseY - selectionStartY,
    ]
    ctx.fillRect(...selectionRect)
    ctx.strokeRect(...selectionRect)
  }

  if (mouseX !== null && mouseY !== null) {
    if ([1, 2, 3, 4, 5, 6, 7].includes(selectedTool) || isPasting) {
      const nearestBeat = getNearestDivision(getBeatFromMouse(mouseY))
      const newLane = Math.min(
        3 - nextNoteOptions.size / 2,
        Math.max(
          -3 + nextNoteOptions.size / 2,
          Math.floor(
            (mouseX - width / 2) / laneWidth +
              (nextNoteOptions.size % 1 === 0 ? 0.5 : 0),
          ) /
            2 +
            (nextNoteOptions.size % 1 === 0 ? 0 : 0.25),
        ),
      )

      if (isPasting) {
        // Compute a group-level lane offset that keeps the entire clipboard
        // selection inside the lane bounds so relative spacing is preserved.
        // rawLaneOffset is the lane under the mouse cursor
        const rawLaneOffset = getLaneFromMouse(mouseX!)

        // compute group's current horizontal center (in lane units) so we can
        // position the group such that the mouse sits at the group's center
        const groupLeft = Math.min(
          ...clipboard.map((n) => (n.lane ?? 0) - ((n as any).size ?? 1) / 2),
        )
        const groupRight = Math.max(
          ...clipboard.map((n) => (n.lane ?? 0) + ((n as any).size ?? 1) / 2),
        )
        const groupCenter = (groupLeft + groupRight) / 2
        const desiredLaneOffset = rawLaneOffset - groupCenter

        // For each note determine allowed laneOffset range so the note stays within -3..3
        const allowedLows: number[] = []
        const allowedHighs: number[] = []
        for (const n of clipboard) {
          const size = (n as any).size ?? 1
          const minLane = -3 + size / 2
          const maxLane = 3 - size / 2
          allowedLows.push(minLane - (n.lane ?? 0))
          allowedHighs.push(maxLane - (n.lane ?? 0))
        }

        // intersect ranges to get overall allowed lane offset range
        const overallLow =
          allowedLows.length > 0 ? Math.max(...allowedLows) : -Infinity
        const overallHigh =
          allowedHighs.length > 0 ? Math.min(...allowedHighs) : Infinity

        // clamp the requested lane offset into the allowed range, using the
        // desiredLaneOffset so the mouse corresponds to the group's center
        let laneOffset = desiredLaneOffset
        if (laneOffset < overallLow) laneOffset = overallLow
        if (laneOffset > overallHigh) laneOffset = overallHigh

        // Also clamp vertical (beat) offset so earliest note doesn't go negative
        const minBeatInClipboard =
          clipboard.length > 0
            ? Math.min(...clipboard.map((n) => n.beat ?? 0))
            : 0
        const minBeatOffset = -minBeatInClipboard
        const beatOffset = Math.max(minBeatOffset, nearestBeat)

        // Build adjusted clones and map originals -> adjusted clones for pointer rewiring
        const adjustedMap = new Map<Note, Note>()
        const adjusted: Note[] = clipboard.map((n) => {
          const copy: any = { ...(n as any) }
          copy.beat = (n.beat ?? 0) + beatOffset
          copy.lane = (n.lane ?? 0) + laneOffset
          adjustedMap.set(n, copy)
          return copy
        })

        // rewire nextNode/prevNode pointers to point to adjusted clones when present
        for (let i = 0; i < clipboard.length; i++) {
          const orig = clipboard[i] as any
          const adj = adjusted[i] as any

          if ('nextNode' in orig && orig.nextNode) {
            const mapped = adjustedMap.get(orig.nextNode)
            if (mapped) adj.nextNode = mapped
            else delete adj.nextNode
          }

          if ('prevNode' in orig && orig.prevNode) {
            const mapped = adjustedMap.get(orig.prevNode)
            if (mapped) adj.prevNode = mapped
            else delete adj.prevNode
          }
        }

        ctx.globalAlpha = 0.5
        adjusted.forEach((newNote) => {
          if (newNote.type === 'HoldStart' || newNote.type === 'HoldTick')
            drawHoldLine(newNote)
          drawNote(newNote)
        })
        ctx.globalAlpha = 1
      } else {
        let newNote: Note

        if (selectedTool === 2 || selectedTool === 7)
          newNote = {
            type: 'HoldStart',
            beat: nearestBeat,
            lane: newLane,
            size: nextNoteOptions.size,
            isGold: false,
            isTrace: false,
            easingType: EasingType.Linear,
            isHidden: selectedTool === 7,
            isGuide: selectedTool === 7,
            nextNode: {} as HoldEnd,
          } as HoldStart
        else if (selectedTool === 3)
          newNote = {
            type: 'HoldTick',
            beat: nearestBeat,
            lane: newLane,
            size: nextNoteOptions.size,
            isGold: false,
            tickType: nextNoteOptions.tickType,
            easingType: EasingType.Linear,
            nextNode: {} as HoldEnd,
            prevNode: {} as HoldStart,
          } as HoldTick
        else
          newNote = {
            type: 'Tap',
            beat: nearestBeat,
            lane: newLane,
            size: nextNoteOptions.size,
            isGold: selectedTool === 5,
            isTrace: selectedTool === 6,
            flickDir:
              selectedTool === 4
                ? nextNoteOptions.flickDir
                : FlickDirection.None,
          } as TapNote

        ctx.globalAlpha = 0.5
        drawNote(newNote)
        if (selectedTool === 4) drawFlickArrow(newNote)
        ctx.globalAlpha = 1
      }
    }
  }

  pMouseIsPressed = mouseIsPressed
  pZoom = zoom
  lastTime = timeStamp

  // ctx.fillStyle = 'white'
  // ctx.fillRect(0, 0, 400, 300)
  // ctx.fillStyle = 'black'
  // ctx.font = '20px Arial'
  // ctx.textAlign = 'left'
  // ctx.fillText(`time: ${getTime(cursorPos)}`, 20, 50)
}

export default draw
