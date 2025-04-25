'use client';

import { useEffect } from 'react';

export default function ClientBoundary({ children }) {
  useEffect(() => {
    // Remove ColorZilla’s cz-shortcut-listen attr to avoid hydration errors
    document.body.removeAttribute('cz-shortcut-listen');
  }, []);

  return children;
}
