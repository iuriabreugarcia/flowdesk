import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api.config';
import { Customer, CustomerListItem, CustomerPayload, PagedResponse } from './customer.models';

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly http = inject(HttpClient);

  list(q: string, page: number, pageSize: number): Observable<PagedResponse<CustomerListItem>> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    if (q.trim()) {
      params = params.set('q', q.trim());
    }

    return this.http.get<PagedResponse<CustomerListItem>>(`${API_BASE_URL}/customers`, { params });
  }

  getById(id: string): Observable<Customer> {
    return this.http.get<Customer>(`${API_BASE_URL}/customers/${id}`);
  }

  create(payload: CustomerPayload): Observable<Customer> {
    return this.http.post<Customer>(`${API_BASE_URL}/customers`, payload);
  }

  update(id: string, payload: CustomerPayload): Observable<Customer> {
    return this.http.put<Customer>(`${API_BASE_URL}/customers/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/customers/${id}`);
  }
}
