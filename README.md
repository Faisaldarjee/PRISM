# 🔺 PRISM — Predictive Risk Intelligence & Strategy Matrix
### 📊 Unified Developer & Product Blueprint Suite

Welcome to the **PRISM** repository. This document serves as the absolute master-blueprint, system architect reference, and setup manual for the complete application. Designed specifically for Indian commodity ETFs and volatile equities, **PRISM** operates to eliminate emotional trading biases by answering three classic quantitative questions: **"KAB, KITNA aur KAHAN"** (When to buy, How much to allocate, and Where to park capital).

---

## 🗺️ Part 1: The 6 Foundation Blueprints

Below are the 6 foundational blueprints prepared to guide the development, testing, styling, data integrity, and orchestration flows of the **PRISM** ecosystem.

---

### 📋 1. Product Requirements Document (PRD)

| Parameter | Specification |
| :--- | :--- |
| **App Name** | PRISM (Predictive Risk Intelligence & Strategy Matrix) |
| **One-Line Idea** | A high-contrast quantitative portfolio advisor and risk calculator eliminating retail trading bias through decentralized multi-agent prediction scoring, dynamic RSI-tuned SIP planner, and ATR position sizers. |
| **Target Users** | Self-directed Indian retail investors, commodity ETF accumulators, active swing traders, and tactical portfolio compounders. |
| **User Role** | Single investor with optional profile synchronization to sync watchlists across devices. |
| **MVP Asset Scope** | Liquid Indian commodity index ETFs (**GOLDBEES.NS**, **SILVERBEES.NS**) and volatile benchmark equities (**TATAMOTORS.NS**, **ADANIPOWER.NS**, **SUZLON.NS**, **RELIANCE.NS**, **WAAREEENER.NS**). |
| **Out of Scope V1** | Automated direct broker algorithmic order routing, options chain writing/greeks, and intraday margin leveraged trading. |

#### Core User Stories
*   **SIP Timing (KAB)**: "As an investor, I want to see a systematic SIP planner that dynamically scales my monthly rupee budget based on the 14-day RSI, so that I accumulate heavily at bottoms and save capital in gold/silver reserves during market peaks."
*   **Risk Protection (KITNA)**: "As a swing trader, I want a position-sizing calculator that reads the asset's active Average True Range (ATR) and tells me the entry, target, stop loss, and *exact unit quantity* to buy based on my account size and custom risk threshold, so that I never blow up my trading account on a single bad play."
*   **Market Analysis (KAHAN)**: "As a self-directed allocator, I want to see today's top setups scanned on converging momentum indicators (ADX trend strength, Bollinger Band compression, volume ratios), backed by a live decentralized multi-agent voting ensemble, so that I allocate only to qualified setups."

---

### ⚙️ 2. Technical Requirements Document (TRD)

#### Technical Architecture Flowchart
```
[React 19 Frontend Web UI] ──(HTTP JSON / API Proxy)──> [Node.js Express Server Entry]
                                                               │
     ┌────────────────────────┬────────────────────────────────┼──────────────────────────────┐
     ▼                        ▼                                ▼                              ▼
[Yahoo Finance API]     [SQLite database]              [Google GenAI SDK]            [Indicator Formulas]
(Daily market feeds)   (Auth caches & watchlists)    (gemini-2.5-flash briefs)     (RSI-14, ADX, ATR, BB)
```

#### Selected Tech Stack
*   **User Interface Framework**: React 19 SPA served via Vite 6.
*   **Styling Engine**: Tailwind CSS v4 using the optimized PostCSS Vite bundler plugin. Includes raw `@import` styles and dynamic conditional typography styles.
*   **Server Entrypoint**: Express v4 (compiled as CJS in production via `esbuild` into `dist/server.cjs` for performance, and launched via `tsx` live TypeScript engine under development).
*   **Database Engine**: Offline-First `better-sqlite3` SQL database to cache ticker prices history, store prediction matrix coordinates, save notifications logs, and persist custom added equity symbols watchlists.
*   **AI Engine API**: Google GenAI SDK (`@google/genai` v1.52.0) utilizing clientless server-secured `gemini-2.5-flash` model weights for generating automated, on-demand portfolio morning briefs, swing trade templates, and weekly summary briefs.
*   **Technical Analytics Engine**: Mathematical calculations computed via the standard technicalindicators and mathjs libraries, delivering deterministic Bollinger Band Squeezes, RSI values, ATR metrics, and EMA trendlines crossover configurations.

---

### 🔄 3. App Flow Document

#### Screen Hierarchy & User Navigation
1.  **Dashboard Hub (Default Landing)**:
    *   **Desk A**: Real-time Interactive Market Ticker informing NSE market hour states.
    *   **Desk B**: *Today's Top 5 Swing Setups* matrix list displaying technical ratings.
    *   **Desk C**: *Dynamic Capital Allocation Calculator* - interactive input panels mapping trade budgets, custom volatility risk levels (%), custom pricing entry, and stop losses. Outputs share purchases quantity and targets.
2.  **Smart Swing Scanner**:
    *   Unified grid filtering setups by technical patterns (Bollinger Squeezes, RSI Overmatured, ADX Breakouts, MACD Crossovers).
    *   Interactive deep-dive trade plans with detailed multi-agent conviction bar votes.
3.  **RSI SIP Planner**:
    *   Visual representation of dynamic SIP scaling strategy.
    *   Interactive simulation graph illustrating how surplus funds are redirected to safe-haven cash/liquidity reserves under overpriced market conditions.
4.  **Real-Time Intelligence Hub**:
    *   Automated AI portfolio briefing block generating global macro indicators, institutional FII/DII flow summaries, corporate earnings schedules, and historical data Deal structures.
5.  **Audit Track Record Dashboard**:
    *   Visual performance reporting mapping past AI scoring accuracy metrics over 30, 60, and 90-day intervals, maintaining absolute transparency.

---

### 🎨 4. Style Guide & Design Tokens

**PRISM** utilizes a high-contrast premium slate-gold color palette optimized for high-vibe financial desks.

#### Color Tokens
*   **Deep Canvas Background**: `#05070C` (Sleek deep slate blue-black)
*   **Golden Accent Lineages**: `#D4A843` (Bevel borders, positive labels, conviction icons)
*   **Negative/Stop Loss Crimson**: `#EF4444` (Risk indicators, stop triggers)
*   **Positive/Target Emerald**: `#00D084` (Safe entry points, target limits, cash balances)
*   **Muted Text / Grid Lines**: `#8892A4`

#### Decorative Elements
*   Slight beveled glass border frames (`border-white/[0.05] bg-white/[0.02] backdrop-blur`).
*   Radial gold background auroric glows to draw focus to core interactive metrics.
*   Minimal, scannable spacing and high-vibe typography pairings ("Inter" paired with "JetBrains Mono").

---

### 🔒 5. Database Schema & Security Blueprints

The SQLite core is structured into robust, normalized tables with automated validation rules.

#### SQL Core Relations Configuration
*   `predictions_cache`: Persists raw historical pricing records and cached multi-agent evaluations.
*   `user_profiles`: Manages core user settings (capital, riskPercent, onboarded, custom watchlists symbols).
*   `alerts_log`: Audits notification historical outputs and alert trigger states.

---

### 🤖 6. AI & Multi-Agent Orchestration Blueprint

PRISM features a simulated multi-agent consensus network powered server-side by the Google Gemini API:

*   **Trend Agent (RSI/EMA)**: Decodes long-term momentum structures.
*   **Volatility Agent (ATR/BB)**: Establishes stop-loss levels and sizer constraints.
*   **Institutional Sentiment Agent (FII/DII/Volume)**: Evaluates volume pressure.
*   **Consensus Director (Director)**: Consolidates predictions into unified target units and conviction percentages.

---

## 🛠️ Part 2: Quick Start & Installation Instructions

To bring the PRISM suite online on your workstation:

### Prerequisite Environment Checklist
1.  **Node.js**: Verify Node v18+ is available.
2.  **API Credentials**: Register a free API key at [Google AI Studio](https://aistudio.google.com/).

### Installation Command Execution
```bash
# 1. Clone or copy files and map into directory
cd prism

# 2. Extract and establish dependencies
npm install

# 3. Create .env configuration based on template
cp .env.example .env
```

Open `.env` and paste your `GEMINI_API_KEY` to unlock live prediction briefings.

---

## 🚀 Unified Execution Daemon

To ensure data points stay fresh post-Indian market closing, **PRISM** includes an automated execution background daemon:

```bash
# Windows Unified Startup (Runs express server and browser)
run-local.bat
```

For advanced CLI utilities:
*   `python scheduler.py --now`: Instant manual multi-agent scoring batch execution.
*   `python add_symbol.py UTILITY <TICKER> STOCK`: Manually insert a custom stock symbol tracking reference.

---

## 🛡️ Resilience Core

To ensure continuous uptime and robust execution under strict third-party quota limits and data sparse conditions, **PRISM** implements the following structural resilience patterns:

1.  **Local Storage Synchronous Cache**: If live network routes hit the Yahoo rate limits, the UI silently falls back to local storage models (`prism_preds`, `prism_macro`, `prism_assets`) without throwing errors.
2.  **Graceful Degraded States**: Rate limiting elements display a helpful alert notice rather than crashing. All calculations remain 100% active and editable.

*Disclaimer: All indicators, automated SGD machine learning estimations, and swing templates compiled in PRISM operate strictly as tools for academic, paper testing, and technical study. Backtested or estimated past yields are never a guarantee of future capital compound levels. Prioritize risk containment always.*
