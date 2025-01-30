import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Edit, X } from 'lucide-react';

function App() {
  const [caseNotes, setCaseNotes] = useState(`A now almost 4-year-old female diagnosed with KMT2A-rearranged AML and CNS2 involvement exhibited refractory disease after NOPHO DBH AML 2012 protocol. Post- MEC and ADE, MRD remained at 35% and 53%. Vyxeos-clofarabine therapy reduced MRD to 18%. Third-line FLAG-Mylotarg lowered MRD to 3.5% (flow) and 1% (molecular). After a cord blood HSCT in December 2022, she relapsed 10 months later with 3% MRD and femoral extramedullary disease.
After the iLTB discussion, in November 2023 the patient was enrolled in the SNDX5613 trial, receiving revumenib for three months, leading to a reduction in KMT2A MRD to 0.1% by PCR. Subsequently, the patient underwent a second allogeneic HSCT using cord blood with treosulfan, thiotepa, and fludarabine conditioning, followed by revumenib maintenance. In August 2024, 6.5 months after the second HSCT, the patient experienced a bone marrow relapse with 33% blasts. The patient is currently in very good clinical condition.			
Diagnostic tests:			
						 							
  WES and RNAseq were performed on the 1st relapse sample showing KMT2A::MLLT3 fusion and NRAS (p.Gln61Lys) mutation.
 						
						 							
  Flow cytometry from the current relapse showed positive CD33 and CD123.
 						
						 							
  WES and RNAseq of the current relapse sample is pending.`);
  const [extractedEvents, setExtractedEvents] = useState([]);
  const [output, setOutput] = useState('');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [methodologyContent, setMethodologyContent] = useState(`You are an expert pediatric oncologist and you are the chair of the International Leukemia Tumor Board. Your goal is to evaluate full research articles related to oncology, especially those concerning pediatric leukemia, to identify potential advancements in treatment and understanding of the disease. You will read one full article at a time.

<Article>
{article}
</Article>

<Instructions>
Your task is to read the provided full article and extract key information, and then assess the article's relevance and potential impact. You will generate a JSON object containing metadata, a point-based assessment of the article's value, and the full text. Please use a consistent JSON structure.

The scoring system will assess the following (not necessarily exhaustive and inferred):
*   **Clinical Relevance:** Clinical trials score highest, followed by case reports with therapeutic interventions. Basic case reports score low. The ultimate goal is to improve patient outcomes.
*   **Pediatric Focus:** Articles that focus specifically on pediatric oncology receive a bonus.
*   **Drug Testing:** Studies that involve drug testing (especially on patients or model systems, PDX is higher than just cell lines) are prioritized.
*   **Specific Findings:** Articles that report specific actionable events are given more points.
*   **Novelty:** Novel mechanisms or therapeutic avenues receive higher points.

Here's the specific information to extract for each article and their points:

1.  **PMID** (If available). If not, please use "N/A". (0 Points)
2.  **Title:** The title of the paper. (0 Points)
3.  **Link:** A link to the paper (if the PMID is provided, use the format | https://pubmed.ncbi.nlm.nih.gov/<PMID>/). If PMID not available use "N/A". (0 Points)
4.  **Year:** Publication year (0 Points)
5.  **Full Article Text:** The entire article text must be available in the output. (0 Points)
6.  **Cancer Focus:** Whether the article relates to cancer (Boolean, true or false) (0 Points, but essential for filtering).
7.  **Pediatric Focus:** Whether the article focuses on pediatric cancer specifically (Boolean, true or false) (If true, +10 points)
8.  **Type of Cancer:** The specific type of cancer discussed (string, example: Leukemia (AML, ALL), Neuroblastoma, etc.). (0 points)
9.  **Paper Type:** The type of study (e.g., clinical trial, case report, in vitro study, review, retrospective study, biological rationale). (+0 points for descriptive types, +10 points for clinical trial, -5 points for review)
10. **Actionable Event:** Any specific actionable event (e.g., KMT2A rearrangement, FLT3 mutation, specific mutation) mentioned in the paper. (5 points per actionable event)
11. **Drugs Tested:** Whether any drugs are mentioned as tested (Boolean true or false). (if true, +5 points)
12. **Drug Results:** Specific results of drugs that were tested. (if drugs are mentioned, 5 points for each drug result)
13. **Cell Studies:** Whether drugs were tested on cells in vitro (Boolean true or false) (if true, +5 points).
14. **Mice Studies:** Whether drugs were tested on mice/PDX models (Boolean true or false) (if true, +10 points).
15. **Case Report:** Whether the article presents a case report (Boolean true or false). (if true, +5 points)
16. **Series of Case Reports:** Whether the article presents multiple case reports (Boolean true or false) (if true, +10 points).
17. **Clinical Study:** Whether the article describes a clinical study (Boolean true or false). (if true, +15 points).
18. **Clinical Study on Children:** Whether the clinical study was specifically on children (Boolean true or false) (if true, +20 points).
19. **Novelty:** If the paper describes a novel mechanism or therapeutic strategy (Boolean true or false) (if true +10 points)
20. **Overall Points:** Sum of all points based on the above criteria. (Calculated by the output).

The output should be a single JSON object with the following structure. Note that this function only processes one paper at a time.

\`\`\`json
{
  "article_metadata": {
    "PMID": "...",
    "title": "...",
    "link": "...",
    "year": "...",
    "full_article_text": "...",
    "cancer_focus": true/false,
    "pediatric_focus": true/false,
     "type_of_cancer": "...",
    "paper_type": "...",
    "actionable_events": ["...", "..."],
      "drugs_tested": true/false,
    "drug_results": ["...", "..."],
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
\`\`\`
**Important Notes:**

*   **One Article at a Time:** You will be processing one full article at a time, so the output will always be a single JSON object per article.
*   **Inference:** You will need to infer information not explicitly stated. For example, if an article reports results of a drug on patients, infer that it's a case report.
*   **JSON Format:** The output *must* be valid JSON and adhere to the structure above.
*   **Point calculation:** Overall points should be calculated based on the above criteria.
*   **No Ranking:** Ranking is not needed, just the score for that article.

</Instructions>

Examples:
**Input**
<Article>
<PMID>35211470</PMID>
<Title>Effects of NRAS Mutations on Leukemogenesis and Targeting of Children With Acute Lymphoblastic Leukemia</Title>
<Full Article Text>
Through the advancements in recent decades, childhood acute lymphoblastic leukemia (ALL) is gradually becoming a highly curable disease. However, the truth is there remaining relapse in ∼15% of ALL cases with dismal outcomes. RAS mutations, in particular NRAS mutations, were predominant mutations affecting relapse susceptibility. KRAS mutations targeting has been successfully exploited, while NRAS mutation targeting remains to be explored due to its complicated and compensatory mechanisms. Using targeted sequencing, we profiled RAS mutations in 333 primary and 18 relapsed ALL patients and examined their impact on ALL leukemogenesis, therapeutic potential, and treatment outcome. Cumulative analysis showed that RAS mutations were associated with a higher relapse incidence in children with ALL. In vitro cellular assays revealed that about one-third of the NRAS mutations significantly transformed Ba/F3 cells as measured by IL3-independent growth. Meanwhile, we applied a high-throughput drug screening method to characterize variable mutation-related candidate targeted agents and uncovered that leukemogenic-NRAS mutations might respond to MEK, autophagy, Akt, EGFR signaling, Polo-like Kinase, Src signaling, and TGF-β receptor inhibition depending on the mutation profile.
Keywords: NRAS proto-oncogene; acute lymphoblastic leukemia; leukemogenic potential; signaling pathway activation; therapeutic targeting.
</Full Article Text>
</Article>

**Output**
\`\`\`json
{
    "article_metadata": {
        "PMID": "35211470",
        "title": "Effects of NRAS Mutations on Leukemogenesis and Targeting of Children With Acute Lymphoblastic Leukemia",
        "link": "https://pubmed.ncbi.nlm.nih.gov/35211470/",
        "year": "N/A",
        "full_article_text": "Through the advancements in recent decades, childhood acute lymphoblastic leukemia (ALL) is gradually becoming a highly curable disease. However, the truth is there remaining relapse in ∼15% of ALL cases with dismal outcomes. RAS mutations, in particular NRAS mutations, were predominant mutations affecting relapse susceptibility. KRAS mutations targeting has been successfully exploited, while NRAS mutation targeting remains to be explored due to its complicated and compensatory mechanisms. Using targeted sequencing, we profiled RAS mutations in 333 primary and 18 relapsed ALL patients and examined their impact on ALL leukemogenesis, therapeutic potential, and treatment outcome. Cumulative analysis showed that RAS mutations were associated with a higher relapse incidence in children with ALL. In vitro cellular assays revealed that about one-third of the NRAS mutations significantly transformed Ba/F3 cells as measured by IL3-independent growth. Meanwhile, we applied a high-throughput drug screening method to characterize variable mutation-related candidate targeted agents and uncovered that leukemogenic-NRAS mutations might respond to MEK, autophagy, Akt, EGFR signaling, Polo-like Kinase, Src signaling, and TGF-β receptor inhibition depending on the mutation profile.\\nKeywords: NRAS proto-oncogene; acute lymphoblastic leukemia; leukemogenic potential; signaling pathway activation; therapeutic targeting.",
        "cancer_focus": true,
        "pediatric_focus": true,
        "type_of_cancer": "Leukemia (ALL)",
        "paper_type": "In vitro studies",
         "actionable_events": ["NRAS mutation"],
         "drugs_tested": true,
          "drug_results": ["leukemogenic-NRAS mutations might respond to MEK, autophagy, Akt, EGFR signaling, Polo-like Kinase, Src signaling, and TGF-β receptor inhibition depending on the mutation profile"],
        "cell_studies": true,
        "mice_studies": false,
       "case_report": false,
      "series_of_case_reports": false,
        "clinical_study": false,
         "clinical_study_on_children": false,
          "novelty": false,
        "overall_points": 30
    }
}
\`\`\`

**Input**
<Article>
<PMID>37101762</PMID>
<Title>Palbociclib in Acute Leukemias With KMT2A-rearrangement: Results of AMLSG 23-14 Trial</Title>
<Full Article Text>
Results of the AMLSG 23-14 Trial indicated 2 responses observed among 16 patients.
</Full Article Text>
</Article>

**Output**
\`\`\`json
{
  "article_metadata": {
    "PMID": "37101762",
    "title": "Palbociclib in Acute Leukemias With KMT2A-rearrangement: Results of AMLSG 23-14 Trial",
    "link": "https://pubmed.ncbi.nlm.nih.gov/37101762/",
    "year": "N/A",
    "full_article_text": "Results of the AMLSG 23-14 Trial indicated 2 responses observed among 16 patients.",
     "cancer_focus": true,
    "pediatric_focus": false,
     "type_of_cancer": "Leukemia (AML, ALL)",
    "paper_type": "Clinical Study",
      "actionable_events": ["KMT2A rearrangement"],
     "drugs_tested": true,
      "drug_results": ["2 responses observed among 16 patients"],
    "cell_studies": false,
     "mice_studies": false,
     "case_report": true,
     "series_of_case_reports": false,
     "clinical_study": true,
     "clinical_study_on_children": false,
       "novelty": false,
    "overall_points": 45
  }
}
\`\`\`
**Input**
<Article>
<PMID>37190240</PMID>
<Title>Targeting FLT3 Mutation in Acute Myeloid Leukemia: Current Strategies and Future Directions</Title>
<Full Article Text>
The review discusses FLT3 inhibitors in AML.
</Full Article Text>
</Article>

**Output**
\`\`\`json
{
  "article_metadata": {
    "PMID": "37190240",
    "title": "Targeting FLT3 Mutation in Acute Myeloid Leukemia: Current Strategies and Future Directions",
    "link": "https://pubmed.ncbi.nlm.nih.gov/37190240/",
    "year": "N/A",
    "full_article_text": "The review discusses FLT3 inhibitors in AML.",
    "cancer_focus": true,
    "pediatric_focus": false,
    "type_of_cancer": "Leukemia (AML)",
    "paper_type": "Review",
     "actionable_events": ["FLT3 mutation"],
    "drugs_tested": true,
     "drug_results": ["FLT3 inhibitors"],
    "cell_studies": false,
    "mice_studies": false,
    "case_report": false,
    "series_of_case_reports": false,
    "clinical_study": false,
      "clinical_study_on_children": false,
    "novelty": false,
    "overall_points": 5
  }
}
\`\`\``);
  const [isEditingMethodology, setIsEditingMethodology] = useState(false);
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

  const handleExtract = async () => {
    try {
      // Combine prompt and case notes
      const text = `${promptContent}\n\nCase input:\n${caseNotes}`;

      const response = await fetch('https://us-central1-gemini-med-lit-review.cloudfunctions.net/pubmed-search-tester-extract-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.text();
      // Split the response into individual events
      const events = data.split('"').filter(event => event.trim() && event !== ' ');
      setExtractedEvents(events);
    } catch (error) {
      console.error('Error:', error);
      setExtractedEvents(['Error extracting events. Please try again.']);
    }
  };

  const handleRetrieveAndRank = async () => {
    try {
      // Clear previous output
      setOutput('');

      // Get the events text from the textarea
      const eventsText = extractedEvents.join('\n');

      // Create fetch request
      const response = await fetch('https://us-central1-gemini-med-lit-review.cloudfunctions.net/pubmed-search-tester-analyze-articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events_text: eventsText }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Create a reader to read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Process the stream
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Decode the chunk and split by newlines
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        // Process each line
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.type === 'metadata') {
              // Update progress information
              setOutput(current => 
                current + `\n### Processing ${data.data.current_article} of ${data.data.total_articles} articles...\n`
              );
            } 
            else if (data.type === 'article_analysis') {
              // Format and display the article analysis
              const analysis = data.data.analysis.article_metadata;
              setOutput(current => 
                current + `\n## Article ${data.data.progress.article_number} of ${data.data.progress.total_articles}\n` +
                `**Title:** ${analysis.title}\n` +
                `**PMID:** ${analysis.PMID}\n` +
                `**Link:** ${analysis.link}\n` +
                `**Type of Cancer:** ${analysis.type_of_cancer}\n` +
                `**Paper Type:** ${analysis.paper_type}\n` +
                `**Actionable Events:** ${analysis.actionable_events.join(', ')}\n` +
                `**Overall Points:** ${analysis.overall_points}\n\n` +
                `---\n`
              );
            }
            else if (data.type === 'error') {
              setOutput(current => current + `\nError: ${data.data.message}\n`);
            }
          } catch (e) {
            console.error('Error processing stream chunk:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setOutput('Error retrieving and ranking articles. Please try again.');
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
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Extract
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

            {/* List of actionable events section */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-700">3. List of actionable events</h2>
              </div>
              <div className="min-h-[100px] p-3 bg-gray-50 rounded-lg">
                {extractedEvents.length > 0 ? (
                  <textarea
                    value={extractedEvents.join('" "')}
                    onChange={(e) => {
                      const text = e.target.value;
                      const events = text.split('"').filter(event => event.trim() && event !== ' ');
                      setExtractedEvents(events);
                    }}
                    className="w-full h-24 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-500 italic">Click "Extract" to analyze case notes and generate actionable events.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex-1 bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-700">4. Ranking methodology</h2>
              <button
                onClick={handleRetrieveAndRank}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Retrieve and rank articles
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
                <ReactMarkdown>{output}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Edit Prompt Modal */}
      {isEditingPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-3/4 max-w-4xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Prompt</h2>
              <button 
                onClick={() => setIsEditingPrompt(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <textarea
              value={promptContent}
              onChange={(e) => setPromptContent(e.target.value)}
              className="w-full p-4 border rounded-lg h-[70vh] font-mono text-sm"
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setIsEditingPrompt(false)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Methodology Modal */}
      {isEditingMethodology && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-3/4 max-w-4xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Methodology</h2>
              <button 
                onClick={() => setIsEditingMethodology(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <textarea
              value={methodologyContent}
              onChange={(e) => setMethodologyContent(e.target.value)}
              className="w-full p-4 border rounded-lg h-[70vh] font-mono text-sm"
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setIsEditingMethodology(false)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
