# Payments from the console

**Payments** page (one per configured `atc-payments` service; the console's key there has the `write` role): four stats (provider, Stripe or disabled, with the webhook state; paid payments with the 24 h volume per currency; payments awaiting payment; events waiting for atc-webhook-out, red when some could not be delivered), the payment list with a status switch (kept in the URL) and paging, the ledger balance per currency (charged, refunded, net) and the latest Stripe webhook events with their outcome (applied, ignored, unknown payment).

Payments are created by your applications through the payments API, not in the console. With the provider disabled the list explains which variable to set.

## The payment page

Four stats (status with the last payment error, amount, refunded, still refundable), the details (ids with copy buttons, description, customer e-mail, Stripe status, creator, times, metadata), the refunds (amount, status with the failure reason, reason, who refunded, when; refunds made in the Stripe dashboard show `stripe`) and the ledger entries of the payment.

App bar (admin):

- **Refund** (when something is refundable): an amount in the payment's currency (empty = all that is left) and a reason; the button shows the exact amount and asks for a danger confirmation. Each opened dialog gets its own idempotency key, so submitting twice never refunds twice. A refund Stripe reports as pending shows as pending until its webhook arrives.
- ⋯: **Sync from Stripe** (applies Stripe's current state when webhooks were missed) and **Cancel payment** (pending or processing only; danger confirmation).

## Recorded in the console log

`atc-payments.refund.create` (payment, amount, status), `atc-payments.payment.sync` (changed, status), `atc-payments.payment.cancel` (status).
