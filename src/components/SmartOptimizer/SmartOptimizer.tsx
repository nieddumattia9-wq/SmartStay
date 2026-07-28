import {
  useId,
} from "react";

import SliderTrack from "./SliderTrack";

import { sliderOptions } from "./sliderData";

import "./SmartOptimizer.css";

const MAX_INDEX =
  sliderOptions.length - 1;

const DEFAULT_INDEX =
  Math.min(2, MAX_INDEX);

export type SmartOptimizerValue = {
  selectedIndex: number;
};

type SmartOptimizerProps = {
  value?: SmartOptimizerValue;
  explanation: string;
  isReady: boolean;
  className?: string;
};

function sanitizeIndex(
  index: number
) {
  return Math.min(
    Math.max(
      Math.round(index),
      0
    ),
    MAX_INDEX
  );
}

function indexToPercent(
  index: number
) {
  if (MAX_INDEX <= 0) {
    return 0;
  }

  return (
    sanitizeIndex(index) /
    MAX_INDEX
  ) * 100;
}

function SmartOptimizer({
  value,
  explanation,
  isReady,
  className = "",
}: SmartOptimizerProps) {
  const titleId =
    useId();

  const explanationId =
    useId();

  const selectedIndex =
    sanitizeIndex(
      value?.selectedIndex ??
      DEFAULT_INDEX
    );

  const selectedOption =
    sliderOptions[selectedIndex];

  return (
    <section
      className={`smart-optimizer ${
        isReady
          ? ""
          : "smart-optimizer--waiting"
      } ${className}`.trim()}
      aria-labelledby={titleId}
      aria-describedby={explanationId}
    >
      <div className="optimizer-header">
        <div>
          <h3
            id={titleId}
            className="optimizer-title"
          >
            Your SmartStay balance
          </h3>

          <p
            id={explanationId}
            className="optimizer-explanation"
          >
            {explanation}
          </p>
        </div>
      </div>

      <div className="optimizer-labels">
        <span>
          More comfort
        </span>

        <span>
          More savings
        </span>
      </div>

      <SliderTrack
        thumbPosition={
          indexToPercent(
            selectedIndex
          )
        }
        color={
          selectedOption.color
        }
        snapCount={
          sliderOptions.length
        }
        ariaLabel={`Current SmartStay balance: ${selectedOption.title}`}
      />

      <div className="optimizer-info">
        <h2
          style={{
            color:
              selectedOption.textColor,
          }}
        >
          {selectedOption.title}
        </h2>

        <p>
          {selectedOption.description}
        </p>
      </div>
    </section>
  );
}

export default SmartOptimizer;
