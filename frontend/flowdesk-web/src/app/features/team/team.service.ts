import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api.config';
import { CreateTeamMemberPayload, TeamListResponse, TeamUser, UpdateTeamMemberPayload } from './team.models';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly http = inject(HttpClient);
  list(q = '', role = '', status = ''): Observable<TeamListResponse> {
    let params = new HttpParams();
    if (q.trim()) params = params.set('q', q.trim());
    if (role) params = params.set('role', role);
    if (status) params = params.set('status', status);
    return this.http.get<TeamListResponse>(`${API_BASE_URL}/team`, { params });
  }
  create(payload: CreateTeamMemberPayload): Observable<TeamUser> { return this.http.post<TeamUser>(`${API_BASE_URL}/team`, payload); }
  update(id:string, payload:UpdateTeamMemberPayload): Observable<TeamUser> { return this.http.put<TeamUser>(`${API_BASE_URL}/team/${id}`, payload); }
  resetPassword(id:string, newPassword:string): Observable<void> { return this.http.post<void>(`${API_BASE_URL}/team/${id}/reset-password`, { newPassword }); }
}
