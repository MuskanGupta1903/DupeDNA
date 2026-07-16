import React from 'react';

function OverlapStrip({ candidate = [], shared = [] }) {
  // Normalize strings for comparison
  const normalizedShared = shared.map(i => i.toLowerCase().trim());
  
  return (
    <div className="flex flex-wrap gap-1 w-full max-w-full">
      {candidate.map((ing, i) => {
        const isShared = normalizedShared.includes(ing.toLowerCase().trim());
        return (
          <div 
            key={i} 
            className={`h-4 w-4 md:h-6 md:w-6 flex-shrink-0 ${isShared ? 'bg-pass' : 'border-2 border-muted bg-transparent'}`}
            title={ing} // Tooltip with ingredient name
          />
        );
      })}
    </div>
  );
}

export default OverlapStrip;
