import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import "./AccountAccessControls.css";

type AccountAction =
  | "login"
  | "signup";

const ACCOUNT_DIALOG_ID =
  "smartstay-account-access-dialog";

const ACCOUNT_DIALOG_TITLE_ID =
  "smartstay-account-access-title";

const ACCOUNT_DIALOG_DESCRIPTION_ID =
  "smartstay-account-access-description";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function AccountAccessControls() {
  const [accountAction, setAccountAction] =
    useState<AccountAction | null>(null);

  const dialogRef =
    useRef<HTMLElement>(null);

  const closeButtonRef =
    useRef<HTMLButtonElement>(null);

  const openerRef =
    useRef<HTMLButtonElement | null>(null);

  const closeAccountDialog =
    useCallback(() => {
      setAccountAction(null);
    }, []);

  function openAccountDialog(
    action: AccountAction,
    opener: HTMLButtonElement
  ) {
    openerRef.current = opener;
    setAccountAction(action);
  }

  useEffect(() => {
    if (!accountAction) {
      return;
    }

    const currentDialog =
      dialogRef.current;

    if (!currentDialog) {
      return;
    }

    const dialogElement: HTMLElement =
      currentDialog;

    const previousBodyOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const focusFrame =
      window.requestAnimationFrame(() => {
        closeButtonRef.current?.focus({
          preventScroll: true,
        });
      });

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAccountDialog();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements =
        Array.from(
          dialogElement.querySelectorAll<HTMLElement>(
            FOCUSABLE_SELECTOR
          )
        ).filter((element) =>
          element.getAttribute(
            "aria-hidden"
          ) !== "true"
        );

      if (
        focusableElements.length === 0
      ) {
        event.preventDefault();
        dialogElement.focus({
          preventScroll: true,
        });
        return;
      }

      const firstElement =
        focusableElements[0];

      const lastElement =
        focusableElements[
          focusableElements.length - 1
        ];

      if (
        !dialogElement.contains(
          document.activeElement
        )
      ) {
        event.preventDefault();

        if (event.shiftKey) {
          lastElement.focus();
        } else {
          firstElement.focus();
        }

        return;
      }

      if (
        event.shiftKey &&
        document.activeElement ===
          firstElement
      ) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (
        !event.shiftKey &&
        document.activeElement ===
          lastElement
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.cancelAnimationFrame(
        focusFrame
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow =
        previousBodyOverflow;

      window.requestAnimationFrame(() => {
        openerRef.current?.focus({
          preventScroll: true,
        });
      });
    };
  }, [
    accountAction,
    closeAccountDialog,
  ]);

  const dialogTitle =
    accountAction === "signup"
      ? "SmartStay accounts are coming soon"
      : "Account access is coming soon";

  return (
    <>
      <nav
        className="navbar__nav"
        aria-label="Main navigation"
      >
        <button
          type="button"
          className="navbar__login"
          aria-haspopup="dialog"
          aria-controls={
            accountAction === "login"
              ? ACCOUNT_DIALOG_ID
              : undefined
          }
          aria-expanded={
            accountAction === "login"
          }
          onClick={(event) =>
            openAccountDialog(
              "login",
              event.currentTarget
            )
          }
        >
          Login
        </button>

        <button
          type="button"
          className="navbar__signup"
          aria-haspopup="dialog"
          aria-controls={
            accountAction === "signup"
              ? ACCOUNT_DIALOG_ID
              : undefined
          }
          aria-expanded={
            accountAction === "signup"
          }
          onClick={(event) =>
            openAccountDialog(
              "signup",
              event.currentTarget
            )
          }
        >
          Sign up
        </button>
      </nav>

      {accountAction && (
        <div
          className="account-access__overlay"
          onClick={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeAccountDialog();
            }
          }}
        >
          <section
            ref={dialogRef}
            id={ACCOUNT_DIALOG_ID}
            className="account-access__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={
              ACCOUNT_DIALOG_TITLE_ID
            }
            aria-describedby={
              ACCOUNT_DIALOG_DESCRIPTION_ID
            }
            tabIndex={-1}
          >
            <button
              ref={closeButtonRef}
              type="button"
              className="account-access__close"
              aria-label="Close account information"
              onClick={closeAccountDialog}
            >
              <X
                size={20}
                aria-hidden="true"
              />
            </button>

            <p className="account-access__eyebrow">
              Controlled beta
            </p>

            <h2
              id={ACCOUNT_DIALOG_TITLE_ID}
            >
              {dialogTitle}
            </h2>

            <p
              id={
                ACCOUNT_DIALOG_DESCRIPTION_ID
              }
            >
              Account features are being prepared
              for the controlled beta. You can already
              search, compare stays and continue to the
              booking partner without signing in.
            </p>

            <button
              type="button"
              className="account-access__continue"
              onClick={closeAccountDialog}
            >
              Continue without an account
            </button>
          </section>
        </div>
      )}
    </>
  );
}

export default AccountAccessControls;
