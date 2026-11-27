<script lang="ts">
  import { getContext } from 'svelte'
  import { shape } from '../theme/shape.ts'
  import type { Curved } from '../theme/corner.ts'
  import type { Item, Screen } from '../formats/formats.ts'
  import type { Host } from '../host/host.ts'
  import Button from './Button.svelte'
  import Image from './Image.svelte'
  import List from './List.svelte'
  import Slider from './Slider.svelte'
  import Steps from './Steps.svelte'
  import Switch from './Switch.svelte'
  import Text from './Text.svelte'

  let { screen }: { screen: Screen } = $props()
  const host = getContext<Host>('host')
  const { t, settings, hasSave, stageWidth } = host

  const shows = (item: Item, saved: boolean): boolean =>
    item.type !== 'button' || item.when === undefined || (item.when === 'has-save') === saved
  const items = $derived(screen.items.filter((item) => shows(item, $hasSave)))
  const mainIndex = $derived(items.findIndex((item) => item.type === 'button' && item.main === true))
  // Under 600 px the card is a sheet and only its top two corners are curved.
  const curved: Curved = $derived($stageWidth < 600 ? [true, true, false, false] : [true, true, true, true])

  let more = $state(false)
  // The last 2.2em of the list fades while more is hidden below.
  function fade(node: HTMLElement) {
    const check = (): void => void (more = node.scrollHeight - node.clientHeight - node.scrollTop > 6)
    node.addEventListener('scroll', check)
    const watcher = new ResizeObserver(check)
    watcher.observe(node)
    for (const child of node.children) watcher.observe(child)
    check()
    return {
      destroy(): void {
        node.removeEventListener('scroll', check)
        watcher.disconnect()
      },
    }
  }
</script>

{#if screen.layout === 'splash'}
  <!-- svelte-ignore a11y_click_events_have_key_events -- any key skips the splash: the shell listens for keys on the window -->
  <div
    class="splash"
    role="button"
    tabindex="0"
    aria-label={[
      screen.title ? $t(screen.title) : '',
      ...screen.items.flatMap((i) => (i.type === 'text' ? [$t(i.words)] : [])),
    ].join('. ')}
    onclick={() => host.send('skip')}
  >
    <div class="logo">
      {#each screen.items as item, i (i)}{#if item.type === 'image'}<Image {item} />{/if}{/each}
      {#if screen.title}<div class="name">{$t(screen.title)}</div>{/if}
    </div>
    <div class="skip">
      {#each screen.items as item, i (i)}{#if item.type === 'text'}<span>{$t(item.words)}</span>{/if}{/each}
    </div>
  </div>
{:else}
  <section
    class="screen"
    aria-label={screen.title ? $t(screen.title) : undefined}
    use:shape={{ corner: host.look.corners.card, curved }}
  >
    {#if screen.title}
      <header>
        {#if screen.above}<p class="eyebrow">{$t(screen.above)}</p>{/if}
        <h1>{$t(screen.title)}</h1>
      </header>
    {/if}
    <div class="items" class:more use:fade>
      {#each items as item, i (`${item.type}-${'id' in item ? item.id : i}`)}
        {#if item.type === 'button'}
          <Button {item} main={i === mainIndex} />
        {:else if item.type === 'text'}
          <Text {item} />
        {:else if item.type === 'image'}
          <Image {item} />
        {:else if item.type === 'slider'}
          <Slider
            {item}
            value={$settings[item.setting] as number}
            onchange={(v) => host.set(item.setting, v as never)}
          />
        {:else if item.type === 'steps'}
          <Steps
            {item}
            value={$settings[item.setting] as number}
            onchange={(v) => host.set(item.setting, v as never)}
          />
        {:else if item.type === 'switch'}
          <Switch
            {item}
            value={$settings[item.setting] as boolean}
            onchange={(v) => host.set(item.setting, v as never)}
          />
        {:else}
          <List {item} />
        {/if}
      {/each}
    </div>
    {#if screen.back}
      <button class="back" onclick={() => host.send('back')}>‹ {$t('back')}</button>
    {/if}
  </section>
{/if}
