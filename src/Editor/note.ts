export interface Note {
  beat: number
  lane: number
  size: number

  type: string
}

export enum FlickDirection {
  Default,
  Left,
  Right,
  None,
}

export enum EasingType {
  Linear,
  EaseIn,
  EaseOut,
}

export enum TickType {
  Normal,
  Hidden,
  Skip,
}

export interface TapNote extends Note {
  type: 'Tap'

  beat: number
  lane: number
  size: number

  isGold: boolean
  isTrace: boolean
  flickDir: FlickDirection
}

export interface HoldStart extends Note {
  type: 'HoldStart'

  beat: number
  lane: number
  size: number

  isGold: boolean
  isTrace: boolean
  isHidden: boolean
  isGuide: boolean
  easingType: EasingType

  nextNode: HoldEnd | HoldTick
}

export interface HoldEnd extends Note {
  type: 'HoldEnd'

  beat: number
  lane: number
  size: number

  isGold: boolean
  isTrace: boolean
  isHidden: boolean
  flickDir: FlickDirection

  prevNode: HoldStart | HoldTick
}

export interface HoldTick extends Note {
  type: 'HoldTick'

  beat: number
  lane: number
  size: number

  isGold: boolean
  isGuide: boolean

  tickType: TickType
  easingType: EasingType

  nextNode: HoldEnd | HoldTick
  prevNode: HoldStart | HoldTick
}

export interface BPMChange extends Note {
  type: 'BPMChange'
  size: 0
  lane: 0
  beat: number
  BPM: number
}

export interface HiSpeed extends Note {
  type: 'HiSpeed'
  size: 0
  lane: 0
  beat: number
  speed: number
}

export interface TimeSignature extends Note {
  type: 'TimeSignature'
  size: 0
  lane: 0
  beat: number
  top: number
  bottom: number
}
