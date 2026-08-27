import { SampleProcessTemplate } from '../aggregates/SampleProcessTemplate';

export interface ISampleProcessTemplateRepository {
  findById(id: number): Promise<SampleProcessTemplate | null>;
  findList(params: {
    keyword?: string;
    page: number;
    pageSize: number;
  }): Promise<{ list: SampleProcessTemplate[]; total: number }>;
  save(template: SampleProcessTemplate): Promise<number>;
  update(template: SampleProcessTemplate): Promise<void>;
  softDelete(id: number): Promise<void>;
  incrementUsage(id: number): Promise<void>;
}
