import {
  chartLayers,
  chartNotes,
  cursorPos,
  getBPM,
  getNoteImageName,
  getScaledTime,
  getTime,
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
import * as holdNoteRect from '../sprite_sheet/longNoteLine.json'

const playSpeed = 12

export let hasCachedScaledTimes = false
export const disableCachedScaledTimes = () => (hasCachedScaledTimes = false)

export let gl: WebGLRenderingContext | null = null
let lastTime: number

// WebGL shader programs and buffers
let shaderProgram: WebGLProgram | null = null
let quadBuffer: WebGLBuffer | null = null
let texCoordBuffer: WebGLBuffer | null = null
let alphaBuffer: WebGLBuffer | null = null
const textureCache = new Map<HTMLImageElement, WebGLTexture>()

// Text rendering using Canvas2D
let textCanvas: HTMLCanvasElement | null = null
// let textCtx: CanvasRenderingContext2D | null = null
// let textTexture: WebGLTexture | null = null

export const setPreviewContext = (canvas: HTMLCanvasElement) => {
  gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
  })
  if (!gl) {
    console.error('WebGL not supported')
    return
  }

  initWebGL()

  // Create text rendering canvas
  textCanvas = document.createElement('canvas')
  textCanvas.width = 512
  textCanvas.height = 512
  // textCtx = textCanvas.getContext('2d')
}

const initWebGL = () => {
  if (!gl) return

  // Vertex shader - handles arbitrary quad positioning with perspective
  const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    attribute float a_alpha;

    uniform vec2 u_resolution;

    varying vec2 v_texCoord;
    varying float v_alpha;

    void main() {
      vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
      gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
      v_texCoord = a_texCoord;
      v_alpha = a_alpha;
    }
  `

  // Fragment shader
  const fragmentShaderSource = `
    precision mediump float;

    uniform sampler2D u_texture;
    uniform float u_alpha;
    uniform vec4 u_color;
    uniform bool u_useTexture;
    uniform bool u_useVertexAlpha;

    varying vec2 v_texCoord;
    varying float v_alpha;

    void main() {
      if (u_useTexture) {
        gl_FragColor = texture2D(u_texture, v_texCoord) * vec4(1, 1, 1, u_alpha);
      } else {
        float finalAlpha = u_useVertexAlpha ? v_alpha : u_color.a;
        gl_FragColor = vec4(u_color.rgb, finalAlpha);
      }
    }
  `

  // Compile shaders
  const vertexShader = gl.createShader(gl.VERTEX_SHADER)!
  gl.shaderSource(vertexShader, vertexShaderSource)
  gl.compileShader(vertexShader)

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!
  gl.shaderSource(fragmentShader, fragmentShaderSource)
  gl.compileShader(fragmentShader)

  // Create program
  shaderProgram = gl.createProgram()!
  gl.attachShader(shaderProgram, vertexShader)
  gl.attachShader(shaderProgram, fragmentShader)
  gl.linkProgram(shaderProgram)

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error(
      'Shader program failed to link:',
      gl.getProgramInfoLog(shaderProgram),
    )
    return
  }

  // Create buffers
  quadBuffer = gl.createBuffer()
  texCoordBuffer = gl.createBuffer()
  alphaBuffer = gl.createBuffer()

  // Enable blending for transparency
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
}

// Create or get cached WebGL texture from image
const getTexture = (image: HTMLImageElement): WebGLTexture | null => {
  if (!gl) return null

  if (textureCache.has(image)) {
    return textureCache.get(image)!
  }

  const texture = gl.createTexture()
  if (!texture) return null

  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

  textureCache.set(image, texture)
  return texture
}

// Draw an arbitrary quad with texture
const drawQuad = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
  image: HTMLImageElement,
  srcX: number,
  srcY: number,
  srcW: number,
  srcH: number,
  alpha: number = 1.0,
) => {
  if (!gl || !shaderProgram) return

  const texture = getTexture(image)
  if (!texture) return

  gl.useProgram(shaderProgram)

  // Set up quad vertices (counter-clockwise)
  const vertices = new Float32Array([
    x1,
    y1,
    x2,
    y2,
    x4,
    y4,
    x2,
    y2,
    x3,
    y3,
    x4,
    y4,
  ])

  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW)

  const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position')
  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

  // Set up texture coordinates
  const imgW = image.width
  const imgH = image.height
  const u1 = srcX / imgW
  const v1 = srcY / imgH
  const u2 = (srcX + srcW) / imgW
  const v2 = (srcY + srcH) / imgH

  const texCoords = new Float32Array([
    u1,
    v1,
    u2,
    v1,
    u1,
    v2,
    u2,
    v1,
    u2,
    v2,
    u1,
    v2,
  ])

  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.DYNAMIC_DRAW)

  const texCoordLocation = gl.getAttribLocation(shaderProgram, 'a_texCoord')
  gl.enableVertexAttribArray(texCoordLocation)
  gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0)

  // Set uniforms
  const resolutionLocation = gl.getUniformLocation(
    shaderProgram,
    'u_resolution',
  )
  gl.uniform2f(resolutionLocation, width, height)

  const alphaLocation = gl.getUniformLocation(shaderProgram, 'u_alpha')
  gl.uniform1f(alphaLocation, alpha)

  const useTextureLocation = gl.getUniformLocation(
    shaderProgram,
    'u_useTexture',
  )
  gl.uniform1i(useTextureLocation, 1)

  // Bind texture
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.uniform1i(gl.getUniformLocation(shaderProgram, 'u_texture'), 0)

  // Draw
  gl.drawArrays(gl.TRIANGLES, 0, 6)
}

// Draw a filled quad (no texture)
const drawFilledQuad = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
  r: number,
  g: number,
  b: number,
  a: number,
  a1?: number,
  a2?: number,
  a3?: number,
  a4?: number,
) => {
  if (!gl || !shaderProgram) return

  gl.useProgram(shaderProgram)

  // Set up quad vertices
  const vertices = new Float32Array([
    x1,
    y1,
    x2,
    y2,
    x4,
    y4,
    x2,
    y2,
    x3,
    y3,
    x4,
    y4,
  ])

  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW)

  const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position')
  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

  // Set uniforms
  const resolutionLocation = gl.getUniformLocation(
    shaderProgram,
    'u_resolution',
  )
  gl.uniform2f(resolutionLocation, width, height)

  const useTextureLocation = gl.getUniformLocation(
    shaderProgram,
    'u_useTexture',
  )
  gl.uniform1i(useTextureLocation, 0)

  const colorLocation = gl.getUniformLocation(shaderProgram, 'u_color')
  gl.uniform4f(colorLocation, r, g, b, a)

  // Handle per-vertex alpha if provided
  const useVertexAlpha =
    a1 !== undefined && a2 !== undefined && a3 !== undefined && a4 !== undefined
  const useVertexAlphaLocation = gl.getUniformLocation(
    shaderProgram,
    'u_useVertexAlpha',
  )
  gl.uniform1i(useVertexAlphaLocation, useVertexAlpha ? 1 : 0)

  if (useVertexAlpha) {
    const alphas = new Float32Array([a1!, a2!, a4!, a2!, a3!, a4!])
    gl.bindBuffer(gl.ARRAY_BUFFER, alphaBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, alphas, gl.DYNAMIC_DRAW)
    const alphaLocation = gl.getAttribLocation(shaderProgram, 'a_alpha')
    gl.enableVertexAttribArray(alphaLocation)
    gl.vertexAttribPointer(alphaLocation, 1, gl.FLOAT, false, 0, 0)
  }

  // Draw
  gl.drawArrays(gl.TRIANGLES, 0, 6)
}

// Helper to draw a simple rectangle
// const drawRect = (
//   x: number,
//   y: number,
//   w: number,
//   h: number,
//   r: number,
//   g: number,
//   b: number,
//   a: number,
// ) => {
//   drawFilledQuad(x, y, x + w, y, x + w, y + h, x, y + h, r, g, b, a)
// }

// Draw text using Canvas2D texture
// const drawText = (
//   text: string,
//   x: number,
//   y: number,
//   fontSize: number = 20,
//   color: string = 'white',
// ) => {
//   if (!gl || !textCtx || !textCanvas) return

//   // Clear text canvas
//   textCtx.clearRect(0, 0, textCanvas.width, textCanvas.height)

//   // Draw text to canvas
//   textCtx.fillStyle = color
//   textCtx.font = `${fontSize}px Arial`
//   textCtx.textAlign = 'left'
//   textCtx.textBaseline = 'top'
//   textCtx.fillText(text, 0, 0)

//   // Measure text
//   const metrics = textCtx.measureText(text)
//   const textWidth = metrics.width
//   const textHeight =
//     metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent

//   // Create/update texture
//   if (!textTexture) {
//     textTexture = gl.createTexture()
//   }

//   gl.bindTexture(gl.TEXTURE_2D, textTexture)
//   gl.texImage2D(
//     gl.TEXTURE_2D,
//     0,
//     gl.RGBA,
//     gl.RGBA,
//     gl.UNSIGNED_BYTE,
//     textCanvas,
//   )
//   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
//   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
//   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
//   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

//   // Draw text quad
//   if (!shaderProgram) return

//   gl.useProgram(shaderProgram)

//   const vertices = new Float32Array([
//     x,
//     y,
//     x + textWidth,
//     y,
//     x,
//     y + textHeight,
//     x + textWidth,
//     y,
//     x + textWidth,
//     y + textHeight,
//     x,
//     y + textHeight,
//   ])

//   gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
//   gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW)

//   const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position')
//   gl.enableVertexAttribArray(positionLocation)
//   gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

//   const texCoords = new Float32Array([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1])

//   gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer)
//   gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.DYNAMIC_DRAW)

//   const texCoordLocation = gl.getAttribLocation(shaderProgram, 'a_texCoord')
//   gl.enableVertexAttribArray(texCoordLocation)
//   gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0)

//   const resolutionLocation = gl.getUniformLocation(
//     shaderProgram,
//     'u_resolution',
//   )
//   gl.uniform2f(resolutionLocation, width, height)

//   const alphaLocation = gl.getUniformLocation(shaderProgram, 'u_alpha')
//   gl.uniform1f(alphaLocation, 1.0)

//   const useTextureLocation = gl.getUniformLocation(
//     shaderProgram,
//     'u_useTexture',
//   )
//   gl.uniform1i(useTextureLocation, 1)

//   gl.activeTexture(gl.TEXTURE0)
//   gl.bindTexture(gl.TEXTURE_2D, textTexture)
//   gl.uniform1i(gl.getUniformLocation(shaderProgram, 'u_texture'), 0)

//   gl.drawArrays(gl.TRIANGLES, 0, 6)
// }

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

const judgementHeightPercent = 0.318
const judgeAreaHeightPercent = 0.055

/*
# Sekai Stage
0,1,2048,1176
*/

const stageImageSource = new Image()
stageImageSource.src = 'stage/stage.png'

const noteImageSource = new Image()
noteImageSource.src = 'editor_sprites/notes.png'

const particleImageSource = new Image()
particleImageSource.src = 'particle/particles.png'

const holdNoteImageSource = new Image()
holdNoteImageSource.src = 'editor_sprites/longNoteLine.png'

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
    from.easingType,
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

const drawPreviewNote = (note: Note, scaledTime: number, flatTime: number) => {
  if (gl === null) return
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

  // Calculate 3D perspective transformation
  const centerX = box.x + box.width / 2
  const vanishY = box.vanishingY

  const yCenter = scaledTimeToY(note.scaledHitTime, scaledTime)
  const scaleAtCenter = Math.max(0, (yCenter - vanishY) / (y - vanishY))
  const scaledHeight = h * scaleAtCenter
  const yTop = yCenter - scaledHeight / 2
  const yBottom = yCenter + scaledHeight / 2

  const yTop2 = yCenter + 1.5 * (yTop - yCenter)

  const scaleTop = Math.max(0, (yTop2 - vanishY) / (y - vanishY))
  const scaleBottom = Math.max(0, (yCenter - vanishY) / (y - vanishY))

  // Calculate trapezoid corners with uniform scaling from judgment line reference
  // Each edge scales based on its distance from vanishing point
  const x1 = centerX + (x - centerX) * scaleTop
  const y1 = yTop
  const x2 = centerX + (x + w - centerX) * scaleTop
  const y2 = yTop
  const x3 = centerX + (x + w - centerX) * scaleBottom
  const y3 = yBottom
  const x4 = centerX + (x - centerX) * scaleBottom
  const y4 = yBottom

  if (note.type !== 'HoldTick') {
    // Draw center part with perspective scaling at top and bottom
    drawQuad(
      x1 + 0.7 * h * scaleTop,
      y1,
      x2 - 0.7 * h * scaleTop,
      y2,
      x3 - 0.7 * h * scaleBottom,
      y3,
      x4 + 0.7 * h * scaleBottom,
      y4,
      noteImageSource,
      noteImageRect.x + 0.5 * noteImageRect.h,
      noteImageRect.y,
      noteImageRect.w - noteImageRect.h,
      noteImageRect.h,
    )

    // Draw left cap with perspective scaling
    drawQuad(
      x1 - 0.3 * h * scaleTop,
      y1,
      x1 + 0.7 * h * scaleTop,
      y2,
      x4 + 0.7 * h * scaleBottom,
      y3,
      x4 - 0.3 * h * scaleBottom,
      y4,
      noteImageSource,
      noteImageRect.x,
      noteImageRect.y,
      noteImageRect.h,
      noteImageRect.h,
    )

    // Draw right cap with perspective scaling
    drawQuad(
      x2 - 0.7 * h * scaleTop,
      y1,
      x2 + 0.3 * h * scaleTop,
      y2,
      x3 + 0.3 * h * scaleBottom,
      y3,
      x3 - 0.7 * h * scaleBottom,
      y4,
      noteImageSource,
      noteImageRect.x + noteImageRect.w - noteImageRect.h,
      noteImageRect.y,
      noteImageRect.h,
      noteImageRect.h,
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
      // let traceSize = (n as any).size || 1
      if (
        (note as any).type === 'HoldStart' &&
        scaledTime > (note as any).scaledHitTime &&
        'nextNode' in note &&
        (note as any).nextNode
      ) {
        const hs = note as HoldStart
        const p = getHoldLaneSizeAt(hs, scaledTime)
        traceLane = p.lane
        // traceSize = p.size
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
          let pN: HoldTick | HoldStart = t.prevNode
          let nN: HoldTick | HoldEnd = t.nextNode

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
          let pN: HoldTick | HoldStart = t.prevNode
          let nN: HoldTick | HoldEnd = t.nextNode

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

      // Draw trace with old perspective system
      const transformX = (px: number) => {
        return centerX + (px - centerX) * percentAmong
      }

      const transformY = (py: number) => {
        return vanishY + (py - vanishY) * percentAmong
      }

      const tx1 = transformX(tx)
      const ty1 = transformY(y - 0.125 * tw)
      const tx2 = transformX(tx + tw)
      const ty2 = transformY(y - 0.125 * tw)
      const tx3 = transformX(tx + tw)
      const ty3 = transformY(y - 0.125 * tw + tw)
      const tx4 = transformX(tx)
      const ty4 = transformY(y - 0.125 * tw + tw)

      drawQuad(
        tx1,
        ty1,
        tx2,
        ty2,
        tx3,
        ty3,
        tx4,
        ty4,
        noteImageSource,
        traceRect.x,
        traceRect.y,
        traceRect.w,
        traceRect.h,
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

        const fw = (0.75 * flickRect.w * box.height) / 1175
        const fh = (0.75 * flickRect.h * box.height) / 1175
        const fx =
          box.x + (box.width - fw) / 2 + note.lane * 4 * laneWidthAtJudgement
        const opacity = 1 - ((flatTime * 2) % 1)
        const fy = y - fh - (box.height / 10) * (0.5 - opacity)

        // Draw flick arrow with old perspective system
        const transformX = (px: number) => {
          return centerX + (px - centerX) * percentAmong
        }

        const transformY = (py: number) => {
          return vanishY + (py - vanishY) * percentAmong
        }

        const fx1 = transformX(fx)
        const fy1 = transformY(fy)
        const fx2 = transformX(fx + fw)
        const fy2 = transformY(fy)
        const fx3 = transformX(fx + fw)
        const fy3 = transformY(fy + fh)
        const fx4 = transformX(fx)
        const fy4 = transformY(fy + fh)

        if (n.flickDir === FlickDirection.Right) {
          // Flip horizontally for right flick
          drawQuad(
            fx2,
            fy2,
            fx1,
            fy1,
            fx4,
            fy4,
            fx3,
            fy3,
            noteImageSource,
            flickRect.x,
            flickRect.y,
            flickRect.w,
            flickRect.h,
            opacity,
          )
        } else {
          drawQuad(
            fx1,
            fy1,
            fx2,
            fy2,
            fx3,
            fy3,
            fx4,
            fy4,
            noteImageSource,
            flickRect.x,
            flickRect.y,
            flickRect.w,
            flickRect.h,
            opacity,
          )
        }
      }
    }
  }
}

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
  to: HoldTick | HoldEnd,
  scaledTime: number,
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
  const tempNext = {
    lane: to.lane,
    size: to.size,
    scaledHitTime: to.scaledHitTime,
    type: to.type,
  } as HoldTick

  const tempNote = {
    lane: laneAt,
    size: sizeAt,
    scaledHitTime: scaledAtT,
    type: 'HoldTick' as const,
    nextNode: tempNext,
  } as HoldTick

  const [leftX, w] = getXBounds(tempNote as Note, scaledTime)
  const y = scaledTimeToY(scaledAtT, scaledTime)

  return { left: leftX, w, y }
}

const drawPreviewHolds = (note: HoldStart | HoldTick, scaledTime: number) => {
  if (gl === null) return

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

    // Determine color based on hold type
    let r = 0.5,
      g = 1.0,
      b = 0.83,
      a = 0.67
    let currentNodeIndex = 0
    let nextNodeIndex = 0
    let totalHoldTicks = 0
    if (n.isGuide) {
      // Use cached references if available, otherwise traverse
      const pN =
        note.holdStart ||
        (() => {
          let node = note as HoldStart | HoldTick | HoldEnd
          while (node.type !== 'HoldStart') node = node.prevNode
          return node as HoldStart
        })()
      // const nN =
      //   note.holdEnd ||
      //   (() => {
      //     let node = note as HoldEnd | HoldTick | HoldEnd
      //     while (node.type !== 'HoldEnd') node = node.nextNode
      //     return node as HoldEnd
      //   })()

      // Count total hold ticks and find current node's index
      let tempNode = pN as HoldStart | HoldTick | HoldEnd
      let nodeIndex = 0
      while (tempNode.type !== 'HoldEnd') {
        if (tempNode === note) {
          currentNodeIndex = nodeIndex
        }
        if (tempNode === nextNote) {
          nextNodeIndex = nodeIndex
        }
        if (tempNode.type === 'HoldTick') {
          totalHoldTicks++
        }
        tempNode = tempNode.nextNode as HoldStart | HoldTick | HoldEnd
        nodeIndex++
      }
      // Check if nextNote is the HoldEnd
      if (tempNode === nextNote) {
        nextNodeIndex = nodeIndex
      }

      // Parse guide color (hex to RGB)
      const color = n.isGold ? goldGuideColor : guideColor
      const hex = color.replace('#', '')
      r = parseInt(hex.substr(0, 2), 16) / 255
      g = parseInt(hex.substr(2, 2), 16) / 255
      b = parseInt(hex.substr(4, 2), 16) / 255

      // Alpha will be calculated per-vertex below
      a = 0.8 // This will be overridden by per-vertex alpha
    } else {
      if (n.isGold) {
        r = 0.98
        g = 1.0
        b = 0.86
        a = 0.67
      }
    }

    // subdivide the straight/curved segment into smaller quads to better approximate
    // the perspective deformation between start and end points
    const heightSpan = Math.max(1, Math.abs(endY - startY))
    const subdivisions = Math.max(1, Math.ceil(heightSpan / 8))

    for (let i = 0; i < subdivisions; i++) {
      const t0 = i / subdivisions
      const t1 = (i + 1) / subdivisions

      const p0 = computePoint(t0, n, nextNote as HoldTick | HoldEnd, scaledTime)
      const p1 = computePoint(t1, n, nextNote as HoldTick | HoldEnd, scaledTime)

      // Calculate per-vertex alpha for guide notes based on hold tick index
      let alpha0 = a
      let alpha1 = a
      if (n.isGuide) {
        // Calculate alpha based on node index
        // Formula: alpha = 0.8 - (nodeIndex / (totalHoldTicks + 1)) * 0.6
        const divisor = totalHoldTicks + 1

        // For subdivisions, interpolate between current and next node's alpha
        const alphaStart = 0.8 - (currentNodeIndex / divisor) * 0.6
        const alphaEnd = 0.8 - (nextNodeIndex / divisor) * 0.6

        alpha0 = alphaStart + t0 * (alphaEnd - alphaStart)
        alpha1 = alphaStart + t1 * (alphaEnd - alphaStart)
      }

      // Draw trapezoid segment with 3D perspective and gradient alpha
      if (n.isGuide) {
        drawFilledQuad(
          p0.left,
          p0.y,
          p0.left + p0.w,
          p0.y,
          p1.left + p1.w,
          p1.y,
          p1.left,
          p1.y,
          r,
          g,
          b,
          a,
          alpha0,
          alpha0,
          alpha1,
          alpha1,
        )
      } else {
        const rect = n.isGold
          ? holdNoteRect.long_critical_normal
          : holdNoteRect.long_normal
        drawQuad(
          p0.left,
          p0.y,
          p0.left + p0.w,
          p0.y,
          p1.left + p1.w,
          p1.y,
          p1.left,
          p1.y,
          holdNoteImageSource,
          rect[0],
          rect[1],
          rect[2],
          rect[3],
        )
      }
    }
  }
}

const drawPreview = (timeStamp: number) => {
  if (gl === null) return
  if (lastTime == undefined) lastTime = timeStamp
  const deltaTime = timeStamp - lastTime

  if (!hasCachedScaledTimes) {
    chartNotes.forEach((note) => {
      note.scaledHitTime = getScaledTime(
        note.beat,
        (note as TapNote)?.layer || chartLayers[0],
      )
    })
    hasCachedScaledTimes = true
  }

  // const bpm = getBPM(cursorPos)
  const flatTime = getTime(cursorPos)
  // const scaledTime = getScaledTime(cursorPos)
  // const tSig = getTsig(cursorPos)
  // const hiSpeed = getHiSpeed(cursorPos)

  gl.clearColor(0, 0, 0, 0.6)
  gl.clear(gl.COLOR_BUFFER_BIT)

  // // Draw info panel background
  // drawRect(20, 20, 200, 350, 0.13, 0.13, 0.13, 0.73)

  // // Draw text info
  // drawText('Beat: ' + cursorPos.toString().slice(0, 5), 40, 40, 80)
  // drawText('BPM: ' + bpm, 40, 70, 80)
  // drawText('Time: ' + time.toString().slice(0, 5), 40, 100, 80)
  // drawText('Scaled Time: ' + scaledTime.toString().slice(0, 5), 40, 130, 80)
  // drawText('TSig: ' + tSig.top + '/' + tSig.bottom, 40, 160, 80)
  // drawText('Speed: ' + hiSpeed.toString().slice(0, 5) + 'x', 40, 190, 80)

  if (isPlaying) {
    setCursorPos(cursorPos + (getBPM(cursorPos) * deltaTime) / 60000)
  }

  // Draw stage background
  drawQuad(
    box.x,
    box.y,
    box.x + box.width,
    box.y,
    box.x + box.width,
    box.y + box.height,
    box.x,
    box.y + box.height,
    stageImageSource,
    0,
    1,
    2048,
    1176,
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
      const horizon = 10 / playSpeed
      const startTime = n.scaledHitTime || 0

      // find end time for this segment (next non-skip node)
      let endNode: Note = n
      if ('holdEnd' in endNode) endNode = endNode.holdEnd as Note
      else {
        while ('nextNode' in endNode && endNode.nextNode) {
          endNode = endNode.nextNode as Note
          if (
            'tickType' in endNode &&
            (endNode as HoldTick).tickType !== TickType.Skip
          )
            break
          ;(n as HoldTick).holdEnd = endNode as HoldEnd
        }
      }
      const endTime = endNode.scaledHitTime || startTime

      const visibleStart = getScaledTime(cursorPos, (n as TapNote).layer)
      const visibleEnd = visibleStart + horizon

      // overlap test
      return endTime >= visibleStart && startTime <= visibleEnd
    })
    .sort(orderHolds)
    .forEach((n) =>
      drawPreviewHolds(
        n as HoldStart | HoldTick,
        getScaledTime(cursorPos, (n as TapNote).layer),
      ),
    )

  chartNotes
    .filter((n) => !['HiSpeed', 'TimeSignature', 'BPMChange'].includes(n.type))
    .filter((n) => {
      // Always draw normal upcoming notes within the horizon
      const withinHorizon =
        getScaledTime(cursorPos, (n as TapNote).layer) <= n.scaledHitTime! &&
        n.scaledHitTime! - getScaledTime(cursorPos, (n as TapNote).layer) <=
          10 / playSpeed

      // Special-case: keep HoldStart head drawn at judgement while the hold is active
      if (n.type === 'HoldStart') {
        // find the final HoldEnd node for this hold chain (skip intermediate skip ticks)
        let endNode: Note = n
        while ('nextNode' in endNode && endNode.nextNode) {
          endNode = endNode.nextNode as Note
          if (endNode.type === 'HoldEnd') break
        }
        const endTime = endNode.scaledHitTime || n.scaledHitTime!

        // if the hold has started but not yet ended, keep its head visible
        const holdActive =
          getScaledTime(cursorPos, (n as TapNote).layer) > n.scaledHitTime! &&
          getScaledTime(cursorPos, (n as TapNote).layer) <= endTime!

        return withinHorizon || holdActive
      }

      return withinHorizon
    })
    .sort((a, b) => b.scaledHitTime! - a.scaledHitTime!)
    .forEach((n) =>
      drawPreviewNote(
        n,
        getScaledTime(cursorPos, (n as TapNote).layer),
        flatTime,
      ),
    )

  lastTime = timeStamp
}

const orderHolds = (a: Note, b: Note) => {
  const timeDiff =
    getStartTime(a as HoldStart | HoldTick) -
    getStartTime(b as HoldStart | HoldTick)
  if (timeDiff !== 0) return timeDiff

  const goldDiff =
    (a as HoldStart | HoldTick).isGold === (b as HoldStart | HoldTick).isGold
  if (+goldDiff !== 0) return +goldDiff

  const guideDif =
    (a as HoldStart | HoldTick).isGuide === (b as HoldStart | HoldTick).isGuide
  return +guideDif
}

const getStartTime = (n: HoldStart | HoldTick) => {
  if (!('holdStart' in n) || !n.holdStart) {
    if (n.type === 'HoldStart') {
      n.holdStart = n
    } else {
      let hs: HoldStart | HoldTick = n
      while ('prevNode' in hs && hs.prevNode) {
        hs = hs.prevNode
        if (hs.type === 'HoldStart') break
      }
      n.holdStart = hs as HoldStart
    }
  }

  return n.holdStart.scaledHitTime!
}

export default drawPreview
