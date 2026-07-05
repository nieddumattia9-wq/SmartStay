import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./LoadingScreen.css";

const FIRST_STEP = "Searching thousands of stays...";

const LAST_STEP = "Building your SmartStay...";

const LOADING_POOL = [
  "Comparing prices across platforms...",
  "Checking guest ratings...",
  "Analyzing locations...",
  "Looking for hidden deals...",
  "Optimizing your budget...",
  "Optimizing your travel preferences...",
  "Finding better value...",
  "Reducing unnecessary costs...",
  "Calculating the smartest combination...",
  "Finding the best comfort-to-price ratio...",
  "Analyzing travel convenience...",
  "Checking stay quality...",
  "Looking for highly rated stays...",
  "Comparing amenities...",
  "Finding smarter alternatives...",
];

const STEP_DURATIONS = [
  900,
  700,
  1200,
  1400,
  800,
];

const STEP_PROGRESS = [
  18,
  38,
  60,
  82,
  100,
];

function shuffleArray(array: string[]) {

  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {

    const j = Math.floor(Math.random() * (i + 1));

    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function LoadingScreen() {

  const navigate = useNavigate();

  const loadingSteps = useMemo(() => {

    return [

      FIRST_STEP,

      ...shuffleArray(LOADING_POOL).slice(0, 3),

      LAST_STEP,

    ];

  }, []);

  const [progress, setProgress] = useState(0);

  const [currentStep, setCurrentStep] = useState(-1);

  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const mounted = useRef(true);

  useEffect(() => {

    mounted.current = true;

    return () => {

      mounted.current = false;

    };

  }, []);

  useEffect(() => {

    async function runLoading() {

      for (let i = 0; i < loadingSteps.length; i++) {

        if (!mounted.current) return;

        setCurrentStep(i);

        const startProgress = i === 0
          ? 0
          : STEP_PROGRESS[i - 1];

        const endProgress = STEP_PROGRESS[i];

        const duration = STEP_DURATIONS[i];

        const fps = 60;

        const frameTime = 1000 / fps;

        const frames = Math.floor(duration / frameTime);

        const increment =
          (endProgress - startProgress) / frames;

        let current = startProgress;

        await new Promise<void>((resolve) => {

          const interval = setInterval(() => {

            current += increment;

            if (current >= endProgress) {

              current = endProgress;

            }

            if (mounted.current) {

              setProgress(current);

            }

            if (current >= endProgress) {

              clearInterval(interval);

              resolve();

            }

          }, frameTime);

        });

        if (!mounted.current) return;

        setCompletedSteps((prev) => [...prev, i]);

        await new Promise((resolve) =>
          setTimeout(resolve, 220)
        );

      }

      // CONTINUA NELLA PARTE 1B
      if (!mounted.current) return;

      setCurrentStep(-1);

      setTimeout(() => {

        if (mounted.current) {

          navigate("/results");

        }

      }, 700);

    }

    runLoading();

  }, [loadingSteps, navigate]);

  return (

    <div className="loading-screen">

      <div className="loading-card">

        <h1 className="loading-title">
          SmartStay
        </h1>

        <p className="loading-subtitle">
          Finding the smartest stay for you...
        </p>

        <div className="loading-progress">

          <div
            className="loading-progress__bar"
            style={{
              width: `${progress}%`,
            }}
          />

        </div>

        <p className="loading-percentage">
          {Math.round(progress)}%
        </p>

        <div className="loading-steps">

          {loadingSteps.map((step, index) => {

            const completed =
              completedSteps.includes(index);

            const active =
              currentStep === index;

            if (!completed && !active) {

              return null;

            }

            return (

              <div
                key={step}
                className={`loading-step ${
                  completed
                    ? "loading-step--completed"
                    : "loading-step--active"
                }`}
              >

                {completed ? (

                  <Check
                    size={18}
                    className="loading-check"
                  />

                ) : (

                  <span className="loading-dot" />

                )}

                <span>
                  {step}
                </span>

              </div>

            );

          })}

        </div>

      </div>

    </div>

  );

}

export default LoadingScreen;