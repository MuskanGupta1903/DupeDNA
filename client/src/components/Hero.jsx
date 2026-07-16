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
    <section className="min-h-[80vh] flex flex-col items-center justify-center px-4 relative">
      <div className="w-full max-w-2xl text-center flex flex-col items-center gap-12">
        <h2 className="font-headline text-4xl md:text-5xl text-ink">What are we testing today?</h2>
        
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
          className="bg-ink text-paper font-body font-bold py-4 px-12 tracking-widest uppercase hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {status === 'loading' || isSearching ? 'ANALYZING...' : 'RUN TEST →'}
        </button>
      </div>

      <div className="absolute bottom-8 w-full text-center">
        <span className="font-mono text-muted text-sm tracking-[0.2em] border-t border-dashed border-rule pt-4 block w-64 mx-auto">
          · · · SCROLL FOR RESULTS · · ·
        </span>
      </div>
    </section>
  );
}

export default Hero;
