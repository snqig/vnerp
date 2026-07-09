export interface CuttingInput {
  id: string;
  width: number;
  height: number;
  quantity: number;
  label: string;
  rotate: boolean;
}

export interface CuttingResult {
  input_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  sheet_index: number;
}

export interface SheetLayout {
  sheet_index: number;
  sheet_width: number;
  sheet_height: number;
  cuts: CuttingResult[];
  utilized_area: number;
  total_area: number;
  utilization_rate: number;
  waste_area: number;
}

export interface CuttingOptimizationResult {
  sheets: SheetLayout[];
  total_sheets: number;
  overall_utilization: number;
  total_waste: number;
  unplaced_items: { input_id: string; remaining_qty: number }[];
}

interface FreeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function splitFreeRect(rect: FreeRect, pw: number, ph: number, kerf: number): FreeRect[] {
  const result: FreeRect[] = [];
  const rightW = rect.width - pw;
  const bottomH = rect.height - ph;

  if (rightW <= 0 && bottomH <= 0) {
    return result;
  }

  if (rightW <= 0) {
    const h = bottomH - kerf;
    if (h > 0) {
      result.push({ x: rect.x, y: rect.y + ph + kerf, width: rect.width, height: h });
    }
    return result;
  }

  if (bottomH <= 0) {
    result.push({ x: rect.x + pw, y: rect.y, width: rightW, height: rect.height });
    return result;
  }

  const horizRightArea = rightW * ph;
  const horizBottomH = bottomH - kerf;
  const horizBottomArea = rect.width * (horizBottomH > 0 ? horizBottomH : 0);
  const horizMinArea = Math.min(horizRightArea, horizBottomArea);

  const vertBelowArea = pw * bottomH;
  const vertRightW = rightW - kerf;
  const vertRightArea = (vertRightW > 0 ? vertRightW : 0) * rect.height;
  const vertMinArea = Math.min(vertBelowArea, vertRightArea);

  if (horizMinArea >= vertMinArea) {
    result.push({ x: rect.x + pw, y: rect.y, width: rightW, height: ph });
    if (horizBottomH > 0) {
      result.push({ x: rect.x, y: rect.y + ph + kerf, width: rect.width, height: horizBottomH });
    }
  } else {
    result.push({ x: rect.x, y: rect.y + ph, width: pw, height: bottomH });
    if (vertRightW > 0) {
      result.push({ x: rect.x + pw + kerf, y: rect.y, width: vertRightW, height: rect.height });
    }
  }

  return result;
}

export function guillotineCut(
  inputs: CuttingInput[],
  sheetWidth: number,
  sheetHeight: number,
  kerfWidth: number = 2,
  allowRotation: boolean = true
): CuttingOptimizationResult {
  const sorted = [...inputs].sort((a, b) => b.width * b.height - a.width * a.height);

  const sheets: SheetLayout[] = [];
  const freeRectsList: FreeRect[][] = [];
  const unplacedItems: { input_id: string; remaining_qty: number }[] = [];

  for (const input of sorted) {
    let remaining = input.quantity;

    while (remaining > 0) {
      let bestSheet = -1;
      let bestRectIdx = -1;
      let bestRotated = false;
      let bestScore = Infinity;

      for (let s = 0; s < sheets.length; s++) {
        for (let r = 0; r < freeRectsList[s].length; r++) {
          const rect = freeRectsList[s][r];

          if (input.width <= rect.width && input.height <= rect.height) {
            const score = rect.width * rect.height - input.width * input.height;
            if (score < bestScore) {
              bestScore = score;
              bestSheet = s;
              bestRectIdx = r;
              bestRotated = false;
            }
          }

          if (
            allowRotation &&
            input.rotate &&
            input.height <= rect.width &&
            input.width <= rect.height
          ) {
            const score = rect.width * rect.height - input.height * input.width;
            if (score < bestScore) {
              bestScore = score;
              bestSheet = s;
              bestRectIdx = r;
              bestRotated = true;
            }
          }
        }
      }

      if (bestSheet >= 0) {
        const rect = freeRectsList[bestSheet][bestRectIdx];
        const pw = bestRotated ? input.height : input.width;
        const ph = bestRotated ? input.width : input.height;

        sheets[bestSheet].cuts.push({
          input_id: input.id,
          x: rect.x,
          y: rect.y,
          width: pw,
          height: ph,
          rotated: bestRotated,
          sheet_index: bestSheet,
        });

        freeRectsList[bestSheet].splice(bestRectIdx, 1);
        const newFreeRects = splitFreeRect(rect, pw, ph, kerfWidth);
        freeRectsList[bestSheet].push(...newFreeRects);

        remaining--;
      } else {
        const sheetIndex = sheets.length;
        const newSheet: SheetLayout = {
          sheet_index: sheetIndex,
          sheet_width: sheetWidth,
          sheet_height: sheetHeight,
          cuts: [],
          utilized_area: 0,
          total_area: sheetWidth * sheetHeight,
          utilization_rate: 0,
          waste_area: sheetWidth * sheetHeight,
        };
        const initialFreeRect: FreeRect = {
          x: 0,
          y: 0,
          width: sheetWidth,
          height: sheetHeight,
        };

        let placed = false;

        if (input.width <= sheetWidth && input.height <= sheetHeight) {
          newSheet.cuts.push({
            input_id: input.id,
            x: 0,
            y: 0,
            width: input.width,
            height: input.height,
            rotated: false,
            sheet_index: sheetIndex,
          });
          const newFreeRects = splitFreeRect(initialFreeRect, input.width, input.height, kerfWidth);
          sheets.push(newSheet);
          freeRectsList.push(newFreeRects);
          placed = true;
          remaining--;
        } else if (
          allowRotation &&
          input.rotate &&
          input.height <= sheetWidth &&
          input.width <= sheetHeight
        ) {
          newSheet.cuts.push({
            input_id: input.id,
            x: 0,
            y: 0,
            width: input.height,
            height: input.width,
            rotated: true,
            sheet_index: sheetIndex,
          });
          const newFreeRects = splitFreeRect(initialFreeRect, input.height, input.width, kerfWidth);
          sheets.push(newSheet);
          freeRectsList.push(newFreeRects);
          placed = true;
          remaining--;
        } else {
          sheets.push(newSheet);
          freeRectsList.push([initialFreeRect]);
          break;
        }

        if (!placed) {
          break;
        }
      }
    }

    if (remaining > 0) {
      unplacedItems.push({ input_id: input.id, remaining_qty: remaining });
    }
  }

  let totalUtilized = 0;
  let totalArea = 0;
  for (const sheet of sheets) {
    sheet.utilized_area = sheet.cuts.reduce((sum, c) => sum + c.width * c.height, 0);
    sheet.waste_area = sheet.total_area - sheet.utilized_area;
    sheet.utilization_rate = sheet.total_area > 0 ? sheet.utilized_area / sheet.total_area : 0;
    totalUtilized += sheet.utilized_area;
    totalArea += sheet.total_area;
  }

  return {
    sheets,
    total_sheets: sheets.length,
    overall_utilization: totalArea > 0 ? totalUtilized / totalArea : 0,
    total_waste: totalArea - totalUtilized,
    unplaced_items: unplacedItems,
  };
}

export function calculateScrapRate(result: CuttingOptimizationResult): {
  perSheet: number[];
  overall: number;
} {
  const perSheet = result.sheets.map((sheet) => {
    if (sheet.total_area <= 0) return 0;
    return sheet.waste_area / sheet.total_area;
  });

  const totalWaste = result.sheets.reduce((sum, sheet) => sum + sheet.waste_area, 0);
  const totalArea = result.sheets.reduce((sum, sheet) => sum + sheet.total_area, 0);
  const overall = totalArea > 0 ? totalWaste / totalArea : 0;

  return { perSheet, overall };
}

export async function generateCuttingPlan(
  conn: any,
  cuttingRecordId: number
): Promise<CuttingOptimizationResult> {
  const [records]: any = await conn.query(
    `SELECT
      r.id,
      r.record_no,
      r.source_label_id,
      r.source_label_no,
      r.cut_width_str,
      r.original_width,
      r.remain_width,
      r.remark
    FROM inv_cutting_record r
    WHERE r.id = ? AND r.deleted = 0`,
    [cuttingRecordId]
  );

  if (!records || records.length === 0) {
    throw new Error(`分切记录不存在: ID=${cuttingRecordId}`);
  }

  const record = records[0];

  const [labels]: any = await conn.query(
    `SELECT
      id,
      label_no,
      width,
      length_per_roll,
      specification,
      material_code,
      material_name
    FROM inv_material_label
    WHERE id = ? AND deleted = 0`,
    [record.source_label_id]
  );

  if (!labels || labels.length === 0) {
    throw new Error(`源标签不存在: label_id=${record.source_label_id}`);
  }

  const sourceLabel = labels[0];
  const sheetWidth = parseFloat(sourceLabel.width) || parseFloat(record.original_width) || 0;
  const sheetHeight =
    parseFloat(sourceLabel.length_per_roll) || parseSpecLength(sourceLabel.specification) || 1000;

  if (sheetWidth <= 0 || sheetHeight <= 0) {
    throw new Error('无法确定原材料尺寸，请检查标签宽幅和长度信息');
  }

  const [details]: any = await conn.query(
    `SELECT
      d.id,
      d.new_label_no,
      d.cut_width,
      d.sequence
    FROM inv_cutting_detail d
    WHERE d.record_id = ?
    ORDER BY d.sequence`,
    [cuttingRecordId]
  );

  const inputs: CuttingInput[] = [];

  if (details && details.length > 0) {
    const widthCountMap = new Map<number, number>();
    for (const detail of details) {
      const w = parseFloat(detail.cut_width) || 0;
      if (w <= 0) continue;
      widthCountMap.set(w, (widthCountMap.get(w) || 0) + 1);
    }

    let seq = 0;
    for (const [w, qty] of widthCountMap) {
      inputs.push({
        id: `piece-${seq++}`,
        width: w,
        height: sheetHeight,
        quantity: qty,
        label: `${w}mm×${sheetHeight}mm`,
        rotate: false,
      });
    }
  } else if (record.cut_width_str) {
    const widths = record.cut_width_str
      .split('+')
      .map((s: string) => parseFloat(s.trim()))
      .filter((w: number) => w > 0);

    const widthCountMap = new Map<number, number>();
    for (const w of widths) {
      widthCountMap.set(w, (widthCountMap.get(w) || 0) + 1);
    }

    let seq = 0;
    for (const [w, qty] of widthCountMap) {
      inputs.push({
        id: `piece-${seq++}`,
        width: w,
        height: sheetHeight,
        quantity: qty,
        label: `${w}mm×${sheetHeight}mm`,
        rotate: false,
      });
    }
  }

  if (inputs.length === 0) {
    throw new Error('未找到分切目标尺寸数据');
  }

  const result = guillotineCut(inputs, sheetWidth, sheetHeight);

  const layoutJson = JSON.stringify({
    total_sheets: result.total_sheets,
    overall_utilization: result.overall_utilization,
    total_waste: result.total_waste,
    sheets: result.sheets.map((s) => ({
      sheet_index: s.sheet_index,
      utilization_rate: s.utilization_rate,
      cuts: s.cuts,
    })),
    unplaced_items: result.unplaced_items,
  });

  const existingRemark = record.remark || '';
  const newRemark = existingRemark
    ? `${existingRemark} [LAYOUT:${layoutJson}]`
    : `[LAYOUT:${layoutJson}]`;

  await conn.execute(`UPDATE inv_cutting_record SET remark = ? WHERE id = ?`, [
    newRemark,
    cuttingRecordId,
  ]);

  return result;
}

function parseSpecLength(spec: string): number {
  if (!spec) return 0;
  const match = spec.match(/(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*(mm|m)?/i);
  if (match) {
    const length = parseFloat(match[2]);
    const unit = match[3]?.toLowerCase();
    if (unit === 'm') return length * 1000;
    return length;
  }
  return 0;
}
