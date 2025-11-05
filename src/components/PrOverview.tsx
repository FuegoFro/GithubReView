import type { PullRequest } from '../generated/schema';

interface PrOverviewProps {
  prOverview: PullRequest;
}

export default function PrOverview({ prOverview }: PrOverviewProps) {
  return (
    <div style={{
      padding: '6px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }}>
      <a
        href={`https://www.github.com/${prOverview.repository.owner.login}/${prOverview.repository.name}/pull/${prOverview.number}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          padding: '4px 8px',
          backgroundColor: '#f6f8fa',
          border: '1px solid #d0d7de',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '600',
          textDecoration: 'none',
          color: '#0969da',
          flexShrink: 0
        }}
      >
        GH
        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.6 }}>
          <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z"></path>
        </svg>
      </a>
      <span style={{ fontSize: '14px', color: '#24292f', lineHeight: '1.4', flex: 1 }}>{prOverview.title}</span>
    </div>
  );
}