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

let selectionStartX: number | null = null
let selectionStartY: number | null = null

let dragStartX: number | null = null
let dragStartY: number | null = null

enum DragMode {
  Move,
  ScaleLeft,
  ScaleRight,
  None,
}
let dragMode = DragMode.None

let nextNoteOptions = {
  size: 1.5,
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

const selectedIndeces = new Set<number>()

export const deleteSelected = () => {
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

export const doReturn = () => {
  yOffset = 0
  cursorPos = 0
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
  if (e.key === 'o') deleteSelected()
})

const draw = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  globalState: globalState
) => {
  const { zoom, division, selectedTool } = globalState

  const getBeatFromMouse = (mouseY: number): number =>
    Math.max(0, (height - mouseY + yOffset) / (BEAT_HEIGHT * zoom))

  const beatToY = (beat: number): number =>
    -(beat * (BEAT_HEIGHT * zoom) - yOffset - height)

  const getLaneFromMouse = (mouseX: number): number =>
    Math.round(
      Math.max(-3, Math.min(3, (mouseX - width / 2) / (LANE_WIDTH * 2))) * 2
    ) / 2

  const getNearestDivision = (beat: number): number => {
    const divisionsPerBeat = division / tSigBottom
    return Math.round(beat * divisionsPerBeat) / divisionsPerBeat
  }

  if (
    dragMode !== DragMode.None &&
    dragStartX &&
    dragStartY &&
    mouseX &&
    mouseY
  ) {
    const xOff = dragStartX - mouseX

    if (xOff > LANE_WIDTH / 2) {
      dragStartX -= LANE_WIDTH

      if (
        dragMode === DragMode.Move &&
        chartNotes.filter(
          (n, i) => selectedIndeces.has(i) && n.lane - n.size / 2 <= -2.75
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
            (n.size > 5.5 || n.lane - n.size / 2 <= -3)
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
      else dragStartX += LANE_WIDTH
    } else if (xOff < -LANE_WIDTH / 2) {
      dragStartX += LANE_WIDTH

      if (
        dragMode === DragMode.Move &&
        chartNotes.filter(
          (n, i) => selectedIndeces.has(i) && n.lane + n.size / 2 >= 2.75
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
            selectedIndeces.has(i) && (n.size > 5.5 || n.lane + n.size / 2 >= 3)
        ).length === 0
      )
        chartNotes
          .filter((_, i) => selectedIndeces.has(i))
          .forEach((n) => {
            n.lane += 0.25
            n.size += 0.5
          })
      else dragStartX -= LANE_WIDTH
    }

    if (dragMode === DragMode.Move) {
      const yOff = dragStartY - mouseY

      const divisionHeight = (BEAT_HEIGHT * zoom) / (division / tSigBottom)

      if (yOff > divisionHeight / 2) {
        dragStartY -= divisionHeight

        chartNotes
          .filter((_, i) => selectedIndeces.has(i))
          .forEach((n) => (n.beat += tSigBottom / division))
      } else if (yOff < -divisionHeight / 2) {
        if (
          chartNotes.filter(
            (n, i) => selectedIndeces.has(i) && n.beat < tSigBottom / division
          ).length === 0
        ) {
          dragStartY += divisionHeight
          chartNotes
            .filter((_, i) => selectedIndeces.has(i))
            .forEach((n) => (n.beat -= tSigBottom / division))
        }
      }
    }
  }

  mouseDown: if (!pMouseIsPressed && mouseIsPressed) {
    // mouse down event
    if (mouseX === null || mouseY === null) break mouseDown

    const beatClicked = getBeatFromMouse(mouseY)
    const nearestBeat = getNearestDivision(beatClicked)
    cursorPos = nearestBeat

    const notesAtPos = chartNotes.filter((n) => {
      const clickedLane = getLaneFromMouse(mouseX!)

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
            width / 2 + LANE_WIDTH * (note.lane - note.size / 2 + 1 / 6) * 2
          let dragScaleRightEdge =
            width / 2 + LANE_WIDTH * (note.lane + note.size / 2 - 1 / 6) * 2

          if (mouseX <= dragScaleLeftEdge) dragMode = DragMode.ScaleLeft
          else if (mouseX >= dragScaleRightEdge) dragMode = DragMode.ScaleRight
          else dragMode = DragMode.Move
        }
      } else if (selectedTool === 0) {
        selectionStartX = mouseX
        selectionStartY = mouseY
      }
    }

    if ([0, 1, 2, 3, 4, 5, 6, 7].includes(selectedTool)) {
      if (notesAtPos.length > 0) {
        if (selectedTool === 0) {
          const noteToDrag = notesAtPos[0]

          dragStartX = mouseX
          dragStartY = mouseY

          let dragScaleLeftEdge =
            width / 2 +
            LANE_WIDTH * (noteToDrag.lane - noteToDrag.size / 2 + 1 / 6) * 2
          let dragScaleRightEdge =
            width / 2 +
            LANE_WIDTH * (noteToDrag.lane + noteToDrag.size / 2 - 1 / 6) * 2

          if (mouseX <= dragScaleLeftEdge) dragMode = DragMode.ScaleLeft
          else if (mouseX >= dragScaleRightEdge) dragMode = DragMode.ScaleRight
          else dragMode = DragMode.Move
        }

        selectedIndeces.forEach((i) => {
          let note = chartNotes[i] as TapNote

          if (selectedTool === 5) note.isGold = !note.isGold
          if (selectedTool === 6) note.isTrace = !note.isTrace
          if (selectedTool === 4) {
            const current = note.flickDir
            if (current === FlickDirection.None)
              note.flickDir = FlickDirection.Default
            else if (current === FlickDirection.Default)
              note.flickDir = FlickDirection.Left
            else if (current === FlickDirection.Left)
              note.flickDir = FlickDirection.Right
            else if (current === FlickDirection.Right)
              note.flickDir = FlickDirection.None
          }
        })
      } else if (![0, 2, 3, 7].includes(selectedTool)) {
        const newLane = Math.min(
          3 - nextNoteOptions.size / 2,
          Math.max(
            -3 + nextNoteOptions.size / 2,
            Math.floor(
              (mouseX - width / 2) / LANE_WIDTH +
                (nextNoteOptions.size % 1 === 0 ? 0.5 : 0)
            ) /
              2 +
              (nextNoteOptions.size % 1 === 0 ? 0 : 0.25)
          )
        )
        const newNote = {
          type: 'Tap',
          beat: nearestBeat,
          lane: newLane,
          size: nextNoteOptions.size,
          isGold: selectedTool === 5,
          isTrace: selectedTool === 6,
          flickDir:
            selectedTool === 4 ? FlickDirection.Default : FlickDirection.None,
        } as TapNote

        chartNotes.push(newNote)
      }
    }
  }

  mouseUp: if (pMouseIsPressed && !mouseIsPressed) {
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
        .filter(
          (n) =>
            n.beat <= maxBeat &&
            n.beat >= minBeat &&
            n.lane - n.size / 2 <= maxLane &&
            n.lane + n.size / 2 >= minLane
        )
        .forEach((n) => selectedIndeces.add(chartNotes.indexOf(n)))

      selectionStartX = null
      selectionStartY = null
    }
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
          width / 2 - 6 * LANE_WIDTH - 24,
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

  const minBeat = getBeatFromMouse(height + NOTE_HEIGHT * 2)
  const maxBeat = getBeatFromMouse(-NOTE_HEIGHT)

  const notesToRender = chartNotes.filter(
    (n) => n.beat >= minBeat && n.beat <= maxBeat
  )

  const getNoteImageName = (n: Note): string => {
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
      if (note.isHidden) return 'none'
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

    const noteImageName = getNoteImageName(n)
    if (noteImageName == 'none') return

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

  const drawFlickArrow = (n: Note) => {
    const { lane, beat } = n

    const noteImageName = getNoteImageName(n)

    const rect = getRect(noteImageName)!
    if (noteImageName === 'none') return

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
        let fx = (width - fw) / 2 + lane * 2 * LANE_WIDTH
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
          fh
        )

        if (note.flickDir === FlickDirection.Right) ctx.scale(-1, 1)
      }
    }
  }

  const drawSelectionOutline = (n: Note) => {
    const selectionOutlinePadding = 8

    const { lane, beat, size } = n

    const x =
      width / 2 + (lane * 2 - size) * LANE_WIDTH - selectionOutlinePadding
    const w = size * 2 * LANE_WIDTH + 2 * selectionOutlinePadding
    const y = beatToY(beat) - NOTE_HEIGHT / 2 + selectionOutlinePadding / 2
    const h = NOTE_HEIGHT - selectionOutlinePadding

    ctx.beginPath()
    ctx.roundRect(x, y, w, h, selectionOutlinePadding)
    ctx.fillStyle = '#ddd4'
    ctx.strokeStyle = '#ddd'
    ctx.fill()
    ctx.stroke()
  }

  notesToRender
    .filter((n) => selectedIndeces.has(chartNotes.indexOf(n)))
    .forEach((n) => drawSelectionOutline(n))

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
    if ([1, 4, 5, 6].includes(selectedTool)) {
      const nearestBeat = getNearestDivision(getBeatFromMouse(mouseY))
      const newLane = Math.min(
        3 - nextNoteOptions.size / 2,
        Math.max(
          -3 + nextNoteOptions.size / 2,
          Math.floor(
            (mouseX - width / 2) / LANE_WIDTH +
              (nextNoteOptions.size % 1 === 0 ? 0.5 : 0)
          ) /
            2 +
            (nextNoteOptions.size % 1 === 0 ? 0 : 0.25)
        )
      )
      const newNote = {
        type: 'Tap',
        beat: nearestBeat,
        lane: newLane,
        size: nextNoteOptions.size,
        isGold: selectedTool === 5,
        isTrace: selectedTool === 6,
        flickDir:
          selectedTool === 4 ? FlickDirection.Default : FlickDirection.None,
      } as TapNote

      ctx.globalAlpha = 0.5
      drawNote(newNote)
      ctx.globalAlpha = 1
    }
  }

  pMouseIsPressed = mouseIsPressed
  pZoom = zoom

  // ctx.fillStyle = 'white'
  // ctx.fillRect(0, 0, 400, 300)
  // ctx.fillStyle = 'black'
  // ctx.fillText(
  //   `dragMode: ${dragMode} | dX: ${dragStartX} | dY: ${dragStartY}`,
  //   20,
  //   50
  // )
}

export default draw
