import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/theme/theme.service';

type DemoProfileId = 'OWNER' | 'ADMIN' | 'MANAGER' | 'USER';

interface DemoProfile {
  id: DemoProfileId;
  title: string;
  name: string;
  email: string;
  password: string;
  description: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="login-page">
      <section class="brand-panel">
        <div class="brand-content">
          <a class="brand" href="/" aria-label="FlowDesk">
            <span class="brand-mark">F</span>
            <span>FlowDesk</span>
          </a>

          <div class="hero-copy">
            <span class="eyebrow">BUSINESS OPERATIONS PLATFORM</span>
            <h1>Operação organizada.<br>Decisões mais rápidas.</h1>
            <p>
              Um SaaS moderno para centralizar clientes, ordens, estoque e indicadores
              em uma experiência simples e eficiente.
            </p>
          </div>

          <div class="feature-list">
            <span><i>✓</i> Multi-tenant</span>
            <span><i>✓</i> Gestão operacional</span>
            <span><i>✓</i> Analytics em tempo real</span>
          </div>
        </div>
      </section>

      <section class="form-panel">
        <button
          class="theme-toggle"
          type="button"
          (click)="theme.toggle()"
          [title]="theme.isDark() ? 'Usar tema claro' : 'Usar tema escuro'"
          [attr.aria-label]="theme.isDark() ? 'Usar tema claro' : 'Usar tema escuro'"
        >
          <span aria-hidden="true">{{ theme.isDark() ? '☀' : '☾' }}</span>
          <span>{{ theme.isDark() ? 'Claro' : 'Escuro' }}</span>
        </button>

        <div class="login-card">
          <div class="mobile-brand">
            <span class="brand-mark">F</span>
            <strong>FlowDesk</strong>
          </div>

          <span class="login-kicker">AMBIENTE DE PORTFÓLIO</span>
          <h2>Escolha um perfil</h2>
          <p class="subtitle">
            Selecione um nível de acesso para testar as permissões do FlowDesk.
          </p>

          <div class="profile-grid" role="group" aria-label="Perfis de demonstração">
            @for (profile of demoProfiles; track profile.id) {
              <button
                class="profile-card"
                type="button"
                [class.selected]="selectedProfile() === profile.id"
                (click)="selectProfile(profile)"
              >
                <span class="profile-icon">{{ profile.id.slice(0, 1) }}</span>
                <span class="profile-content">
                  <span class="profile-heading">
                    <strong>{{ profile.title }}</strong>
                    @if (selectedProfile() === profile.id) {
                      <span class="selected-badge">Selecionado</span>
                    }
                  </span>
                  <span class="profile-name">{{ profile.name }}</span>
                  <span class="profile-description">{{ profile.description }}</span>
                  <span class="profile-email">{{ profile.email }}</span>
                </span>
              </button>
            }
          </div>

          <div class="credentials-title">
            <span>Credenciais</span>
            <small>Preenchidas automaticamente pelo perfil escolhido</small>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <label>
              <span>E-mail</span>
              <input
                type="email"
                formControlName="email"
                autocomplete="email"
                placeholder="voce&#64;empresa.com"
              >
            </label>

            <label>
              <span>Senha</span>
              <input
                type="password"
                formControlName="password"
                autocomplete="current-password"
                placeholder="••••••••••"
              >
            </label>

            @if (errorMessage()) {
              <div class="error-message" role="alert">{{ errorMessage() }}</div>
            }

            <button class="primary-button" type="submit" [disabled]="form.invalid || loading()">
              @if (loading()) {
                <span class="spinner" aria-hidden="true"></span>
                Entrando...
              } @else {
                Entrar como {{ selectedProfile() }}
                <span aria-hidden="true">→</span>
              }
            </button>
          </form>

          <div class="demo-note">
            <strong>Senha padrão dos perfis:</strong>
            <span>FlowDesk&#64;123</span>
          </div>
        </div>
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }

    .login-page {
      min-height: 100vh;
      display: grid;
      grid-template-columns: minmax(400px, .95fr) minmax(570px, 1.05fr);
      background: #fff;
    }

    .brand-panel {
      position: relative;
      overflow: hidden;
      color: #fff;
      background:
        radial-gradient(circle at 15% 20%, rgba(109, 93, 252, .36), transparent 35%),
        radial-gradient(circle at 78% 82%, rgba(72, 196, 255, .2), transparent 32%),
        #0b1020;
    }

    .brand-panel::after {
      content: '';
      position: absolute;
      width: 440px;
      height: 440px;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 50%;
      right: -180px;
      bottom: -130px;
      box-shadow: 0 0 0 70px rgba(255,255,255,.025), 0 0 0 140px rgba(255,255,255,.018);
    }

    .brand-content {
      position: relative;
      z-index: 1;
      min-height: 100%;
      max-width: 760px;
      margin: 0 auto;
      padding: 48px clamp(42px, 6vw, 92px);
      display: flex;
      flex-direction: column;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      width: fit-content;
      color: #fff;
      text-decoration: none;
      font-size: 21px;
      font-weight: 800;
      letter-spacing: -.4px;
    }

    .brand-mark {
      width: 38px;
      height: 38px;
      border-radius: 11px;
      display: inline-grid;
      place-items: center;
      background: linear-gradient(135deg, #7867ff, #5a4cf0);
      color: white;
      font-weight: 800;
      box-shadow: 0 10px 30px rgba(109, 93, 252, .3);
    }

    .hero-copy { margin: auto 0; padding: 64px 0; }
    .eyebrow, .login-kicker { font-size: 13px; font-weight: 800; letter-spacing: .14em; }
    .eyebrow { color: #9ca9c8; }

    h1 {
      margin: 22px 0 20px;
      font-size: clamp(40px, 4.5vw, 64px);
      line-height: 1.02;
      letter-spacing: -.055em;
      max-width: 680px;
    }

    .hero-copy p {
      max-width: 580px;
      margin: 0;
      color: #aeb7cd;
      font-size: 17px;
      line-height: 1.7;
    }

    .feature-list {
      display: flex;
      flex-wrap: wrap;
      gap: 18px 26px;
      color: #b9c1d4;
      font-size: 15px;
    }

    .feature-list span { display: flex; gap: 8px; align-items: center; }
    .feature-list i { color: #8d82ff; font-style: normal; }

    .form-panel {
      position: relative;
      display: grid;
      place-items: center;
      padding: 28px 38px;
      background: #fff;
      overflow-y: auto;
    }

    .login-card {
      width: min(100%, 600px);
      padding: 22px 0;
    }

    .theme-toggle {
      position: absolute;
      top: 22px;
      right: 24px;
      min-height: 38px;
      padding: 0 11px;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border: 1px solid #dfe4ed;
      border-radius: 10px;
      color: #536078;
      background: #fff;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
    }

    .theme-toggle:hover {
      color: #5d4ee7;
      border-color: #cbc5ff;
      background: #faf9ff;
    }

    .mobile-brand { display: none; align-items: center; gap: 10px; margin-bottom: 30px; }
    .login-kicker { color: #6d5dfc; }

    h2 {
      margin: 10px 0 6px;
      font-size: 34px;
      letter-spacing: -.04em;
      color: #111827;
    }

    .subtitle {
      margin: 0 0 20px;
      color: #798197;
      font-size: 15px;
    }

    .profile-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 20px;
    }

    .profile-card {
      min-height: 118px;
      padding: 13px;
      display: flex;
      align-items: flex-start;
      gap: 11px;
      text-align: left;
      border: 1px solid #e1e5ee;
      border-radius: 14px;
      background: #fff;
      color: #222b3e;
      cursor: pointer;
      transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease, background .18s ease;
    }

    .profile-card:hover {
      transform: translateY(-1px);
      border-color: #c9c2ff;
      box-shadow: 0 9px 24px rgba(75,64,190,.08);
    }

    .profile-card.selected {
      border-color: #7566fa;
      background: #faf9ff;
      box-shadow: 0 0 0 3px rgba(109,93,252,.09);
    }

    .profile-icon {
      width: 36px;
      height: 36px;
      flex: 0 0 auto;
      display: grid;
      place-items: center;
      border-radius: 10px;
      color: #6555ef;
      background: #efedff;
      font-size: 14px;
      font-weight: 900;
    }

    .profile-content {
      min-width: 0;
      display: grid;
      gap: 3px;
      flex: 1;
    }

    .profile-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .profile-heading strong {
      color: #1c2435;
      font-size: 14px;
      letter-spacing: .02em;
    }

    .selected-badge {
      padding: 3px 6px;
      border-radius: 999px;
      color: #5d4ee7;
      background: #ece9ff;
      font-size: 9px;
      font-weight: 800;
      white-space: nowrap;
    }

    .profile-name { color: #586177; font-size: 12px; font-weight: 700; }
    .profile-description { color: #858da0; font-size: 11px; line-height: 1.35; }
    .profile-email {
      margin-top: 2px;
      color: #695bec;
      font-size: 10px;
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .credentials-title {
      margin: 2px 0 12px;
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
    }

    .credentials-title span { color: #30394d; font-size: 14px; font-weight: 800; }
    .credentials-title small { color: #8a93a6; font-size: 10px; }

    form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    label {
      display: grid;
      gap: 6px;
      color: #333b4e;
      font-size: 13px;
      font-weight: 700;
    }

    input {
      width: 100%;
      height: 46px;
      padding: 0 14px;
      border: 1px solid #dfe4ee;
      border-radius: 11px;
      outline: none;
      color: #172033;
      background: #fff;
      font-size: 14px;
      transition: border-color .2s, box-shadow .2s;
    }

    input:focus {
      border-color: #6d5dfc;
      box-shadow: 0 0 0 4px rgba(109,93,252,.1);
    }

    .primary-button {
      grid-column: 1 / -1;
      min-height: 48px;
      border: 0;
      border-radius: 11px;
      padding: 0 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: white;
      background: linear-gradient(135deg, #7162fd, #5849e9);
      font-weight: 800;
      box-shadow: 0 12px 26px rgba(109,93,252,.2);
      cursor: pointer;
    }

    .primary-button:disabled { opacity: .58; cursor: not-allowed; }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,.35);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .error-message {
      grid-column: 1 / -1;
      padding: 10px 12px;
      border-radius: 10px;
      color: #a72e42;
      background: #fff0f3;
      border: 1px solid #ffd5dd;
      font-size: 13px;
    }

    .demo-note {
      margin-top: 12px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 1px dashed #d6dbe7;
      border-radius: 10px;
      color: #737c91;
      background: #fafbfe;
      font-size: 11px;
    }

    .demo-note strong { color: #485166; }

    @media (max-width: 1100px) {
      .login-page { grid-template-columns: minmax(340px, .8fr) minmax(530px, 1.2fr); }
      .brand-content { padding-inline: 36px; }
      h1 { font-size: 44px; }
    }

    @media (max-width: 900px) {
      .theme-toggle { top: 16px; right: 16px; }
      .login-page { grid-template-columns: 1fr; background: #f5f7fb; }
      .brand-panel { display: none; }
      .form-panel { min-height: 100vh; padding: 24px 18px; background: #f5f7fb; }
      .login-card { padding: 24px; border-radius: 22px; background: #fff; box-shadow: 0 20px 60px rgba(19,30,54,.08); }
      .mobile-brand { display: flex; }
      h2 { font-size: 30px; }
    }

    @media (max-width: 620px) {
      .profile-grid { grid-template-columns: 1fr; }
      form { grid-template-columns: 1fr; }
      .primary-button, .error-message { grid-column: 1; }
      .credentials-title { display: grid; gap: 2px; }
      .demo-note { flex-wrap: wrap; }
    }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly selectedProfile = signal<DemoProfileId>('OWNER');

  readonly demoProfiles: readonly DemoProfile[] = [
    {
      id: 'OWNER',
      title: 'OWNER',
      name: 'Admin Demo',
      email: 'admin@flowdesk.dev',
      password: 'FlowDesk@123',
      description: 'Acesso total ao workspace, equipe e configurações.'
    },
    {
      id: 'ADMIN',
      title: 'ADMIN',
      name: 'Admin Operacional',
      email: 'admin.ops@flowdesk.dev',
      password: 'FlowDesk@123',
      description: 'Administra equipe e toda a operação do negócio.'
    },
    {
      id: 'MANAGER',
      title: 'MANAGER',
      name: 'Gestor Demo',
      email: 'gestor@flowdesk.dev',
      password: 'FlowDesk@123',
      description: 'Gerencia clientes, ordens, catálogo e estoque.'
    },
    {
      id: 'USER',
      title: 'USER',
      name: 'Operador Demo',
      email: 'operador@flowdesk.dev',
      password: 'FlowDesk@123',
      description: 'Perfil operacional com permissões limitadas.'
    }
  ];

  readonly form = this.fb.nonNullable.group({
    email: ['admin@flowdesk.dev', [Validators.required, Validators.email]],
    password: ['FlowDesk@123', [Validators.required, Validators.minLength(8)]]
  });

  constructor() {
    if (this.auth.isAuthenticated()) {
      void this.router.navigate(['/dashboard']);
    }
  }

  selectProfile(profile: DemoProfile): void {
    this.selectedProfile.set(profile.id);
    this.errorMessage.set('');
    this.form.setValue({
      email: profile.email,
      password: profile.password
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.auth
      .login(this.form.getRawValue())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
          void this.router.navigateByUrl(returnUrl);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            error.error?.message ?? 'Não foi possível acessar sua conta. Verifique a API.'
          );
        }
      });
  }
}
