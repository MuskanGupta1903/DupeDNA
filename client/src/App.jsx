import React, { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Results from './components/Results';
import Footer from './components/Footer';

function App() {
  const [targetProduct, setTargetProduct] = useState(null);
  const [matches, setMatches] = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'

  const runTest = async (productId) => {
    setStatus('loading');
    try {
      // We assume local dev for now on port 5000
      const res = await fetch(`http://localhost:5000/api/dupes/${productId}`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to fetch dupes');
      const data = await res.json();
      setTargetProduct(data.target);
      setMatches(data.matches);
      setStatus('success');
      
      // Smooth scroll to results
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-body">
      <Header />
      <main className="flex-grow flex flex-col">
        <Hero onRunTest={runTest} status={status} />
        {status === 'success' && (
          <div id="results-section">
            {matches.length > 0 ? (
              <Results targetProduct={targetProduct} matches={matches} />
            ) : (
              <div className="text-center py-20 text-ink font-body">
                <h3 className="text-2xl mb-4">No dupes found</h3>
                <p className="text-muted">We couldn't find any matching products in our database yet.</p>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;
