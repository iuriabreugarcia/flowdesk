import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/feedback/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="toast-region" aria-live="polite" aria-label="Notificações">
      @for (toast of service.toasts(); track toast.id) {
        <article
          class="toast-card"
          [class.success]="toast.variant === 'success'"
          [class.error]="toast.variant === 'error'"
          [class.warning]="toast.variant === 'warning'"
          [class.info]="toast.variant === 'info'"
        >
          <span class="toast-icon" aria-hidden="true">
            {{ toast.variant === 'success' ? '✓' : toast.variant === 'info' ? 'i' : '!' }}
          </span>

          <span class="toast-copy">
            <strong>{{ toast.title }}</strong>
            <span>{{ toast.message }}</span>
          </span>

          <button
            type="button"
            class="toast-close"
            (click)="service.dismiss(toast.id)"
            aria-label="Fechar notificação"
          >
            ×
          </button>
        </article>
      }
    </section>
  `,
  styles: [`
    :host { position: fixed; inset: 0; pointer-events: none; z-index: 1000; }
    .toast-region {
      position: absolute;
      top: 84px;
      right: 20px;
      width: min(390px, calc(100vw - 32px));
      display: grid;
      gap: 10px;
    }
    .toast-card {
      pointer-events: auto;
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr) 28px;
      align-items: start;
      gap: 10px;
      padding: 13px;
      border: 1px solid #e2e7f0;
      border-radius: 14px;
      color: #293246;
      background: rgba(255,255,255,.97);
      box-shadow: 0 18px 50px rgba(21,30,49,.14);
      backdrop-filter: blur(16px);
      animation: enter .2s ease-out;
    }
    .toast-icon {
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 900;
    }
    .toast-copy { min-width: 0; display: grid; gap: 3px; }
    .toast-copy strong { font-size: 13px; }
    .toast-copy span { color: #727c91; font-size: 12px; line-height: 1.45; }
    .toast-close {
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: 8px;
      color: #8b94a8;
      background: transparent;
      font-size: 18px;
    }
    .toast-close:hover { color: #2f384c; background: #f3f5f9; }
    .success .toast-icon { color: #087555; background: #e5f8f1; }
    .error .toast-icon { color: #b52f47; background: #fff0f3; }
    .warning .toast-icon { color: #a76305; background: #fff5df; }
    .info .toast-icon { color: #5547eb; background: #efedff; }

    @keyframes enter {
      from { opacity: 0; transform: translateY(-8px) scale(.985); }
      to { opacity: 1; transform: none; }
    }

    @media (max-width: 620px) {
      .toast-region { top: 72px; right: 16px; }
    }
  `]
})
export class ToastContainerComponent {
  readonly service = inject(ToastService);
}
