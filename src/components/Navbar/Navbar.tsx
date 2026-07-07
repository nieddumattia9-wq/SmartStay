import { Link } from "react-router-dom";

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

      <nav
        className="navbar__nav"
        aria-label="Main navigation"
      >

        <button
          type="button"
          className="navbar__login"
        >

          Login

        </button>

        <button
          type="button"
          className="navbar__signup"
        >

          Sign up

        </button>

      </nav>

    </header>

  );

}

export default Navbar;