import { ParticleData } from '@sonolus/core'

// Easing functions
const easingFunctions = {
  linear: (t: number) => t,
  inSine: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
  outSine: (t: number) => Math.sin((t * Math.PI) / 2),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t: number) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  inQuart: (t: number) => t * t * t * t,
  outQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  inOutQuart: (t: number) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  inQuint: (t: number) => t * t * t * t * t,
  outQuint: (t: number) => 1 - Math.pow(1 - t, 5),
  inOutQuint: (t: number) =>
    t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
  inExpo: (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t: number) =>
    t === 0
      ? 0
      : t === 1
        ? 1
        : t < 0.5
          ? Math.pow(2, 20 * t - 10) / 2
          : (2 - Math.pow(2, -20 * t + 10)) / 2,
  inCirc: (t: number) => 1 - Math.sqrt(1 - Math.pow(t, 2)),
  outCirc: (t: number) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  inOutCirc: (t: number) =>
    t < 0.5
      ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
      : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  inBack: (t: number) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return c3 * t * t * t - c1 * t * t
  },
  outBack: (t: number) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
  inOutBack: (t: number) => {
    const c1 = 1.70158
    const c2 = c1 * 1.525
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2
  },
}

type EasingType = keyof typeof easingFunctions

interface PropertyExpression {
  from?: Record<string, number>
  to?: Record<string, number>
  ease?: string
}

interface ParticleInstance {
  sprite: number
  color: string
  start: number
  duration: number
  x: PropertyExpression
  y: PropertyExpression
  w: PropertyExpression
  h: PropertyExpression
  r: PropertyExpression
  a: PropertyExpression
}

interface ParticleGroup {
  count: number
  particles: ParticleInstance[]
}

interface ParticleEffect {
  name: string
  transform: {
    x1: Record<string, number>
    y1: Record<string, number>
    x2: Record<string, number>
    y2: Record<string, number>
    x3: Record<string, number>
    y3: Record<string, number>
    x4: Record<string, number>
    y4: Record<string, number>
  }
  groups: ParticleGroup[]
}

interface Sprite {
  x: number
  y: number
  w: number
  h: number
}

interface ActiveParticle {
  effectName: string
  groupIndex: number
  particleIndex: number
  instanceIndex: number
  startTime: number
  duration: number
  sprite: number
  color: string
  randomValues: number[]
  spawnTransform: {
    x1: number
    y1: number
    x2: number
    y2: number
    x3: number
    y3: number
    x4: number
    y4: number
  }
  looping?: boolean
  loopId?: string
  originalDuration?: number
  originalStartOffset?: number
  updateTransform?: () => {
    x1: number
    y1: number
    x2: number
    y2: number
    x3: number
    y3: number
    x4: number
    y4: number
  }
}

export class ParticleSystem {
  private gl: WebGLRenderingContext
  private particleData: ParticleData
  private texture: WebGLTexture | null = null
  private shaderProgram: WebGLProgram | null = null
  private vertexBuffer: WebGLBuffer | null = null
  private texCoordBuffer: WebGLBuffer | null = null
  private activeParticles: ActiveParticle[] = []

  // Cached attribute/uniform locations
  private positionLocation: number = -1
  private texCoordLocation: number = -1
  private resolutionLocation: WebGLUniformLocation | null = null
  private textureLocation: WebGLUniformLocation | null = null
  private colorLocation: WebGLUniformLocation | null = null
  private alphaLocation: WebGLUniformLocation | null = null

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl
    this.particleData = {
      width: 0,
      height: 0,
      interpolation: false,
      sprites: [],
      effects: [],
    }
  }

  async loadParticleData(dataUrl: string, textureUrl: string): Promise<void> {
    // Load particle data JSON
    const response = await fetch(dataUrl)
    this.particleData = (await response.json()) as ParticleData

    // Load texture
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = textureUrl
    })

    // Create WebGL texture
    const gl = this.gl
    this.texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)

    if (this.particleData.interpolation) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // Initialize shaders
    this.initShaders()
  }

  private initShaders(): void {
    const gl = this.gl

    const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            uniform vec2 u_resolution;
            varying vec2 v_texCoord;

            void main() {
                vec2 clipSpace = ((a_position / u_resolution) * 2.0 - 1.0) * vec2(1, -1);
                gl_Position = vec4(clipSpace, 0, 1);
                v_texCoord = a_texCoord;
            }
        `

    const fragmentShaderSource = `
            precision mediump float;
            uniform sampler2D u_texture;
            uniform vec4 u_color;
            uniform float u_alpha;
            varying vec2 v_texCoord;

            void main() {
                vec4 texColor = texture2D(u_texture, v_texCoord);
                gl_FragColor = vec4(u_color.rgb * texColor.rgb, texColor.a * u_alpha * u_color.a);
            }
        `

    const vertexShader = this.compileShader(
      gl.VERTEX_SHADER,
      vertexShaderSource,
    )
    const fragmentShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      fragmentShaderSource,
    )

    if (!vertexShader || !fragmentShader) return

    this.shaderProgram = gl.createProgram()!
    gl.attachShader(this.shaderProgram, vertexShader)
    gl.attachShader(this.shaderProgram, fragmentShader)
    gl.linkProgram(this.shaderProgram)

    if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) {
      console.error(
        'Shader program linking failed:',
        gl.getProgramInfoLog(this.shaderProgram),
      )
      return
    }

    // Create buffers
    this.vertexBuffer = gl.createBuffer()
    this.texCoordBuffer = gl.createBuffer()

    // Cache attribute/uniform locations
    this.positionLocation = gl.getAttribLocation(
      this.shaderProgram,
      'a_position',
    )
    this.texCoordLocation = gl.getAttribLocation(
      this.shaderProgram,
      'a_texCoord',
    )
    this.resolutionLocation = gl.getUniformLocation(
      this.shaderProgram,
      'u_resolution',
    )
    this.textureLocation = gl.getUniformLocation(
      this.shaderProgram,
      'u_texture',
    )
    this.colorLocation = gl.getUniformLocation(this.shaderProgram, 'u_color')
    this.alphaLocation = gl.getUniformLocation(this.shaderProgram, 'u_alpha')
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation failed:', gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return null
    }

    return shader
  }

  /**
   * Spawn a particle effect with full transform control
   * @param effectName Name of the effect from particle data
   * @param x1 Top-left X coordinate
   * @param y1 Top-left Y coordinate
   * @param x2 Top-right X coordinate
   * @param y2 Top-right Y coordinate
   * @param x3 Bottom-left X coordinate
   * @param y3 Bottom-left Y coordinate
   * @param x4 Bottom-right X coordinate
   * @param y4 Bottom-right Y coordinate
   */
  /**
   * Spawns a particle effect mapped to an arbitrary quad.
   *
   * The quad is defined by 4 corners in the following order:
   * - (x1, y1): top-left
   * - (x2, y2): top-right
   * - (x3, y3): bottom-left
   * - (x4, y4): bottom-right
   *
   * Particles will be mapped to this quad using bilinear interpolation,
   * allowing effects to follow perspective warps and arbitrary transformations.
   */
  spawnEffect(
    effectName: string,
    x1: number = 0,
    y1: number = 0,
    x2: number = 1,
    y2: number = 0,
    x3: number = 0,
    y3: number = 1,
    x4: number = 1,
    y4: number = 1,
    looping: boolean = false,
    loopId?: string,
    updateTransform?: () => {
      x1: number
      y1: number
      x2: number
      y2: number
      x3: number
      y3: number
      x4: number
      y4: number
    },
  ): void {
    const effect = this.particleData.effects.find(
      (e: ParticleEffect) => e.name === effectName,
    )
    if (!effect) {
      console.warn(`Particle effect "${effectName}" not found`)
      return
    }

    const currentTime = performance.now() / 1000

    // Spawn particles for each group
    effect.groups.forEach((group: ParticleGroup, groupIndex: number) => {
      for (let i = 0; i < group.count; i++) {
        group.particles.forEach(
          (particle: ParticleInstance, particleIndex: number) => {
            const randomValues = Array.from({ length: 8 }, () => Math.random())

            // Apply transform
            const transformedPos = this.applyTransform(effect.transform, {
              x1,
              y1,
              x2,
              y2,
              x3,
              y3,
              x4,
              y4,
              randomValues,
            })

            this.activeParticles.push({
              effectName,
              groupIndex,
              particleIndex,
              instanceIndex: i,
              startTime: currentTime + particle.start,
              duration: particle.duration,
              sprite: particle.sprite,
              color: particle.color,
              randomValues,
              spawnTransform: transformedPos,
              looping,
              loopId,
              originalDuration: looping ? particle.duration : undefined,
              originalStartOffset: looping ? particle.start : undefined,
              updateTransform,
            })
          },
        )
      }
    })
  }

  /**
   * Spawn a particle effect with position, scale, and rotation
   * @param effectName Name of the effect from particle data
   * @param x Center X position
   * @param y Center Y position
   * @param scale Scale multiplier (default 1.0)
   * @param rotation Rotation in radians (default 0)
   */
  spawnEffectWithRotation(
    effectName: string,
    x: number,
    y: number,
    scale: number = 1.0,
    rotation: number = 0,
  ): void {
    const halfScale = scale / 2

    // Calculate rotated corners
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)

    // Define corners relative to center
    const corners = [
      { dx: -halfScale, dy: -halfScale }, // top-left
      { dx: halfScale, dy: -halfScale }, // top-right
      { dx: -halfScale, dy: halfScale }, // bottom-left
      { dx: halfScale, dy: halfScale }, // bottom-right
    ]

    // Apply rotation to each corner
    const rotated = corners.map((corner) => ({
      x: x + corner.dx * cos - corner.dy * sin,
      y: y + corner.dx * sin + corner.dy * cos,
    }))

    // Spawn with rotated transform
    this.spawnEffect(
      effectName,
      rotated[0].x,
      rotated[0].y, // x1, y1
      rotated[1].x,
      rotated[1].y, // x2, y2
      rotated[2].x,
      rotated[2].y, // x3, y3
      rotated[3].x,
      rotated[3].y, // x4, y4
    )
  }

  /**
   * Spawn a particle effect with simple scale (no rotation)
   * @param effectName Name of the effect from particle data
   * @param x Center X position
   * @param y Center Y position
   * @param scale Scale multiplier (default 1.0)
   */
  spawnEffectSimple(
    effectName: string,
    x: number,
    y: number,
    scale: number = 1.0,
  ): void {
    const halfScale = scale / 2
    this.spawnEffect(
      effectName,
      x - halfScale,
      y - halfScale, // x1, y1
      x + halfScale,
      y - halfScale, // x2, y2
      x - halfScale,
      y + halfScale, // x3, y3
      x + halfScale,
      y + halfScale, // x4, y4
    )
  }

  private applyTransform(
    transform: ParticleEffect['transform'],
    input: {
      x1: number
      y1: number
      x2: number
      y2: number
      x3: number
      y3: number
      x4: number
      y4: number
      randomValues: number[]
    },
  ) {
    const transformInput: Record<string, number> = {
      c: 1,
      x1: input.x1,
      y1: input.y1,
      x2: input.x2,
      y2: input.y2,
      x3: input.x3,
      y3: input.y3,
      x4: input.x4,
      y4: input.y4,
      r1: input.randomValues[0],
      r2: input.randomValues[1],
      r3: input.randomValues[2],
      r4: input.randomValues[3],
      r5: input.randomValues[4],
      r6: input.randomValues[5],
      r7: input.randomValues[6],
      r8: input.randomValues[7],
      sinr1: Math.sin(2 * Math.PI * input.randomValues[0]),
      sinr2: Math.sin(2 * Math.PI * input.randomValues[1]),
      sinr3: Math.sin(2 * Math.PI * input.randomValues[2]),
      sinr4: Math.sin(2 * Math.PI * input.randomValues[3]),
      sinr5: Math.sin(2 * Math.PI * input.randomValues[4]),
      sinr6: Math.sin(2 * Math.PI * input.randomValues[5]),
      sinr7: Math.sin(2 * Math.PI * input.randomValues[6]),
      sinr8: Math.sin(2 * Math.PI * input.randomValues[7]),
      cosr1: Math.cos(2 * Math.PI * input.randomValues[0]),
      cosr2: Math.cos(2 * Math.PI * input.randomValues[1]),
      cosr3: Math.cos(2 * Math.PI * input.randomValues[2]),
      cosr4: Math.cos(2 * Math.PI * input.randomValues[3]),
      cosr5: Math.cos(2 * Math.PI * input.randomValues[4]),
      cosr6: Math.cos(2 * Math.PI * input.randomValues[5]),
      cosr7: Math.cos(2 * Math.PI * input.randomValues[6]),
      cosr8: Math.cos(2 * Math.PI * input.randomValues[7]),
    }

    const computeOutput = (expression: Record<string, number>) => {
      let result = 0
      for (const [key, coeff] of Object.entries(expression)) {
        result += (transformInput[key] || 0) * coeff
      }
      return result
    }

    return {
      x1: computeOutput(transform.x1),
      y1: computeOutput(transform.y1),
      x2: computeOutput(transform.x2),
      y2: computeOutput(transform.y2),
      x3: computeOutput(transform.x3),
      y3: computeOutput(transform.y3),
      x4: computeOutput(transform.x4),
      y4: computeOutput(transform.y4),
    }
  }

  private evaluatePropertyExpression(
    expr: PropertyExpression,
    progress: number,
    randomValues: number[],
  ): number {
    const input: Record<string, number> = {
      c: 1,
      r1: randomValues[0],
      r2: randomValues[1],
      r3: randomValues[2],
      r4: randomValues[3],
      r5: randomValues[4],
      r6: randomValues[5],
      r7: randomValues[6],
      r8: randomValues[7],
      sinr1: Math.sin(2 * Math.PI * randomValues[0]),
      sinr2: Math.sin(2 * Math.PI * randomValues[1]),
      sinr3: Math.sin(2 * Math.PI * randomValues[2]),
      sinr4: Math.sin(2 * Math.PI * randomValues[3]),
      sinr5: Math.sin(2 * Math.PI * randomValues[4]),
      sinr6: Math.sin(2 * Math.PI * randomValues[5]),
      sinr7: Math.sin(2 * Math.PI * randomValues[6]),
      sinr8: Math.sin(2 * Math.PI * randomValues[7]),
      cosr1: Math.cos(2 * Math.PI * randomValues[0]),
      cosr2: Math.cos(2 * Math.PI * randomValues[1]),
      cosr3: Math.cos(2 * Math.PI * randomValues[2]),
      cosr4: Math.cos(2 * Math.PI * randomValues[3]),
      cosr5: Math.cos(2 * Math.PI * randomValues[4]),
      cosr6: Math.cos(2 * Math.PI * randomValues[5]),
      cosr7: Math.cos(2 * Math.PI * randomValues[6]),
      cosr8: Math.cos(2 * Math.PI * randomValues[7]),
    }

    const computeValue = (coeffs: Record<string, number>) => {
      let result = 0
      for (const [key, coeff] of Object.entries(coeffs)) {
        result += (input[key] || 0) * coeff
      }
      return result
    }

    const fromValue = expr.from ? computeValue(expr.from) : 0
    const toValue = expr.to ? computeValue(expr.to) : 0

    if (!expr.ease) {
      return expr.from ? fromValue : toValue
    }

    const easingFunc =
      easingFunctions[expr.ease as EasingType] || easingFunctions.linear
    const t = easingFunc(progress)

    return fromValue + (toValue - fromValue) * t
  }

  render(): void {
    const currentTime = performance.now() / 1000
    const gl = this.gl

    if (!this.shaderProgram || !this.texture) return

    // Remove expired particles (keep particles that haven't started yet and active particles)
    // For looping particles, restart them when they finish
    this.activeParticles = this.activeParticles.filter((p) => {
      const isExpired = currentTime >= p.startTime + p.duration

      if (isExpired && p.looping && p.originalDuration) {
        // Restart the looping particle with original start offset
        p.startTime = currentTime + (p.originalStartOffset || 0)
        p.duration = p.originalDuration
        return true
      }

      return !isExpired || currentTime < p.startTime
    })

    // If no particles, don't change any GL state
    if (this.activeParticles.length === 0) return

    gl.useProgram(this.shaderProgram)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)

    // Save current blend state
    const blendEnabled = gl.isEnabled(gl.BLEND)
    const blendSrc = gl.getParameter(gl.BLEND_SRC_ALPHA)
    const blendDst = gl.getParameter(gl.BLEND_DST_ALPHA)

    // Enable additive blending for particles
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE)

    gl.uniform2f(this.resolutionLocation, gl.canvas.width, gl.canvas.height)
    gl.uniform1i(this.textureLocation, 0)

    // Render each active particle
    for (const particle of this.activeParticles) {
      if (currentTime < particle.startTime) continue

      const progress = Math.min(
        1,
        (currentTime - particle.startTime) / particle.duration,
      )

      const effect = this.particleData.effects.find(
        (e: ParticleEffect) => e.name === particle.effectName,
      )
      if (!effect) continue

      const group = effect.groups[particle.groupIndex]
      if (!group) continue

      const particleDef = group.particles[particle.particleIndex]
      if (!particleDef) continue

      const sprite = this.particleData.sprites[particle.sprite] as Sprite
      if (!sprite) continue

      // Update spawn transform if callback is provided (for dynamic particles)
      if (particle.updateTransform) {
        particle.spawnTransform = particle.updateTransform()
      }

      // Evaluate properties
      const x = this.evaluatePropertyExpression(
        particleDef.x,
        progress,
        particle.randomValues,
      )
      const y = this.evaluatePropertyExpression(
        particleDef.y,
        progress,
        particle.randomValues,
      )
      const w = this.evaluatePropertyExpression(
        particleDef.w,
        progress,
        particle.randomValues,
      )
      const h = this.evaluatePropertyExpression(
        particleDef.h,
        progress,
        particle.randomValues,
      )
      const r = this.evaluatePropertyExpression(
        particleDef.r,
        progress,
        particle.randomValues,
      )
      const a = this.evaluatePropertyExpression(
        particleDef.a,
        progress,
        particle.randomValues,
      )

      // Calculate the 4 corners of the particle in particle space
      // Apply rotation first, then map through spawn transform
      const cos = Math.cos(r)
      const sin = Math.sin(r)
      const hw = w / 2
      const hh = h / 2

      // Particle's 4 corners after rotation (relative to particle center)
      // Using rotation matrix: (x', y') = (x*cos - y*sin, x*sin + y*cos)
      const corners = [
        { dx: -hw * cos - hh * sin, dy: -hw * sin + hh * cos }, // top-left (-hw, hh)
        { dx: hw * cos - hh * sin, dy: hw * sin + hh * cos }, // top-right (hw, hh)
        { dx: -hw * cos + hh * sin, dy: -hw * sin - hh * cos }, // bottom-left (-hw, -hh)
        { dx: hw * cos + hh * sin, dy: hw * sin - hh * cos }, // bottom-right (hw, -hh)
      ]

      // Map each corner through the spawn transform using bilinear interpolation
      // Particle coordinates (x, y) are centered around 0, normalize to [0,1]
      const { x1, y1, x2, y2, x3, y3, x4, y4 } = particle.spawnTransform

      // Helper function to map a point in particle space to screen space
      const mapToScreen = (px: number, py: number) => {
        const u = px + 0.5
        const v = 0.5 - py // Particle y-up to screen v where v=0 is top, v=1 is bottom

        // Bilinear interpolation: TL, TR, BL, BR
        const sx =
          x1 * (1 - u) * (1 - v) + // top-left
          x2 * u * (1 - v) + // top-right
          x3 * (1 - u) * v + // bottom-left
          x4 * u * v // bottom-right

        const sy =
          y1 * (1 - u) * (1 - v) + // top-left
          y2 * u * (1 - v) + // top-right
          y3 * (1 - u) * v + // bottom-left
          y4 * u * v // bottom-right

        return { x: sx, y: sy }
      }

      // Map all 4 corners to screen space
      const screenCorners = corners.map((c) => mapToScreen(x + c.dx, y + c.dy))

      // Render the particle sprite as a quad
      this.drawSpriteQuad(
        sprite,
        screenCorners[0].x,
        screenCorners[0].y, // top-left
        screenCorners[1].x,
        screenCorners[1].y, // top-right
        screenCorners[2].x,
        screenCorners[2].y, // bottom-left
        screenCorners[3].x,
        screenCorners[3].y, // bottom-right
        particle.color,
        a,
      )
    }

    // Restore previous blend state
    if (blendEnabled) {
      gl.enable(gl.BLEND)
      gl.blendFunc(blendSrc, blendDst)
    } else {
      gl.disable(gl.BLEND)
    }

    // Clean up - disable vertex attrib arrays
    gl.disableVertexAttribArray(this.positionLocation)
    gl.disableVertexAttribArray(this.texCoordLocation)
  }

  private drawSpriteQuad(
    sprite: Sprite,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
    color: string,
    alpha: number,
  ): void {
    const gl = this.gl

    // Parse color
    const colorRgb = this.parseColor(color)

    // Vertices for the quad (4 corners)
    const vertices = new Float32Array([
      x1,
      y1, // top-left
      x2,
      y2, // top-right
      x3,
      y3, // bottom-left
      x4,
      y4, // bottom-right
    ])

    // Texture coordinates
    const u1 = sprite.x / this.particleData.width
    const v1 = sprite.y / this.particleData.height
    const u2 = (sprite.x + sprite.w) / this.particleData.width
    const v2 = (sprite.y + sprite.h) / this.particleData.height

    const texCoords = new Float32Array([u1, v1, u2, v1, u1, v2, u2, v2])

    // Set buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(this.positionLocation)
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(this.texCoordLocation)
    gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0)

    // Set uniforms
    gl.uniform4f(
      this.colorLocation,
      colorRgb.r,
      colorRgb.g,
      colorRgb.b,
      colorRgb.a,
    )
    gl.uniform1f(this.alphaLocation, alpha)

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  private parseColor(color: string): {
    r: number
    g: number
    b: number
    a: number
  } {
    // Support hex colors like #fff or #ffffff
    if (color.startsWith('#')) {
      const hex = color.substring(1)
      if (hex.length === 3) {
        return {
          r: parseInt(hex[0] + hex[0], 16) / 255,
          g: parseInt(hex[1] + hex[1], 16) / 255,
          b: parseInt(hex[2] + hex[2], 16) / 255,
          a: 1,
        }
      } else if (hex.length === 6) {
        return {
          r: parseInt(hex.substring(0, 2), 16) / 255,
          g: parseInt(hex.substring(2, 4), 16) / 255,
          b: parseInt(hex.substring(4, 6), 16) / 255,
          a: 1,
        }
      } else if (hex.length === 8) {
        return {
          r: parseInt(hex.substring(0, 2), 16) / 255,
          g: parseInt(hex.substring(2, 4), 16) / 255,
          b: parseInt(hex.substring(4, 6), 16) / 255,
          a: parseInt(hex.substring(6, 8), 16) / 255,
        }
      }
    }
    return { r: 1, g: 1, b: 1, a: 1 }
  }

  clearParticles(): void {
    this.activeParticles = []
  }

  stopLoopingParticles(loopId: string): void {
    this.activeParticles = this.activeParticles.filter(
      (p) => !p.looping || p.loopId !== loopId,
    )
  }

  getActiveParticleCount(): number {
    return this.activeParticles.length
  }
}
