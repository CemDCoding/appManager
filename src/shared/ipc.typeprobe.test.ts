// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- index.ts shadows index.d.ts in tsconfig.node.json
/// <reference path="../preload/index.d.ts" />
import { describe, expect, it } from 'vitest'
import { IPC_ERROR_CODES } from './ipc'

/**
 * Type probe: `tsc` (npm run typecheck, tsconfig.web.json) must see `api`
 * typed. A wrong payload has to be a compile error, otherwise the
 * `@ts-expect-error` lines below fail the typecheck. Never called at runtime.
 */
declare const api: Window['api']

export function typeProbe(): void {
  void api.entity.list('persons')
  void api.entity.delete('projects', 'id', { cascade: true })
  // @ts-expect-error unknown collection name
  void api.entity.list('nope')
  // @ts-expect-error id must be a string
  void api.entity.get('persons', 42)
  // @ts-expect-error unknown channel group
  void api.unknownChannel
}

describe('IPC error codes', () => {
  it('contains the dedicated IN_USE code', () => {
    expect(IPC_ERROR_CODES).toContain('IN_USE')
  })
})
