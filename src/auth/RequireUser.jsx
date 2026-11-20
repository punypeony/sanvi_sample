import { Navigate, useLocation } from 'react-router';
import { useAccount } from './account';

export default function RequireUser({ children }) {
  const location = useLocation();
  const account = useAccount();
  if (account.isPending) return <p className="sr-only">Loading</p>;
  if (!account.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
