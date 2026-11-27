<script lang="ts">
  import { getContext } from 'svelte'
  import type { Host } from '../host/host.ts'
  import type { Item } from '../formats/formats.ts'

  let { item }: { item: Extract<Item, { type: 'image' }> } = $props()
  const host = getContext<Host>('host')
  const url = $derived(host.assetUrl(item.asset))
</script>

{#if url}<img class="picture" src={url} alt="" />{/if}
