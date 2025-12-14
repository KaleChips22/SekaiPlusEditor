interface BaseNote {
  beat: number
  lane: number
  size: number
  type: string

  layer: HiSpeedLayer
  scaledHitTime?: number
}

interface BaseEvent {
  isEvent: true
  beat: number
  type: string
}

export type Note = SolidNote | SolidEvent

export type SolidNote = BaseNote & (TapNote | HoldStart | HoldEnd | HoldTick)
export type SolidEvent = BaseEvent & (BPMChange | HiSpeed | TimeSignature)

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
  EaseInOut,
  EaseOutIn,
}

export enum TickType {
  Normal,
  Hidden,
  Skip,
}

// export interface TapNote extends Note {
//   type: 'Tap'

//   beat: number
//   lane: number
//   size: number

//   layer: HiSpeedLayer

//   isGold: boolean
//   isTrace: boolean
//   flickDir: FlickDirection
// }

interface TapNote {
  type: 'Tap'
  layer: HiSpeedLayer
  isGold: boolean
  isTrace: boolean
  flickDir: FlickDirection
}

interface HoldStart {
  type: 'HoldStart'

  isGold: boolean
  isTrace: boolean
  isHidden: boolean
  isGuide: boolean
  easingType: EasingType

  nextNode: Note & { type: 'HoldTick' | 'HoldEnd' }

  holdStart?: Note & { type: 'HoldStart' }
  holdEnd?: Note & { type: 'HoldEnd' }
}

interface HoldEnd {
  type: 'HoldEnd'

  isGold: boolean
  isTrace: boolean
  isHidden: boolean
  flickDir: FlickDirection

  prevNode: Note & { type: 'HoldStart' | 'HoldTick' }

  holdStart?: Note & { type: 'HoldStart' }
  holdEnd?: Note & { type: 'HoldEnd' }
}

interface HoldTick {
  type: 'HoldTick'

  isGold: boolean
  isGuide: boolean

  tickType: TickType
  easingType: EasingType

  nextNode: Note & { type: 'HoldTick' | 'HoldEnd' }
  prevNode: Note & { type: 'HoldStart' | 'HoldTick' }

  holdStart?: Note & { type: 'HoldStart' }
  holdEnd?: Note & { type: 'HoldEnd' }
}

interface BPMChange {
  type: 'BPMChange'
  BPM: number
}

interface HiSpeed {
  type: 'HiSpeed'
  speed: number

  layer: HiSpeedLayer
}

interface TimeSignature {
  type: 'TimeSignature'
  top: number
  bottom: number
}

// interface FeverStart {
//   type: 'FeverStart'
// }

// interface FeverEnd {
//   type: 'FeverEnd'
// }

export interface HiSpeedLayer {
  name: string
}
