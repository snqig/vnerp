'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  QrCode,
  CheckCircle,
  AlertCircle,
  Trash2,
  Lock,
  Search,
  FileText,
  Package,
  CheckCheck,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ProcessCard {
  id: number;
  cardNo: string;
  workOrderNo: string;
  productCode?: string;
  productName?: string;
  mainLabelNo?: string;
  mainMaterialName?: string;
  burdeningStatus: string;
  lockStatus: string;
}

export default function BurdeningPage() {
  const t = useTranslations('Dcprint');
  const tc = useTranslations('Common');
  const [cards, setCards] = useState<ProcessCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<ProcessCard | null>(null);
  const [materials, setMaterials] = useState<
    { labelNo: string; materialName?: string; batchNo?: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [qrCode, setQrCode] = useState('');

  useEffect(() => {
    fetchPendingCards();
  }, []);

  const fetchPendingCards = async () => {
    try {
      const res = await authFetch('/api/dcprint/process-cards?burdeningStatus=pending');
      const r = await res.json();
      if (r.success) setCards(r.data.list || []);
    } catch {}
  };

  const selectCard = (card: ProcessCard) => {
    setSelectedCard(card);
    setError('');
    setSuccess('');
    try {
      authFetch(`/api/dcprint/process-cards/detail?cardNo=${card.cardNo}`)
        .then((r) => r.json())
        .then((r) => {
          if (r.success) setMaterials(r.data.materials || []);
        });
    } catch {
      setMaterials([]);
    }
  };

  const handleScan = async () => {
    if (!qrCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/dcprint/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrContent: qrCode, scanType: 'process' }),
      });
      const result = await res.json();
      if (result.success) {
        const type = result.data.type;
        const data = result.data.data;
        if (type === '4') {
          const card = cards.find((c) => c.cardNo === data.cardNo || c.id === data.id);
          if (card) {
            selectCard(card);
            setSuccess(t('cardSelected') || '已选择流程卡');
          } else setError(t('cardNotFound') || '流程卡未找到');
        } else if (type === '0' || type === '1' || type === '2') {
          if (!selectedCard) setError(t('pleaseSelectCardFirst') || '请先选择流程卡');
          else if (selectedCard.lockStatus) setError(t('cardLockedCannotAdd') || '流程卡已锁定');
          else if (materials.find((m) => m.labelNo === data.labelNo))
            setError(t('auxiliaryAlreadyAdded'));
          else {
            const r2 = await authFetch('/api/dcprint/process-cards', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: selectedCard.id,
                action: 'addMaterial',
                labelId: data.id,
                labelNo: data.labelNo,
              }),
            });
            const r2j = await r2.json();
            if (r2j.success) {
              setMaterials([
                ...materials,
                { labelNo: data.labelNo, materialName: data.materialName, batchNo: data.batchNo },
              ]);
              setSuccess(t('auxiliaryAdded'));
            } else setError(r2j.message || t('addMaterialFailed'));
          }
        } else setError(t('scanInvalidType') || '请扫描流程卡或物料标签');
      } else setError(result.message || tc('scanFailed'));
    } catch {
      setError(t('scanQueryFailed'));
    } finally {
      setLoading(false);
      setQrCode('');
    }
  };

  const completeBurdening = async () => {
    if (!selectedCard) return;
    setLoading(true);
    try {
      const res = await authFetch('/api/dcprint/process-cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedCard.id,
          action: 'burdening',
          burdeningStatus: 'completed',
        }),
      });
      const r = await res.json();
      if (r.success) {
        await authFetch('/api/dcprint/process-cards', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedCard.id, action: 'lock', lockStatus: 'locked' }),
        });
        setSuccess(t('burdeningCompleted') || '配料完成');
        setSelectedCard(null);
        setMaterials([]);
        fetchPendingCards();
      } else setError(r.message || t('burdeningFailed'));
    } catch {
      setError(t('burdeningFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout title={t('scanBatching')}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              {t('scanBatching')}
            </CardTitle>
            <CardDescription>{t('scanSequenceDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder={t('pleaseScanQR')}
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                    disabled={loading}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCard(null);
                    setMaterials([]);
                    setError('');
                    setSuccess('');
                  }}
                >
                  {tc('reset')}
                </Button>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">{success}</AlertDescription>
                </Alert>
              )}
              {selectedCard && (
                <Card className="border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t('processCard')}: {selectedCard.cardNo}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                      <span>
                        {t('workOrderNo')}: {selectedCard.workOrderNo}
                      </span>
                      <span>
                        {t('productName')}: {selectedCard.productName}
                      </span>
                    </div>
                    {materials.length > 0 && (
                      <div className="space-y-1 mb-3">
                        {materials.map((m) => (
                          <div
                            key={m.labelNo}
                            className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                          >
                            <span>
                              <Package className="h-4 w-4 inline mr-1" />
                              {m.materialName || m.labelNo}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {!selectedCard.lockStatus && (
                      <Button onClick={completeBurdening} disabled={loading} className="w-full">
                        <CheckCheck className="h-4 w-4 mr-2" />
                        {t('burdened')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('processCardList')}</CardTitle>
          </CardHeader>
          <CardContent>
            {cards.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">{tc('noRecords')}</p>
            ) : (
              <div className="space-y-2">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between p-3 border rounded hover:bg-muted/30 cursor-pointer"
                    onClick={() => selectCard(card)}
                  >
                    <div>
                      <span className="font-medium">{card.cardNo}</span>
                      <span className="ml-3 text-muted-foreground">
                        {card.workOrderNo} - {card.productName}
                      </span>
                    </div>
                    <Badge
                      className={
                        card.burdeningStatus === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }
                    >
                      {card.burdeningStatus === 'completed' ? t('burdened') : t('notBurdened')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
