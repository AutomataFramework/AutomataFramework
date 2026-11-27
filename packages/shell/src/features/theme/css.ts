import type { Look } from './default.ts'

/** The theme as CSS custom properties for the shell's root. No component holds a colour or a font of its own. */
export function cssVars(look: Look): Record<string, string> {
  const { colours, fonts } = look
  return {
    '--page': colours.page,
    '--words': colours.words,
    '--muted': colours.muted,
    '--button': colours.button,
    '--button-words': colours.buttonWords,
    '--primary': colours.primary,
    '--primary-words': colours.primaryWords,
    '--line': colours.line,
    '--focus': colours.focus,
    '--f-title': fonts.title,
    '--f-main': fonts.main,
    '--f-plain': fonts.plain,
    '--outline': `${look.outline}px`,
    // Pixel art steps its entry moves instead of gliding.
    '--ease-card': look.pixelArt ? 'steps(5)' : 'cubic-bezier(.2,1.25,.35,1)',
    '--ease-logo': look.pixelArt ? 'steps(5)' : 'cubic-bezier(.2,1.5,.35,1)',
  }
}

/** Registers each font asset under its asset id, so a theme may name it in `fonts`. */
export async function registerFonts(
  assets: { id: string; kind: string; path: string }[],
  fonts: { add(face: FontFace): void },
): Promise<void> {
  await Promise.all(
    assets
      .filter((asset) => asset.kind === 'font')
      .map(async (asset) => {
        const face = new FontFace(asset.id, `url(${asset.path})`)
        fonts.add(await face.load())
      }),
  )
}
