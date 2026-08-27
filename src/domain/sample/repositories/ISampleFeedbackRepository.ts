import { SampleFeedback } from '@/domain/sample/entities/SampleFeedback';

export interface SampleFeedbackFilters {
  sampleOrderId?: number;
  round?: number;
  confirmationStatus?: string;
}

export interface ISampleFeedbackRepository {
  findById(id: number): Promise<SampleFeedback | null>;
  findBySampleOrderId(sampleOrderId: number): Promise<SampleFeedback[]>;
  findByFilters(filters: SampleFeedbackFilters): Promise<SampleFeedback[]>;
  save(feedback: SampleFeedback): Promise<number>;
  update(feedback: SampleFeedback): Promise<void>;
  delete(id: number): Promise<void>;
}
