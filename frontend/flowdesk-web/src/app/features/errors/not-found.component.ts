import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-not-found',
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <main class="not-found">
      <span class="code">404</span>
      <span class="eyebrow">PÁGINA NÃO ENCONTRADA</span>
      <h1>Esse caminho não existe no FlowDesk.</h1>
      <p>
        O endereço pode ter mudado ou o recurso não está disponível.
        Volte ao dashboard para continuar sua operação.
      </p>
      <a routerLink="/dashboard">Voltar ao dashboard →</a>
    </main>
  `,
    styles: [`
    :host { display: block; }
    .not-found {
      min-height: calc(100vh - 134px);
      display: grid;
      place-content: center;
      justify-items: center;
      padding: 40px 20px;
      text-align: center;
    }
    .code {
      margin-bottom: 8px;
      color: #6d5dfc;
      font-size: clamp(72px, 12vw, 132px);
      line-height: .9;
      font-weight: 900;
      letter-spacing: -.08em;
      opacity: .16;
    }
    .eyebrow { color: #6d5dfc; font-size: 11px; font-weight: 900; letter-spacing: .15em; }
    h1 { margin: 12px 0 8px; color: #20283b; font-size: clamp(26px, 4vw, 38px); letter-spacing: -.04em; }
    p { max-width: 540px; margin: 0; color: #7a8397; font-size: 14px; line-height: 1.65; }
    a {
      margin-top: 22px;
      padding: 11px 16px;
      border-radius: 11px;
      color: #fff;
      background: #6254ee;
      text-decoration: none;
      font-size: 13px;
      font-weight: 800;
    }
  `]
})
export class NotFoundComponent {}
