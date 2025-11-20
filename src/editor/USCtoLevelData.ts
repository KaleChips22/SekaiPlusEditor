const epsilon = 1e-6

const id = (() => {
  let currentId = 0
  const map = new Map<any, number>()

  return (object: any) => {
    if (!map.has(object)) map.set(object, ++currentId)
    return map.get(object)!
  }

  // return () => ++currentId
})()

function* pairwise(arr: any[]) {
  for (let i = 0; i < arr.length - 1; i++) {
    yield [arr[i], arr[i + 1]]
  }
}

class Entity {
  archetype: string
  data: Record<string, number | Entity>
  name: string

  constructor(archetype: string, data: Record<string, number | Entity>) {
    this.archetype = archetype
    this.data = data
    this.name = id(this).toString()
    // console.log(this.name)
  }

  export() {
    return {
      name: this.name,
      archetype: this.archetype,
      data: Object.entries(this.data).map(([k, v]) =>
        typeof v === 'number'
          ? {
              name: k,
              value: v,
            }
          : {
              name: k,
              ref: v.name,
            },
      ),
    }
  }

  getItem(item: string) {
    return this.data[item]
  }

  setItem(key: string, value: number | Entity) {
    this.data[key] = value
  }
}

const DIRECTIONS = {
  left: 1,
  up: 0,
  right: 2,
}

const CONNECTOR_EASES = {
  outin: 5,
  out: 3,
  linear: 1,
  in: 2,
  inout: 4,
}

const GUIDE_COLORS = {
  neutral: 101,
  red: 102,
  green: 103,
  blue: 104,
  yellow: 105,
  purple: 106,
  cyan: 107,
  black: 108,
}

export const USCtoLevelData = (usc: any) => {
  const entities: Entity[] = [new Entity('Initialization', {})]

  const bpmChanges: any[] = []
  const timescaleGroups: any[] = []
  const singleNotes: any[] = []
  const slideNotes: any[] = []
  const guideNotes: any[] = []

  const timescaleGroupEntities: Entity[] = []
  const simlineEligibleNotes: Entity[] = []

  for (const entry of usc.objects) {
    switch (entry.type) {
      case 'bpm':
        bpmChanges.push(entry)
        break
      case 'timeScaleGroup':
        timescaleGroups.push(entry)
        break
      case 'single':
        singleNotes.push(entry)
        break
      case 'slide':
        slideNotes.push(entry)
        break
      case 'guide':
        guideNotes.push(entry)
        break
    }
  }

  if (timescaleGroups.length === 0)
    timescaleGroups.push({
      type: 'timeScaleGroup',
      changes: [{ beat: 0, timesScale: 1 }],
    })
  if (bpmChanges.length === 0)
    bpmChanges.push({
      type: 'bpm',
      beat: 0,
      bpm: 160,
    })

  for (const bpm of bpmChanges)
    entities.push(
      new Entity('#BPM_CHANGE', {
        '#BEAT': bpm.beat,
        '#BPM': bpm.bpm,
      }),
    )

  for (const group of timescaleGroups) {
    const groupEntity = new Entity('#TIMESCALE_GROUP', {})
    entities.push(groupEntity)
    timescaleGroupEntities.push(groupEntity)

    let lastEntity: Entity | null = null

    for (const change of group.changes.sort(
      (a: any, b: any) => a.beat - b.beat,
    )) {
      const newEntity = new Entity('#TIMESCALE_CHANGE', {
        '#BEAT': change.beat,
        '#TIMESCALE': change.timeScale,
        '#TIMESCALE_GROUP': groupEntity,
        '#TIMESCALE_SKIP': 0,
        '#TIMESCALE_EASE': 0,
      })

      if (lastEntity === null) groupEntity.setItem('first', newEntity)
      else lastEntity.setItem('next', newEntity)

      lastEntity = newEntity

      entities.push(newEntity)
    }
  }

  for (const note of singleNotes) {
    const nameParts = []
    if (note.fake) nameParts.push('Fake')

    if (note.type === 'damage') nameParts.push('Damage')
    else {
      if (note.critical) nameParts.push('Critical')
      else nameParts.push('Normal')

      if ('direction' in note) {
        if (note.trace) nameParts.push('TraceFlick')
        else nameParts.push('Flick')
      } else {
        if (note.trace) nameParts.push('Trace')
        else nameParts.push('Tap')
      }
    }

    nameParts.push('Note')
    const name = nameParts.join('')

    const entity = new Entity(name, {
      '#BEAT': note.beat,
      '#TIMESCALE_GROUP': timescaleGroupEntities[note.timeScaleGroup || 0],
      lane: note.lane || 0,
      size: note.size || 1,
      direction:
        DIRECTIONS[(note.direction as 'left' | 'right' | 'up') ?? 'up'],
      isAttached: 0,
      connectorEase: 1,
      isSeparator: 0,
      segmentKind: note.critical ? 2 : 1,
      segmentAlpha: 1,
    })

    entities.push(entity)
    if (note.type !== 'damage') simlineEligibleNotes.push(entity)
  }

  for (const slide of slideNotes) {
    let prevJointEntity: Entity | null = null
    let prevNoteEntity: Entity | null = null
    let headNoteEntity: Entity | null = null

    const queuedAttachNotes: Entity[] = []
    const connectors: Entity[] = []

    const connections = slide.connections.sort(
      (a: any, b: any) => a.beat - b.beat,
    )

    let nextHiddenTickBeat = Math.floor(connections[0].beat * 2 + 1) / 2

    for (const note of connections) {
      let isSimLineEligible = false
      let isAttached = false
      let nameParts: string[] = []

      if (slide.fake) nameParts.push('Fake')

      switch (note.type) {
        case 'start': {
          if (note.judgeType === 'none') nameParts.push('Anchor')
          else {
            if (note.critical) nameParts.push('Critical')
            else nameParts.push('Normal')

            nameParts.push('Head')

            if (note.judgeType === 'trace') nameParts.push('Trace')
            else nameParts.push('Tap')

            isSimLineEligible = true
          }
          break
        }
        case 'end': {
          if (note.judgeType === 'none') nameParts.push('Anchor')
          else {
            if (note.critical) nameParts.push('Critical')
            else nameParts.push('Normal')

            nameParts.push('Tail')

            if ('direction' in note) {
              if (note.judgeType === 'trace') nameParts.push('TraceFlick')
              else nameParts.push('Flick')
            } else {
              if (note.judgeType === 'trace') nameParts.push('Trace')
              else nameParts.push('Release')
            }

            isSimLineEligible = true
          }
          break
        }
        case 'tick': {
          if ('critical' in note) {
            if (note.critical) nameParts.push('Critical')
            else nameParts.push('Normal')

            nameParts.push('Tick')
          } else nameParts.push('Anchor')

          break
        }
        case 'attach': {
          isAttached = true

          if ('critical' in note) {
            if (note.critical) nameParts.push('Critical')
            else nameParts.push('Normal')

            nameParts.push('Tick')
          } else nameParts = ['TransientHiddenTick']

          break
        }
      }

      nameParts.push('Note')
      const name = nameParts.join('')

      const entity = new Entity(name, {
        '#BEAT': note.beat,
        '#TIMESCALE_GROUP': timescaleGroupEntities[note.timeScaleGroup || 0],
        lane: note.lane || 0,
        size: note.size || 1,
        direction:
          DIRECTIONS[(note.direction as 'up' | 'left' | 'right') ?? 'up'],
        isAttached: isAttached ? 1 : 0,
        connectorEase:
          CONNECTOR_EASES[
            (note.ease as keyof typeof CONNECTOR_EASES) ?? 'linear'
          ],
        isSeparator: 0,
        segmentKind: slide.critical ? 2 : 1,
        segmentAlpha: 1,
      })

      entities.push(entity)

      if (isSimLineEligible) simlineEligibleNotes.push(entity)

      if (headNoteEntity === null) headNoteEntity = entity
      entity.setItem('activeHead', headNoteEntity)

      if (isAttached) queuedAttachNotes.push(entity)
      else {
        if (prevJointEntity === null) {
          // if (queuedAttachNotes.length === 0) throw new Error('uh oh.')
        } else {
          for (const attach of queuedAttachNotes) {
            attach.setItem('attachHead', prevJointEntity)
            attach.setItem('attachTail', entity)
          }

          queuedAttachNotes.splice(0)

          while (
            nextHiddenTickBeat + epsilon <
            (entity.getItem('#BEAT') as number)
          ) {
            const hiddenTick = new Entity('TransientHiddenTickNote', {
              '#BEAT': parseFloat(nextHiddenTickBeat.toFixed(9)),
              '#TIMESCALE_GROUP': timescaleGroupEntities[0],
              lane: entity.getItem('lane'),
              size: entity.getItem('size'),
              direction: 0,
              isAttached: 1,
              connectorEase: 1,
              isSeparator: 0,
              segmentKind: 1,
              segmentAlpha: 0,
              activeHead: headNoteEntity,
              attachHead: prevJointEntity,
              attachTail: entity,
            })

            entities.push(hiddenTick)
            nextHiddenTickBeat += 0.5
          }

          const connectorEntity = new Entity('Connector', {
            head: prevJointEntity,
            tail: entity,
          })
          entities.push(connectorEntity)
          connectors.push(connectorEntity)
        }
        prevJointEntity = entity
      }
      if (prevNoteEntity !== null) prevNoteEntity.setItem('next', entity)
      prevNoteEntity = entity
    }

    if (queuedAttachNotes.length > 0) throw new Error('Uh oh.')
    if (headNoteEntity === null) throw new Error('Uh oh.')
    if (prevJointEntity === null) throw new Error('Uh oh.')

    for (const connectorEntity of connectors) {
      connectorEntity.setItem('segmentHead', headNoteEntity)
      connectorEntity.setItem('segmentTail', prevJointEntity)
      connectorEntity.setItem('activeHead', headNoteEntity)
      connectorEntity.setItem('activeTail', prevJointEntity)
    }
  }

  for (const guide of guideNotes) {
    const connections = guide.midpoints.sort(
      (a: any, b: any) => a.beat - b.beat,
    )

    let prevNoteEntity: Entity | null = null
    let headNoteEntity: Entity | null = null
    const connectors = []

    for (const note of connections) {
      const entity = new Entity('AnchorNote', {
        '#BEAT': note.beat,
        '#TIMESCALE_GROUP': timescaleGroupEntities[note.timescaleGroup || 0],
        lane: note.lane || 0,
        size: note.size || 1,
        direction: 0,
        isAttached: 0,
        connectorEase:
          CONNECTOR_EASES[
            (note.ease as keyof typeof CONNECTOR_EASES) ?? 'linear'
          ],
        isSeparator: 0,
        segmentKind: GUIDE_COLORS[guide.color as keyof typeof GUIDE_COLORS],
        segmentAlpha: 1,
      })
      entities.push(entity)

      if (headNoteEntity === null) headNoteEntity = entity
      if (prevNoteEntity !== null) {
        const connectorEntity = new Entity('Connector', {
          head: prevNoteEntity,
          tail: entity,
        })
        entities.push(connectorEntity)
        connectors.push(connectorEntity)

        prevNoteEntity.setItem('next', entity)
      }
      prevNoteEntity = entity
    }

    if (headNoteEntity === null) throw new Error('Uh oh.')
    if (prevNoteEntity === null) throw new Error('Uh oh.')

    for (const connectorEntity of connectors) {
      connectorEntity.setItem('segmentHead', headNoteEntity)
      connectorEntity.setItem('segmentTail', prevNoteEntity)
      connectorEntity.setItem('activeHead', headNoteEntity)
      connectorEntity.setItem('activeTail', prevNoteEntity)
    }

    switch (guide.fade) {
      case 'in':
        headNoteEntity.setItem('segmentAlpha', 0)
        break
      case 'out':
        prevNoteEntity.setItem('segmentAlpha', 0)
        break
      case 'none':
        break
    }
  }

  const groups: Entity[][] = []
  let lastGroup: Entity[] = []

  for (const noteEntity of simlineEligibleNotes.sort(
    (a, b) => (a.getItem('#BEAT') as number) - (b.getItem('#BEAT') as number),
  )) {
    if (
      lastGroup.length === 0 ||
      Math.abs(
        (noteEntity.getItem('#BEAT') as number) -
          (lastGroup[0].getItem('#BEAT') as number),
      ) < 1e-2
    )
      lastGroup.push(noteEntity)
    else {
      groups.push(lastGroup)
      lastGroup = [noteEntity]
    }
  }

  if (lastGroup.length > 0) groups.push(lastGroup)

  for (const group of groups) {
    for (const [a, b] of pairwise(group)) {
      const entity = new Entity('SimLine', {
        left: a,
        right: b,
      })

      entities.push(entity)
    }
  }

  // console.log(entities)

  return {
    bgmOffset: usc.offset,
    entities: entities.map((e) => e.export()),
  }
}
