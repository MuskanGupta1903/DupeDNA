import React, { useState } from 'react';
import MatchBadge from './MatchBadge';
import OverlapStrip from './OverlapStrip';

function ResultRow({ match, index, targetId }) {
  const [explanation, setExplanation] = useState(null);
  const [loadingExpl, setLoadingExpl] = useState(false);

  const handleExplain = async () => {
    if (explanation || loadingExpl) return;
    setLoadingExpl(true);
    try {
      const res = await fetch(`http://localhost:5000/api/dupes/${targetId}/explain/${match._id}`);
      const data = await res.json();
      setExplanation(data.explanation);
    } catch (err) {
      console.error(err);
      setExplanation('Explanation unavailable.');
    } finally {
      setLoadingExpl(false);
    }
  };

  const formattedIndex = (index + 1).toString().padStart(2, '0');

  return (
    <div className="border-b border-dashed border-rule py-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
      <div className="font-mono text-muted text-xl">{formattedIndex}</div>
      
      <div className="flex-grow">
        <h4 className="font-body text-xl font-medium text-ink">{match.brand} — {match.name}</h4>
        <div className="font-mono text-muted text-sm mt-1">₹{match.price}</div>
        
        <div className="mt-4 flex flex-col gap-2">
          <div className="font-mono text-xs tracking-wider text-ink">
            INGREDIENTS · {match.sharedIngredients.length}/{match.candidateIngredients.length} SHARED
          </div>
          <OverlapStrip 
            candidate={match.candidateIngredients} 
            shared={match.sharedIngredients} 
          />
        </div>

        <div className="mt-4 flex items-center gap-4">
          <button 
            onClick={handleExplain}
            className="text-sm font-body underline decoration-rule hover:decoration-ink transition-colors"
          >
            {loadingExpl ? 'Loading analysis...' : 'Why this match?'}
          </button>
          {match.productUrl && (
            <a 
              href={match.productUrl} 
              target="_blank" 
              rel="noreferrer"
              className="text-sm font-mono text-muted hover:text-ink flex items-center gap-1"
            >
              VIEW PRODUCT ↗
            </a>
          )}
        </div>
        
        {explanation && (
          <div className="mt-4 p-4 bg-[#E8E6DE] border-l-2 border-ink text-sm font-body italic">
            {explanation}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 ml-auto">
        <MatchBadge score={match.matchScore} index={index} />
      </div>
    </div>
  );
}

export default ResultRow;
