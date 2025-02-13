import React, { useState } from 'react';
import { Edit } from 'lucide-react';

import ArticleTable from './components/ArticleTable';
import EditPromptModal from './components/modals/EditPromptModal';
import EditMethodologyModal from './components/modals/EditMethodologyModal';
import ArticleModal from './components/modals/ArticleModal';
import { extractEvents, extractDisease, retrieveAndRankArticles } from './services/api';

function App() {
  // Case notes state
  const [caseNotes, setCaseNotes] = useState(`A now almost 4-year-old female diagnosed with KMT2A-rearranged AML and CNS2 involvement exhibited refractory disease after NOPHO DBH AML 2012 protocol. Post- MEC and ADE, MRD remained at 35% and 53%. Vyxeos-clofarabine therapy reduced MRD to 18%. Third-line FLAG-Mylotarg lowered MRD to 3.5% (flow) and 1% (molecular). After a cord blood HSCT in December 2022, she relapsed 10 months later with 3% MRD and femoral extramedullary disease.
After the iLTB discussion, in November 2023 the patient was enrolled in the SNDX5613 trial, receiving revumenib for three months, leading to a reduction in KMT2A MRD to 0.1% by PCR. Subsequently, the patient underwent a second allogeneic HSCT using cord blood with treosulfan, thiotepa, and fludarabine conditioning, followed by revumenib maintenance. In August 2024, 6.5 months after the second HSCT, the patient experienced a bone marrow relapse with 33% blasts. The patient is currently in very good clinical condition.			
Diagnostic tests:			
						 							
  WES and RNAseq were performed on the 1st relapse sample showing KMT2A::MLLT3 fusion and NRAS (p.Gln61Lys) mutation.
 						
						 							
  Flow cytometry from the current relapse showed positive CD33 and CD123.
 						
						 							
  WES and RNAseq of the current relapse sample is pending.`);

  // Extracted data state
  const [extractedDisease, setExtractedDisease] = useState('');
  const [extractedEvents, setExtractedEvents] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Articles state
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [output, setOutput] = useState('');
  const [currentTotalArticles, setCurrentTotalArticles] = useState(0);

  // Modal states
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [isEditingMethodology, setIsEditingMethodology] = useState(false);

  // Content states
  const [methodologyContent, setMethodologyContent] = useState(`You are an expert pediatric oncologist and you are the chair of the International Leukemia Tumor Board. Your goal is to evaluate full research articles related to oncology, especially those concerning pediatric leukemia, to identify potential advancements in treatment and understanding of the disease.

The patient's disease is: {disease}

The patient's actionable events are: {events}

Journal Impact Data (SJR scores):
The following is a list of journal titles and their SJR scores. When extracting the journal title from the article, find the best matching title from this list and use its SJR score. If no match is found, use 0 as the SJR score.

Journal Titles and Scores:
{journal_context}

<Article>
{article_text}
</Article>

<Instructions>
Your task is to read the provided full article and extract key information, and then assess the article's relevance and potential impact. You will generate a JSON object containing metadata and a point-based assessment of the article's value. Please use a consistent JSON structure.

As an expert oncologist:
1. Evaluate if the article's disease focus matches the patient's disease. Set disease_match to true if the article's cancer type is relevant to the patient's condition.
2. Analyze treatment outcomes. Set treatment_shown to true if the article demonstrates positive treatment results.
3. For each actionable event you find in the article, determine if it matches any of the patient's actionable events. Set matches_query to true for exact or close matches.

The scoring system will assess the following (not necessarily exhaustive and inferred):
*   **Disease Match:** Articles that cover the exact disease in question receive significant points. As an expert oncologist, carefully evaluate if the article's disease focus matches the patient's disease.
*   **Clinical Relevance:** Clinical trials score highest, followed by case reports with therapeutic interventions.
*   **Pediatric Focus:** Articles that focus specifically on pediatric oncology receive a significant bonus.
*   **Treatment Results:** Studies showing actual treatment results with positive outcomes are highly valued. Document specific treatment outcomes in the drug_results field.
*   **Specific Findings:** Articles that report specific actionable events are given more points.
*   **Additional Factors:** Cell studies, mice studies, and other research aspects contribute additional points.

Here's the specific information to extract for each article and their points:

1.  **Title:** The title of the paper. (0 Points)
2.  **Link:** A link to the paper. (0 Points)
3.  **Year:** Publication year (0 Points)
4.  **Cancer Focus:** Whether the article relates to cancer (Boolean, true or false) (0 Points, but essential for filtering).
5.  **Pediatric Focus:** Whether the article focuses on pediatric cancer specifically (Boolean, true or false) (If true, +20 points)
6.  **Type of Cancer:** The specific type of cancer discussed (string, example: Leukemia (AML, ALL), Neuroblastoma, etc.). (If matches query disease exactly, +50 points)
7.  **Paper Type:** The type of study (e.g., clinical trial, case report, in vitro study, review, retrospective study, biological rationale). (+40 points for clinical trial, -5 points for review)
8. **Actionable Event:** Any specific actionable event (e.g., KMT2A rearrangement, FLT3 mutation, specific mutation) mentioned in the paper. Each event will be evaluated against the patient's extracted actionable events, and only matching events will receive points (15 points per matching event)
9. **Drugs Tested:** Whether any drugs are mentioned as tested (Boolean true or false). (if true, +5 points)
10. **Drug Results:** Specific results of drugs that were tested. (if positive results shown, +50 points for actual treatment)
11. **Cell Studies:** Whether drugs were tested on cells in vitro (Boolean true or false) (if true, +5 points).
12. **Mice Studies:** Whether drugs were tested on mice/PDX models (Boolean true or false) (if true, +10 points).
13. **Case Report:** Whether the article presents a case report (Boolean true or false). (if true, +5 points)
14. **Series of Case Reports:** Whether the article presents multiple case reports (Boolean true or false) (if true, +10 points).
15. **Clinical Study:** Whether the article describes a clinical study (Boolean true or false). (if true, +15 points).
16. **Clinical Study on Children:** Whether the clinical study was specifically on children (Boolean true or false) (if true, +20 points).
17. **Novelty:** If the paper describes a novel mechanism or therapeutic strategy (Boolean true or false) (if true +10 points)
18. **Overall Points:** Sum of all points based on the above criteria. (Calculated by the output).

Please analyze the article and provide a JSON response with the following structure:

{
  "article_metadata": {
    "title": "...",
    "journal_title": "...",  // Extract the journal title from the article
    "journal_sjr": 0,        // Look up the SJR score from the provided list. Use the score of the best matching journal title, or 0 if no match found
    "year": "...",
    "cancer_focus": true/false,
    "pediatric_focus": true/false,
    "type_of_cancer": "...",
    "disease_match": true/false,      // Set to true if article's disease matches patient's disease
    "paper_type": "...",
    "actionable_events": [
      {
        "event": "...",
        "matches_query": true/false   // Set to true if this event matches any of the patient's extracted actionable events
      }
    ],
    "drugs_tested": true/false,
    "drug_results": ["...", "..."],
    "treatment_shown": true/false,    // Set to true if article shows positive treatment outcomes
    "cell_studies": true/false,
    "mice_studies": true/false,
    "case_report": true/false,
    "series_of_case_reports": true/false,
    "clinical_study": true/false,
    "clinical_study_on_children": true/false,
    "novelty": true/false,
    "overall_points": 0
  }
}

Important: The response must be valid JSON and follow this exact structure. Do not include any explanatory text, markdown formatting, or code blocks. Return only the raw JSON object.`);

  const [promptContent, setPromptContent] = useState(`You are an expert pediatric oncologist and chair of the International Leukemia Tumor Board (iLTB). Your role is to analyze complex patient case notes, identify key actionable events that may guide treatment strategies, and formulate precise search queries for PubMed to retrieve relevant clinical research articles.

**Input:** Patient case notes, as provided by a clinician. This will include information on diagnosis, treatment history, and relevant diagnostic findings including genetics and flow cytometry results.

**Task:**

1. **Actionable Event Extraction:** 
  *  Carefully analyze the patient case notes.
  *  Identify and extract all clinically relevant and actionable events, such as:
    *  **Specific genetic mutations or fusions:** For example, "KMT2A::MLLT3 fusion", "NRAS (p.Gln61Lys) mutation"
    *  **Immunophenotype data:** For example, "positive CD33", "positive CD123"
    *  **Disease status:** For example, "relapsed after HSCT", "refractory to protocol"
    *  **Specific therapies:** "revumenib", "FLAG-Mylotarg", "Vyxeos-clofarabine"
    *  **Disease location:** For example, "CNS2 involvement", "femoral extramedullary disease"
    *  **Response to therapy:** For example, "MRD reduction to 0.1%"
    *  **Treatment resistance:** For example, "relapsed after second HSCT"
   *  Focus on information that is directly relevant to potential therapy selection or clinical management. Avoid vague or redundant information like "very good clinical condition". 
   
**Example:**

*  **Case Note Input:** "A now almost 4-year-old female diagnosed with KMT2A-rearranged AML and CNS2 involvement exhibited refractory disease after NOPHO DBH AML 2012 protocol. Post- MEC and ADE, MRD remained at 35% and 53%. Vyxeos-clofarabine therapy reduced MRD to 18%. Third-line FLAG-Mylotarg lowered MRD to 3.5% (flow) and 1% (molecular). After a cord blood HSCT in December 2022, she relapsed 10 months later with 3% MRD and femoral extramedullary disease.
After the iLTB discussion, in November 2023 the patient was enrolled in the SNDX5613 trial, receiving revumenib for three months, leading to a reduction in KMT2A MRD to 0.1% by PCR. Subsequently, the patient underwent a second allogeneic HSCT using cord blood with treosulfan, thiotepa, and fludarabine conditioning, followed by revumenib maintenance. In August 2024, 6.5 months after the second HSCT, the patient experienced a bone marrow relapse with 33% blasts. The patient is currently in very good clinical condition.             
Diagnostic tests:                                                     
WES and RNAseq were performed on the 1st relapse sample showing KMT2A::MLLT3 fusion and NRAS (p.Gln61Lys) mutation.
Flow cytometry from the current relapse showed positive CD33 and CD123.
WES and RNAseq of the current relapse sample is pending. "

**Output:**  
"KMT2A::MLLT3 fusion" "NRAS" "CD33" "CD123"

**Reasoning and Guidance:**

*  **Focus on Actionable Events:** We are not trying to summarize the case but to find what information is relevant to decision-making. This helps filter noise and focus on clinically significant findings.
*  **Prioritization:** Starting with pediatric studies ensures that we tailor our searches to the specific patient population.
*  **Specific Search Terms:** Using exact terms such as "KMT2A::MLLT3 fusion" is essential for precision. Adding "therapy", "treatment" or "clinical trials" helps to find relevant studies.
*  **Combinations:** Combining genetic and immunophenotypic features allows for refined searches that might be more relevant to the patient.
*  **Iteration:** If initial search results are not helpful, we can modify and refine the queries based on the available data.

Extract actionable events from the provided patient information, such as gene fusions, mutations, and positive markers.  Only output the list of actionable events. Do not include any other text or formatting.`);

  // Event handlers
  const handleExtract = async () => {
    try {
      setIsProcessing(true);
      const [disease, events] = await Promise.all([
        extractDisease(caseNotes),
        extractEvents(caseNotes, promptContent)
      ]);
      setExtractedDisease(disease);
      setExtractedEvents(events);
    } catch (error) {
      console.error('Error:', error);
      setExtractedDisease('Error extracting disease. Please try again.');
      setExtractedEvents(['Error extracting events. Please try again.']);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetrieveAndRank = async () => {
    try {
      setOutput('');
      setArticles([]);
      setIsProcessing(true);

      const queryText = `${extractedDisease}\n${extractedEvents.join('\n')}`;

      await retrieveAndRankArticles(queryText, methodologyContent, extractedDisease, (data) => {
        if (data.type === 'metadata') {
          if (data.data.status === 'processing') {
            const totalArticles = data.data.total_articles;
            setCurrentTotalArticles(totalArticles);
            setOutput(`### Analyzing articles...\n\nFound ${totalArticles} relevant articles to analyze.\n\n`);
          } else if (data.data.status === 'complete') {
            const successfulArticles = articles.length;
            const failedArticles = currentTotalArticles - successfulArticles;
            
            let markdown = `### Analysis complete\n\n`;
            markdown += `Successfully analyzed ${successfulArticles} of ${currentTotalArticles} articles`;
            if (failedArticles > 0) {
              markdown += ` (${failedArticles} failed)`;
            }
            markdown += '.\n\n';
            
            setOutput(markdown);
            setIsProcessing(false);
          }
        }
        else if (data.type === 'article_analysis') {
          try {
            const analysis = data.data.analysis.article_metadata;
            if (!analysis || !analysis.PMID || !analysis.title) {
              console.error("Invalid article metadata:", analysis);
              return;
            }
            
            const articleData = {
              pmid: analysis.PMID,
              link: analysis.link || `https://pubmed.ncbi.nlm.nih.gov/${analysis.PMID}/`,
              title: analysis.title,
              year: analysis.year || 'N/A',
              cancer: analysis.type_of_cancer || 'N/A',
              type: analysis.paper_type || 'N/A',
              events: analysis.actionable_events.map(event => ({
                event: typeof event === 'object' ? event.event : event,
                matches_query: typeof event === 'object' ? event.matches_query : false
              })) || [],
              drugs_tested: analysis.drugs_tested || false,
              drug_results: analysis.drug_results || [],
              points: analysis.overall_points || 0,
              point_breakdown: analysis.point_breakdown || {},
              fullText: data.data.analysis.full_article_text || '',
              journal_title: analysis.journal_title || 'N/A',
              journal_sjr: analysis.journal_sjr || 0
            };
            
            setArticles(current => {
              const updatedArticles = [...current, articleData];
              setOutput(`### Processing article ${data.data.progress.article_number} of ${currentTotalArticles}`);
              return updatedArticles;
            });
          } catch (e) {
            console.error("Error processing article analysis:", e);
            setOutput(current => 
              current + `Error processing article ${data.data.progress.article_number}: ${e.message}\n`
            );
          }
        }
        else if (data.type === 'error') {
          console.error("Server error:", data.data.message);
          if (data.data.article_number) {
            setOutput(current => 
              current + `Error processing article ${data.data.article_number} of ${data.data.total_articles}: ${data.data.message}\n`
            );
          } else {
            setOutput(current => current + `\nError: ${data.data.message}\n`);
          }
        }
      });
    } catch (error) {
      console.error('Error:', error);
      setOutput('Error retrieving and ranking articles. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-2xl font-semibold text-gray-700">Testing PubMed Search</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex gap-6">
          {/* Left column */}
          <div className="flex-1 space-y-6">
            {/* Case notes section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-700 mb-4">1. Case notes</h2>
              <textarea
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Paste your case notes here..."
                value={caseNotes}
                onChange={(e) => setCaseNotes(e.target.value)}
              />
            </div>

            {/* Extract actionable events section */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-700">2. Extract actionable events</h2>
                <button
                  onClick={handleExtract}
                  disabled={isProcessing}
                  className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isProcessing ? 'Extracting...' : 'Extract'}
                </button>
              </div>
              <div className="relative">
                <div className="min-h-[100px] max-h-[200px] p-3 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm overflow-y-auto">
                  {promptContent}
                </div>
                <button
                  onClick={() => setIsEditingPrompt(true)}
                  className="absolute top-2 right-2 p-1 bg-white rounded-md shadow hover:bg-gray-50"
                >
                  <Edit size={16} />
                </button>
              </div>
            </div>

            {/* Extracted disease and events section */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-700">3. Extracted disease and events</h2>
              </div>
              <div className="space-y-4">
                {/* Extracted disease */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Extracted disease</label>
                  <div className="min-h-[40px] p-3 bg-gray-50 rounded-lg">
                    {extractedDisease ? (
                      <input
                        type="text"
                        value={extractedDisease}
                        onChange={(e) => setExtractedDisease(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 p-0"
                      />
                    ) : (
                      <p className="text-gray-500 italic">Disease will appear here after extraction...</p>
                    )}
                  </div>
                </div>
                
                {/* Extracted events */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Extracted actionable events</label>
                  <div className="min-h-[100px] p-3 bg-gray-50 rounded-lg">
                    {extractedEvents.length > 0 ? (
                      <textarea
                        value={extractedEvents.join('" "')}
                        onChange={(e) => {
                          const text = e.target.value;
                          const events = text.split('"').filter(event => event.trim() && event !== ' ');
                          setExtractedEvents(events);
                        }}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 min-h-[80px]"
                      />
                    ) : (
                      <p className="text-gray-500 italic">Click "Extract" to analyze case notes and generate actionable events.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex-1 bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-700">4. Ranking methodology</h2>
              <button
                onClick={handleRetrieveAndRank}
                disabled={isProcessing || extractedEvents.length === 0}
                className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${(isProcessing || extractedEvents.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isProcessing ? 'Processing...' : 'Retrieve and rank articles'}
              </button>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <div className="min-h-[100px] max-h-[200px] p-3 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm overflow-y-auto">
                  {methodologyContent}
                </div>
                <button
                  onClick={() => setIsEditingMethodology(true)}
                  className="absolute top-2 right-2 p-1 bg-white rounded-md shadow hover:bg-gray-50"
                >
                  <Edit size={16} />
                </button>
              </div>
              <div className="prose max-w-none mt-4 p-3 bg-gray-50 rounded-lg">
                <ArticleTable 
                  articles={articles}
                  currentArticle={isProcessing ? articles.length + 1 : undefined}
                  totalArticles={isProcessing ? currentTotalArticles : undefined}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <EditPromptModal
        isOpen={isEditingPrompt}
        onClose={() => setIsEditingPrompt(false)}
        content={promptContent}
        onChange={setPromptContent}
      />

      <EditMethodologyModal
        isOpen={isEditingMethodology}
        onClose={() => setIsEditingMethodology(false)}
        content={methodologyContent}
        onChange={setMethodologyContent}
      />
    </div>
  );
}

export default App;
