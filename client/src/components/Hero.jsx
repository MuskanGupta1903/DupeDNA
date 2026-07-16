import React, { useEffect, useState } from 'react';

function Hero({ onRunTest, status }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      setIsSearching(true);
      fetch(`http://localhost:5000/api/products/search?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => {
          setResults(data);
          setIsSearching(false);
        })
        .catch(err => {
          console.error(err);
          setIsSearching(false);
        });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelect = (product) => {
    setQuery(`${product.brand} — ${product.name}`);
    setSelectedProductId(product._id);
    setResults([]);
  };

  const handleRun = async () => {
    if (selectedProductId) {
      onRunTest(selectedProductId);
    } else if (results && results.length > 0) {
      handleSelect(results[0]);
      onRunTest(results[0]._id);
    } else if (query.trim().startsWith('http')) {
      setIsSearching(true);
      try {
        const res = await fetch(`http://localhost:5000/api/products/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          handleSelect(data[0]);
          onRunTest(data[0]._id);
        } else {
          alert('Could not find or scrape this product.');
        }
      } catch (err) {
        console.error(err);
        alert('Error scraping URL.');
      } finally {
        setIsSearching(false);
      }
    }
  };

  return (
    <section className="min-h-[80vh] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative left/right elements */}
      <div className="hidden lg:block absolute left-12 top-1/3 stamp-anim">
        <div className="border-4 border-stamp text-stamp font-headline text-4xl p-2 rotate-[-15deg] opacity-80">
          CONFIDENTIAL
        </div>
      </div>
      <div className="hidden lg:flex absolute right-12 top-1/3 flex-col items-end opacity-60">
        <div className="font-mono text-xs text-ink mb-1">DATE: {new Date().toISOString().split('T')[0]}</div>
        <div className="font-mono text-xs text-ink mb-2">OPERATOR: SYSTEM</div>
        <div className="flex gap-1 h-8">
          <div className="w-1 bg-ink"></div><div className="w-2 bg-ink"></div><div className="w-1 bg-ink"></div><div className="w-3 bg-ink"></div><div className="w-1 bg-ink"></div><div className="w-2 bg-ink"></div><div className="w-1 bg-ink"></div>
        </div>
        <div className="font-mono text-[10px] text-ink mt-1 tracking-widest">78-00912</div>
      </div>

      <div className="w-full max-w-2xl text-center flex flex-col items-center gap-12 relative z-10">
        <div className="flex flex-col items-center">
          <div className="inline-block">
            <h2 className="font-headline text-4xl md:text-5xl text-ink typewriter pr-2">What are we testing today?</h2>
          </div>
          <p className="font-mono text-muted text-sm mt-4 tracking-wide">
            Analyze ingredient structures to find scientifically-matched dupes.
          </p>
        </div>
        
        <div className="w-full relative text-left">
          <input 
            type="text"
            className="w-full bg-transparent border-b-2 border-ink py-4 px-2 font-body text-xl md:text-2xl focus:outline-none text-center placeholder:text-muted"
            placeholder="Paste a URL or type a product name..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedProductId('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRun();
              }
            }}
          />
          
          {Array.isArray(results) && results.length > 0 && !selectedProductId && (
            <ul className="absolute z-10 w-full bg-paper border-2 border-ink mt-2 max-h-60 overflow-y-auto shadow-sm">
              {results.map(p => (
                <li 
                  key={p._id} 
                  className="px-4 py-3 hover:bg-[#E8E6DE] cursor-pointer border-b border-dashed border-rule last:border-0 text-center font-body text-lg text-ink"
                  onClick={() => handleSelect(p)}
                >
                  {p.brand} — {p.name}
                </li>
              ))}
            </ul>
          )}
          {isSearching && !selectedProductId && (
            <div className="absolute z-10 w-full bg-paper border-2 border-t-0 border-ink py-2 text-center font-mono text-xs text-muted">
              SEARCHING...
            </div>
          )}
        </div>

        <button 
          onClick={handleRun}
          disabled={status === 'loading' || isSearching || (!selectedProductId && (!results || results.length === 0) && !query.trim().startsWith('http'))}
          className="bg-ink text-paper font-body font-bold py-4 px-12 tracking-widest uppercase disabled:opacity-50 transition-all shadow-[4px_4px_0px_#8FA8C9] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#8FA8C9] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
        >
          {status === 'loading' || isSearching ? 'ANALYZING...' : 'RUN TEST →'}
        </button>
      </div>

      <div className="absolute bottom-0 w-full border-t-2 border-b-2 border-ink bg-paper py-2">
        <div className="ticker-track font-mono text-xs text-ink tracking-widest">
          <div className="ticker-content flex gap-8 whitespace-nowrap">
            <span>/// PROTOCOL INITIATED ///</span>
            <span>INGREDIENT OVERLAP ANALYSIS</span>
            <span>AWAITING INPUT</span>
            <span>/// MODEL: all-MiniLM-L6-v2 ///</span>
            <span>SYSTEM READY</span>
            <span>/// PROTOCOL INITIATED ///</span>
            <span>INGREDIENT OVERLAP ANALYSIS</span>
            <span>AWAITING INPUT</span>
            <span>/// MODEL: all-MiniLM-L6-v2 ///</span>
            <span>SYSTEM READY</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
