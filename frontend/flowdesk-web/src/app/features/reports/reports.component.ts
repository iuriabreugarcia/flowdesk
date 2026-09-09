import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import {
  OrderStatusBreakdown,
  ReportRange,
  ReportsOverview,
  TopMovedProduct
} from './report.models';
import { ReportsService } from './reports.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, DecimalPipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-header">
      <div>
        <span class="eyebrow">ANALYTICS</span>
        <h1>Relatórios</h1>
        <p>Transforme operação, ordens e estoque em indicadores para tomada de decisão.</p>
      </div>

      <div class="header-actions">
        <label class="range-select">
          <span>Período</span>
          <select [formControl]="rangeControl">
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="6m">Últimos 6 meses</option>
            <option value="12m">Últimos 12 meses</option>
          </select>
        </label>

        @if (auth.canManageCatalog()) {
          <button class="export-button" type="button" [disabled]="exporting()" (click)="exportOrders()">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path>
            </svg>
            {{ exporting() ? 'Exportando…' : 'Exportar CSV' }}
          </button>
        }
      </div>
    </section>

    @if (loading()) {
      <section class="loading-grid">
        @for (item of skeletons; track item) { <span></span> }
      </section>
    } @else if (error()) {
      <section class="error-state">
        <div>!</div>
        <h2>Não foi possível carregar os relatórios</h2>
        <p>{{ error() }}</p>
        <button type="button" (click)="loadReports()">Tentar novamente</button>
      </section>
    } @else {
      @if (overview(); as report) {
      <div class="period-line">
        <span class="live-dot"></span>
        <strong>{{ report.period.label }}</strong>
        <span>{{ report.period.startUtc | date:'dd/MM/yyyy' }} — {{ report.period.endUtc | date:'dd/MM/yyyy' }}</span>
      </div>

      <section class="kpi-grid">
        <article class="kpi-card featured">
          <div class="kpi-heading">
            <span class="kpi-icon">R$</span>
            <span class="change-chip" [class.negative]="report.kpis.revenueChangePercent < 0">
              {{ report.kpis.revenueChangePercent >= 0 ? '↑' : '↓' }} {{ absolute(report.kpis.revenueChangePercent) | number:'1.0-1' }}%
            </span>
          </div>
          <small>Receita realizada</small>
          <strong>{{ report.kpis.revenue | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
          <p>ordens concluídas no período</p>
        </article>

        <article class="kpi-card">
          <span class="kpi-icon purple">✓</span>
          <small>Taxa de conclusão</small>
          <strong>{{ report.kpis.completionRate | number:'1.0-1' }}%</strong>
          <p>{{ report.kpis.completedOrders }} concluídas de {{ report.kpis.ordersCreated }} criadas</p>
        </article>

        <article class="kpi-card">
          <span class="kpi-icon blue">◎</span>
          <small>Ticket médio</small>
          <strong>{{ report.kpis.averageTicket | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
          <p>valor médio por ordem concluída</p>
        </article>

        <article class="kpi-card">
          <span class="kpi-icon amber">↗</span>
          <small>Pipeline aberto</small>
          <strong>{{ report.kpis.openPipeline | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
          <p>{{ report.kpis.openOrders }} ordens ainda em andamento</p>
        </article>
      </section>

      <section class="quick-metrics">
        <div><span>Ordens criadas</span><strong>{{ report.kpis.ordersCreated }}</strong></div>
        <div><span>Clientes movimentados</span><strong>{{ report.kpis.activeCustomers }}</strong></div>
        <div><span>Lead time médio</span><strong>{{ leadTimeLabel(report.kpis.averageLeadTimeHours) }}</strong></div>
        <div><span>Movimentos de estoque</span><strong>{{ report.inventory.movementsInPeriod }}</strong></div>
      </section>

      <section class="analytics-grid primary-grid">
        <article class="panel revenue-panel">
          <header class="panel-header">
            <div>
              <span class="section-kicker">DESEMPENHO</span>
              <h2>Receita ao longo do período</h2>
              <p>Valores realizados com base em ordens concluídas.</p>
            </div>
            <span class="panel-total">{{ report.kpis.revenue | currency:'BRL':'symbol':'1.0-0':'pt-BR' }}</span>
          </header>

          <div class="revenue-chart">
            <div class="chart-grid-lines"><i></i><i></i><i></i><i></i></div>
            <div class="bars" [style.grid-template-columns]="'repeat(' + report.revenueTrend.length + ', minmax(34px, 1fr))'">
              @for (point of report.revenueTrend; track point.key) {
                <div class="bar-column" [title]="point.label + ': ' + currencyText(point.revenue)">
                  <div class="bar-value">{{ compactMoney(point.revenue) }}</div>
                  <div class="bar-track">
                    <span class="bar-fill" [style.height.%]="revenueBarHeight(point.revenue)"></span>
                  </div>
                  <strong>{{ point.label }}</strong>
                  <small>{{ point.completedOrders }} concluída{{ point.completedOrders === 1 ? '' : 's' }}</small>
                </div>
              }
            </div>
          </div>
        </article>

        <article class="panel status-panel">
          <header class="panel-header compact">
            <div>
              <span class="section-kicker">CARTEIRA ATUAL</span>
              <h2>Ordens por status</h2>
            </div>
          </header>

          <div class="donut-area">
            <div class="donut" [style.background]="donutBackground()">
              <div class="donut-hole">
                <strong>{{ statusTotal() }}</strong>
                <span>ordens</span>
              </div>
            </div>

            <div class="status-legend">
              @for (item of report.ordersByStatus; track item.status) {
                <div class="legend-row">
                  <span class="legend-dot" [class]="'legend-dot ' + statusClass(item.status)"></span>
                  <div><strong>{{ item.label }}</strong><small>{{ item.value | currency:'BRL':'symbol':'1.0-0':'pt-BR' }}</small></div>
                  <b>{{ item.count }}</b>
                </div>
              }
            </div>
          </div>
        </article>
      </section>

      <section class="analytics-grid secondary-grid">
        <article class="panel customers-panel">
          <header class="panel-header compact">
            <div>
              <span class="section-kicker">CLIENTES</span>
              <h2>Maiores receitas</h2>
              <p>Participação por cliente nas ordens concluídas.</p>
            </div>
          </header>

          @if (report.topCustomers.length === 0) {
            <div class="panel-empty">Nenhuma receita concluída neste período.</div>
          } @else {
            <div class="ranking-list">
              @for (customer of report.topCustomers; track customer.customerId; let position = $index) {
                <div class="ranking-row">
                  <span class="rank">{{ position + 1 }}</span>
                  <div class="rank-main">
                    <div class="rank-title"><strong>{{ customer.customerName }}</strong><b>{{ customer.revenue | currency:'BRL':'symbol':'1.0-0':'pt-BR' }}</b></div>
                    <div class="progress-track"><span [style.width.%]="customer.sharePercent"></span></div>
                    <small>{{ customer.completedOrders }} {{ customer.completedOrders === 1 ? 'ordem' : 'ordens' }} · {{ customer.sharePercent | number:'1.0-1' }}% da receita</small>
                  </div>
                </div>
              }
            </div>
          }
        </article>

        <article class="panel inventory-panel">
          <header class="panel-header compact">
            <div>
              <span class="section-kicker">INVENTÁRIO</span>
              <h2>Saúde do estoque</h2>
              <p>Capital imobilizado e disponibilidade operacional.</p>
            </div>
          </header>

          <div class="inventory-values">
            <div><span>Valor em custo</span><strong>{{ report.inventory.costValue | currency:'BRL':'symbol':'1.0-0':'pt-BR' }}</strong></div>
            <div><span>Potencial de venda</span><strong>{{ report.inventory.saleValue | currency:'BRL':'symbol':'1.0-0':'pt-BR' }}</strong></div>
          </div>

          <div class="inventory-margin">
            <span>Margem potencial em estoque</span>
            <strong>{{ report.inventory.potentialMargin | currency:'BRL':'symbol':'1.0-0':'pt-BR' }}</strong>
          </div>

          <div class="stock-health">
            <div class="health-item success"><span></span><div><strong>{{ healthyProducts(report) }}</strong><small>Estoque saudável</small></div></div>
            <div class="health-item warning"><span></span><div><strong>{{ report.inventory.lowStockProducts }}</strong><small>Estoque baixo</small></div></div>
            <div class="health-item danger"><span></span><div><strong>{{ report.inventory.outOfStockProducts }}</strong><small>Sem estoque</small></div></div>
          </div>
        </article>
      </section>

      <section class="analytics-grid tertiary-grid">
        <article class="panel movements-panel">
          <header class="panel-header compact">
            <div>
              <span class="section-kicker">ESTOQUE</span>
              <h2>Produtos mais movimentados</h2>
              <p>Volume absoluto de entradas, saídas e ajustes.</p>
            </div>
          </header>

          @if (report.topMovedProducts.length === 0) {
            <div class="panel-empty">Nenhuma movimentação no período selecionado.</div>
          } @else {
            <div class="movement-list">
              @for (product of report.topMovedProducts; track product.productId) {
                <div class="movement-row">
                  <div class="product-identification">
                    <span>{{ initials(product.productName) }}</span>
                    <div><strong>{{ product.productName }}</strong><small>{{ product.sku }} · {{ product.movements }} movimento{{ product.movements === 1 ? '' : 's' }}</small></div>
                  </div>
                  <div class="movement-meter">
                    <div><span [style.width.%]="movementWidth(product)"></span></div>
                    <small>{{ product.movedQuantity | number:'1.0-3' }} {{ product.unit }} movimentadas</small>
                  </div>
                  <strong class="current-stock">{{ product.currentStock | number:'1.0-3' }} <small>{{ product.unit }}</small></strong>
                </div>
              }
            </div>
          }
        </article>

        <article class="panel completed-panel">
          <header class="panel-header compact">
            <div>
              <span class="section-kicker">RESULTADOS</span>
              <h2>Conclusões recentes</h2>
              <p>Últimas ordens finalizadas no período.</p>
            </div>
          </header>

          @if (report.recentCompletedOrders.length === 0) {
            <div class="panel-empty">Nenhuma ordem concluída neste período.</div>
          } @else {
            <div class="completed-list">
              @for (order of report.recentCompletedOrders; track order.id) {
                <div class="completed-row">
                  <span class="completed-check">✓</span>
                  <div class="completed-main">
                    <strong>{{ order.number }} · {{ order.title }}</strong>
                    <small>{{ order.customerName }} · {{ order.completedAtUtc | date:'dd/MM/yyyy' }}</small>
                  </div>
                  <b>{{ order.value | currency:'BRL':'symbol':'1.0-0':'pt-BR' }}</b>
                </div>
              }
            </div>
          }
        </article>
      </section>
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 18px; }
    .eyebrow, .section-kicker { color: #6d5dfc; font-size: 11px; font-weight: 900; letter-spacing: .14em; }
    h1 { margin: 8px 0 5px; color: #1d2538; font-size: 31px; line-height: 1; letter-spacing: -.04em; }
    .page-header p { margin: 0; color: #7d8699; font-size: 15px; }
    .header-actions { display: flex; align-items: flex-end; gap: 10px; }
    .range-select { display: grid; gap: 5px; }
    .range-select span { color: #8a93a5; font-size: 11px; font-weight: 800; }
    .range-select select { min-width: 172px; height: 42px; padding: 0 36px 0 12px; border: 1px solid #dfe4ec; border-radius: 10px; color: #424c60; background: #fff; font: inherit; font-size: 13px; font-weight: 700; }
    .export-button { height: 42px; padding: 0 14px; display: inline-flex; align-items: center; gap: 8px; border: 0; border-radius: 10px; color: #fff; background: #1d2330; font: inherit; font-size: 13px; font-weight: 800; cursor: pointer; box-shadow: 0 9px 22px rgba(29,35,48,.15); }
    .export-button svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
    .export-button:disabled { opacity: .6; cursor: wait; }
    .period-line { min-height: 34px; margin-bottom: 14px; padding: 0 2px; display: flex; align-items: center; gap: 8px; color: #9199a9; font-size: 12px; }
    .period-line strong { color: #4e576b; }
    .live-dot { width: 7px; height: 7px; border-radius: 50%; background: #24ad7c; box-shadow: 0 0 0 4px #e9f8f3; }

    .kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
    .kpi-card, .panel, .quick-metrics { border: 1px solid #e4e8ef; border-radius: 15px; background: #fff; box-shadow: 0 8px 30px rgba(25,35,58,.035); }
    .kpi-card { min-height: 156px; padding: 18px; }
    .kpi-card.featured { color: #fff; border-color: #202633; background: #202633; }
    .kpi-heading { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    .kpi-icon { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; color: #fff; background: rgba(255,255,255,.11); font-size: 13px; font-weight: 900; }
    .kpi-icon.purple { color: #6d5dfc; background: #f0eeff; }
    .kpi-icon.blue { color: #367de8; background: #edf5ff; }
    .kpi-icon.amber { color: #d58a16; background: #fff5e4; }
    .change-chip { padding: 4px 7px; border-radius: 7px; color: #127a59; background: #dcf6ec; font-size: 11px; font-weight: 900; }
    .change-chip.negative { color: #b43f51; background: #ffecef; }
    .kpi-card > small { display: block; margin-top: 15px; color: #7f889b; font-size: 12px; font-weight: 700; }
    .featured > small { color: #aeb6c6; }
    .kpi-card > strong { display: block; margin-top: 5px; color: #20283a; font-size: 24px; letter-spacing: -.04em; }
    .featured > strong { color: #fff; }
    .kpi-card p { margin: 5px 0 0; color: #9ca4b3; font-size: 11px; }
    .featured p { color: #828da2; }

    .quick-metrics { margin-top: 14px; padding: 13px 18px; display: grid; grid-template-columns: repeat(4, 1fr); }
    .quick-metrics div { padding: 3px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-right: 1px solid #edf0f4; }
    .quick-metrics div:first-child { padding-left: 0; }.quick-metrics div:last-child { padding-right: 0; border-right: 0; }
    .quick-metrics span { color: #858ea0; font-size: 12px; }.quick-metrics strong { color: #2b3448; font-size: 16px; }

    .analytics-grid { display: grid; gap: 14px; margin-top: 14px; }
    .primary-grid { grid-template-columns: minmax(0, 1.7fr) minmax(310px, .8fr); }
    .secondary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .tertiary-grid { grid-template-columns: minmax(0, 1.25fr) minmax(330px, .75fr); }
    .panel { min-width: 0; padding: 19px; }
    .panel-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .panel-header h2 { margin: 5px 0 3px; color: #263046; font-size: 17px; letter-spacing: -.02em; }
    .panel-header p { margin: 0; color: #929aac; font-size: 11px; }
    .panel-total { color: #3a4356; font-size: 18px; font-weight: 900; white-space: nowrap; }

    .revenue-chart { position: relative; height: 270px; margin-top: 21px; }
    .chart-grid-lines { position: absolute; inset: 20px 0 42px; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; }
    .chart-grid-lines i { height: 1px; background: #f0f2f6; }
    .bars { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(var(--bars, 6), minmax(34px, 1fr)); gap: 9px; align-items: end; }
    .bar-column { min-width: 0; height: 100%; display: grid; grid-template-rows: 21px 1fr 18px 18px; align-items: end; text-align: center; }
    .bar-value { color: #8992a4; font-size: 10px; font-weight: 800; white-space: nowrap; }
    .bar-track { position: relative; height: 100%; min-height: 120px; display: flex; align-items: flex-end; justify-content: center; border-radius: 8px 8px 3px 3px; overflow: hidden; }
    .bar-fill { width: min(48px, 64%); min-height: 3px; border-radius: 8px 8px 3px 3px; background: linear-gradient(180deg, #7767ff, #5e4fe8); box-shadow: 0 8px 18px rgba(109,93,252,.17); transition: height .3s ease; }
    .bar-column strong { color: #596378; font-size: 11px; text-transform: capitalize; }
    .bar-column small { overflow: hidden; color: #a2a9b8; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }

    .donut-area { min-height: 270px; display: grid; grid-template-columns: 138px 1fr; gap: 22px; align-items: center; }
    .donut { width: 138px; height: 138px; display: grid; place-items: center; border-radius: 50%; background: #f0f2f6; }
    .donut-hole { width: 88px; height: 88px; display: grid; place-content: center; text-align: center; border-radius: 50%; background: #fff; box-shadow: 0 0 0 1px #eef1f5; }
    .donut-hole strong { color: #273046; font-size: 24px; }.donut-hole span { color: #9aa2b1; font-size: 10px; }
    .status-legend { display: grid; }
    .legend-row { min-height: 52px; display: grid; grid-template-columns: 9px 1fr auto; gap: 9px; align-items: center; border-bottom: 1px solid #f0f2f6; }
    .legend-row:last-child { border-bottom: 0; }
    .legend-dot { width: 8px; height: 8px; border-radius: 50%; }.legend-dot.new { background: #7b6cff; }.legend-dot.progress { background: #4489ee; }.legend-dot.waiting { background: #e7a025; }.legend-dot.done { background: #24ad7c; }
    .legend-row div { display: grid; gap: 2px; }.legend-row strong { color: #495368; font-size: 11px; }.legend-row small { color: #a0a7b6; font-size: 9px; }.legend-row b { color: #2c3549; font-size: 14px; }

    .ranking-list { margin-top: 15px; display: grid; }
    .ranking-row { min-height: 63px; display: grid; grid-template-columns: 29px 1fr; gap: 10px; align-items: center; border-bottom: 1px solid #f1f3f6; }
    .ranking-row:last-child { border-bottom: 0; }
    .rank { width: 26px; height: 26px; display: grid; place-items: center; border-radius: 8px; color: #6d5dfc; background: #f1efff; font-size: 11px; font-weight: 900; }
    .rank-main { display: grid; gap: 5px; }.rank-title { display: flex; justify-content: space-between; gap: 10px; }.rank-title strong { color: #414b60; font-size: 11px; }.rank-title b { color: #2a3347; font-size: 11px; white-space: nowrap; }
    .progress-track { height: 5px; overflow: hidden; border-radius: 999px; background: #f0f2f6; }.progress-track span { display: block; height: 100%; border-radius: inherit; background: #6d5dfc; }
    .rank-main small { color: #9ca4b3; font-size: 9px; }

    .inventory-values { margin-top: 17px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .inventory-values div { padding: 13px; border: 1px solid #edf0f4; border-radius: 11px; background: #fafbfc; }
    .inventory-values span, .inventory-margin span { display: block; color: #8d96a7; font-size: 10px; }.inventory-values strong { display: block; margin-top: 5px; color: #293247; font-size: 17px; }
    .inventory-margin { margin-top: 10px; padding: 13px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-radius: 11px; color: #fff; background: #252c3a; }.inventory-margin span { color: #aeb6c5; }.inventory-margin strong { font-size: 16px; }
    .stock-health { margin-top: 14px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .health-item { padding: 10px; display: flex; gap: 8px; align-items: center; border: 1px solid #eef1f4; border-radius: 10px; }.health-item > span { width: 8px; height: 8px; flex: 0 0 auto; border-radius: 50%; }.health-item.success > span { background: #22a879; }.health-item.warning > span { background: #e49b21; }.health-item.danger > span { background: #de5365; }
    .health-item div { display: grid; }.health-item strong { color: #384156; font-size: 13px; }.health-item small { color: #9aa2b1; font-size: 9px; }

    .movement-list, .completed-list { margin-top: 14px; display: grid; }
    .movement-row { min-height: 64px; display: grid; grid-template-columns: minmax(190px, 1.1fr) minmax(145px, .9fr) 76px; gap: 14px; align-items: center; border-bottom: 1px solid #f0f2f5; }.movement-row:last-child { border-bottom: 0; }
    .product-identification { min-width: 0; display: flex; gap: 9px; align-items: center; }.product-identification > span { width: 31px; height: 31px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 9px; color: #6d5dfc; background: #efedff; font-size: 9px; font-weight: 900; }.product-identification div { min-width: 0; display: grid; gap: 3px; }.product-identification strong { overflow: hidden; color: #434d61; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.product-identification small { color: #9ba3b2; font-size: 9px; }
    .movement-meter { display: grid; gap: 5px; }.movement-meter > div { height: 6px; overflow: hidden; border-radius: 999px; background: #f0f2f6; }.movement-meter > div span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #6d5dfc, #8d80ff); }.movement-meter small { color: #929bab; font-size: 9px; }.current-stock { color: #354056; font-size: 13px; text-align: right; }.current-stock small { color: #9ba3b2; font-size: 8px; }

    .completed-row { min-height: 64px; display: grid; grid-template-columns: 29px 1fr auto; gap: 9px; align-items: center; border-bottom: 1px solid #f0f2f5; }.completed-row:last-child { border-bottom: 0; }.completed-check { width: 27px; height: 27px; display: grid; place-items: center; border-radius: 50%; color: #16835f; background: #e7f7f1; font-size: 11px; font-weight: 900; }.completed-main { min-width: 0; display: grid; gap: 3px; }.completed-main strong { overflow: hidden; color: #465065; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }.completed-main small { color: #9ba3b2; font-size: 9px; }.completed-row > b { color: #263045; font-size: 11px; white-space: nowrap; }

    .panel-empty { min-height: 190px; display: grid; place-items: center; color: #9aa3b2; font-size: 12px; text-align: center; }
    .loading-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }.loading-grid span { height: 156px; border-radius: 15px; background: linear-gradient(90deg, #edf0f4 25%, #f8f9fb 50%, #edf0f4 75%); background-size: 200% 100%; animation: shimmer 1.35s infinite; } @keyframes shimmer { to { background-position: -200% 0; } }
    .error-state { padding: 40px; display: grid; justify-items: center; gap: 8px; border: 1px solid #ffd9df; border-radius: 15px; background: #fff6f7; text-align: center; }.error-state > div { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 50%; color: #b64153; background: #ffe7eb; font-weight: 900; }.error-state h2 { margin: 4px 0 0; color: #713844; font-size: 17px; }.error-state p { margin: 0; color: #a06370; font-size: 12px; }.error-state button { margin-top: 5px; min-height: 36px; padding: 0 14px; border: 0; border-radius: 9px; color: #fff; background: #6d5dfc; font-weight: 800; }

    @media (max-width: 1180px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .primary-grid, .secondary-grid, .tertiary-grid { grid-template-columns: 1fr; }
      .revenue-chart { height: 250px; }
    }
    @media (max-width: 760px) {
      .page-header { align-items: stretch; flex-direction: column; }
      .header-actions { align-items: stretch; }
      .range-select { flex: 1; }.range-select select { width: 100%; }
      .quick-metrics { grid-template-columns: repeat(2, 1fr); }.quick-metrics div { border-right: 0; border-bottom: 1px solid #edf0f4; padding: 9px; }.quick-metrics div:nth-last-child(-n+2) { border-bottom: 0; }
      .donut-area { grid-template-columns: 1fr; justify-items: center; }.status-legend { width: 100%; }
      .movement-row { grid-template-columns: 1fr 82px; }.movement-meter { grid-column: 1 / -1; grid-row: 2; }
    }
    @media (max-width: 560px) {
      .kpi-grid, .loading-grid { grid-template-columns: 1fr; }
      .header-actions { flex-direction: column; }
      .export-button { justify-content: center; }
      .quick-metrics { grid-template-columns: 1fr; }.quick-metrics div { border-bottom: 1px solid #edf0f4 !important; }.quick-metrics div:last-child { border-bottom: 0 !important; }
      .inventory-values, .stock-health { grid-template-columns: 1fr; }
      .revenue-chart { overflow-x: auto; }.bars { min-width: 560px; }
      .completed-row { grid-template-columns: 29px 1fr; }.completed-row > b { grid-column: 2; }
    }
  `]
})
export class ReportsComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly reportsService = inject(ReportsService);
  private readonly subscription = new Subscription();

  readonly rangeControl = new FormControl<ReportRange>('6m', { nonNullable: true });
  readonly loading = signal(true);
  readonly exporting = signal(false);
  readonly error = signal('');
  readonly overview = signal<ReportsOverview | null>(null);
  readonly skeletons = [1, 2, 3, 4];

  readonly maxRevenue = computed(() => Math.max(0, ...(this.overview()?.revenueTrend.map(point => point.revenue) ?? [0])));
  readonly maxMovedQuantity = computed(() => Math.max(0, ...(this.overview()?.topMovedProducts.map(product => product.movedQuantity) ?? [0])));
  readonly statusTotal = computed(() => (this.overview()?.ordersByStatus ?? []).reduce((total, item) => total + item.count, 0));
  readonly donutBackground = computed(() => this.buildDonutGradient(this.overview()?.ordersByStatus ?? []));

  ngOnInit(): void {
    this.loadReports();
    this.subscription.add(
      this.rangeControl.valueChanges.subscribe(() => this.loadReports())
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadReports(): void {
    this.loading.set(true);
    this.error.set('');

    this.reportsService.overview(this.rangeControl.value).subscribe({
      next: (report) => {
        this.overview.set(report);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(error?.error?.message ?? 'Verifique se a API está disponível e tente novamente.');
      }
    });
  }

  exportOrders(): void {
    if (this.exporting()) return;

    this.exporting.set(true);
    this.reportsService.exportOrders(this.rangeControl.value).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `flowdesk-ordens-${this.rangeControl.value}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => {
        this.exporting.set(false);
        this.error.set('Não foi possível exportar o CSV. Seu perfil pode não ter permissão para esta ação.');
      }
    });
  }

  revenueBarHeight(value: number): number {
    const max = this.maxRevenue();
    if (max <= 0 || value <= 0) return 2;
    return Math.max(8, Math.round((value / max) * 100));
  }

  movementWidth(product: TopMovedProduct): number {
    const max = this.maxMovedQuantity();
    if (max <= 0 || product.movedQuantity <= 0) return 0;
    return Math.max(5, Math.round((product.movedQuantity / max) * 100));
  }

  healthyProducts(report: ReportsOverview): number {
    return Math.max(0, report.inventory.activeProducts - report.inventory.lowStockProducts - report.inventory.outOfStockProducts);
  }

  leadTimeLabel(hours: number): string {
    if (!hours) return '—';
    if (hours < 24) return `${Math.round(hours)} h`;
    return `${(hours / 24).toFixed(1).replace('.', ',')} dias`;
  }

  compactMoney(value: number): string {
    if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')} mi`;
    if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1).replace('.', ',')}k`;
    return `R$ ${Math.round(value)}`;
  }

  currencyText(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');
  }

  absolute(value: number): number {
    return Math.abs(value);
  }

  statusClass(status: string): string {
    return status === 'IN_PROGRESS' ? 'progress' : status === 'WAITING' ? 'waiting' : status === 'DONE' ? 'done' : 'new';
  }

  private buildDonutGradient(items: OrderStatusBreakdown[]): string {
    const total = items.reduce((sum, item) => sum + item.count, 0);
    if (total <= 0) return '#eef1f5';

    const colors: Record<string, string> = {
      NEW: '#7b6cff',
      IN_PROGRESS: '#4489ee',
      WAITING: '#e7a025',
      DONE: '#24ad7c'
    };

    let cursor = 0;
    const parts: string[] = [];

    for (const item of items) {
      const start = cursor;
      cursor += (item.count / total) * 100;
      parts.push(`${colors[item.status] ?? '#aab1be'} ${start.toFixed(1)}% ${cursor.toFixed(1)}%`);
    }

    return `conic-gradient(${parts.join(', ')})`;
  }
}
