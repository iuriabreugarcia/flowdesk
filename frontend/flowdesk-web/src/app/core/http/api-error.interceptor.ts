import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../feedback/toast.service';

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const toast = inject(ToastService);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 0) {
        toast.error(
          'Não foi possível conectar à API. Verifique se o backend está em execução.',
          'API indisponível'
        );
      } else if (error.status === 403) {
        toast.warning(
          'Seu perfil não possui permissão para executar esta ação.',
          'Acesso restrito'
        );
      } else if (error.status >= 500) {
        toast.error(
          'O servidor encontrou um erro inesperado. Tente novamente em instantes.',
          'Erro no servidor'
        );
      }

      return throwError(() => error);
    })
  );
};
