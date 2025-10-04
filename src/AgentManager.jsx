// src/AgentManager.jsx
import React, { useState } from "react";

export default function AgentManager({ onAddAgent }) {
  const [newAgent, setNewAgent] = useState({
    name: "",
    icon: "🧠",
    persona: "",
    extremismRating: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewAgent((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdd = () => {
    if (!newAgent.name.trim() || !newAgent.persona.trim()) {
      alert("Please enter both a name and a persona for the agent.");
      return;
    }

    const extremismRating = parseInt(newAgent.extremismRating, 10);
    if (isNaN(extremismRating) || extremismRating < 0 || extremismRating > 100) {
      alert("Please enter a valid extremism rating between 0 and 100.");
      return;
    }

    const agent = {
      id: Date.now().toString(),
      name: newAgent.name.trim(),
      icon: newAgent.icon || "🧠",
      color: "result-icon bg-blue",
      persona: newAgent.persona.trim(),
      extremismRating: extremismRating,
    };

    onAddAgent(agent);
    setNewAgent({ name: "", icon: "🧠", persona: "", extremismRating: "" });
  };

  return (
    <div className="panel" style={{ marginTop: "2rem" }}>
      <h2 className="subtitle" style={{ marginBottom: "1rem" }}>
        ➕ Add Custom Agent
      </h2>
      <input
        type="text"
        name="name"
        value={newAgent.name}
        onChange={handleChange}
        placeholder="Agent Name"
        className="textarea"
        style={{ marginBottom: "0.75rem" }}
      />
      <input
        type="text"
        name="icon"
        value={newAgent.icon}
        onChange={handleChange}
        placeholder="Emoji Icon (optional)"
        className="textarea"
        style={{ marginBottom: "0.75rem" }}
      />
      <input
        type="number"
        name="extremismRating"
        value={newAgent.extremismRating}
        onChange={handleChange}
        placeholder="Extremism Rating from 0 to 100"
        className="textarea"
        style={{ marginBottom: "0.75rem" }}
      />
      <textarea
        name="persona"
        rows="4"
        value={newAgent.persona}
        onChange={handleChange}
        placeholder="Enter agent persona or ideology..."
        className="textarea"
      />
      <button onClick={handleAdd} className="button" style={{ marginTop: "1rem" }}>
        Add Agent
      </button>
    </div>
  );
}