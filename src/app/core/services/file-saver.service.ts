import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FileSaverService {
  async save(blob: Blob, suggestedName: string, mimeType: string, description = 'Archivo'): Promise<void> {
    if ('showSaveFilePicker' in window) {
      try {
        const ext = suggestedName.split('.').pop()!;
        const handle = await (window as any).showSaveFilePicker({
          suggestedName,
          types: [{ description, accept: { [mimeType]: [`.${ext}`] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (e: any) {
        if (e.name === 'AbortError') return;
      }
    }
    this.downloadViaAnchor(blob, suggestedName);
  }

  private downloadViaAnchor(blob: Blob, suggestedName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    a.click();
    URL.revokeObjectURL(url);
  }
}
