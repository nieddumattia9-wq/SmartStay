import {
    useCallback,
    useEffect,
    useRef,
    useState,
  } from "react";

  import { Users } from "lucide-react";

  import "./GuestsSelector.css";

  export type GuestsSelectorValue = {
    adults: number;
    children: number;
    childAges: Array<number | null>;
    rooms: number;
  };

  type GuestsSelectorProps = {
    value?: GuestsSelectorValue;
    onChange?: (value: GuestsSelectorValue) => void;
    disabled?: boolean;
    className?: string;
  };

  const DEFAULT_VALUE: GuestsSelectorValue = {
    adults: 2,
    children: 0,
    childAges: [],
    rooms: 1,
  };

  const MIN_ADULTS = 1;
  const MIN_CHILDREN = 0;
  const MIN_ROOMS = 1;

  const MAX_ADULTS = 10;
  const MAX_CHILDREN = 10;
  const MAX_ROOMS = 5;

  const MIN_CHILD_AGE = 0;
  const MAX_CHILD_AGE = 12;

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

  function sanitizeChildAge(
    value: number | null | undefined
  ): number | null {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(value)
    ) {
      return null;
    }

    return clamp(
      Math.round(value),
      MIN_CHILD_AGE,
      MAX_CHILD_AGE
    );
  }

  function sanitizeValue(
    value: GuestsSelectorValue
  ): GuestsSelectorValue {
    const children =
      clamp(
        value.children,
        MIN_CHILDREN,
        MAX_CHILDREN
      );

    const sourceChildAges =
      Array.isArray(value.childAges)
        ? value.childAges
        : [];

    const childAges =
      Array.from(
        {
          length: children,
        },
        (_, index) =>
          sanitizeChildAge(
            sourceChildAges[index]
          )
      );

    return {
      adults: clamp(
        value.adults,
        MIN_ADULTS,
        MAX_ADULTS
      ),

      children,

      childAges,

      rooms: clamp(
        value.rooms,
        MIN_ROOMS,
        MAX_ROOMS
      ),
    };
  }

  function GuestsSelector({
    value,
    onChange,
    disabled = false,
    className = "",
  }: GuestsSelectorProps) {
    const rootRef =
      useRef<HTMLDivElement>(null);

    const [isOpen, setIsOpen] =
      useState(false);

    const [internalValue, setInternalValue] =
      useState<GuestsSelectorValue>(
        DEFAULT_VALUE
      );

    const currentValue =
      sanitizeValue(
        value ?? internalValue
      );

    const totalGuests =
      currentValue.adults +
      currentValue.children;

    const updateValue =
      useCallback((
        nextPartialValue:
          Partial<GuestsSelectorValue>
      ) => {
        const nextValue =
          sanitizeValue({
            ...currentValue,
            ...nextPartialValue,
          });

        if (!value) {
          setInternalValue(nextValue);
        }

        onChange?.(nextValue);
      }, [
        currentValue,
        onChange,
        value,
      ]);

    const updateChildAge =
      useCallback((
        childIndex: number,
        childAge: number | null
      ) => {
        const nextChildAges =
          [...currentValue.childAges];

        nextChildAges[childIndex] =
          childAge;

        updateValue({
          childAges: nextChildAges,
        });
      }, [
        currentValue.childAges,
        updateValue,
      ]);

    const openSelector =
      useCallback(() => {
        if (disabled) {
          return;
        }

        setIsOpen(true);
      }, [disabled]);

    const closeSelector =
      useCallback(() => {
        setIsOpen(false);
      }, []);

    useEffect(() => {
      if (!isOpen) {
        return;
      }

      function handlePointerDown(
        event: MouseEvent | TouchEvent
      ) {
        const target =
          event.target as Node;

        if (
          !rootRef.current?.contains(
            target
          )
        ) {
          closeSelector();
        }
      }

      function handleKeyDown(
        event: KeyboardEvent
      ) {
        if (event.key === "Escape") {
          closeSelector();
        }
      }

      document.addEventListener(
        "mousedown",
        handlePointerDown
      );

      document.addEventListener(
        "touchstart",
        handlePointerDown
      );

      document.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () => {
        document.removeEventListener(
          "mousedown",
          handlePointerDown
        );

        document.removeEventListener(
          "touchstart",
          handlePointerDown
        );

        document.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    }, [
      closeSelector,
      isOpen,
    ]);

    return (
      <div
        ref={rootRef}
        className={
          `guests-selector ${className}`.trim()
        }
      >
        <button
          type="button"
          className="guests-selector__input"
          onClick={openSelector}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <div className="guests-selector__left">
            <Users
              size={18}
              strokeWidth={2}
            />

            <span>
              {totalGuests}{" "}
              Guest
              {totalGuests !== 1 ? "s" : ""}
              {" · "}
              {currentValue.rooms}{" "}
              Room
              {currentValue.rooms !== 1
                ? "s"
                : ""}
            </span>
          </div>
        </button>

        {isOpen && (
          <div
            className="guests-selector__popup"
            role="dialog"
            aria-label="Guests and rooms selector"
          >
            <div className="guest-row">
              <div>
                <h4>Adults</h4>

                <span>
                  Ages 18+
                </span>
              </div>

              <div className="counter">
                <button
                  type="button"
                  aria-label="Remove one adult"
                  disabled={
                    currentValue.adults <=
                    MIN_ADULTS
                  }
                  onClick={() =>
                    updateValue({
                      adults:
                        currentValue.adults - 1,
                    })
                  }
                >
                  −
                </button>

                <strong>
                  {currentValue.adults}
                </strong>

                <button
                  type="button"
                  aria-label="Add one adult"
                  disabled={
                    currentValue.adults >=
                    MAX_ADULTS
                  }
                  onClick={() =>
                    updateValue({
                      adults:
                        currentValue.adults + 1,
                    })
                  }
                >
                  +
                </button>
              </div>
            </div>

            <div className="guest-row">
              <div>
                <h4>Children</h4>

                <span>
                  Ages 0–12
                </span>
              </div>

              <div className="counter">
                <button
                  type="button"
                  aria-label="Remove one child"
                  disabled={
                    currentValue.children <=
                    MIN_CHILDREN
                  }
                  onClick={() =>
                    updateValue({
                      children:
                        currentValue.children - 1,
                    })
                  }
                >
                  −
                </button>

                <strong>
                  {currentValue.children}
                </strong>

                <button
                  type="button"
                  aria-label="Add one child"
                  disabled={
                    currentValue.children >=
                    MAX_CHILDREN
                  }
                  onClick={() =>
                    updateValue({
                      children:
                        currentValue.children + 1,
                    })
                  }
                >
                  +
                </button>
              </div>
            </div>

            {currentValue.children > 0 && (
              <div className="child-ages">
                <div className="child-ages__heading">
                  <h4>
                    Children&apos;s ages
                  </h4>

                  <span>
                    Required for accurate prices
                  </span>
                </div>

                <div className="child-ages__grid">
                  {currentValue.childAges.map((
                    childAge,
                    childIndex
                  ) => (
                    <label
                      className="child-age"
                      key={`child-age-${childIndex}`}
                    >
                      <span>
                        Child {childIndex + 1}
                      </span>

                      <select
                        value={childAge ?? ""}
                        aria-label={
                          `Age of child ${
                            childIndex + 1
                          }`
                        }
                        onChange={(event) => {
                          const selectedValue =
                            event.target.value;

                          updateChildAge(
                            childIndex,
                            selectedValue === ""
                              ? null
                              : Number(
                                  selectedValue
                                )
                          );
                        }}
                      >
                        <option value="">
                          Select age
                        </option>

                        {Array.from(
                          {
                            length:
                              MAX_CHILD_AGE -
                              MIN_CHILD_AGE +
                              1,
                          },
                          (_, offset) => {
                            const age =
                              MIN_CHILD_AGE +
                              offset;

                            return (
                              <option
                                key={age}
                                value={age}
                              >
                                {age}{" "}
                                year
                                {age === 1
                                  ? ""
                                  : "s"}
                              </option>
                            );
                          }
                        )}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="guest-row">
              <div>
                <h4>Rooms</h4>

                <span>
                  Number of rooms
                </span>
              </div>

              <div className="counter">
                <button
                  type="button"
                  aria-label="Remove one room"
                  disabled={
                    currentValue.rooms <=
                    MIN_ROOMS
                  }
                  onClick={() =>
                    updateValue({
                      rooms:
                        currentValue.rooms - 1,
                    })
                  }
                >
                  −
                </button>

                <strong>
                  {currentValue.rooms}
                </strong>

                <button
                  type="button"
                  aria-label="Add one room"
                  disabled={
                    currentValue.rooms >=
                    MAX_ROOMS
                  }
                  onClick={() =>
                    updateValue({
                      rooms:
                        currentValue.rooms + 1,
                    })
                  }
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  export default GuestsSelector;