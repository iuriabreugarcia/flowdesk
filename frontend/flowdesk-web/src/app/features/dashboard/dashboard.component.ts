import { CurrencyPipe, NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { API_BASE_URL } from '../../core/config/api.config';

interface DashboardActivity {
  title: string;
  description: string;
  time: string;
  type: string;
}

interface DashboardSummary {
  companyName: string;
  revenue: number;
  openOrders: number;
  averageTicket: number;
  activeCustomers: number;
  revenueChangePercent: number;
  ordersChangePercent: number;
  activities: DashboardActivity[];
}

@Component({
    selector: 'app-dashboard',
    imports: [CurrencyPipe, NgClass],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <section class="page-header">
      <div>
        <span class="eyebrow">VISÃO GERAL</span>
        <h1>Dashboard</h1>
        <p>Acompanhe os principais indicadores da sua operação.</p>
      </div>
      <button class="action-button" type="button" (click)="goToOrders()">+ Nova ordem</button>
    </section>

    @if (loading()) {
      <div class="loading-grid">
        <span></span><span></span><span></span><span></span>
      </div>
    } @else if (summary()) {
      <section class="metrics-grid">
        <article class="metric-card">
          <div class="metric-icon">$</div>
          <div class="metric-top">
            <span>Receita mensal</span>
            <small
              class="change-badge"
              [class.negative]="summary()!.revenueChangePercent < 0"
            >
              {{ summary()!.revenueChangePercent >= 0 ? '↑' : '↓' }}
              {{ absolute(summary()!.revenueChangePercent) }}%
            </small>
          </div>
          <strong>{{ summary()!.revenue | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
          <p>comparado ao mês anterior</p>
        </article>

        <article class="metric-card">
          <div class="metric-icon">▦</div>
          <div class="metric-top">
            <span>Ordens abertas</span>
            <small
              class="change-badge"
              [class.negative]="summary()!.ordersChangePercent < 0"
            >
              {{ summary()!.ordersChangePercent >= 0 ? '↑' : '↓' }}
              {{ absolute(summary()!.ordersChangePercent) }}%
            </small>
          </div>
          <strong>{{ summary()!.openOrders }}</strong>
          <p>em diferentes etapas</p>
        </article>

        <article class="metric-card">
          <div class="metric-icon">◎</div>
          <div class="metric-top"><span>Ticket médio</span></div>
          <strong>{{ summary()!.averageTicket | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
          <p>média por ordem concluída</p>
        </article>

        <article class="metric-card">
          <div class="metric-icon">◉</div>
          <div class="metric-top"><span>Clientes ativos</span></div>
          <strong>{{ summary()!.activeCustomers }}</strong>
          <p>na base atual</p>
        </article>
      </section>

      <section class="dashboard-grid">
        <article class="panel chart-panel">
          <div class="panel-title">
            <div>
              <span>DESEMPENHO</span>
              <h2>Receita</h2>
            </div>
            <button type="button">Últimos 6 meses⌄</button>
          </div>

          <div class="chart" aria-label="Gráfico ilustrativo de receita">
            <div class="y-axis"><span>30k</span><span>20k</span><span>10k</span><span>0</span></div>
            <div class="plot">
              <div class="grid-line l1"></div><div class="grid-line l2"></div><div class="grid-line l3"></div><div class="grid-line l4"></div>
              <svg viewBox="0 0 700 230" preserveAspectRatio="none" role="img">
                <defs>
                  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#6d5dfc" stop-opacity=".2" />
                    <stop offset="100%" stop-color="#6d5dfc" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 190 C80 168, 105 170, 150 145 S250 120, 300 132 S390 112, 430 80 S520 92, 560 55 S635 42, 700 22 L700 230 L0 230 Z" fill="url(#fill)" />
                <path d="M0 190 C80 168, 105 170, 150 145 S250 120, 300 132 S390 112, 430 80 S520 92, 560 55 S635 42, 700 22" fill="none" stroke="#6d5dfc" stroke-width="4" stroke-linecap="round" />
              </svg>
              <div class="x-axis"><span>Abr</span><span>Mai</span><span>Jun</span><span>Jul</span><span>Ago</span><span>Set</span></div>
            </div>
          </div>
        </article>

        <article class="panel activity-panel">
          <div class="panel-title">
            <div>
              <span>ATUALIZAÇÕES</span>
              <h2>Atividade recente</h2>
            </div>
            <button class="text-button" type="button">Ver todas</button>
          </div>

          <div class="activity-list">
            @for (activity of summary()!.activities; track activity.title + activity.time) {
              <div class="activity-item">
                <span class="activity-dot" [ngClass]="activity.type"></span>
                <div>
                  <strong>{{ activity.title }}</strong>
                  <p>{{ activity.description }}</p>
                </div>
                <time>{{ activity.time }}</time>
              </div>
            }
          </div>
        </article>
      </section>
    } @else {
      <div class="error-state">Não foi possível carregar o dashboard.</div>
    }
  `,
    styles: [`
    .page-header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-end; margin-bottom: 28px; }
    .eyebrow, .panel-title span { color: var(--muted); font-size: 11px; font-weight: 800; letter-spacing: .14em; }
    h1 { margin: 8px 0 5px; font-size: 31px; line-height: 1; letter-spacing: -.04em; color: var(--text); }
    .page-header p { margin: 0; color: var(--muted); font-size: 15px; }
    .action-button { min-height: 40px; padding: 0 16px; border: 0; border-radius: 10px; color: white; background: #6d5dfc; font-size: 14px; font-weight: 800; box-shadow: 0 10px 25px rgba(109,93,252,.2); }
    .metrics-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
    .metric-card, .panel { border: 1px solid var(--border); border-radius: 15px; background: var(--surface); box-shadow: 0 8px 30px rgba(28,39,64,.035); }
    .metric-card { position: relative; padding: 19px; }
    .metric-icon { width: 33px; height: 33px; margin-bottom: 18px; display: grid; place-items: center; border-radius: 10px; color: #6757ef; background: #f0eeff; font-size: 16px; font-weight: 800; }
    .metric-top { min-height: 18px; display: flex; justify-content: space-between; gap: 8px; align-items: center; color: var(--muted); font-size: 13px; font-weight: 600; }
    .metric-card strong { display: block; margin-top: 7px; color: var(--text); font-size: 25px; letter-spacing: -.04em; }
    .metric-card p { margin: 6px 0 0; color: var(--muted); font-size: 11px; }
    .change-badge {
      padding: 3px 7px;
      border-radius: 6px;
      color: var(--success);
      background: color-mix(in srgb, var(--success) 12%, transparent);
      font-weight: 800;
    }
    .change-badge.negative {
      color: var(--danger);
      background: color-mix(in srgb, var(--danger) 12%, transparent);
    }
    .dashboard-grid { margin-top: 16px; display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(300px, .7fr); gap: 16px; }
    .panel { padding: 21px; }
    .panel-title { display: flex; justify-content: space-between; gap: 16px; align-items: center; }
    .panel-title h2 { margin: 5px 0 0; color: var(--text); font-size: 17px; letter-spacing: -.02em; }
    .panel-title button { min-height: 31px; padding: 0 10px; border: 1px solid var(--border); border-radius: 8px; color: var(--muted); background: var(--surface); font-size: 11px; }
    .panel-title .text-button { border: 0; color: #6d5dfc; font-weight: 700; }
    .chart { height: 280px; margin-top: 25px; display: grid; grid-template-columns: 34px 1fr; }
    .y-axis { padding: 3px 0 22px; display: flex; flex-direction: column; justify-content: space-between; color: var(--muted); font-size: 10px; }
    .plot { position: relative; min-width: 0; }
    .plot svg { position: absolute; inset: 0 0 22px; width: 100%; height: calc(100% - 22px); overflow: visible; }
    .grid-line { position: absolute; left: 0; right: 0; height: 1px; background: var(--border); }
    .grid-line.l1 { top: 0; }.grid-line.l2 { top: 33%; }.grid-line.l3 { top: 66%; }.grid-line.l4 { bottom: 22px; }
    .x-axis { position: absolute; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-between; color: var(--muted); font-size: 10px; }
    .activity-list { margin-top: 18px; display: grid; }
    .activity-item { min-height: 67px; display: grid; grid-template-columns: 10px minmax(0, 1fr) auto; gap: 11px; align-items: center; border-bottom: 1px solid #f0f2f6; }
    .activity-item:last-child { border-bottom: 0; }
    .activity-dot { width: 7px; height: 7px; border-radius: 50%; background: #6d5dfc; box-shadow: 0 0 0 4px #f0eeff; }
    .activity-dot.success { background: #20a779; box-shadow: 0 0 0 4px #e8f8f2; }
    .activity-dot.warning { background: #e69a21; box-shadow: 0 0 0 4px #fff5e4; }
    .activity-dot.customer { background: #4987ed; box-shadow: 0 0 0 4px #edf4ff; }
    .activity-item strong { display: block; color: var(--text); font-size: 12px; }
    .activity-item p { margin: 3px 0 0; color: var(--muted); font-size: 11px; }
    .activity-item time { color: var(--muted); font-size: 10px; white-space: nowrap; }
    .loading-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .loading-grid span { height: 145px; border-radius: 15px; background: linear-gradient(90deg, #eef1f6, #f8f9fb, #eef1f6); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
    @keyframes shimmer { to { background-position: -200% 0; } }
    .error-state { padding: 28px; border: 1px solid #ffd9df; border-radius: 14px; color: #a6394b; background: #fff4f6; }


    :host-context(html[data-theme='dark']) .metric-icon {
      color: #a99fff;
      background: #24213d;
    }
    :host-context(html[data-theme='dark']) .metric-card,
    :host-context(html[data-theme='dark']) .panel {
      box-shadow: 0 10px 28px rgba(0,0,0,.16);
    }
    :host-context(html[data-theme='dark']) .grid-line {
      background: #29344b;
    }

    @media (max-width: 1180px) { .metrics-grid { grid-template-columns: repeat(2, 1fr); } .dashboard-grid { grid-template-columns: 1fr; } }
    @media (max-width: 650px) { .page-header { align-items: flex-start; flex-direction: column; } .metrics-grid, .loading-grid { grid-template-columns: 1fr; } .action-button { width: 100%; } .chart { height: 230px; } }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly summary = signal<DashboardSummary | null>(null);

  absolute(value: number): number {
    return Math.abs(value);
  }

  goToOrders(): void {
    void this.router.navigate(['/ordens']);
  }

  ngOnInit(): void {
    this.http.get<DashboardSummary>(`${API_BASE_URL}/dashboard/summary`).subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.summary.set(null);
        this.loading.set(false);
      }
    });
  }
}
