import {
  SampleProcessCard,
  SampleProcessItemProps,
  SampleProcessStepProps,
} from '../aggregates/SampleProcessCard';

export interface ISampleProcessCardRepository {
  findById(id: number): Promise<SampleProcessCard | null>;
  findList(params: {
    keyword?: string;
    status?: number;
    customerId?: number;
    page: number;
    pageSize: number;
  }): Promise<{ list: SampleProcessCard[]; total: number }>;
  save(card: SampleProcessCard): Promise<number>;
  update(card: SampleProcessCard): Promise<void>;
  updateStatus(id: number, status: number): Promise<void>;
  saveItems(cardId: number, items: SampleProcessItemProps[]): Promise<void>;
  saveSteps(cardId: number, steps: SampleProcessStepProps[]): Promise<void>;
  softDelete(id: number): Promise<void>;
  countByStatus(): Promise<Record<string, number>>;
}
