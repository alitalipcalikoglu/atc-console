<script>import { page } from '$app/state'; import BackupDetail from '#lib/pages/backup/BackupDetail.svelte';</script>
<BackupDetail sid={page.params.sid} id={page.params.id} />
