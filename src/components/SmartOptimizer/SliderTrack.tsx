import {
  forwardRef,
  useMemo,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

type SliderTrackProps = {

  thumbPosition: number;

  color: string;

  snapCount: number;

  isDragging: boolean;

  disabled?: boolean;

  onKeyboardStep?: (nextIndex: number) => void;

  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;

  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;

  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;

  onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;

};

function getCurrentIndex(
  thumbPosition: number,
  snapCount: number
) {

  if (snapCount <= 1) {

    return 0;

  }

  return Math.round(
    (thumbPosition / 100) * (snapCount - 1)
  );

}

function clampIndex(
  index: number,
  snapCount: number
) {

  return Math.min(
    Math.max(index, 0),
    Math.max(snapCount - 1, 0)
  );

}

const SliderTrack =
  forwardRef<HTMLDivElement, SliderTrackProps>(
    function SliderTrack(
      {
        thumbPosition,
        color,
        snapCount,
        isDragging,
        disabled = false,
        onKeyboardStep,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel,
      },
      ref
    ) {

      const currentIndex =
        getCurrentIndex(
          thumbPosition,
          snapCount
        );

      const markPositions = useMemo(
        () =>
          Array.from(
            {
              length: snapCount,
            },
            (_, index) =>
              snapCount <= 1
                ? 0
                : (index / (snapCount - 1)) * 100
          ),
        [snapCount]
      );

      function handleKeyDown(
        event: KeyboardEvent<HTMLDivElement>
      ) {

        if (disabled) {

          return;

        }

        let nextIndex: number;

        switch (event.key) {

          case "ArrowRight":
          case "ArrowUp":

            event.preventDefault();

            nextIndex =
              currentIndex + 1;

            break;

          case "ArrowLeft":
          case "ArrowDown":

            event.preventDefault();

            nextIndex =
              currentIndex - 1;

            break;

          case "Home":

            event.preventDefault();

            nextIndex = 0;

            break;

          case "End":

            event.preventDefault();

            nextIndex =
              snapCount - 1;

            break;

          default:

            return;

        }

        onKeyboardStep?.(
          clampIndex(
            nextIndex,
            snapCount
          )
        );

      }

      return (

        <div className="slider-container">

          <div
            ref={ref}
            className={`slider-track${
              isDragging
                ? " slider-track--dragging"
                : ""
            }${
              disabled
                ? " slider-track--disabled"
                : ""
            }`}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-valuemin={0}
            aria-valuemax={Math.max(snapCount - 1, 0)}
            aria-valuenow={currentIndex}
            aria-disabled={disabled}
            aria-label="Optimization mode"
            onKeyDown={handleKeyDown}
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
                style={{
                  left: `${position}%`,
                }}
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