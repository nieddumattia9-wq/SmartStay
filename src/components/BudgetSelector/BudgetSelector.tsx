import {
  Wallet,
} from "lucide-react";

import "./BudgetSelector.css";

type BudgetSelectorProps = {
  value: string;
  onChange: (
    value: string
  ) => void;
  nightCount?: number | null;
  currency?: string;
  disabled?: boolean;
};

const BUDGET_MIN = 100;
const BUDGET_MAX = 2000;
const BUDGET_STEP = 50;
const DEFAULT_SLIDER_VALUE = 1000;

function parseBudget(
  value: string
): number | null {
  const normalizedValue =
    value
      .trim()
      .replace(",", ".");

  if (!normalizedValue) {
    return null;
  }

  const numericValue =
    Number(normalizedValue);

  if (
    !Number.isFinite(numericValue) ||
    numericValue <= 0
  ) {
    return null;
  }

  return numericValue;
}

function clamp(
  value: number,
  minimum: number,
  maximum: number
) {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value
    )
  );
}

function getSliderValue(
  budget: number | null
) {
  if (budget === null) {
    return DEFAULT_SLIDER_VALUE;
  }

  const clampedBudget =
    clamp(
      budget,
      BUDGET_MIN,
      BUDGET_MAX
    );

  return Math.round(
    clampedBudget /
      BUDGET_STEP
  ) * BUDGET_STEP;
}

function formatMoney(
  amount: number,
  currency: string
) {
  try {
    return new Intl.NumberFormat(
      "en-IE",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }
    ).format(amount);
  } catch {
    return `${currency} ${Math.round(
      amount
    )}`;
  }
}

function BudgetSelector({
  value,
  onChange,
  nightCount = null,
  currency = "EUR",
  disabled = false,
}: BudgetSelectorProps) {
  const parsedBudget =
    parseBudget(value);

  const sliderValue =
    getSliderValue(
      parsedBudget
    );

  const hasBudget =
    parsedBudget !== null;

  const averagePerNight =
    parsedBudget !== null &&
    nightCount !== null &&
    nightCount > 0
      ? parsedBudget /
        nightCount
      : null;

  function handleSliderChange(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    onChange(
      event.target.value
    );
  }

  function handleInputChange(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    onChange(
      event.target.value
    );
  }

  function clearBudget() {
    onChange("");
  }

  return (
    <section
      className="budget-selector"
      aria-labelledby="budget-selector-title"
    >
      <div className="budget-selector__header">
        <div className="budget-selector__identity">
          <span className="budget-selector__icon">
            <Wallet
              size={18}
              strokeWidth={2}
            />
          </span>

          <div>
            <span
              id="budget-selector-title"
              className="budget-selector__title"
            >
              Total stay budget
            </span>

            <strong className="budget-selector__value">
              {parsedBudget !== null
                ? formatMoney(
                    parsedBudget,
                    currency
                  )
                : "Not set"}
            </strong>
          </div>
        </div>

        {hasBudget && (
          <button
            type="button"
            className="budget-selector__clear"
            disabled={disabled}
            onClick={clearBudget}
          >
            Clear
          </button>
        )}
      </div>

      <div className="budget-selector__slider">
        <input
          type="range"
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={BUDGET_STEP}
          value={sliderValue}
          disabled={disabled}
          className={
            hasBudget
              ? "budget-selector__range"
              : "budget-selector__range budget-selector__range--unset"
          }
          aria-label="Total stay budget"
          aria-valuetext={
            parsedBudget !== null
              ? formatMoney(
                  parsedBudget,
                  currency
                )
              : "Budget not set"
          }
          onChange={
            handleSliderChange
          }
        />

        <div
          className="budget-selector__scale"
          aria-hidden="true"
        >
          <span>
            {"\u20ac"}100
          </span>

          <span>
            {"\u20ac"}1,000
          </span>

          <span>
            {"\u20ac"}2,000+
          </span>
        </div>
      </div>

      <label className="budget-selector__manual">
        <span className="budget-selector__manual-label">
          Exact amount
        </span>

        <span className="budget-selector__input-wrapper">
          <span
            className="budget-selector__currency"
            aria-hidden="true"
          >
            {"\u20ac"}
          </span>

          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={value}
            disabled={disabled}
            placeholder="Enter amount"
            className="budget-selector__input"
            onChange={
              handleInputChange
            }
          />
        </span>
      </label>

      <p className="budget-selector__helper">
        {averagePerNight !== null
          ? `About ${formatMoney(
              averagePerNight,
              currency
            )} per night for ${nightCount} ${nightCount === 1
              ? "night"
              : "nights"}`
          : "You can still enter an exact amount above \u20ac2,000"}
      </p>
    </section>
  );
}

export default BudgetSelector;
