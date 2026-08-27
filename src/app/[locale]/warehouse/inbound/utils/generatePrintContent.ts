import type { InboundRecord } from '../types';
import { filterApprovedRecords, mapRecordsToLabels } from './mapRecordsToLabels';

export function generatePrintContent(records: InboundRecord[], title: string): string {
  return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }
            .label-container {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              page-break-inside: avoid;
            }
            .label {
              border: 1px solid #000;
              padding: 10px;
              border-radius: 6px;
              text-align: center;
              page-break-inside: avoid;
              min-height: 120px;
            }
            .label h3 {
              margin: 0 0 8px 0;
              font-size: 14px;
            }
            .label p {
              margin: 3px 0;
              font-size: 10px;
            }
            .qrcode {
              margin: 8px 0;
            }
            .qrcode img {
              width: 60px !important;
              height: 60px !important;
            }
            .status {
              display: inline-block;
              padding: 1px 6px;
              border-radius: 8px;
              font-size: 8px;
              font-weight: bold;
            }
            .status-in {
              background-color: #d1fae5;
              color: #065f46;
            }
            .status-out {
              background-color: #fef3c7;
              color: #92400e;
            }
          </style>
        </head>
        <body>
          <h1 style="text-align: center; margin-bottom: 15px; font-size: 18px;">物料标签打印</h1>
          <div class="label-container">
            ${mapRecordsToLabels(filterApprovedRecords(records))
              .map((label) => {
                const qrContent = `${label.labelNo}@001:type:IN`;
                const qrDataUrl = `data:image/png;base64,${btoa(qrContent)}`;

                return `
                <div class="label">
                  <h3>${label.labelNo}</h3>
                  <p>${label.materialName}</p>
                  <p>${label.specification || '-'}</p>
                  <p>数量: ${label.quantity} ${label.unit || ''}</p>
                  <p>供应商: ${label.supplier || '-'}</p>
                  <p>入库时间: ${label.inboundTime ? new Date(label.inboundTime).toLocaleString('zh-CN') : '-'}</p>
                  <div class="qrcode">
                    <img src="${qrDataUrl}" alt="QR Code" style="width: 80px; height: 80px;" />
                  </div>
                  <span class="status status-in">
                    已入库
                  </span>
                </div>
              `;
              })
              .join('')}
          </div>
        </body>
        </html>
      `;
}
