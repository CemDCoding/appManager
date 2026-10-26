import { describe, expect, it } from 'vitest'
import { DEFAULT_EXPENSE_CATEGORIES } from '@shared/lists'
import { listLabel, listOptions, selectableOptions } from './list-options'
import { clampStars, starsForKey } from './star-logic'
import { visibleProjects } from './ProjectPicker'

const setting = {
  custom: [
    { key: 'vpn', label: 'VPN', hidden: false },
    { key: 'oldTool', label: 'Altes Tool', hidden: true }
  ],
  hiddenDefaults: ['hardware']
}

describe('listOptions', () => {
  it('combines translated defaults and custom entries', () => {
    const options = listOptions('expenseCategories', setting, 'de')
    expect(options).toHaveLength(DEFAULT_EXPENSE_CATEGORIES.length + 2)
    expect(options[0]).toEqual({
      key: 'hosting',
      label: 'Hosting/Server',
      hidden: false,
      custom: false
    })
    expect(options.find((o) => o.key === 'hardware')?.hidden).toBe(true)
    expect(options.at(-1)).toEqual({
      key: 'oldTool',
      label: 'Altes Tool',
      hidden: true,
      custom: true
    })
    expect(listOptions('expenseCategories', undefined, 'en')[1]?.label).toBe('Database')
  })

  it('hidden entries are not selectable, except the stored value', () => {
    const options = listOptions('expenseCategories', setting, 'de')
    const keys = (current: string[]) => selectableOptions(options, current).map((o) => o.key)
    expect(keys([])).not.toContain('hardware')
    expect(keys([])).not.toContain('oldTool')
    expect(keys(['oldTool'])).toContain('oldTool')
    expect(keys(['gone'])).toContain('gone')
  })

  it('labels stored keys', () => {
    expect(listLabel('expenseCategories', 'vpn', setting, 'de')).toBe('VPN')
    expect(listLabel('campaignFormats', 'video', undefined, 'en')).toBe('Video')
    expect(listLabel('projectPlatforms', 'unknown', undefined, 'de')).toBe('unknown')
  })
})

describe('star rating', () => {
  it('clamps to 0–5', () => {
    expect(clampStars(7)).toBe(5)
    expect(clampStars(-1)).toBe(0)
    expect(clampStars(Number.NaN)).toBe(0)
    expect(clampStars(2.6)).toBe(3)
  })

  it('maps keys', () => {
    expect(starsForKey(2, 'ArrowRight')).toBe(3)
    expect(starsForKey(5, 'ArrowUp')).toBe(5)
    expect(starsForKey(0, 'ArrowLeft')).toBe(0)
    expect(starsForKey(3, 'Home')).toBe(0)
    expect(starsForKey(1, 'End')).toBe(5)
    expect(starsForKey(1, 'a')).toBeNull()
  })
})

describe('visibleProjects', () => {
  const list = [
    { id: 'a', name: 'A', archived: false },
    { id: 'b', name: 'B', archived: true }
  ]
  it('hides archived projects unless selected or requested', () => {
    expect(visibleProjects(list, [], false).map((p) => p.id)).toEqual(['a'])
    expect(visibleProjects(list, ['b'], false).map((p) => p.id)).toEqual(['a', 'b'])
    expect(visibleProjects(list, [], true).map((p) => p.id)).toEqual(['a', 'b'])
  })
})
