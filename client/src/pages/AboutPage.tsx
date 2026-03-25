import { pageStyle, bodyTextStyle } from '../styles';

export default function AboutPage() {
  return (
    <div style={pageStyle}>
      <div>
        <p style={bodyTextStyle}>
          at shape research inc., we are attempting to discover and catalog
          every possible shape.
        </p>
        <p style={bodyTextStyle}>
          this is a volunteer-led research position, where anyone is able to
          contribute. simply draw a closed shape, and we'll check if we've got
          it. if we have, no worries, just try another. if it's a new shape,
          thank you for your hard work!
        </p>
        <p style={bodyTextStyle}>
          each shape you draw is resampled, normalized to a unit square,
          rasterized onto an 8×8 binary grid, then smoothed using a
          low-frequency discrete cosine transform to absorb the natural wobble
          of freehand drawing. finally, the grid is canonicalized under the
          8-fold dihedral symmetry group (rotations and reflections) so that the
          same shape drawn at any angle or mirrored is recognized as identical.
        </p>
        <p style={bodyTextStyle}>
          the number of possible shapes is finite — we estimate roughly 148
          million distinct canonical forms. every new discovery brings us closer
          to completion.
        </p>
      </div>
    </div>
  );
}
