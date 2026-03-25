import { pageStyle, pageTitleStyle, bodyTextStyle, SECONDARY_COLOR } from '../styles';

export default function AboutPage() {
  return (
    <div style={{ ...pageStyle, lineHeight: 1.7 }}>
      <h1 style={pageTitleStyle}>info</h1>
      <p style={bodyTextStyle}>
        shape research is a volunteer effort to discover and catalog every possible shape.
        draw a closed shape and it will be normalized to its canonical form — an 8x8 binary
        grid, invariant under rotation and reflection.
      </p>
      <p style={bodyTextStyle}>
        the number of possible shapes is finite. every new discovery brings us closer
        to completion.
      </p>
      <p style={{ ...bodyTextStyle, color: SECONDARY_COLOR }}>
        created by nicholas maassen.
      </p>
    </div>
  );
}
