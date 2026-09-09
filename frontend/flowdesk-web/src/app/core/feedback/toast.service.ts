import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  variant: ToastVariant;
  title: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private sequence = 0;
  private readonly toastsSignal = signal<readonly ToastMessage[]>([]);

  readonly toasts = this.toastsSignal.asReadonly();

  success(message: string, title = 'Tudo certo'): void {
    this.show('success', title, message);
  }

  error(message: string, title = 'Não foi possível concluir'): void {
    this.show('error', title, message, 5200);
  }

  warning(message: string, title = 'Atenção'): void {
    this.show('warning', title, message, 4800);
  }

  info(message: string, title = 'Informação'): void {
    this.show('info', title, message);
  }

  dismiss(id: number): void {
    this.toastsSignal.update((items) => items.filter((item) => item.id !== id));
  }

  private show(
    variant: ToastVariant,
    title: string,
    message: string,
    duration = 4000
  ): void {
    const id = ++this.sequence;
    const toast: ToastMessage = { id, variant, title, message };

    this.toastsSignal.update((items) => [...items.slice(-3), toast]);

    window.setTimeout(() => this.dismiss(id), duration);
  }
}
