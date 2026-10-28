try { await import('./finish-deck.mjs'); }
catch(e) { console.error(String(e.stack).slice(0,6000)); process.exitCode=2; }
