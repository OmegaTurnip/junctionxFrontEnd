import React, { useState } from "react";
import FileUpload from "./FileUpload"; // assuming you have this
import "./App.css";

const URL = process.env.REACT_APP_URL;

export default function AudioTranscription({classification, setClassification}) {
  const displayClassification = (data) => {
    // data looks like: { segments: [...], language: "en" }
    setClassification(data);
  };
  console.log("API URL:", URL);

  return (
    <div className="container">
      <h2 className="title">Audio Extremism Classification</h2>

      <FileUpload
        apiUrl={`${URL}audio/transcribe`}
        apiKey={""}
        onUploadSuccess={(data) => displayClassification(data)}
      />

      {classification && (
        <div className="panel" style={{ marginTop: "2rem" }}>
          <h3 className="subtitle">Classification Results</h3>

          {classification.segments.map((seg, index) => {
            const isExtreme = seg.label !== "LABEL_0";
            const confidence = (seg.score * 100).toFixed(2);
            const labelText = isExtreme ? "EXTREME" : "NON-EXTREME";
            const labelClass = isExtreme ? "badge extremism" : "badge non-extremism";

            return (
              <div key={index} className="result-card">
                <div className="result-header">
                  <span className={labelClass}>{labelText}</span>
                  <span style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
                    Confidence: {confidence}%
                  </span>
                </div>
                <p style={{ marginTop: "0.5rem" }}>{seg.text}</p>
                <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                  Time: {seg.start.toFixed(1)}s – {seg.end.toFixed(1)}s
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
