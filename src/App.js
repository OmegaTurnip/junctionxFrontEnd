import React, { useState, useCallback, useEffect } from 'react';
import { Gavel, XCircle, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import './App.css';
import AgentManager from './AgentManager';
import AudioTranscription from './AudioTranscription';

// const URL = process.env.URL || "http://localhost:8000/";

const AGENTS = [
  {
    id: '1',
    extremismRating: 0,
    name: 'Liberal Analyst',
    icon: '🟦',
    color: 'result-icon bg-blue',
    persona: 'This agent is a liberal political analyst who believes in equality, social justice, and progressive values. They view extremist views as harmful to society and are vigilant against hate speech and discrimination.',
  },
  {
    id: '2',
    extremismRating: 60,
    name: 'Radical Right Winger',
    icon: '🟦',
    color: 'result-icon bg-red',
    persona: 'This agent is a radical right-wing person who believes in strong nationalistic values, limited government intervention, and traditional social norms. They may view certain extremist views as acceptable or even necessary for preserving their vision of society.',
  },
  {
    id: '3',
    extremismRating: 30,
    name: 'Femininist Scholar',
    icon: '🟦',
    color: 'result-icon bg-green',
    persona: 'This agent is a feminist scholar who advocates for gender equality, women\'s rights, and social reform. They are particularly sensitive to issues of sexism and misogyny. Their views may be classified as extremist by more conservative standards.',
  },
  {
    id: '4',
    extremismRating: 10,
    name: 'Friendly Grandpa',
    icon: '🟦',
    color: 'result-icon bg-green',
    persona: 'This agent is a friendly grandpa who values kindness, community, and traditional family values. They may have conservative views but are generally open-minded and compassionate. They tend to avoid extreme positions and seek common ground.',
  },
];

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-09-2025:generateContent?key=";
const API_KEY = process.env.REACT_APP_API_KEY;

const callGeminiAPI = async (inputText, agents) => {
  const systemPrompt = `
You are an AI system simulating a multi-agent jury. Each agent has a defined persona. Analyze the input statement from the perspective of each agent. For each agent, classify the statement as EXTREMISM or NON-EXTREMISM based on what that persona would think, not your own opinion.

Return an array of JSON objects, one for each agent, in this format:
[
  {
    "id": "agent-id",
    "Classification": "EXTREMISM" or "NON-EXTREMISM",
    "Rationale": "Short explanation"
  },
  ...
]

Agents:
${agents.map(agent => `ID: ${agent.id}\nName: ${agent.name}\nPersona: ${agent.persona}`).join('\n\n')}

Statement:
"${inputText}"
  `.trim();

  const payload = {
    contents: [{ parts: [{ text: "Analyze the above and return structured JSON." }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };

  try {
    const response = await fetch(API_URL + API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("API Error");

    const result = await response.json();
    const candidate = result.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    return text || null;
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
  const [agents, setAgents] = useState(AGENTS);

  const [classification, setClassification] = useState(null);

  useEffect(() => {
    setInputText(classification ? classification.segments.map(seg => seg.text).join(' ') : '');
  }, [classification]);

  const handleAddAgent = (agent) => {
    setAgents((prev) => [...prev, agent]);
  };

  const aggregateDecision = useCallback((results) => {
    const totalScore = results.length * 100;
    const score = results.reduce((sum, r) => {
      if (r.classification === 'EXTREMISM') {
        return sum + (100 - r.extremismRating);
      } else if (r.classification === 'NON-EXTREMISM') {
        return sum;
      }
      return sum;
    }, 0);
    return score > totalScore / 2 ? 'EXTREMISM' : 'NON-EXTREMISM';
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

    try {
      const responseText = await callGeminiAPI(inputText.trim(), agents);

      let parsedResults = [];
      try {
        parsedResults = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse API response:", parseError);
        setError("Failed to parse the response from the model.");
        setIsLoading(false);
        return;
      }

      const enrichedResults = agents.map(agent => {
        const agentResult = parsedResults.find(res => res.id === agent.id);

        if (agentResult) {
          const match = agentResult.Classification?.match(/(EXTREMISM|NON-EXTREMISM)/i)?.[0];
          const classification = match ? match.toUpperCase() : 'UNKNOWN';
          const rationale = agentResult.Rationale?.trim() || 'No rationale provided.';

          return {
            ...agent,
            classification,
            rationale,
            sources: null,
          };
        } else {
          return {
            ...agent,
            classification: 'UNKNOWN',
            rationale: 'No response received for this agent.',
            sources: null,
          };
        }
      });

      setAnalysisResults(enrichedResults);
      setFinalDecision(aggregateDecision(enrichedResults));
    } catch (err) {
      console.error(err);
      setError("Something went wrong during analysis.");
    } finally {
      setIsLoading(false);
    }
  }, [inputText, agents, aggregateDecision]);

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
      <AgentManager onAddAgent={handleAddAgent} />
      {/* <FileUpload
        apiUrl= {`${URL}/audio/transcribe`}
        apiKey={""}
        onUploadSuccess={(data) => displayClassification(data)}
      /> */}
      <AudioTranscription props={{ classification: classification, setClassification: setClassification }} />
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
            <p className="subtitle">Based on majority vote from {agents.length} agents.</p>
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
