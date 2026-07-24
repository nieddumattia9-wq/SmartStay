import {
  Link,
} from "react-router-dom";

import "./BetaFooter.css";

function BetaFooter() {
  return (
    <footer className="beta-footer">
      <div className="beta-footer__content">
        <p className="beta-footer__notice">
          Private controlled beta. Please do not share this link publicly.
        </p>

        <nav
          className="beta-footer__links"
          aria-label="Beta information"
        >
          <Link to="/privacy">
            Privacy
          </Link>

          <Link to="/feedback">
            Send feedback
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export default BetaFooter;
