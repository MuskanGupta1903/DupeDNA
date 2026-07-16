import React from 'react';
import ResultRow from './ResultRow';

function Results({ targetProduct, matches }) {
  if (!targetProduct) return null;

  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-24">
      <div className="flex justify-between items-end border-b-2 border-ink pb-4 mb-8">
        <h2 className="font-body font-bold text-2xl tracking-wide">TEST RESULTS</h2>
        <span className="font-mono text-muted">{matches.length} MATCHES FOUND</span>
      </div>
      
      <div className="mb-12">
        <h3 className="font-mono text-sm text-muted mb-2">TARGET SAMPLE:</h3>
        <p className="font-body text-xl font-medium">{targetProduct.brand} — {targetProduct.name}</p>
      </div>

      <div className="flex flex-col">
        {matches.map((match, index) => (
          <ResultRow 
            key={match._id} 
            match={match} 
            index={index} 
            targetId={targetProduct._id}
          />
        ))}
      </div>
    </section>
  );
}

export default Results;
