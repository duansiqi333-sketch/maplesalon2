/**
 * 一鍵匯出全動作整合 PNG 的拼圖邏輯。
 *
 * 版式移植自紙娃娃小冊子網站（https://mxd.dvg.cn/zhiwawa_v4/）的
 * 「一鍵整合 PNG」：2750×3500、11 列 × 14 行 = 154 格，每格 250×250，
 * 透明底。動作 → 格位的映射（actionFrameMap）與幀復用（frameReferences）
 * 皆取自該站前端，還原為下方常數。
 *
 * 本檔為純函式 + 可注入的 canvas 工廠，不依賴瀏覽器全域變數，
 * 以便在 Node 環境下做 headless 單元測試。
 */

export const SPRITE_SHEET_COLS = 11;
export const SPRITE_SHEET_ROWS = 14;
export const SPRITE_SHEET_CELL = 250;
export const SPRITE_SHEET_WIDTH = SPRITE_SHEET_COLS * SPRITE_SHEET_CELL; // 2750
export const SPRITE_SHEET_HEIGHT = SPRITE_SHEET_ROWS * SPRITE_SHEET_CELL; // 3500

/** 動作 -> 該動作各影格依序放入的格號（1-based），共 154 格 */
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

export interface SpriteSheetFrame {
  canvas: HTMLCanvasElement;
}

export type CanvasFactory = () => HTMLCanvasElement;

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

const defaultCanvasFactory: CanvasFactory = () =>
  document.createElement('canvas');

/**
 * 將各動作的影格拼成 2750×3500 整合圖。
 * 每個影格在其 250×250 格內置中繪製；缺少影格的格子留空並計入 missing。
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
      const frame = resolveActionFrame(framesByAction, action, i);
      if (!frame?.canvas) {
        missing += 1;
        continue;
      }
      const { x, y } = getCellPosition(slots[i]);
      const w = frame.canvas.width;
      const h = frame.canvas.height;
      ctx.drawImage(
        frame.canvas,
        x + (SPRITE_SHEET_CELL - w) / 2,
        y + (SPRITE_SHEET_CELL - h) / 2,
      );
      found += 1;
    }
  }
  return { canvas, found, missing };
}
