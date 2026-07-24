import "./Privacy.css";

function Privacy() {
  return (
    <section
      className="beta-information-page"
      aria-labelledby="privacy-title"
    >
      <div className="beta-information-page__card">
        <p className="beta-information-page__eyebrow">
          Controlled beta
        </p>

        <h1 id="privacy-title">
          Privacy notice for invited testers
        </h1>

        <p>
          SmartStay is currently available as a private, controlled beta.
          Please do not share the staging link publicly.
        </p>

        <h2>Search and booking data</h2>

        <p>
          Your destination, dates, budget, party details and selected offers
          are processed only to perform the accommodation search, recheck and
          booking handoff. SmartStay does not collect payment-card details.
          A partner checkout has its own privacy terms.
        </p>

        <h2>First-party beta analytics</h2>

        <p>
          SmartStay may collect small, bucketed product events to understand
          whether searches complete, which recommendation roles are useful and
          where testers encounter problems. Analytics contain no destination,
          exact dates, exact budget, hotel name, hotel ID, booking ID, provider
          ID, email, phone number or full URL.
        </p>

        <ul>
          <li>No analytics cookies are used.</li>
          <li>No persistent cross-session analytics identifier is used.</li>
          <li>
            Tab-scoped analytics state uses sessionStorage and expires.
          </li>
          <li>
            Do Not Track and Global Privacy Control disable collection.
          </li>
        </ul>

        <h2>Retention and storage limits</h2>

        <p>
          Raw analytics are retained for at most 30 days and aggregate metrics
          for at most 180 days. The current beta store is held in memory on one
          backend instance, so data can be lost earlier after a restart or
          deploy.
        </p>

        <h2>Feedback and privacy requests</h2>

        <p>
          Do not include sensitive personal information in beta feedback. To
          ask a privacy question, object to analytics or request deletion, use
          the same private channel through which you received the beta
          invitation.
        </p>

        <h2>Beta-only notice</h2>

        <p>
          This concise notice is for the controlled beta and is not the final
          public legal policy. SmartStay will complete verified controller
          details and professional legal review before broader public traffic.
        </p>
      </div>
    </section>
  );
}

export default Privacy;
