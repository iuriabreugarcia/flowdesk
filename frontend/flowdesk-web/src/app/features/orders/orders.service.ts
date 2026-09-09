import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api.config';
import { OrderCard, OrderDetails, OrderItemPayload, OrderPayload, OrderStatus } from './order.models';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);

  list(q = '', priority = ''): Observable<OrderCard[]> {
    let params = new HttpParams();
    if (q.trim()) params = params.set('q', q.trim());
    if (priority) params = params.set('priority', priority);
    return this.http.get<OrderCard[]>(`${API_BASE_URL}/orders`, { params });
  }

  getById(id: string): Observable<OrderDetails> {
    return this.http.get<OrderDetails>(`${API_BASE_URL}/orders/${id}`);
  }

  create(payload: OrderPayload): Observable<OrderDetails> {
    return this.http.post<OrderDetails>(`${API_BASE_URL}/orders`, payload);
  }

  update(id: string, payload: OrderPayload): Observable<OrderDetails> {
    return this.http.put<OrderDetails>(`${API_BASE_URL}/orders/${id}`, payload);
  }

  updateStatus(id: string, status: OrderStatus): Observable<OrderDetails> {
    return this.http.patch<OrderDetails>(`${API_BASE_URL}/orders/${id}/status`, { status });
  }

  addItem(orderId: string, payload: OrderItemPayload): Observable<OrderDetails> {
    return this.http.post<OrderDetails>(`${API_BASE_URL}/orders/${orderId}/items`, payload);
  }

  updateItem(orderId: string, itemId: string, payload: OrderItemPayload): Observable<OrderDetails> {
    return this.http.put<OrderDetails>(`${API_BASE_URL}/orders/${orderId}/items/${itemId}`, payload);
  }

  deleteItem(orderId: string, itemId: string): Observable<OrderDetails> {
    return this.http.delete<OrderDetails>(`${API_BASE_URL}/orders/${orderId}/items/${itemId}`);
  }
}
