import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VerificationPage } from './VerificationPage';
import { vi } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

describe('VerificationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders buttons and input', () => {
    render(<VerificationPage />);
    
    expect(screen.getByText('Load Folders')).toBeInTheDocument();
    expect(screen.getByText('Load DEs')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('DE Customer Key')).toBeInTheDocument();
    expect(screen.getByText('Load Fields')).toBeInTheDocument();
  });

  it('calls API when "Load Folders" is clicked', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ Name: 'Folder1' }],
    });

    render(<VerificationPage />);
    
    fireEvent.click(screen.getByText('Load Folders'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/metadata/folders'));
      expect(screen.getByText(/Folder1/)).toBeInTheDocument();
    });
  });

  it('calls API when "Load DEs" is clicked', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ Name: 'DE1' }],
    });

    render(<VerificationPage />);
    
    fireEvent.click(screen.getByText('Load DEs'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/metadata/data-extensions'));
      expect(screen.getByText(/DE1/)).toBeInTheDocument();
    });
  });
});
