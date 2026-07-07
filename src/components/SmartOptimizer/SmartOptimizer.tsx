import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import SliderTrack from "./SliderTrack";

import { sliderOptions } from "./sliderData";

import "./SmartOptimizer.css";

const SNAP_COUNT =
  sliderOptions.length;

const MAX_INDEX =
  SNAP_COUNT - 1;

const DEFAULT_INDEX =
  Math.min(2, MAX_INDEX);

export type SmartOptimizerValue = {

  selectedIndex: number;

};

type SmartOptimizerProps = {

  value?: SmartOptimizerValue;

  onChange?: (value: SmartOptimizerValue) => void;

  disabled?: boolean;

  className?: string;

};

function clamp(
  value: number,
  min: number,
  max: number
) {

  return Math.min(
    Math.max(value, min),
    max
  );

}

function sanitizeIndex(index: number) {

  return clamp(
    Math.round(index),
    0,
    MAX_INDEX
  );

}

function indexToPercent(index: number): number {

  if (MAX_INDEX <= 0) {

    return 0;

  }

  return (
    sanitizeIndex(index) /
    MAX_INDEX
  ) * 100;

}

function percentToIndex(percent: number): number {

  if (MAX_INDEX <= 0) {

    return 0;

  }

  return sanitizeIndex(
    (percent / 100) * MAX_INDEX
  );

}

function pointerToPercent(
  clientX: number,
  rect: DOMRect
): number {

  const ratio =
    (clientX - rect.left) / rect.width;

  return clamp(
    ratio * 100,
    0,
    100
  );

}

function SmartOptimizer({
  value,
  onChange,
  disabled = false,
  className = "",
}: SmartOptimizerProps) {

  const trackRef =
    useRef<HTMLDivElement>(null);

  const isDraggingRef =
    useRef(false);

  const [internalIndex, setInternalIndex] =
    useState(DEFAULT_INDEX);

  const selectedIndex =
    sanitizeIndex(
      value?.selectedIndex ?? internalIndex
    );

  const [thumbPosition, setThumbPosition] =
    useState(() =>
      indexToPercent(selectedIndex)
    );

  const [isDragging, setIsDragging] =
    useState(false);

  const selectedOption =
    sliderOptions[selectedIndex];

  useEffect(() => {

    if (!isDragging) {

      setThumbPosition(
        indexToPercent(selectedIndex)
      );

    }

  }, [
    isDragging,
    selectedIndex,
  ]);

  const updateValue = useCallback((
    nextIndex: number
  ) => {

    const sanitizedIndex =
      sanitizeIndex(nextIndex);

    if (!value) {

      setInternalIndex(sanitizedIndex);

    }

    onChange?.({
      selectedIndex: sanitizedIndex,
    });

  }, [
    onChange,
    value,
  ]);

  const updateThumbFromPointer = useCallback((
    clientX: number
  ) => {

    if (disabled) {

      return;

    }

    const track =
      trackRef.current;

    if (!track) {

      return;

    }

    setThumbPosition(
      pointerToPercent(
        clientX,
        track.getBoundingClientRect()
      )
    );

  }, [disabled]);

  const handlePointerDown = useCallback((
    event: ReactPointerEvent<HTMLDivElement>
  ) => {

    if (disabled) {

      return;

    }

    event.preventDefault();

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    isDraggingRef.current = true;

    setIsDragging(true);

    updateThumbFromPointer(
      event.clientX
    );

  }, [
    disabled,
    updateThumbFromPointer,
  ]);

  const handlePointerMove = useCallback((
    event: ReactPointerEvent<HTMLDivElement>
  ) => {

    if (!isDraggingRef.current) {

      return;

    }

    updateThumbFromPointer(
      event.clientX
    );

  }, [updateThumbFromPointer]);

  const endDrag = useCallback((
    event: ReactPointerEvent<HTMLDivElement>
  ) => {

    if (!isDraggingRef.current) {

      return;

    }

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {

      event.currentTarget.releasePointerCapture(
        event.pointerId
      );

    }

    isDraggingRef.current = false;

    setIsDragging(false);

    setThumbPosition((currentPosition) => {

      const nextIndex =
        percentToIndex(currentPosition);

      updateValue(nextIndex);

      return indexToPercent(nextIndex);

    });

  }, [updateValue]);

  return (

    <div
      className={`smart-optimizer ${className}`.trim()}
      aria-disabled={disabled}
    >

      <h3 className="optimizer-title">

        Optimization Preference

      </h3>

      <div className="optimizer-labels">

        <span>
          Comfort
        </span>

        <span>
          Savings
        </span>

      </div>

      <SliderTrack
       ref={trackRef}
       thumbPosition={thumbPosition}
       color={selectedOption.color}
       snapCount={SNAP_COUNT}
       isDragging={isDragging}
       disabled={disabled}
       onKeyboardStep={updateValue}
       onPointerDown={handlePointerDown}
       onPointerMove={handlePointerMove}
       onPointerUp={endDrag}
       onPointerCancel={endDrag}
      />

      <div className="optimizer-info">

        <h2
          style={{
            color: selectedOption.color,
          }}
        >

          {selectedOption.title}

        </h2>

        <p>
          {selectedOption.description}
        </p>

      </div>

    </div>

  );

}

export default SmartOptimizer;