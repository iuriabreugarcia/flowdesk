import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ConfirmService } from '../../core/feedback/confirm.service';
import { ToastService } from '../../core/feedback/toast.service';
import { ProductListItem } from '../products/product.models';
import { ProductsService } from '../products/products.service';
import { OrderDetails, OrderItem, OrderItemPayload, OrderItemType } from './order.models';
import { calculateItemPricing } from './pricing.utils';
import { OrdersService } from './orders.service';

@Component({
    selector: 'app-order-items',
    imports: [ReactiveFormsModule, CurrencyPipe, DecimalPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <section class="items-section">
      <header class="items-header">
        <div>
          <span class="section-kicker">ITENS DA ORDEM</span>
          <h4>Produtos e serviços</h4>
          <p>{{ order.items.length }} {{ order.items.length === 1 ? 'item' : 'itens' }} · total calculado automaticamente</p>
        </div>
        @if (order.status !== 'DONE' && !editorOpen()) {
          <button class="add-button" type="button" (click)="startAdd()">+ Adicionar item</button>
        }
      </header>

      @if (order.status === 'DONE') {
        <div class="locked-note">
          <span>✓</span>
          <div><strong>Ordem finalizada</strong><small>Os itens estão bloqueados e as baixas de estoque já foram processadas.</small></div>
        </div>
      }

      @if (editorOpen()) {
        <form class="item-editor" [formGroup]="form" (ngSubmit)="save()">
          <div class="editor-heading">
            <div><span>{{ editingId() ? 'EDITAR ITEM' : 'NOVO ITEM' }}</span><strong>{{ editingId() ? 'Atualize o item da ordem' : 'Adicione produto ou serviço' }}</strong></div>
            <button type="button" class="close-editor" (click)="cancelEdit()" aria-label="Fechar">×</button>
          </div>

          <div class="type-switch">
            <button type="button" [class.active]="form.controls.type.value === 'PRODUCT'" (click)="setType('PRODUCT')">
              <span>▣</span><strong>Produto</strong><small>Item do catálogo</small>
            </button>
            <button type="button" [class.active]="form.controls.type.value === 'SERVICE'" (click)="setType('SERVICE')">
              <span>◇</span><strong>Serviço</strong><small>Mão de obra ou atividade</small>
            </button>
          </div>

          @if (form.controls.type.value === 'PRODUCT') {
            <label class="field full">
              <span>Produto *</span>
              <select formControlName="productId" (change)="onProductChange()">
                <option value="">Selecione um produto</option>
                @for (product of products(); track product.id) {
                  <option [value]="product.id">{{ product.sku }} — {{ product.name }} · {{ product.currentStock | number:'1.0-3':'pt-BR' }} {{ product.unit }}</option>
                }
              </select>
            </label>
            @if (selectedProduct(); as product) {
              <div class="product-preview">
                <div><span>{{ product.sku }}</span><strong>{{ product.name }}</strong><small>Estoque atual: {{ product.currentStock | number:'1.0-3':'pt-BR' }} {{ product.unit }}</small></div>
                <strong>{{ product.salePrice | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
              </div>
            }
          } @else {
            <div class="form-grid service-grid">
              <label class="field service-description"><span>Descrição do serviço *</span><input formControlName="description" maxlength="200" placeholder="Ex.: Instalação e configuração" /></label>
              <label class="field"><span>Unidade</span><input formControlName="unit" maxlength="20" placeholder="SERV" /></label>
            </div>
          }

          <div class="form-grid values-grid">
            <label class="field"><span>Quantidade *</span><input type="number" min="0.001" step="0.001" formControlName="quantity" /></label>
            <label class="field"><span>Preço unitário *</span><input type="number" min="0" step="0.01" formControlName="unitPrice" /></label>
            <label class="field"><span>Desconto</span><input type="number" min="0" step="0.01" formControlName="discountAmount" /></label>
          </div>

          @if (form.controls.type.value === 'PRODUCT') {
            <label class="stock-option">
              <input type="checkbox" formControlName="affectsStock" />
              <span><strong>Baixar estoque ao finalizar</strong><small>A quantidade será retirada do saldo somente quando a OS for marcada como Finalizada.</small></span>
            </label>
          }

          <div class="editor-total">
            <div><span>Valor bruto</span><strong>{{ grossPreview() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong></div>
            <div><span>Desconto</span><strong>- {{ discountPreview() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong></div>
            <div class="grand"><span>Total do item</span><strong>{{ totalPreview() | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong></div>
          </div>

          @if (error()) { <div class="form-error">{{ error() }}</div> }

          <footer class="editor-actions">
            <button type="button" class="secondary-button" (click)="cancelEdit()">Cancelar</button>
            <button type="submit" class="primary-button" [disabled]="saving()">{{ saving() ? 'Salvando...' : editingId() ? 'Salvar alterações' : 'Adicionar item' }}</button>
          </footer>
        </form>
      }

      @if (order.items.length === 0 && !editorOpen()) {
        <div class="empty-items">
          <div>▦</div><strong>Nenhum item adicionado</strong><p>Inclua produtos e serviços para calcular o valor da ordem e automatizar a baixa de estoque.</p>
          @if (order.status !== 'DONE') { <button type="button" (click)="startAdd()">Adicionar primeiro item</button> }
        </div>
      } @else if (order.items.length > 0) {
        <div class="items-list">
          @for (item of order.items; track item.id) {
            <article class="item-row">
              <div class="item-icon" [class.service]="item.type === 'SERVICE'">{{ item.type === 'PRODUCT' ? 'P' : 'S' }}</div>
              <div class="item-main">
                <div class="item-title-line">
                  <strong>{{ item.description }}</strong>
                  <span class="item-type">{{ item.type === 'PRODUCT' ? 'PRODUTO' : 'SERVIÇO' }}</span>
                </div>
                <p>
                  @if (item.productSku) { <span>{{ item.productSku }} · </span> }
                  {{ item.quantity | number:'1.0-3':'pt-BR' }} {{ item.unit }} × {{ item.unitPrice | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
                </p>
                @if (item.type === 'PRODUCT' && item.affectsStock) {
                  <span class="stock-badge" [class.done]="!!item.stockDeductedAtUtc">
                    {{ item.stockDeductedAtUtc ? '✓ Estoque baixado' : '↘ Baixa ao finalizar' }}
                  </span>
                }
              </div>
              <div class="item-price">
                @if (item.discountAmount > 0) { <small>- {{ item.discountAmount | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</small> }
                <strong>{{ item.total | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
              </div>
              @if (order.status !== 'DONE') {
                <div class="item-actions">
                  <button type="button" (click)="startEdit(item)" title="Editar">✎</button>
                  <button type="button" class="danger" (click)="remove(item)" title="Excluir">⌫</button>
                </div>
              }
            </article>
          }
        </div>
      }

      @if (order.items.length > 0) {
        <div class="order-totals">
          <div><span>Subtotal</span><strong>{{ order.itemsSubtotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong></div>
          <div><span>Descontos</span><strong>- {{ order.itemsDiscount | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong></div>
          <div class="total"><span>Total da ordem</span><strong>{{ order.itemsTotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong></div>
        </div>
      }
    </section>
  `,
    styles: [`
    :host { display:block; }
    .items-section { margin-top:22px; padding-top:20px; border-top:1px solid var(--border); }
    .items-header { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; }
    .section-kicker { color:var(--primary); font-size:10px; font-weight:900; letter-spacing:.1em; }
    h4 { margin:4px 0 2px; color:var(--text); font-size:15px; }
    .items-header p { margin:0; color:var(--muted); font-size:12px; }
    .add-button,.primary-button { border:0; border-radius:9px; background:var(--primary); color:white; font-size:12px; font-weight:800; padding:10px 13px; }
    .add-button:hover,.primary-button:hover { background:var(--primary-strong); }
    .primary-button:disabled { opacity:.6; cursor:wait; }
    .locked-note { margin-top:14px; display:flex; gap:10px; padding:12px 14px; border:1px solid color-mix(in srgb,var(--success) 25%,var(--border)); border-radius:10px; background:color-mix(in srgb,var(--success) 7%,var(--surface)); }
    .locked-note>span { color:var(--success); font-weight:900; }.locked-note strong,.locked-note small { display:block; }.locked-note strong { color:var(--text); font-size:12px; }.locked-note small { margin-top:2px; color:var(--muted); font-size:11px; }
    .item-editor { margin-top:15px; padding:16px; border:1px solid var(--border); border-radius:13px; background:var(--surface-soft); }
    .editor-heading { display:flex; align-items:flex-start; justify-content:space-between; }.editor-heading div { display:grid; gap:3px; }.editor-heading span { color:var(--primary); font-size:9px; font-weight:900; letter-spacing:.1em; }.editor-heading strong { color:var(--text); font-size:14px; }.close-editor { border:0; background:transparent; color:var(--muted); font-size:21px; }
    .type-switch { margin-top:14px; display:grid; grid-template-columns:1fr 1fr; gap:9px; }.type-switch button { min-height:64px; display:grid; grid-template-columns:28px 1fr; grid-template-rows:1fr 1fr; column-gap:7px; text-align:left; padding:10px; border:1px solid var(--border); border-radius:10px; background:var(--surface); color:var(--text); }.type-switch button>span { grid-row:1/3; align-self:center; display:grid; place-items:center; width:27px;height:27px;border-radius:8px;background:var(--surface-soft);color:var(--primary); }.type-switch button strong { align-self:end;font-size:12px; }.type-switch button small { color:var(--muted); font-size:10px; }.type-switch button.active { border-color:var(--primary); box-shadow:0 0 0 2px color-mix(in srgb,var(--primary) 10%,transparent); }
    .field { display:grid; gap:5px; margin-top:12px; }.field>span { color:var(--muted); font-size:10px; font-weight:800; }.field input,.field select { width:100%; height:39px; padding:0 10px; border:1px solid var(--border); border-radius:8px; background:var(--surface); color:var(--text); outline:none; }.field input:focus,.field select:focus { border-color:var(--primary); box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 10%,transparent); }
    .form-grid { display:grid; gap:9px; }.service-grid { grid-template-columns:2fr .7fr; }.values-grid { grid-template-columns:repeat(3,1fr); }.service-description { min-width:0; }
    .product-preview { margin-top:9px; display:flex; justify-content:space-between; gap:12px; padding:10px 12px; border:1px solid var(--border); border-radius:9px; background:var(--surface); }.product-preview div { display:grid; gap:2px; }.product-preview div>span { color:var(--primary); font-size:9px; font-weight:900; }.product-preview div strong { color:var(--text); font-size:11px; }.product-preview small { color:var(--muted); font-size:10px; }.product-preview>strong { align-self:center; color:var(--text); font-size:12px; }
    .stock-option { margin-top:12px; display:flex; align-items:flex-start; gap:9px; padding:10px 12px; border:1px solid var(--border); border-radius:9px; background:var(--surface); }.stock-option input { margin-top:3px; accent-color:var(--primary); }.stock-option span { display:grid; gap:2px; }.stock-option strong { color:var(--text); font-size:11px; }.stock-option small { color:var(--muted); font-size:10px; line-height:1.45; }
    .editor-total { margin-top:13px; padding:11px 12px; border:1px solid var(--border); border-radius:9px; background:var(--surface); display:grid; gap:6px; }.editor-total div { display:flex; justify-content:space-between; gap:12px; color:var(--muted); font-size:11px; }.editor-total strong { color:var(--text); }.editor-total .grand { padding-top:7px; border-top:1px solid var(--border); font-size:12px; }.editor-total .grand strong { color:var(--primary); font-size:14px; }
    .form-error { margin-top:10px; padding:9px 11px; border-radius:8px; background:color-mix(in srgb,var(--danger) 10%,var(--surface)); color:var(--danger); font-size:11px; font-weight:700; }
    .editor-actions { margin-top:13px; display:flex; justify-content:flex-end; gap:8px; }.secondary-button { padding:9px 12px; border:1px solid var(--border); border-radius:9px; background:var(--surface); color:var(--muted); font-size:11px; font-weight:800; }
    .empty-items { margin-top:14px; padding:24px 18px; text-align:center; border:1px dashed var(--border); border-radius:12px; background:var(--surface-soft); }.empty-items>div { color:var(--primary); font-size:25px; }.empty-items strong { display:block; margin-top:5px; color:var(--text); font-size:12px; }.empty-items p { max-width:360px; margin:5px auto 10px; color:var(--muted); font-size:10px; line-height:1.5; }.empty-items button { border:0; background:transparent; color:var(--primary); font-size:11px; font-weight:900; }
    .items-list { margin-top:14px; display:grid; gap:8px; }.item-row { display:grid; grid-template-columns:34px 1fr auto auto; gap:10px; align-items:center; padding:11px; border:1px solid var(--border); border-radius:10px; background:var(--surface); }.item-icon { width:32px;height:32px;display:grid;place-items:center;border-radius:9px;background:color-mix(in srgb,var(--primary) 11%,var(--surface));color:var(--primary);font-size:11px;font-weight:900; }.item-icon.service { color:var(--success); background:color-mix(in srgb,var(--success) 10%,var(--surface)); }.item-main { min-width:0; }.item-title-line { display:flex; align-items:center; gap:7px; }.item-title-line strong { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text); font-size:11px; }.item-type { flex:none; padding:2px 5px; border-radius:5px; background:var(--surface-soft); color:var(--muted); font-size:8px; font-weight:900; }.item-main p { margin:3px 0 0; color:var(--muted); font-size:9px; }.stock-badge { display:inline-block; margin-top:5px; padding:2px 5px; border-radius:5px; color:var(--warning); background:color-mix(in srgb,var(--warning) 10%,var(--surface)); font-size:8px; font-weight:800; }.stock-badge.done { color:var(--success); background:color-mix(in srgb,var(--success) 10%,var(--surface)); }
    .item-price { min-width:92px; text-align:right; }.item-price small { display:block; color:var(--danger); font-size:9px; }.item-price strong { color:var(--text); font-size:12px; }.item-actions { display:flex; gap:4px; }.item-actions button { width:28px;height:28px;border:1px solid var(--border);border-radius:7px;background:var(--surface-soft);color:var(--muted); }.item-actions button.danger:hover { color:var(--danger); border-color:color-mix(in srgb,var(--danger) 35%,var(--border)); }
    .order-totals { margin-top:12px; margin-left:auto; width:min(100%,300px); display:grid; gap:6px; padding:12px 14px; border:1px solid var(--border); border-radius:10px; background:var(--surface-soft); }.order-totals div { display:flex; justify-content:space-between; gap:16px; color:var(--muted); font-size:10px; }.order-totals strong { color:var(--text); }.order-totals .total { margin-top:3px; padding-top:8px; border-top:1px solid var(--border); font-size:12px; }.order-totals .total strong { color:var(--primary); font-size:15px; }
    @media(max-width:620px){ .items-header{align-items:stretch;flex-direction:column}.add-button{width:100%}.values-grid,.service-grid{grid-template-columns:1fr}.item-row{grid-template-columns:34px 1fr auto}.item-price{grid-column:2;text-align:left}.item-actions{grid-column:3;grid-row:1/3}.type-switch{grid-template-columns:1fr}.editor-actions{display:grid;grid-template-columns:1fr 1fr}.order-totals{width:100%} }
  `]
})
export class OrderItemsComponent implements OnInit {
  @Input({ required: true }) order!: OrderDetails;
  @Output() readonly orderChanged = new EventEmitter<OrderDetails>();

  private readonly fb = inject(FormBuilder);
  private readonly ordersService = inject(OrdersService);
  private readonly productsService = inject(ProductsService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly products = signal<ProductListItem[]>([]);
  readonly editorOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    type: this.fb.nonNullable.control<OrderItemType>('PRODUCT', Validators.required),
    productId: [''],
    description: ['', Validators.maxLength(200)],
    unit: ['SERV', Validators.maxLength(20)],
    quantity: [1, [Validators.required, Validators.min(0.001)]],
    unitPrice: [0, [Validators.required, Validators.min(0)]],
    discountAmount: [0, [Validators.required, Validators.min(0)]],
    affectsStock: [true]
  });

  ngOnInit(): void {
    this.productsService.list('', '', '', 1, 50).subscribe({
      next: (result) => this.products.set(result.items),
      error: () => this.toast.warning('Não foi possível carregar o catálogo de produtos.')
    });
  }

  selectedProduct(): ProductListItem | null {
    return this.products().find((item) => item.id === this.form.controls.productId.value) ?? null;
  }

  setType(type: OrderItemType): void {
    this.form.controls.type.setValue(type);
    this.error.set('');
    if (type === 'PRODUCT') {
      this.form.patchValue({ description: '', unit: 'UN', affectsStock: true });
      this.onProductChange();
    } else {
      this.form.patchValue({ productId: '', description: '', unit: 'SERV', affectsStock: false, unitPrice: 0 });
    }
  }

  startAdd(): void {
    this.editingId.set(null);
    this.error.set('');
    this.form.reset({ type: 'PRODUCT', productId: '', description: '', unit: 'UN', quantity: 1, unitPrice: 0, discountAmount: 0, affectsStock: true });
    this.editorOpen.set(true);
  }

  startEdit(item: OrderItem): void {
    this.editingId.set(item.id);
    this.error.set('');
    this.form.reset({
      type: item.type,
      productId: item.productId ?? '',
      description: item.type === 'SERVICE' ? item.description : '',
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount,
      affectsStock: item.affectsStock
    });
    this.editorOpen.set(true);
  }

  cancelEdit(): void {
    this.editorOpen.set(false);
    this.editingId.set(null);
    this.error.set('');
  }

  onProductChange(): void {
    const product = this.selectedProduct();
    if (!product) return;
    this.form.patchValue({ unit: product.unit, unitPrice: product.salePrice, affectsStock: true });
  }

  grossPreview(): number {
    return this.pricingPreview().gross;
  }

  discountPreview(): number {
    return this.pricingPreview().discount;
  }

  totalPreview(): number {
    return this.pricingPreview().total;
  }

  private pricingPreview() {
    return calculateItemPricing(
      Number(this.form.controls.quantity.value),
      Number(this.form.controls.unitPrice.value),
      Number(this.form.controls.discountAmount.value)
    );
  }

  save(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revise quantidade, preço e descrição do item.');
      return;
    }

    const value = this.form.getRawValue();
    if (value.type === 'PRODUCT' && !value.productId) {
      this.error.set('Selecione um produto.');
      return;
    }
    if (value.type === 'SERVICE' && !value.description.trim()) {
      this.error.set('Informe a descrição do serviço.');
      return;
    }
    if (this.discountPreview() > this.grossPreview()) {
      this.error.set('O desconto não pode ser maior que o valor bruto do item.');
      return;
    }

    const payload: OrderItemPayload = {
      type: value.type,
      productId: value.type === 'PRODUCT' ? value.productId : null,
      description: value.type === 'SERVICE' ? value.description.trim() : null,
      unit: value.type === 'SERVICE' ? (value.unit.trim() || 'SERV') : null,
      quantity: Number(value.quantity),
      unitPrice: Number(value.unitPrice),
      discountAmount: Number(value.discountAmount),
      affectsStock: value.type === 'PRODUCT' && value.affectsStock
    };

    const itemId = this.editingId();
    this.saving.set(true);
    const request = itemId
      ? this.ordersService.updateItem(this.order.id, itemId, payload)
      : this.ordersService.addItem(this.order.id, payload);

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (order) => {
        this.cancelEdit();
        this.orderChanged.emit(order);
        this.toast.success(itemId ? 'Item atualizado na ordem.' : 'Item adicionado à ordem.');
      },
      error: (error) => this.error.set(error?.error?.message ?? 'Não foi possível salvar o item.')
    });
  }

  async remove(item: OrderItem): Promise<void> {
    const accepted = await this.confirm.open({
      title: 'Remover item?',
      message: `${item.description} será removido da ${this.order.number}.`,
      confirmLabel: 'Remover item',
      tone: 'danger'
    });
    if (!accepted) return;

    this.ordersService.deleteItem(this.order.id, item.id).subscribe({
      next: (order) => {
        this.orderChanged.emit(order);
        this.toast.success('Item removido da ordem.');
      },
      error: (error) => this.toast.error(error?.error?.message ?? 'Não foi possível remover o item.')
    });
  }
}
