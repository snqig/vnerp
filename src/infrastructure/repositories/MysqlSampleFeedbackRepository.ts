import {
  ISampleFeedbackRepository,
  SampleFeedbackFilters,
} from '@/domain/sample/repositories/ISampleFeedbackRepository';
import { SampleFeedback } from '@/domain/sample/entities/SampleFeedback';
import { query, execute } from '@/lib/db';

export class MysqlSampleFeedbackRepository implements ISampleFeedbackRepository {
  async findById(id: number): Promise<SampleFeedback | null> {
    const rows = await query<Loose>(
      'SELECT * FROM sal_sample_feedback WHERE id = ? AND deleted = 0',
      [id]
    );
    if (!rows || rows.length === 0) return null;
    return SampleFeedback.reconstitute(this.mapToProps(rows[0]));
  }

  async findBySampleOrderId(sampleOrderId: number): Promise<SampleFeedback[]> {
    const rows = await query<Loose>(
      'SELECT * FROM sal_sample_feedback WHERE sample_order_id = ? AND deleted = 0 ORDER BY round ASC, create_time ASC',
      [sampleOrderId]
    );
    return (rows || []).map((r: Loose) => SampleFeedback.reconstitute(this.mapToProps(r)));
  }

  async findByFilters(filters: SampleFeedbackFilters): Promise<SampleFeedback[]> {
    let sql = 'SELECT * FROM sal_sample_feedback WHERE deleted = 0';
    const params: Loose[] = [];

    if (filters.sampleOrderId) {
      sql += ' AND sample_order_id = ?';
      params.push(filters.sampleOrderId);
    }

    if (filters.round) {
      sql += ' AND round = ?';
      params.push(filters.round);
    }

    if (filters.confirmationStatus) {
      sql += ' AND confirmation_status = ?';
      params.push(filters.confirmationStatus);
    }

    sql += ' ORDER BY round ASC, create_time ASC';

    const rows = await query<Loose>(sql, params);
    return (rows || []).map((r: Loose) => SampleFeedback.reconstitute(this.mapToProps(r)));
  }

  async save(feedback: SampleFeedback): Promise<number> {
    const p = feedback.toProps();
    const result = await execute(
      `INSERT INTO sal_sample_feedback
       (sample_order_id, round, feedback_content, modification_requirements, confirmation_status, feedback_by, feedback_time, create_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        p.sampleOrderId,
        p.round,
        p.feedbackContent || null,
        p.modificationRequirements || null,
        p.confirmationStatus || 'pending',
        p.feedbackBy || null,
        p.feedbackTime || null,
      ]
    );
    return result.insertId;
  }

  async update(feedback: SampleFeedback): Promise<void> {
    const p = feedback.toProps();
    await execute(
      `UPDATE sal_sample_feedback SET
        feedback_content = ?, modification_requirements = ?, confirmation_status = ?
       WHERE id = ? AND deleted = 0`,
      [
        p.feedbackContent || null,
        p.modificationRequirements || null,
        p.confirmationStatus || 'pending',
        p.id,
      ]
    );
  }

  async delete(id: number): Promise<void> {
    await execute('UPDATE sal_sample_feedback SET deleted = 1 WHERE id = ?', [id]);
  }

  private mapToProps(row: Loose) {
    return {
      id: row.id,
      sampleOrderId: row.sample_order_id,
      round: row.round,
      feedbackContent: row.feedback_content,
      modificationRequirements: row.modification_requirements,
      confirmationStatus: row.confirmation_status,
      feedbackBy: row.feedback_by,
      feedbackTime: row.feedback_time,
      createTime: row.create_time,
      deleted: row.deleted,
    };
  }
}
