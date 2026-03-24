import { NavLink } from 'react-router-dom';
import { BORDER_COLOR, SMALL_FONT } from '../styles';

const links = [
  { to: '/', label: 'draw' },
  { to: '/about', label: 'about' },
  { to: '/stats', label: 'stats' },
  { to: '/my-shapes', label: 'my shapes' },
];

export default function Nav() {
  return (
    <nav style={{
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      padding: '0.75rem 1.25rem',
      fontSize: SMALL_FONT,
      borderBottom: `1px solid ${BORDER_COLOR}`,
    }}>
      <NavLink to="/" style={{ fontWeight: 600, textDecoration: 'none', fontSize: '1rem' }}>
        shape research
      </NavLink>
      <div style={{ display: 'flex', gap: '1.5rem' }}>
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
      </div>
    </nav>
  );
}
