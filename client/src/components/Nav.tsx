import { NavLink } from 'react-router-dom';
import { SECONDARY_COLOR, SMALL_FONT } from '../styles';

const links = [
  { to: '/', label: 'draw' },
  { to: '/about', label: 'info' },
  { to: '/stats', label: 'stats' },
  { to: '/my-shapes', label: 'my shapes' },
];

export default function Nav() {
  return (
    <nav style={{
      padding: '1.25rem 1.25rem 1rem',
    }}>
      <NavLink to="/" style={{
        fontWeight: 'normal',
        textDecoration: 'none',
        fontSize: '1.125rem',
        display: 'block',
        marginBottom: '0.25rem',
      }}>
        Shape Research Inc.
      </NavLink>
      <div style={{ display: 'flex', gap: '1.25rem', fontSize: SMALL_FONT }}>
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              color: isActive ? '#222' : SECONDARY_COLOR,
              textDecoration: 'none',
            })}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
