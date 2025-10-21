import { globalState } from '../lib'
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
  tickType: TickType.Normal,
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
      console.log(n)
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
    console.log(i, n.beat)

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
  }
})

const guideColor = '#38e584'
const goldGuideColor = '#ffcd36'

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
      const itter = Math.abs(Math.floor(yOff / divisionHeight))

      if (yOff > divisionHeight / 2) {
        dragStartY -= divisionHeight * itter

        chartNotes
          .filter((_, i) => selectedIndeces.has(i))
          .forEach((n) => (n.beat += (tSigBottom / division) * itter))
      } else if (yOff < -divisionHeight / 2) {
        if (
          chartNotes.filter(
            (n, i) =>
              selectedIndeces.has(i) && n.beat < (tSigBottom / division) * itter
          ).length === 0
        ) {
          dragStartY += divisionHeight * itter

          chartNotes
            .filter((_, i) => selectedIndeces.has(i))
            .forEach((n) => (n.beat -= (tSigBottom / division) * itter))
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

      if (['HiSpeed', 'BPMChange', 'TimeSignature'].includes(n.type))
        return false

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
          if (selectedTool === 2) {
            let note = chartNotes[i] as HoldStart | HoldTick
            if (note.type !== 'HoldStart' && note.type !== 'HoldTick') return

            if (note.easingType === EasingType.Linear)
              note.easingType = EasingType.EaseOut
            else if (note.easingType === EasingType.EaseOut)
              note.easingType = EasingType.EaseIn
            else if (note.easingType === EasingType.EaseIn)
              note.easingType = EasingType.Linear
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
              (mouseX - width / 2) / LANE_WIDTH +
                (nextNoteOptions.size % 1 === 0 ? 0.5 : 0)
            ) /
              2 +
              (nextNoteOptions.size % 1 === 0 ? 0 : 0.25)
          )
        )

        if (selectedTool === 2 || selectedTool === 7) {
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
            beat: nearestBeat + tSigBottom / division,
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

              console.log('beat works: ', n)

              const percentY = (nearestBeat - note.beat) / (nN.beat - note.beat)
              const easedY =
                note.easingType === EasingType.EaseIn
                  ? Math.pow(percentY, 2)
                  : note.easingType === EasingType.EaseOut
                  ? 1 - Math.pow(1 - percentY, 2)
                  : percentY

              const lanePos = (1 - easedY) * note.lane + easedY * nN.lane
              const sizePos = (1 - easedY) * note.size + easedY * nN.size

              const minX = (lanePos - sizePos / 2) * 2 * LANE_WIDTH + width / 2
              const maxX = (lanePos + sizePos / 2) * 2 * LANE_WIDTH + width / 2

              console.log(minX, mouseX, maxX)

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
            n.lane + n.size / 2 >= minLane &&
            !['HiSpeed', 'BPMChange', 'TimeSignature'].includes(n.type)
        )
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

    let aspectRatio = 4

    const x = width / 2 + (lane * 2 - size) * LANE_WIDTH
    const w = size * 2 * LANE_WIDTH
    const y = beatToY(beat) - NOTE_HEIGHT / 2
    const h = NOTE_HEIGHT

    if (n.type === 'HoldTick') {
      ctx.beginPath()
      ctx.roundRect(x, y + 16, w, h - 32, 4)

      ctx.strokeStyle = '#7fffd3'
      if ((n as HoldTick).tickType === TickType.Skip) ctx.strokeStyle = 'cyan'
      ctx.stroke()
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
        let tx = (width - tw) / 2 + lane * 2 * LANE_WIDTH

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
            ((1 - easedY) * pN.lane + easedY * nN.lane) * 2 * LANE_WIDTH
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
          th
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

    const startX = width / 2 + (note.lane - note.size / 2) * 2 * LANE_WIDTH
    const startW = note.size * 2 * LANE_WIDTH
    const startY = beatToY(note.beat)

    const endX =
      width / 2 + (nextNote.lane - nextNote.size / 2) * 2 * LANE_WIDTH
    const endW = nextNote.size * 2 * LANE_WIDTH
    const endY = beatToY(nextNote.beat)

    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(startX + startW, startY)
    if (note.easingType === EasingType.Linear) ctx.lineTo(endX + endW, endY)
    else if (note.easingType === EasingType.EaseOut)
      ctx.quadraticCurveTo(endX + endW, (startY + endY) / 2, endX + endW, endY)
    else
      ctx.quadraticCurveTo(
        startX + startW,
        (startY + endY) / 2,
        endX + endW,
        endY
      )
    ctx.lineTo(endX, endY)
    if (note.easingType === EasingType.Linear) ctx.lineTo(startX, startY)
    else if (note.easingType === EasingType.EaseOut)
      ctx.quadraticCurveTo(endX, (startY + endY) / 2, startX, startY)
    else ctx.quadraticCurveTo(startX, (startY + endY) / 2, startX, startY)

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
        (note.isGold ? goldGuideColor : guideColor) + 'bb'
      )
      guideGradient.addColorStop(
        1,
        (note.isGold ? goldGuideColor : guideColor) + '33'
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
    if ([1, 2, 3, 4, 5, 6, 7].includes(selectedTool)) {
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
            selectedTool === 4 ? FlickDirection.Default : FlickDirection.None,
        } as TapNote

      ctx.globalAlpha = 0.5
      drawNote(newNote)
      if (selectedTool === 4) drawFlickArrow(newNote)
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
