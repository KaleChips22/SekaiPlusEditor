import { globalState } from '../lib'
import {
  BPMChange,
  FlickDirection,
  HiSpeed,
  HoldEnd,
  HoldStart,
  TapNote,
  TimeSignature,
  type Note,
} from './note'
import { getRect } from './noteImage'

const LANE_WIDTH = 55
const BEAT_HEIGHT = LANE_WIDTH * 4
const NOTE_HEIGHT = 45

let tSigTop = 4
let tSigBottom = 4
let yOffset = 0
let pZoom = 0

let cursorPos = 0

let mouseIsPressed = false
let pMouseIsPressed = false
let mouseX: number | null = null
let mouseY: number | null = null

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
  {
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
]

const holdStart = {
  type: 'HoldStart',
  beat: 4.5,
  lane: 0,
  size: 3,
  isGold: false,
  isTrace: false,
  isHidden: false,
} as HoldStart

const holdEnd = {
  type: 'HoldEnd',
  beat: 6,
  lane: 0,
  size: 3,
  isGold: false,
  isTrace: false,
  isHidden: false,
  flickDir: FlickDirection.Default,

  prevNode: holdStart,
} as HoldEnd

holdStart.nextNode = holdEnd

chartNotes.push(holdStart, holdEnd)

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

const draw = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  globalState: globalState
) => {
  const { zoom, division, selectedTool } = globalState

  const getBeatFromClick = (mouseY: number): number =>
    Math.max(0, (height - mouseY + yOffset) / (BEAT_HEIGHT * zoom))

  const getNearestDivision = (beat: number): number => {
    const divisionsPerBeat = division / tSigBottom
    return Math.round(beat * divisionsPerBeat) / divisionsPerBeat
  }

  mouseDown: if (!pMouseIsPressed && mouseIsPressed) {
    // mouse down event
    if (mouseX === null || mouseY === null) break mouseDown

    let beatClicked = getBeatFromClick(mouseY)

    cursorPos = getNearestDivision(beatClicked)
  }

  mouseUp: if (pMouseIsPressed && !mouseIsPressed) {
    // mouse up event
    if (mouseX === null || mouseY === null) break mouseUp
  }

  const beatToY = (beat: number): number =>
    -(beat * (BEAT_HEIGHT * zoom) - yOffset - height)

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
    ctx.fillRect(width / 2 - 6 * LANE_WIDTH, 0, 12 * LANE_WIDTH, height)

    ctx.beginPath()
    for (let i = 0; i < 13; i += 2) {
      let xOff = width / 2 + LANE_WIDTH * (i - 6)
      ctx.moveTo(xOff, 0)
      ctx.lineTo(xOff, height)
    }
    ctx.strokeStyle = '#bbbb'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.beginPath()
    for (let i = 1; i < 13; i += 2) {
      let xOff = width / 2 + LANE_WIDTH * (i - 6)
      ctx.moveTo(xOff, 0)
      ctx.lineTo(xOff, height)
    }
    ctx.strokeStyle = '#888b'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  drawLanes()

  const drawDivisions = () => {
    const zoomedBeatHeight = BEAT_HEIGHT * zoom * (4 / tSigBottom)

    const maxBigLinesOnScreen = Math.ceil(height / zoomedBeatHeight)

    ctx.beginPath()
    ctx.strokeStyle = '#bbbf'
    ctx.fillStyle = '#bbbf'
    ctx.lineWidth = 3
    ctx.font = '32px Arial'
    ctx.textAlign = 'right'

    for (let i = 0; i < maxBigLinesOnScreen; i++) {
      const beatIndex =
        i +
        maxBigLinesOnScreen *
          Math.floor(
            (height - (-yOffset + i * zoomedBeatHeight)) /
              (zoomedBeatHeight * maxBigLinesOnScreen)
          )

      const isMeasureLine = beatIndex % tSigTop === 0

      const y =
        (height - (-yOffset + i * zoomedBeatHeight)) %
        (zoomedBeatHeight * maxBigLinesOnScreen)
      ctx.moveTo(width / 2 - 6 * LANE_WIDTH, y)
      ctx.lineTo(width / 2 + 6 * LANE_WIDTH, y)

      if (isMeasureLine) {
        const measureNum = beatIndex / tSigTop + 1
        ctx.fillText(
          measureNum.toString(),
          width / 2 - 6 * LANE_WIDTH - 16,
          y + 10
        )
      }
    }
    ctx.stroke()

    const littleLinesPerBigLine = division / tSigBottom

    const zoomedDivisionHeight = zoomedBeatHeight / littleLinesPerBigLine

    const maxLittleLinesOnScreen = Math.ceil(height / zoomedDivisionHeight)

    ctx.beginPath()
    for (let i = 0; i < maxLittleLinesOnScreen; i++) {
      ctx.moveTo(
        width / 2 - 6 * LANE_WIDTH,
        (height - (-yOffset + i * zoomedDivisionHeight)) %
          (zoomedDivisionHeight * maxLittleLinesOnScreen)
      )
      ctx.lineTo(
        width / 2 + 6 * LANE_WIDTH,
        (height - (-yOffset + i * zoomedDivisionHeight)) %
          (zoomedDivisionHeight * maxLittleLinesOnScreen)
      )
    }
    ctx.strokeStyle = '#8888'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  drawDivisions()

  const cursorY = beatToY(cursorPos)

  if (cursorY >= 0 && cursorY <= height) {
    ctx.beginPath()
    ctx.moveTo(width / 2 - 6 * LANE_WIDTH - 1, cursorY)
    ctx.lineTo(width / 2 + 6 * LANE_WIDTH, cursorY)
    ctx.strokeStyle = 'red'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(width / 2 - 6 * LANE_WIDTH, cursorY)
    ctx.lineTo(width / 2 - 6 * LANE_WIDTH - 16, cursorY - 10)
    ctx.lineTo(width / 2 - 6 * LANE_WIDTH - 16, cursorY + 10)
    ctx.fillStyle = 'red'
    ctx.fill()
  }

  // const minBeat = getBeatFromClick(yOffset)
  // const maxBeat = getBeatFromClick(yOffset + height)

  const notesToRender = chartNotes.filter(
    () => true // n.beat >= minBeat && n.beat <= maxBeat
  )

  const drawNote = (n: Note) => {
    const { lane, beat, size } = n

    if (n.type === 'HiSpeed') {
      const note = n as HiSpeed
      const y = beatToY(beat)
      const lanesEdge = width / 2 + 6 * LANE_WIDTH

      ctx.beginPath()
      ctx.moveTo(lanesEdge, y)
      ctx.lineTo(lanesEdge + 204, y)
      ctx.strokeStyle = 'red'
      ctx.lineWidth = 4
      ctx.stroke()

      const fontSize = '24px'
      const fontFamily = 'arial'

      const textEl = document.createElement('p')
      textEl.style.fontSize = fontSize
      textEl.style.fontFamily = fontFamily
      textEl.style.display = 'inline'
      textEl.innerText = `${note.speed}x`
      document.body.appendChild(textEl)
      const { width: textWidth, height: textHeight } =
        textEl.getBoundingClientRect()
      textEl.remove()
      const padding = 8

      ctx.beginPath()
      // ctx.fillRect(lanesEdge + 40, y + 2, 200, -40)
      ctx.roundRect(
        lanesEdge + 200,
        y + 2,
        textWidth + 2 * padding,
        -(textHeight + 2 * padding),
        4
      )
      ctx.fillStyle = 'red'
      ctx.fill()

      ctx.fillStyle = 'black'
      ctx.font = `${fontSize} ${fontFamily}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`${note.speed}x`, lanesEdge + 200 + padding, y - padding)

      return
    } else if (n.type === 'TimeSignature') {
      const note = n as TimeSignature
      const y = beatToY(beat)
      const lanesEdge = width / 2 + 6 * LANE_WIDTH

      ctx.beginPath()
      ctx.moveTo(lanesEdge, y)
      ctx.lineTo(lanesEdge + 124, y)
      ctx.strokeStyle = 'yellow'
      ctx.lineWidth = 4
      ctx.stroke()

      const fontSize = '24px'
      const fontFamily = 'arial'

      const textEl = document.createElement('p')
      textEl.style.fontSize = fontSize
      textEl.style.fontFamily = fontFamily
      textEl.style.display = 'inline'
      textEl.innerText = `${note.top}/${note.bottom}`
      document.body.appendChild(textEl)
      const { width: textWidth, height: textHeight } =
        textEl.getBoundingClientRect()
      textEl.remove()
      const padding = 8

      ctx.beginPath()
      // ctx.fillRect(lanesEdge + 40, y + 2, 200, -40)
      ctx.roundRect(
        lanesEdge + 120,
        y + 2,
        textWidth + 2 * padding,
        -(textHeight + 2 * padding),
        4
      )
      ctx.fillStyle = 'yellow'
      ctx.fill()

      ctx.fillStyle = 'black'
      ctx.font = `${fontSize} ${fontFamily}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(
        `${note.top}/${note.bottom}`,
        lanesEdge + 120 + padding,
        y - padding
      )

      return
    } else if (n.type === 'BPMChange') {
      const note = n as BPMChange
      const y = beatToY(beat)
      const lanesEdge = width / 2 + 6 * LANE_WIDTH

      ctx.beginPath()
      ctx.moveTo(lanesEdge, y)
      ctx.lineTo(lanesEdge + 44, y)
      ctx.strokeStyle = 'lime'
      ctx.lineWidth = 4
      ctx.stroke()

      const fontSize = '24px'
      const fontFamily = 'arial'

      const textEl = document.createElement('p')
      textEl.style.fontSize = fontSize
      textEl.style.fontFamily = fontFamily
      textEl.style.display = 'inline'
      textEl.innerText = note.BPM.toString()
      document.body.appendChild(textEl)
      const { width: textWidth, height: textHeight } =
        textEl.getBoundingClientRect()
      textEl.remove()
      const padding = 8

      ctx.beginPath()
      // ctx.fillRect(lanesEdge + 40, y + 2, 200, -40)
      ctx.roundRect(
        lanesEdge + 40,
        y + 2,
        textWidth + 2 * padding,
        -(textHeight + 2 * padding),
        4
      )
      ctx.fillStyle = 'lime'
      ctx.fill()

      ctx.fillStyle = 'black'
      ctx.font = `${fontSize} ${fontFamily}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(note.BPM.toString(), lanesEdge + 40 + padding, y - padding)

      return
    }

    let noteImageName = 'notes_2'
    if (n.type === 'Tap') {
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
      if (note.isHidden) return
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
      return
    }

    const rect = getRect(noteImageName)!

    const edgeSize = NOTE_HEIGHT
    const aspectRatio = rect.h / NOTE_HEIGHT

    const x = width / 2 + (lane * 2 - size) * LANE_WIDTH
    const w = size * 2 * LANE_WIDTH
    const y = beatToY(beat) - NOTE_HEIGHT / 2
    const h = NOTE_HEIGHT

    const x1 = x - 15
    const w1 = edgeSize

    const x3 = x + w - NOTE_HEIGHT + 15
    const w3 = w1

    const x2 = x1 + w1 - 1
    const w2 = Math.abs(x1 - x3) - w1 + 2

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
      h
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
      h
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
      h
    )

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

        const fw = (1.25 * flickRect.w) / aspectRatio
        const fh = (1.25 * flickRect.h) / aspectRatio
        const fx = (width - fw) / 2 + lane * 2 * LANE_WIDTH
        const fy = y - fh

        ctx.drawImage(
          imageSource,
          flickRect.x,
          flickRect.y,
          flickRect.w,
          flickRect.h,
          fx,
          fy,
          fw,
          fh
        )
      }

      if (note.isTrace) {
        let traceSpriteName = 'notes_friction_among_'
        if (note.isGold) traceSpriteName += 'crtcl'
        else if (note.flickDir !== FlickDirection.None)
          traceSpriteName += 'flick'
        else traceSpriteName += 'long'

        const traceRect = getRect(traceSpriteName)!

        const tw = (1.75 * traceRect.w) / aspectRatio
        const th = (1.75 * traceRect.h) / aspectRatio
        const tx = (width - tw) / 2 + lane * 2 * LANE_WIDTH
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
          th
        )
      }
    }
  }

  notesToRender.forEach((n) => drawNote(n))

  pMouseIsPressed = mouseIsPressed
  pZoom = zoom
}

export default draw
