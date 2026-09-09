import { Injectable, signal } from '@angular/core';

export type ConfirmTone = 'default' | 'danger';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

export interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: ConfirmTone;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private resolver: ((value: boolean) => void) | null = null;
  private readonly stateSignal = signal<ConfirmState | null>(null);

  readonly state = this.stateSignal.asReadonly();

  open(options: ConfirmOptions): Promise<boolean> {
    if (this.resolver) {
      this.resolver(false);
    }

    this.stateSignal.set({
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? 'Confirmar',
      cancelLabel: options.cancelLabel ?? 'Cancelar',
      tone: options.tone ?? 'default'
    });

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  accept(): void {
    this.finish(true);
  }

  cancel(): void {
    this.finish(false);
  }

  private finish(result: boolean): void {
    const resolver = this.resolver;
    this.resolver = null;
    this.stateSignal.set(null);
    resolver?.(result);
  }
}
