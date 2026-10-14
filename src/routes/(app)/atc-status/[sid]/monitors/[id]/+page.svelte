<script>import { page } from '$app/state'; import MonitorDetail from '#lib/pages/status/MonitorDetail.svelte';</script>
<MonitorDetail sid={page.params.sid} id={page.params.id} />
