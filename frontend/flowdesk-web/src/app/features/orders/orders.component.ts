import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CustomerListItem } from '../customers/customer.models';
import { CustomersService } from '../customers/customers.service';
import { OrderCard, OrderDetails, OrderPayload, OrderPriority, OrderStatus } from './order.models';
import { OrdersService } from './orders.service';
import { OrderItemsComponent } from './order-items.component';

interface BoardColumn { status: OrderStatus; label: string; hint: string; }

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, CdkDropListGroup, CdkDropList, CdkDrag, CdkDragHandle, OrderItemsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-header">
      <div>
        <span class="eyebrow">OPERAÇÃO</span>
        <h1>Ordens de serviço</h1>
        <p>Organize o fluxo de trabalho, prazos e histórico em um Kanban operacional.</p>
      </div>
      <button class="primary-button" type="button" (click)="openCreate()">+ Nova ordem</button>
    </section>

    <section class="summary-grid">
      <article class="summary-card dark"><span>Total de ordens</span><strong>{{ orders().length }}</strong><small>no quadro atual</small></article>
      <article class="summary-card"><span>Em andamento</span><strong>{{ countByStatus('IN_PROGRESS') }}</strong><small>execução ativa</small></article>
      <article class="summary-card"><span>Aguardando</span><strong>{{ countByStatus('WAITING') }}</strong><small>dependência externa</small></article>
      <article class="summary-card"><span>Valor em aberto</span><strong>{{ openValue() | currency:'BRL':'symbol':'1.0-0':'pt-BR' }}</strong><small>estimado nas ordens abertas</small></article>
    </section>

    <section class="toolbar">
      <label class="search-field">
        <span>⌕</span>
        <input type="search" placeholder="Buscar por OS, título ou cliente" (input)="onSearch($event)" />
      </label>
      <select [value]="priorityFilter()" (change)="onPriorityChange($event)">
        <option value="">Todas as prioridades</option>
        <option value="URGENT">Urgente</option>
        <option value="HIGH">Alta</option>
        <option value="NORMAL">Normal</option>
        <option value="LOW">Baixa</option>
      </select>
      <button class="refresh-button" type="button" (click)="loadOrders()" [disabled]="loading()">↻ Atualizar</button>
    </section>

    @if (loading()) {
      <div class="board-skeleton"><span></span><span></span><span></span><span></span></div>
    } @else {
      <section class="board" cdkDropListGroup>
        @for (column of columns; track column.status) {
          <article class="kanban-column">
            <header>
              <div><span class="status-dot" [class]="'status-dot ' + column.status.toLowerCase()"></span><strong>{{ column.label }}</strong><em>{{ countByStatus(column.status) }}</em></div>
              <small>{{ column.hint }}</small>
            </header>

            <div
              class="drop-zone"
              cdkDropList
              [id]="'column-' + column.status"
              [cdkDropListData]="ordersFor(column.status)"
              [cdkDropListConnectedTo]="connectedDropLists"
              (cdkDropListDropped)="drop($event, column.status)">
              @for (order of ordersFor(column.status); track order.id) {
                <article class="order-card" cdkDrag [cdkDragData]="order" (click)="openDetails(order.id)">
                  <div class="card-top">
                    <span class="order-number">{{ order.number }}</span>
                    <span class="priority" [class]="'priority ' + order.priority.toLowerCase()">{{ priorityLabel(order.priority) }}</span>
                  </div>
                  <h3>{{ order.title }}</h3>
                  <p class="customer">{{ order.customerName }}</p>
                  <div class="card-meta">
                    <span>◷ {{ dueLabel(order.dueDateUtc) }}</span>
                    <strong>{{ order.estimatedValue | currency:'BRL':'symbol':'1.0-0':'pt-BR' }}</strong>
                  </div>
                  <div class="card-footer">
                    <span class="assignee">{{ initials(order.assignedUserName) }}</span>
                    <span>{{ order.assignedUserName || 'Sem responsável' }}</span>
                    <button type="button" cdkDragHandle aria-label="Arrastar ordem" (click)="$event.stopPropagation()">⋮⋮</button>
                  </div>
                </article>
              } @empty {
                <div class="empty-column">Solte uma ordem aqui</div>
              }
            </div>
          </article>
        }
      </section>
    }

    @if (drawerMode()) {
      <button class="drawer-backdrop" type="button" (click)="closeDrawer()" aria-label="Fechar painel"></button>
      <aside class="drawer">
        <header class="drawer-header">
          <div>
            <span>{{ drawerMode() === 'detail' ? 'DETALHES DA ORDEM' : drawerMode() === 'edit' ? 'EDITAR ORDEM' : 'NOVA ORDEM' }}</span>
            <h2>{{ drawerTitle() }}</h2>
          </div>
          <button type="button" (click)="closeDrawer()" aria-label="Fechar">×</button>
        </header>

        @if (drawerMode() === 'detail') {
          @if (detailLoading()) {
            <div class="drawer-loading">Carregando ordem...</div>
          } @else if (selectedOrder()) {
            <div class="detail-content">
              <section class="detail-hero">
                <div><span class="order-number">{{ selectedOrder()!.number }}</span><h3>{{ selectedOrder()!.title }}</h3><p>{{ selectedOrder()!.customerName }}</p></div>
                <span class="priority" [class]="'priority ' + selectedOrder()!.priority.toLowerCase()">{{ priorityLabel(selectedOrder()!.priority) }}</span>
              </section>
              <section class="detail-grid">
                <div><small>Status</small><strong>{{ statusLabel(selectedOrder()!.status) }}</strong></div>
                <div><small>{{ selectedOrder()!.items.length ? 'Valor calculado' : 'Valor estimado' }}</small><strong>{{ selectedOrder()!.estimatedValue | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong></div>
                <div><small>Prazo</small><strong>{{ selectedOrder()!.dueDateUtc ? (selectedOrder()!.dueDateUtc | date:'dd/MM/yyyy') : 'Sem prazo' }}</strong></div>
                <div><small>Responsável</small><strong>{{ selectedOrder()!.assignedUserName || 'Não definido' }}</strong></div>
              </section>
              @if (selectedOrder()!.description) { <section class="text-section"><small>DESCRIÇÃO</small><p>{{ selectedOrder()!.description }}</p></section> }
              @if (selectedOrder()!.notes) { <section class="text-section"><small>OBSERVAÇÕES</small><p>{{ selectedOrder()!.notes }}</p></section> }
              <app-order-items [order]="selectedOrder()!" (orderChanged)="handleOrderChanged($event)"></app-order-items>
              <section class="timeline-section">
                <div class="section-title"><span>HISTÓRICO</span><strong>Timeline da ordem</strong></div>
                <div class="timeline">
                  @for (activity of selectedOrder()!.activities; track activity.id) {
                    <article><span class="timeline-dot"></span><div><strong>{{ activity.description }}</strong><p>{{ activity.userName || 'Sistema' }} · {{ activity.createdAtUtc | date:'dd/MM/yyyy HH:mm' }}</p></div></article>
                  }
                </div>
              </section>
              <div class="detail-actions"><button type="button" class="secondary-button" (click)="openEdit(selectedOrder()!)">Editar ordem</button></div>
            </div>
          }
        } @else {
          <form class="order-form" [formGroup]="form" (ngSubmit)="save()">
            <label><span>Cliente *</span><select formControlName="customerId"><option value="">Selecione um cliente</option>@for (customer of customers(); track customer.id) {<option [value]="customer.id">{{ customer.name }}</option>}</select></label>
            <label><span>Título da ordem *</span><input type="text" formControlName="title" maxlength="160" placeholder="Ex.: Implantação do painel operacional" /></label>
            <div class="form-row">
              <label><span>Prioridade</span><select formControlName="priority"><option value="LOW">Baixa</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option></select></label>
              <label><span>Valor estimado</span><input type="number" min="0" step="0.01" formControlName="estimatedValue" /></label>
            </div>
            <label><span>Prazo</span><input type="date" formControlName="dueDateUtc" /></label>
            <label><span>Descrição</span><textarea rows="5" formControlName="description" maxlength="2000" placeholder="Contexto e escopo do atendimento"></textarea></label>
            <label><span>Observações internas</span><textarea rows="4" formControlName="notes" maxlength="2000" placeholder="Informações úteis para a equipe"></textarea></label>
            @if (formError()) { <div class="form-error">{{ formError() }}</div> }
            <footer class="form-footer"><button type="button" class="secondary-button" (click)="closeDrawer()">Cancelar</button><button class="primary-button" type="submit" [disabled]="saving()">{{ saving() ? 'Salvando...' : drawerMode() === 'edit' ? 'Salvar alterações' : 'Criar ordem' }}</button></footer>
          </form>
        }
      </aside>
    }

    @if (toast()) { <div class="toast">{{ toast() }}</div> }
  `,
  styles: [`
    :host { display:block; }
    .page-header { display:flex; justify-content:space-between; gap:24px; align-items:flex-end; margin-bottom:24px; }
    .eyebrow,.drawer-header span,.section-title span { color:#6d5dfc; font-size: 11px; font-weight:900; letter-spacing:.14em; }
    h1 { margin:8px 0 5px; font-size: 31px; line-height:1; letter-spacing:-.04em; color:#182033; }
    .page-header p { margin:0; color:#7c8498; font-size: 15px; }
    button,select,input,textarea { font:inherit; }
    .primary-button { min-height:40px; padding:0 16px; border:0; border-radius:10px; background:#191e2b; color:#fff; font-size: 13px; font-weight:800; box-shadow:0 10px 25px rgba(20,26,40,.15); cursor:pointer; }
    .primary-button:disabled { opacity:.6; cursor:not-allowed; }
    .summary-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-bottom:16px; }
    .summary-card { min-height:105px; padding:17px 18px; display:grid; align-content:center; border:1px solid #e5e9f1; border-radius:14px; background:#fff; }
    .summary-card.dark { color:#fff; background:#1d2230; border-color:#1d2230; }
    .summary-card span { color:#7c8498; font-size: 11px; font-weight:700; }.summary-card.dark span,.summary-card.dark small { color:#aeb5c3; }
    .summary-card strong { margin:4px 0; color:#1d2537; font-size: 23px; letter-spacing:-.04em; }.summary-card.dark strong { color:#fff; }
    .summary-card small { color:#a2a9b7; font-size: 10px; }
    .toolbar { padding:12px; display:flex; gap:10px; align-items:center; border:1px solid #e5e9f1; border-radius:14px; background:#fff; margin-bottom:16px; }
    .search-field { min-width:260px; flex:1; display:flex; align-items:center; gap:8px; padding:0 12px; height:38px; border-radius:9px; background:#f6f7fa; color:#8e97a9; }
    .search-field input { width:100%; border:0; outline:0; background:transparent; color:#343c50; font-size: 12px; }
    .toolbar select,.refresh-button { height:38px; padding:0 12px; border:1px solid #e5e9f1; border-radius:9px; background:#fff; color:#606a7f; font-size: 12px; }
    .board { display:grid; grid-template-columns:repeat(4,minmax(255px,1fr)); gap:12px; align-items:start; overflow-x:auto; padding-bottom:8px; }
    .kanban-column { min-width:255px; border:1px solid #e4e8ef; border-radius:15px; background:#f7f8fb; overflow:hidden; }
    .kanban-column > header { padding:14px 14px 11px; border-bottom:1px solid #e6e9f0; background:#fff; }
    .kanban-column header > div { display:flex; align-items:center; gap:8px; }.kanban-column header strong { color:#323a4e; font-size: 13px; }.kanban-column header em { min-width:21px; height:21px; display:grid; place-items:center; border-radius:7px; background:#f0f2f6; color:#717b8f; font-size: 10px; font-style:normal; }.kanban-column header small { display:block; margin:4px 0 0 17px; color:#a0a7b5; font-size: 10px; }
    .status-dot { width:8px; height:8px; border-radius:50%; background:#798399; }.status-dot.new { background:#6d5dfc; }.status-dot.in_progress { background:#3f8be8; }.status-dot.waiting { background:#e59a2f; }.status-dot.done { background:#24a67a; }
    .drop-zone { min-height:470px; padding:10px; display:grid; align-content:start; gap:9px; }
    .order-card { padding:13px; border:1px solid #e4e8ef; border-radius:12px; background:#fff; box-shadow:0 4px 15px rgba(28,38,60,.035); cursor:pointer; transition:transform .18s ease,box-shadow .18s ease; }.order-card:hover { transform:translateY(-2px); box-shadow:0 10px 24px rgba(28,38,60,.08); }
    .card-top,.card-meta,.card-footer { display:flex; align-items:center; justify-content:space-between; gap:8px; }.order-number { color:#6d5dfc; font-size: 11px; font-weight:900; letter-spacing:.04em; }
    .priority {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      align-self:flex-start;
      min-height:22px;
      padding:4px 8px;
      border-radius:999px;
      font-size:9px;
      line-height:1;
      font-weight:900;
      letter-spacing:.07em;
      white-space:nowrap;
      background:#f0f2f6;
      color:#6d7588;
    }
    .priority.urgent { background:#fff0f1; color:#d64758; }
    .priority.high { background:#fff5e7; color:#c67b16; }
    .priority.normal { background:#edf4ff; color:#3779ce; }
    .priority.low { background:#edf8f3; color:#24815f; }
    .order-card h3 { margin:11px 0 5px; color:#252d40; font-size: 14px; line-height:1.35; }.customer { margin:0; color:#7f889a; font-size: 11px; }
    .card-meta { margin-top:14px; padding-top:10px; border-top:1px solid #f0f2f5; color:#8d95a5; font-size: 10px; }.card-meta strong { color:#394156; font-size: 11px; }
    .card-footer { margin-top:10px; justify-content:flex-start; color:#8d95a5; font-size: 10px; }.assignee { width:24px; height:24px; display:grid; place-items:center; border-radius:50%; background:#efedff; color:#6253e8; font-size: 9px; font-weight:900; }.card-footer span:nth-child(2) { flex:1; }.card-footer button { border:0; background:transparent; color:#9ba3b1; cursor:grab; }
    .empty-column { min-height:90px; display:grid; place-items:center; border:1px dashed #d7dce7; border-radius:10px; color:#a2a9b6; font-size: 11px; }
    .cdk-drag-preview { box-sizing:border-box; border-radius:12px; box-shadow:0 18px 45px rgba(24,31,48,.2); }.cdk-drag-placeholder { opacity:.22; }.cdk-drop-list-dragging .order-card:not(.cdk-drag-placeholder) { transition:transform 180ms cubic-bezier(0,0,.2,1); }
    .board-skeleton { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }.board-skeleton span { height:520px; border-radius:15px; background:linear-gradient(90deg,#edf0f5,#f8f9fb,#edf0f5); background-size:200% 100%; animation:shimmer 1.4s infinite; } @keyframes shimmer { to { background-position:-200% 0; } }
    .drawer-backdrop { position:fixed; inset:0; z-index:70; border:0; background:rgba(10,15,27,.46); backdrop-filter:blur(2px); }
    .drawer { position:fixed; top:0; right:0; bottom:0; z-index:80; width:min(620px,94vw); overflow:auto; background:var(--surface); color:var(--text); box-shadow:-25px 0 70px rgba(14,20,34,.24); }
    .drawer-header { position:sticky; top:0; z-index:2; min-height:92px; padding:22px 24px; display:flex; justify-content:space-between; gap:16px; align-items:center; border-bottom:1px solid var(--border); background:color-mix(in srgb,var(--surface) 96%,transparent); backdrop-filter:blur(14px); }
    .drawer-header h2 { margin:5px 0 0; color:var(--text); opacity:1; font-size:20px; font-weight:900; letter-spacing:-.03em; }
    .drawer-header button { width:36px; height:36px; border:1px solid var(--border); border-radius:10px; background:var(--surface-soft); color:var(--text); font-size:20px; }
    .order-form,.detail-content { padding:24px; }.order-form { display:grid; gap:16px; }.order-form label { display:grid; gap:7px; color:#566075; font-size: 11px; font-weight:800; }.order-form input,.order-form select,.order-form textarea { width:100%; box-sizing:border-box; border:1px solid #dfe4ec; border-radius:9px; background:#fff; color:#30384c; outline:none; font-size: 13px; }.order-form input,.order-form select { height:42px; padding:0 12px; }.order-form textarea { padding:12px; resize:vertical; }.order-form input:focus,.order-form select:focus,.order-form textarea:focus { border-color:#7a6df4; box-shadow:0 0 0 3px rgba(109,93,252,.08); }.form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }.form-footer,.detail-actions { display:flex; justify-content:flex-end; gap:9px; padding-top:8px; }.secondary-button { min-height:40px; padding:0 15px; border:1px solid #dfe4ec; border-radius:10px; background:#fff; color:#596378; font-size: 12px; font-weight:800; }.form-error { padding:11px; border-radius:9px; background:#fff1f3; color:#b73e50; font-size: 11px; }
    .drawer-loading { padding:35px; color:var(--muted); font-size:13px; }
    .detail-hero {
      padding:18px;
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:18px;
      border:1px solid var(--border);
      border-radius:14px;
      background:var(--surface-soft);
    }
    .detail-hero .order-number { color:var(--primary); opacity:1; }
    .detail-hero h3 { margin:7px 0 4px; color:var(--text); opacity:1; font-size:17px; font-weight:900; }
    .detail-hero p { margin:0; color:var(--muted); font-size:12px; }

    /* Contraste explícito do drawer no tema escuro */
    :host-context(html[data-theme='dark']) .drawer-header h2 {
      color:#f8fafc !important;
      opacity:1 !important;
      text-shadow:0 1px 0 rgba(255,255,255,.02);
    }

    :host-context(html[data-theme='dark']) .detail-hero h3 {
      color:#f8fafc !important;
      opacity:1 !important;
    }

    :host-context(html[data-theme='dark']) .detail-hero .order-number {
      color:#b5adff !important;
      opacity:1 !important;
    }

    :host-context(html[data-theme='dark']) .drawer-header > div > span {
      color:#9f94ff !important;
      opacity:1 !important;
    }

    :host-context(html[data-theme='dark']) .detail-hero p {
      color:#aeb8cc !important;
      opacity:1 !important;
    }.detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:14px; }.detail-grid div { padding:14px; border:1px solid #e8ebf1; border-radius:11px; }.detail-grid small,.text-section small { display:block; color:#929aab; font-size: 10px; font-weight:800; letter-spacing:.08em; }.detail-grid strong { display:block; margin-top:5px; color:#343d51; font-size: 12px; }.text-section { margin-top:14px; padding:15px; border:1px solid #e8ebf1; border-radius:11px; }.text-section p { margin:7px 0 0; color:#596378; font-size: 12px; line-height:1.6; }.timeline-section { margin-top:22px; }.section-title { display:grid; gap:4px; }.section-title strong { color:#333c50; font-size: 14px; }.timeline { margin-top:15px; display:grid; }.timeline article { position:relative; min-height:58px; display:grid; grid-template-columns:16px 1fr; gap:9px; }.timeline article:not(:last-child)::after { content:''; position:absolute; left:4px; top:14px; bottom:-2px; width:1px; background:#e4e8ef; }.timeline-dot { z-index:1; width:9px; height:9px; margin-top:2px; border-radius:50%; background:#6d5dfc; box-shadow:0 0 0 4px #efedff; }.timeline strong { color:#475166; font-size: 11px; }.timeline p { margin:4px 0 0; color:#969eac; font-size: 10px; }
    .toast { position:fixed; right:24px; bottom:24px; z-index:100; padding:12px 16px; border-radius:10px; background:#1d2432; color:#fff; box-shadow:0 12px 35px rgba(13,18,30,.2); font-size: 12px; font-weight:700; }
    @media(max-width:1180px){.summary-grid{grid-template-columns:repeat(2,1fr)}.board{grid-template-columns:repeat(4,280px)}}
    @media(max-width:650px){.page-header{align-items:flex-start;flex-direction:column}.primary-button{width:100%}.summary-grid{grid-template-columns:1fr 1fr}.toolbar{align-items:stretch;flex-direction:column}.search-field{min-width:0}.board{grid-template-columns:repeat(4,84vw)}.form-row,.detail-grid{grid-template-columns:1fr}.summary-card{min-height:92px}.drawer{width:100vw}.order-form,.detail-content{padding:18px}}
  `]
})
export class OrdersComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);
  private readonly customersService = inject(CustomersService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();

  readonly columns: BoardColumn[] = [
    { status: 'NEW', label: 'Novas', hint: 'Entrada e triagem' },
    { status: 'IN_PROGRESS', label: 'Em andamento', hint: 'Execução ativa' },
    { status: 'WAITING', label: 'Aguardando', hint: 'Dependência ou retorno' },
    { status: 'DONE', label: 'Finalizadas', hint: 'Serviços concluídos' }
  ];
  readonly connectedDropLists = this.columns.map((column) => `column-${column.status}`);
  readonly orders = signal<OrderCard[]>([]);
  readonly customers = signal<CustomerListItem[]>([]);
  readonly loading = signal(true);
  readonly detailLoading = signal(false);
  readonly saving = signal(false);
  readonly priorityFilter = signal('');
  readonly searchTerm = signal('');
  readonly drawerMode = signal<'create' | 'edit' | 'detail' | null>(null);
  readonly selectedOrder = signal<OrderDetails | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly formError = signal('');
  readonly toast = signal('');

  readonly form = this.fb.nonNullable.group({
    customerId: ['', Validators.required],
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(160)]],
    priority: ['NORMAL' as OrderPriority, Validators.required],
    estimatedValue: [0, [Validators.required, Validators.min(0)]],
    dueDateUtc: [''],
    description: ['', Validators.maxLength(2000)],
    notes: ['', Validators.maxLength(2000)]
  });

  ngOnInit(): void {
    this.search$.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.searchTerm.set(value);
      this.loadOrders();
    });
    this.loadCustomers();
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.ordersService.list(this.searchTerm(), this.priorityFilter()).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (orders) => this.orders.set(orders),
      error: () => this.showToast('Não foi possível carregar as ordens.')
    });
  }

  loadCustomers(): void {
    this.customersService.list('', 1, 50).subscribe({ next: (result) => this.customers.set(result.items) });
  }

  onSearch(event: Event): void { this.search$.next((event.target as HTMLInputElement).value); }
  onPriorityChange(event: Event): void { this.priorityFilter.set((event.target as HTMLSelectElement).value); this.loadOrders(); }
  ordersFor(status: OrderStatus): OrderCard[] { return this.orders().filter((order) => order.status === status); }
  countByStatus(status: OrderStatus): number { return this.orders().filter((order) => order.status === status).length; }
  openValue(): number { return this.orders().filter((order) => order.status !== 'DONE').reduce((sum, order) => sum + order.estimatedValue, 0); }

  drop(event: CdkDragDrop<OrderCard[]>, targetStatus: OrderStatus): void {
    const order = event.item.data as OrderCard;
    if (!order || order.status === targetStatus) return;
    const previousStatus = order.status;
    this.orders.update((items) => items.map((item) => item.id === order.id ? { ...item, status: targetStatus, updatedAtUtc: new Date().toISOString() } : item));
    this.ordersService.updateStatus(order.id, targetStatus).subscribe({
      next: () => this.showToast(`${order.number} movida para ${this.statusLabel(targetStatus)}.`),
      error: (error) => { this.orders.update((items) => items.map((item) => item.id === order.id ? { ...item, status: previousStatus } : item)); this.showToast(error?.error?.message ?? 'Não foi possível atualizar o status.'); }
    });
  }

  openCreate(): void {
    this.editingId.set(null); this.selectedOrder.set(null); this.formError.set('');
    this.form.controls.estimatedValue.enable({ emitEvent: false });
    this.form.reset({ customerId: '', title: '', priority: 'NORMAL', estimatedValue: 0, dueDateUtc: '', description: '', notes: '' });
    this.drawerMode.set('create');
  }

  openDetails(id: string): void {
    this.drawerMode.set('detail'); this.selectedOrder.set(null); this.detailLoading.set(true);
    this.ordersService.getById(id).pipe(finalize(() => this.detailLoading.set(false))).subscribe({
      next: (order) => this.selectedOrder.set(order),
      error: () => { this.closeDrawer(); this.showToast('Não foi possível carregar a ordem.'); }
    });
  }

  openEdit(order: OrderDetails): void {
    this.editingId.set(order.id); this.formError.set('');
    if (order.items.length > 0) this.form.controls.estimatedValue.disable({ emitEvent: false });
    else this.form.controls.estimatedValue.enable({ emitEvent: false });
    this.form.reset({ customerId: order.customerId, title: order.title, priority: order.priority, estimatedValue: order.estimatedValue, dueDateUtc: this.dateInputValue(order.dueDateUtc), description: order.description ?? '', notes: order.notes ?? '' });
    this.drawerMode.set('edit');
  }

  save(): void {
    this.formError.set('');
    if (this.form.invalid) { this.form.markAllAsTouched(); this.formError.set('Revise os campos obrigatórios antes de salvar.'); return; }
    const value = this.form.getRawValue();
    const payload: OrderPayload = { customerId: value.customerId, title: value.title.trim(), priority: value.priority, estimatedValue: Number(value.estimatedValue) || 0, dueDateUtc: value.dueDateUtc || null, description: value.description.trim() || null, notes: value.notes.trim() || null };
    const editingId = this.editingId();
    this.saving.set(true);
    const request = editingId ? this.ordersService.update(editingId, payload) : this.ordersService.create(payload);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (order) => { this.closeDrawer(); this.loadOrders(); this.showToast(editingId ? `${order.number} atualizada.` : `${order.number} criada com sucesso.`); },
      error: (error) => this.formError.set(error?.error?.message ?? 'Não foi possível salvar a ordem.')
    });
  }

  handleOrderChanged(order: OrderDetails): void {
    this.selectedOrder.set(order);
    this.orders.update((items) => items.map((item) => item.id === order.id ? { ...item, estimatedValue: order.estimatedValue, updatedAtUtc: order.updatedAtUtc } : item));
  }

  closeDrawer(): void { this.drawerMode.set(null); this.selectedOrder.set(null); this.editingId.set(null); }
  drawerTitle(): string { if (this.drawerMode() === 'create') return 'Criar ordem de serviço'; if (this.drawerMode() === 'edit') return 'Atualizar atendimento'; return this.selectedOrder()?.number ?? 'Ordem de serviço'; }
  priorityLabel(priority: OrderPriority): string { return ({ LOW: 'BAIXA', NORMAL: 'NORMAL', HIGH: 'ALTA', URGENT: 'URGENTE' } as const)[priority]; }
  statusLabel(status: OrderStatus): string { return ({ NEW: 'Nova', IN_PROGRESS: 'Em andamento', WAITING: 'Aguardando', DONE: 'Finalizada' } as const)[status]; }
  initials(name: string | null): string { return (name ?? 'SR').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join(''); }
  dueLabel(value: string | null): string { if (!value) return 'Sem prazo'; const date = new Date(value); const today = new Date(); const diff = Math.ceil((date.getTime() - today.getTime()) / 86400000); if (diff < 0) return `${Math.abs(diff)}d atrasada`; if (diff === 0) return 'Hoje'; if (diff === 1) return 'Amanhã'; return `${diff} dias`; }
  dateInputValue(value: string | null): string { return value ? new Date(value).toISOString().slice(0, 10) : ''; }
  showToast(message: string): void { this.toast.set(message); window.setTimeout(() => { if (this.toast() === message) this.toast.set(''); }, 2800); }
}
