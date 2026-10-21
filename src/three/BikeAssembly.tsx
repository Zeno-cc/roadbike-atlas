import { memo } from 'react'
import { parts } from '../../content/parts'
import { PartGroup } from './interaction'
import { MODEL_BY_PART } from './modelRegistry'

/**
 * 整车装配：按内容层的零件清单逐个挂载模型并包上可交互的 PartGroup。
 * memo 保证悬停/选中引起的外层重渲染不会波及模型子树。
 */
export const BikeAssembly = memo(function BikeAssembly() {
  return (
    <>
      {parts.map((part) => {
        const Model = MODEL_BY_PART[part.id]
        if (!Model) return null
        return (
          <PartGroup key={part.id} id={part.id}>
            <Model />
          </PartGroup>
        )
      })}
    </>
  )
})
