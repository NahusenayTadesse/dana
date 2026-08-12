# SMS test log

Every SMS the run attempted. Each was captured at the `fetch` boundary and answered with a stubbed GeezSMS success — none were transmitted or billed.

- **Run date:** 2026-08-12
- **Environment:** `vite dev --mode test` (`.env.test`), local MariaDB `dana`
- **Mail sink:** Mailpit `localhost:1025`, captured via its API on `:8025` — nothing was delivered to a real inbox
- **SMS + Chapa:** intercepted in-process (`scratchpad/intercept.mjs`); `api.geezsms.com` and `api.chapa.co` were never contacted, so no SMS was billed and no money moved

## Summary

**22 messages attempted.** GeezSMS hard-caps a message at 335 characters.

| # | Phone | Chars | Status | Source |
|---|---|---|---|---|
| 1 | `251912345678` | 284 | ok | checkout order summary |
| 2 | `251712345678` | 166 | ok | checkout order summary |
| 3 | `251912345679` | 318 | near limit | checkout order summary |
| 4 | `251912345671` | 195 | ok | /quotes acknowledgement |
| 5 | `251912345672` | 144 | ok | contact-us acknowledgement |
| 6 | `251912345678` | 146 | ok | quote payment link |
| 7 | `251912345678` | 140 | ok | payment confirmation |
| 8 | `251912345678` | 125 | ok | balance link |
| 9 | `251912345678` | 94 | ok | payment confirmation |
| 10 | `251912345678` | 54 | ok | adjustment |
| 11 | `251912345678` | 48 | ok | adjustment |
| 12 | `251912345678` | 90 | ok | delivery notice |
| 13 | `251912345678` | 149 | ok | quote payment link |
| 14 | `251912345678` | 143 | ok | payment confirmation |
| 15 | `251912345678` | 125 | ok | balance link |
| 16 | `251912345678` | 96 | ok | payment confirmation |
| 17 | `251912345678` | 55 | ok | adjustment |
| 18 | `251912345678` | 48 | ok | adjustment |
| 19 | `251912345678` | 91 | ok | delivery notice |
| 20 | `251912345678` | 149 | ok | quote payment link |
| 21 | `251912345678` | 149 | ok | quote payment link |
| 22 | `251912345678` | 91 | ok | delivery notice |

## Messages as the customer would receive them

### 1. `251912345678` — 284 chars

```text
Dana Steel: Quote request #36 received.
1. GI Galvanized Sheets - 1000mm 1mm 3m x6
2. Gutters & Downpipes - Signal Red 60in 0.7mm 6m x4
3. PPGI Colour-Coated Sheets - Signal Red 913mm 0.425mm 3m x2
Total: 12 pcs, 3 products
Est. 13,899.2 ETB incl. VAT
We will confirm pricing shortly.
```

### 2. `251712345678` — 166 chars

```text
Dana Steel: Quote request #37 received.
1. GI Galvanized Sheets - 1000mm 1mm 4m x1
Total: 1 pc, 1 product
Est. 1,253.82 ETB incl. VAT
We will confirm pricing shortly.
```

### 3. `251912345679` — 318 chars

```text
Dana Steel: Quote request #38 received.
1. GI Galvanized Sheets - 1000mm 1mm 3m x2
2. GI Galvanized Sheets - 1219mm 1.2mm 6m x3
3. Gutters & Downpipes - Signal Red 60in 0.7mm 6m x4
4. Gutters & Downpipes - 48in 1.2mm 10m x5
+5 more
Total: 54 pcs, 5 products
Est. 45,638.3 ETB incl. VAT
We will confirm pricing shortly.
```

### 4. `251912345671` — 195 chars

```text
Dana Steel: Quote request #39 received.
Item: GI Galvanized Sheets (Standard 1 Meter (1000mm) · 1.000mm · Standard 3.0m Sheet)
Our sales team will follow up shortly with pricing and availability.
```

### 5. `251912345672` — 144 chars

```text
Dana Steel: Thanks Contact Person, we've received your message about "Bulk pricing question". Our team will get back to you as soon as possible.
```

### 6. `251912345678` — 146 chars

```text
Dana Steel: Quote #33 ready. Total 5,505.27 ETB (incl. VAT 737.31 ETB). Pay: http://localhost:5173/pay/asJ0Hlz39I253ksnKsp89HciraTLB-1yaKcxeeRgkkc
```

### 7. `251912345678` — 140 chars

```text
Dana Steel: Advance of 2,202.11 ETB confirmed for order #33 (total 5,505.27 ETB, VAT 737.31 ETB). Balance due before delivery: 3,303.16 ETB.
```

### 8. `251912345678` — 125 chars

```text
Dana Steel: Balance due on order #33 is 3,303 ETB. Pay: http://localhost:5173/pay/lO1GGfO_WCArW7aFa_KhG2M8oIj1Oav6-aJIkkNbB7I
```

### 9. `251912345678` — 94 chars

```text
Dana Steel: Payment of 3,303.16 ETB confirmed for order #33 (incl. VAT 737.31 ETB). Thank you!
```

### 10. `251912345678` — 54 chars

```text
Order #33 adjusted: -500 ETB. New total: 4,945.27 ETB.
```

### 11. `251912345678` — 48 chars

```text
Order #33: your adjustment request was approved.
```

### 12. `251912345678` — 90 chars

```text
Dana Steel: Order #33 has been delivered. Total 4,945.27 ETB. Thank you for your business!
```

### 13. `251912345678` — 149 chars

```text
Dana Steel: Quote #33 ready. Total 13,536.61 ETB (incl. VAT 1,812.94 ETB). Pay: http://localhost:5173/pay/Q_I0k9WGiH48VIvvQ1LlpwsBReo5zbHVQS9ZeeUQyok
```

### 14. `251912345678` — 143 chars

```text
Dana Steel: Advance of 5,414.64 ETB confirmed for order #33 (total 13,536.61 ETB, VAT 1,812.94 ETB). Balance due before delivery: 8,121.97 ETB.
```

### 15. `251912345678` — 125 chars

```text
Dana Steel: Balance due on order #33 is 8,122 ETB. Pay: http://localhost:5173/pay/EHlWXOHuxzqYkRJQHTFW0e9CNYw7opxIo1IgdiuO8gE
```

### 16. `251912345678` — 96 chars

```text
Dana Steel: Payment of 8,121.97 ETB confirmed for order #33 (incl. VAT 1,812.94 ETB). Thank you!
```

### 17. `251912345678` — 55 chars

```text
Order #33 adjusted: -500 ETB. New total: 12,976.61 ETB.
```

### 18. `251912345678` — 48 chars

```text
Order #33: your adjustment request was approved.
```

### 19. `251912345678` — 91 chars

```text
Dana Steel: Order #33 has been delivered. Total 12,976.61 ETB. Thank you for your business!
```

### 20. `251912345678` — 149 chars

```text
Dana Steel: Quote #33 ready. Total 13,536.61 ETB (incl. VAT 1,812.94 ETB). Pay: http://localhost:5173/pay/AtDwgdvOD7u3erRjD-H0tsAxxDvE8oBv6XZgNvj9R8Q
```

### 21. `251912345678` — 149 chars

```text
Dana Steel: Quote #33 ready. Total 13,536.61 ETB (incl. VAT 1,812.94 ETB). Pay: http://localhost:5173/pay/H6eUslnDDiOQAm1N66FeWxgmUaOpFO11qYIin8Ck0ak
```

### 22. `251912345678` — 91 chars

```text
Dana Steel: Order #33 has been delivered. Total 12,976.61 ETB. Thank you for your business!
```

## Notes

- Phone normalisation worked on every input tried: `0912345678` and `0712345678` both became `251…` correctly.
- The purpose-built summary SMS stayed within budget in all three cart sizes, including the nine-line cart that exercised the `+N more` path.
- Messages built by auto-stripping an email's HTML (the templates that pass a phone but no dedicated SMS copy) are the ones that hit the cap. See `testErrors.md`.
