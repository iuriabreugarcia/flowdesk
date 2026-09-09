import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { ConfirmService } from '../../core/feedback/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (service.state(); as dialog) {
      <button
        class="dialog-backdrop"
        type="button"
        aria-label="Cancelar"
        (click)="service.cancel()"
      ></button>

      <section
        class="dialog-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <span class="dialog-icon" [class.danger]="dialog.tone === 'danger'" aria-hidden="true">
          {{ dialog.tone === 'danger' ? '!' : '?' }}
        </span>

        <div class="dialog-copy">
          <h2 id="confirm-title">{{ dialog.title }}</h2>
          <p id="confirm-message">{{ dialog.message }}</p>
        </div>

        <div class="dialog-actions">
          <button class="secondary" type="button" (click)="service.cancel()">
            {{ dialog.cancelLabel }}
          </button>
          <button
            class="primary"
            [class.danger]="dialog.tone === 'danger'"
            type="button"
            (click)="service.accept()"
          >
            {{ dialog.confirmLabel }}
          </button>
        </div>
      </section>
    }
  `,
  styles: [`
    :host { position: fixed; inset: 0; pointer-events: none; z-index: 1100; }
    .dialog-backdrop {
      pointer-events: auto;
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: 0;
      background: rgba(8,13,26,.56);
      backdrop-filter: blur(3px);
    }
    .dialog-card {
      pointer-events: auto;
      position: absolute;
      top: 50%;
      left: 50%;
      width: min(440px, calc(100vw - 32px));
      transform: translate(-50%, -50%);
      padding: 22px;
      border: 1px solid #e1e6ef;
      border-radius: 18px;
      color: #222b3e;
      background: #fff;
      box-shadow: 0 28px 90px rgba(9,16,31,.28);
      animation: pop .18s ease-out;
    }
    .dialog-icon {
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      margin-bottom: 15px;
      border-radius: 12px;
      color: #5b4ee8;
      background: #efedff;
      font-size: 18px;
      font-weight: 900;
    }
    .dialog-icon.danger { color: #b6334a; background: #fff0f3; }
    .dialog-copy h2 { margin: 0 0 7px; font-size: 20px; letter-spacing: -.025em; }
    .dialog-copy p { margin: 0; color: #737d91; font-size: 13px; line-height: 1.6; }
    .dialog-actions { margin-top: 22px; display: flex; justify-content: flex-end; gap: 9px; }
    .dialog-actions button {
      min-height: 40px;
      padding: 0 15px;
      border-radius: 10px;
      font-weight: 800;
    }
    .secondary { border: 1px solid #dfe4ed; color: #536078; background: #fff; }
    .primary { border: 0; color: #fff; background: #6254ee; }
    .primary.danger { background: #c33f53; }

    @keyframes pop {
      from { opacity: 0; transform: translate(-50%, -48%) scale(.98); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
  `]
})
export class ConfirmDialogComponent {
  readonly service = inject(ConfirmService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.service.state()) {
      this.service.cancel();
    }
  }
}
