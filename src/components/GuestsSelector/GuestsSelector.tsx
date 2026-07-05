import { useCallback, useEffect, useRef, useState } from "react";
import { Users } from "lucide-react";
import "./GuestsSelector.css";

function GuestsSelector() {
  const rootRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);

  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);

  const totalGuests = adults + children;

  const openSelector = () => setIsOpen(true);

  const closeSelector = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        closeSelector();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [isOpen, closeSelector]);

  return (
    <div
      ref={rootRef}
      className="guests-selector"
    >

<div
  className="guests-selector__input"
  onClick={openSelector}
>

  <div className="guests-selector__left">

    <Users size={18} strokeWidth={2} />

    <span>
      {totalGuests} Guest{totalGuests > 1 ? "s" : ""} · {rooms} Room{rooms > 1 ? "s" : ""}
    </span>

  </div>

</div>

      {isOpen && (

        <div className="guests-selector__popup">

          <div className="guest-row">

            <div>
              <h4>Adults</h4>
              <span>Ages 18+</span>
            </div>

            <div className="counter">

              <button
                onClick={() =>
                  setAdults(Math.max(1, adults - 1))
                }
              >
                −
              </button>

              <strong>{adults}</strong>

              <button
                onClick={() =>
                  setAdults(adults + 1)
                }
              >
                +
              </button>

            </div>

          </div>

          <div className="guest-row">

            <div>
              <h4>Children</h4>
              <span>Ages 0–12</span>
            </div>

            <div className="counter">

              <button
                onClick={() =>
                  setChildren(
                    Math.max(0, children - 1)
                  )
                }
              >
                −
              </button>

              <strong>{children}</strong>

              <button
                onClick={() =>
                  setChildren(children + 1)
                }
              >
                +
              </button>

            </div>

          </div>

          <div className="guest-row">

            <div>
              <h4>Rooms</h4>
            </div>

            <div className="counter">

              <button
                onClick={() =>
                  setRooms(Math.max(1, rooms - 1))
                }
              >
                −
              </button>

              <strong>{rooms}</strong>

              <button
                onClick={() =>
                  setRooms(rooms + 1)
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