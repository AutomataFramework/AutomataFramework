<script lang="ts">
  import { getContext } from 'svelte'
  import { shape } from '../theme/shape.ts'
  import type { Host } from '../host/host.ts'
  import type { Item } from '../formats/formats.ts'

  let {
    item,
    value,
    onchange,
  }: { item: Extract<Item, { type: 'switch' }>; value: boolean; onchange(value: boolean): void } = $props()
  const host = getContext<Host>('host')
  const { t } = host
</script>

<button
  class="item switch"
  role="switch"
  aria-checked={value}
  use:shape={{ corner: host.look.corners.button }}
  onclick={() => onchange(!value)}
>
  <span class="lbl">{$t(item.label)}</span>
  <span class="sw">
    <span>{$t(value ? 'on' : 'off')}</span>
    <span class="track"><span class="knob"></span></span>
  </span>
</button>
