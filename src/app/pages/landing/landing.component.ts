import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ExcelService } from '../../services/excel.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent {
  private router = inject(Router);
  private excelService = inject(ExcelService);

  error = '';
  loading = false;

  startNewSession(): void {
    this.router.navigate(['/dashboard']);
  }

  async onFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.error = '';
    this.loading = true;
    try {
      await this.excelService.import(file);
      this.router.navigate(['/dashboard']);
    } catch (e: any) {
      this.error = typeof e === 'string' ? e : 'Error al cargar el archivo.';
    } finally {
      this.loading = false;
    }
  }
}
