/**
 * 一鍵匯出全動作整合 PNG 的拼圖邏輯。
 *
 * 版式移植自紙娃娃小冊子網站（https://mxd.dvg.cn/zhiwawa_v4/）的
 * 「一鍵整合 PNG」：2750×3500、11 列 × 14 行 = 154 格，每格 250×250，
 * 透明底。動作 → 格位的映射（actionFrameMap）與幀復用（frameReferences）
 * 皆取自該站前端，還原為下方常數。
 *
 * 對齊方式：完整移植紙娃娃小冊子（https://mxd.dvg.cn/zhiwawa_v4/）的
 * 定位公式。每幀繪製偏移為：
 *   offsetX = 150 - specialAnchor.x - frame.left - N10[action.frame].x
 *   offsetY = 150 - specialAnchor.y - frame.top - N10[action.frame].y
 * 其中 specialAnchor 是角色 bodyFrame 相對於角色根節點的座標
 * （小冊子 Y10/X10），frame.left/top 取自 UniversalFrame，
 * N10 為小冊子逐幀修正表（FRAME_ORIGIN）。不再做像素包圍盒估算。
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

/**
 * 小冊子逐幀修正表（N10）：`動作.影格序號` → 該影格在官方模板中的
 * 微調偏移（單位 px）。取自紙娃娃小冊子前端，與小冊子公式配套使用。
 */
export const FRAME_ORIGIN: Record<string, { x: number; y: number }> = {
  "alert.0": { x: 8, y: 0 },
  "alert.1": { x: 8, y: 0 },
  "alert.2": { x: 8, y: 0 },
  "fly.0": { x: 12, y: 0 },
  "fly.1": { x: 8, y: 0 },
  "jump.0": { x: 13, y: 0 },
  "ladder.0": { x: 20, y: 0 },
  "ladder.1": { x: 23, y: 2 },
  "proneStab.0": { x: -3, y: 0 },
  "proneStab.1": { x: -3, y: 0 },
  "rope.0": { x: 22, y: 0 },
  "rope.1": { x: 22, y: 0 },
  "shoot1.0": { x: 6, y: 0 },
  "shoot1.1": { x: 6, y: 0 },
  "shoot1.2": { x: 6, y: 0 },
  "shoot2.0": { x: 7, y: 0 },
  "shoot2.1": { x: 7, y: 0 },
  "shoot2.2": { x: 7, y: 0 },
  "shoot2.3": { x: 7, y: 0 },
  "shoot2.4": { x: 7, y: 0 },
  "shootF.0": { x: 6, y: 0 },
  "shootF.1": { x: 9, y: 0 },
  "sit.0": { x: 6, y: -3 },
  "stabO1.0": { x: 9, y: 0 },
  "stabO1.1": { x: -3, y: 0 },
  "stabO2.0": { x: 8, y: 0 },
  "stabO2.1": { x: -6, y: 0 },
  "stabOF.0": { x: 11, y: 0 },
  "stabOF.1": { x: -1, y: -2 },
  "stabOF.2": { x: -12, y: 0 },
  "stabT1.0": { x: 2, y: 0 },
  "stabT1.1": { x: 0, y: 0 },
  "stabT1.2": { x: -15, y: 0 },
  "stabT2.0": { x: 11, y: 0 },
  "stabT2.1": { x: 10, y: 0 },
  "stabT2.2": { x: -8, y: 0 },
  "stabTF.0": { x: 1, y: 0 },
  "stabTF.1": { x: 1, y: 0 },
  "stabTF.2": { x: -9, y: -16 },
  "stand1.0": { x: 16, y: 0 },
  "stand1.1": { x: 16, y: 0 },
  "stand1.2": { x: 16, y: 0 },
  "stand2.0": { x: 16, y: 0 },
  "stand2.1": { x: 16, y: 0 },
  "stand2.2": { x: 16, y: 0 },
  "swingO1.0": { x: 17, y: 0 },
  "swingO1.1": { x: 9, y: 0 },
  "swingO1.2": { x: 0, y: 0 },
  "swingO2.0": { x: 6, y: 0 },
  "swingO2.1": { x: 7, y: 0 },
  "swingO2.2": { x: 6, y: 0 },
  "swingO3.0": { x: 11, y: 0 },
  "swingO3.1": { x: -8, y: 0 },
  "swingO3.2": { x: -8, y: 0 },
  "swingOF.0": { x: 8, y: 0 },
  "swingOF.1": { x: 3, y: -6 },
  "swingOF.2": { x: -15, y: -4 },
  "swingOF.3": { x: -19, y: 0 },
  "swingP1.0": { x: 16, y: 0 },
  "swingP1.1": { x: 3, y: 0 },
  "swingP1.2": { x: 4, y: 0 },
  "swingP2.0": { x: 7, y: 0 },
  "swingP2.1": { x: 7, y: 0 },
  "swingP2.2": { x: 9, y: 0 },
  "swingPF.0": { x: 15, y: 0 },
  "swingPF.1": { x: 13, y: 0 },
  "swingPF.2": { x: -1, y: -16 },
  "swingPF.3": { x: -28, y: 0 },
  "swingT1.0": { x: 16, y: 0 },
  "swingT1.1": { x: 3, y: 0 },
  "swingT1.2": { x: 4, y: 0 },
  "swingT2.0": { x: 5, y: 0 },
  "swingT2.1": { x: 5, y: 0 },
  "swingT2.2": { x: 5, y: 0 },
  "swingT3.0": { x: 15, y: 0 },
  "swingT3.1": { x: 10, y: 0 },
  "swingT3.2": { x: 13, y: 0 },
  "swingTF.0": { x: 3, y: 0 },
  "swingTF.1": { x: 3, y: 0 },
  "swingTF.2": { x: 2, y: 0 },
  "swingTF.3": { x: 1, y: 0 },
  "walk1.0": { x: 16, y: 0 },
  "walk1.1": { x: 16, y: 0 },
  "walk1.2": { x: 16, y: 0 },
  "walk1.3": { x: 16, y: 0 },
  "walk2.0": { x: 16, y: 0 },
  "walk2.1": { x: 16, y: 0 },
  "walk2.2": { x: 16, y: 0 },
  "walk2.3": { x: 16, y: 0 },
};

export interface SpriteSheetFrame {
  canvas: HTMLCanvasElement;
  /** 該影格內容在 canvas 中的繪製 X（UniversalFrame.left；小冊子公式用） */
  left?: number;
  /** 該影格內容在 canvas 中的繪製 Y（UniversalFrame.top；小冊子公式用） */
  top?: number;
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
 * 計算小冊子公式中的 specialAnchor：角色 bodyFrame 相對於角色根節點
 * 的座標。對應小冊子前端的 Y10/X10（沿 bodyFrame → character 的
 * transform 鏈累加）。用 Pixi 內建的 toLocal 等價實現。
 *
 * 若取不到則回傳 { x: 0, y: 0 }（小冊子公式本來就有 ?? 0 兜底）。
 */
export function getSpecialAnchor(character: unknown): {
  x: number;
  y: number;
} {
  try {
    const c = character as {
      bodyFrame?: { getGlobalPosition?: (...args: never[]) => unknown };
      toLocal?: (...args: never[]) => unknown;
    } | null;
    const bf = c?.bodyFrame;
    const toLocal = c?.toLocal;
    if (typeof bf?.getGlobalPosition !== 'function' || typeof toLocal !== 'function') {
      return { x: 0, y: 0 };
    }
    // bodyFrame 的世界座標，轉回角色本地座標
    const world = bf.getGlobalPosition() as { x: number; y: number };
    const local = (toLocal as (p: unknown) => { x: number; y: number }).call(
      c,
      world,
    );
    if (!Number.isFinite(local?.x) || !Number.isFinite(local?.y)) {
      return { x: 0, y: 0 };
    }
    return { x: local.x, y: local.y };
  } catch {
    return { x: 0, y: 0 };
  }
}

/**
 * 將各動作的影格拼成 2750×3500 整合圖。
 * 每幀以腳底中心對齊該格的官方模板錨點；缺少影格的格子留空並計入 missing。
 */
export function buildSpriteSheet(
  framesByAction: Map<string, SpriteSheetFrame[]>,
  createCanvas: CanvasFactory = defaultCanvasFactory,
  specialAnchor: { x: number; y: number } = { x: 0, y: 0 },
): SpriteSheetResult {
  const canvas = createCanvas();
  canvas.width = SPRITE_SHEET_WIDTH;
  canvas.height = SPRITE_SHEET_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Cannot create 2d context for sprite sheet');
  }
  ctx.imageSmoothingEnabled = false;

  // 小冊子公式：基準點為格內 (150, 150)（小冊子寫死 150，非格幾何中央），
  // offset = 150 - specialAnchor - frame.left/top - N10修正。
  // 對應小冊子前端 J10：
  //   offsetX = Math.round(150 - (specialAnchor?.x ?? 0) - t.left - n.x)
  //   offsetY = Math.round(150 - (specialAnchor?.y ?? 0) - t.top - n.y)
  const CENTER = 150;

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
      // 實際使用的 key（含復用回退）：拿解析後的動作名+序號查 N10
      const nKey = `${action}.${i}`;
      const n = FRAME_ORIGIN[nKey] ?? { x: 0, y: 0 };
      const fl = frame.left ?? 0;
      const ft = frame.top ?? 0;
      const offsetX = Math.round(CENTER - specialAnchor.x - fl - n.x);
      const offsetY = Math.round(CENTER - specialAnchor.y - ft - n.y);
      const { x, y } = getCellPosition(slot);
      ctx.drawImage(frame.canvas, x + offsetX, y + offsetY);
      found += 1;
    }
  }
  return { canvas, found, missing };
}
