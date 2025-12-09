import {
  BPMChange,
  EasingType,
  FlickDirection,
  HiSpeed,
  HiSpeedLayer,
  HoldEnd,
  HoldStart,
  HoldTick,
  Note,
  TapNote,
  TickType,
} from './note'

export const notesToUSC = (
  layers: HiSpeedLayer[],
  notes: Note[],
  offset: number,
) => {
  const usc = {
    objects: [] as any[],
    offset,
  }

  const hiSpeedChanges: USCTimeScaleChange[] = []
  const layersMap = new Map<HiSpeedLayer, number>()

  layers.forEach((l, i) => {
    const uscLayer: USCTimeScaleChange = {
      type: 'timeScaleGroup',
      changes: [],
    }

    layersMap.set(l, i)

    notes
      .filter((n) => n.type === 'HiSpeed' && (n as HiSpeed).layer === l)
      .forEach((n) => {
        const hiSpeed = n as HiSpeed

        uscLayer.changes.push({
          beat: hiSpeed.beat,
          timeScale: hiSpeed.speed,
          hideNotes: false,
          timeSkip: 0,
        })
      })

    hiSpeedChanges.push(uscLayer)
  })

  notes.forEach((note) => {
    if (note.type === 'Tap') {
      const n = note as TapNote

      usc.objects.push({
        beat: n.beat,
        critical: n.isGold,
        lane: n.lane * 2,
        size: n.size,
        timeScaleGroup: layersMap.get(n.layer) || 0,
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
          timeScaleGroup: layersMap.get(n.layer),
          ...(n.type === 'HoldStart' || n.tickType !== TickType.Hidden
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

      n = n as HoldEnd

      connections.push({
        type: 'end',
        beat: n.beat,
        lane: n.lane * 2,
        size: n.size,
        timeScaleGroup: layersMap.get(n.layer),
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
        type: hs.isGuide ? 'guide' : 'slide',
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

  usc.objects.push(...hiSpeedChanges)

  return { usc, version: 2 }
}

export const USCToNotes = (data: {
  usc: { objects: any[]; offset: number }
  version: number
}) => {
  const notes = [] as Note[]

  const { offset, objects } = data.usc

  const hiSpeedLayers: HiSpeedLayer[] = []
  const hiSpeedLayerMap = new Map<number, HiSpeedLayer>()

  objects
    .filter((o) => o.type === 'timeScaleGroup')
    .forEach((t, i) => {
      const layer: HiSpeedLayer = {
        name: i.toString(),
      }
      hiSpeedLayers.push(layer)
      hiSpeedLayerMap.set(i, layer)

      t.changes.forEach((c) => {
        const hiSpeed: HiSpeed = {
          type: 'HiSpeed',
          beat: c.beat,
          lane: 0,
          size: 0,
          speed: c.timeScale,
          layer,
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
          layer: hiSpeedLayerMap.get(o.timeScaleGroup),
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
              layer: hiSpeedLayerMap.get(c.timeScaleGroup),
            } as HoldStart

            holdNotes.push(n)
          } else if (i === connections.length - 1) {
            let flickDir = FlickDirection.None
            if (c.type === 'single') {
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
              layer: hiSpeedLayerMap.get(c.timeScaleGroup),
            } as HoldEnd

            n.prevNode = holdNotes[i - 1] as HoldStart | HoldTick
            n.prevNode.nextNode = n

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

            const n = {
              type: 'HoldTick',
              size: c.size,
              lane: c.lane / 2,
              beat: c.beat,
              isGold: o.type === 'guide' ? o.color === 'yellow' : o.critical,
              isGuide: o.type === 'guide',
              easingType,
              tickType,
              layer: hiSpeedLayerMap.get(c.timeScaleGroup),
            } as HoldTick

            n.prevNode = holdNotes[i - 1] as HoldStart | HoldTick
            n.prevNode.nextNode = n

            holdNotes.push(n)
          }
        })

        notes.push(...holdNotes)
      }
    })

  return { notes, offset, hiSpeedLayers }
}
