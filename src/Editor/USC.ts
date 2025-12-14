import { EasingType, FlickDirection, Note, TickType } from './note'

export const notesToUSC = (notes: Note[], offset: number) => {
  const usc = {
    objects: [] as any[],
    offset,
  }

  const hiSpeedChanges: any[] = []

  const uscLayer = {
    type: 'timeScaleGroup',
    changes: [] as any[],
  }

  notes
    .filter((n) => n.type === 'HiSpeed')
    .forEach((n) => {
      const hiSpeed = n as Note & { type: 'HiSpeed' }

      uscLayer.changes.push({
        beat: hiSpeed.beat,
        timeScale: hiSpeed.speed,
      })
    })

  usc.objects.push(uscLayer)

  notes.forEach((note) => {
    if (note.type === 'Tap') {
      usc.objects.push({
        beat: note.beat,
        critical: note.isGold,
        lane: note.lane * 2,
        size: note.size,
        timeScaleGroup: 0,
        trace: note.isTrace,
        type: 'single',
        ...(note.flickDir !== FlickDirection.None
          ? {
              direction:
                note.flickDir === FlickDirection.Default
                  ? 'up'
                  : note.flickDir === FlickDirection.Left
                    ? 'left'
                    : 'right',
            }
          : {}),
      })
    } else if (note.type === 'BPMChange') {
      usc.objects.push({
        type: 'bpm',
        beat: note.beat,
        bpm: note.BPM,
      })
    } else if (note.type === 'HoldStart') {
      const connections: any[] = []

      let n = note as Note & { type: 'HoldStart' | 'HoldEnd' | 'HoldTick' }
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
          ...(note.isGuide
            ? {}
            : {
                type:
                  n.type === 'HoldStart'
                    ? 'start'
                    : 'tickType' in n && n.tickType === TickType.Skip
                      ? 'attach'
                      : 'tick',
              }),
          beat: n.beat,
          ease,
          lane: n.lane * 2,
          size: n.size,
          timeScaleGroup: 0,
          ...(n.type === 'HoldStart' ||
          ('tickType' in n && n.tickType !== TickType.Hidden)
            ? { critical: n.isGold }
            : {}),
          ...(n.type === 'HoldStart'
            ? {
                judgeType: n.isHidden ? 'none' : n.isTrace ? 'trace' : 'normal',
              }
            : {}),
        })

        // connections.push(
        //   hs.isGuide
        //     ? n.type === 'HoldTick' &&
        //       (n as HoldTick).tickType === TickType.Skip
        //       ? {
        //           beat: n.beat,
        //           attach: true,
        //           lane: n.lane * 2,
        //           size: n.size,
        //           timeScaleGroup: layersMap.get(n.layer) || 0,
        //           type: 'hidden',
        //         }
        //       : {
        //           beat: n.beat,
        //           ease,
        //           lane: n.lane * 2,
        //           size: n.size,
        //           timeScaleGroup: layersMap.get(n.layer) || 0,
        //           type: 'hidden',
        //         }
        //     : n.type === 'HoldStart'
        //       ? (n as HoldStart).isHidden
        //         ? {
        //             type: 'hidden',
        //             beat: n.beat,
        //             ease,
        //             lane: n.lane * 2,
        //             size: n.size,
        //             timeScaleGroup: layersMap.get(n.layer) || 0,
        //           }
        //         : {
        //             type: 'single',
        //             beat: n.beat,
        //             ease,
        //             lane: n.lane * 2,
        //             size: n.size,
        //             timeScaleGroup: layersMap.get(n.layer) || 0,
        //             trace: n.isTrace,
        //             critical: n.isGold,
        //             dummy: false,
        //           }
        //       : (n as HoldTick).tickType === TickType.Hidden
        //         ? {
        //             type: 'hidden',
        //             beat: n.beat,
        //             ease,
        //             lane: n.lane * 2,
        //             size: n.size,
        //             timeScaleGroup: layersMap.get(n.layer) || 0,
        //           }
        //         : {
        //             type: 'tick',
        //             beat: n.beat,
        //             ease,
        //             lane: n.lane * 2,
        //             size: n.size,
        //             timeScaleGroup: layersMap.get(n.layer) || 0,
        //             critical: n.isGold,
        //             ...((n as HoldTick).tickType === TickType.Skip
        //               ? {
        //                   attach: true,
        //                 }
        //               : {}),
        //           },
        // )

        n = n.nextNode
      }

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

      // connections.push(
      //   hs.isGuide
      //     ? {
      //         type: 'hidden',
      //         beat: n.beat,
      //         lane: n.lane * 2,
      //         size: n.size,
      //         ease: 'none',
      //         timeScaleGroup: layersMap.get(n.layer) || 0,
      //       }
      //     : (n as HoldEnd).isHidden
      //       ? {
      //           type: 'hidden',
      //           beat: n.beat,
      //           lane: n.lane * 2,
      //           size: n.size,
      //           ease: 'none',
      //           timeScaleGroup: layersMap.get(n.layer) || 0,
      //         }
      //       : {
      //           type: 'single',
      //           beat: n.beat,
      //           lane: n.lane * 2,
      //           size: n.size,
      //           ease: 'none',
      //           timeScaleGroup: layersMap.get(n.layer) || 0,
      //           critical: n.isGold,
      //           trace: n.isTrace,
      //           dummy: false,
      //           direction:
      //             n.flickDir === FlickDirection.Right
      //               ? 'upRight'
      //               : n.flickDir === FlickDirection.Left
      //                 ? 'upLeft'
      //                 : 'up',
      //         },
      // )

      // usc.objects.push(
      //   // critical: hs.isGold,
      //   hs.isGuide
      //     ? {
      //         type: 'guide',
      //         color: hs.isGold ? 'yellow' : 'green',
      //         fade: 'out',
      //         connections,
      //       }
      //     : {
      //         type: 'slide',
      //         critical: hs.isGold,
      //         connections,
      //         dummy: false,
      //       },
      // )

      usc.objects.push({
        type: note.isGuide ? 'guide' : 'slide',
        ...(note.isGuide
          ? {
              color: note.isGold ? 'yellow' : 'green',
            }
          : {
              critical: note.isGold,
            }),
        [note.isGuide ? 'midpoints' : 'connections']: connections,
      })
    }
  })

  usc.objects.push(...hiSpeedChanges)

  return { usc, version: 2 }
}

export const USCToNotes = (data: {
  usc: { objects: any[]; offset: number }
  version: number
}) => {
  const notes = [] as Note[]

  const { offset, objects } = data.usc

  objects
    .filter((o) => o.type === 'timeScaleGroup')
    .forEach((t) => {
      t.changes.forEach((c: { beat: number; timeScale: number }) => {
        const hiSpeed: Note = {
          type: 'HiSpeed',
          beat: c.beat,
          speed: c.timeScale,
          isEvent: true,
        }

        notes.push(hiSpeed)
      })
    })

  objects
    .filter((o) => o.type !== 'timeScaleGroup')
    .forEach((o) => {
      if (!('type' in o)) return

      if (o.type === 'single') {
        let flickDir = FlickDirection.None
        if ('direction' in o) {
          if (o.direction === 'left') flickDir = FlickDirection.Left
          else if (o.direction === 'right') flickDir = FlickDirection.Right
          else if (o.direction === 'up') flickDir = FlickDirection.Default
        }
        const n: Note = {
          type: 'Tap',
          beat: o.beat,
          isGold: o.critical,
          lane: o.lane / 2,
          size: o.size,
          isTrace: o.trace,
          flickDir,
        }

        notes.push(n)
      } else if (o.type === 'bpm') {
        const n: Note = {
          type: 'BPMChange',
          beat: o.beat,
          BPM: o.bpm,
          isEvent: true,
        }

        notes.push(n)
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

            const n: Note = {
              type: 'HoldStart',
              size: c.size,
              lane: c.lane / 2,
              beat: c.beat,
              isGold: o.type === 'guide' ? o.color === 'yellow' : o.critical,
              isGuide: o.type === 'guide',
              isHidden: o.type === 'guide' ? true : c.judgeType === 'none',
              isTrace: o.type === 'guide' ? false : c.judgeType === 'trace',
              easingType,
              nextNode: {} as any,
            }

            holdNotes.push(n)
          } else if (i === connections.length - 1) {
            let flickDir = FlickDirection.None
            if (c.type === 'end') {
              if (c.direction === 'left') flickDir = FlickDirection.Left
              else if (c.direction === 'right') flickDir = FlickDirection.Right
              else if (c.direction === 'up') flickDir = FlickDirection.Default
            }

            const n: Note = {
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
              prevNode: {} as any,
              flickDir,
            }

            ;(n as any).prevNode = holdNotes[i - 1]
            ;(n as any).prevNode.nextNode = n

            holdNotes.push(n)
          } else {
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

            let tickType = TickType.Hidden
            if (c.type === 'attach') tickType = TickType.Skip
            else if ('critical' in c) tickType = TickType.Normal

            const n: Note = {
              type: 'HoldTick',
              size: c.size,
              lane: c.lane / 2,
              beat: c.beat,
              isGold: o.type === 'guide' ? o.color === 'yellow' : o.critical,
              isGuide: o.type === 'guide',
              easingType,
              tickType,
              nextNode: {} as any,
              prevNode: {} as any,
            }

            ;(n as any).prevNode = holdNotes[i - 1]
            ;(n as any).prevNode.nextNode = n

            holdNotes.push(n)
          }
        })

        notes.push(...holdNotes)
      }
    })

  return { notes, offset }
}
