import { MapPin } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { searchDestinations } from "../../services/api";

import type {
  Destination,
  SearchDestinationsResponse,
} from "../../types/destination";

import { useDebounce } from "./useDebounce";

import "./DestinationAutocomplete.css";

function highlightMatch(
  text: string,
  query: string
): ReactNode {

  const normalizedQuery =
    query.trim();

  if (!normalizedQuery) {

    return text;

  }

  const lowerText =
    text.toLowerCase();

  const lowerQuery =
    normalizedQuery.toLowerCase();

  const matchIndex =
    lowerText.indexOf(lowerQuery);

  if (matchIndex === -1) {

    return text;

  }

  const before =
    text.slice(0, matchIndex);

  const match =
    text.slice(
      matchIndex,
      matchIndex + normalizedQuery.length
    );

  const after =
    text.slice(
      matchIndex + normalizedQuery.length
    );

  return (

    <>

      {before}

      <mark className="destination-autocomplete__mark">

        {match}

      </mark>

      {after}

    </>

  );

}

export type DestinationAutocompleteProps = {

  value: string;

  onChange: (value: string) => void;

  onSelect?: (destination: Destination) => void;

  onClearSelection?: () => void;

  placeholder?: string;

  id?: string;

  name?: string;

  disabled?: boolean;

  className?: string;

};

export function cleanDestinationCountry(
  country: string
) {
  return country
    .replace(
      /,\s*[A-Z]{2}$/i,
      ""
    )
    .trim();
}

function DestinationAutocomplete({
  value,
  onChange,
  onSelect,
  onClearSelection,
  placeholder = "Search destination...",
  id,
  name,
  disabled = false,
  className = "",
}: DestinationAutocompleteProps) {

  const generatedId =
    useId();

  const inputId =
    id ?? generatedId;

  const listboxId =
    `${inputId}-listbox`;

  const rootRef =
    useRef<HTMLDivElement>(null);

  const inputRef =
    useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] =
    useState(false);

  const [activeIndex, setActiveIndex] =
    useState(-1);

  const [loading, setLoading] =
    useState(false);

  const [suggestions, setSuggestions] =
    useState<Destination[]>([]);

  const selectedDestinationLabelRef =
    useRef<string | null>(
      null
    );

  const debouncedQuery =
    useDebounce(value, 300);

  const closeDropdown = useCallback(() => {

    setIsOpen(false);

    setActiveIndex(-1);

  }, []);

  const selectDestination = useCallback((
    destination: Destination
  ) => {

    const countryLabel =
      cleanDestinationCountry(
        destination.country
      );

    const label =
      countryLabel
        ? `${destination.name}, ${countryLabel}`
        : destination.name;

    selectedDestinationLabelRef.current =
      label;

    setSuggestions([]);
    setLoading(false);

    onChange(label);

    onSelect?.(destination);

    closeDropdown();

    inputRef.current?.focus();

  }, [
    closeDropdown,
    onChange,
    onSelect,
  ]);

  useEffect(() => {

    let isRequestActive = true;

    async function loadDestinations() {

      const query =
        debouncedQuery.trim();

      if (
        selectedDestinationLabelRef.current ===
        query
      ) {
        setSuggestions([]);
        setLoading(false);
        closeDropdown();

        return;
      }

      if (query.length < 2) {

        setSuggestions([]);

        setLoading(false);

        return;

      }

      try {

        setLoading(true);

        const response =
          await searchDestinations(
            query
          ) as SearchDestinationsResponse;

        if (!isRequestActive) {

          return;

        }

        if (!response.success) {

          setSuggestions([]);

          setIsOpen(false);

          return;

        }

        setSuggestions(
          response.destinations ?? []
        );

        setIsOpen(
          (response.destinations ?? []).length > 0
        );

      } catch (error) {

        if (!isRequestActive) {

          return;

        }

        console.error(error);

        setSuggestions([]);

        setIsOpen(false);

      } finally {

        if (isRequestActive) {

          setLoading(false);

        }

      }

    }

    loadDestinations();

    return () => {

      isRequestActive = false;

    };

  }, [debouncedQuery]);

  useEffect(() => {

    if (!isOpen) {

      return;

    }

    function handlePointerDown(
      event: MouseEvent | TouchEvent
    ) {

      const target =
        event.target as Node;

      if (!rootRef.current?.contains(target)) {

        closeDropdown();

      }

    }

    function handleKeyDown(
      event: globalThis.KeyboardEvent
    ) {

      if (event.key === "Escape") {

        closeDropdown();

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
    closeDropdown,
    isOpen,
  ]);

  useEffect(() => {

    if (value.trim().length === 0) {
      selectedDestinationLabelRef.current =
        null;

      setSuggestions([]);

      closeDropdown();

    }

  }, [
    closeDropdown,
    value,
  ]);

  useEffect(() => {

    setActiveIndex(
      suggestions.length > 0
        ? 0
        : -1
    );

  }, [suggestions]);

  function openDropdown() {

    if (disabled) {

      return;

    }

    if (suggestions.length > 0) {

      setIsOpen(true);

    }

  }

  function handleInputChange(
    nextValue: string
  ) {
    selectedDestinationLabelRef.current =
      null;

    setSuggestions([]);

    onChange(nextValue);
    onClearSelection?.();

    if (nextValue.trim().length > 0) {
      setIsOpen(true);
    } else {
      closeDropdown();
    }
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>
  ) {

    if (
      !isOpen &&
      event.key !== "ArrowDown"
    ) {

      return;

    }

    switch (event.key) {

      case "ArrowDown":

        event.preventDefault();

        if (!isOpen && suggestions.length > 0) {

          setIsOpen(true);

        }

        setActiveIndex((current) =>
          Math.min(
            current + 1,
            suggestions.length - 1
          )
        );

        break;

      case "ArrowUp":

        event.preventDefault();

        setActiveIndex((current) =>
          Math.max(current - 1, 0)
        );

        break;

      case "Enter":

        if (
          activeIndex >= 0 &&
          suggestions[activeIndex]
        ) {

          event.preventDefault();

          selectDestination(
            suggestions[activeIndex]
          );

        }

        break;

      case "Escape":

        event.preventDefault();

        closeDropdown();

        break;

      default:

        break;

    }

  }

  const showDropdown =
    isOpen &&
    suggestions.length > 0 &&
    !disabled &&
    selectedDestinationLabelRef.current ===
      null;

  return (

    <div
      ref={rootRef}
      className={`destination-autocomplete ${className}`.trim()}
    >

      <div className="destination-autocomplete__input-wrapper">

        <MapPin
          size={18}
          strokeWidth={2}
          className="destination-autocomplete__icon"
        />

        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          className="destination-autocomplete__input"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={
            showDropdown
              ? listboxId
              : undefined
          }
          aria-autocomplete="list"
          aria-activedescendant={
            showDropdown && activeIndex >= 0
              ? `${inputId}-option-${activeIndex}`
              : undefined
          }
          onChange={(event) =>
            handleInputChange(event.target.value)
          }
          onFocus={openDropdown}
          onKeyDown={handleKeyDown}
        />

      </div>

      {loading && (

        <div className="destination-autocomplete__loading">

          Searching destinations...

        </div>

      )}

      {showDropdown && (

        <ul
          id={listboxId}
          className="destination-autocomplete__dropdown"
          role="listbox"
          aria-label="Destination suggestions"
        >

          {suggestions.map((destination, index) => {

            const isActive =
              index === activeIndex;

            return (

              <li
                key={destination.id}
                id={`${inputId}-option-${index}`}
                role="option"
                aria-selected={isActive}
                className={`destination-autocomplete__option${
                  isActive
                    ? " destination-autocomplete__option--active"
                    : ""
                }`}
                onMouseEnter={() =>
                  setActiveIndex(index)
                }
                onMouseDown={(event) =>
                  event.preventDefault()
                }
                onClick={() =>
                  selectDestination(destination)
                }
              >

                <span className="destination-autocomplete__city">

                  {highlightMatch(
                    destination.name,
                    debouncedQuery
                  )}

                </span>

                <span className="destination-autocomplete__country">

                  {highlightMatch(
  cleanDestinationCountry(
    destination.country
  ),
  debouncedQuery
)}

                </span>

              </li>

            );

          })}

        </ul>

      )}

    </div>

  );

}

export default DestinationAutocomplete;