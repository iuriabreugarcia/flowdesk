import { UserRole } from '../../core/auth/auth.models';

export interface TeamUser { id:string; name:string; email:string; role:UserRole; isActive:boolean; createdAtUtc:string; lastLoginAtUtc:string|null; }
export interface TeamSummary { totalUsers:number; activeUsers:number; inactiveUsers:number; administrators:number; }
export interface TeamListResponse { items:TeamUser[]; summary:TeamSummary; }
export interface CreateTeamMemberPayload { name:string; email:string; role:UserRole; password:string; }
export interface UpdateTeamMemberPayload { name:string; role:UserRole; isActive:boolean; }
