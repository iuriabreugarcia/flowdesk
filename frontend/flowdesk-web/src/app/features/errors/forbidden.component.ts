import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
    selector: 'app-forbidden', imports: [RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<section class="forbidden"><div class="code">403</div><span>ACESSO RESTRITO</span><h1>Você não tem permissão para esta área.</h1><p>Seu perfil continua autenticado, mas a função atual não autoriza esta operação.</p><a routerLink="/dashboard">Voltar ao dashboard</a></section>`,
    styles: [`:host{display:block}.forbidden{min-height:65vh;display:grid;place-items:center;align-content:center;text-align:center;padding:40px}.code{font-size: 72px;font-weight:900;letter-spacing:-.06em;color:#6d5dfc}.forbidden>span{color:#6d5dfc;font-size: 12px;font-weight:900;letter-spacing:.18em}.forbidden h1{max-width:620px;margin:14px 0 8px;font-size: 30px;letter-spacing:-.04em;color:#202533}.forbidden p{max-width:520px;margin:0 0 22px;color:#8a92a1;font-size: 14px;line-height:1.7}.forbidden a{padding:12px 18px;border-radius:10px;background:#171b26;color:white;text-decoration:none;font-size: 13px;font-weight:800}`]
}) export class ForbiddenComponent {}
