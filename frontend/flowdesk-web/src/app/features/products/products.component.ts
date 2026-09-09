import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize, merge } from 'rxjs';
import {
  CreateProductPayload,
  ProductListItem,
  ProductPagedResponse,
  ProductStockStatus,
  UpdateProductPayload
} from './product.models';
import { ProductsService } from './products.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../core/feedback/confirm.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-shell">
      <header class="page-header">
        <div>
          <span class="eyebrow">CATÁLOGO</span>
          <h1>Produtos</h1>
          <p>Gerencie catálogo, preços, estoque mínimo e disponibilidade operacional.</p>
        </div>

        @if (auth.canManageCatalog()) {<button class="primary-button" type="button" (click)="openCreate()"><span>+</span> Novo produto</button>}
      </header>

      <div class="summary-grid">
        <article class="summary-card accent-card">
          <span class="summary-icon">◇</span>
          <div><small>Produtos ativos</small><strong>{{ data().totalItems }}</strong></div>
        </article>
        <article class="summary-card">
          <span class="summary-icon">↗</span>
          <div><small>Na página</small><strong>{{ data().items.length }}</strong></div>
        </article>
        <article class="summary-card">
          <span class="summary-icon">%</span>
          <div><small>Margem média</small><strong>{{ averageMargin() | number:'1.0-0' }}%</strong></div>
        </article>
      </div>

      <section class="content-card">
        <div class="toolbar">
          <label class="search-box">
            <span>⌕</span>
            <input type="search" [formControl]="searchControl" placeholder="Buscar por SKU, nome ou categoria" autocomplete="off" />
            @if (searchControl.value) {
              <button type="button" (click)="searchControl.setValue('')" aria-label="Limpar busca">×</button>
            }
          </label>

          <div class="filters">
            <select [formControl]="categoryControl" aria-label="Filtrar categoria">
              <option value="">Todas as categorias</option>
              @for (category of categories(); track category) {
                <option [value]="category">{{ category }}</option>
              }
            </select>
            <select [formControl]="stockControl" aria-label="Filtrar estoque">
              <option value="">Todos os estoques</option>
              <option value="OK">Estoque normal</option>
              <option value="LOW">Estoque baixo</option>
              <option value="OUT">Sem estoque</option>
            </select>
          </div>
        </div>

        @if (loading()) {
          <div class="loading-list">
            @for (row of skeletonRows; track row) { <span></span> }
          </div>
        } @else if (data().items.length === 0) {
          <div class="empty-state">
            <div>◇</div>
            <h2>Nenhum produto encontrado</h2>
            <p>Ajuste os filtros ou cadastre um novo item para começar o catálogo.</p>
            @if (auth.canManageCatalog()) {<button class="primary-button" type="button" (click)="openCreate()">Cadastrar produto</button>}
          </div>
        } @else {
          <div class="table-wrap desktop-table">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Preço</th>
                  <th>Estoque</th>
                  <th>Atualizado</th>
                  <th class="actions-column">Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (product of data().items; track product.id) {
                  <tr>
                    <td>
                      <div class="product-cell">
                        <span class="product-avatar">{{ productInitials(product.name) }}</span>
                        <div>
                          <strong>{{ product.name }}</strong>
                          <small>{{ product.sku }} · {{ product.unit }}</small>
                        </div>
                      </div>
                    </td>
                    <td><span class="category-pill">{{ product.category || 'Sem categoria' }}</span></td>
                    <td>
                      <div class="price-cell">
                        <strong>{{ product.salePrice | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
                        <small>Custo {{ product.costPrice | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</small>
                      </div>
                    </td>
                    <td>
                      <div class="stock-cell">
                        <span class="stock-badge" [class.low]="product.stockStatus === 'LOW'" [class.out]="product.stockStatus === 'OUT'">
                          {{ stockLabel(product.stockStatus) }}
                        </span>
                        <small>{{ product.currentStock | number:'1.0-3' }} {{ product.unit }} · mín. {{ product.minimumStock | number:'1.0-3' }}</small>
                      </div>
                    </td>
                    <td><span class="date-text">{{ product.updatedAtUtc | date:'dd/MM/yyyy' }}</span></td>
                    <td>
                      <div class="row-actions">
                        @if (auth.canManageCatalog()) {<button class="icon-button" type="button" title="Editar" (click)="openEdit(product.id)">✎</button>}
                        @if (auth.canDeleteProducts()) {<button class="icon-button danger" type="button" title="Excluir" [disabled]="deletingId() === product.id" (click)="remove(product)">{{ deletingId() === product.id ? '…' : '×' }}</button>}
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="mobile-list">
            @for (product of data().items; track product.id) {
              <article class="mobile-card">
                <div class="mobile-head">
                  <div class="product-cell">
                    <span class="product-avatar">{{ productInitials(product.name) }}</span>
                    <div><strong>{{ product.name }}</strong><small>{{ product.sku }}</small></div>
                  </div>
                  @if (auth.canManageCatalog()) {<button class="icon-button" type="button" (click)="openEdit(product.id)">✎</button>}
                </div>
                <div class="mobile-grid">
                  <div><small>Venda</small><strong>{{ product.salePrice | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong></div>
                  <div><small>Estoque</small><strong>{{ product.currentStock | number:'1.0-3' }} {{ product.unit }}</strong></div>
                </div>
                <span class="stock-badge" [class.low]="product.stockStatus === 'LOW'" [class.out]="product.stockStatus === 'OUT'">{{ stockLabel(product.stockStatus) }}</span>
              </article>
            }
          </div>
        }

        @if (!loading() && data().totalItems > 0) {
          <footer class="pagination">
            <span>Página <strong>{{ data().page }}</strong> de <strong>{{ displayTotalPages() }}</strong></span>
            <div>
              <button type="button" [disabled]="data().page <= 1" (click)="loadProducts(data().page - 1)">← Anterior</button>
              <button type="button" [disabled]="data().page >= displayTotalPages()" (click)="loadProducts(data().page + 1)">Próxima →</button>
            </div>
          </footer>
        }
      </section>
    </section>

    @if (drawerOpen()) {
      <button class="drawer-backdrop" type="button" aria-label="Fechar" (click)="closeDrawer()"></button>
      <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="product-drawer-title">
        <header class="drawer-header">
          <div>
            <span class="eyebrow">{{ editingId() ? 'EDIÇÃO' : 'NOVO ITEM' }}</span>
            <h2 id="product-drawer-title">{{ editingId() ? 'Editar produto' : 'Novo produto' }}</h2>
            <p>{{ editingId() ? 'Atualize catálogo, preços e estoque mínimo.' : 'Cadastre um item com saldo inicial opcional.' }}</p>
          </div>
          <button type="button" (click)="closeDrawer()" aria-label="Fechar">×</button>
        </header>

        @if (drawerLoading()) {
          <div class="drawer-loading"><span class="spinner"></span><p>Carregando produto…</p></div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="save()" class="product-form">
            <div class="form-grid">
              <label class="field">
                <span>SKU *</span>
                <input type="text" formControlName="sku" placeholder="Ex.: HW-SSD-001" />
                @if (form.controls.sku.touched && form.controls.sku.invalid) { <small class="error">Informe um SKU válido.</small> }
              </label>
              <label class="field">
                <span>Unidade *</span>
                <select formControlName="unit">
                  <option value="UN">UN</option><option value="PC">PC</option><option value="CX">CX</option><option value="RL">RL</option><option value="KG">KG</option><option value="LT">LT</option>
                </select>
              </label>
            </div>

            <label class="field">
              <span>Nome do produto *</span>
              <input type="text" formControlName="name" placeholder="Ex.: SSD NVMe 1TB" />
              @if (form.controls.name.touched && form.controls.name.invalid) { <small class="error">Informe um nome com pelo menos 2 caracteres.</small> }
            </label>

            <label class="field">
              <span>Categoria</span>
              <input type="text" formControlName="category" list="product-categories" placeholder="Ex.: Hardware" />
              <datalist id="product-categories">
                @for (category of categories(); track category) { <option [value]="category"></option> }
              </datalist>
            </label>

            <div class="form-grid">
              <label class="field">
                <span>Preço de custo</span>
                <input type="number" min="0" step="0.01" formControlName="costPrice" />
              </label>
              <label class="field">
                <span>Preço de venda</span>
                <input type="number" min="0" step="0.01" formControlName="salePrice" />
              </label>
            </div>

            <div class="form-grid">
              @if (!editingId()) {
                <label class="field">
                  <span>Estoque inicial</span>
                  <input type="number" min="0" step="0.001" formControlName="initialStock" />
                </label>
              }
              <label class="field" [class.full-on-edit]="editingId()">
                <span>Estoque mínimo</span>
                <input type="number" min="0" step="0.001" formControlName="minimumStock" />
              </label>
            </div>

            @if (editingId()) {
              <div class="stock-note">
                <span>↕</span>
                <p>O saldo atual é alterado pela tela <strong>Estoque</strong>, mantendo histórico de cada movimentação.</p>
              </div>
            }

            @if (formError()) { <div class="form-alert">{{ formError() }}</div> }

            <footer class="drawer-actions">
              <button class="secondary-button" type="button" (click)="closeDrawer()">Cancelar</button>
              <button class="primary-button" type="submit" [disabled]="saving()">
                @if (saving()) { <span class="small-spinner"></span> }
                {{ editingId() ? 'Salvar alterações' : 'Cadastrar produto' }}
              </button>
            </footer>
          </form>
        }
      </aside>
    }

    @if (toast()) {
      <div class="toast" [class.error-toast]="toast()?.type === 'error'">
        <span>{{ toast()?.type === 'success' ? '✓' : '!' }}</span><p>{{ toast()?.message }}</p>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .page-shell { display: grid; gap: 18px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; }
    .eyebrow { color: #6656ef; font-size: 11px; font-weight: 850; letter-spacing: .15em; }
    h1 { margin: 7px 0 5px; color: #1b2232; font-size: 32px; line-height: 1; letter-spacing: -.045em; }
    .page-header p { margin: 0; color: #81899a; font-size: 14px; }
    .primary-button, .secondary-button { min-height: 41px; border-radius: 11px; padding: 0 15px; border: 0; font-size: 13px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
    .primary-button { color: #fff; background: #191d27; box-shadow: 0 10px 24px rgba(20,24,34,.13); }
    .primary-button:hover { background: #292e3b; }.primary-button:disabled { opacity: .65; cursor: wait; }
    .secondary-button { color: #626a79; background: #fff; border: 1px solid #e0e4eb; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .summary-card { min-height: 88px; padding: 16px; display: flex; gap: 13px; align-items: center; border: 1px solid #e5e8ef; border-radius: 14px; background: #fff; }
    .summary-card.accent-card { color: #fff; background: #1e2330; border-color: #1e2330; }
    .summary-icon { width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; color: #6554ef; background: #f0eeff; font-weight: 900; }
    .accent-card .summary-icon { color: #fff; background: rgba(255,255,255,.1); }
    .summary-card div { display: grid; gap: 3px; }.summary-card small { color: #7f8798; font-size: 11px; }.accent-card small { color: #b7bfcd; }
    .summary-card strong { font-size: 20px; letter-spacing: -.035em; }
    .content-card { overflow: hidden; border: 1px solid #e6e9ef; border-radius: 16px; background: #fff; }
    .toolbar { min-height: 72px; padding: 13px 18px; display: flex; justify-content: space-between; gap: 12px; align-items: center; border-bottom: 1px solid #edf0f4; }
    .search-box { width: min(420px, 100%); height: 42px; padding: 0 12px; display: flex; align-items: center; gap: 8px; border-radius: 11px; background: #f7f8fa; color: #858d9c; }
    .search-box input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: #303746; font-size: 13px; }.search-box button { border: 0; background: transparent; color: #8e95a3; }
    .filters { display: flex; gap: 8px; }.filters select { height: 39px; min-width: 150px; border: 1px solid #e1e5eb; border-radius: 10px; padding: 0 10px; background: #fff; color: #636b7b; font-size: 12px; outline: none; }
    .table-wrap { overflow-x: auto; } table { width: 100%; border-collapse: collapse; min-width: 970px; } th { height: 40px; padding: 0 16px; text-align: left; color: #7a8395; background: #fbfbfc; border-bottom: 1px solid #e9ecf1; font-size: 10px; font-weight: 850; letter-spacing: .09em; text-transform: uppercase; }
    td { height: 67px; padding: 9px 16px; border-bottom: 1px solid #eff1f4; color: #404755; font-size: 12px; } tr:last-child td { border-bottom: 0; }
    .product-cell { display: flex; gap: 10px; align-items: center; }.product-avatar { flex: 0 0 auto; width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; color: #6252ec; background: #efedff; font-size: 11px; font-weight: 900; }
    .product-cell div, .price-cell, .stock-cell { display: grid; gap: 4px; }.product-cell strong, .price-cell strong { color: #2d3340; font-size: 12px; }.product-cell small, .price-cell small, .stock-cell small { color: #9198a6; font-size: 10px; }
    .category-pill { display: inline-flex; padding: 5px 8px; border-radius: 7px; color: #596172; background: #f4f5f7; font-size: 10px; font-weight: 700; }
    .stock-badge { width: fit-content; padding: 4px 7px; border-radius: 7px; color: #167a5a; background: #eaf8f2; font-size: 10px; font-weight: 850; }.stock-badge.low { color: #a36a0d; background: #fff4df; }.stock-badge.out { color: #bc4354; background: #fff0f2; }
    .date-text { color: #7f8795; font-size: 11px; }.actions-column { text-align: right; }.row-actions { display: flex; justify-content: flex-end; gap: 6px; }
    .icon-button { width: 34px; height: 34px; border: 1px solid #e1e5eb; border-radius: 10px; background: #fff; color: #626b7a; }.icon-button:hover { color: #6554ef; border-color: #d4ceff; background: #f7f5ff; }.icon-button.danger:hover { color: #d1495b; border-color: #ffd5da; background: #fff5f6; }
    .pagination { min-height: 62px; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; gap: 12px; border-top: 1px solid #edf0f4; color: #89909e; font-size: 12px; }.pagination div { display: flex; gap: 7px; }.pagination button { height: 35px; padding: 0 11px; border: 1px solid #e0e4ea; border-radius: 9px; background: #fff; color: #555e6d; font-size: 12px; font-weight: 750; }
    .loading-list { padding: 14px 18px; display: grid; gap: 10px; }.loading-list span { height: 52px; border-radius: 11px; background: linear-gradient(90deg,#f0f2f5,#fafbfc,#f0f2f5); background-size: 200% 100%; animation: shimmer 1.2s infinite; }
    .empty-state { min-height: 330px; display: grid; place-items: center; align-content: center; text-align: center; padding: 30px; }.empty-state > div { width: 54px; height: 54px; display: grid; place-items: center; border-radius: 16px; color: #6554ef; background: #f0eeff; font-size: 22px; }.empty-state h2 { margin: 13px 0 6px; font-size: 19px; }.empty-state p { margin: 0 0 16px; color: #8e95a3; font-size: 13px; }
    .mobile-list { display: none; }
    .drawer-backdrop { position: fixed; inset: 0; z-index: 99; border: 0; background: rgba(15,19,28,.46); backdrop-filter: blur(2px); }.drawer { position: fixed; inset: 0 0 0 auto; z-index: 100; width: min(540px,100vw); background: #fff; box-shadow: -20px 0 60px rgba(13,18,30,.18); display: flex; flex-direction: column; }
    .drawer-header { padding: 25px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 1px solid #eceff3; }.drawer-header h2 { margin: 7px 0 6px; font-size: 24px; letter-spacing: -.035em; }.drawer-header p { margin: 0; color: #8a92a0; font-size: 13px; }.drawer-header > button { width: 36px; height: 36px; border: 1px solid #e2e5ea; border-radius: 10px; background: #fff; color: #677080; font-size: 20px; }
    .product-form { padding: 22px 25px; overflow-y: auto; display: grid; gap: 16px; }.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }.field { display: grid; gap: 7px; }.field > span { color: #525a69; font-size: 12px; font-weight: 750; }.field input,.field select { width: 100%; height: 42px; padding: 0 11px; border: 1px solid #dfe3e9; border-radius: 10px; outline: 0; background: #fff; color: #303643; font-size: 13px; }.field input:focus,.field select:focus { border-color: #aaa1ff; box-shadow: 0 0 0 4px rgba(109,93,252,.07); }.error { color: #d14959; font-size: 11px; }
    .stock-note { padding: 12px; display: flex; gap: 10px; border-radius: 11px; color: #5f6675; background: #f7f7fb; font-size: 12px; line-height: 1.5; }.stock-note p { margin: 0; }.stock-note span { color: #6554ef; }.form-alert { padding: 11px; border: 1px solid #ffd1d7; border-radius: 10px; color: #ba4051; background: #fff4f6; font-size: 12px; }.drawer-actions { margin-top: 3px; padding-top: 17px; display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid #edf0f3; }
    .drawer-loading { flex: 1; display: grid; place-content: center; justify-items: center; color: #858d9d; font-size: 12px; }.spinner,.small-spinner { border-radius: 50%; border-style: solid; animation: spin .7s linear infinite; }.spinner { width: 28px; height: 28px; border-width: 3px; border-color: #e4e2ff; border-top-color: #6554ef; }.small-spinner { width: 13px; height: 13px; border-width: 2px; border-color: rgba(255,255,255,.35); border-top-color: #fff; }
    .toast { position: fixed; right: 24px; bottom: 24px; z-index: 120; max-width: 380px; padding: 12px 14px; display: flex; gap: 9px; align-items: center; border-radius: 13px; color: #fff; background: #20242d; box-shadow: 0 18px 40px rgba(15,19,30,.2); }.toast span { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 8px; color: #74e2a9; background: rgba(78,211,143,.15); font-weight: 900; }.toast.error-toast span { color: #ff8787; background: rgba(255,98,98,.14); }.toast p { margin: 0; font-size: 12px; }
    @keyframes shimmer { to { background-position: -200% 0; } } @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 940px) { .summary-grid { grid-template-columns: 1fr 1fr; }.summary-card:last-child { grid-column: 1/-1; }.desktop-table { display:none; }.mobile-list { padding: 12px; display:grid; gap:10px; }.mobile-card { padding: 14px; display:grid; gap:12px; border:1px solid #e7eaf0; border-radius:14px; }.mobile-head { display:flex; justify-content:space-between; align-items:center; gap:10px; }.mobile-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }.mobile-grid div { padding:10px; display:grid; gap:4px; border-radius:10px; background:#f7f8fa; }.mobile-grid small { color:#8d95a4; font-size: 10px; }.mobile-grid strong { font-size: 13px; } }
    @media (max-width: 680px) { .page-header { align-items:stretch; flex-direction:column; }.summary-grid { grid-template-columns:1fr; }.summary-card:last-child { grid-column:auto; }.toolbar { align-items:stretch; flex-direction:column; }.search-box { width:100%; }.filters { display:grid; grid-template-columns:1fr; }.filters select { width:100%; }.form-grid { grid-template-columns:1fr; }.pagination { align-items:stretch; flex-direction:column; }.pagination div { display:grid; grid-template-columns:1fr 1fr; }.drawer-header,.product-form { padding-left:18px; padding-right:18px; }.drawer-actions { display:grid; grid-template-columns:1fr; }.drawer-actions .primary-button { grid-row:1; }.toast { left:16px; right:16px; bottom:16px; } }
  `]
})
export class ProductsComponent {
  readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly productsService = inject(ProductsService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private toastTimer?: ReturnType<typeof setTimeout>;

  readonly pageSize = 10;
  readonly skeletonRows = [1, 2, 3, 4, 5, 6];
  readonly loading = signal(true);
  readonly drawerOpen = signal(false);
  readonly drawerLoading = signal(false);
  readonly saving = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly categories = signal<string[]>([]);
  readonly toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  readonly data = signal<ProductPagedResponse<ProductListItem>>({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });

  readonly searchControl = this.fb.nonNullable.control('');
  readonly categoryControl = this.fb.nonNullable.control('');
  readonly stockControl = this.fb.nonNullable.control('');
  readonly displayTotalPages = computed(() => Math.max(this.data().totalPages, 1));
  readonly averageMargin = computed(() => {
    const items = this.data().items.filter((item) => item.salePrice > 0);
    if (!items.length) return 0;
    return items.reduce((sum, item) => sum + ((item.salePrice - item.costPrice) / item.salePrice) * 100, 0) / items.length;
  });

  readonly form = this.fb.nonNullable.group({
    sku: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
    category: ['', [Validators.maxLength(100)]],
    unit: ['UN', [Validators.required, Validators.maxLength(20)]],
    costPrice: [0, [Validators.required, Validators.min(0)]],
    salePrice: [0, [Validators.required, Validators.min(0)]],
    initialStock: [0, [Validators.required, Validators.min(0)]],
    minimumStock: [0, [Validators.required, Validators.min(0)]]
  });

  constructor() {
    merge(
      this.searchControl.valueChanges.pipe(debounceTime(320), distinctUntilChanged()),
      this.categoryControl.valueChanges.pipe(distinctUntilChanged()),
      this.stockControl.valueChanges.pipe(distinctUntilChanged())
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadProducts(1));

    this.loadCategories();
    this.loadProducts(1);
  }

  loadProducts(page: number): void {
    this.loading.set(true);
    this.productsService
      .list(this.searchControl.value, this.categoryControl.value, this.stockControl.value, page, this.pageSize)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.data.set(response),
        error: (error: HttpErrorResponse) => this.showToast('error', this.errorMessage(error, 'Não foi possível carregar os produtos.'))
      });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.formError.set(null);
    this.form.reset({ sku: '', name: '', category: '', unit: 'UN', costPrice: 0, salePrice: 0, initialStock: 0, minimumStock: 0 });
    this.drawerLoading.set(false);
    this.drawerOpen.set(true);
  }

  openEdit(id: string): void {
    this.editingId.set(id);
    this.formError.set(null);
    this.drawerOpen.set(true);
    this.drawerLoading.set(true);
    this.productsService
      .getById(id)
      .pipe(finalize(() => this.drawerLoading.set(false)))
      .subscribe({
        next: (product) => this.form.reset({
          sku: product.sku,
          name: product.name,
          category: product.category ?? '',
          unit: product.unit,
          costPrice: product.costPrice,
          salePrice: product.salePrice,
          initialStock: product.currentStock,
          minimumStock: product.minimumStock
        }),
        error: (error: HttpErrorResponse) => {
          this.closeDrawer();
          this.showToast('error', this.errorMessage(error, 'Não foi possível carregar o produto.'));
        }
      });
  }

  closeDrawer(): void {
    if (this.saving()) return;
    this.drawerOpen.set(false);
    this.drawerLoading.set(false);
    this.formError.set(null);
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    const value = this.form.getRawValue();
    const common = {
      sku: value.sku.trim(),
      name: value.name.trim(),
      category: value.category.trim() || null,
      unit: value.unit,
      costPrice: Number(value.costPrice),
      salePrice: Number(value.salePrice),
      minimumStock: Number(value.minimumStock)
    };

    this.saving.set(true);
    this.formError.set(null);
    const editingId = this.editingId();
    const request$ = editingId
      ? this.productsService.update(editingId, common satisfies UpdateProductPayload)
      : this.productsService.create({ ...common, initialStock: Number(value.initialStock) } satisfies CreateProductPayload);

    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.drawerOpen.set(false);
        this.showToast('success', editingId ? 'Produto atualizado com sucesso.' : 'Produto cadastrado com sucesso.');
        this.loadCategories();
        this.loadProducts(editingId ? this.data().page : 1);
      },
      error: (error: HttpErrorResponse) => this.formError.set(this.errorMessage(error, 'Não foi possível salvar o produto.'))
    });
  }

  async remove(product: ProductListItem): Promise<void> {
    const confirmed = await this.confirm.open({
      title: 'Excluir produto?',
      message: `O produto "${product.name}" será removido do catálogo. O histórico de estoque será preservado.`,
      confirmLabel: 'Excluir produto',
      tone: 'danger'
    });

    if (!confirmed) {
      return;
    }

    this.deletingId.set(product.id);
    this.productsService.delete(product.id).pipe(finalize(() => this.deletingId.set(null))).subscribe({
      next: () => {
        this.showToast('success', 'Produto removido do catálogo.');
        this.loadCategories();
        this.loadProducts(this.data().page);
      },
      error: (error: HttpErrorResponse) => this.showToast('error', this.errorMessage(error, 'Não foi possível excluir o produto.'))
    });
  }

  stockLabel(status: ProductStockStatus): string {
    return status === 'OUT' ? 'Sem estoque' : status === 'LOW' ? 'Estoque baixo' : 'Normal';
  }

  productInitials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
  }

  private loadCategories(): void {
    this.productsService.categories().subscribe({ next: (categories) => this.categories.set(categories), error: () => this.categories.set([]) });
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
