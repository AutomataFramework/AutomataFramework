/** One mistake in a game's files, written so a person can act on it. */
export type Problem = { file: string; line: number; message: string; fix: string }

export type Result<T> = { ok: true; value: T } | { ok: false; problems: Problem[] }

export const ok = <T>(value: T): Result<T> => ({ ok: true, value })
export const fail = (problems: Problem[]): Result<never> => ({ ok: false, problems })
