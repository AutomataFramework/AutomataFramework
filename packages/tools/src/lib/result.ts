import type { Problem, Result } from '@automataframework/core'

export const ok = <T>(value: T): Result<T> => ({ ok: true, value })
export const fail = (problems: Problem[]): Result<never> => ({ ok: false, problems })
