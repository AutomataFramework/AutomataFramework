<script lang="ts">
  import { setContext } from 'svelte'
  import type { Readable } from 'svelte/store'
  import type { Hud as HudFile } from '../formats/formats.ts'
  import Hud from '../hud/Hud.svelte'
  import { cssVars } from '../theme/css.ts'
  import type { Host, View } from '../host/host.ts'
  import Screen from './Screen.svelte'
  import type { Screen as ScreenFile } from '../formats/formats.ts'

  let {
    host,
    view,
    hud,
    hudValues,
    asking,
  }: {
    host: Host
    view: Readable<View>
    hud: HudFile | undefined
    hudValues: Readable<string[]>
    /** The built-in question: a screen made from the words of the question the flow asks. */
    asking: (word: string) => ScreenFile
  } = $props()
  // The host never changes for the life of the page, so reading it once is right.
  // svelte-ignore state_referenced_locally
  setContext('host', host)
  // svelte-ignore state_referenced_locally
  const vars = Object.entries(cssVars(host.look))
    .map(([name, value]) => `${name}:${value}`)
    .join(';')

  // The stage's width, for the sheet-or-card choice in the shapes.
  let width = $state(0)
  $effect(() => host.setStageWidth(width))

  let root: HTMLElement | undefined = $state()
  const focusable = (): HTMLElement[] =>
    root ? [...root.querySelectorAll<HTMLElement>('button:not([disabled]), input, [role=button][tabindex]')] : []

  function keydown(event: KeyboardEvent): void {
    host.noteKeyboard()
    // On the splash any key skips it, wherever the focus is.
    if ($view.kind === 'screen' && $view.screen.layout === 'splash') {
      if (event.key !== 'Tab') host.send('skip')
      return
    }
    if (event.key === 'Escape') {
      host.send($view.kind === 'play' ? 'pause' : 'back')
      return
    }
    if ($view.kind === 'play' || !event.key.startsWith('Arrow')) return
    const target = event.target as HTMLElement
    const onRange = target instanceof HTMLInputElement && target.type === 'range'
    // A slider keeps left and right for its value; every other arrow moves focus along the list.
    if (onRange && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) return
    const all = focusable()
    if (all.length === 0) return
    event.preventDefault()
    const now = all.indexOf(document.activeElement as HTMLElement)
    const step = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1
    const next = now < 0 ? (step > 0 ? 0 : all.length - 1) : (now + step + all.length) % all.length
    all[next]?.focus()
  }
</script>

<svelte:window onkeydown={keydown} onpointerdown={() => host.noteKeyboard(false)} />

<div class="automata-shell" style={vars} bind:this={root} bind:clientWidth={width}>
  <div class="layer">
    {#if $view.kind === 'play' && hud}
      <Hud {hud} values={hudValues} />
    {:else if $view.kind === 'screen' || $view.kind === 'ask'}
      {@const screen = $view.kind === 'screen' ? $view.screen : asking($view.word)}
      <div class="view" class:splashing={screen.layout === 'splash'}>
        {#if screen.layout !== 'splash'}<div class="scrim"></div>{/if}
        {#key $view.kind === 'screen' ? screen.id : $view.word}
          <Screen {screen} />
        {/key}
      </div>
    {/if}
  </div>
</div>

<style>
  /* The shell root is a size container laid over the canvas: every rule follows the game's stage, not the window. */
  .automata-shell {
    --ts: 1;
    --mo: 1;
    position: absolute;
    inset: 0;
    container-type: size;
    font-family: var(--f-main);
    color: var(--words);
    line-height: 1.3;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    pointer-events: none;
  }
  .automata-shell :global(*) {
    box-sizing: border-box;
  }
  .layer {
    position: absolute;
    inset: 0;
    font-size: calc(17px * var(--ts));
  }
  @container (min-width: 900px) {
    .layer {
      font-size: calc(21px * var(--ts));
    }
  }
  @container (min-width: 1200px) {
    .layer {
      font-size: calc(22px * var(--ts));
    }
  }
  .automata-shell :global(button) {
    font: inherit;
    color: inherit;
    background: none;
    border: 0;
    padding: 0;
    margin: 0;
    cursor: pointer;
    text-align: inherit;
    border-radius: 0;
    pointer-events: auto;
  }
  .view {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    pointer-events: auto;
  }
  .view.splashing {
    display: block;
  }
  .scrim {
    position: absolute;
    inset: 0;
    background: rgba(8, 12, 18, 0.55);
    animation: fade calc(240ms * var(--mo)) both;
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes sheet {
    from {
      transform: translateY(45%);
      opacity: 0;
    }
    to {
      transform: none;
      opacity: 1;
    }
  }
  @keyframes card {
    from {
      transform: scale(0.92);
      opacity: 0;
    }
    to {
      transform: none;
      opacity: 1;
    }
  }

  /* --- a card, and the sheet it becomes on a narrow stage --- */
  .automata-shell :global(.screen) {
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    gap: 0.8em;
    min-height: 0;
    min-width: 0;
    width: 100%;
    max-height: 94%;
    padding: 1.5em 1.1em 1.3em;
    animation: sheet calc(460ms * var(--mo)) var(--ease-card) both;
  }
  @container (min-width: 600px) {
    .view {
      align-items: center;
    }
    .automata-shell :global(.screen) {
      width: min(100% - 2em, 25em);
      max-height: calc(100% - 1.4em);
      padding-top: 1.3em;
      animation-name: card;
      animation-duration: calc(320ms * var(--mo));
    }
  }
  .automata-shell :global(header) {
    flex: none;
    text-align: center;
  }
  .automata-shell :global(.eyebrow) {
    margin: 0;
    font-size: 0.8em;
    font-weight: 600;
    color: var(--muted);
  }
  .automata-shell :global(h1) {
    margin: 0;
    font-family: var(--f-title);
    font-weight: 700;
    font-size: min(1.9em, 9cqw);
    line-height: 1.1;
    letter-spacing: -0.01em;
    text-wrap: balance;
    overflow-wrap: anywhere;
  }
  .automata-shell :global(.items) {
    display: flex;
    flex-direction: column;
    gap: 0.55em;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    padding: 3px;
    margin: -3px;
  }
  .automata-shell :global(.items.more) {
    -webkit-mask-image: linear-gradient(#000 calc(100% - 2.2em), transparent);
    mask-image: linear-gradient(#000 calc(100% - 2.2em), transparent);
  }
  .automata-shell :global(.text) {
    margin: 0;
    font-weight: 400;
    color: var(--muted);
    text-align: center;
  }
  .automata-shell :global(.picture) {
    max-width: 100%;
    align-self: center;
  }

  /* --- the shapes our corner draws behind a part --- */
  .automata-shell :global(.shape) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
    z-index: -1;
  }
  .automata-shell :global(.shape .ring) {
    fill: none;
    stroke: none;
  }
  .automata-shell :global(.screen > .shape .body) {
    fill: var(--page);
    stroke: var(--words);
    stroke-width: var(--outline);
  }
  .automata-shell :global(.screen > .shape) {
    filter: drop-shadow(0 0.5em 1.3em rgba(0, 0, 0, 0.35));
  }
  .automata-shell :global(.item > .shape .body) {
    fill: var(--button);
  }
  .automata-shell :global(.item.primary > .shape .body) {
    fill: var(--primary);
  }
  .automata-shell :global(.step > .shape .body),
  .automata-shell :global(.key > .shape .body) {
    fill: var(--page);
  }
  .automata-shell :global(.chip > .shape .body) {
    fill: var(--page);
  }
  .automata-shell :global(:focus-visible > .shape .ring) {
    stroke: var(--focus);
    stroke-width: 3;
  }
  .automata-shell :global(button:focus-visible),
  .automata-shell :global(.splash:focus-visible) {
    outline: none;
  }

  /* --- parts --- */
  .automata-shell :global(.item) {
    position: relative;
    isolation: isolate;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.3em 1em;
    width: 100%;
    flex: none;
    min-height: 3.5em;
    padding: 0.4em 1.1em;
    color: var(--button-words);
    font-weight: 600;
    transition: transform calc(140ms * var(--mo));
  }
  .automata-shell :global(button.item) {
    flex-wrap: nowrap;
    justify-content: center;
    text-align: center;
  }
  .automata-shell :global(button.item.nav),
  .automata-shell :global(button.item.switch),
  .automata-shell :global(button.item.radio) {
    justify-content: space-between;
    text-align: left;
  }
  .automata-shell :global(.item .lbl) {
    flex: 0 1 auto;
    min-width: 0;
  }
  .automata-shell :global(button.item.nav .lbl),
  .automata-shell :global(button.item.switch .lbl),
  .automata-shell :global(button.item.radio .lbl) {
    flex: 1 1 auto;
  }
  .automata-shell :global(.item .val) {
    flex: none;
    font-weight: 400;
    opacity: 0.85;
  }
  .automata-shell :global(button.item:active) {
    transform: scale(0.97);
  }
  @media (hover: hover) {
    .automata-shell :global(button.item:hover) {
      transform: scale(1.015);
    }
  }
  .automata-shell :global(.item.primary) {
    color: var(--primary-words);
  }
  .automata-shell :global(.stepper) {
    display: flex;
    align-items: center;
    gap: 0.25em;
    flex: none;
    margin-left: auto;
  }
  .automata-shell :global(.step) {
    position: relative;
    isolation: isolate;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3em;
    line-height: 1;
    flex: none;
  }
  .automata-shell :global(.step[disabled]) {
    opacity: 0.35;
    cursor: default;
  }
  .automata-shell :global(.stepval) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25em;
    min-width: 4.4em;
    text-align: center;
    font-size: 0.9em;
  }
  .automata-shell :global(.pips) {
    display: flex;
    gap: 4px;
  }
  .automata-shell :global(.pips i) {
    display: block;
    width: 16px;
    height: 6px;
    border-radius: 3px;
    background: var(--line);
  }
  .automata-shell :global(.pips i.on) {
    background: var(--primary);
  }
  .automata-shell :global(.slider .out) {
    flex: none;
    min-width: 2.5em;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .automata-shell :global(.slider) {
    pointer-events: auto;
    background: none;
  }
  .automata-shell :global(input[type='range']) {
    -webkit-appearance: none;
    appearance: none;
    background: none;
    height: 44px;
    flex: 1 1 100%;
    margin: 0;
    min-width: 0;
    cursor: pointer;
  }
  .automata-shell :global(input[type='range']::-webkit-slider-runnable-track) {
    height: 10px;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--primary) var(--p), var(--line) var(--p));
  }
  .automata-shell :global(input[type='range']::-moz-range-track) {
    height: 10px;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--primary) var(--p), var(--line) var(--p));
  }
  .automata-shell :global(input[type='range']::-webkit-slider-thumb) {
    -webkit-appearance: none;
    width: 28px;
    height: 28px;
    border-radius: 9px;
    background: var(--page);
    border: 2px solid var(--primary);
    margin-top: -9px;
  }
  .automata-shell :global(input[type='range']::-moz-range-thumb) {
    width: 28px;
    height: 28px;
    border-radius: 9px;
    background: var(--page);
    border: 2px solid var(--primary);
  }
  .automata-shell :global(.sw) {
    display: flex;
    align-items: center;
    gap: 0.6em;
    flex: none;
  }
  .automata-shell :global(.track) {
    position: relative;
    display: block;
    width: 46px;
    height: 26px;
    border-radius: 9px;
    background: var(--line);
  }
  .automata-shell :global(.switch[aria-checked='true'] .track) {
    background: var(--primary);
  }
  .automata-shell :global(.knob) {
    position: absolute;
    top: 50%;
    left: 3px;
    width: 20px;
    height: 20px;
    margin-top: -10px;
    border-radius: 6px;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
    transition: transform calc(160ms * var(--mo));
  }
  .automata-shell :global(.switch[aria-checked='true'] .knob) {
    transform: translateX(20px);
  }
  .automata-shell :global(.tick) {
    flex: none;
    width: 1.2em;
    text-align: center;
    font-weight: 700;
  }
  .automata-shell :global(button.item.save) {
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 0.1em;
    text-align: left;
  }
  .automata-shell :global(.save small) {
    font-size: 0.8em;
    font-weight: 400;
    opacity: 0.8;
  }
  .automata-shell :global(.key) {
    position: relative;
    isolation: isolate;
    flex: none;
    min-width: 5.5em;
    min-height: 44px;
    padding: 0 0.8em;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .automata-shell :global(.credit) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.05em;
    min-height: 2.8em;
    font-weight: 600;
  }
  .automata-shell :global(.credit small) {
    font-size: 0.8em;
    font-weight: 400;
    color: var(--muted);
  }
  .automata-shell :global(.back) {
    align-self: center;
    min-height: 44px;
    padding: 0 1.2em;
    font-weight: 600;
    color: var(--muted);
  }

  /* --- the splash --- */
  .automata-shell :global(.splash) {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1em;
    text-align: center;
    padding: 1.5em;
    cursor: pointer;
    background: var(--page);
    color: var(--words);
    animation: fade calc(300ms * var(--mo)) both;
    pointer-events: auto;
  }
  .automata-shell :global(.splash .logo) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4em;
    animation: card calc(600ms * var(--mo)) var(--ease-logo) both;
  }
  .automata-shell :global(.splash .name) {
    font-family: var(--f-title);
    font-size: 2.4em;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .automata-shell :global(.splash .skip) {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 1.6em;
    font-size: 0.9em;
    color: var(--muted);
  }

  /* --- the HUD --- */
  .automata-shell :global(.hud) {
    position: absolute;
    inset: 0;
    pointer-events: none;
    padding: 0.7em;
  }
  .automata-shell :global(.hud .slot) {
    position: absolute;
    display: flex;
    flex-direction: column;
    gap: 0.4em;
    pointer-events: none;
  }
  .automata-shell :global(.slot.top-left) {
    left: 0.7em;
    top: 0.7em;
    align-items: flex-start;
  }
  .automata-shell :global(.slot.top) {
    left: 50%;
    top: 0.7em;
    transform: translateX(-50%);
    align-items: center;
  }
  .automata-shell :global(.slot.top-right) {
    right: calc(0.7em + 48px + 0.5em);
    top: 0.7em;
    align-items: flex-end;
  }
  .automata-shell :global(.slot.bottom-left) {
    left: 0.7em;
    bottom: 0.7em;
    align-items: flex-start;
  }
  .automata-shell :global(.slot.bottom) {
    left: 50%;
    bottom: 0.7em;
    transform: translateX(-50%);
    align-items: center;
  }
  .automata-shell :global(.slot.bottom-right) {
    right: 0.7em;
    bottom: 0.7em;
    align-items: flex-end;
  }
  .automata-shell :global(.chip) {
    position: relative;
    isolation: isolate;
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    min-height: 2.2em;
    padding: 0 0.75em;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--words);
    pointer-events: none;
  }
  .automata-shell :global(.chip .bar) {
    display: block;
    width: 6em;
    height: 0.6em;
    background: var(--line);
    border-radius: 3px;
    overflow: hidden;
  }
  .automata-shell :global(.chip .bar i) {
    display: block;
    height: 100%;
    background: var(--primary);
  }
  .automata-shell :global(.chip.pausebtn) {
    position: absolute;
    right: 0.7em;
    top: 0.7em;
    width: 48px;
    height: 48px;
    justify-content: center;
    padding: 0;
    pointer-events: auto;
  }
  .automata-shell :global(.pausebtn i) {
    display: block;
    width: 5px;
    height: 16px;
    background: currentColor;
    margin: 0 2.5px;
  }
</style>
