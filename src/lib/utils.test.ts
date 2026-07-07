import { describe, it, expect } from 'vitest'
import { cn } from './utils'

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
