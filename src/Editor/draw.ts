const LANE_WIDTH = 55
const BEAT_HEIGHT = LANE_WIDTH * 4

let yOffset = 0
let tSigTop = 4
let tSigBottom = 4
let zoom = 3.5
let divisions = 16

document.addEventListener('wheel', (e) => {
  e.preventDefault()
  yOffset -= e.deltaY
})

const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  if (yOffset < (-BEAT_HEIGHT * zoom) / 3) {
    yOffset = (-BEAT_HEIGHT * zoom) / 3
  }

  ctx.clearRect(0, 0, width, height)

  ctx.fillStyle = '#0007'
  ctx.fillRect(0, 0, width, height)

  const drawLanes = () => {
    ctx.fillStyle = '#2229'
    ctx.fillRect(width / 2 - 6 * LANE_WIDTH, 0, 12 * LANE_WIDTH, height)

    // for (let i = 0; i < 13; i++) {
    //   let xOff = width / 2 + LANE_WIDTH * (i - 6)
    //   ctx.strokeStyle = i % 2 === 0 ? '#bbbb' : '#888b'
    //   ctx.lineWidth = i % 2 === 0 ? 3 : 2
    //   ctx.beginPath()
    //   ctx.moveTo(xOff, 0)
    //   ctx.lineTo(xOff, height)
    //   ctx.stroke()
    // }

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
    for (let i = 0; i < maxBigLinesOnScreen; i++) {
      ctx.moveTo(
        width / 2 - 6 * LANE_WIDTH,
        (height - (-yOffset + i * zoomedBeatHeight)) %
          (zoomedBeatHeight * maxBigLinesOnScreen)
      )
      ctx.lineTo(
        width / 2 + 6 * LANE_WIDTH,
        (height - (-yOffset + i * zoomedBeatHeight)) %
          (zoomedBeatHeight * maxBigLinesOnScreen)
      )
    }
    ctx.strokeStyle = '#bbbf'
    ctx.lineWidth = 3
    ctx.stroke()

    const littleLinesPerBigLine = divisions / tSigBottom

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
}

export default draw
