import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ActionStudio from '../pages/ActionStudio.jsx';

// Mock fakeGenerate so tests don't hit the real API
vi.mock('../lib/fakeGenerate.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fakeGenerate: vi.fn(),
  };
});

import { fakeGenerate } from '../lib/fakeGenerate.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ActionStudio', () => {
  it('renders the prompt textarea', () => {
    render(<ActionStudio />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows a validation error when Generate is clicked with an empty prompt', async () => {
    render(<ActionStudio />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(fakeGenerate).not.toHaveBeenCalled();
  });

  it('shows a validation error when prompt exceeds 1000 characters', async () => {
    render(<ActionStudio />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'a'.repeat(1001) } });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(fakeGenerate).not.toHaveBeenCalled();
  });

  it('calls fakeGenerate with the prompt when valid', async () => {
    fakeGenerate.mockResolvedValueOnce({ title: 'Generated output', body: 'Great copy!' });
    render(<ActionStudio />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Write a blog post.' } });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    await waitFor(() => {
      expect(fakeGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: 'Write a blog post.' }),
      );
    });
  });

  it('displays error message when fakeGenerate rejects', async () => {
    fakeGenerate.mockRejectedValueOnce(new Error('Rate limited.'));
    render(<ActionStudio />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Write something.' } });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    await waitFor(() => {
      expect(screen.getByText(/rate limited/i)).toBeInTheDocument();
    });
  });
});
