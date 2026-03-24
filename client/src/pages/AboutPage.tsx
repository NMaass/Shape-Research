import { pageStyle, pageTitleStyle, bodyTextStyle, SECONDARY_COLOR } from '../styles';

export default function AboutPage() {
  return (
    <div style={{ ...pageStyle, lineHeight: 1.7 }}>
      <h1 style={pageTitleStyle}>about</h1>
      <p style={bodyTextStyle}>
        shape research is a volunteer effort to discover and catalog every possible shape.
        participants draw freehand shapes which are normalized, evaluated, and checked
        against all previously discovered forms.
      </p>
      <p style={bodyTextStyle}>
        each shape is reduced to its canonical form — an 8×8 binary grid that captures
        the essential geometry, invariant under rotation and reflection. two drawings that
        produce the same canonical form are considered the same shape.
      </p>
      <p style={bodyTextStyle}>
        the number of possible shapes is finite. progress is tracked collectively.
        every new discovery brings us closer to completion.
      </p>
      <p style={{ ...bodyTextStyle, color: SECONDARY_COLOR }}>
        shape research is part of a trilogy with{' '}
        word research and number research by loby.
        created by nicholas maassen.
      </p>
    </div>
  );
}
