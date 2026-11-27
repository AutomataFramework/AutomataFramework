<script lang="ts">
  import { getContext } from 'svelte'
  import type { Host } from '../host/host.ts'
  import type { Item } from '../formats/formats.ts'

  let { item }: { item: Extract<Item, { type: 'text' }> } = $props()
  const { t } = getContext<Host>('host')
</script>

<p class="text">{$t(item.words)}</p>
