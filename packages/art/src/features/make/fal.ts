// fal.ai by plain `fetch`: one call, one picture back.

/** What the art command needs from outside, so tests can stand in for fal.ai and spend nothing. */
export type Outside = { fetch: typeof fetch; key: string }

/** Sends `input` to a fal.ai model and gives back the first picture it made, with the seed it used. */
export async function falPicture(
  outside: Outside,
  model: string,
  input: Record<string, unknown>,
): Promise<{ png: Uint8Array; seed: number }> {
  const res = await outside.fetch(`https://fal.run/${model}`, {
    method: 'POST',
    headers: { authorization: `Key ${outside.key}`, 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(`fal.ai said no (${res.status}): ${(await res.text()).slice(0, 300)}`)
  const answer = (await res.json()) as { images?: { url?: string }[]; seed?: number }
  const url = answer.images?.[0]?.url
  if (!url) throw new Error('fal.ai answered without a picture.')
  const picture = await outside.fetch(url)
  if (!picture.ok) throw new Error(`The picture fal.ai made could not be fetched (${picture.status}).`)
  return { png: new Uint8Array(await picture.arrayBuffer()), seed: answer.seed ?? Number(input['seed']) }
}
