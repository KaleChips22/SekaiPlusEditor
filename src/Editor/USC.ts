import {
  BPMChange,
  EasingType,
  FlickDirection,
  HiSpeed,
  HoldEnd,
  HoldStart,
  HoldTick,
  Note,
  TapNote,
  TickType,
} from './note'

export const notesToUSC = (notes: Note[], offset: number) => {
  const usc = {
    objects: [] as any[],
    offset,
  }

  const hiSpeedChanges: any[] = []

  notes.forEach((note) => {
    if (note.type === 'Tap') {
      const n = note as TapNote

      usc.objects.push({
        beat: n.beat,
        critical: n.isGold,
        lane: n.lane * 2,
        size: n.size,
        timeScaleGroup: 0,
        trace: n.isTrace,
        type: 'single',
        ...(n.flickDir !== FlickDirection.None
          ? {
              direction:
                n.flickDir === FlickDirection.Default
                  ? 'up'
                  : n.flickDir === FlickDirection.Left
                    ? 'left'
                    : 'right',
            }
          : {}),
      })
    } else if (note.type === 'BPMChange') {
      const n = note as BPMChange

      usc.objects.push({
        type: 'bpm',
        beat: n.beat,
        bpm: n.BPM,
      })
    } else if (note.type === 'HiSpeed') {
      const n = note as HiSpeed

      hiSpeedChanges.push({
        beat: n.beat,
        timeScale: n.speed,
      })
    } else if (note.type === 'HoldStart') {
      const hs = note as HoldStart

      const connections: any[] = []

      let n: HoldStart | HoldTick | HoldEnd = hs
      while ('nextNode' in n) {
        let ease = 'linear'
        switch (n.easingType) {
          case EasingType.EaseIn:
            ease = 'in'
            break
          case EasingType.EaseOut:
            ease = 'out'
            break
          case EasingType.EaseInOut:
            ease = 'inout'
            break
          case EasingType.EaseOutIn:
            ease = 'outin'
            break
          case EasingType.Linear:
          default:
            ease = 'linear'
            break
        }

        connections.push({
          ...(hs.isGuide
            ? {}
            : {
                type:
                  n.type === 'HoldStart'
                    ? 'start'
                    : n.tickType === TickType.Skip
                      ? 'attach'
                      : 'tick',
              }),
          beat: n.beat,
          ease,
          lane: n.lane * 2,
          size: n.size,
          timeScaleGroup: 0,
          ...(n.type === 'HoldStart' || n.tickType !== TickType.Hidden
            ? { critical: n.isGold }
            : {}),
          ...(n.type === 'HoldStart'
            ? {
                judgeType: n.isHidden ? 'none' : n.isTrace ? 'trace' : 'normal',
              }
            : {}),
        })

        n = n.nextNode
      }

      n = n as HoldEnd

      connections.push({
        type: 'end',
        beat: n.beat,
        lane: n.lane * 2,
        size: n.size,
        timeScaleGroup: 0,
        critical: n.isGold,
        judgeType: n.isHidden ? 'none' : n.isTrace ? 'trace' : 'normal',
        ...(n.flickDir !== FlickDirection.None
          ? {
              direction:
                n.flickDir === FlickDirection.Right
                  ? 'right'
                  : n.flickDir === FlickDirection.Left
                    ? 'left'
                    : 'up',
            }
          : {}),
      })

      usc.objects.push({
        type: hs.isGuide ? 'guide' : 'slide',
        // critical: hs.isGold,
        ...(hs.isGuide
          ? {
              color: hs.isGold ? 'yellow' : 'green',
            }
          : {
              critical: hs.isGold,
            }),
        [hs.isGuide ? 'midpoints' : 'connections']: connections,
      })
    }
  })

  usc.objects.push({
    type: 'timeScaleGroup',
    changes: hiSpeedChanges,
  })

  return { usc, version: 2 }
}

export const USCToNotes = (data: {
  usc: { objects: any[]; offset: number }
  version: number
}) => {
  const notes = [] as Note[]

  const { offset, objects } = data.usc

  objects.forEach((o) => {
    if (!('type' in o)) return

    if (o.type === 'single') {
      let flickDir = FlickDirection.None
      if ('direction' in o) {
        if (o.direction === 'left') flickDir = FlickDirection.Left
        else if (o.direction === 'right') flickDir = FlickDirection.Right
        else flickDir = FlickDirection.Default
      }
      const n = {
        type: 'Tap',
        beat: o.beat,
        isGold: o.critical,
        lane: o.lane / 2,
        size: o.size,
        isTrace: o.trace,
        flickDir,
      } as TapNote

      notes.push(n)
    } else if (o.type === 'bpm') {
      const n = {
        type: 'BPMChange',
        beat: o.beat,
        BPM: o.bpm,
        lane: 0,
        size: 0,
      } as BPMChange

      notes.push(n)
    } else if (o.type === 'timeScaleGroup') {
      if (!('changes' in o)) return
      o.changes.forEach((c: any) => {
        const n = {
          type: 'HiSpeed',
          lane: 0,
          size: 0,
          beat: c.beat,
          speed: c.timeScale,
        } as HiSpeed

        notes.push(n)
      })
    } else if (o.type === 'slide' || o.type === 'guide') {
      if (!('connections' in o || 'midpoints' in o)) return
      const connections = o[
        'connections' in o ? 'connections' : 'midpoints'
      ].sort((a: any, b: any) => a.beat - b.beat) as any[]

      const holdNotes = [] as Note[]

      connections.forEach((c, i) => {
        if (i === 0) {
          let easingType = EasingType.Linear
          switch (c.ease) {
            case 'in':
              easingType = EasingType.EaseIn
              break
            case 'out':
              easingType = EasingType.EaseOut
              break
            case 'inout':
              easingType = EasingType.EaseInOut
              break
            case 'outin':
              easingType = EasingType.EaseOutIn
              break
            case 'linear':
            default:
              easingType = EasingType.Linear
              break
          }

          const n = {
            type: 'HoldStart',
            size: c.size,
            lane: c.lane / 2,
            beat: c.beat,
            isGold: o.type === 'guide' ? o.color === 'yellow' : o.critical,
            isGuide: o.type === 'guide',
            isHidden: o.type === 'guide' ? true : c.judgeType === 'none',
            isTrace: o.type === 'guide' ? false : c.judgeType === 'trace',
            easingType,
          } as HoldStart

          holdNotes.push(n)
        } else if (i === connections.length - 1) {
          let flickDir = FlickDirection.None
          if ('direction' in c) {
            if (c.direction === 'left') flickDir = FlickDirection.Left
            else if (c.direction === 'right') flickDir = FlickDirection.Right
            else flickDir = FlickDirection.Default
          }

          const n = {
            type: 'HoldEnd',
            size: c.size,
            lane: c.lane / 2,
            beat: c.beat,
            isGold:
              o.type === 'guide'
                ? o.color === 'yellow'
                : 'critical' in c
                  ? c.critical
                  : o.critical,
            isHidden: o.type === 'guide' ? true : c.judgeType === 'none',
            isTrace: o.type === 'guide' ? false : c.judgeType === 'trace',
            flickDir,
          } as HoldEnd

          n.prevNode = holdNotes[i - 1] as HoldStart | HoldTick
          n.prevNode.nextNode = n

          holdNotes.push(n)
        } else {
          let easingType = EasingType.Linear
          if (c.ease === 'out') easingType = EasingType.EaseOut
          else if (c.ease === 'in') easingType = EasingType.EaseIn

          let tickType = TickType.Hidden
          if (c.type === 'attach') tickType = TickType.Skip
          else if ('critical' in c) tickType = TickType.Normal

          const n = {
            type: 'HoldTick',
            size: c.size,
            lane: c.lane / 2,
            beat: c.beat,
            isGold: o.type === 'guide' ? o.color === 'yellow' : o.critical,
            isGuide: o.type === 'guide',
            easingType,
            tickType,
          } as HoldTick

          n.prevNode = holdNotes[i - 1] as HoldStart | HoldTick
          n.prevNode.nextNode = n

          holdNotes.push(n)
        }
      })

      notes.push(...holdNotes)
    }
  })

  return { notes, offset }
}
