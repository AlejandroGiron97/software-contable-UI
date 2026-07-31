import { Injectable, signal, computed, effect } from '@angular/core';
import { SavingsFund, ExtraFeeCampaign, FundContribution, FundWithdrawal, FundTotals } from '../models/fund.model';
import { computeFundTotals } from '../core/utils/fund-totals.util';
import { generateId } from '../core/utils/id-generator.util';
import { STORAGE_KEYS } from '../core/persistence/storage-keys.const';
import { loadFromStorage, saveToStorage } from '../core/persistence/local-storage.util';

const EMPTY_FUND: SavingsFund = { contributions: [], withdrawals: [] };

@Injectable({ providedIn: 'root' })
export class FundsService {
  readonly savingsFund = signal<SavingsFund>(EMPTY_FUND);
  readonly extraFeeCampaigns = signal<ExtraFeeCampaign[]>([]);

  readonly savingsTotals = computed<FundTotals>(() => computeFundTotals(this.savingsFund()));

  constructor() {
    this.savingsFund.set(loadFromStorage(STORAGE_KEYS.savingsFund, EMPTY_FUND));
    this.extraFeeCampaigns.set(loadFromStorage(STORAGE_KEYS.extraFeeCampaigns, []));
    effect(() => saveToStorage(STORAGE_KEYS.savingsFund, this.savingsFund()));
    effect(() => saveToStorage(STORAGE_KEYS.extraFeeCampaigns, this.extraFeeCampaigns()));
  }

  // ── Ahorro ──
  setSavingsContributions(rows: FundContribution[]): void {
    this.savingsFund.update(f => ({ ...f, contributions: rows }));
  }

  setSavingsWithdrawals(rows: FundWithdrawal[]): void {
    this.savingsFund.update(f => ({ ...f, withdrawals: rows }));
  }

  updateSavingsNote(note: string): void {
    this.savingsFund.update(f => ({ ...f, note }));
  }

  // ── Cuotas extraordinarias ──
  createCampaign(name: string, goal: number): string {
    const id = generateId();
    this.extraFeeCampaigns.update(cs => [...cs, { id, name, goal, contributions: [], withdrawals: [] }]);
    return id;
  }

  setCampaignContributions(campaignId: string, rows: FundContribution[]): void {
    this.updateCampaign(campaignId, c => ({ ...c, contributions: rows }));
  }

  setCampaignWithdrawals(campaignId: string, rows: FundWithdrawal[]): void {
    this.updateCampaign(campaignId, c => ({ ...c, withdrawals: rows }));
  }

  updateCampaignNote(campaignId: string, note: string): void {
    this.updateCampaign(campaignId, c => ({ ...c, note }));
  }

  removeCampaign(campaignId: string): void {
    this.extraFeeCampaigns.update(cs => cs.filter(c => c.id !== campaignId));
  }

  getCampaign(campaignId: string): ExtraFeeCampaign | undefined {
    return this.extraFeeCampaigns().find(c => c.id === campaignId);
  }

  campaignTotals(campaignId: string): FundTotals {
    const campaign = this.getCampaign(campaignId);
    return campaign ? computeFundTotals(campaign) : { collected: 0, withdrawn: 0, available: 0 };
  }

  loadFunds(state: { savingsFund: SavingsFund; extraFeeCampaigns: ExtraFeeCampaign[] }): void {
    this.savingsFund.set(state.savingsFund);
    this.extraFeeCampaigns.set(state.extraFeeCampaigns);
  }

  private updateCampaign(campaignId: string, update: (c: ExtraFeeCampaign) => ExtraFeeCampaign): void {
    this.extraFeeCampaigns.update(cs => cs.map(c => (c.id === campaignId ? update(c) : c)));
  }
}
