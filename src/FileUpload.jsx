// src/FileUpload.jsx
import React, { useState } from "react";

export default function FileUpload({ apiUrl, apiKey, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploading(true);
      setMessage("");

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      setMessage("✅ Upload successful!");
      onUploadSuccess?.(data);
    } catch (err) {
      console.error(err);
      setMessage("❌ Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="panel" style={{ marginTop: "2rem" }}>
      <h2 className="subtitle" style={{ marginBottom: "1rem" }}>
        🎧 Upload Audio/Video File
      </h2>

      <input
        type="file"
        accept="audio/*,video/*"
        onChange={handleFileChange}
        className="textarea"
        style={{ marginBottom: "1rem" }}
      />

      <button
        onClick={handleUpload}
        disabled={isUploading || !file}
        className="button"
      >
        {isUploading ? "Uploading..." : "Upload File"}
      </button>

      {message && (
        <p
          style={{
            marginTop: "1rem",
            color: message.startsWith("✅")
              ? "var(--success)"
              : message.startsWith("❌")
              ? "var(--danger)"
              : "var(--text-muted)",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}