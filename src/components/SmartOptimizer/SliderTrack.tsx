import { forwardRef, useMemo } from "react";

type SliderTrackProps = {
  thumbPosition: number;
  color: string;
  snapCount: number;
  isDragging: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => void;
};

const SliderTrack = forwardRef<HTMLDivElement, SliderTrackProps>(
  function SliderTrack(
    {
      thumbPosition,
      color,
      snapCount,
      isDragging,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
    ref
  ) {
    const markPositions = useMemo(
      () =>
        Array.from({ length: snapCount }, (_, index) =>
          snapCount <= 1 ? 0 : (index / (snapCount - 1)) * 100
        ),
      [snapCount]
    );

    return (
      <div className="slider-container">
        <div
          ref={ref}
          className={`slider-track${isDragging ? " slider-track--dragging" : ""}`}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={snapCount - 1}
          aria-valuenow={Math.round((thumbPosition / 100) * (snapCount - 1))}
          aria-label="Optimization mode"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <div
            className="slider-progress"
            style={{
              width: `${thumbPosition}%`,
              backgroundColor: color,
            }}
          />

          {markPositions.map((position) => (
            <div
              key={position}
              className="slider-mark"
              style={{ left: `${position}%` }}
            />
          ))}

          <div
            className="slider-thumb"
            style={{
              left: `${thumbPosition}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
    );
  }
);

export default SliderTrack;