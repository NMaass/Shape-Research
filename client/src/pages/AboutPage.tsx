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
          each shape you draw is analyzed geometrically — we detect corners,
          measure the angles between edges, compare edge length ratios, and
          classify curves. freehand wobble is absorbed by quantizing angles to
          30° steps and edge ratios to 20% steps, so your messy square becomes
          a clean four-sided shape with right angles.
        </p>
        <p style={bodyTextStyle}>
          shapes are canonicalized under rotation and reflection — a triangle
          pointing up and one pointing down are the same shape. the number of
          possible shapes is finite. every new discovery brings us closer to
          completion.
        </p>
      </div>
    </div>
  );
}
