import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api.config';
import { ReportRange, ReportsOverview } from './report.models';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);

  overview(range: ReportRange): Observable<ReportsOverview> {
    return this.http.get<ReportsOverview>(`${API_BASE_URL}/reports/overview`, {
      params: { range }
    });
  }

  exportOrders(range: ReportRange): Observable<Blob> {
    return this.http.get(`${API_BASE_URL}/reports/export/orders.csv`, {
      params: { range },
      responseType: 'blob'
    });
  }
}
