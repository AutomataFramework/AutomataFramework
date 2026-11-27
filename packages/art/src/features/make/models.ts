// The two fal.ai models, picked from https://fal.ai/api/models on 2026-11-27, with the price its list gives for one
// 768 by 768 picture. Both are the same family, so a reimagined picture looks like the sprite it came from.
export const SIZE = 768

export const MODELS = {
  sprite: { id: 'blackforestlabs/flux-3/klein/text-to-image', cost: 0.008 },
  reimagine: { id: 'blackforestlabs/flux-3/klein/edit-image', cost: 0.008 },
} as const
