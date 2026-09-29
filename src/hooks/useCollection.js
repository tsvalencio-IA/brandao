import { useEffect, useMemo, useState } from 'react';
import { entities } from '../data/repository';

export function useCollection(entityName, options = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const key = JSON.stringify(options);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const entity = entities[entityName];
    if (!entity) {
      setError(new Error('Entidade inválida: ' + entityName));
      setLoading(false);
      return undefined;
    }
    const unsubscribe = entity.subscribe(JSON.parse(key), (rows) => {
      setData(rows);
      setLoading(false);
    }, (err) => {
      setError(err);
      setLoading(false);
    });
    return unsubscribe;
  }, [entityName, key]);

  return useMemo(() => ({ data, loading, error }), [data, loading, error]);
}
