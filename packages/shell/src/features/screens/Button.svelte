<script lang="ts">
  import { getContext } from 'svelte'
  import { languageName } from '../words/words.ts'
  import { shape } from '../theme/shape.ts'
  import type { Host } from '../host/host.ts'
  import type { Item } from '../formats/formats.ts'

  let { item, main }: { item: Extract<Item, { type: 'button' }>; main: boolean } = $props()
  const host = getContext<Host>('host')
  const { t, settings } = host
</script>

<button
  class="item"
  class:primary={main}
  class:nav={item.opens === true}
  use:shape={{ corner: host.look.corners.button }}
  onclick={() => host.send(item.does)}
>
  <span class="lbl">{$t(item.label)}</span>
  {#if item.shows === 'language'}<span class="val">{languageName($settings.language)}</span>{/if}
  {#if item.opens}<span class="chev" aria-hidden="true">›</span>{/if}
</button>
