import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="py-6 text-center text-slate-400 text-sm">
      <p>© {new Date().getFullYear()} GrammaViz. Powered by Google Gemini.</p>
    </footer>
  );
};