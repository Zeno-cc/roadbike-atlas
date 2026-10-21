/**
 * 程序化纹理：全部由 Canvas 在运行时生成，保持零外部资源依赖。
 * - 高度场 → 法线贴图（碳纤维斜纹、轮胎胎纹等）
 * - 灰度数据贴图（拉丝金属粗糙度等）
 * 纹理按 key 缓存复用，避免重复生成。
 */
import { CanvasTexture, RepeatWrapping, type Texture } from 'three'

const cache = new Map<string, Texture>()

/** 由高度函数生成法线贴图（strength 越大凹凸越强） */
export function makeNormalTexture(
  key: string,
  size: number,
  height: (x: number, y: number) => number,
  strength = 2.2,
): Texture {
  const cached = cache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  const h = (x: number, y: number) =>
    height(((x % size) + size) % size, ((y % size) + size) % size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = h(x + 1, y) - h(x - 1, y)
      const dy = h(x, y + 1) - h(x, y - 1)
      // 法线 = normalize(-dx, -dy, 1/strength)，编码到 0..255
      let nx = -dx * strength
      let ny = -dy * strength
      const nz = 1
      const len = Math.hypot(nx, ny, nz)
      nx /= len
      ny /= len
      const i = (y * size + x) * 4
      img.data[i] = Math.round((nx * 0.5 + 0.5) * 255)
      img.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255)
      img.data[i + 2] = Math.round((nz / len * 0.5 + 0.5) * 255)
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.anisotropy = 4
  cache.set(key, tex)
  return tex
}

/** 由灰度函数生成数据贴图（用作 roughnessMap / bumpMap） */
export function makeGrayTexture(
  key: string,
  size: number,
  value: (x: number, y: number) => number,
): Texture {
  const cached = cache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = Math.max(0, Math.min(1, value(x, y)))
      const i = (y * size + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.round(v * 255)
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.anisotropy = 4
  cache.set(key, tex)
  return tex
}

/* ------------------------------------------------------------------ */
/* 具体纹理                                                            */
/* ------------------------------------------------------------------ */

/** 碳纤维 2×2 斜纹（twill weave）：两种对角方向的纤维束交错 */
export const carbonWeaveNormal = () =>
  makeNormalTexture(
    'carbon-weave',
    256,
    (x, y) => {
      const cell = 16
      const cx = Math.floor(x / cell)
      const cy = Math.floor(y / cell)
      const dir = (cx + cy) % 2 === 0 ? 1 : -1
      const u = dir > 0 ? x + y : x - y
      // 纤维束沿对角方向的细密起伏
      const strand = Math.sin((u / cell) * Math.PI * 2 * 2)
      const bundle = Math.sin(((dir > 0 ? x - y : x + y) / cell) * Math.PI) * 0.5
      return 0.5 + 0.28 * strand * (0.55 + 0.45 * bundle)
    },
    1.6,
  )

/** 拉丝金属：沿水平方向的随机细纹（用于粗糙度贴图） */
export const brushedMetalRoughness = () =>
  makeGrayTexture('brushed-metal', 256, (x, y) => {
    const streak = Math.sin(y * 12.9898 + x * 0.05) * 0.5 + 0.5
    const noise = Math.sin(x * 0.35 + y * 78.233) * 0.5 + 0.5
    return 0.28 + 0.16 * (0.6 * streak + 0.4 * noise)
  })

/** 轮胎胎纹：沿圆周的细密沟槽 */
export const tireTreadNormal = () =>
  makeNormalTexture(
    'tire-tread',
    128,
    (x, y) => {
      const groove = Math.sin((x / 128) * Math.PI * 2 * 34) * 0.5 + 0.5
      const sipes = Math.sin((y / 128) * Math.PI * 2 * 3) * 0.5 + 0.5
      return 0.5 + 0.22 * Math.pow(groove, 3) + 0.1 * sipes
    },
    1.2,
  )

/** 把带螺旋缠绕的棱纹（用于把带法线） */
export const barTapeRibNormal = () =>
  makeNormalTexture(
    'bar-tape-rib',
    128,
    (x) => 0.5 + 0.3 * Math.sin((x / 128) * Math.PI * 2 * 9),
    1.4,
  )

/* ------------------------------------------------------------------ */
/* 车架字标 / 徽标（贴花贴图，透明背景）                                */
/* ------------------------------------------------------------------ */

/** 通用文本贴图：在透明画布上绘制（用于下管字标、头管徽标等） */
export function makeDecalTexture(
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): Texture {
  const cached = cache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, width, height)
  draw(ctx, width, height)
  const tex = new CanvasTexture(canvas)
  tex.anisotropy = 8
  cache.set(key, tex)
  return tex
}

/** 下管字标："ATLAS" 白字（带字距的斜体无衬线） */
export const decalBrandTexture = () =>
  makeDecalTexture('decal-brand', 1024, 256, (ctx, w, h) => {
    ctx.font = 'italic 900 168px "Helvetica Neue", Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const text = 'ATLAS'
    const tracking = 26
    const widths = [...text].map((c) => ctx.measureText(c).width)
    const total = widths.reduce((a, b) => a + b, 0) + tracking * (text.length - 1)
    let x = w / 2 - total / 2
    ctx.fillStyle = '#f8fafc'
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 8
    ctx.shadowOffsetY = 3
    for (let i = 0; i < text.length; i++) {
      ctx.fillText(text[i], x + widths[i] / 2, h / 2)
      x += widths[i] + tracking
    }
    // 底部一条细青线，呼应站点主色
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = 'rgba(56,189,248,0.9)'
    ctx.fillRect(w / 2 - total / 2, h / 2 + 86, total, 10)
  })

/** 头管圆形徽标：深色圆底 + 亮色"骑"字 */
export const decalBadgeTexture = () =>
  makeDecalTexture('decal-badge', 256, 256, (ctx, w, h) => {
    ctx.beginPath()
    ctx.arc(w / 2, h / 2, 108, 0, Math.PI * 2)
    ctx.fillStyle = '#0b1220'
    ctx.fill()
    ctx.lineWidth = 10
    ctx.strokeStyle = '#38bdf8'
    ctx.stroke()
    ctx.font = '700 118px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#e2f3ff'
    ctx.fillText('骑', w / 2, h / 2 + 8)
  })

/** 立管小字标："ROADBIKE ATLAS" 细体白字 */
export const decalSmallTexture = () =>
  makeDecalTexture('decal-small', 512, 96, (ctx, w, h) => {
    ctx.font = '500 44px "Helvetica Neue", Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(241,245,249,0.92)'
    ctx.fillText('ROADBIKE ATLAS', w / 2, h / 2)
  })

/* ------------------------------------------------------------------ */
/* 影棚背景（渐变球 + 渐变地面）                                        */
/* ------------------------------------------------------------------ */

/** 背景球竖向渐变：暖白影棚（顶部微深 → 地平线最亮 → 地面略暗），无缝衔接 */
export const backdropGradientTexture = () =>
  makeDecalTexture('backdrop-v', 16, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#e6e2d7')
    g.addColorStop(0.34, '#f0ece3')
    g.addColorStop(0.51, '#f8f6f0')
    g.addColorStop(0.6, '#f2efe6')
    g.addColorStop(0.82, '#e9e5da')
    g.addColorStop(1, '#e0dcd0')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })

/** 影棚地面径向渐变（不透明；边缘色 = 背景球中段色 #0a1120，无缝衔接） */
export const floorGradientTexture = () =>
  makeDecalTexture('floor-radial', 512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#0a1120'
    ctx.fillRect(0, 0, w, h)
    const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2)
    g.addColorStop(0, '#2b3a58')
    g.addColorStop(0.35, '#1b2740')
    g.addColorStop(0.7, '#0e1526')
    g.addColorStop(1, '#0a1120')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })

/** 品牌色柔光斑（透明软边，叠加混合用） */
export const brandGlowTexture = () =>
  makeDecalTexture('brand-glow', 512, 512, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2)
    g.addColorStop(0, 'rgba(64,148,248,0.5)')
    g.addColorStop(0.45, 'rgba(37,99,235,0.18)')
    g.addColorStop(1, 'rgba(37,99,235,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })
