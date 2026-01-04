import { useState } from 'react';

export function VerificationPage() {
  const [tenantId, setTenantId] = useState('t1');
  const [userId, setUserId] = useState('u1');
  const [deKey, setDeKey] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async (endpoint: string, params: Record<string, string>) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ tenantId, userId, ...params }).toString();
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
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Metadata Verification</h1>
      
      <div className="flex gap-2">
        <input 
          value={tenantId} 
          onChange={e => setTenantId(e.target.value)} 
          placeholder="Tenant ID"
          className="border p-1"
        />
        <input 
          value={userId} 
          onChange={e => setUserId(e.target.value)} 
          placeholder="User ID"
          className="border p-1"
        />
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => fetchData('folders', {})}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Load Folders
        </button>

        <button 
          onClick={() => fetchData('data-extensions', { eid: '123' })} // Mock EID
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Load DEs
        </button>
      </div>

      <div className="flex gap-2 items-center">
        <input 
          value={deKey} 
          onChange={e => setDeKey(e.target.value)} 
          placeholder="DE Customer Key"
          className="border p-2"
        />
        <button 
          onClick={() => fetchData('fields', { key: deKey })}
          className="bg-purple-500 text-white px-4 py-2 rounded"
        >
          Load Fields
        </button>
      </div>

      <div className="mt-4 border p-4 bg-gray-50 max-h-96 overflow-auto font-mono text-sm">
        {loading ? 'Loading...' : <pre>{JSON.stringify(results, null, 2)}</pre>}
      </div>
    </div>
  );
}
