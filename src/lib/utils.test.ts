import { describe, it, expect } from 'vitest'
import { cn, formatSalaryString } from './utils'

describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white')
  })

  it('handles conditional classes', () => {
    expect(cn('px-2', true && 'py-2', false && 'm-2')).toBe('px-2 py-2')
  })

  it('merges tailwind classes and resolves conflicts', () => {
    expect(cn('bg-red-500 p-2', 'bg-blue-500')).toBe('p-2 bg-blue-500')
  })
})

describe('formatSalaryString', () => {
  it('formats numbers with commas', () => {
    expect(formatSalaryString('100000')).toBe('100,000')
    expect(formatSalaryString('1000')).toBe('1,000')
  })

  it('handles existing commas by ignoring and rewriting them', () => {
    expect(formatSalaryString('100,000')).toBe('100,000')
    expect(formatSalaryString('1,00,000')).toBe('100,000')
  })

  it('preserves text surrounding numbers', () => {
    expect(formatSalaryString('$100000 - $150000')).toBe('$100,000 - $150,000')
    expect(formatSalaryString('Up to 120000/yr')).toBe('Up to 120,000/yr')
  })

  it('handles empty strings and spaces by returning dash', () => {
    expect(formatSalaryString('')).toBe('-')
    expect(formatSalaryString('   ')).toBe('-')
    expect(formatSalaryString('-')).toBe('-')
  })
})

