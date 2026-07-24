import {
  useMemo,
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import "./BetaFeedback.css";

const STAGES = [
  "Understanding the home page",
  "Starting a search",
  "Waiting for results",
  "Comparing recommendations",
  "Opening hotel details",
  "Rechecking an offer",
  "Opening the booking handoff",
  "Something else",
] as const;

function BetaFeedback() {
  const [
    usefulness,
    setUsefulness,
  ] = useState("3");

  const [
    clarity,
    setClarity,
  ] = useState("3");

  const [
    stage,
    setStage,
  ] = useState<
    typeof STAGES[number]
  >(STAGES[0]);

  const [
    comment,
    setComment,
  ] = useState("");

  const [
    copyStatus,
    setCopyStatus,
  ] = useState("");

  const summary =
    useMemo(
      () => [
        "SmartStay controlled-beta feedback",
        `Usefulness (1-5): ${usefulness}`,
        `Clarity (1-5): ${clarity}`,
        `Stage: ${stage}`,
        "Comment:",
        comment.trim() ||
          "No additional comment.",
      ].join("\n"),
      [
        usefulness,
        clarity,
        stage,
        comment,
      ]
    );

  async function handleCopy(
    event: FormEvent
  ) {
    event.preventDefault();
    setCopyStatus("");

    try {
      await navigator.clipboard.writeText(
        summary
      );

      setCopyStatus(
        "Feedback copied. Send it through the same private channel used for your invitation."
      );
    } catch {
      setCopyStatus(
        "Copy was blocked by the browser. Select the summary below and copy it manually."
      );
    }
  }

  return (
    <section
      className="beta-information-page"
      aria-labelledby="feedback-title"
    >
      <div className="beta-information-page__card">
        <p className="beta-information-page__eyebrow">
          Controlled beta
        </p>

        <h1 id="feedback-title">
          Help us improve SmartStay
        </h1>

        <p>
          This form stays in your browser. SmartStay does not submit the text
          automatically. Copy the summary and return it through the same
          private channel used for your beta invitation.
        </p>

        <form
          className="beta-feedback-form"
          onSubmit={handleCopy}
        >
          <label>
            Overall usefulness
            <select
              value={usefulness}
              onChange={(event) =>
                setUsefulness(
                  event.target.value
                )
              }
            >
              <option value="1">1 - Not useful</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5 - Very useful</option>
            </select>
          </label>

          <label>
            Clarity of the recommendations
            <select
              value={clarity}
              onChange={(event) =>
                setClarity(
                  event.target.value
                )
              }
            >
              <option value="1">1 - Unclear</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5 - Very clear</option>
            </select>
          </label>

          <label>
            Where did you need help?
            <select
              value={stage}
              onChange={(event) =>
                setStage(
                  event.target.value as
                    typeof STAGES[number]
                )
              }
            >
              {STAGES.map(
                (option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            What should we improve?
            <textarea
              value={comment}
              maxLength={1200}
              rows={7}
              placeholder="Avoid names, email addresses, booking details or other sensitive information."
              onChange={(event) =>
                setComment(
                  event.target.value
                )
              }
            />
          </label>

          <button type="submit">
            Copy feedback summary
          </button>

          <label>
            Feedback summary
            <textarea
              className="beta-feedback-form__summary"
              readOnly
              rows={8}
              value={summary}
            />
          </label>

          <p
            className="beta-feedback-form__status"
            aria-live="polite"
          >
            {copyStatus}
          </p>
        </form>
      </div>
    </section>
  );
}

export default BetaFeedback;
