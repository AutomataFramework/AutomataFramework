<script lang="ts">
  import { getContext } from 'svelte'
  import { shape } from '../theme/shape.ts'
  import { languageName } from '../words/words.ts'
  import type { Host } from '../host/host.ts'
  import type { Item } from '../formats/formats.ts'

  let { item }: { item: Extract<Item, { type: 'list' }> } = $props()
  const host = getContext<Host>('host')
  const { t, settings } = host
  const when = (at: number): string =>
    new Intl.DateTimeFormat($settings.language, { dateStyle: 'medium', timeStyle: 'short' }).format(at)
</script>

{#if item.from === 'languages'}
  {#each host.languages as code (code)}
    <button
      class="item radio"
      role="radio"
      aria-checked={$settings.language === code}
      lang={code}
      use:shape={{ corner: host.look.corners.button }}
      onclick={() => host.set('language', code)}
    >
      <span class="lbl">{languageName(code)}</span>
      <span class="tick" aria-hidden="true">{$settings.language === code ? '✓' : ''}</span>
    </button>
  {/each}
{:else if item.from === 'saves'}
  {#each host.saves() as row (row.slot)}
    <button
      class="item save"
      use:shape={{ corner: host.look.corners.button }}
      onclick={() => host.send(`slot-${row.slot}`)}
    >
      <span class="lbl">{row.slot === 'auto' ? $t('autosave') : $t('slot', { number: row.slot })}</span>
      <small>{row.empty ? $t('empty') : when(row.savedAt)}</small>
    </button>
  {/each}
{:else if item.from === 'controls'}
  {#each host.controls() as row (row.id)}
    <div class="item bind" use:shape={{ corner: host.look.corners.button }}>
      <span class="lbl">{row.label}</span>
      <span class="key" use:shape={{ corner: host.look.corners.small }}
        >{row.key === 'arrows' ? $t('arrows') : row.key}</span
      >
    </div>
  {/each}
{:else}
  {#each host.credits()?.lines ?? [] as line (line.role)}
    <div class="credit">
      <small>{$t(line.role)}</small>
      <span>{line.names.join(', ')}</span>
    </div>
  {/each}
{/if}
