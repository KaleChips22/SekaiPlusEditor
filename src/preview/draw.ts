import {
  chartNotes,
  cursorPos,
  getBPM,
  getHiSpeed,
  getNoteImageName,
  getScaledTime,
  getTime,
  getTsig,
  goldGuideColor,
  guideColor,
  height,
  isPlaying,
  setCursorPos,
  width,
} from '../editor/draw'
import {
  EasingType,
  FlickDirection,
  HoldEnd,
  HoldStart,
  TapNote,
  TickType,
  type HoldTick,
  type Note,
} from '../editor/note'
import { getRect } from '../editor/noteImage'

const playSpeed = 10.8

export let hasCachedScaledTimes = false
export const disableCachedScaledTimes = () => (hasCachedScaledTimes = false)

export let ctx: CanvasRenderingContext2D | null = null
let lastTime: number

export const setPreviewContext = (c: CanvasRenderingContext2D) => (ctx = c)

const boxRatio = 2048 / 1175
const box = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  vanishingY: 0,
}

let laneWidthAtBottom = 0,
  laneWidthAtTop = 0,
  laneWidthAtJudgement = 0

const judgementHeightPercent = 0.32
const judgeAreaHeightPercent = 0.055

/*
# Sekai Stage
0,1,2048,1176
*/

const stageImageSource = new Image()
stageImageSource.src = 'stage/stage.png'

const noteImageSource = document.createElement('img')
noteImageSource.src = 'editor_sprites/notes.png'

export const updateBox = () => {
  if (width / height > boxRatio) {
    box.height = height
    box.width = box.height * boxRatio
    box.x = (width - box.width) / 2
    box.y = (height - box.height) / 2
  } else {
    box.width = width
    box.height = box.width / boxRatio
    box.x = (width - box.width) / 2
    box.y = (height - box.height) / 2
  }

  box.vanishingY = box.y - box.height / 25

  laneWidthAtBottom = box.width / 12
  laneWidthAtTop = (box.width * 0.04) / 12 // 1/25 the size
  laneWidthAtJudgement =
    judgementHeightPercent * laneWidthAtBottom +
    (1 - judgementHeightPercent) * laneWidthAtTop
}

const scaledTimeToY = (scaledTime: number, currentTime: number) => {
  const timeDiff = currentTime - scaledTime
  let percentAmong = (playSpeed / 10) * timeDiff + 1
  if (percentAmong < 0) percentAmong = 0
  if (percentAmong > 1) percentAmong = 1
  percentAmong = Math.pow(15, percentAmong) / 15

  let y = (1 - judgementHeightPercent) * box.height + box.y
  y -= box.vanishingY
  y *= percentAmong
  y += box.vanishingY
  return y
}

// compute interpolated lane/size for a hold start at a given scaled time
const getHoldLaneSizeAt = (start: HoldStart, currentScaledTime: number) => {
  // find the segment [from, to] that contains currentScaledTime
  let from: any = start
  let to: any = start.nextNode

  // advance to next non-skip node when necessary
  while (to && to.tickType === TickType.Skip) to = to.nextNode

  while (to && currentScaledTime > to.scaledHitTime) {
    from = to
    to = to.nextNode
    while (to && to.tickType === TickType.Skip) to = to.nextNode
  }

  if (!to) {
    // fallback to the last known node
    return { lane: from.lane, size: from.size }
  }

  const scaledA = from.scaledHitTime!
  const scaledB = to.scaledHitTime!
  const span = scaledB - scaledA || 1
  const rawPercent = (currentScaledTime - scaledA) / span

  const applyEasing = (p: number, type: EasingType) => {
    if (type === EasingType.EaseIn) return Math.pow(p, 2)
    if (type === EasingType.EaseOut) return 1 - Math.pow(1 - p, 2)
    return p
  }

  const eased = applyEasing(
    Math.max(0, Math.min(1, rawPercent)),
    from.easingType
  )

  const lane = from.lane + eased * (to.lane - from.lane)
  const size = from.size + eased * (to.size - from.size)

  return { lane, size }
}

const getXBounds = (note: Note, currentTime: number): [number, number] => {
  const { lane, size, scaledHitTime: scaledTime } = note
  const timeDiff = currentTime - scaledTime!
  let percentAmong = (playSpeed / 10) * timeDiff + 1
  if (percentAmong < 0) percentAmong = 0
  if (percentAmong > 1) {
    percentAmong = 1

    if (note.type === 'HoldStart' || note.type === 'HoldTick') {
      const n = note as HoldStart | HoldTick
      const percentAcrossHold =
        (currentTime - scaledTime!) / (n.nextNode.scaledHitTime! - scaledTime!)

      const newLane = lane + percentAcrossHold * (n.nextNode.lane - lane)
      const newSize = size + percentAcrossHold * (n.nextNode.size - size)

      const centerX = box.x + box.width / 2 + newLane * laneWidthAtJudgement * 4
      const halfWidth = (newSize * laneWidthAtJudgement * 4) / 2

      const leftX =
        (centerX - halfWidth - box.x - box.width / 2) * percentAmong +
        box.x +
        box.width / 2
      const rightX =
        (centerX + halfWidth - box.x - box.width / 2) * percentAmong +
        box.x +
        box.width / 2

      return [leftX, rightX - leftX]
    }
  }
  percentAmong = Math.pow(15, percentAmong) / 15

  const centerX = box.x + box.width / 2 + lane * laneWidthAtJudgement * 4
  const halfWidth = (size * laneWidthAtJudgement * 4) / 2

  const leftX =
    (centerX - halfWidth - box.x - box.width / 2) * percentAmong +
    box.x +
    box.width / 2
  const rightX =
    (centerX + halfWidth - box.x - box.width / 2) * percentAmong +
    box.x +
    box.width / 2

  return [leftX, rightX - leftX]
}

const drawPreviewNote = (note: Note, scaledTime: number) => {
  if (ctx === null) return
  if (
    note.type === 'HiSpeed' ||
    note.type === 'BPMChange' ||
    note.type === 'TimeSignature'
  )
    return
  if (
    note.type === 'HoldTick' &&
    (note as HoldTick).tickType === TickType.Hidden
  )
    return
  if (
    (note.type === 'HoldStart' || note.type === 'HoldEnd') &&
    (note as HoldStart | HoldEnd).isHidden
  )
    return

  if (note.scaledHitTime === undefined) return

  const noteImageName = getNoteImageName(note)
  // console.log(noteImageName)
  const noteImageRect = getRect(noteImageName)!

  const timeDiff = scaledTime - note.scaledHitTime
  let percentAmong = (playSpeed / 10) * timeDiff + 1
  if (percentAmong < 0) percentAmong = 0
  if (percentAmong > 1) percentAmong = 1
  percentAmong = Math.pow(15, percentAmong) / 15
  ctx.strokeStyle = '#0ff'
  ctx.lineWidth = 3
  // determine lane and size to draw. For active HoldStart heads, interpolate
  // along the hold chain so the head follows the current hold lane/size.
  let drawLane = note.lane
  let drawSize = note.size

  if (
    note.type === 'HoldStart' &&
    scaledTime > note.scaledHitTime &&
    'nextNode' in note &&
    note.nextNode
  ) {
    const hs = note as HoldStart
    const p = getHoldLaneSizeAt(hs, scaledTime)
    drawLane = p.lane
    drawSize = p.size
  }

  const x =
    box.x +
    drawLane * laneWidthAtJudgement * 4 +
    box.width / 2 -
    drawSize * laneWidthAtJudgement * 2
  const y =
    (1 - judgementHeightPercent - judgeAreaHeightPercent) * box.height + box.y
  const w = laneWidthAtJudgement * drawSize * 4
  const h = judgeAreaHeightPercent * box.height * 2
  ctx.translate(box.x + box.width / 2, box.vanishingY)
  ctx.scale(percentAmong, percentAmong)
  ctx.translate(-(box.x + box.width / 2), -box.vanishingY)

  // ctx.strokeRect(
  //   x,
  //   y,
  //   laneWidthAtJudgement * note.size * 4,
  //   judgeAreaHeightPercent * box.height
  // )

  if (note.type !== 'HoldTick') {
    ctx.drawImage(
      noteImageSource,
      noteImageRect.x + 0.5 * noteImageRect.h,
      noteImageRect.y,
      noteImageRect.w - noteImageRect.h,
      noteImageRect.h,
      x + 0.7 * h,
      y,
      w - h * 1.4,
      h
    )

    ctx.drawImage(
      noteImageSource,
      noteImageRect.x,
      noteImageRect.y,
      noteImageRect.h,
      noteImageRect.h,
      x - 0.3 * h,
      y,
      h,
      h
    )

    ctx.drawImage(
      noteImageSource,
      noteImageRect.x + noteImageRect.w - noteImageRect.h,
      noteImageRect.y,
      noteImageRect.h,
      noteImageRect.h,
      x + 0.3 * h + w - h,
      y,
      h,
      h
    )
  }

  if (
    note.type === 'Tap' ||
    note.type === 'HoldStart' ||
    note.type === 'HoldEnd' ||
    note.type === 'HoldTick'
  ) {
    let n: TapNote | HoldEnd
    if (note.type === 'Tap') n = note as TapNote
    else n = note as HoldEnd

    if (
      n.isTrace ||
      ((n as any).type === 'HoldTick' &&
        (n as any).tickType !== TickType.Hidden)
    ) {
      let traceSpriteName = 'notes_friction_among_'
      if (n.isGold) traceSpriteName += 'crtcl'
      else if (
        !['HoldStart', 'HoldTick'].includes((n as any).type) &&
        n.flickDir !== FlickDirection.None
      )
        traceSpriteName += 'flick'
      else traceSpriteName += 'long'

      const traceRect = getRect(traceSpriteName)!

      const tw = (1.5 * traceRect.w * box.height) / 1175

      // compute lane/size for trace position. If this is a HoldStart and the
      // hold is active, use interpolated lane so the trace/tick follows the head.
      let traceLane = n.lane
      let traceSize = (n as any).size || 1
      if (
        (note as any).type === 'HoldStart' &&
        scaledTime > (note as any).scaledHitTime &&
        'nextNode' in note &&
        (note as any).nextNode
      ) {
        const hs = note as HoldStart
        const p = getHoldLaneSizeAt(hs, scaledTime)
        traceLane = p.lane
        traceSize = p.size
      }

      let tx =
        box.x + traceLane * laneWidthAtJudgement * 4 + box.width / 2 - 0.5 * tw

      // If this is a hold tick that belongs to a traced hold, interpolate
      // the X position along the hold path using surrounding non-skip nodes.
      if ((note as any).type === 'HoldTick') {
        const t = note as any as HoldTick

        // find the root HoldStart for this chain
        let root: any = t
        while ('prevNode' in root && root.prevNode) root = root.prevNode

        if (root && root.type === 'HoldStart' && root.isTrace) {
          // find previous and next non-skip nodes around this tick
          let pN: any = t.prevNode
          let nN: any = t.nextNode

          while (pN && 'prevNode' in pN && pN.tickType === TickType.Skip)
            pN = pN.prevNode

          while (nN && 'nextNode' in nN && nN.tickType === TickType.Skip)
            nN = nN.nextNode

          if (pN && nN) {
            const percentY = (t.beat - pN.beat) / (nN.beat - pN.beat)
            const easedY =
              pN.easingType === EasingType.EaseIn
                ? Math.pow(percentY, 2)
                : pN.easingType === EasingType.EaseOut
                ? 1 - Math.pow(1 - percentY, 2)
                : percentY
            tx =
              box.x +
              box.width / 2 +
              ((1 - easedY) * pN.lane + easedY * nN.lane) *
                2 *
                laneWidthAtJudgement
          }
        } else if (t.tickType === TickType.Skip) {
          // fallback: original skip handling
          let pN = t.prevNode
          let nN = t.nextNode

          while ('prevNode' in pN && pN.tickType === TickType.Skip)
            pN = pN.prevNode

          while ('nextNode' in nN && nN.tickType === TickType.Skip)
            nN = nN.nextNode

          const percentY = (t.beat - pN.beat) / (nN.beat - pN.beat)
          const easedY =
            pN.easingType === EasingType.EaseIn
              ? Math.pow(percentY, 2)
              : pN.easingType === EasingType.EaseOut
              ? 1 - Math.pow(1 - percentY, 2)
              : percentY
          tx =
            box.x +
            box.width / 2 +
            ((1 - easedY) * pN.lane + easedY * nN.lane) *
              2 *
              laneWidthAtJudgement
        }
      }

      ctx.drawImage(
        noteImageSource,
        traceRect.x,
        traceRect.y,
        traceRect.w,
        traceRect.h,
        tx,
        y - 0.125 * tw,
        tw,
        tw
      )
    }
  }

  // draw flick
  if (!['none', 'tick', 'hidden'].includes(noteImageName)) {
    if (note.type === 'Tap' || note.type === 'HoldEnd') {
      let n: TapNote | HoldEnd
      if (note.type === 'Tap') n = note as TapNote
      else n = note as HoldEnd
      if (n.flickDir !== FlickDirection.None) {
        let flickSpriteName = 'notes_flick_arrow_'
        if (n.isGold) flickSpriteName += 'crtcl_'
        flickSpriteName += '0' + Math.min(6, note.size * 2)
        if (n.flickDir !== FlickDirection.Default)
          flickSpriteName += '_diagonal'

        const flickRect = getRect(flickSpriteName)!

        let fw = (0.75 * flickRect.w * box.height) / 1175
        const fh = (0.75 * flickRect.h * box.height) / 1175
        let fx =
          box.x + (box.width - fw) / 2 + note.lane * 4 * laneWidthAtJudgement
        const fy = y - fh

        if (n.flickDir === FlickDirection.Right) {
          ctx.scale(-1, 1)
          fw *= -1
          fx *= -1
        }

        ctx.drawImage(
          noteImageSource,
          flickRect.x,
          flickRect.y,
          flickRect.w,
          flickRect.h,
          fx,
          fy,
          fw,
          fh
        )

        if (n.flickDir === FlickDirection.Right) ctx.scale(-1, 1)
      }
    }
  }

  ctx.resetTransform()
}

const drawPreviewHolds = (note: HoldStart | HoldTick, scaledTime: number) => {
  if (ctx === null) return

  if (
    note.type === 'HoldStart' ||
    (note.type === 'HoldTick' && (note as HoldTick).tickType !== TickType.Skip)
  ) {
    const n = note as HoldStart | HoldTick
    let nextNote = n.nextNode

    // console.log('hold')

    while ('nextNode' in nextNote && nextNote.tickType === TickType.Skip) {
      nextNote = nextNote.nextNode
    }

    // const startX =
    //   width / 2 + (note.lane - note.size / 2) * 4 * laneWidthAtJudgement
    // const startW = note.size * 4 * laneWidthAtJudgement
    // const [startX, startW] = getXBounds(note, scaledTime)
    const startY = scaledTimeToY(note.scaledHitTime!, scaledTime)

    // const [endX, endW] = getXBounds(nextNote, scaledTime)
    const endY = scaledTimeToY(nextNote.scaledHitTime!, scaledTime)

    // helper: compute eased percent according to easing type
    const applyEasing = (p: number, type: EasingType) => {
      if (type === EasingType.EaseIn) return Math.pow(p, 2)
      if (type === EasingType.EaseOut) return 1 - Math.pow(1 - p, 2)
      return p
    }

    // helper: compute interpolated lane/size/scaled time and map to X bounds
    // Uses temporary note + existing getXBounds helper so logic stays centralized.
    const computePoint = (
      t: number,
      from: HoldStart | HoldTick,
      to: HoldStart | HoldTick
    ) => {
      const scaledA = from.scaledHitTime!
      const scaledB = to.scaledHitTime!
      const segSpan = scaledB - scaledA || 1
      const scaledAtT = scaledA + t * (scaledB - scaledA)
      const rawPercent = (scaledAtT - scaledA) / segSpan
      const eased = applyEasing(rawPercent, from.easingType)

      // lerp lane and size with easing
      const laneAt = from.lane + eased * (to.lane - from.lane)
      const sizeAt = from.size + eased * (to.size - from.size)

      // create a temporary note-like object for getXBounds
      // ensure `nextNode` is defined so getXBounds doesn't try to access undefined
      const tempNext: any = {
        lane: to.lane,
        size: to.size,
        scaledHitTime: to.scaledHitTime,
        type: to.type,
      }

      const tempNote: any = {
        lane: laneAt,
        size: sizeAt,
        scaledHitTime: scaledAtT,
        type: 'HoldTick',
        nextNode: tempNext,
      }

      const [leftX, w] = getXBounds(tempNote as Note, scaledTime)
      const y = scaledTimeToY(scaledAtT, scaledTime)

      return { left: leftX, w, y }
    }

    // Determine fill style (guide or color)
    if (n.isGuide) {
      let pN = note as HoldStart | HoldTick | HoldEnd
      while (pN.type !== 'HoldStart') pN = pN.prevNode
      let nN = note as HoldEnd | HoldTick | HoldEnd
      while (nN.type !== 'HoldEnd') nN = nN.nextNode
      const gY0 = scaledTimeToY(pN.scaledHitTime!, scaledTime)
      const gY1 = scaledTimeToY(nN.scaledHitTime!, scaledTime)
      const guideGradient = ctx.createLinearGradient(0, gY0, 0, gY1)
      guideGradient.addColorStop(
        0,
        (n.isGold ? goldGuideColor : guideColor) + 'bb'
      )
      guideGradient.addColorStop(
        1,
        (n.isGold ? goldGuideColor : guideColor) + '33'
      )
      ctx.fillStyle = guideGradient
    } else {
      if (n.isGold) ctx.fillStyle = '#fbffdcaa'
      else ctx.fillStyle = '#7fffd3aa'
    }

    // subdivide the straight/curved segment into smaller quads to better approximate
    // the perspective deformation between start and end points
    const heightSpan = Math.max(1, Math.abs(endY - startY))
    const subdivisions = Math.max(1, Math.ceil(heightSpan / 12))

    for (let i = 0; i < subdivisions; i++) {
      const t0 = i / subdivisions
      const t1 = (i + 1) / subdivisions

      const p0 = computePoint(t0, n, nextNote as any)
      const p1 = computePoint(t1, n, nextNote as any)

      ctx.beginPath()
      ctx.moveTo(p0.left, p0.y)
      ctx.lineTo(p0.left + p0.w, p0.y)
      ctx.lineTo(p1.left + p1.w, p1.y)
      ctx.lineTo(p1.left, p1.y)
      ctx.closePath()
      ctx.fill()
    }
  }
}

const drawPreview = (timeStamp: number) => {
  if (ctx === null) return
  if (lastTime == undefined) lastTime = timeStamp
  const deltaTime = timeStamp - lastTime

  if (!hasCachedScaledTimes) {
    chartNotes.forEach((note) => {
      if (!('scaledHitTime' in note)) {
        note.scaledHitTime = getScaledTime(note.beat)
      }
    })
    hasCachedScaledTimes = true
  }

  const bpm = getBPM(cursorPos)
  const time = getTime(cursorPos)
  const scaledTime = getScaledTime(cursorPos)
  const tSig = getTsig(cursorPos)
  const hiSpeed = getHiSpeed(cursorPos)

  ctx.clearRect(0, 0, width, height)

  ctx.fillStyle = '#0007'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#222b'
  ctx.beginPath()
  ctx.roundRect(20, 20, 200, 350, 10)
  ctx.fill()

  ctx.fillStyle = 'white'
  ctx.font = '20px Arial'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('Beat: ' + cursorPos.toString().slice(0, 5), 40, 40)
  ctx.fillText('BPM: ' + bpm, 40, 70)
  ctx.fillText('Time: ' + time.toString().slice(0, 5), 40, 100)
  ctx.fillText('Scaled Time: ' + scaledTime.toString().slice(0, 5), 40, 130)
  ctx.fillText('TSig: ' + tSig.top + '/' + tSig.bottom, 40, 160)
  ctx.fillText('Speed: ' + hiSpeed.toString().slice(0, 5) + 'x', 40, 190)

  if (isPlaying) {
    setCursorPos(cursorPos + (getBPM(cursorPos) * deltaTime) / 60000)
  }

  ctx.drawImage(
    stageImageSource,
    0,
    1,
    2048,
    1176,
    box.x,
    box.y,
    box.width,
    box.height
  )

  // Debug lanes
  // ctx.strokeStyle = '#ccc'
  // ctx.lineWidth = 2
  // ctx.beginPath()
  // for (let i = -6; i <= 6; i++) {
  //   ctx.moveTo(
  //     box.x + box.width / 2 + i * laneWidthAtBottom,
  //     box.y + box.height,
  //   )
  //   ctx.lineTo(box.x + box.width / 2 + i * laneWidthAtTop, box.y)
  // }
  // ctx.stroke()
  // ctx.strokeRect(
  //   box.x,
  //   box.y +
  //     box.height * (1 - judgementHeightPercent - judgeAreaHeightPercent * 0.5),
  //   box.width,
  //   box.height * judgeAreaHeightPercent,
  // )

  // ctx.fillStyle = 'white'
  // ctx.fillRect(box.x + box.width / 2, box.vanishingY, 4, 4)

  chartNotes
    .filter((n) => n.type === 'HoldStart' || n.type === 'HoldTick')
    .filter((n) => {
      const ht = n as HoldTick
      if (ht.tickType === TickType.Skip) return false
      return true
    })
    .filter((n) => {
      // cull holds that are completely outside the preview time window
      const horizon = playSpeed / 12
      const startTime = n.scaledHitTime || 0

      // find end time for this segment (next non-skip node)
      let endNode: any = n
      while ('nextNode' in endNode && endNode.nextNode) {
        endNode = endNode.nextNode
        if (endNode.tickType !== TickType.Skip) break
      }
      const endTime = endNode.scaledHitTime || startTime

      const visibleStart = scaledTime
      const visibleEnd = scaledTime + horizon

      // overlap test
      return endTime >= visibleStart && startTime <= visibleEnd
    })
    .sort((a, b) => b.scaledHitTime! - a.scaledHitTime!)
    .forEach((n) => drawPreviewHolds(n as HoldStart | HoldTick, scaledTime))

  chartNotes
    .filter((n) => !['HiSpeed', 'TimeSignature', 'BPMChange'].includes(n.type))
    .filter((n) => {
      // Always draw normal upcoming notes within the horizon
      const withinHorizon =
        scaledTime <= n.scaledHitTime! &&
        n.scaledHitTime! - scaledTime <= playSpeed / 12

      // Special-case: keep HoldStart head drawn at judgement while the hold is active
      if (n.type === 'HoldStart') {
        // find the final HoldEnd node for this hold chain (skip intermediate skip ticks)
        let endNode: any = n
        while ('nextNode' in endNode && endNode.nextNode) {
          endNode = endNode.nextNode
          if (endNode.type === 'HoldEnd') break
        }
        const endTime = endNode.scaledHitTime || n.scaledHitTime

        // if the hold has started but not yet ended, keep its head visible
        const holdActive =
          scaledTime > n.scaledHitTime! && scaledTime <= endTime

        return withinHorizon || holdActive
      }

      return withinHorizon
    })
    .sort((a, b) => b.scaledHitTime! - a.scaledHitTime!)
    .forEach((n) => drawPreviewNote(n, scaledTime))

  lastTime = timeStamp
}

export default drawPreview
