import { useCallback, useEffect, useState } from 'react';
import { entities } from '../data/repository';

export function useEntity(entityName, id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!id) { setData(null); setLoading(false); return; }
    try {
      setLoading(true);
      setData(await entities[entityName].get(id));
      setError(null);
    } catch (e) { setError(e); }
    finally { setLoading(false); }
  }, [entityName, id]);

  useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload };
}
