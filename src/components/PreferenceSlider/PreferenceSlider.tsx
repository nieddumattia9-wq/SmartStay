import "./PreferenceSlider.css";
import { useState } from "react";

const options = [
    {
      title: "Maximum Comfort",
      description:
        "Prioritize comfort, premium locations and fewer accommodation changes.",
      color: "#2563EB",
    },
    {
      title: "Comfort",
      description:
        "Favor comfort while keeping a good quality/price balance.",
      color: "#3B82F6",
    },
    {
      title: "Balanced",
      description:
        "The best balance between savings, comfort and logistics.",
      color: "#10B981",
    },
    {
      title: "Savings",
      description:
        "Accept some compromises to reduce the total trip cost.",
      color: "#059669",
    },
    {
      title: "Maximum Savings",
      description:
        "Look for the maximum savings, even with multiple accommodation changes.",
      color: "#047857",
    },
  ];

function PreferenceSlider() {
  const [selected, setSelected] = useState(2);

  return (
    <div className="preference-slider">

      <h3>Optimization Preference</h3>

      <div className="slider-labels">
        <span>Comfort</span>
        <span>Savings</span>
      </div>

      <input
        type="range"
        min={0}
        max={4}
        step={1}
        value={selected}
        onChange={(e) => setSelected(Number(e.target.value))}
      />

<h4
  style={{
    color: options[selected].color,
  }}
>
  {options[selected].title}
</h4>

      <p>{options[selected].description}</p>

    </div>
  );
}

export default PreferenceSlider;