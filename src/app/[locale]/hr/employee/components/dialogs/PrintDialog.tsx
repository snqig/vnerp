'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Employee } from '../../types';

/* eslint-disable @next/next/no-img-element */

interface PrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEmployee: Employee | null;
  qrCodeUrl: string;
  companyName: string;
  printRef: React.RefObject<HTMLDivElement | null>;
  onPrint: () => void;
}

export function PrintDialog({
  open,
  onOpenChange,
  selectedEmployee,
  qrCodeUrl,
  companyName,
  printRef,
  onPrint,
}: PrintDialogProps) {
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg" resizable>
          <DialogHeader>
            <DialogTitle>{tc('cardPreview')}</DialogTitle>
            <DialogDescription>{tc('clickToPrint')}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4 overflow-auto">
            {/* 上岗证卡片 - 打印内容 */}
            <div ref={printRef} className="card" style={{ minWidth: '320px' }}>
              <div className="header">
                <div className="company-name">{companyName}</div>
                <div className="card-title">{tc('employeeCard')}</div>
              </div>
              <div className="photo-area">
                {selectedEmployee?.photo ? (
                  <img
                    src={selectedEmployee.photo}
                    alt={selectedEmployee.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <span className="photo-text">{tc('photo')}</span>
                )}
              </div>
              <div className="content-row">
                <div className="left-section">
                  <div className="qr-section">
                    {qrCodeUrl && (
                      <>
                        <img src={qrCodeUrl} alt={tc('qrCode')} className="qr-code" />
                      </>
                    )}
                  </div>
                </div>
                <div className="right-section">
                  <div className="info-section">
                    <div className="info-row">
                      <span className="info-label">{tc('name')}</span>
                      <span className="info-value">{selectedEmployee?.name}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">{tc('gender')}</span>
                      <span className="info-value">
                        {selectedEmployee?.gender === 1 ? t('maleShort') : t('femaleShort')}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">{tc('department')}</span>
                      <span className="info-value">{selectedEmployee?.dept_name}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">{tc('position')}</span>
                      <span className="info-value">{selectedEmployee?.position || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="employee-no">NO: {selectedEmployee?.employee_no}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={onPrint} className="bg-blue-600 hover:bg-blue-700">
              <Printer className="w-4 h-4 mr-2" />
              {tc('printCard')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 打印样式 */}
      <style jsx>{`
        .card {
          width: 320px;
          height: 480px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          color: white;
          position: relative;
          overflow: hidden;
        }
        .card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          position: relative;
          z-index: 1;
        }
        .company-name {
          font-size: 16px;
          font-weight: bold;
          letter-spacing: 2px;
          margin-bottom: 8px;
          line-height: 1.4;
        }
        .card-title {
          font-size: 16px;
          opacity: 0.9;
        }
        .photo-area {
          width: 120px;
          height: 160px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
          border: 2px dashed rgba(255, 255, 255, 0.4);
          overflow: hidden;
          margin: 0 auto 20px;
        }
        .photo-area img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 6px;
        }
        .photo-text {
          font-size: 12px;
          opacity: 0.7;
        }
        .content-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          position: relative;
          z-index: 1;
          gap: 16px;
        }
        .left-section {
          width: 45%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .right-section {
          width: 55%;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .employee-no {
          font-size: 12px;
          opacity: 0.9;
          font-weight: 500;
          text-align: center;
          margin-top: 10px;
          position: relative;
          z-index: 1;
        }
        .info-section {
          position: relative;
          z-index: 1;
          margin-bottom: 20px;
        }
        .info-row {
          display: flex;
          margin-bottom: 12px;
          font-size: 14px;
        }
        .info-label {
          width: 60px;
          opacity: 0.8;
        }
        .info-value {
          flex: 1;
          font-weight: 500;
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
          padding-bottom: 2px;
        }
        .qr-section {
          text-align: center;
          position: relative;
          z-index: 1;
        }
        .qr-code {
          width: 100px;
          height: 100px;
          background: white;
          border-radius: 8px;
          padding: 6px;
          margin: 0 auto 6px;
        }
        .qr-code img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .qr-text {
          font-size: 11px;
          opacity: 0.8;
        }
        .card-number {
          position: absolute;
          bottom: 12px;
          right: 16px;
          font-size: 11px;
          opacity: 0.6;
          z-index: 1;
        }
      `}</style>
    </>
  );
}
