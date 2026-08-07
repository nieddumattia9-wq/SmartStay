import "./Hero.css";

function Hero() {

  return (

    <section className="hero">

      <img
        src="/brand/stayopti-mark.svg"
        className="hero__brand-mark"
        alt=""
        aria-hidden="true"
        width="92"
        height="92"
      />

      <h1 className="hero__title">

        StayOpti

      </h1>

      <p className="hero__subtitle">

        Find the smartest way to travel.

      </p>

    </section>

  );

}

export default Hero;
