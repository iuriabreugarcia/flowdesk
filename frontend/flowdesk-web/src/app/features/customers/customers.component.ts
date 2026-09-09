import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { CustomerListItem, CustomerPayload, PagedResponse } from './customer.models';
import { CustomersService } from './customers.service';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmService } from '../../core/feedback/confirm.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-shell">
      <header class="page-header">
        <div>
          <span class="eyebrow">RELACIONAMENTO</span>
          <h1>Clientes</h1>
          <p>Centralize contatos e mantenha a base comercial organizada por empresa.</p>
        </div>

        <button class="primary-button" type="button" (click)="openCreate()">
          <span class="button-icon">+</span>
          Novo cliente
        </button>
      </header>

      <div class="summary-grid">
        <article class="summary-card accent-card">
          <div class="summary-icon">◎</div>
          <div>
            <span>Total de clientes</span>
            <strong>{{ data().totalItems }}</strong>
          </div>
        </article>

        <article class="summary-card">
          <div class="summary-icon">⌕</div>
          <div>
            <span>Resultados na página</span>
            <strong>{{ data().items.length }}</strong>
          </div>
        </article>

        <article class="summary-card">
          <div class="summary-icon">↗</div>
          <div>
            <span>Página atual</span>
            <strong>{{ data().page }}<small>/{{ displayTotalPages() }}</small></strong>
          </div>
        </article>
      </div>

      <section class="content-card">
        <div class="toolbar">
          <label class="search-box">
            <span class="search-icon">⌕</span>
            <input
              type="search"
              [formControl]="searchControl"
              placeholder="Buscar por nome, telefone, e-mail ou documento"
              autocomplete="off"
            />
            @if (searchControl.value) {
              <button class="clear-search" type="button" aria-label="Limpar busca" (click)="clearSearch()">×</button>
            }
          </label>

          <div class="toolbar-meta">
            <span>{{ data().totalItems }} registro{{ data().totalItems === 1 ? '' : 's' }}</span>
          </div>
        </div>

        @if (loading()) {
          <div class="desktop-table skeleton-table" aria-label="Carregando clientes">
            @for (row of skeletonRows; track row) {
              <div class="skeleton-row">
                <span class="skeleton circle"></span>
                <span class="skeleton wide"></span>
                <span class="skeleton medium"></span>
                <span class="skeleton medium"></span>
                <span class="skeleton short"></span>
              </div>
            }
          </div>
        } @else if (data().items.length === 0) {
          <div class="empty-state">
            <div class="empty-icon">◎</div>
            <h2>{{ searchControl.value ? 'Nenhum cliente encontrado' : 'Sua base começa aqui' }}</h2>
            <p>
              {{ searchControl.value
                ? 'Tente outro termo de busca ou limpe o filtro atual.'
                : 'Cadastre o primeiro cliente para começar a organizar o relacionamento comercial.' }}
            </p>
            @if (!searchControl.value) {
              <button class="primary-button" type="button" (click)="openCreate()">Cadastrar cliente</button>
            }
          </div>
        } @else {
          <div class="table-wrap desktop-table">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contato</th>
                  <th>Documento</th>
                  <th>Atualizado</th>
                  <th class="actions-column">Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (customer of data().items; track customer.id) {
                  <tr>
                    <td>
                      <div class="customer-cell">
                        <div class="avatar">{{ initials(customer.name) }}</div>
                        <div>
                          <strong>{{ customer.name }}</strong>
                          <span>Cliente ativo</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="stacked-text">
                        <strong>{{ customer.email || 'Sem e-mail' }}</strong>
                        <span>{{ customer.phone || 'Sem telefone' }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="document-pill">{{ customer.document || 'Não informado' }}</span>
                    </td>
                    <td>
                      <span class="date-text">{{ customer.updatedAtUtc | date:'dd/MM/yyyy' }}</span>
                    </td>
                    <td>
                      <div class="row-actions">
                        <button type="button" class="icon-button" title="Editar cliente" (click)="openEdit(customer.id)">✎</button>
                        @if (canDeleteCustomers()) {<button type="button" class="icon-button danger" title="Excluir cliente" [disabled]="deletingId() === customer.id" (click)="remove(customer)">{{ deletingId() === customer.id ? '…' : '×' }}</button>}
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="mobile-list">
            @for (customer of data().items; track customer.id) {
              <article class="mobile-card">
                <div class="mobile-card-head">
                  <div class="customer-cell">
                    <div class="avatar">{{ initials(customer.name) }}</div>
                    <div>
                      <strong>{{ customer.name }}</strong>
                      <span>{{ customer.document || 'Documento não informado' }}</span>
                    </div>
                  </div>

                  <button type="button" class="icon-button" title="Editar cliente" (click)="openEdit(customer.id)">✎</button>
                </div>

                <div class="mobile-contact">
                  <span>{{ customer.email || 'Sem e-mail' }}</span>
                  <span>{{ customer.phone || 'Sem telefone' }}</span>
                </div>

                <div class="mobile-card-footer">
                  <small>Atualizado em {{ customer.updatedAtUtc | date:'dd/MM/yyyy' }}</small>
                  @if (canDeleteCustomers()) {<button type="button" class="text-danger" [disabled]="deletingId() === customer.id" (click)="remove(customer)">Excluir</button>}
                </div>
              </article>
            }
          </div>
        }

        @if (!loading() && data().totalItems > 0) {
          <footer class="pagination">
            <span>
              Página <strong>{{ data().page }}</strong> de <strong>{{ displayTotalPages() }}</strong>
            </span>

            <div class="pagination-actions">
              <button type="button" (click)="previousPage()" [disabled]="data().page <= 1">← Anterior</button>
              <button type="button" (click)="nextPage()" [disabled]="data().page >= displayTotalPages()">Próxima →</button>
            </div>
          </footer>
        }
      </section>
    </section>

    @if (drawerOpen()) {
      <div class="drawer-backdrop" (click)="closeDrawer()"></div>

      <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="customer-drawer-title">
        <div class="drawer-header">
          <div>
            <span class="eyebrow">{{ editingId() ? 'EDIÇÃO' : 'NOVO CADASTRO' }}</span>
            <h2 id="customer-drawer-title">{{ editingId() ? 'Editar cliente' : 'Novo cliente' }}</h2>
            <p>{{ editingId() ? 'Atualize os dados do cliente selecionado.' : 'Adicione um novo contato à sua base comercial.' }}</p>
          </div>
          <button class="close-drawer" type="button" aria-label="Fechar" (click)="closeDrawer()">×</button>
        </div>

        @if (drawerLoading()) {
          <div class="drawer-loading">
            <span class="spinner"></span>
            <p>Carregando cliente…</p>
          </div>
        } @else {
          <form class="customer-form" [formGroup]="form" (ngSubmit)="save()">
            <div class="form-field full">
              <label for="customer-name">Nome ou razão social *</label>
              <input id="customer-name" type="text" formControlName="name" placeholder="Ex.: Maria Oliveira ou Empresa Alfa" />
              @if (form.controls.name.touched && form.controls.name.invalid) {
                <small class="field-error">Informe um nome com pelo menos 2 caracteres.</small>
              }
            </div>

            <div class="form-grid">
              <div class="form-field">
                <label for="customer-email">E-mail</label>
                <input id="customer-email" type="email" formControlName="email" placeholder="contato da empresa" />
                @if (form.controls.email.touched && form.controls.email.invalid) {
                  <small class="field-error">Informe um e-mail válido.</small>
                }
              </div>

              <div class="form-field">
                <label for="customer-phone">Telefone</label>
                <input id="customer-phone" type="text" formControlName="phone" placeholder="(71) 99999-9999" />
              </div>
            </div>

            <div class="form-field full">
              <label for="customer-document">CPF ou CNPJ</label>
              <input id="customer-document" type="text" formControlName="document" placeholder="Documento do cliente" />
            </div>

            <div class="form-field full">
              <label for="customer-notes">Observações</label>
              <textarea id="customer-notes" rows="5" formControlName="notes" placeholder="Preferências, responsável, observações comerciais…"></textarea>
              <div class="field-hint">Até 1000 caracteres.</div>
            </div>

            @if (formError()) {
              <div class="form-alert">{{ formError() }}</div>
            }

            <div class="drawer-actions">
              <button class="secondary-button" type="button" (click)="closeDrawer()" [disabled]="saving()">Cancelar</button>
              <button class="primary-button" type="submit" [disabled]="saving()">
                @if (saving()) {
                  <span class="small-spinner"></span>
                  Salvando…
                } @else {
                  {{ editingId() ? 'Salvar alterações' : 'Cadastrar cliente' }}
                }
              </button>
            </div>
          </form>
        }
      </aside>
    }

    @if (toast()) {
      <div class="toast" [class.error]="toast()?.type === 'error'">
        <span>{{ toast()?.type === 'success' ? '✓' : '!' }}</span>
        <p>{{ toast()?.message }}</p>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    * { box-sizing: border-box; }

    .page-shell { display: grid; gap: 22px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
    .page-header h1 { margin: 8px 0 8px; font-size: clamp(30px, 4vw, 42px); line-height: 1; letter-spacing: -.045em; color: #171a23; }
    .page-header p { margin: 0; color: #7a8294; font-size: 16px; line-height: 1.6; max-width: 620px; }
    .eyebrow { color: #6d5dfc; font-size: 12px; font-weight: 800; letter-spacing: .15em; }

    button, input, textarea { font: inherit; }
    button { cursor: pointer; }
    button:disabled { cursor: not-allowed; opacity: .5; }

    .primary-button, .secondary-button { min-height: 44px; border-radius: 12px; padding: 0 16px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; font-weight: 750; transition: transform .15s ease, box-shadow .15s ease, background .15s ease; }
    .primary-button { background: #171a23; color: #fff; box-shadow: 0 10px 24px rgba(23, 26, 35, .13); }
    .primary-button:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(23, 26, 35, .17); }
    .secondary-button { background: #f4f5f8; color: #3d4351; }
    .button-icon { font-size: 21px; line-height: 1; font-weight: 400; }

    .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
    .summary-card { background: #fff; border: 1px solid #e9ebf1; border-radius: 17px; padding: 18px; display: flex; align-items: center; gap: 14px; min-height: 94px; box-shadow: 0 8px 24px rgba(18, 24, 40, .025); }
    .summary-card.accent-card { background: linear-gradient(135deg, #171a23, #242936); color: #fff; border-color: transparent; }
    .summary-icon { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: #f2f1ff; color: #6d5dfc; font-size: 19px; font-weight: 800; flex: 0 0 auto; }
    .accent-card .summary-icon { background: rgba(255,255,255,.11); color: #fff; }
    .summary-card div:last-child { display: grid; gap: 5px; }
    .summary-card span { color: #8a91a2; font-size: 13px; font-weight: 650; }
    .accent-card span { color: #b8bdc9; }
    .summary-card strong { color: #222633; font-size: 25px; line-height: 1; letter-spacing: -.03em; }
    .accent-card strong { color: #fff; }
    .summary-card small { font-size: 14px; color: #9ca2b0; margin-left: 3px; }

    .content-card { background: #fff; border: 1px solid #e8eaf0; border-radius: 18px; overflow: hidden; box-shadow: 0 14px 36px rgba(22, 26, 38, .035); }
    .toolbar { padding: 16px 18px; border-bottom: 1px solid #eef0f4; display: flex; justify-content: space-between; align-items: center; gap: 14px; }
    .search-box { width: min(520px, 100%); height: 43px; display: flex; align-items: center; gap: 9px; background: #f7f8fa; border: 1px solid transparent; border-radius: 12px; padding: 0 12px; transition: border-color .15s ease, background .15s ease, box-shadow .15s ease; }
    .search-box:focus-within { background: #fff; border-color: #b9b1ff; box-shadow: 0 0 0 4px rgba(109, 93, 252, .08); }
    .search-icon { color: #959cac; font-size: 19px; transform: translateY(-1px); }
    .search-box input { border: 0; outline: 0; background: transparent; width: 100%; color: #292d38; font-size: 15px; }
    .search-box input::placeholder { color: #9ca3b1; }
    .clear-search { width: 28px; height: 28px; border: 0; border-radius: 8px; background: #eceef3; color: #737b8c; font-size: 18px; line-height: 1; }
    .toolbar-meta { color: #9198a7; font-size: 13px; font-weight: 650; white-space: nowrap; }

    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 810px; }
    th { text-align: left; color: #9299a8; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; font-weight: 800; padding: 13px 18px; background: #fbfbfc; border-bottom: 1px solid #eceef2; }
    td { padding: 14px 18px; border-bottom: 1px solid #f0f1f4; vertical-align: middle; }
    tbody tr { transition: background .15s ease; }
    tbody tr:hover { background: #fafaff; }
    tbody tr:last-child td { border-bottom: 0; }

    .customer-cell { display: flex; align-items: center; gap: 11px; min-width: 210px; }
    .avatar { width: 38px; height: 38px; border-radius: 12px; flex: 0 0 auto; display: grid; place-items: center; background: #eeecff; color: #6554ef; font-size: 13px; font-weight: 850; letter-spacing: .04em; }
    .customer-cell > div:last-child, .stacked-text { display: grid; gap: 4px; }
    .customer-cell strong, .stacked-text strong { color: #2a2e39; font-size: 14px; font-weight: 750; }
    .customer-cell span, .stacked-text span { color: #9299a7; font-size: 12px; }
    .document-pill { display: inline-flex; padding: 6px 9px; border-radius: 9px; background: #f7f7f9; color: #656c7b; font-size: 12px; font-weight: 650; }
    .date-text { color: #717888; font-size: 13px; }
    .actions-column { width: 100px; text-align: center; }
    .row-actions { display: flex; justify-content: center; gap: 6px; }
    .icon-button { width: 34px; height: 34px; border-radius: 10px; border: 1px solid #e5e8ee; background: #fff; color: #626979; display: grid; place-items: center; transition: background .15s ease, border-color .15s ease; }
    .icon-button:hover { background: #f4f2ff; border-color: #d7d1ff; color: #6554ef; }
    .icon-button.danger:hover { background: #fff3f3; border-color: #ffd1d1; color: #d64545; }

    .pagination { min-height: 64px; border-top: 1px solid #edf0f3; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; color: #878e9e; font-size: 13px; }
    .pagination strong { color: #3f4552; }
    .pagination-actions { display: flex; gap: 8px; }
    .pagination-actions button { height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid #e1e4ea; background: #fff; color: #555d6d; font-size: 13px; font-weight: 700; }
    .pagination-actions button:hover:not(:disabled) { background: #f6f5ff; border-color: #d8d2ff; color: #6554ef; }

    .empty-state { min-height: 360px; padding: 40px 20px; display: grid; place-items: center; align-content: center; text-align: center; }
    .empty-icon { width: 58px; height: 58px; border-radius: 18px; display: grid; place-items: center; background: #f0eeff; color: #6554ef; font-size: 25px; margin-bottom: 15px; }
    .empty-state h2 { margin: 0 0 8px; color: #252936; font-size: 20px; letter-spacing: -.025em; }
    .empty-state p { margin: 0 0 18px; max-width: 430px; color: #8b92a1; font-size: 14px; line-height: 1.65; }

    .skeleton-table { padding: 4px 18px 10px; }
    .skeleton-row { min-height: 67px; display: grid; grid-template-columns: 42px 1.4fr 1fr 1fr 80px; gap: 12px; align-items: center; border-bottom: 1px solid #f0f1f4; }
    .skeleton { display: block; height: 10px; border-radius: 99px; background: linear-gradient(90deg, #f0f1f4, #fafafa, #f0f1f4); background-size: 200% 100%; animation: shimmer 1.25s infinite linear; }
    .skeleton.circle { width: 36px; height: 36px; border-radius: 11px; }
    .skeleton.wide { width: 75%; }
    .skeleton.medium { width: 65%; }
    .skeleton.short { width: 55%; }
    @keyframes shimmer { to { background-position: -200% 0; } }

    .mobile-list { display: none; }

    .drawer-backdrop { position: fixed; inset: 0; background: rgba(17, 20, 28, .46); backdrop-filter: blur(2px); z-index: 99; animation: fadeIn .18s ease; }
    .drawer { position: fixed; top: 0; right: 0; z-index: 100; width: min(520px, 100vw); height: 100dvh; background: #fff; box-shadow: -20px 0 60px rgba(13, 18, 30, .18); display: flex; flex-direction: column; animation: slideIn .22s ease; }
    .drawer-header { padding: 26px 26px 20px; border-bottom: 1px solid #eceef2; display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
    .drawer-header h2 { margin: 7px 0 7px; color: #20242f; font-size: 25px; letter-spacing: -.035em; }
    .drawer-header p { margin: 0; color: #89909f; font-size: 14px; line-height: 1.55; }
    .close-drawer { width: 36px; height: 36px; flex: 0 0 auto; border-radius: 11px; border: 1px solid #e4e7ed; background: #fff; color: #656d7c; font-size: 21px; }

    .customer-form { padding: 24px 26px; overflow-y: auto; display: grid; gap: 18px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-field { display: grid; gap: 7px; }
    .form-field label { color: #515867; font-size: 13px; font-weight: 750; }
    .form-field input, .form-field textarea { width: 100%; border: 1px solid #dfe3e9; border-radius: 11px; outline: 0; background: #fff; color: #272b36; font-size: 14px; transition: border-color .15s ease, box-shadow .15s ease; }
    .form-field input { height: 43px; padding: 0 12px; }
    .form-field textarea { min-height: 116px; padding: 11px 12px; resize: vertical; }
    .form-field input:focus, .form-field textarea:focus { border-color: #afa6ff; box-shadow: 0 0 0 4px rgba(109, 93, 252, .07); }
    .form-field input::placeholder, .form-field textarea::placeholder { color: #adb3bf; }
    .field-error { color: #d84d4d; font-size: 12px; }
    .field-hint { color: #9aa1af; font-size: 11px; text-align: right; }
    .form-alert { border: 1px solid #ffd2d2; background: #fff5f5; color: #c33f3f; border-radius: 11px; padding: 11px 12px; font-size: 13px; line-height: 1.5; }
    .drawer-actions { margin-top: 2px; padding-top: 18px; border-top: 1px solid #eef0f3; display: flex; justify-content: flex-end; gap: 9px; }
    .drawer-loading { flex: 1; display: grid; place-content: center; justify-items: center; gap: 10px; color: #838b9b; font-size: 13px; }
    .spinner, .small-spinner { border-radius: 50%; border-style: solid; animation: spin .7s linear infinite; }
    .spinner { width: 28px; height: 28px; border-width: 3px; border-color: #e2e0ff; border-top-color: #6554ef; }
    .small-spinner { width: 14px; height: 14px; border-width: 2px; border-color: rgba(255,255,255,.35); border-top-color: #fff; }

    .toast { position: fixed; right: 24px; bottom: 24px; z-index: 120; min-width: 280px; max-width: min(380px, calc(100vw - 32px)); border-radius: 14px; padding: 12px 14px; background: #20242d; color: #fff; display: flex; align-items: center; gap: 10px; box-shadow: 0 18px 40px rgba(15, 19, 30, .2); animation: toastIn .2s ease; }
    .toast > span { width: 24px; height: 24px; border-radius: 8px; background: rgba(78, 211, 143, .16); color: #72e2a8; display: grid; place-items: center; font-weight: 900; }
    .toast.error > span { background: rgba(255, 98, 98, .13); color: #ff8585; }
    .toast p { margin: 0; font-size: 13px; line-height: 1.45; }

    .mobile-contact { display: grid; gap: 6px; color: #6f7787; font-size: 13px; }
    .mobile-card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eff1f4; padding-top: 12px; color: #999fac; }
    .text-danger { border: 0; background: transparent; color: #d34b4b; font-size: 12px; font-weight: 750; padding: 5px; }

    @keyframes fadeIn { from { opacity: 0; } }
    @keyframes slideIn { from { transform: translateX(24px); opacity: .6; } }
    @keyframes toastIn { from { transform: translateY(12px); opacity: 0; } }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 880px) {
      .summary-grid { grid-template-columns: 1fr 1fr; }
      .summary-card:last-child { grid-column: 1 / -1; }
      .desktop-table { display: none; }
      .mobile-list { display: grid; gap: 10px; padding: 12px; }
      .mobile-card { border: 1px solid #e9ebf0; border-radius: 14px; padding: 14px; display: grid; gap: 14px; }
      .mobile-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    }

    @media (max-width: 640px) {
      .page-shell { gap: 16px; }
      .page-header { align-items: stretch; flex-direction: column; }
      .page-header .primary-button { width: 100%; }
      .summary-grid { grid-template-columns: 1fr; }
      .summary-card:last-child { grid-column: auto; }
      .toolbar { align-items: stretch; flex-direction: column; }
      .toolbar-meta { padding-left: 2px; }
      .pagination { align-items: stretch; flex-direction: column; }
      .pagination-actions { display: grid; grid-template-columns: 1fr 1fr; }
      .pagination-actions button { width: 100%; }
      .form-grid { grid-template-columns: 1fr; }
      .drawer-header, .customer-form { padding-left: 18px; padding-right: 18px; }
      .drawer-actions { display: grid; grid-template-columns: 1fr; }
      .drawer-actions .primary-button { grid-row: 1; }
      .toast { right: 16px; bottom: 16px; left: 16px; min-width: 0; }
    }
  `]
})
export class CustomersComponent {
  readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly customersService = inject(CustomersService);
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
  readonly toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  readonly data = signal<PagedResponse<CustomerListItem>>({
    items: [],
    page: 1,
    pageSize: this.pageSize,
    totalItems: 0,
    totalPages: 0
  });

  readonly displayTotalPages = computed(() => Math.max(this.data().totalPages, 1));

  readonly searchControl = this.fb.nonNullable.control('');
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
    email: ['', [Validators.email, Validators.maxLength(180)]],
    phone: ['', [Validators.maxLength(40)]],
    document: ['', [Validators.maxLength(40)]],
    notes: ['', [Validators.maxLength(1000)]]
  });

  constructor() {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.loadCustomers(1));

    this.loadCustomers(1);
  }

  loadCustomers(page: number): void {
    this.loading.set(true);

    this.customersService
      .list(this.searchControl.value, page, this.pageSize)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.data.set(response),
        error: (error: HttpErrorResponse) => {
          this.showToast('error', this.errorMessage(error, 'Não foi possível carregar os clientes.'));
        }
      });
  }

  clearSearch(): void {
    this.searchControl.setValue('');
  }

  previousPage(): void {
    if (this.data().page > 1) {
      this.loadCustomers(this.data().page - 1);
    }
  }

  nextPage(): void {
    if (this.data().page < this.displayTotalPages()) {
      this.loadCustomers(this.data().page + 1);
    }
  }

  openCreate(): void {
    this.editingId.set(null);
    this.formError.set(null);
    this.form.reset({ name: '', email: '', phone: '', document: '', notes: '' });
    this.drawerLoading.set(false);
    this.drawerOpen.set(true);
  }

  openEdit(id: string): void {
    this.editingId.set(id);
    this.formError.set(null);
    this.drawerLoading.set(true);
    this.drawerOpen.set(true);

    this.customersService
      .getById(id)
      .pipe(finalize(() => this.drawerLoading.set(false)))
      .subscribe({
        next: (customer) => {
          this.form.reset({
            name: customer.name,
            email: customer.email ?? '',
            phone: customer.phone ?? '',
            document: customer.document ?? '',
            notes: customer.notes ?? ''
          });
        },
        error: (error: HttpErrorResponse) => {
          this.closeDrawer();
          this.showToast('error', this.errorMessage(error, 'Não foi possível abrir o cliente.'));
        }
      });
  }

  closeDrawer(): void {
    if (this.saving()) {
      return;
    }

    this.drawerOpen.set(false);
    this.drawerLoading.set(false);
    this.editingId.set(null);
    this.formError.set(null);
    this.form.reset({ name: '', email: '', phone: '', document: '', notes: '' });
  }

  save(): void {
    this.formError.set(null);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();
    const payload: CustomerPayload = {
      name: raw.name.trim(),
      email: this.optional(raw.email),
      phone: this.optional(raw.phone),
      document: this.optional(raw.document),
      notes: this.optional(raw.notes)
    };

    this.saving.set(true);
    const editingId = this.editingId();
    const request$ = editingId
      ? this.customersService.update(editingId, payload)
      : this.customersService.create(payload);

    request$
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.drawerOpen.set(false);
          this.editingId.set(null);
          this.form.reset({ name: '', email: '', phone: '', document: '', notes: '' });
          this.showToast('success', editingId ? 'Cliente atualizado com sucesso.' : 'Cliente cadastrado com sucesso.');
          this.loadCustomers(editingId ? this.data().page : 1);
        },
        error: (error: HttpErrorResponse) => {
          this.formError.set(this.errorMessage(error, 'Não foi possível salvar o cliente.'));
        }
      });
  }

  async remove(customer: CustomerListItem): Promise<void> {
    const confirmed = await this.confirm.open({
      title: 'Excluir cliente?',
      message: `O cadastro de "${customer.name}" será desativado. O histórico relacionado continuará preservado.`,
      confirmLabel: 'Excluir cliente',
      tone: 'danger'
    });

    if (!confirmed) {
      return;
    }

    this.deletingId.set(customer.id);

    this.customersService
      .delete(customer.id)
      .pipe(finalize(() => this.deletingId.set(null)))
      .subscribe({
        next: () => {
          this.showToast('success', 'Cliente excluído com sucesso.');
          const targetPage = this.data().items.length === 1 && this.data().page > 1
            ? this.data().page - 1
            : this.data().page;
          this.loadCustomers(targetPage);
        },
        error: (error: HttpErrorResponse) => {
          this.showToast('error', this.errorMessage(error, 'Não foi possível excluir o cliente.'));
        }
      });
  }

  canDeleteCustomers(): boolean { return this.auth.hasAnyRole(['OWNER', 'ADMIN', 'MANAGER']); }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      return 'CL';
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  private optional(value: string): string | null {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private errorMessage(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error?.message === 'string') {
      return error.error.message;
    }

    const validationErrors = error.error?.errors;
    if (validationErrors && typeof validationErrors === 'object') {
      const first = Object.values(validationErrors).flat().find((message) => typeof message === 'string');
      if (typeof first === 'string') {
        return first;
      }
    }

    if (error.status === 0) {
      return 'A API não respondeu. Verifique se o backend está rodando.';
    }

    return fallback;
  }

  private showToast(type: 'success' | 'error', message: string): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }

    this.toast.set({ type, message });
    this.toastTimer = setTimeout(() => this.toast.set(null), 3600);
  }
}
