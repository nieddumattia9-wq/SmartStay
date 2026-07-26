import {
  useMemo,
} from "react";

type SliderTrackProps = {
  thumbPosition: number;
  color: string;
  snapCount: number;
  ariaLabel: string;
};

function SliderTrack({
  thumbPosition,
  color,
  snapCount,
  ariaLabel,
}: SliderTrackProps) {
  const markPositions = useMemo(
    () =>
      Array.from(
        {
          length: snapCount,
        },
        (_, index) =>
          snapCount <= 1
            ? 0
            : (
                index /
                (
                  snapCount - 1
                )
              ) * 100
      ),
    [snapCount]
  );

  return (
    <div
      className="slider-container"
      role="img"
      aria-label={ariaLabel}
    >
      <div className="slider-track">
        <div
          className="slider-progress"
          style={{
            width:
              `${thumbPosition}%`,
            backgroundColor:
              color,
          }}
        />

        {markPositions.map(
          (position) => (
            <div
              key={position}
              className="slider-mark"
              style={{
                left:
                  `${position}%`,
              }}
            />
          )
        )}

        <div
          className="slider-thumb"
          style={{
            left:
              `${thumbPosition}%`,
            backgroundColor:
              color,
          }}
        />
      </div>
    </div>
  );
}

export default SliderTrack;
