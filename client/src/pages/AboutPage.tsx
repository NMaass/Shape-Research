export default function AboutPage() {
  return (
    <div style={{
      maxWidth: '480px',
      margin: '2rem auto',
      padding: '0 1.25rem',
      lineHeight: 1.7,
      fontSize: '0.875rem',
    }}>
      <h1 style={{ fontSize: '1rem', fontWeight: 'normal', marginBottom: '1.5rem' }}>
        about shape research
      </h1>
      <p style={{ marginBottom: '1rem' }}>
        shape research is a volunteer effort to discover and catalog every possible shape.
        participants draw freehand shapes which are normalized, evaluated, and checked
        against all previously discovered forms.
      </p>
      <p style={{ marginBottom: '1rem' }}>
        each shape is reduced to its canonical form — an 8×8 binary grid that captures
        the essential geometry, invariant under rotation and reflection. two drawings that
        produce the same canonical form are considered the same shape.
      </p>
      <p style={{ marginBottom: '1rem' }}>
        the number of possible shapes is finite. progress is tracked collectively.
        every new discovery brings us closer to completion.
      </p>
      <p style={{ marginBottom: '1rem', color: '#888' }}>
        shape research is part of a trilogy with{' '}
        word research and number research by loby.
        created by nicholas maassen.
      </p>
    </div>
  );
}
