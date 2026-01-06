import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VerificationPage } from './VerificationPage';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('VerificationPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders buttons and input', () => {
    render(<VerificationPage />);
    
    expect(screen.getByText('Load Folders')).toBeInTheDocument();
    expect(screen.getByText('Load DEs')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('DE Customer Key')).toBeInTheDocument();
    expect(screen.getByText('Load Fields')).toBeInTheDocument();
  });

  it('calls API when "Load Folders" is clicked', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [{ Name: 'Folder1' }],
    });
    vi.stubGlobal('fetch', mockFetch);

    render(<VerificationPage />);
    
    fireEvent.click(screen.getByText('Load Folders'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/metadata/folders'));
      expect(screen.getByText(/Folder1/)).toBeInTheDocument();
    });
  });

  it('calls API when "Load DEs" is clicked', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [{ Name: 'DE1' }],
    });
    vi.stubGlobal('fetch', mockFetch);

    render(<VerificationPage />);
    
    fireEvent.click(screen.getByText('Load DEs'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/metadata/data-extensions'));
      expect(screen.getByText(/DE1/)).toBeInTheDocument();
    });
  });
});
