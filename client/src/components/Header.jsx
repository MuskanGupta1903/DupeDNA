import React, { useEffect, useState } from 'react';

function Header() {
  const [sampleNo, setSampleNo] = useState('');

  useEffect(() => {
    // Generate random 4 digit sample number on mount
    setSampleNo(Math.floor(1000 + Math.random() * 9000).toString());
  }, []);

  return (
    <header className="border-b-2 border-ink py-4 px-6 flex justify-between items-center bg-paper">
      <h1 className="font-body font-bold tracking-widest text-lg">DUPEDNA LABS</h1>
      <span className="font-mono text-muted text-sm tracking-wider">SAMPLE NO. {sampleNo}</span>
    </header>
  );
}

export default Header;
