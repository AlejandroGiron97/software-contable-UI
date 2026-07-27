# 💰 Sistema Contable

**Proactive accounting software, 100% private and server-free.**

Track your cash flow month by month, catch over-indebtedness before it becomes a crisis, and export your entire financial history to Excel or PDF — with no database, no backend, no subscription. Everything runs in your browser.

## 🎯 The idea

Most personal finance tools are *reactive*: they show you what already happened. This project takes a different approach: an **automatic financial traffic-light system** that evaluates in real time how healthy each period (month) is, based on the expenses-to-income ratio and available cash balance — so the warning arrives *before* the crisis, not after.

Built for both personal finances and residential building administration (it includes per-unit/apartment tracking), it lets you keep a continuous financial history, month after month, with contextual notes and full traceability for every transaction.

## ✨ Features

- **📊 Smart financial traffic light** — every period is automatically classified as *Surplus*, *Caution*, or *Critical*, based on debt-ratio rules centralized in a single place (`LedgerService`).
- **📁 Portable Excel persistence** — no database required: your full history exports/imports as `.xlsx`, so your data is always yours, in a file you can back up anywhere.
- **🧾 Executive PDF reports** — multi-page reports generated with `jsPDF`, including KPIs, cumulative cash-flow distribution, a monthly summary, and a line-by-line breakdown, ready to share or archive.
- **📈 Dependency-free charts** — visualizations (bar charts and cash-balance history) rendered as hand-built SVG, with no third-party charting library.
- **🔒 Real privacy** — no server, no login, no tracking. Infrastructure cost is literally $0 and your data never leaves the device.
- **✅ Per-item tracking** — every transaction records concept, type (income/expense/savings), date, status (paid/pending), and associated unit, for full traceability.

## 🧠 Technical highlights

- **Angular 19 standalone + Signals** — end-to-end reactive state with `signal`/`computed`, no `NgModules`, no manual subscription management.
- **Single source of truth** — all business logic (alert calculation, totals, debt ratio) lives centralized in `LedgerService`, decoupled from the UI.
- **Excel as a persistence layer** — `ExcelService` doesn't just export: it parses and validates the imported file to fully rebuild the app's state, acting as a real backup/restore format.
- **Data-driven PDF generation** — every report page (dashboard, summary, monthly detail) is built dynamically from current state, with conditional styling based on each period's traffic-light status.

## 🛠️ Stack

Angular 19 · TypeScript · RxJS · `xlsx` · `jspdf` + `jspdf-autotable` · SCSS

## 🚀 Getting started

```bash
npm install
ng serve
```

Open `http://localhost:4200/` — the app reloads automatically as you edit the source files.

## 📦 Build

```bash
ng build
```

Production artifacts are output to `dist/`, optimized by default.

## 🧪 Tests

```bash
ng test
```
