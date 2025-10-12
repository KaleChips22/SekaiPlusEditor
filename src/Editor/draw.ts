import { globalState } from '../lib'

const LANE_WIDTH = 55
const BEAT_HEIGHT = LANE_WIDTH * 4

let tSigTop = 4
let tSigBottom = 4
let yOffset = 0
let pZoom = 0

let cursorPos = 0

let mouseIsPressed = false
let pMouseIsPressed = false
let mouseX: number | null = null
let mouseY: number | null = null

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
  e.preventDefault()
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

  pMouseIsPressed = mouseIsPressed
  pZoom = zoom
}

export default draw
