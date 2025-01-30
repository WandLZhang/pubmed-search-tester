import functions_framework
from flask import jsonify, request, Response
from google import genai
from google.genai import types
from google.cloud import bigquery
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize clients
client = genai.Client(
    vertexai=True,
    project="gemini-med-lit-review",
    location="us-central1",
)
bq_client = bigquery.Client(project="playground-439016")

def create_gemini_prompt(article_text):
    return f"""You are an expert pediatric oncologist and you are the chair of the International Leukemia Tumor Board. Your goal is to evaluate full research articles related to oncology, especially those concerning pediatric leukemia, to identify potential advancements in treatment and understanding of the disease.

<Article>
{article_text}
</Article>

<Instructions>
Your task is to read the provided full article and extract key information, and then assess the article's relevance and potential impact. You will generate a JSON object containing metadata, a point-based assessment of the article's value, and the full text. Please use a consistent JSON structure.

The scoring system will assess the following (not necessarily exhaustive and inferred):
*   **Clinical Relevance:** Clinical trials score highest, followed by case reports with therapeutic interventions. Basic case reports score low. The ultimate goal is to improve patient outcomes.
*   **Pediatric Focus:** Articles that focus specifically on pediatric oncology receive a bonus.
*   **Drug Testing:** Studies that involve drug testing (especially on patients or model systems, PDX is higher than just cell lines) are prioritized.
*   **Specific Findings:** Articles that report specific actionable events are given more points.
*   **Novelty:** Novel mechanisms or therapeutic avenues receive higher points.

Please analyze the article and provide a JSON response with the following structure:

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

Important: The response must be valid JSON and follow this exact structure."""

def analyze_with_gemini(article_text):
    try:
        contents = [
            types.Content(
                role="user",
                parts=[{"text": create_gemini_prompt(article_text)}]
            )
        ]

        model = "gemini-2.0-flash-exp"
        generate_content_config = types.GenerateContentConfig(
            temperature=0,
            top_p=0.95,
            candidate_count=1,
            max_output_tokens=8192,
            response_modalities=["TEXT"],
            safety_settings=[
                types.SafetySetting(category=cat, threshold="OFF")
                for cat in ["HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_DANGEROUS_CONTENT", 
                          "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_HARASSMENT"]
            ]
        )

        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=generate_content_config,
        )
        
        return json.loads(response.text)
    except Exception as e:
        logger.error(f"Error analyzing article with Gemini: {str(e)}")
        return None

def create_bq_query(events_text):
    return f"""
    DECLARE query_text STRING;
    SET query_text = \"\"\"
    {events_text}
    \"\"\";

    WITH query_embedding AS (
      SELECT ml_generate_embedding_result AS embedding_col
      FROM ML.GENERATE_EMBEDDING(
        MODEL `playground-439016.pmid_uscentral.textembed`,
        (SELECT query_text AS content),
        STRUCT(TRUE AS flatten_json_output)
      )
    )
    SELECT 
      base.name,
      base.content,
      distance
    FROM VECTOR_SEARCH(
      TABLE `playground-439016.pmid_uscentral.pmid_embed_nonzero`,
      'ml_generate_embedding_result',
      (SELECT embedding_col FROM query_embedding),
      top_k => 15
    ) results
    JOIN `playground-439016.pmid_uscentral.pmid_embed_nonzero` base 
    ON results.base.name = base.name
    ORDER BY distance ASC;
    """

def stream_response(events_text):
    try:
        # Execute BigQuery
        query = create_bq_query(events_text)
        query_job = bq_client.query(query)
        results = list(query_job.result())
        total_articles = len(results)

        # Stream initial metadata
        yield json.dumps({
            "type": "metadata",
            "data": {
                "total_articles": total_articles,
                "current_article": 0,
                "status": "processing"
            }
        }) + "\n"

        # Process each article
        for idx, row in enumerate(results, 1):
            pmid = row['name']
            content = row['content']
            
            # Analyze with Gemini
            analysis = analyze_with_gemini(content)
            if analysis:
                yield json.dumps({
                    "type": "article_analysis",
                    "data": {
                        "progress": {
                            "article_number": idx,
                            "total_articles": total_articles
                        },
                        "analysis": analysis
                    }
                }) + "\n"

        # Stream completion message
        yield json.dumps({
            "type": "metadata",
            "data": {
                "total_articles": total_articles,
                "current_article": total_articles,
                "status": "complete"
            }
        }) + "\n"

    except Exception as e:
        logger.error(f"Error in stream_response: {str(e)}")
        yield json.dumps({
            "type": "error",
            "data": {
                "message": str(e)
            }
        }) + "\n"

@functions_framework.http
def analyze_articles(request):
    # Enable CORS
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    }

    try:
        request_json = request.get_json()
        if not request_json:
            return jsonify({'error': 'No JSON data received'}), 400, headers

        events_text = request_json.get('events_text')
        if not events_text:
            return jsonify({'error': 'Missing events_text field'}), 400, headers

        return Response(
            stream_response(events_text),
            headers=headers,
            mimetype='text/event-stream'
        )

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return jsonify({"error": str(e)}), 500, headers

if __name__ == "__main__":
    app = functions_framework.create_app(target="analyze_articles")
    app.run(host="0.0.0.0", port=8080, debug=True)
