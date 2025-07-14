import { useState } from 'react';

interface TokenSetupProps {
  onTokenSubmit: (token: string) => Promise<void>;
  error?: string;
}

export default function TokenSetup({ onTokenSubmit, error }: TokenSetupProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onTokenSubmit(tokenInput.trim());
      setTokenInput('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2>Authentication Required</h2>
      <p>Please enter your GitHub personal access token to view PRs.</p>
      
      <form onSubmit={handleSubmit} style={{ margin: '20px 0' }}>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste your GitHub token here"
            style={{
              width: '400px',
              padding: '8px',
              fontSize: '14px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
            disabled={isSubmitting}
          />
        </div>
        <button
          type="submit"
          disabled={!tokenInput.trim() || isSubmitting}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#0366d6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: tokenInput.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
            opacity: tokenInput.trim() && !isSubmitting ? 1 : 0.6
          }}
        >
          {isSubmitting ? 'Verifying...' : 'Save Token'}
        </button>
      </form>
      
      <details style={{ marginTop: '20px' }}>
        <summary>How to get a GitHub token</summary>
        <ol style={{ marginTop: '10px' }}>
          <li>Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">GitHub Settings → Personal Access Tokens → Tokens (classic)</a></li>
          <li>Click "Generate new token (classic)"</li>
          <li>Give it a name like "PR Review Dashboard"</li>
          <li>Select the 'repo' scope (full control of private repositories)</li>
          <li>Click "Generate token"</li>
          <li>Copy the token and paste it above</li>
        </ol>
      </details>
      
      {error && (
        <details style={{ marginTop: '10px' }}>
          <summary>Error details</summary>
          <pre style={{ color: 'red', fontSize: '12px' }}>{error}</pre>
        </details>
      )}
    </div>
  );
}