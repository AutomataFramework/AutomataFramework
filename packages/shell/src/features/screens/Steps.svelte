<script lang="ts">
  import { getContext } from 'svelte'
  import { shape } from '../theme/shape.ts'
  import type { Host } from '../host/host.ts'
  import type { Item } from '../formats/formats.ts'

  let {
    item,
    value,
    onchange,
  }: { item: Extract<Item, { type: 'steps' }>; value: number; onchange(value: number): void } = $props()
  const host = getContext<Host>('host')
  const { t } = host
  const last = $derived(item.levels.length - 1)
</script>

<div class="item steps" role="group" aria-label={$t(item.label)} use:shape={{ corner: host.look.corners.button }}>
  <span class="lbl">{$t(item.label)}</span>
  <div class="stepper">
    <button
      class="step"
      disabled={value <= 0}
      aria-label="{$t(item.label)}: {$t('less')}"
      use:shape={{ corner: host.look.corners.small }}
      onclick={() => onchange(value - 1)}>−</button
    >
    <span class="stepval" aria-live="polite">
      <span>{$t(item.levels[value] ?? '')}</span>
      <span class="pips" aria-hidden="true">
        {#each { length: last } as _, i (i)}<i class:on={i < value}></i>{/each}
      </span>
    </span>
    <button
      class="step"
      disabled={value >= last}
      aria-label="{$t(item.label)}: {$t('more')}"
      use:shape={{ corner: host.look.corners.small }}
      onclick={() => onchange(value + 1)}>+</button
    >
  </div>
</div>
