export function Banner({ children }) {
  if (!children) return null;
  return <p className="admin-banner" role="status">{children}</p>;
}

export function ErrorText({ children }) {
  if (!children) return null;
  return <p className="admin-error" role="alert">{children}</p>;
}
