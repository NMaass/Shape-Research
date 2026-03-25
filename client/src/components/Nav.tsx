import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'draw' },
  { to: '/about', label: 'info' },
  { to: '/stats', label: 'stats' },
  { to: '/my-shapes', label: 'my shapes' },
];

export default function Nav() {
  return (
    <header style={{ padding: '40px 0 24px' }}>
      <NavLink to="/" style={{
        fontWeight: 400,
        textDecoration: 'none',
        fontSize: '0.875rem',
        letterSpacing: '0.05em',
        display: 'block',
      }}>
        Shape Research Inc.
      </NavLink>
      <nav style={{
        display: 'flex',
        gap: '24px',
        marginTop: '8px',
        fontSize: '0.75rem',
        color: 'var(--color-muted)',
      }}>
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              color: isActive ? 'var(--color-text)' : 'var(--color-muted)',
              textDecoration: 'none',
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
