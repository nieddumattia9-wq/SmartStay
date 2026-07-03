import { useCallback, useRef, useState } from "react";
import SliderTrack from "./SliderTrack";
import { sliderOptions } from "./sliderData";
import "./SmartOptimizer.css";

const SNAP_COUNT = sliderOptions.length;
const MAX_INDEX = SNAP_COUNT - 1;
const DEFAULT_INDEX = 2;

function indexToPercent(index: number): number {
  return (index / MAX_INDEX) * 100;
}

function percentToIndex(percent: number): number {
  return Math.round((percent / 100) * MAX_INDEX);
}

function pointerToPercent(clientX: number, rect: DOMRect): number {
  const ratio = (clientX - rect.left) / rect.width;
  return Math.max(0, Math.min(100, ratio * 100));
}

function SmartOptimizer() {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const [selectedIndex, setSelectedIndex] = useState(DEFAULT_INDEX);
  const [thumbPosition, setThumbPosition] = useState(() =>
    indexToPercent(DEFAULT_INDEX)
  );
  const [isDragging, setIsDragging] = useState(false);

  const selectedOption = sliderOptions[selectedIndex];

  const updateThumbFromPointer = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return;

    setThumbPosition(
      pointerToPercent(clientX, track.getBoundingClientRect())
    );
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      isDraggingRef.current = true;
      setIsDragging(true);
      updateThumbFromPointer(event.clientX);
    },
    [updateThumbFromPointer]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      updateThumbFromPointer(event.clientX);
    },
    [updateThumbFromPointer]
  );

  const endDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      isDraggingRef.current = false;
      setIsDragging(false);

      setThumbPosition((current) => {
        const index = percentToIndex(current);
        setSelectedIndex(index);
        return indexToPercent(index);
      });
    },
    []
  );

  return (
    <div className="smart-optimizer">
      <h3 className="optimizer-title">Optimization Preference</h3>

      <div className="optimizer-labels">
        <span>Comfort</span>
        <span>Savings</span>
      </div>

      <SliderTrack
        ref={trackRef}
        thumbPosition={thumbPosition}
        color={selectedOption.color}
        snapCount={SNAP_COUNT}
        isDragging={isDragging}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />

      <div className="optimizer-info">
        <h2 style={{ color: selectedOption.color }}>{selectedOption.title}</h2>
        <p>{selectedOption.description}</p>
      </div>
    </div>
  );
}

export default SmartOptimizer;