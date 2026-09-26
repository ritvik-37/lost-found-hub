import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Lost & Found Hub` : 'Lost & Found Hub — Campus Lost & Found';
  }, [title]);
}
