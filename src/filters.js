export const FILTER_PRESETS = [
  { id: 'clean', name: 'Clean', description: '自然還原', settings: {} },
  { id: 'cinema', name: 'Cinema', description: '電影冷調', settings: { contrast: 112, saturate: 118, brightness: 96, sepia: 10 } },
  { id: 'sunwash', name: 'Sunwash', description: '暖陽泛白', settings: { brightness: 110, contrast: 88, saturate: 120, sepia: 18 } },
  { id: 'mono', name: 'Mono', description: '經典黑白', settings: { grayscale: 100, contrast: 116 } },
  { id: 'noir', name: 'Noir', description: '深色黑白', settings: { grayscale: 100, contrast: 140, brightness: 88 } },
  { id: 'mint', name: 'Mint', description: '清爽青綠', settings: { hueRotate: 14, saturate: 130, brightness: 103 } },
  { id: 'velvet', name: 'Velvet', description: '低光絲絨', settings: { brightness: 89, contrast: 132, saturate: 82 } },
  { id: 'amber', name: 'Amber', description: '琥珀暖色', settings: { sepia: 36, saturate: 128, brightness: 102 } },
  { id: 'ice', name: 'Ice', description: '高冷藍白', settings: { saturate: 78, contrast: 108, hueRotate: 172, brightness: 106 } },
  { id: 'pop', name: 'Pop', description: '高彩銳利', settings: { contrast: 118, saturate: 154, brightness: 101 } },
  { id: 'dream', name: 'Dream', description: '柔焦粉霧', settings: { brightness: 108, contrast: 94, saturate: 118, blur: 1.2, hueRotate: -10 } },
  { id: 'acid', name: 'Acid', description: '霓虹強烈', settings: { saturate: 170, contrast: 130, hueRotate: 62 } },
  { id: 'teal-gold', name: 'Teal Gold', description: '青金色調', settings: { hueRotate: 18, saturate: 134, sepia: 22, contrast: 108 } },
  { id: 'retro', name: 'Retro', description: '復古褪色', settings: { sepia: 26, saturate: 92, contrast: 86, brightness: 104 } },
  { id: 'paper', name: 'Paper', description: '淡雅紙感', settings: { saturate: 66, brightness: 112, contrast: 80 } },
  { id: 'storm', name: 'Storm', description: '陰天壓色', settings: { brightness: 92, contrast: 118, saturate: 86, hueRotate: 200 } },
  { id: 'berry', name: 'Berry', description: '莓果洋紅', settings: { hueRotate: -24, saturate: 138, brightness: 104 } },
  { id: 'jade', name: 'Jade', description: '玉石青綠', settings: { hueRotate: 32, saturate: 126, contrast: 106 } },
  { id: 'copper', name: 'Copper', description: '銅金屬感', settings: { sepia: 42, saturate: 112, contrast: 122 } },
  { id: 'faded', name: 'Faded', description: '低反差膠片', settings: { contrast: 74, brightness: 108, saturate: 90 } },
  { id: 'hyper', name: 'Hyper', description: '誇張高對比', settings: { contrast: 152, saturate: 176, brightness: 98 } },
  { id: 'aqua', name: 'Aqua', description: '水感藍青', settings: { hueRotate: 154, saturate: 136, brightness: 105 } },
  { id: 'glow', name: 'Glow', description: '明亮柔發光', settings: { brightness: 114, contrast: 92, saturate: 122, blur: 0.8 } },
  { id: 'infra', name: 'Infra', description: '偽紅外', settings: { invert: 10, hueRotate: 130, saturate: 152, contrast: 134 } },
  { id: 'matrix', name: 'Matrix', description: '螢幕綠', settings: { grayscale: 32, hueRotate: 62, contrast: 128, brightness: 94 } },
  { id: 'cloud', name: 'Cloud', description: '輕盈低飽和', settings: { saturate: 72, brightness: 108, contrast: 90, blur: 0.4 } },
  { id: 'fire', name: 'Fire', description: '火焰橘紅', settings: { hueRotate: -18, saturate: 166, contrast: 122, brightness: 103 } },
  { id: 'ocean', name: 'Ocean', description: '深海藍', settings: { hueRotate: 182, saturate: 124, contrast: 120, brightness: 92 } },
  { id: 'luxe', name: 'Luxe', description: '高級時尚', settings: { contrast: 114, brightness: 101, saturate: 112, sepia: 10 } },
  { id: 'vivid', name: 'Vivid', description: '明豔鮮彩', settings: { saturate: 162, contrast: 112, brightness: 104 } },
  { id: 'invert', name: 'Invert', description: '反相實驗', settings: { invert: 100, contrast: 108 } },
  { id: 'fog', name: 'Fog', description: '霧化柔灰', settings: { brightness: 110, contrast: 72, saturate: 78, blur: 1.8 } }
]

export const DEFAULT_FILTER_SETTINGS = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hueRotate: 0,
  sepia: 0,
  grayscale: 0,
  invert: 0,
  blur: 0
}

export const FILTER_CONTROLS = [
  { key: 'brightness', label: '亮度', min: 60, max: 150, step: 1, unit: '%' },
  { key: 'contrast', label: '對比', min: 60, max: 180, step: 1, unit: '%' },
  { key: 'saturate', label: '飽和', min: 0, max: 200, step: 1, unit: '%' },
  { key: 'hueRotate', label: '色相', min: -180, max: 180, step: 1, unit: 'deg' },
  { key: 'sepia', label: '懷舊', min: 0, max: 100, step: 1, unit: '%' },
  { key: 'grayscale', label: '灰階', min: 0, max: 100, step: 1, unit: '%' },
  { key: 'invert', label: '反相', min: 0, max: 100, step: 1, unit: '%' },
  { key: 'blur', label: '模糊', min: 0, max: 4, step: 0.1, unit: 'px' }
]

export function mergeFilterSettings(presetSettings = {}) {
  return {
    ...DEFAULT_FILTER_SETTINGS,
    ...presetSettings
  }
}

export function buildFilterString(settings) {
  return [
    `brightness(${settings.brightness}%)`,
    `contrast(${settings.contrast}%)`,
    `saturate(${settings.saturate}%)`,
    `hue-rotate(${settings.hueRotate}deg)`,
    `sepia(${settings.sepia}%)`,
    `grayscale(${settings.grayscale}%)`,
    `invert(${settings.invert}%)`,
    `blur(${settings.blur}px)`
  ].join(' ')
}
