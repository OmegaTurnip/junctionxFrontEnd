import React, { useState, useCallback } from 'react';
import { Gavel, XCircle, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import './App.css'; // ✅ Import your custom styles
import AgentManager from './AgentManager';

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
]

// const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=";
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-09-2025:generateContent?key=";

// load .env file
// get api key from environment variable
const API_KEY = process.env.REACT_APP_API_KEY; // Updated to use process.env


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
  const [agents, setAgents] = useState(AGENTS);

  const handleAddAgent = (agent) => {
    setAgents((prev) => [...prev, agent]);
  };

  const aggregateDecision = useCallback((results) => {
    const totalScore = results.length * 100;
    // If the total extremism score is more than half, classify as EXTREMISM, else NON-EXTREMISM
    // If they classify as EXTREMISM, count as 100 - extremismScore) otherwise 0
    const score = results.reduce((sum, r) => {
      if (r.classification === 'EXTREMISM') {
        return sum + (100 - r.extremismRating);
      } else if (r.classification === 'NON-EXTREMISM') {
        return sum;
      }
    }, 0)
    return score > totalScore / 2 ? 'EXTREMISM' : 'NON-EXTREMISM';
    // const extremismVotes = results.filter(r => r.classification === 'EXTREMISM').length;
    // return extremismVotes > results.length / 2 ? 'EXTREMISM' : 'NON-EXTREMISM';
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

    for (const agent of agents) {
      const query = `You are given a persona/agent with a certain political ideology, and then a statement. Your task is to classify the statement as extreme or not extreme based on the agent's opinion. For example, a fascist would not think of racism as an extremist thing, but a liberal would. Remember, it is not your personal opinion, but the opinion of the madeup agent. Just classify based on what you think their response would be. 
      Structure response as { "Classification": , "Rationale": } 
      Clearly indicate EXTREMISM or NON-EXTREMISM in Classification and give a short 1-2 sentence rationale.
      "${inputText.trim()}"`;

      try {
        const response = await callGeminiAPI(query, agent.persona);

        let classification = 'UNKNOWN';
        let rationale = 'No rationale provided.';
        let sources = null;

        if (response) {
          const { text, sources: responseSources } = response;
          sources = responseSources;

          try {
            const parsed = JSON.parse(text);
            const match = parsed.Classification?.match(/(EXTREMISM|NON-EXTREMISM)/i)?.[0];
            classification = match ? match.toUpperCase() : 'UNKNOWN';
            rationale = parsed.Rationale?.trim() || 'No rationale provided.';
          } catch (parseError) {
            console.warn(`Failed to parse response for agent ${agent.name}:`, parseError);
          }
        }

        newResults.push({
          ...agent,
          classification,
          rationale,
          sources,
        });

        setAnalysisResults([...newResults]);
      } catch (error) {
        console.error(`Error processing agent ${agent.name}:`, error);

        newResults.push({
          ...agent,
          classification: 'UNKNOWN',
          rationale: 'Error during response or parsing.',
          sources: null,
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
      <AgentManager onAddAgent={handleAddAgent} />
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
