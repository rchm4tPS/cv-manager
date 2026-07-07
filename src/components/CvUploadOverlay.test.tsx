import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CvUploadOverlay } from './CvUploadOverlay'

// Mock ResizeObserver for some UI components
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

describe('CvUploadOverlay Component', () => {
  it('does not render when closed', () => {
    const onOpenChange = vi.fn()
    const onSuccess = vi.fn()
    
    render(
      <CvUploadOverlay 
        open={false} 
        onOpenChange={onOpenChange} 
        onSuccess={onSuccess} 
      />
    )
    
    expect(screen.queryByText('AI Resume Import')).not.toBeInTheDocument()
  })

  it('renders correctly when open', () => {
    const onOpenChange = vi.fn()
    const onSuccess = vi.fn()
    
    render(
      <CvUploadOverlay 
        open={true} 
        onOpenChange={onOpenChange} 
        onSuccess={onSuccess} 
      />
    )
    
    expect(screen.getByText('AI Resume Import')).toBeInTheDocument()
    expect(screen.getByText('Select your PDF Resume')).toBeInTheDocument()
  })
})
