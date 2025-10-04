import React, { useState, useCallback } from 'react';
import { Gavel, XCircle, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import './App.css'; // ✅ Import your custom styles

const AGENTS = [
  {
    id: 'political',
    name: 'Political Analyst',
    icon: '⚖️',
    color: 'result-icon bg-indigo',
    persona: "You are a non-partisan political scientist...",
  },
  {
    id: 'religious',
    name: 'Religious Scholar',
    icon: '🙏',
    color: 'result-icon bg-green',
    persona: "You are an expert in comparative religion...",
  },
  {
    id: 'social',
    name: 'Social Justice Advocate',
    icon: '✊',
    color: 'result-icon bg-red',
    persona: "You are an advocate focused on civil rights...",
  },
];

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=";
const API_KEY = "";

const callGeminiAPI = async (userQuery, systemPrompt) => {
  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    tools: [{ google_search: {} }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };

  try {
    const response = await fetch(API_URL + API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("API Error");
    }

    const result = await response.json();
    const candidate = result.candidates?.[0];

    if (candidate?.content?.parts?.[0]?.text) {
      const text = candidate.content.parts[0].text;
      let sources = [];

      const groundingMetadata = candidate.groundingMetadata;
      if (groundingMetadata?.groundingAttributions) {
        sources = groundingMetadata.groundingAttributions.map(attr => ({
          uri: attr.web?.uri,
          title: attr.web?.title,
        })).filter(src => src.uri && src.title);
      }

      return { text, sources };
    }

    return null;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export default function App() {
  const [inputText, setInputText] = useState('');
  const [analysisResults, setAnalysisResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [finalDecision, setFinalDecision] = useState(null);
  const [error, setError] = useState(null);

  const aggregateDecision = useCallback((results) => {
    const extremismVotes = results.filter(r => r.classification === 'EXTREMISM').length;
    return extremismVotes > results.length / 2 ? 'EXTREMISM' : 'NON-EXTREMISM';
  }, []);

  const analyzeText = useCallback(async () => {
    if (!inputText.trim()) {
      setError("Please enter text for the jury to analyze.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResults([]);
    setFinalDecision(null);

    const newResults = [];

    for (const agent of AGENTS) {
      const query = `Analyze the following text: "${inputText.trim()}"`;

      const response = await callGeminiAPI(query, agent.persona);

      if (response) {
        const { text, sources } = response;
        const match = text.match(/CLASSIFICATION: (EXTREMISM|NON-EXTREMISM)/i);
        const classification = match ? match[1].toUpperCase() : 'UNKNOWN';
        const rationale = match ? text.replace(match[0], '').trim() : text;

        newResults.push({
          ...agent,
          classification,
          rationale,
          sources,
        });

        setAnalysisResults([...newResults]);
      }
    }

    setFinalDecision(aggregateDecision(newResults));
    setIsLoading(false);
  }, [inputText, aggregateDecision]);

  const getBadgeClass = (classification) => {
    if (classification === 'EXTREMISM') return 'badge extremism';
    if (classification === 'NON-EXTREMISM') return 'badge non-extremism';
    return 'badge unknown';
  };

  const getVerdictBoxClass = (decision) => {
    if (decision === 'EXTREMISM') return 'verdict-box verdict extremism';
    if (decision === 'NON-EXTREMISM') return 'verdict-box verdict non-extremism';
    return 'verdict-box verdict unknown';
  };

  const getIcon = (decision) => {
    if (decision === 'EXTREMISM') return <XCircle size={28} style={{ marginRight: '0.5rem' }} />;
    if (decision === 'NON-EXTREMISM') return <CheckCircle size={28} style={{ marginRight: '0.5rem' }} />;
    return <Gavel size={28} style={{ marginRight: '0.5rem' }} />;
  };

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">Multi-Agent Jury System</h1>
        <p className="subtitle">Distributed analysis of text content from diverse viewpoints.</p>
      </header>

      <main>
        <div className="panel">
          <label htmlFor="inputText" className="subtitle" style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
            <ArrowRight size={20} style={{ marginRight: '0.5rem' }} /> Submit Text for Analysis
          </label>
          <textarea
            id="inputText"
            rows="5"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter the text to be analyzed for extremism or hate speech..."
            className="textarea"
            disabled={isLoading}
          />
          <button
            onClick={analyzeText}
            disabled={isLoading || !inputText.trim()}
            className="button"
          >
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={20} style={{ marginRight: '0.5rem' }} /> Analyzing...
              </div>
            ) : 'Start Jury Analysis'}
          </button>
          {error && <div className="panel" style={{ backgroundColor: '#7f1d1d', color: '#fecaca' }}>{error}</div>}
        </div>

        {finalDecision && (
          <div className="verdict">
            <h2 className="subtitle" style={{ marginBottom: '1rem' }}>Final Jury Verdict</h2>
            <div className={getVerdictBoxClass(finalDecision)}>
              {getIcon(finalDecision)}
              {finalDecision}
            </div>
            <p className="subtitle">Based on majority vote from {AGENTS.length} agents.</p>
          </div>
        )}

        {analysisResults.length > 0 && (
          <div>
            <h2 className="subtitle" style={{ marginBottom: '1rem' }}>Individual Agent Assessments</h2>
            {analysisResults.map((result) => (
              <div key={result.id} className="result-card">
                <div className="result-header">
                  <div className={result.color}>{result.icon}</div>
                  <h3 style={{ fontWeight: 600 }}>{result.name}</h3>
                  <div className={getBadgeClass(result.classification)}>
                    {result.classification}
                  </div>
                </div>
                <div>
                  <p className="subtitle">Rationale:</p>
                  <p>{result.rationale}</p>
                </div>

                {result.sources && result.sources.length > 0 && (
                  <div className="sources">
                    <p className="subtitle">Sources:</p>
                    {result.sources.map((src, i) => (
                      <a href={src.uri} key={i} target="_blank" rel="noopener noreferrer">
                        {src.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
