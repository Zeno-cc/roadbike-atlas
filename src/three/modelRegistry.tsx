import type { ComponentType } from 'react'
import { FrameModel, ForkModel, HeadsetModel, BottomBracketModel } from './models/frameModels'
import { HubModel, RimModel, SpokeModel, TireModel, TubeModel, AxleModel } from './models/wheelModels'
import {
  CranksetModel,
  PedalModel,
  CassetteModel,
  ChainModel,
  FrontDerailleurModel,
  RearDerailleurModel,
  ShifterModel,
} from './models/drivetrainModels'
import { CaliperModel, RotorModel, BrakePadsModel, BrakeLeverModel } from './models/brakeModels'
import { HandlebarModel, StemModel, BarTapeModel } from './models/cockpitModels'
import { SeatpostModel, SaddleModel, SeatpostClampModel } from './models/seatingModels'

export type PartModel = ComponentType<{ unit?: boolean }>

/** 零件 id → 3D 模型组件（unit 模式用于零件单独预览） */
export const MODEL_BY_PART: Record<string, PartModel> = {
  // 车架系统
  frame: FrameModel,
  fork: ForkModel,
  headset: HeadsetModel,
  'bottom-bracket': BottomBracketModel,
  // 轮组系统
  hub: HubModel,
  rim: RimModel,
  spoke: SpokeModel,
  tire: TireModel,
  tube: TubeModel,
  axle: AxleModel,
  // 传动系统
  crankset: CranksetModel,
  pedal: PedalModel,
  cassette: CassetteModel,
  chain: ChainModel,
  'front-derailleur': FrontDerailleurModel,
  'rear-derailleur': RearDerailleurModel,
  shifter: ShifterModel,
  // 刹车系统
  'brake-caliper': CaliperModel,
  rotor: RotorModel,
  'brake-pads': BrakePadsModel,
  'brake-lever': BrakeLeverModel,
  // 操控系统
  handlebar: HandlebarModel,
  stem: StemModel,
  'bar-tape': BarTapeModel,
  // 座舱系统
  seatpost: SeatpostModel,
  saddle: SaddleModel,
  'seatpost-clamp': SeatpostClampModel,
}
