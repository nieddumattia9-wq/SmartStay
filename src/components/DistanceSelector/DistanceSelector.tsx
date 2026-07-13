import {
  MapPin,
} from "lucide-react";

import "./DistanceSelector.css";

export type DistanceSelectorValue =
  number | null;

type DistanceSelectorProps = {
  value: DistanceSelectorValue;
  onChange: (
    value: DistanceSelectorValue
  ) => void;
  disabled?: boolean;
};

type DistanceOption = {
  value: DistanceSelectorValue;
  label: string;
  shortLabel: string;
};

const DISTANCE_OPTIONS:
  DistanceOption[] = [
    {
      value: 0.5,
      label: "500 m",
      shortLabel: "500 m",
    },
    {
      value: 1,
      label: "1 km",
      shortLabel: "1",
    },
    {
      value: 2,
      label: "2 km",
      shortLabel: "2",
    },
    {
      value: 5,
      label: "5 km",
      shortLabel: "5",
    },
    {
      value: 10,
      label: "10 km",
      shortLabel: "10",
    },
    {
      value: null,
      label: "Any distance",
      shortLabel: "Any",
    },
  ];

function getSelectedIndex(
  value: DistanceSelectorValue
) {
  const selectedIndex =
    DISTANCE_OPTIONS.findIndex(
      (option) =>
        option.value === value
    );

  return selectedIndex >= 0
    ? selectedIndex
    : DISTANCE_OPTIONS.length - 1;
}

function DistanceSelector({
  value,
  onChange,
  disabled = false,
}: DistanceSelectorProps) {
  const selectedIndex =
    getSelectedIndex(value);

  const selectedOption =
    DISTANCE_OPTIONS[
      selectedIndex
    ];

  function handleChange(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const nextIndex =
      Number(event.target.value);

    const nextOption =
      DISTANCE_OPTIONS[
        nextIndex
      ];

    if (!nextOption) {
      return;
    }

    onChange(
      nextOption.value
    );
  }

  return (
    <section
      className="distance-selector"
      aria-labelledby="distance-selector-title"
    >
      <div className="distance-selector__header">
        <div className="distance-selector__identity">
          <span className="distance-selector__icon">
            <MapPin
              size={18}
              strokeWidth={2}
            />
          </span>

          <div>
            <span
              id="distance-selector-title"
              className="distance-selector__title"
            >
              Maximum distance
            </span>

            <strong className="distance-selector__value">
              {selectedOption.label}
            </strong>
          </div>
        </div>
      </div>

      <input
        type="range"
        min="0"
        max={
          DISTANCE_OPTIONS.length -
          1
        }
        step="1"
        value={selectedIndex}
        disabled={disabled}
        className="distance-selector__range"
        aria-label="Maximum distance from destination"
        aria-valuetext={
          selectedOption.label
        }
        onChange={handleChange}
      />

      <div
        className="distance-selector__labels"
        aria-hidden="true"
      >
        {DISTANCE_OPTIONS.map(
          (option) => (
            <span
              key={
                option.value ??
                "any"
              }
            >
              {option.shortLabel}
            </span>
          )
        )}
      </div>

      <p className="distance-selector__helper">
        From the selected destination
      </p>
    </section>
  );
}

export default DistanceSelector;
