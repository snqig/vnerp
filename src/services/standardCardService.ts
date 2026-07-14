import { authFetch } from '@/lib/auth-fetch';

export interface StandardCardListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
}

export class StandardCardService {
  async fetchList(params: StandardCardListParams = {}) {
    const { page = 1, pageSize = 10, keyword = '', status = 'all' } = params;
    const url = `/api/standard-cards?page=${page}&pageSize=${pageSize}&keyword=${encodeURIComponent(keyword)}&status=${status}`;
    const response = await authFetch(url);
    return response.json();
  }

  async fetchById(id: number) {
    const response = await authFetch(`/api/standard-cards?id=${id}`);
    return response.json();
  }

  async save(data: Record<string, unknown>, isEditMode: boolean, _editId?: string) {
    const url = '/api/standard-cards';
    const method = isEditMode ? 'PUT' : 'POST';
    const response = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async delete(id: number) {
    const response = await authFetch(`/api/standard-cards?id=${id}`, { method: 'DELETE' });
    return response.json();
  }

  async batchDelete(ids: number[]) {
    const response = await authFetch(`/api/standard-cards?id=${ids.join(',')}`, {
      method: 'DELETE',
    });
    return response.json();
  }

  async submit(id: number) {
    const response = await authFetch(`/api/standard-card/action?action=submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    return response.json();
  }

  async approve(id: number) {
    const response = await authFetch(`/api/standard-card/action?action=approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    return response.json();
  }

  async confirm(id: number) {
    const response = await authFetch(`/api/standard-card/action?action=confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    return response.json();
  }

  async obsolete(id: number, reason: string) {
    const response = await authFetch(`/api/standard-card/action?action=obsolete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, reason }),
    });
    return response.json();
  }

  async createNewVersion(id: number) {
    const response = await authFetch(`/api/standard-card/action?action=newVersion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    return response.json();
  }

  async fetchApprovalStatus(id: number) {
    const response = await authFetch(`/api/standard-cards/approve?id=${id}`);
    return response.json();
  }
}

export const standardCardService = new StandardCardService();
