<script>import { page } from '$app/state'; import PaymentDetail from '#lib/pages/payments/PaymentDetail.svelte';</script>
<PaymentDetail sid={page.params.sid} id={page.params.id} />
