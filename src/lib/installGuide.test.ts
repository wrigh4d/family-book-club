import { describe, expect, it } from 'vitest'
import {
  guessInstallOs,
  guessInstallOsFromNavigator,
  INSTALL_OS_OPTIONS,
  stepsForOs,
  type InstallOs,
} from './installGuide'

describe('INSTALL_OS_OPTIONS', () => {
  it('lists iPhone, Android, and Desktop', () => {
    expect(INSTALL_OS_OPTIONS.map((row) => row.id)).toEqual(['ios', 'android', 'desktop'])
  })
})

describe('stepsForOs', () => {
  const platforms: InstallOs[] = ['ios', 'android', 'desktop']

  it.each(platforms)('returns 3 or 4 steps for %s', (os) => {
    const steps = stepsForOs(os)
    expect(steps.length).toBeGreaterThanOrEqual(3)
    expect(steps.length).toBeLessThanOrEqual(4)
    for (const step of steps) {
      expect(step.title.trim().length).toBeGreaterThan(0)
      expect(step.detail.trim().length).toBeGreaterThan(0)
      expect(step.title).not.toMatch(/—/)
      expect(step.detail).not.toMatch(/—/)
    }
  })

  it('mentions Add to Home Screen on iOS', () => {
    const text = stepsForOs('ios')
      .map((s) => `${s.title} ${s.detail}`)
      .join(' ')
    expect(text).toMatch(/Add to Home Screen/i)
  })
})

describe('guessInstallOs', () => {
  it('detects iPhone', () => {
    expect(guessInstallOs('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('ios')
  })

  it('detects Android', () => {
    expect(guessInstallOs('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36')).toBe(
      'android',
    )
  })

  it('defaults to desktop', () => {
    expect(guessInstallOs('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('desktop')
  })
})

describe('guessInstallOsFromNavigator', () => {
  it('treats iPadOS desktop UA with touch as ios', () => {
    expect(
      guessInstallOsFromNavigator({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      }),
    ).toBe('ios')
  })

  it('keeps Mac without touch as desktop', () => {
    expect(
      guessInstallOsFromNavigator({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
        maxTouchPoints: 0,
      }),
    ).toBe('desktop')
  })
})
