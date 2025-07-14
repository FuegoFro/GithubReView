import type { PrOverviewI } from '../types';

interface PrOverviewProps {
  prOverview: PrOverviewI;
}

export default function PrOverview({ prOverview }: PrOverviewProps) {
  return (
    <p>
      <a href={`https://www.github.com/${prOverview.repoOwner}/${prOverview.repoName}/pull/${prOverview.prNumber}`}>
        [GH]
      </a>
      {' • '}
      <span>{prOverview.title}</span>
    </p>
  );
}