import {
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
    type ReactNode,
  } from "react";
function highlightMatch(text: string, query: string): ReactNode {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = normalizedQuery.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);

  if (matchIndex === -1) return text;

  const before = text.slice(0, matchIndex);
  const match = text.slice(matchIndex, matchIndex + normalizedQuery.length);
  const after = text.slice(matchIndex + normalizedQuery.length);

  return (
    <>
      {before}
      <mark className="destination-autocomplete__mark">{match}</mark>
      {after}
    </>
  );
}
  import {
    filterCities,
    formatCityLabel,
    type City,
  } from "./cities";
  import { useDebounce } from "./useDebounce";
  import "./DestinationAutocomplete.css";
  
  export type { City };
  
  export type DestinationAutocompleteProps = {
    value: string;
    onChange: (value: string) => void;
    onSelect?: (city: City) => void;
    placeholder?: string;
    id?: string;
    name?: string;
    disabled?: boolean;
    className?: string;
  };
  
  export function DestinationAutocomplete({
    value,
    onChange,
    onSelect,
    placeholder = "Search destination...",
    id,
    name,
    disabled = false,
    className = "",
  }: DestinationAutocompleteProps) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const listboxId = `${inputId}-listbox`;
  
    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
  
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
  
    const debouncedQuery = useDebounce(value, 300);
  
    const suggestions = useMemo(
      () => filterCities(debouncedQuery).slice(0, 8),
      [debouncedQuery]
    );
  
    const closeDropdown = useCallback(() => {
      setIsOpen(false);
      setActiveIndex(-1);
    }, []);
  
    const selectCity = useCallback(
      (city: City) => {
        const label = formatCityLabel(city);
        onChange(label);
        onSelect?.(city);
        closeDropdown();
        inputRef.current?.focus();
      },
      [closeDropdown, onChange, onSelect]
    );
  
    useEffect(() => {
      if (!isOpen) return;
  
      const handlePointerDown = (event: MouseEvent | TouchEvent) => {
        const target = event.target as Node;
        if (!rootRef.current?.contains(target)) {
          closeDropdown();
        }
      };
  
      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("touchstart", handlePointerDown);
  
      return () => {
        document.removeEventListener("mousedown", handlePointerDown);
        document.removeEventListener("touchstart", handlePointerDown);
      };
    }, [closeDropdown, isOpen]);
  
    useEffect(() => {
      if (value.trim().length === 0) {
        closeDropdown();
      }
    }, [closeDropdown, value]);
  
    useEffect(() => {
      setActiveIndex(suggestions.length > 0 ? 0 : -1);
    }, [suggestions]);
  
    const openDropdown = () => {
      if (disabled || value.trim().length === 0) return;
      if (suggestions.length > 0) {
        setIsOpen(true);
      }
    };
  
    const handleInputChange = (nextValue: string) => {
      onChange(nextValue);
      if (nextValue.trim().length > 0) {
        setIsOpen(true);
      } else {
        closeDropdown();
      }
    };
  
    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen && event.key !== "ArrowDown") return;
  
      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault();
          if (!isOpen && suggestions.length > 0) {
            setIsOpen(true);
            setActiveIndex(0);
            return;
          }
          setActiveIndex((current) =>
            suggestions.length === 0
              ? -1
              : Math.min(current + 1, suggestions.length - 1)
          );
          break;
        }
        case "ArrowUp": {
          event.preventDefault();
          setActiveIndex((current) =>
            suggestions.length === 0 ? -1 : Math.max(current - 1, 0)
          );
          break;
        }
        case "Enter": {
          if (!isOpen || activeIndex < 0 || !suggestions[activeIndex]) return;
          event.preventDefault();
          selectCity(suggestions[activeIndex]);
          break;
        }
        case "Escape": {
          event.preventDefault();
          closeDropdown();
          break;
        }
        default:
          break;
      }
    };
  
    const showDropdown = isOpen && suggestions.length > 0 && !disabled;
  
    return (
      <div
        ref={rootRef}
        className={`destination-autocomplete ${className}`.trim()}
      >
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
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            showDropdown && activeIndex >= 0
              ? `${inputId}-option-${activeIndex}`
              : undefined
          }
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={openDropdown}
          onKeyDown={handleKeyDown}
        />
  
        {showDropdown && (
          <ul
            id={listboxId}
            className="destination-autocomplete__dropdown"
            role="listbox"
            aria-label="Destination suggestions"
          >
            {suggestions.map((city, index) => {
              const isActive = index === activeIndex;
  
              return (
                <li
                  key={city.id}
                  id={`${inputId}-option-${index}`}
                  role="option"
                  aria-selected={isActive}
                  className={`destination-autocomplete__option${
                    isActive ? " destination-autocomplete__option--active" : ""
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectCity(city)}
                >
                <span className="destination-autocomplete__city">
  {highlightMatch(city.name, debouncedQuery)}
</span>
<span className="destination-autocomplete__country">
  {highlightMatch(city.country, debouncedQuery)}
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