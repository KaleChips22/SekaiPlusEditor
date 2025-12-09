export type USC = {
  offset: number
  objects: USCObject[]
}

export type USCObject =
  | USCBpmChange
  | USCTimeScaleChange
  | USCEvent
  | USCSingleNote
  | USCHiddenNote
  | USCDamageNote
  | USCTickNote
  | USCSlideNote
  | USCGuideNote

export type USCBpmChange = {
  type: 'bpm'
  beat: number
  bpm: number
}

export type USCTimeScaleChange = {
  type: 'timeScaleGroup'
  changes: {
    beat: number
    timeScale: number
    timeSkip: number
    ease?: 'linear'
    hideNotes: boolean
  }[]
}

type BaseUSCNote = {
  beat: number
  lane: number
  size: number
  timeScaleGroup: number
}

export type USCSingleNote = BaseUSCNote & {
  type: 'single'
  direction?:
    | 'upLeft'
    | 'up'
    | 'upRight'
    | 'downLeft'
    | 'down'
    | 'downRight'
    | 'none'
  critical: boolean
  trace: boolean
  dummy: boolean
}

export type USCHiddenNote = BaseUSCNote & {
  type: 'hidden'
}

export type USCDamageNote = BaseUSCNote & {
  type: 'damage'
}

export type USCTickNote = BaseUSCNote & {
  type: 'tick'
  critical: boolean
}

export type USCConnectionNote = (
  | USCSingleNote
  | USCHiddenNote
  | USCDamageNote
  | USCTickNote
) &
  (
    | {
        ease: 'out' | 'linear' | 'in' | 'inOut' | 'outIn' | 'none'
      }
    | ({
        attach: true
      } & {
        guideAlpha?: number
      })
  )

export type USCSlideNote = {
  type: 'slide'
  critical: boolean
  dummy: boolean
  continuous?: boolean
  connections: USCConnectionNote[]
}

export type USCGuideNote = {
  type: 'guide'
  color: USCColor
  fade: USCFade
  continuous?: boolean
  connections: USCConnectionNote[]
}

export type USCEvent = {
  type: 'skill' | 'feverChance' | 'feverStart'
  beat: number
}

export const USCFade = {
  in: 2,
  out: 0,
  none: 1,
  custom: 3,
}
export type USCFade = keyof typeof USCFade
export const USCColor = {
  neutral: 0,
  red: 1,
  green: 2,
  blue: 3,
  yellow: 4,
  purple: 5,
  cyan: 6,
  black: 7,
}
export type USCColor = keyof typeof USCColor
