import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ExcelService } from '../../services/excel.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  template: `
    <div class="landing">
      <div class="brand-panel">
        <div class="brand-inner">
          <div class="brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          </div>
          <h1>Sistema Contable</h1>
          <p class="tagline">Gestión financiera continua basada en archivos</p>
          <div class="features">
            <div class="feature">
              <span class="feat-dot green"></span>
              <span>100% privado · Sin servidor</span>
            </div>
            <div class="feature">
              <span class="feat-dot blue"></span>
              <span>Persistencia en Excel portátil</span>
            </div>
            <div class="feature">
              <span class="feat-dot yellow"></span>
              <span>Semáforo financiero automático</span>
            </div>
            <div class="feature">
              <span class="feat-dot red"></span>
              <span>Reportes PDF multipágina</span>
            </div>
          </div>
        </div>
      </div>

      <div class="options-panel">
        <div class="options-inner">
          <h2>¿Cómo desea iniciar?</h2>
          <p class="subtitle">Elija una opción para comenzar su sesión</p>

          <div class="option-card" (click)="irNueva()" tabindex="0" (keydown.enter)="irNueva()">
            <div class="opt-icon new">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div class="opt-text">
              <strong>Nueva Sesión en Blanco</strong>
              <span>Comienza a registrar tu historial financiero desde cero. Ideal para el primer uso.</span>
            </div>
            <div class="opt-arrow">›</div>
          </div>

          <div class="option-divider"><span>o</span></div>

          <div class="option-card" (click)="fileInput.click()" tabindex="0" (keydown.enter)="fileInput.click()">
            <div class="opt-icon load">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div class="opt-text">
              <strong>Cargar Historial en Excel</strong>
              <span>Recupera tu línea de tiempo financiera desde un archivo <em>.xlsx</em> previamente guardado.</span>
            </div>
            <div class="opt-arrow">›</div>
          </div>

          <input #fileInput type="file" accept=".xlsx" hidden (change)="onArchivo($event)" />

          @if (error) {
            <div class="error-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="err-icon">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              {{ error }}
            </div>
          }

          @if (loading) {
            <div class="loading-box">Procesando archivo...</div>
          }

          <p class="footer-note">
            Sus datos nunca salen de su dispositivo. Costo de infraestructura: $0.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .landing {
      display: flex;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .brand-panel {
      width: 42%;
      background: linear-gradient(160deg, #1e3a5f 0%, #1f2937 50%, #111827 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem;
    }
    .brand-inner { color: white; max-width: 320px; }
    .brand-icon {
      width: 64px; height: 64px;
      background: rgba(255,255,255,.12);
      border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 1.5rem;
    }
    .brand-icon svg { width: 36px; height: 36px; color: #60a5fa; }
    .brand-inner h1 {
      font-size: 2rem; font-weight: 800; margin: 0 0 .5rem;
      background: linear-gradient(90deg, #fff, #93c5fd);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .tagline { color: rgba(255,255,255,.6); font-size: .95rem; margin: 0 0 2rem; }
    .features { display: flex; flex-direction: column; gap: .75rem; }
    .feature { display: flex; align-items: center; gap: .6rem; color: rgba(255,255,255,.8); font-size: .875rem; }
    .feat-dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }
    .feat-dot.green { background: #4ade80; }
    .feat-dot.blue { background: #60a5fa; }
    .feat-dot.yellow { background: #fbbf24; }
    .feat-dot.red { background: #f87171; }

    .options-panel {
      flex: 1;
      background: #f8fafc;
      display: flex; align-items: center; justify-content: center;
      padding: 3rem;
    }
    .options-inner { width: 100%; max-width: 440px; }
    .options-inner h2 { font-size: 1.6rem; font-weight: 800; color: #0f172a; margin: 0 0 .4rem; }
    .subtitle { color: #64748b; margin: 0 0 2rem; font-size: .95rem; }

    .option-card {
      display: flex; align-items: center; gap: 1rem;
      background: white; border: 2px solid #e2e8f0;
      border-radius: 12px; padding: 1.25rem 1rem;
      cursor: pointer; transition: all .2s; outline: none;
    }
    .option-card:hover, .option-card:focus {
      border-color: #2563eb;
      box-shadow: 0 4px 20px rgba(37,99,235,.15);
      transform: translateY(-1px);
    }
    .opt-icon {
      width: 48px; height: 48px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .opt-icon.new { background: #eff6ff; }
    .opt-icon.new svg { color: #2563eb; width: 26px; height: 26px; }
    .opt-icon.load { background: #f0fdf4; }
    .opt-icon.load svg { color: #16a34a; width: 26px; height: 26px; }
    .opt-text { flex: 1; }
    .opt-text strong { display: block; font-size: .95rem; color: #0f172a; margin-bottom: .25rem; }
    .opt-text span { font-size: .82rem; color: #64748b; line-height: 1.4; }
    .opt-arrow { font-size: 1.4rem; color: #94a3b8; font-weight: 300; }

    .option-divider {
      display: flex; align-items: center; gap: 1rem;
      margin: 1.25rem 0; color: #94a3b8; font-size: .85rem;
    }
    .option-divider::before, .option-divider::after {
      content: ''; flex: 1; height: 1px; background: #e2e8f0;
    }

    .error-box {
      display: flex; align-items: center; gap: .6rem;
      margin-top: 1.25rem; padding: .875rem 1rem;
      background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;
      color: #dc2626; font-size: .875rem;
    }
    .err-icon { width: 18px; height: 18px; flex-shrink: 0; }
    .loading-box {
      margin-top: 1rem; padding: .75rem 1rem; background: #eff6ff;
      border-radius: 8px; color: #2563eb; font-size: .875rem; text-align: center;
    }
    .footer-note {
      margin-top: 2rem; text-align: center; color: #94a3b8; font-size: .78rem;
    }

    @media (max-width: 700px) {
      .landing { flex-direction: column; }
      .brand-panel { width: 100%; padding: 2rem; }
      .options-panel { padding: 2rem 1.5rem; }
    }
  `],
})
export class LandingComponent {
  private router = inject(Router);
  private excel = inject(ExcelService);

  error = '';
  loading = false;

  irNueva(): void {
    this.router.navigate(['/dashboard']);
  }

  async onArchivo(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.error = '';
    this.loading = true;
    try {
      await this.excel.importar(file);
      this.router.navigate(['/dashboard']);
    } catch (e: any) {
      this.error = typeof e === 'string' ? e : 'Error al cargar el archivo.';
    } finally {
      this.loading = false;
    }
  }
}
