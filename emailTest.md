# Email test log

Every email the order lifecycle produced during an end-to-end run, plus the stages that produced none.

- **Run date:** 2026-08-12
- **Environment:** `vite dev --mode test` (`.env.test`), local MariaDB `dana`
- **Mail sink:** Mailpit `localhost:1025`, captured via its API on `:8025` — nothing was delivered to a real inbox
- **SMS + Chapa:** intercepted in-process (`scratchpad/intercept.mjs`); `api.geezsms.com` and `api.chapa.co` were never contacted, so no SMS was billed and no money moved

## Summary

**26 emails captured across 18 scenarios.**

| # | Stage | Emails | Result |
|---|---|---|---|
| 1 | checkout: guest quote request (3-line cart) | 2 | ✅ sent |
| 2 | checkout: single-line cart | 2 | ✅ sent |
| 3 | checkout: 9-line cart (SMS truncation path) | 2 | ✅ sent |
| 4 | checkout: empty cart (must not email) | 0 | no email |
| 5 | quotes: single-item request | 2 | ✅ sent |
| 6 | contact-us: message | 2 | ✅ sent |
| 7 | confirm quote: sendQuotePaymentLink | 2 | ✅ sent |
| 8 | payment: advance settles (40%) | 2 | ✅ sent |
| 9 | payment: same attempt re-settled (idempotency) | 0 | no email |
| 10 | balance: sendBalancePaymentLink | 2 | ✅ sent |
| 11 | payment: balance settles, order fully paid | 2 | ✅ sent |
| 12 | adjustment: company deduction notice | 2 | ✅ sent |
| 13 | adjustment: customer request -> staff | 1 | ✅ sent |
| 14 | adjustment: staff decision -> customer | 1 | ✅ sent |
| 15 | offer rejected -> staff only | 1 | ✅ sent |
| 16 | order cancelled -> staff only | 1 | ✅ sent |
| 17 | order delivered | 2 | ✅ sent |
| 18 | order delivered: re-saved (must not re-announce) | 0 | no email |

## Detail

### checkout: guest quote request (3-line cart)

POST /checkout?/add — the flow the buy page feeds into

- **To** `buyer@example.test` — **Subject** "Quote Request Received - Dana Steel (#36)" — 12,205 bytes HTML — 3 table(s)
- **To** `sales@dana.test` — **Subject** "New Quote Request: #36" — 11,927 bytes HTML — 3 table(s)

```json
{
  "status": 200,
  "location": null,
  "body": "{\"type\":\"redirect\",\"status\":303,\"location\":\"/checkout/submitted?ref=36\"}"
}
```


### checkout: single-line cart

POST /checkout?/add with one item

- **To** `sales@dana.test` — **Subject** "New Quote Request: #37" — 7,837 bytes HTML — 3 table(s)
- **To** `solo@example.test` — **Subject** "Quote Request Received - Dana Steel (#37)" — 8,117 bytes HTML — 3 table(s)

```json
{
  "status": 200,
  "location": null,
  "body": "{\"type\":\"redirect\",\"status\":303,\"location\":\"/checkout/submitted?ref=37\"}"
}
```


### checkout: 9-line cart (SMS truncation path)

POST /checkout?/add with nine lines

- **To** `bulk@example.test` — **Subject** "Quote Request Received - Dana Steel (#38)" — 19,060 bytes HTML — 3 table(s)
- **To** `sales@dana.test` — **Subject** "New Quote Request: #38" — 18,781 bytes HTML — 3 table(s)

```json
{
  "status": 200,
  "location": null,
  "body": "{\"type\":\"redirect\",\"status\":303,\"location\":\"/checkout/submitted?ref=38\"}"
}
```


### checkout: empty cart (must not email)

POST /checkout?/add with no items

_No email produced._

```json
{
  "status": 200,
  "location": null,
  "body": "{\"type\":\"failure\",\"status\":400,\"data\":\"[{\\\"form\\\":1},{\\\"id\\\":2,\\\"valid\\\":3,\\\"posted\\\":4,\\\"errors\\\":5,\\\"data\\\":9,\\\"message\\\":15},\\\"1eq1a93\\\",false,true,{\\\"selectedProducts\\\":6},{\\\"_errors\\\":7},[8],\\\"Add at least one product before requesting a quote\\\",{\\\"name\\\":10,\\\"email\\\":11,\\\"phone\\\":12,\\\"tinNo\\\":-1,\\\"docs\\\":-1,\\\"type\\\":13,\\\"selectedProducts\\\":14},\\\"Nobody\\\",\\\"nobody@example.test\\\",\\\"0912345670\\\",\\\"individual\\\",[],{\\\"type\\\":16,\\\"text\\\":17},\\\"error\\\",\\\"Please check the form for Errors\\\"]\"}"
}
```


### quotes: single-item request

POST /quotes?/add

- **To** `asker@example.test` — **Subject** "Quote Request Received - Dana Steel (#39)" — 1,867 bytes HTML
- **To** `sales@dana.test` — **Subject** "New Quote Request: #39" — 1,309 bytes HTML

```json
{
  "status": 200,
  "location": null,
  "body": "{\"type\":\"success\",\"status\":200,\"data\":\"[{\\\"form\\\":1},{\\\"id\\\":2,\\\"valid\\\":3,\\\"posted\\\":3,\\\"errors\\\":4,\\\"data\\\":5,\\\"message\\\":13},\\\"10pikrt\\\",true,{},{\\\"name\\\":6,\\\"email\\\":7,\\\"phone\\\":8,\\\"whatsapp\\\":-1,\\\"companyName\\\":-1,\\\"tinNo\\\":-1,\\\"docs\\\":-1,\\\"productId\\\":9,\\\"variantId\\\":10,\\\"categoryId\\\":-1,\\\"quantityEstimate\\\":11,\\\"message\\\":12},\\\"Quote Asker\\\",\\\"asker@example.test\\\",\\\"0912345671\\\",3,8,\\\"200 sheets\\\",\\\"Do you deliver to Adama?\\\",{\\\"type\\\":14,\\\"text\\\":15},\\\"success\\\",\\\"Thanks! Your quote request has been submitted — ou
```


### contact-us: message

POST /contact-us?/contact

- **To** `sales@dana.test` — **Subject** "📩 New Contact Message: Bulk pricing question" — 1,669 bytes HTML
- **To** `contact@example.test` — **Subject** "We received your message - Dana Steel" — 1,720 bytes HTML

```json
{
  "status": 200,
  "location": null,
  "body": "{\"type\":\"success\",\"status\":200,\"data\":\"[{\\\"form\\\":1},{\\\"id\\\":2,\\\"valid\\\":3,\\\"posted\\\":3,\\\"errors\\\":4,\\\"data\\\":5,\\\"message\\\":11},\\\"1nmywuk\\\",true,{},{\\\"name\\\":6,\\\"email\\\":7,\\\"phoneNumber\\\":8,\\\"subject\\\":9,\\\"contactMessage\\\":10},\\\"Contact Person\\\",\\\"contact@example.test\\\",\\\"+251912345672\\\",\\\"Bulk pricing question\\\",\\\"What is your lead time on 500 sheets?\\\",{\\\"type\\\":12,\\\"text\\\":13},\\\"success\\\",\\\"Message Successfully Sent!\\\"]\"}"
}
```


### confirm quote: sendQuotePaymentLink

what dashboard/quotes/[id] ?/sendOffer calls

- **To** `buyer@example.test` — **Subject** "Your Quote is Ready — Dana Steel (#33)" — 7,222 bytes HTML — 2 table(s)
- **To** `sales@dana.test` — **Subject** "Quote Sent: Order #33 — 13,536.61 ETB" — 5,456 bytes HTML — 2 table(s)


### payment: advance settles (40%)

settlePaymentAttempt via the Chapa webhook path

- **To** `buyer@example.test` — **Subject** "Advance Payment Received - Dana Steel (#33)" — 6,556 bytes HTML — 2 table(s)
- **To** `sales@dana.test` — **Subject** "Advance Payment Received: Order #33" — 5,819 bytes HTML — 2 table(s)

```json
{
  "status": "paid",
  "orderId": 33,
  "fullySettled": false,
  "alreadySettled": false
}
```


### payment: same attempt re-settled (idempotency)

the customer return page hitting an already-webhooked payment

_No email produced._

```json
{
  "status": "paid",
  "orderId": 33,
  "fullySettled": false,
  "alreadySettled": true
}
```


### balance: sendBalancePaymentLink

dashboard/orders ?/requestBalance

- **To** `buyer@example.test` — **Subject** "Balance Due — Dana Steel (#33)" — 2,701 bytes HTML — 1 table(s)
- **To** `sales@dana.test` — **Subject** "Balance Reminder Sent: Order #33" — 664 bytes HTML


### payment: balance settles, order fully paid

second settlePaymentAttempt on the same order

- **To** `buyer@example.test` — **Subject** "Payment Confirmed - Dana Steel (#33)" — 6,167 bytes HTML — 2 table(s)
- **To** `sales@dana.test` — **Subject** "Payment Received: Order #33" — 5,466 bytes HTML — 2 table(s)

```json
{
  "status": "paid",
  "orderId": 33,
  "fullySettled": true,
  "alreadySettled": false
}
```


### adjustment: company deduction notice

dashboard/orders ?/addAdjustment (deduction)

- **To** `buyer@example.test` — **Subject** "Order #33 Adjusted" — 2,001 bytes HTML — 1 table(s)
- **To** `sales@dana.test` — **Subject** "Order #33 Adjusted (deduction)" — 688 bytes HTML


### adjustment: customer request -> staff

account/history ?/requestAdjustment

- **To** `sales@dana.test` — **Subject** "Adjustment Requested: Order #33" — 683 bytes HTML


### adjustment: staff decision -> customer

dashboard/orders ?/decideAdjustment

- **To** `buyer@example.test` — **Subject** "Adjustment Approved: Order #33" — 1,186 bytes HTML


### offer rejected -> staff only

pay/[token] ?/rejectOffer

- **To** `sales@dana.test` — **Subject** "Offer Rejected: Order #33" — 663 bytes HTML


### order cancelled -> staff only

pay/[token] ?/cancelOrder

- **To** `sales@dana.test` — **Subject** "Order Cancelled: Order #33" — 616 bytes HTML


### order delivered

dashboard/orders ?/edit transitioning into status=delivered

- **To** `sales@dana.test` — **Subject** "Order Delivered: #33" — 4,006 bytes HTML — 1 table(s)
- **To** `buyer@example.test` — **Subject** "Your Order Has Been Delivered! (#33)" — 4,827 bytes HTML — 1 table(s)

```json
{
  "note": "delivery notice now wired into both the add and edit actions"
}
```


### order delivered: re-saved (must not re-announce)

the transition guard in the edit action

_No email produced._

```json
{
  "note": "guard is `status === delivered && previous !== delivered`; verified against the real action — 0 emails"
}
```


## Failure behaviour (SMTP unreachable)

Mailpit was stopped so every send hit `ECONNREFUSED`.

| Scenario | Threw | SMS still attempted |
|---|---|---|
| SMTP down: sendQuotePaymentLink | `Error: connect ECONNREFUSED 127.0.0.1:1025` | 0 |
| SMTP down: sendEmail with a phone number | `Error: connect ECONNREFUSED ::1:1025` | 0 |
| SMTP down: sendPaymentConfirmation | `Error: connect ECONNREFUSED ::1:1025` | 0 |

See `testErrors.md` for what these reveal.
