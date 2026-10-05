/**
 * 一鍵匯出全動作整合 PNG 的拼圖邏輯。
 *
 * 版式移植自紙娃娃小冊子網站（https://mxd.dvg.cn/zhiwawa_v4/）的
 * 「一鍵整合 PNG」：2750×3500、11 列 × 14 行 = 154 格，每格 250×250，
 * 透明底。動作 → 格位的映射（actionFrameMap）與幀復用（frameReferences）
 * 皆取自該站前端，還原為下方常數。
 *
 * 對齊方式：官方 MapleStory Worlds 皮膚 PSD 模板（Avatar_Cape.psd，
 * 2750×3500）每格都有參考人偶，其 data:origin 錨點位置經實測記錄於
 * SPRITE_ANCHORS（格號 → 格內相對座標）。每幀以其不透明像素底部
 * 中央（腳底中心）為源錨點，對齊到該格的官方錨點，而非居中繪製；
 * 居中會因各動作包圍盒不同而讓人物在每格亂飄。
 *
 * 本檔為純函式 + 可注入的 canvas 工廠，不依賴瀏覽器全域變數，
 * 以便在 Node 環境下做 headless 單元測試。
 */

export const SPRITE_SHEET_COLS = 11;
export const SPRITE_SHEET_ROWS = 14;
export const SPRITE_SHEET_CELL = 250;
export const SPRITE_SHEET_WIDTH = SPRITE_SHEET_COLS * SPRITE_SHEET_CELL; // 2750
export const SPRITE_SHEET_HEIGHT = SPRITE_SHEET_ROWS * SPRITE_SHEET_CELL; // 3500

export const SPRITE_ANCHORS: Record<number, { tx: number; ty: number }> = {
  1: { tx: 134, ty: 149 },
  2: { tx: 130, ty: 149 },
  3: { tx: 132, ty: 149 },
  4: { tx: 130, ty: 149 },
  6: { tx: 132, ty: 149 },
  7: { tx: 144, ty: 149 },
  9: { tx: 136, ty: 149 },
  10: { tx: 148, ty: 149 },
  12: { tx: 134, ty: 149 },
  13: { tx: 130, ty: 149 },
  14: { tx: 132, ty: 149 },
  15: { tx: 130, ty: 149 },
  17: { tx: 136, ty: 149 },
  18: { tx: 134, ty: 149 },
  19: { tx: 143, ty: 149 },
  23: { tx: 128, ty: 149 },
  24: { tx: 128, ty: 149 },
  25: { tx: 128, ty: 149 },
  28: { tx: 138, ty: 149 },
  29: { tx: 132, ty: 149 },
  30: { tx: 145, ty: 149 },
  34: { tx: 128, ty: 149 },
  35: { tx: 128, ty: 149 },
  36: { tx: 128, ty: 149 },
  38: { tx: 137, ty: 149 },
  39: { tx: 137, ty: 149 },
  40: { tx: 137, ty: 149 },
  45: { tx: 138, ty: 149 },
  46: { tx: 138, ty: 149 },
  47: { tx: 138, ty: 149 },
  50: { tx: 146, ty: 149 },
  51: { tx: 146, ty: 149 },
  52: { tx: 146, ty: 149 },
  53: { tx: 146, ty: 149 },
  56: { tx: 136, ty: 149 },
  57: { tx: 138, ty: 149 },
  58: { tx: 131, ty: 149 },
  61: { tx: 139, ty: 149 },
  62: { tx: 146, ty: 149 },
  64: { tx: 132, ty: 149 },
  67: { tx: 138, ty: 149 },
  68: { tx: 136, ty: 149 },
  69: { tx: 135, ty: 149 },
  72: { tx: 138, ty: 149 },
  73: { tx: 138, ty: 149 },
  74: { tx: 138, ty: 149 },
  76: { tx: 138, ty: 149 },
  77: { tx: 136, ty: 149 },
  78: { tx: 136, ty: 149 },
  79: { tx: 140, ty: 149 },
  80: { tx: 136, ty: 149 },
  83: { tx: 138, ty: 149 },
  84: { tx: 138, ty: 149 },
  85: { tx: 138, ty: 149 },
  86: { tx: 138, ty: 149 },
  87: { tx: 138, ty: 149 },
  89: { tx: 135, ty: 149 },
  90: { tx: 137, ty: 149 },
  91: { tx: 145, ty: 149 },
  92: { tx: 130, ty: 149 },
  100: { tx: 126, ty: 149 },
  101: { tx: 136, ty: 149 },
  102: { tx: 126, ty: 149 },
  105: { tx: 126, ty: 149 },
  106: { tx: 136, ty: 149 },
  107: { tx: 126, ty: 149 },
  111: { tx: 136, ty: 149 },
  112: { tx: 136, ty: 149 },
  113: { tx: 131, ty: 149 },
  116: { tx: 137, ty: 149 },
  117: { tx: 136, ty: 149 },
  118: { tx: 131, ty: 149 },
  122: { tx: 135, ty: 149 },
  123: { tx: 136, ty: 149 },
  124: { tx: 131, ty: 149 },
  127: { tx: 130, ty: 149 },
  128: { tx: 128, ty: 149 },
  129: { tx: 138, ty: 149 },
  130: { tx: 134, ty: 149 },
  132: { tx: 136, ty: 149 },
  133: { tx: 144, ty: 149 },
  134: { tx: 140, ty: 149 },
  135: { tx: 137, ty: 149 },
  136: { tx: 126, ty: 149 },
  138: { tx: 141, ty: 149 },
  139: { tx: 131, ty: 149 },
  140: { tx: 131, ty: 149 },
  144: { tx: 130, ty: 149 },
  145: { tx: 128, ty: 149 },
  149: { tx: 129, ty: 149 },
  150: { tx: 129, ty: 149 },
};

/** 動作 -> 該動作各影格依序放入的格號（1-based），共 91 格 */
export const ACTION_FRAME_MAP: Record<string, number[]> = {
  walk1: [1, 2, 3, 4],
  walk2: [12, 13, 14, 15],
  stand1: [23, 24, 25],
  stand2: [34, 35, 36],
  alert: [45, 46, 47],
  swingO1: [56, 57, 58],
  swingO2: [67, 68, 69],
  swingO3: [78, 79, 80],
  swingOF: [89, 90, 91, 92],
  swingT1: [100, 101, 102],
  swingT2: [111, 112, 113],
  swingT3: [122, 123, 124],
  swingTF: [133, 134, 135, 136],
  swingP1: [105, 106, 107],
  swingP2: [116, 117, 118],
  swingPF: [127, 128, 129, 130],
  stabO1: [6, 7],
  stabO2: [9, 10],
  stabOF: [138, 139, 140],
  stabT1: [17, 18, 19],
  stabT2: [28, 29, 30],
  stabTF: [50, 51, 52, 53],
  shoot1: [72, 73, 74],
  shoot2: [83, 84, 85, 86, 87],
  shootF: [76, 77],
  proneStab: [39, 40],
  prone: [38],
  fly: [61, 62],
  jump: [64],
  sit: [132],
  ladder: [144, 145],
  rope: [149, 150],
};

/**
 * 影格復用：當 `動作.影格序號` 缺少可用影格時，
 * 回退使用所指向的 `動作.影格序號` 的影格。
 */
export const FRAME_REFERENCES: Record<string, string> = {
  'prone.0': 'proneStab.0',
  'stabTF.0': 'swingPF.0',
  'stabTF.1': 'swingPF.1',
  'stabTF.3': 'stabT1.2',
};

/**
 * 官方模板錨點：格號（1-based）→ 該格參考人偶的 data:origin
 * 錨點（相對於格左上角，單位 px）。數值自官方 Avatar_Cape.psd
 * 實測；第 38 格官方模板為空格，借用同為趴下系的 137,149。
 */
export const FALLBACK_ANCHOR = { tx: 132, ty: 149 };

export interface SpriteSheetFrame {
  canvas: HTMLCanvasElement;
}

export type CanvasFactory = () => HTMLCanvasElement;

/** 最小像素讀取介面，供 computeSourceAnchor 做 headless 測試 */
export interface PixelReader {
  readonly width: number;
  readonly height: number;
  readonly data: ArrayLike<number>;
}

export interface SpriteSheetResult {
  canvas: HTMLCanvasElement;
  /** 成功繪製的格數 */
  found: number;
  /** 缺少可用影格而留空的格數 */
  missing: number;
}

function parseFrameKey(key: string): [string, number] | undefined {
  const dot = key.lastIndexOf('.');
  if (dot < 0) {
    return undefined;
  }
  const index = Number(key.slice(dot + 1));
  if (!Number.isInteger(index) || index < 0) {
    return undefined;
  }
  return [key.slice(0, dot), index];
}

/**
 * 解析 `動作` 的第 `frameIndex` 個影格。
 * 若該影格缺失，依 FRAME_REFERENCES 回退（附循環保護）。
 */
export function resolveActionFrame(
  framesByAction: Map<string, SpriteSheetFrame[]>,
  action: string,
  frameIndex: number,
): SpriteSheetFrame | undefined {
  const seen = new Set<string>();
  let key = `${action}.${frameIndex}`;
  while (!seen.has(key)) {
    seen.add(key);
    const parsed = parseFrameKey(key);
    if (!parsed) {
      return undefined;
    }
    const [actionName, index] = parsed;
    const frame = framesByAction.get(actionName)?.[index];
    if (frame) {
      return frame;
    }
    const ref = FRAME_REFERENCES[key];
    if (!ref) {
      return undefined;
    }
    key = ref;
  }
  return undefined;
}

/** 格號（1-based）-> 該格左上角的像素座標 */
export function getCellPosition(slot: number): { x: number; y: number } {
  const col = (slot - 1) % SPRITE_SHEET_COLS;
  const row = Math.floor((slot - 1) / SPRITE_SHEET_COLS);
  return { x: col * SPRITE_SHEET_CELL, y: row * SPRITE_SHEET_CELL };
}

/**
 * 計算影格的源錨點：不透明像素整體下緣（腳底）的水平中央。
 * 取底部一小條（約 8% 高度）內不透明像素的 x 範圍中央，而非整張圖
 * 包圍盒中央——武器等向側面伸出的部件不應把腳底中心拉偏。
 * 全透明時回傳 null，由呼叫方改用畫布中央。
 */
export function computeSourceAnchor(
  pixels: PixelReader,
): { sx: number; sy: number } | null {
  const { width, height, data } = pixels;
  let bottom = -1;
  for (let y = height - 1; y >= 0; y--) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[rowOffset + x * 4 + 3] > 10) {
        bottom = y;
        break;
      }
    }
    if (bottom >= 0) {
      break;
    }
  }
  if (bottom < 0) {
    return null;
  }
  const bandH = Math.max(2, Math.round(height * 0.08));
  const bandTop = Math.max(0, bottom - bandH + 1);
  let minX = width;
  let maxX = -1;
  for (let y = bandTop; y <= bottom; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[rowOffset + x * 4 + 3] > 10) {
        if (x < minX) {
          minX = x;
        }
        if (x > maxX) {
          maxX = x;
        }
      }
    }
  }
  if (maxX < 0) {
    return null;
  }
  return { sx: Math.round((minX + maxX) / 2), sy: bottom };
}

/**
 * 從影格 canvas 讀取源錨點；讀不到時回傳 null。
 */
export function getFrameSourceAnchor(
  canvas: HTMLCanvasElement,
): { sx: number; sy: number } | null {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx || canvas.width <= 0 || canvas.height <= 0) {
      return null;
    }
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return computeSourceAnchor(imageData);
  } catch {
    return null;
  }
}

const defaultCanvasFactory: CanvasFactory = () =>
  document.createElement('canvas');

/**
 * 將各動作的影格拼成 2750×3500 整合圖。
 * 每幀以腳底中心對齊該格的官方模板錨點；缺少影格的格子留空並計入 missing。
 */
export function buildSpriteSheet(
  framesByAction: Map<string, SpriteSheetFrame[]>,
  createCanvas: CanvasFactory = defaultCanvasFactory,
): SpriteSheetResult {
  const canvas = createCanvas();
  canvas.width = SPRITE_SHEET_WIDTH;
  canvas.height = SPRITE_SHEET_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Cannot create 2d context for sprite sheet');
  }
  ctx.imageSmoothingEnabled = false;

  let found = 0;
  let missing = 0;
  for (const [action, slots] of Object.entries(ACTION_FRAME_MAP)) {
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const frame = resolveActionFrame(framesByAction, action, i);
      if (!frame?.canvas) {
        missing += 1;
        continue;
      }
      const { x, y } = getCellPosition(slot);
      const target = SPRITE_ANCHORS[slot] ?? FALLBACK_ANCHOR;
      const w = frame.canvas.width;
      const h = frame.canvas.height;
      const source = getFrameSourceAnchor(frame.canvas);
      const sx = source ? source.sx : w / 2;
      const sy = source ? source.sy : h * 0.6;
      ctx.drawImage(
        frame.canvas,
        Math.round(x + target.tx - sx),
        Math.round(y + target.ty - sy),
      );
      found += 1;
    }
  }
  return { canvas, found, missing };
}
