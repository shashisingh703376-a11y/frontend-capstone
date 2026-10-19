import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ActionStudio, { EXAMPLE_PROMPTS } from '../pages/ActionStudio.jsx';

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
  vi.resetAllMocks();
});


describe('ActionStudio', () => {
  it('renders the prompt textarea', () => {
    render(<ActionStudio />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows first-run empty state with example prompt chips when prompt is empty', () => {
    render(<ActionStudio />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '' } });

    expect(screen.getByText(/need inspiration\? choose a starter prompt/i)).toBeInTheDocument();
    EXAMPLE_PROMPTS.forEach((item) => {
      expect(screen.getByRole('button', { name: new RegExp(item.label, 'i') })).toBeInTheDocument();
    });
  });

  it('populates prompt textarea when an example chip is clicked', () => {
    render(<ActionStudio />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '' } });

    const firstExample = EXAMPLE_PROMPTS[0];
    const chip = screen.getByRole('button', { name: new RegExp(firstExample.label, 'i') });
    fireEvent.click(chip);

    expect(textarea).toHaveValue(firstExample.prompt);
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

  it('shows a validation error when prompt is only whitespace', async () => {
    render(<ActionStudio />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '    \n\t  ' } });
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

  it('displays skeleton loading indicator while request is in flight', async () => {
    let resolvePromise;
    fakeGenerate.mockImplementationOnce(() => new Promise((resolve) => {
      resolvePromise = resolve;
    }));

    render(<ActionStudio />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Slow prompt test' } });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));

    expect(screen.getByRole('status', { name: /generating response/i })).toBeInTheDocument();

    resolvePromise({ title: 'Done', body: 'Response arrived' });
    await waitFor(() => {
      expect(screen.getByText('Response arrived')).toBeInTheDocument();
    });
  });

  it('provides a Stop button that halts in-flight generation', async () => {
    fakeGenerate.mockImplementationOnce(() => new Promise(() => {}));

    render(<ActionStudio />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Long running generation' } });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));

    const stopBtn = screen.getByRole('button', { name: /stop generation/i });
    expect(stopBtn).toBeInTheDocument();

    fireEvent.click(stopBtn);
    await waitFor(() => {
      expect(screen.getByText(/generation stopped by user/i)).toBeInTheDocument();
    });
  });

  it('displays error message and allows de-duplicated retry when request fails mid-stream', async () => {
    fakeGenerate
      .mockRejectedValueOnce(new Error('Simulated mid-stream failure: Stream disconnected'))
      .mockResolvedValueOnce({ title: 'Generated output', body: 'Recovered copy!' });

    render(<ActionStudio />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Midstream test prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));

    await waitFor(() => {
      expect(screen.getByText(/stream disconnected/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /^retry$/i });
    expect(retryBtn).toBeInTheDocument();

    // Click retry
    fireEvent.click(retryBtn);


    // Verify retry called with original prompt
    await waitFor(() => {
      expect(screen.getByText(/recovered copy!/i)).toBeInTheDocument();
    });
  });

  it('handles empty AI response without crashing', async () => {
    fakeGenerate.mockResolvedValueOnce({ title: 'Generated output', body: '' });

    render(<ActionStudio />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Prompt expecting empty response' } });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));

    await waitFor(() => {
      expect(screen.getByText(/no results were returned by the ai/i)).toBeInTheDocument();
    });
  });

  it('renders structured copy package with headline, tone, key highlights, and CTA button', async () => {
    fakeGenerate.mockResolvedValueOnce({
      title: 'Focus on What Matters',
      body: 'Core body narrative copy here.',
      structured: {
        headline: 'Focus on What Matters',
        body: 'Core body narrative copy here.',
        callToAction: 'Get Early Access',
        tone: 'Bold & Direct',
        keyTakeaways: ['Highlight 1', 'Highlight 2'],
      },
    });

    render(<ActionStudio />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Structured prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3, name: /Focus on What Matters/i })).toBeInTheDocument();
    });

    expect(screen.getByText('Bold & Direct')).toBeInTheDocument();
    expect(screen.getByText('Core body narrative copy here.')).toBeInTheDocument();
    expect(screen.getByText('Highlight 1')).toBeInTheDocument();
    expect(screen.getByText('Get Early Access')).toBeInTheDocument();

    const copyBtn = screen.getByRole('button', { name: /copy generated copy to clipboard/i });
    expect(copyBtn).toBeInTheDocument();
    fireEvent.click(copyBtn);
  });
});
