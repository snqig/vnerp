'use client';

import { useState, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { authFetch } from '@/lib/auth-fetch';
import { logger } from '@/lib/logger';
import type { CuttingFormData, PrintLabel } from '../types';
import { isCuttableMaterial, parseSpecWidth, calcCutSpec } from '../types';

interface UseCuttingDeps {
  currentLabel: PrintLabel | null;
  user: { id?: string | number; realName?: string; username?: string } | null;
  fetchInboundRecords: () => Promise<void>;
  setPrintLabels: Dispatch<SetStateAction<PrintLabel[]>>;
  setIsCuttingResultOpen: Dispatch<SetStateAction<boolean>>;
  setIsCuttingDialogOpen: Dispatch<SetStateAction<boolean>>;
}

export function useCutting(deps: UseCuttingDeps) {
  const t = useTranslations('Warehouse');
  const {
    currentLabel,
    user,
    fetchInboundRecords,
    setPrintLabels,
    setIsCuttingResultOpen,
    setIsCuttingDialogOpen,
  } = deps;

  const [cuttingForm, setCuttingForm] = useState<CuttingFormData>({
    sourceLabelId: '',
    cutWidths: '',
    operatorId: user?.id || '',
    operatorName: user?.realName || user?.username || '',
    remark: '',
  });

  const handleCutting = useCallback(async () => {
    const ctx = { module: 'Warehouse', action: 'handleCutting' };
    logger.stepStart(ctx, 'handleCutting', {
      labelId: currentLabel?.id,
      labelNo: currentLabel?.labelNo,
      cutWidths: cuttingForm.cutWidths,
      operatorId: cuttingForm.operatorId,
    });

    // 校验分支1: 是否选中标签
    if (!currentLabel) {
      logger.branch(ctx, 'validate', 'currentLabel != null', false);
      toast.error(t('selectCutLabel'));
      return;
    }
    logger.branch(ctx, 'validate', 'currentLabel != null', true, {
      materialName: currentLabel.materialName,
      specification: currentLabel.specification,
    });

    // 校验分支2: 物料是否可分切
    const materialNameForCheck = currentLabel.materialName || '';
    if (!isCuttableMaterial(materialNameForCheck)) {
      logger.branch(ctx, 'validate', 'isCuttableMaterial', false, {
        materialName: materialNameForCheck,
      });
      toast.error(t('materialNotCuttable'));
      return;
    }
    logger.branch(ctx, 'validate', 'isCuttableMaterial', true);

    // 校验分支3: 是否填写分切宽度
    if (!cuttingForm.cutWidths.trim()) {
      logger.branch(ctx, 'validate', 'cutWidths not empty', false);
      toast.error(t('inputCutWidth'));
      return;
    }
    logger.branch(ctx, 'validate', 'cutWidths not empty', true, {
      cutWidths: cuttingForm.cutWidths,
    });

    try {
      // 解析分切宽度
      const widths = cuttingForm.cutWidths.split('+').map(Number);
      const hasInvalid = widths.some((w) => isNaN(w) || w <= 0);
      logger.info(ctx, '分切宽度解析', { widths, hasInvalid });
      if (hasInvalid) {
        logger.warn(ctx, '存在无效宽度值，将跳过规格校验', { widths });
      }

      // 规格宽度解析与校验
      const spec = currentLabel.specification || currentLabel.materialSpec || '';
      const specWidth = parseSpecWidth(spec);
      logger.info(ctx, '规格宽度解析', { spec, specWidth });
      if (specWidth !== null) {
        const totalCutWidth = widths.reduce((sum, w) => sum + w, 0);
        logger.branch(ctx, 'specCheck', 'totalCutWidth <= specWidth', totalCutWidth <= specWidth, {
          totalCutWidth,
          specWidth,
        });
        if (totalCutWidth > specWidth) {
          toast.error(t('specParseFailed'));
          return;
        }
      } else {
        logger.warn(ctx, '未能解析规格宽度，跳过总量校验', { spec });
      }

      // 组装请求数据
      const materialName =
        currentLabel.materialName ||
        currentLabel.material_name ||
        currentLabel.item?.material_name ||
        '';
      const recordId = currentLabel.record?.id || currentLabel.id;
      const itemIdx = currentLabel.item?.idx ?? currentLabel.itemIdx ?? 0;
      const numericRecordId =
        typeof recordId === 'string' ? parseInt(recordId.split('-')[0], 10) : recordId;
      const operatorId = cuttingForm.operatorId || user?.id || '1';
      const operatorName =
        cuttingForm.operatorName || user?.realName || user?.username || '系统管理员';

      const requestBody = {
        sourceLabelId: numericRecordId || null,
        sourceLabelNo: `${currentLabel.order_no || currentLabel.labelNo}-${itemIdx + 1}`,
        cutWidthStr: cuttingForm.cutWidths,
        operatorId: operatorId,
        operatorName: operatorName,
        remark: cuttingForm.remark,
        materialCode: currentLabel.material_code || currentLabel.item?.material_code || '',
        materialName: materialName,
        specification: currentLabel.material_spec || currentLabel.specification || '',
        quantity: currentLabel.quantity || currentLabel.item?.quantity || 0,
        unit: currentLabel.unit || currentLabel.item?.unit || '',
        supplierName: currentLabel.supplier_name || currentLabel.supplier || '',
        batchNo: currentLabel.batch_no || currentLabel.item?.batch_no || '',
        orderNo: currentLabel.order_no || currentLabel.orderNo || '',
        originalWidth: specWidth,
      };
      logger.info(ctx, '发送分切请求', {
        url: '/api/warehouse/inbound/cutting',
        sourceLabelId: requestBody.sourceLabelId,
        sourceLabelNo: requestBody.sourceLabelNo,
        cutWidthStr: requestBody.cutWidthStr,
        materialName: requestBody.materialName,
        originalWidth: requestBody.originalWidth,
      });

      const response = await authFetch('/api/warehouse/inbound/cutting', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      logger.info(ctx, '分切API响应', { status: response.status, ok: response.ok });

      const result = await response.json();
      if (result.success) {
        const newLabelCount = result.data?.newLabels?.length || 0;
        logger.stepEnd(ctx, 'handleCutting', {
          success: true,
          newLabelCount,
          newLabels: result.data?.newLabels,
        });
        toast.success(t('cutSuccess', { count: newLabelCount }));
        setIsCuttingDialogOpen(false);
        setCuttingForm((prev) => ({ ...prev, cutWidths: '', remark: '' }));

        // 生成子 QR 码
        try {
          const parentQrContent = currentLabel.batch_no || currentLabel.labelNo || '';
          const splits = result.data?.newLabels?.map((nl: Loose, i: number) => ({
            materialId: currentLabel.material_id || 0,
            materialName: currentLabel.materialName || currentLabel.material_name || '',
            batchNo: nl.batch_no || currentLabel.batch_no || '',
            quantity: nl.cutQty || nl.quantity || 0,
            splitIndex: i + 1,
          })) || [];
          if (splits.length > 0 && parentQrContent) {
            await authFetch('/api/trace/qr/split', {
              method: 'POST',
              body: JSON.stringify({
                parentQrContent,
                splits,
                operator: cuttingForm.operatorName || '系统管理员',
              }),
            });
            logger.info(ctx, '子QR码生成完成', { splitCount: splits.length });
          }
        } catch (qrErr) {
          logger.warn(ctx, '子QR码生成失败(不影响主流程)', { error: (qrErr as Error).message });
        }

        // 刷新入库单列表
        logger.info(ctx, '开始刷新入库单列表');
        await fetchInboundRecords();
        logger.info(ctx, '入库单列表刷新完成');

        // 映射新标签到 PrintLabel
        if (result.data?.newLabels && result.data.newLabels.length > 0) {
          logger.info(ctx, '开始映射分切结果到打印标签', { count: result.data.newLabels.length });
          const newPrintLabels = result.data.newLabels.map((nl: Loose, idx: number) => ({
            id: nl.id || `cut-${idx}`,
            labelNo:
              nl.labelNo ||
              nl.label_no ||
              `${currentLabel.order_no || currentLabel.labelNo}-C${idx + 1}`,
            orderNo: currentLabel.order_no || currentLabel.orderNo || currentLabel.labelNo || '',
            materialName: nl.isRemainder
              ? `${t('remainderMaterial')}${currentLabel.material_name || currentLabel.materialName || ''}`
              : currentLabel.material_name || currentLabel.materialName || '',
            specification:
              nl.newSpec ||
              nl.specification ||
              calcCutSpec(
                currentLabel.material_spec || currentLabel.specification || '',
                nl.cutWidth || nl.width || 0
              ),
            supplier: currentLabel.supplier_name || currentLabel.supplier || '',
            inboundTime: new Date().toISOString(),
            quantity: nl.cutQty || nl.quantity || 0,
            unit: currentLabel.unit || currentLabel.item?.unit || '',
            batchNo: currentLabel.batch_no || currentLabel.item?.batch_no || '',
            isCutLabel: true,
            cutWidth: nl.cutWidth || nl.width || 0,
            isRemainder: nl.isRemainder || false,
            sourceLabelNo: `${currentLabel.order_no || currentLabel.labelNo}-${(currentLabel.item?.idx ?? currentLabel.itemIdx ?? 0) + 1}`,
          }));
          logger.info(ctx, '分切结果映射完成', {
            mappedCount: newPrintLabels.length,
            labels: newPrintLabels.map((p: PrintLabel) => ({
              id: p.id,
              labelNo: p.labelNo,
              isRemainder: p.isRemainder,
              cutWidth: p.cutWidth,
              quantity: p.quantity,
            })),
          });
          setPrintLabels(newPrintLabels);
          setIsCuttingResultOpen(true);
          logger.info(ctx, '已打开分切结果对话框');
        } else {
          logger.warn(ctx, 'API返回成功但无新标签数据', { data: result.data });
        }
      } else {
        logger.error(ctx, '分切API返回失败', { message: result.message, code: result.code });
        toast.error(result.message || t('cutFailed'));
      }
    } catch (error) {
      logger.error(ctx, '分切过程异常', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      toast.error(t('cutFailed'));
    }
  }, [
    currentLabel,
    cuttingForm,
    user,
    t,
    fetchInboundRecords,
    setIsCuttingDialogOpen,
    setPrintLabels,
    setIsCuttingResultOpen,
  ]);

  return {
    cuttingForm,
    setCuttingForm,
    handleCutting,
  };
}
