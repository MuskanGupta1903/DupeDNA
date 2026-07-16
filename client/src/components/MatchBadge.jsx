import React from 'react';

function MatchBadge({ score, index }) {
  // Alternate rotation between -8deg and 6deg as per design spec
  const rotation = index % 2 === 0 ? -8 : 6;
  
  return (
    <div 
      className="flex items-center justify-center rounded-full bg-stamp text-paper w-24 h-24 border-4 border-stamp font-headline text-3xl shrink-0"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {score}%
    </div>
  );
}

export default MatchBadge;
