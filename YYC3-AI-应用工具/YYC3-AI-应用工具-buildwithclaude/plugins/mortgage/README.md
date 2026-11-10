# mortgage

Mortgage refinance plugin by LendTrain for Claude Code. Real-time institutional pricing, state-specific closing costs, FHA Streamline/VA IRRRL detection, recommendation scoring, and regulatory compliance via MCP — all through a conversational interface. No API key required.

## Installation

```bash
# Add the marketplace
/plugin marketplace add lendtrain/mortgage

# Install the plugin
/plugin install mortgage@mortgage
```

## Usage

```
/mortgage:refi-quote
```

The `/refi-quote` command guides borrowers through a complete refinance workflow:

1. **Data Collection** — Upload a mortgage statement or answer questions about your current loan
2. **Pricing** — Get real-time rates from institutional pricing engine (no API key required)
3. **Analysis & Recommendation** — Savings breakdown, breakeven analysis, weighted scoring
4. **Application** — Direct link to secure application portal

## Skills

| Skill | Description |
|-------|-------------|
| `mortgage-loan-officer` | Collects borrower data, extracts mortgage statement fields, guides qualification |
| `mortgage-compliance` | TRID, RESPA, TILA, ECOA/Fair Lending, state licensing enforcement |
| `closing-costs` | State-specific itemized closing cost calculation for 10 licensed states |
| `security-guardrails` | Prompt injection defense, PII protection, workflow integrity |
| `about-atlantic-home-mortgage` | Company background, credentials, contact information |

## MCP Server

The plugin connects to a read-only mortgage pricing engine via MCP (Model Context Protocol):

- **Server**: `mortgage-pricer`
- **Endpoint**: `https://mortgage-pricer-production.up.railway.app/mcp`
- **Tools**: `calculate_pricing`, `calculate_all_pricing`, `get_effective_date`
- **Authentication**: None required

## Licensed States

Alabama, Florida, Georgia, Kentucky, North Carolina, Oregon, South Carolina, Tennessee, Texas, Utah

## Details

- **Author**: [Lendtrain](https://www.lendtrain.com) (team@lendtrain.com)
- **NMLS#**: 1844873
- **Version**: 1.1.1
- **License**: Proprietary
- **Source**: [github.com/lendtrain/mortgage](https://github.com/lendtrain/mortgage)
