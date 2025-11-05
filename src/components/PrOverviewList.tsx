import { useCallback, useState } from 'react';
import { usePrData } from '../hooks/usePrData';
import { usePrCategories } from '../hooks/usePrCategories';
import { LOCAL_STORAGE_KEYS } from '../constants';
import PrOverview from './PrOverview';
import TokenSetup from './TokenSetup';

export default function PrOverviewList() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [repoOwnerFilter, setRepoOwnerFilter] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('repoOwnerFilter') || '';
  });

  const { pullRequests, username, error, isLoading, refetch } = usePrData(repoOwnerFilter);
  const categories = usePrCategories(pullRequests, username);

  const updateRepoOwnerFilter = useCallback((newFilter: string) => {
    setRepoOwnerFilter(newFilter);

    // Update URL without page reload
    const url = new URL(window.location.href);
    if (newFilter) {
      url.searchParams.set('repoOwnerFilter', newFilter);
    } else {
      url.searchParams.delete('repoOwnerFilter');
    }
    window.history.replaceState({}, '', url.toString());
  }, []);

  const applyFilter = useCallback(() => {
    setIsFilterOpen(false);
    refetch();
  }, [refetch]);

  const handleTokenSubmit = async (token: string) => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, token);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.VIEWER_USERNAME);

    try {
      await refetch();
    } catch {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
      throw new Error('Invalid token. Please check your token and try again.');
    }
  };

  if (error) {
    return <TokenSetup onTokenSubmit={handleTokenSubmit} error={error} />;
  }

  if (isLoading || categories === null) {
    return (
      <div>
        <p><i>Loading...</i></p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[28px] m-0 font-semibold text-gh-text">GitHub PR Review Dashboard</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="px-3 py-1.5 text-[13px] bg-white text-gh-text border border-gh-border rounded-md cursor-pointer font-medium flex items-center gap-1.5"
            title="Filter settings"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8.2 8.2 0 0 1 .701.031C9.444.095 9.99.645 10.16 1.29l.288 1.107c.018.066.079.158.212.224.231.114.454.243.668.386.123.082.233.09.299.071l1.103-.303c.644-.176 1.392.021 1.82.63.27.385.506.792.704 1.218.315.675.111 1.422-.364 1.891l-.814.806c-.049.048-.098.147-.088.294.016.257.016.515 0 .772-.01.147.038.246.088.294l.814.806c.475.469.679 1.216.364 1.891a7.977 7.977 0 0 1-.704 1.217c-.428.61-1.176.807-1.82.63l-1.102-.302c-.067-.019-.177-.011-.3.071a5.909 5.909 0 0 1-.668.386c-.133.066-.194.158-.211.224l-.29 1.106c-.168.646-.715 1.196-1.458 1.26a8.006 8.006 0 0 1-1.402 0c-.743-.064-1.289-.614-1.458-1.26l-.289-1.106c-.018-.066-.079-.158-.212-.224a5.738 5.738 0 0 1-.668-.386c-.123-.082-.233-.09-.299-.071l-1.103.303c-.644.176-1.392-.021-1.82-.63a8.12 8.12 0 0 1-.704-1.218c-.315-.675-.111-1.422.363-1.891l.815-.806c.05-.048.098-.147.088-.294a6.214 6.214 0 0 1 0-.772c.01-.147-.038-.246-.088-.294l-.815-.806C.635 6.045.431 5.298.746 4.623a7.92 7.92 0 0 1 .704-1.217c.428-.61 1.176-.807 1.82-.63l1.102.302c.067.019.177.011.3-.071.214-.143.437-.272.668-.386.133-.066.194-.158.211-.224l.29-1.106C6.009.645 6.556.095 7.299.03 7.53.01 7.764 0 8 0Zm-.571 1.525c-.036.003-.108.036-.137.146l-.289 1.105c-.147.561-.549.967-.998 1.189-.173.086-.34.183-.5.29-.417.278-.97.423-1.529.27l-1.103-.303c-.109-.03-.175.016-.195.045-.22.312-.412.644-.573.99-.014.031-.021.11.059.19l.815.806c.411.406.562.957.53 1.456a4.709 4.709 0 0 0 0 .582c.032.499-.119 1.05-.53 1.456l-.815.806c-.081.08-.073.159-.059.19.162.346.353.677.573.989.02.03.085.076.195.046l1.102-.303c.56-.153 1.113-.008 1.53.27.161.107.328.204.501.29.447.222.85.629.997 1.189l.289 1.105c.029.109.101.143.137.146a6.6 6.6 0 0 0 1.142 0c.036-.003.108-.036.137-.146l.289-1.105c.147-.561.549-.967.998-1.189.173-.086.34-.183.5-.29.417-.278.97-.423 1.529-.27l1.103.303c.109.029.175-.016.195-.045.22-.313.411-.644.573-.99.014-.031.021-.11-.059-.19l-.815-.806c-.411-.406-.562-.957-.53-1.456a4.709 4.709 0 0 0 0-.582c-.032-.499.119-1.05.53-1.456l.815-.806c.081-.08.073-.159.059-.19a6.464 6.464 0 0 0-.573-.989c-.02-.03-.085-.076-.195-.046l-1.102.303c-.56.153-1.113.008-1.53-.27a4.44 4.44 0 0 0-.501-.29c-.447-.222-.85-.629-.997-1.189l-.289-1.105c-.029-.11-.101-.143-.137-.146a6.6 6.6 0 0 0-1.142 0ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM9.5 8a1.5 1.5 0 1 0-3.001.001A1.5 1.5 0 0 0 9.5 8Z"></path>
            </svg>
            Filter
          </button>
          {repoOwnerFilter && (
            <span className="text-xs text-gh-text-secondary">
              <strong>{repoOwnerFilter}</strong>
              <button
                onClick={() => { updateRepoOwnerFilter(''); applyFilter(); }}
                className="ml-1.5 px-1.5 py-0.5 text-[11px] bg-transparent text-gh-link border-none cursor-pointer underline"
              >
                clear
              </button>
            </span>
          )}
        </div>
      </div>

      {isFilterOpen && (
        <div className="mb-5 px-4 py-3 bg-white border border-gh-border rounded-md">
          <div className="flex gap-2 items-center">
            <input
              id="repoOwnerFilter"
              type="text"
              value={repoOwnerFilter}
              onChange={(e) => updateRepoOwnerFilter(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyFilter(); }}
              placeholder="Filter by repo owner (e.g., microsoft, google, facebook)"
              className="flex-1 px-2.5 py-1.5 text-[13px] border border-gh-border rounded-md bg-gh-bg text-gh-text"
            />
            <button
              onClick={applyFilter}
              className="px-3 py-1.5 text-[13px] bg-gh-green text-white border-none rounded-md cursor-pointer font-medium"
            >
              Apply
            </button>
            <button
              onClick={() => setIsFilterOpen(false)}
              className="px-3 py-1.5 text-[13px] bg-gh-bg text-gh-text border border-gh-border rounded-md cursor-pointer font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {categories.map((category) => (
        <div key={category.title} className="mb-7">
          <h2 className="m-0 mb-2.5 font-semibold text-gh-text uppercase tracking-wider text-[13px]">{category.title}</h2>
          {category.overviews.length === 0 ? (
            <p className="text-gh-text-muted text-[13px] italic m-0">No PRs in this category</p>
          ) : (
            category.overviews.map((overview) => (
              <PrOverview key={overview.id} prOverview={overview} />
            ))
          )}
        </div>
      ))}
    </div>
  );
}