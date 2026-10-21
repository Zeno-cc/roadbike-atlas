import type { Part } from '../schema'
import { frameParts } from './frame'
import { wheelParts } from './wheels'
import { drivetrainParts } from './drivetrain'
import { brakeParts } from './brakes'
import { cockpitParts } from './cockpit'
import { seatingParts } from './seating'

export const parts: Part[] = [
  ...frameParts,
  ...wheelParts,
  ...drivetrainParts,
  ...brakeParts,
  ...cockpitParts,
  ...seatingParts,
]

export const partById = Object.fromEntries(parts.map((p) => [p.id, p])) as Record<string, Part>

export const partIds = parts.map((p) => p.id)

export const partsOfSystem = (system: Part['system']) => parts.filter((p) => p.system === system)
