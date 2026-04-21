import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

describe('Basic Setup Test', () => {
  it('should work', () => {
    render(<div data-testid="test-div">Hello World</div>)
    expect(screen.getByTestId('test-div')).toHaveTextContent('Hello World')
  })
})
