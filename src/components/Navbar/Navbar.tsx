import "./Navbar.css";

function Navbar() {
  return (
    <header className="navbar">

      <div className="logo">
        SmartStay
      </div>

      <nav>

        <button className="login">
          Login
        </button>

        <button className="signup">
          Sign up
        </button>

      </nav>

    </header>
  );
}

export default Navbar;