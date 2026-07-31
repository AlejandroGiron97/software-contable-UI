import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FundsService } from '../../services/funds.service';

export type FinancingValue =
  | { source: 'savings' }
  | { source: 'extra-fee'; campaignId: string }
  | null;

@Component({
  selector: 'app-financing-select',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './financing-select.component.html',
  styleUrl: './financing-select.component.scss',
})
export class FinancingSelectComponent {
  private funds = inject(FundsService);

  @Input() value: FinancingValue = null;
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<FinancingValue>();

  readonly campaigns = this.funds.extraFeeCampaigns;

  get selectValue(): string {
    if (!this.value) return '';
    if (this.value.source === 'savings') return 'savings';
    return `campaign:${this.value.campaignId}`;
  }

  onChange(raw: string): void {
    if (!raw) { this.valueChange.emit(null); return; }
    if (raw === 'savings') { this.valueChange.emit({ source: 'savings' }); return; }
    this.valueChange.emit({ source: 'extra-fee', campaignId: raw.slice('campaign:'.length) });
  }
}
