import { Link } from "react-router";

import AccountAccessControls from "../AccountAccessControls/AccountAccessControls";

import "./Navbar.css";

function Navbar() {

  return (

    <header className="navbar">

      <Link
        to="/"
        className="navbar__logo"
        aria-label="SmartStay home"
      >

        SmartStay

      </Link>

      <AccountAccessControls />

    </header>

  );

}

export default Navbar;