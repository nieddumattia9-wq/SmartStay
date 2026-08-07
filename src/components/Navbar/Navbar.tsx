import { Link } from "react-router";

import AccountAccessControls from "../AccountAccessControls/AccountAccessControls";

import "./Navbar.css";

function Navbar() {

  return (

    <header className="navbar">

      <Link
        to="/"
        className="navbar__logo"
        aria-label="StayOpti home"
      >

        <img
          src="/brand/stayopti-mark.svg"
          className="navbar__brand-mark"
          alt=""
          aria-hidden="true"
          width="40"
          height="40"
        />

        <span className="navbar__brand-name">

          StayOpti

        </span>

      </Link>

      <AccountAccessControls />

    </header>

  );

}

export default Navbar;
