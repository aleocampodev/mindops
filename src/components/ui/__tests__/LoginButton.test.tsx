import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import LoginButton from '../LoginButton'

describe('LoginButton', () => {
  it('renders the login button with correct text', () => {
    render(<LoginButton />)
    expect(screen.getByText(/LOGIN WITH GOOGLE/i)).toBeDefined()
  })
})
