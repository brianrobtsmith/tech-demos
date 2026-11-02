# accounts data schema

Committed sample: `accounts.sample.json` (Park household).

Optional local override (gitignored): `accounts.local.json` — same shape; may include real balances/holdings for local runs only.

```jsonc
{
  "household": { "label": "string", "asOf": "YYYY-MM-DD" },
  "totals": { "totalBalance": 0, "nonRetirement": 0, "retirement": 0 },
  "accounts": [ { "role": "checking|savings|longTerm", "name": "", "balance": 0, "target": 0, "status": "", "barPct": 0, "mask": "", "holdings?": [] } ],
  "suggestedMove": { "amount": 0, "fromRole": "", "toRole": "", "title": "", "subtitle": "", "beforeAfter": {} },
  "retirement": [ { "name": "", "owner": "", "balance": 0, "detail": "", "asOf": "" } ],
  "cashFlow": { "moneyIn": [], "totalIn": 0, "investmentIncomeMonthly": 0, "moneyOut": {}, "difference": 0 }
}
```

Drop-in: copy `accounts.sample.json` → `accounts.local.json` and edit. Restart `bun run dev`. Never commit the local file. Screenshots/video must use sample data.
