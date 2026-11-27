<script lang="ts">
  import { getContext } from 'svelte'
  import type { Readable } from 'svelte/store'
  import { shape } from '../theme/shape.ts'
  import type { Hud } from '../formats/formats.ts'
  import type { Host } from '../host/host.ts'

  let { hud, values }: { hud: Hud; values: Readable<string[]> } = $props()
  const host = getContext<Host>('host')
  const { t } = host
  const places = ['top-left', 'top', 'top-right', 'bottom-left', 'bottom', 'bottom-right'] as const
  const at = (where: string) =>
    hud.items.map((item, index) => ({ item, index })).filter((one) => one.item.where === where)
  const share = (value: string): number => Math.min(1, Math.max(0, Number(value) || 0))
</script>

<div class="hud">
  {#each places as where (where)}
    <div class="slot {where}">
      {#each at(where) as { item, index } (index)}
        <span
          class="chip {item.type}"
          role={item.type === 'bar' ? 'meter' : undefined}
          aria-label={$t(item.label)}
          aria-valuenow={item.type === 'bar' ? share($values[index] ?? '') : undefined}
          aria-valuemin={item.type === 'bar' ? 0 : undefined}
          aria-valuemax={item.type === 'bar' ? 1 : undefined}
          use:shape={{ corner: host.look.corners.small }}
        >
          {#if item.type === 'bar'}
            <span class="bar"><i style:width="{share($values[index] ?? '') * 100}%"></i></span>
          {:else if item.type === 'text'}
            <span>{$t(item.label)}</span> <b>{$values[index] ?? ''}</b>
          {:else}
            <b>{$values[index] ?? ''}</b>
          {/if}
        </span>
      {/each}
    </div>
  {/each}
  <button
    class="chip pausebtn"
    aria-label={$t('paused')}
    use:shape={{ corner: host.look.corners.small }}
    onclick={() => host.send('pause')}
  >
    <i></i><i></i>
  </button>
</div>
