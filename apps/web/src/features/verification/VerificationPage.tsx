import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';

export function VerificationPage() {
  const { tenant } = useAuthStore();
  const [deKey, setDeKey] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async (endpoint: string, params: Record<string, string>) => {
    setLoading(true);
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`/api/metadata/${endpoint}?${query}`);
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setResults({ error: 'Failed to fetch' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">Metadata Verification</h1>
      <p className="text-sm text-muted-foreground">
        Testing API calls for Tenant: <span className="font-mono font-bold text-primary">{tenant?.eid}</span>
      </p>
      
      <div className="flex gap-4">
        <button 
          onClick={() => fetchData('folders', {})}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
        >
          Load Folders
        </button>

        <button 
          onClick={() => fetchData('data-extensions', { eid: tenant?.eid || '' })}
          className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80 transition-colors"
        >
          Load DEs
        </button>
      </div>

      <div className="flex gap-2 items-center">
        <input 
          value={deKey} 
          onChange={e => setDeKey(e.target.value)} 
          placeholder="DE Customer Key"
          className="border p-2 rounded-md flex-1"
        />
        <button 
          onClick={() => fetchData('fields', { key: deKey })}
          className="bg-accent text-accent-foreground px-4 py-2 rounded-md hover:bg-accent/80 transition-colors"
        >
          Load Fields
        </button>
      </div>

      <div className="mt-4 border rounded-md p-4 bg-muted/50 max-h-[500px] overflow-auto font-mono text-xs">
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            Loading...
          </div>
        ) : (
          <pre>{results ? JSON.stringify(results, null, 2) : '// No results yet'}</pre>
        )}
      </div>
    </div>
  );
}
