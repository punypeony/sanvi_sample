import { useEffect, useState } from 'react';
import { api } from '../api/client';
import PageReady from '../pages/PageReady';
import { ErrorText } from './ui';

export default function Audit() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    api('/api/admin/audit')
      .then((data) => {
        if (live) setEntries(data.entries);
      })
      .catch((err) => {
        if (live) setError(err.message);
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <>
      <PageReady title="Audit log — SANVI Admin" description="Recent admin actions." />
      <h1>Audit log</h1>
      <p className="admin-lead">The latest admin actions. Passwords are not written here.</p>
      <ErrorText>{error}</ErrorText>
      <ul className="admin-list">
        {(entries || []).map((entry) => (
          <li key={entry.id} className="admin-card">
            <h2>{entry.action}</h2>
            <p>{entry.target}</p>
            {(entry.before || entry.after) && (
              <p className="admin-meta">{entry.before} → {entry.after}</p>
            )}
            <p className="admin-meta">{entry.actor}</p>
          </li>
        ))}
      </ul>
      {entries && entries.length === 0 && <p>No admin actions yet.</p>}
    </>
  );
}
