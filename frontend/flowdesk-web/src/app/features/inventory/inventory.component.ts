import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize, merge } from 'rxjs';
import { ProductListItem } from '../products/product.models';
import { ProductsService } from '../products/products.service';
import {
  InventorySummary,
  MovementPagedResponse,
  MovementType,
  StockMovement,
  StockMovementPayload
} from './inventory.models';
import { InventoryService } from './inventory.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
    selector: 'app-inventory',
    imports: [CommonModule, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <section class="page-shell">
      <header class="page-header">
        <div>
          <span class="eyebrow">OPERAÇÃO</span>
          <h1>Estoque</h1>
          <p>Acompanhe saldos, alertas e o histórico completo de movimentações.</p>
        </div>
        @if (auth.canManageCatalog()) {<button class="primary-button" type="button" (click)="openMovement()"><span>↕</span> Movimentar estoque</button>}
      </header>

      @if (summaryLoading()) {
        <div class="summary-loading"><span></span><span></span><span></span><span></span></div>
      } @else if (summary()) {
        <div class="summary-grid">
          <article class="summary-card accent-card">
            <span class="metric-icon">▦</span>
            <div><small>Produtos ativos</small><strong>{{ summary()!.activeProducts }}</strong></div>
          </article>
          <article class="summary-card warning-card">
            <span class="metric-icon">!</span>
            <div><small>Estoque baixo</small><strong>{{ summary()!.lowStockProducts }}</strong></div>
          </article>
          <article class="summary-card danger-card">
            <span class="metric-icon">0</span>
            <div><small>Sem estoque</small><strong>{{ summary()!.outOfStockProducts }}</strong></div>
          </article>
          <article class="summary-card">
            <span class="metric-icon">R$</span>
            <div><small>Valor em custo</small><strong>{{ summary()!.inventoryCostValue | currency:'BRL':'symbol':'1.0-0':'pt-BR' }}</strong></div>
          </article>
        </div>

        <section class="inventory-grid">
          <article class="panel alerts-panel">
            <div class="panel-header">
              <div><span>ATENÇÃO</span><h2>Reposição necessária</h2></div>
              <small>{{ summary()!.lowStockItems.length }} prioridade{{ summary()!.lowStockItems.length === 1 ? '' : 's' }}</small>
            </div>

            @if (summary()!.lowStockItems.length === 0) {
              <div class="all-good"><span>✓</span><div><strong>Estoque saudável</strong><p>Nenhum item está abaixo do mínimo.</p></div></div>
            } @else {
              <div class="alert-list">
                @for (product of summary()!.lowStockItems; track product.id) {
                  <button type="button" class="alert-item" [disabled]="!auth.canManageCatalog()" (click)="openMovement(product.id)">
                    <span class="alert-icon" [class.out]="product.stockStatus === 'OUT'">{{ product.stockStatus === 'OUT' ? '0' : '!' }}</span>
                    <span class="alert-product"><strong>{{ product.name }}</strong><small>{{ product.sku }} · {{ product.category || 'Sem categoria' }}</small></span>
                    <span class="alert-stock"><strong>{{ product.currentStock | number:'1.0-3' }} {{ product.unit }}</strong><small>Mín. {{ product.minimumStock | number:'1.0-3' }}</small></span>
                  </button>
                }
              </div>
            }
          </article>

          <article class="panel value-panel">
            <div class="panel-header"><div><span>VALORIZAÇÃO</span><h2>Posição financeira</h2></div></div>
            <div class="value-main">
              <span>Valor potencial de venda</span>
              <strong>{{ summary()!.inventorySaleValue | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
              <small>Baseado no saldo atual × preço de venda.</small>
            </div>
            <div class="value-comparison">
              <div><small>Custo imobilizado</small><strong>{{ summary()!.inventoryCostValue | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong></div>
              <div><small>Margem potencial</small><strong>{{ potentialMargin() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong></div>
            </div>
          </article>
        </section>
      }

      <section class="panel movements-panel">
        <div class="movements-heading">
          <div><span class="eyebrow">AUDITORIA</span><h2>Movimentações recentes</h2></div>
          <small>{{ movements().totalItems }} registro{{ movements().totalItems === 1 ? '' : 's' }}</small>
        </div>

        <div class="toolbar">
          <label class="search-box"><span>⌕</span><input type="search" [formControl]="searchControl" placeholder="Buscar produto, SKU ou observação" /></label>
          <select [formControl]="typeControl" aria-label="Filtrar tipo">
            <option value="">Todos os tipos</option>
            <option value="INITIAL">Saldo inicial</option>
            <option value="ENTRY">Entradas</option>
            <option value="EXIT">Saídas</option>
            <option value="ADJUSTMENT">Ajustes</option>
          </select>
        </div>

        @if (movementsLoading()) {
          <div class="movement-skeleton">@for (row of skeletonRows; track row) { <span></span> }</div>
        } @else if (movements().items.length === 0) {
          <div class="empty-state"><span>↕</span><h3>Nenhuma movimentação encontrada</h3><p>Faça uma entrada, saída ou ajuste para iniciar o histórico.</p></div>
        } @else {
          <div class="table-wrap desktop-table">
            <table>
              <thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th>Movimento</th><th>Saldo</th><th>Responsável</th></tr></thead>
              <tbody>
                @for (movement of movements().items; track movement.id) {
                  <tr>
                    <td><div class="date-cell"><strong>{{ movement.createdAtUtc | date:'dd/MM/yyyy' }}</strong><small>{{ movement.createdAtUtc | date:'HH:mm' }}</small></div></td>
                    <td><div class="product-cell"><strong>{{ movement.productName }}</strong><small>{{ movement.productSku }}{{ movement.note ? ' · ' + movement.note : '' }}</small></div></td>
                    <td><span class="type-badge" [class.entry]="movement.type === 'ENTRY' || movement.type === 'INITIAL'" [class.exit]="movement.type === 'EXIT'">{{ movementTypeLabel(movement.type) }}</span></td>
                    <td><strong class="movement-quantity" [class.positive]="movement.quantity > 0" [class.negative]="movement.quantity < 0">{{ signedQuantity(movement.quantity) }}</strong></td>
                    <td><span>{{ movement.stockBefore | number:'1.0-3' }} → <strong>{{ movement.stockAfter | number:'1.0-3' }}</strong></span></td>
                    <td><span class="user-pill">{{ movement.userName || 'Sistema' }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="mobile-list">
            @for (movement of movements().items; track movement.id) {
              <article class="mobile-card">
                <div class="mobile-head"><div><strong>{{ movement.productName }}</strong><small>{{ movement.productSku }}</small></div><span class="type-badge" [class.entry]="movement.type === 'ENTRY' || movement.type === 'INITIAL'" [class.exit]="movement.type === 'EXIT'">{{ movementTypeLabel(movement.type) }}</span></div>
                <div class="mobile-values"><span>Movimento <strong [class.positive]="movement.quantity > 0" [class.negative]="movement.quantity < 0">{{ signedQuantity(movement.quantity) }}</strong></span><span>Saldo <strong>{{ movement.stockAfter | number:'1.0-3' }}</strong></span></div>
                <small>{{ movement.createdAtUtc | date:'dd/MM/yyyy HH:mm' }} · {{ movement.userName || 'Sistema' }}</small>
              </article>
            }
          </div>
        }

        @if (!movementsLoading() && movements().totalItems > 0) {
          <footer class="pagination"><span>Página <strong>{{ movements().page }}</strong> de <strong>{{ movementTotalPages() }}</strong></span><div><button type="button" [disabled]="movements().page <= 1" (click)="loadMovements(movements().page - 1)">← Anterior</button><button type="button" [disabled]="movements().page >= movementTotalPages()" (click)="loadMovements(movements().page + 1)">Próxima →</button></div></footer>
        }
      </section>
    </section>

    @if (drawerOpen()) {
      <button class="drawer-backdrop" type="button" aria-label="Fechar" (click)="closeDrawer()"></button>
      <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="movement-title">
        <header class="drawer-header">
          <div><span class="eyebrow">MOVIMENTAÇÃO</span><h2 id="movement-title">Atualizar estoque</h2><p>Registre cada alteração de saldo com rastreabilidade.</p></div>
          <button type="button" aria-label="Fechar" (click)="closeDrawer()">×</button>
        </header>

        <form class="movement-form" [formGroup]="movementForm" (ngSubmit)="saveMovement()">
          <label class="field">
            <span>Produto *</span>
            <select formControlName="productId">
              <option value="">Selecione um produto</option>
              @for (product of productOptions(); track product.id) {
                <option [value]="product.id">{{ product.sku }} — {{ product.name }}</option>
              }
            </select>
            @if (movementForm.controls.productId.touched && movementForm.controls.productId.invalid) { <small class="field-error">Selecione o produto.</small> }
          </label>

          @if (selectedProduct()) {
            <div class="selected-product">
              <span class="product-mark">{{ productInitials(selectedProduct()!.name) }}</span>
              <div><strong>{{ selectedProduct()!.name }}</strong><small>Saldo atual: {{ selectedProduct()!.currentStock | number:'1.0-3' }} {{ selectedProduct()!.unit }} · mínimo {{ selectedProduct()!.minimumStock | number:'1.0-3' }}</small></div>
            </div>
          }

          <div class="movement-types">
            <button type="button" [class.active]="movementForm.controls.type.value === 'ENTRY'" (click)="setMovementType('ENTRY')"><span>+</span><strong>Entrada</strong><small>Adicionar saldo</small></button>
            <button type="button" [class.active]="movementForm.controls.type.value === 'EXIT'" (click)="setMovementType('EXIT')"><span>−</span><strong>Saída</strong><small>Baixar saldo</small></button>
            <button type="button" [class.active]="movementForm.controls.type.value === 'ADJUSTMENT'" (click)="setMovementType('ADJUSTMENT')"><span>↻</span><strong>Ajuste</strong><small>Definir saldo</small></button>
          </div>

          <label class="field">
            <span>{{ movementForm.controls.type.value === 'ADJUSTMENT' ? 'Novo saldo *' : 'Quantidade *' }}</span>
            <input type="number" min="0" step="0.001" formControlName="quantity" />
            <small class="field-hint">{{ quantityHint() }}</small>
          </label>

          <label class="field">
            <span>Observação</span>
            <textarea formControlName="note" rows="4" placeholder="Ex.: Compra fornecedor, consumo interno, inventário físico..."></textarea>
          </label>

          @if (formError()) { <div class="form-alert">{{ formError() }}</div> }

          <footer class="drawer-actions"><button class="secondary-button" type="button" (click)="closeDrawer()">Cancelar</button><button class="primary-button" type="submit" [disabled]="saving()">@if (saving()) { <span class="small-spinner"></span> } Confirmar movimentação</button></footer>
        </form>
      </aside>
    }

    @if (toast()) { <div class="toast" [class.error-toast]="toast()?.type === 'error'"><span>{{ toast()?.type === 'success' ? '✓' : '!' }}</span><p>{{ toast()?.message }}</p></div> }
  `,
    styles: [`
    :host { display:block; }.page-shell { display:grid; gap:18px; }.page-header { display:flex; justify-content:space-between; align-items:flex-end; gap:24px; }.eyebrow,.panel-header span { color:#6656ef; font-size: 11px; font-weight:850; letter-spacing:.15em; }.page-header h1 { margin:7px 0 5px; color:#1b2232; font-size: 32px; line-height:1; letter-spacing:-.045em; }.page-header p { margin:0; color:#81899a; font-size: 14px; }
    .primary-button,.secondary-button { min-height:41px; padding:0 15px; display:inline-flex; align-items:center; justify-content:center; gap:8px; border-radius:11px; border:0; font-size: 13px; font-weight:800; }.primary-button { color:#fff; background:#191d27; box-shadow:0 10px 24px rgba(20,24,34,.13); }.secondary-button { color:#626a79; background:#fff; border:1px solid #e0e4eb; }.primary-button:disabled { opacity:.65; }
    .summary-loading,.summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }.summary-loading span { height:90px; border-radius:14px; background:linear-gradient(90deg,#eef1f5,#fafbfc,#eef1f5); background-size:200% 100%; animation:shimmer 1.2s infinite; }.summary-card { min-height:90px; padding:16px; display:flex; align-items:center; gap:12px; border:1px solid #e5e8ef; border-radius:14px; background:#fff; }.summary-card.accent-card { color:#fff; border-color:#1e2330; background:#1e2330; }.metric-icon { width:34px; height:34px; display:grid; place-items:center; border-radius:10px; color:#6554ef; background:#efedff; font-size: 12px; font-weight:900; }.accent-card .metric-icon { color:#fff; background:rgba(255,255,255,.1); }.warning-card .metric-icon { color:#a66a0b; background:#fff3dc; }.danger-card .metric-icon { color:#bd4053; background:#fff0f2; }.summary-card div { display:grid; gap:3px; }.summary-card small { color:#838b9b; font-size: 11px; }.accent-card small { color:#b7bfcd; }.summary-card strong { font-size: 20px; letter-spacing:-.035em; }
    .inventory-grid { display:grid; grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr); gap:14px; }.panel { border:1px solid #e5e8ef; border-radius:15px; background:#fff; box-shadow:0 8px 30px rgba(28,39,64,.025); }.alerts-panel,.value-panel { padding:19px; }.panel-header { display:flex; justify-content:space-between; align-items:center; gap:12px; }.panel-header h2,.movements-heading h2 { margin:5px 0 0; color:#293142; font-size: 17px; letter-spacing:-.02em; }.panel-header > small { color:#9299a7; font-size: 11px; }
    .alert-list { margin-top:14px; display:grid; }.alert-item { width:100%; min-height:61px; padding:8px 3px; display:grid; grid-template-columns:32px minmax(0,1fr) auto; gap:10px; align-items:center; border:0; border-bottom:1px solid #eff1f4; background:transparent; text-align:left; }.alert-item:last-child { border-bottom:0; }.alert-item:hover { background:#fbfbfd; }.alert-icon { width:28px; height:28px; display:grid; place-items:center; border-radius:9px; color:#a96d0e; background:#fff2d9; font-size: 12px; font-weight:900; }.alert-icon.out { color:#bd4053; background:#fff0f2; }.alert-product,.alert-stock { display:grid; gap:3px; }.alert-product strong { color:#373e4c; font-size: 12px; }.alert-product small,.alert-stock small { color:#969daa; font-size: 10px; }.alert-stock { text-align:right; }.alert-stock strong { color:#4b5362; font-size: 12px; }.all-good { margin-top:16px; min-height:135px; display:flex; align-items:center; justify-content:center; gap:12px; color:#4f5968; }.all-good > span { width:38px; height:38px; display:grid; place-items:center; border-radius:12px; color:#18805e; background:#eaf8f2; }.all-good strong { font-size: 13px; }.all-good p { margin:3px 0 0; color:#929aa8; font-size: 11px; }
    .value-main { margin-top:18px; min-height:125px; padding:18px; display:grid; align-content:center; gap:7px; border-radius:13px; color:#fff; background:linear-gradient(135deg,#242936,#171b24); }.value-main span { color:#b9c0cd; font-size: 11px; }.value-main strong { font-size: 27px; letter-spacing:-.04em; }.value-main small { color:#858e9e; font-size: 10px; }.value-comparison { margin-top:12px; display:grid; grid-template-columns:1fr 1fr; gap:8px; }.value-comparison div { padding:11px; display:grid; gap:4px; border-radius:10px; background:#f7f8fa; }.value-comparison small { color:#8f97a5; font-size: 10px; }.value-comparison strong { color:#404756; font-size: 13px; }
    .movements-panel { overflow:hidden; }.movements-heading { padding:18px 19px 12px; display:flex; justify-content:space-between; align-items:flex-end; gap:12px; }.movements-heading > small { color:#9098a7; font-size: 11px; }.toolbar { padding:10px 18px 14px; display:flex; justify-content:space-between; align-items:center; gap:10px; border-bottom:1px solid #edf0f3; }.search-box { width:min(420px,100%); height:40px; padding:0 11px; display:flex; gap:8px; align-items:center; border-radius:10px; color:#8d95a4; background:#f7f8fa; }.search-box input { flex:1; min-width:0; border:0; outline:0; background:transparent; color:#343b48; font-size: 12px; }.toolbar select { height:38px; min-width:150px; padding:0 10px; border:1px solid #e0e4ea; border-radius:10px; background:#fff; color:#5d6574; font-size: 12px; }
    .table-wrap { overflow-x:auto; } table { width:100%; border-collapse:collapse; min-width:940px; } th { height:39px; padding:0 16px; text-align:left; color:#7e8797; background:#fbfbfc; border-bottom:1px solid #e9ecf1; font-size: 10px; font-weight:850; letter-spacing:.08em; text-transform:uppercase; } td { height:62px; padding:8px 16px; border-bottom:1px solid #eff1f4; color:#4b5260; font-size: 11px; }.date-cell,.product-cell { display:grid; gap:3px; }.date-cell strong,.product-cell strong { color:#353c49; font-size: 11px; }.date-cell small,.product-cell small { color:#969daa; font-size: 10px; }.type-badge { display:inline-flex; padding:4px 7px; border-radius:7px; color:#6554ef; background:#efedff; font-size: 10px; font-weight:850; }.type-badge.entry { color:#14795a; background:#e9f8f1; }.type-badge.exit { color:#bc4253; background:#fff0f2; }.movement-quantity { font-size: 12px; }.positive { color:#14795a !important; }.negative { color:#bd4052 !important; }.user-pill { padding:4px 7px; border-radius:7px; background:#f3f4f6; color:#626a78; font-size: 10px; }
    .movement-skeleton { padding:12px 18px; display:grid; gap:9px; }.movement-skeleton span { height:48px; border-radius:10px; background:linear-gradient(90deg,#eff1f4,#fafbfc,#eff1f4); background-size:200% 100%; animation:shimmer 1.2s infinite; }.empty-state { min-height:230px; display:grid; place-items:center; align-content:center; text-align:center; }.empty-state > span { width:48px; height:48px; display:grid; place-items:center; border-radius:14px; color:#6554ef; background:#efedff; }.empty-state h3 { margin:11px 0 5px; font-size: 18px; }.empty-state p { margin:0; color:#8e96a5; font-size: 12px; }.pagination { min-height:60px; padding:11px 18px; display:flex; justify-content:space-between; align-items:center; gap:10px; border-top:1px solid #edf0f3; color:#8991a0; font-size: 11px; }.pagination div { display:flex; gap:7px; }.pagination button { height:34px; padding:0 10px; border:1px solid #dfe3e9; border-radius:9px; background:#fff; color:#596171; font-size: 11px; font-weight:750; }.mobile-list { display:none; }
    .drawer-backdrop { position:fixed; inset:0; z-index:99; border:0; background:rgba(15,19,28,.46); backdrop-filter:blur(2px); }.drawer { position:fixed; inset:0 0 0 auto; z-index:100; width:min(520px,100vw); background:#fff; box-shadow:-20px 0 60px rgba(13,18,30,.18); display:flex; flex-direction:column; }.drawer-header { padding:25px; display:flex; justify-content:space-between; gap:15px; border-bottom:1px solid #eceff3; }.drawer-header h2 { margin:7px 0 6px; font-size: 24px; letter-spacing:-.035em; }.drawer-header p { margin:0; color:#8c93a1; font-size: 13px; }.drawer-header > button { width:36px; height:36px; border:1px solid #e1e5eb; border-radius:10px; background:#fff; color:#626a79; font-size: 20px; }.movement-form { padding:22px 25px; overflow-y:auto; display:grid; gap:17px; }.field { display:grid; gap:7px; }.field > span { color:#515968; font-size: 12px; font-weight:750; }.field input,.field select,.field textarea { width:100%; border:1px solid #dfe3e9; border-radius:10px; outline:0; color:#313744; background:#fff; font-size: 13px; }.field input,.field select { height:42px; padding:0 11px; }.field textarea { min-height:90px; padding:10px 11px; resize:vertical; }.field input:focus,.field select:focus,.field textarea:focus { border-color:#aaa1ff; box-shadow:0 0 0 4px rgba(109,93,252,.07); }.field-error { color:#c94555; font-size: 11px; }.field-hint { color:#9299a7; font-size: 10px; }
    .selected-product { padding:12px; display:flex; align-items:center; gap:10px; border-radius:11px; background:#f7f7fb; }.product-mark { flex:0 0 auto; width:35px; height:35px; display:grid; place-items:center; border-radius:10px; color:#6554ef; background:#ece9ff; font-size: 11px; font-weight:900; }.selected-product div { display:grid; gap:3px; }.selected-product strong { color:#3b4250; font-size: 12px; }.selected-product small { color:#8b93a1; font-size: 10px; }.movement-types { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }.movement-types button { min-height:82px; padding:9px; display:grid; place-items:center; align-content:center; gap:3px; border:1px solid #e2e5ea; border-radius:11px; background:#fff; color:#697180; }.movement-types button.active { color:#6554ef; border-color:#b9b1ff; background:#f7f5ff; box-shadow:0 0 0 3px rgba(109,93,252,.06); }.movement-types button > span { font-size: 17px; }.movement-types strong { font-size: 12px; }.movement-types small { color:#959ca9; font-size: 10px; }.form-alert { padding:11px; border:1px solid #ffd2d7; border-radius:10px; color:#b93e4f; background:#fff4f6; font-size: 12px; }.drawer-actions { padding-top:17px; display:flex; justify-content:flex-end; gap:8px; border-top:1px solid #edf0f3; }
    .small-spinner { width:13px; height:13px; border:2px solid rgba(255,255,255,.35); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }.toast { position:fixed; right:24px; bottom:24px; z-index:120; max-width:380px; padding:12px 14px; display:flex; gap:9px; align-items:center; border-radius:13px; color:#fff; background:#20242d; box-shadow:0 18px 40px rgba(15,19,30,.2); }.toast span { width:24px; height:24px; display:grid; place-items:center; border-radius:8px; color:#74e2a9; background:rgba(78,211,143,.15); font-weight:900; }.toast.error-toast span { color:#ff8787; background:rgba(255,98,98,.14); }.toast p { margin:0; font-size: 12px; }
    @keyframes shimmer { to { background-position:-200% 0; } } @keyframes spin { to { transform:rotate(360deg); } }
    @media (max-width:1150px) { .summary-grid,.summary-loading { grid-template-columns:repeat(2,1fr); }.inventory-grid { grid-template-columns:1fr; } }.desktop-table { display:block; }
    @media (max-width:820px) { .desktop-table { display:none; }.mobile-list { padding:12px; display:grid; gap:9px; }.mobile-card { padding:13px; display:grid; gap:10px; border:1px solid #e7eaf0; border-radius:13px; }.mobile-head { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }.mobile-head div { display:grid; gap:3px; }.mobile-head strong { font-size: 12px; }.mobile-head small,.mobile-card > small { color:#939aa8; font-size: 10px; }.mobile-values { display:grid; grid-template-columns:1fr 1fr; gap:8px; }.mobile-values span { padding:9px; display:grid; gap:3px; border-radius:9px; color:#89919f; background:#f7f8fa; font-size: 10px; }.mobile-values strong { color:#3f4654; font-size: 12px; } }
    @media (max-width:680px) { .page-header { align-items:stretch; flex-direction:column; }.summary-grid,.summary-loading { grid-template-columns:1fr; }.toolbar { align-items:stretch; flex-direction:column; }.search-box,.toolbar select { width:100%; }.pagination { align-items:stretch; flex-direction:column; }.pagination div { display:grid; grid-template-columns:1fr 1fr; }.movement-types { grid-template-columns:1fr; }.movement-types button { min-height:62px; grid-template-columns:30px 1fr; grid-template-rows:auto auto; text-align:left; place-items:start; align-items:center; }.movement-types button > span { grid-row:1/3; align-self:center; }.drawer-header,.movement-form { padding-left:18px; padding-right:18px; }.drawer-actions { display:grid; grid-template-columns:1fr; }.drawer-actions .primary-button { grid-row:1; }.toast { left:16px; right:16px; bottom:16px; } }
  `]
})
export class InventoryComponent {
  readonly auth = inject(AuthService);
  private readonly inventoryService = inject(InventoryService);
  private readonly productsService = inject(ProductsService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private toastTimer?: ReturnType<typeof setTimeout>;

  readonly skeletonRows = [1, 2, 3, 4, 5];
  readonly summaryLoading = signal(true);
  readonly movementsLoading = signal(true);
  readonly drawerOpen = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly summary = signal<InventorySummary | null>(null);
  readonly productOptions = signal<ProductListItem[]>([]);
  readonly toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  readonly movements = signal<MovementPagedResponse<StockMovement>>({ items: [], page: 1, pageSize: 12, totalItems: 0, totalPages: 0 });

  readonly searchControl = this.fb.nonNullable.control('');
  readonly typeControl = this.fb.nonNullable.control('');
  readonly movementForm = this.fb.nonNullable.group({
    productId: ['', [Validators.required]],
    type: this.fb.nonNullable.control<MovementType>('ENTRY', [Validators.required]),
    quantity: [1, [Validators.required, Validators.min(0)]],
    note: ['', [Validators.maxLength(500)]]
  });

  readonly movementTotalPages = computed(() => Math.max(this.movements().totalPages, 1));
  readonly potentialMargin = computed(() => {
    const value = this.summary();
    return value ? value.inventorySaleValue - value.inventoryCostValue : 0;
  });

  constructor() {
    merge(
      this.searchControl.valueChanges.pipe(debounceTime(320), distinctUntilChanged()),
      this.typeControl.valueChanges.pipe(distinctUntilChanged())
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadMovements(1));

    this.loadSummary();
    this.loadProductOptions();
    this.loadMovements(1);
  }

  loadSummary(): void {
    this.summaryLoading.set(true);
    this.inventoryService.summary().pipe(finalize(() => this.summaryLoading.set(false))).subscribe({
      next: (summary) => this.summary.set(summary),
      error: (error: HttpErrorResponse) => this.showToast('error', this.errorMessage(error, 'Não foi possível carregar o resumo do estoque.'))
    });
  }

  loadMovements(page: number): void {
    this.movementsLoading.set(true);
    this.inventoryService
      .movements(this.searchControl.value, this.typeControl.value, '', page, 12)
      .pipe(finalize(() => this.movementsLoading.set(false)))
      .subscribe({
        next: (response) => this.movements.set(response),
        error: (error: HttpErrorResponse) => this.showToast('error', this.errorMessage(error, 'Não foi possível carregar as movimentações.'))
      });
  }

  openMovement(productId = ''): void {
    this.formError.set(null);
    const product = this.productOptions().find((item) => item.id === productId);
    this.movementForm.reset({ productId, type: 'ENTRY', quantity: 1, note: '' });
    if (product?.stockStatus === 'OUT' || product?.stockStatus === 'LOW') {
      this.movementForm.controls.type.setValue('ENTRY');
    }
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    if (this.saving()) return;
    this.drawerOpen.set(false);
    this.formError.set(null);
  }

  setMovementType(type: MovementType): void {
    this.movementForm.controls.type.setValue(type);
    if (type === 'ADJUSTMENT') {
      this.movementForm.controls.quantity.setValue(this.selectedProduct()?.currentStock ?? 0);
    } else if (this.movementForm.controls.quantity.value <= 0) {
      this.movementForm.controls.quantity.setValue(1);
    }
  }

  quantityHint(): string {
    const product = this.selectedProduct();
    if (!product) return 'Selecione um produto para visualizar o saldo atual.';
    if (this.movementForm.controls.type.value === 'ADJUSTMENT') return `Informe o saldo físico correto. Atual: ${product.currentStock} ${product.unit}.`;
    if (this.movementForm.controls.type.value === 'EXIT') return `Máximo disponível: ${product.currentStock} ${product.unit}.`;
    return `A quantidade será somada ao saldo de ${product.currentStock} ${product.unit}.`;
  }

  saveMovement(): void {
    this.movementForm.markAllAsTouched();
    if (this.movementForm.invalid || this.saving()) return;

    const value = this.movementForm.getRawValue();
    if (value.type !== 'ADJUSTMENT' && Number(value.quantity) <= 0) {
      this.formError.set('Informe uma quantidade maior que zero.');
      return;
    }

    const payload: StockMovementPayload = {
      type: value.type,
      quantity: Number(value.quantity),
      note: value.note.trim() || null
    };

    this.saving.set(true);
    this.formError.set(null);
    this.inventoryService.createMovement(value.productId, payload).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.drawerOpen.set(false);
        this.showToast('success', 'Movimentação registrada e saldo atualizado.');
        this.loadSummary();
        this.loadProductOptions();
        this.loadMovements(1);
      },
      error: (error: HttpErrorResponse) => this.formError.set(this.errorMessage(error, 'Não foi possível registrar a movimentação.'))
    });
  }


  selectedProduct(): ProductListItem | null {
    return this.productOptions().find((product) => product.id === this.movementForm.controls.productId.value) ?? null;
  }

  movementTypeLabel(type: string): string {
    switch (type) {
      case 'INITIAL': return 'Saldo inicial';
      case 'ENTRY': return 'Entrada';
      case 'EXIT': return 'Saída';
      case 'ADJUSTMENT': return 'Ajuste';
      default: return type;
    }
  }

  signedQuantity(quantity: number): string {
    if (quantity > 0) return `+${quantity.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}`;
    return quantity.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
  }

  productInitials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
  }

  private loadProductOptions(): void {
    this.productsService.list('', '', '', 1, 50).subscribe({
      next: (response) => this.productOptions.set(response.items),
      error: () => this.productOptions.set([])
    });
  }

  private showToast(type: 'success' | 'error', message: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ type, message });
    this.toastTimer = setTimeout(() => this.toast.set(null), 3600);
  }

  private errorMessage(error: HttpErrorResponse, fallback: string): string {
    const message = error.error?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
  }
}
