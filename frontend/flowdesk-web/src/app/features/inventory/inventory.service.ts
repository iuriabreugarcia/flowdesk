import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api.config';
import {
  InventorySummary,
  MovementPagedResponse,
  StockMovement,
  StockMovementPayload
} from './inventory.models';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);

  summary(): Observable<InventorySummary> {
    return this.http.get<InventorySummary>(`${API_BASE_URL}/inventory/summary`);
  }

  movements(q = '', type = '', productId = '', page = 1, pageSize = 12): Observable<MovementPagedResponse<StockMovement>> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    if (q.trim()) params = params.set('q', q.trim());
    if (type) params = params.set('type', type);
    if (productId) params = params.set('productId', productId);

    return this.http.get<MovementPagedResponse<StockMovement>>(`${API_BASE_URL}/inventory/movements`, { params });
  }

  createMovement(productId: string, payload: StockMovementPayload): Observable<StockMovement> {
    return this.http.post<StockMovement>(`${API_BASE_URL}/inventory/products/${productId}/movements`, payload);
  }
}
