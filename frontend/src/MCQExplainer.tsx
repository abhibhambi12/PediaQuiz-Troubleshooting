import { useState } from "react";
import { getMCQExplanation } from "./services/aiService"; // Updated import path

export default function MCQExplainer() {
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);

  const question = "A 3-year-old child presents with barking cough and inspiratory stridor. What is the most likely diagnosis?";
  const options = ["Croup", "Epiglottitis", "Bronchiolitis", "Asthma"];
  const answer = "A"; // Assuming 'Croup' is option A based on the example.

  const handleExplain = async () => {
    setLoading(true);
    try {
      const result = await getMCQExplanation({ question, options, answer });
      setExplanation(result);
    } catch (e) {
      setExplanation("Error: Could not generate explanation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleExplain} disabled={loading}>
        Explain MCQ
      </button>
      <div style={{ whiteSpace: "pre-wrap", marginTop: "1rem" }}>
        {loading ? "Generating..." : explanation}
      </div>
    </div>
  );
}