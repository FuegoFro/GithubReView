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

      <form onSubmit={handleSubmit} className="my-5">
        <div className="mb-2.5">
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste your GitHub token here"
            className="w-96 px-2 py-2 text-sm border border-gray-300 rounded disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          />
        </div>
        <button
          type="submit"
          disabled={!tokenInput.trim() || isSubmitting}
          className="px-4 py-2 text-sm bg-[#0366d6] text-white border-none rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Verifying...' : 'Save Token'}
        </button>
      </form>

      <details className="mt-5">
        <summary>How to get a GitHub token</summary>
        <ol className="mt-2.5">
          <li>Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">GitHub Settings → Personal Access Tokens → Tokens (classic)</a></li>
          <li>Click "Generate new token (classic)"</li>
          <li>Give it a name like "PR Review Dashboard"</li>
          <li>Select the 'repo' scope (full control of private repositories)</li>
          <li>Click "Generate token"</li>
          <li>Copy the token and paste it above</li>
        </ol>
      </details>

      {error && (
        <details className="mt-2.5">
          <summary>Error details</summary>
          <pre className="text-red-600 text-xs">{error}</pre>
        </details>
      )}
    </div>
  );
}