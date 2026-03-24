import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'draw' },
  { to: '/about', label: 'about' },
  { to: '/stats', label: 'stats' },
  { to: '/leaderboard', label: 'leaderboard' },
  { to: '/my-shapes', label: 'my shapes' },
];

export default function Nav() {
  return (
    <nav style={{
      display: 'flex',
      gap: '1.5rem',
      padding: '0.75rem 1.25rem',
      fontSize: '0.875rem',
      borderBottom: '1px solid #eee',
    }}>
      {links.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }) => ({
            textDecoration: isActive ? 'underline' : 'none',
          })}
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
