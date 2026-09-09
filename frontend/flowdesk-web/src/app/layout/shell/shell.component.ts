import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-shell">
      <aside class="sidebar" [class.open]="menuOpen()">
        <div class="sidebar-header">
          <a routerLink="/dashboard" class="brand" (click)="closeMenu()">
            <span class="brand-mark">F</span>
            <span>FlowDesk</span>
          </a>
          <button class="mobile-close" type="button" (click)="closeMenu()" aria-label="Fechar menu">×</button>
        </div>

        <div class="workspace">
          <span class="workspace-avatar">FD</span>
          <span>
            <small>WORKSPACE</small>
            <strong>{{ auth.user()?.companyName }}</strong>
          </span>
        </div>

        <nav>
          <span class="nav-label">PRINCIPAL</span>
          <a routerLink="/dashboard" routerLinkActive="active" (click)="closeMenu()">
            <span class="icon">⌂</span> Dashboard
          </a>
          <a routerLink="/clientes" routerLinkActive="active" (click)="closeMenu()">
            <span class="icon">◎</span> Clientes
          </a>
          <a routerLink="/ordens" routerLinkActive="active" (click)="closeMenu()">
            <span class="icon">▦</span> Ordens
          </a>

          <span class="nav-label secondary">GESTÃO</span>
          <a routerLink="/produtos" routerLinkActive="active" (click)="closeMenu()">
            <span class="icon">◇</span> Produtos
          </a>
          <a routerLink="/estoque" routerLinkActive="active" (click)="closeMenu()">
            <span class="icon">↕</span> Estoque
          </a>
          <a routerLink="/relatorios" routerLinkActive="active" (click)="closeMenu()">
            <span class="icon">◫</span> Relatórios
          </a>

          @if (auth.canManageTeam()) {
            <span class="nav-label secondary">ADMINISTRAÇÃO</span>
            <a routerLink="/equipe" routerLinkActive="active" (click)="closeMenu()">
              <span class="icon">♙</span> Equipe
            </a>
          }

        </nav>

        <div class="sidebar-footer">
          <div class="user-card">
            <span class="avatar">{{ initials() }}</span>
            <span class="user-info">
              <strong>{{ auth.user()?.name }}</strong>
              <small>{{ auth.user()?.role }}</small>
            </span>
            <button
              class="logout-button"
              type="button"
              (click)="logout()"
              title="Sair da conta"
              aria-label="Sair da conta"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M10 17l5-5-5-5"></path>
                <path d="M15 12H3"></path>
                <path d="M14 3h4a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-4"></path>
              </svg>
              <span class="logout-label">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      @if (menuOpen()) {
        <button class="backdrop" type="button" (click)="closeMenu()" aria-label="Fechar menu"></button>
      }

      <section class="content-area">
        <header class="topbar">
          <button class="menu-button" type="button" (click)="toggleMenu()" aria-label="Abrir menu">☰</button>
          <div class="topbar-spacer"></div>
          <button
            class="theme-button"
            type="button"
            (click)="theme.toggle()"
            [title]="theme.isDark() ? 'Usar tema claro' : 'Usar tema escuro'"
            [attr.aria-label]="theme.isDark() ? 'Usar tema claro' : 'Usar tema escuro'"
          >
            <span aria-hidden="true">{{ theme.isDark() ? '☀' : '☾' }}</span>
          </button>
          <button
            class="topbar-logout"
            type="button"
            (click)="logout()"
            title="Sair da conta"
            aria-label="Sair da conta"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M10 17l5-5-5-5"></path>
              <path d="M15 12H3"></path>
              <path d="M14 3h4a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-4"></path>
            </svg>
            <span>Sair</span>
          </button>
          <div class="top-user">
            <span class="avatar small">{{ initials() }}</span>
            <span>
              <strong>{{ auth.user()?.name }}</strong>
              <small>{{ auth.user()?.companyName }}</small>
            </span>
          </div>
        </header>

        <main class="page-content">
          <router-outlet />
        </main>
      </section>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
    .app-shell { min-height: 100vh; display: grid; grid-template-columns: 255px 1fr; }
    .sidebar { position: sticky; top: 0; height: 100vh; padding: 16px 16px 12px; display: flex; flex-direction: column; background: #0b1020; color: #c4ccdc; z-index: 40; overflow-y: auto; overflow-x: hidden; }
    .sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: 0 6px; }
    .brand { display: flex; gap: 11px; align-items: center; text-decoration: none; color: #fff; font-size: 19px; font-weight: 800; }
    .brand-mark { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; background: linear-gradient(135deg, #7867ff, #5647ea); color: #fff; }
    .mobile-close { display: none; background: none; border: 0; color: #fff; font-size: 28px; }
    .workspace { margin: 16px 2px 16px; padding: 9px 10px; display: flex; gap: 9px; align-items: center; border: 1px solid rgba(255,255,255,.07); border-radius: 11px; background: rgba(255,255,255,.035); }
    .workspace-avatar { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; color: #b9b1ff; background: rgba(109,93,252,.18); font-size: 12px; font-weight: 800; }
    .workspace span:last-child { min-width: 0; display: grid; gap: 3px; }
    .workspace small, .user-card small { color: #68738d; font-size: 11px; font-weight: 800; letter-spacing: .08em; }
    .workspace strong { color: #e9edf6; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    nav { display: grid; gap: 3px; }
    .nav-label { margin: 0 10px 4px; color: #56627b; font-size: 10px; font-weight: 800; letter-spacing: .13em; }
    .nav-label.secondary { margin-top: 11px; }
    nav a, .disabled-link { min-height: 38px; padding: 0 10px; display: flex; gap: 10px; align-items: center; border-radius: 9px; color: #8f99af; text-decoration: none; font-size: 14px; font-weight: 600; transition: .2s ease; }
    nav a:hover { color: #fff; background: rgba(255,255,255,.045); }
    nav a.active { color: #fff; background: linear-gradient(90deg, rgba(109,93,252,.22), rgba(109,93,252,.08)); box-shadow: inset 2px 0 #7b6cff; }
    .disabled-link { opacity: .45; cursor: default; }
    .icon { width: 17px; text-align: center; font-size: 15px; }
    .sidebar-footer { margin-top: auto; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.07); }
    .user-card { display: flex; align-items: center; gap: 9px; }
    .avatar { flex: 0 0 auto; width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; color: #fff; background: #3b4357; font-size: 12px; font-weight: 800; }
    .avatar.small { width: 32px; height: 32px; background: #6d5dfc; }
    .user-info { min-width: 0; display: grid; gap: 2px; flex: 1; }
    .user-info strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #e6eaf2; font-size: 13px; }
    .logout-button {
      min-height: 34px;
      padding: 0 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 9px;
      background: rgba(255,255,255,.035);
      color: #aab3c6;
      font: inherit;
      font-size: 17px;
      cursor: pointer;
      transition: color .2s ease, background .2s ease, border-color .2s ease;
    }
    .logout-button:hover {
      color: #fff;
      background: rgba(255,255,255,.07);
      border-color: rgba(255,255,255,.08);
    }
    .logout-button:focus-visible {
      outline: 2px solid #8174ff;
      outline-offset: 2px;
    }
    .logout-label { font-size: 11px; font-weight: 800; letter-spacing: .02em; }
    .content-area { min-width: 0; }
    .topbar { height: 70px; padding: 0 30px; display: flex; align-items: center; gap: 14px; border-bottom: 1px solid #e8ebf2; background: rgba(255,255,255,.9); backdrop-filter: blur(18px); position: sticky; top: 0; z-index: 20; }
    .topbar-spacer { flex: 1; }
    .menu-button { display: none; width: 40px; height: 40px; border: 1px solid #e4e8f0; border-radius: 10px; background: white; color: #434b5f; }
    .theme-button {
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      border: 1px solid #e2e6ee;
      border-radius: 10px;
      background: #fff;
      color: #525d73;
      font: inherit;
      font-size: 17px;
      cursor: pointer;
      transition: color .2s ease, border-color .2s ease, background .2s ease;
    }
    .theme-button:hover { color: #5d4ee7; border-color: #cbc5ff; background: #faf9ff; }
    .theme-button:focus-visible { outline: 2px solid #8174ff; outline-offset: 2px; }
    .topbar-logout {
      height: 40px;
      padding: 0 13px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid #e2e6ee;
      border-radius: 10px;
      background: #fff;
      color: #525d73;
      font: inherit;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      transition: color .2s ease, border-color .2s ease, background .2s ease, box-shadow .2s ease;
    }
    .topbar-logout:hover {
      color: #e5484d;
      border-color: #f0c8ca;
      background: #fff7f7;
      box-shadow: 0 6px 18px rgba(229,72,77,.08);
    }
    .topbar-logout:focus-visible {
      outline: 2px solid #8174ff;
      outline-offset: 2px;
    }
    .topbar-logout svg,
    .logout-button svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.9;
      stroke-linecap: round;
      stroke-linejoin: round;
      flex: 0 0 auto;
    }
    .top-user { display: flex; align-items: center; gap: 9px; padding-left: 4px; }
    .top-user > span:last-child { display: grid; gap: 2px; }
    .top-user strong { color: #283145; font-size: 13px; }
    .top-user small { color: #8a93a6; font-size: 11px; }
    .page-content { padding: 32px; max-width: 1600px; margin: 0 auto; }
    .backdrop { display: none; }
    .sidebar { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.12) transparent; }
    .sidebar::-webkit-scrollbar { width: 5px; }
    .sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 999px; }

    @media (max-width: 980px) {
      .app-shell { grid-template-columns: 1fr; }
      .sidebar { position: fixed; left: 0; transform: translateX(-105%); width: min(84vw, 280px); transition: transform .22s ease; box-shadow: 28px 0 70px rgba(0,0,0,.24); }
      .sidebar.open { transform: translateX(0); }
      .mobile-close, .menu-button { display: block; }
      .backdrop { position: fixed; inset: 0; display: block; border: 0; background: rgba(9,14,28,.48); z-index: 30; }
      .topbar { padding: 0 18px; }
      .page-content { padding: 22px 18px 32px; }
    }

    @media (max-width: 620px) {
      .top-user > span:last-child { display: none; }
      .topbar-logout span { display: none; }
      .topbar-logout { width: 40px; padding: 0; justify-content: center; }
      .topbar { height: 62px; }
    }
  `]
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly menuOpen = signal(false);

  initials(): string {
    const name = this.auth.user()?.name ?? 'U';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.closeMenu();
    this.auth.logout();
  }
}
