import { useState, useEffect, useCallback } from 'react';
import { Query, DocumentData, QuerySnapshot, startAfter, limit, getDocs, query } from 'firebase/firestore';

interface PaginationOptions {
  pageSize?: number;
  initialLoad?: boolean;
}

interface PaginationResult<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePagination<T>(
  baseQuery: Query<DocumentData>,
  transform: (doc: DocumentData) => T,
  options: PaginationOptions = {}
): PaginationResult<T> {
  const {
    pageSize = 10,
    initialLoad = true
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(initialLoad);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentData | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadItems = useCallback(async (isInitial: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      let constraints = [];
      if (!isInitial && lastDoc) {
        constraints.push(startAfter(lastDoc));
      }
      constraints.push(limit(pageSize));

      const currentQuery = query(baseQuery, ...constraints);
      const snapshot = await getDocs(currentQuery);
      const newItems = snapshot.docs.map(doc => transform(doc.data()));
      
      if (isInitial) {
        setItems(newItems);
      } else {
        setItems(prev => [...prev, ...newItems]);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageSize);
    } catch (err) {
      console.error('載入資料時發生錯誤:', err);
      setError('載入資料時發生錯誤');
    } finally {
      setLoading(false);
    }
  }, [baseQuery, transform, pageSize, lastDoc]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await loadItems(false);
  }, [hasMore, loading, loadItems]);

  const refresh = useCallback(async () => {
    setLastDoc(null);
    setHasMore(true);
    await loadItems(true);
  }, [loadItems]);

  useEffect(() => {
    if (initialLoad) {
      loadItems(true);
    }
  }, [initialLoad, loadItems]);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  };
} 