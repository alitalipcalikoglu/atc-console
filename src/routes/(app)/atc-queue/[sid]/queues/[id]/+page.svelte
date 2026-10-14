<script>import { page } from '$app/state'; import QueueDetail from '#lib/pages/queue/QueueDetail.svelte';</script>
<QueueDetail sid={page.params.sid} id={page.params.id} />
