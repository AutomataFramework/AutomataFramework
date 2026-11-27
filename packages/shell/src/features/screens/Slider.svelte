<script lang="ts">
  import { getContext } from 'svelte'
  import { shape } from '../theme/shape.ts'
  import type { Host } from '../host/host.ts'
  import type { Item } from '../formats/formats.ts'

  let {
    item,
    value,
    onchange,
  }: { item: Extract<Item, { type: 'slider' }>; value: number; onchange(value: number): void } = $props()
  const host = getContext<Host>('host')
  const { t } = host
  const input = $derived(`slider-${item.id}`)
</script>

<label class="item slider" for={input} use:shape={{ corner: host.look.corners.button }}>
  <span class="lbl">{$t(item.label)}</span>
  <span class="out">{value}</span>
  <input
    id={input}
    type="range"
    min="0"
    max="100"
    step="5"
    {value}
    style:--p="{value}%"
    oninput={(e) => onchange(Number(e.currentTarget.value))}
  />
</label>
