import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api.config';
import {
  CreateProductPayload,
  ProductDetails,
  ProductListItem,
  ProductPagedResponse,
  UpdateProductPayload
} from './product.models';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);

  list(q = '', category = '', stock = '', page = 1, pageSize = 10): Observable<ProductPagedResponse<ProductListItem>> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    if (q.trim()) params = params.set('q', q.trim());
    if (category) params = params.set('category', category);
    if (stock) params = params.set('stock', stock);

    return this.http.get<ProductPagedResponse<ProductListItem>>(`${API_BASE_URL}/products`, { params });
  }

  categories(): Observable<string[]> {
    return this.http.get<string[]>(`${API_BASE_URL}/products/categories`);
  }

  getById(id: string): Observable<ProductDetails> {
    return this.http.get<ProductDetails>(`${API_BASE_URL}/products/${id}`);
  }

  create(payload: CreateProductPayload): Observable<ProductDetails> {
    return this.http.post<ProductDetails>(`${API_BASE_URL}/products`, payload);
  }

  update(id: string, payload: UpdateProductPayload): Observable<ProductDetails> {
    return this.http.put<ProductDetails>(`${API_BASE_URL}/products/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/products/${id}`);
  }
}
