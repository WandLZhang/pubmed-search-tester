import functions_framework
from flask import jsonify, request, Response
from google import genai
from google.genai import types
from google.cloud import bigquery
import json
import logging
import time

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

def calculate_points(metadata):
    """Calculate points based on article metadata and return both total and breakdown."""
    points = 0
    breakdown = {}
    
    # Pediatric Focus: +10 points
    if metadata.get('pediatric_focus'):
        points += 10
        breakdown['pediatric_focus'] = 10
    
    # Paper Type: +10 points for clinical trial, -5 points for review
    paper_type = metadata.get('paper_type', '').lower()
    if 'clinical trial' in paper_type:
        points += 10
        breakdown['paper_type'] = 10
    elif 'review' in paper_type:
        points -= 5
        breakdown['paper_type'] = -5
    
    # Actionable Events: +5 points per event
    actionable_events = metadata.get('actionable_events', [])
    if actionable_events:
        event_points = len(actionable_events) * 5
        points += event_points
        breakdown['actionable_events'] = event_points
    
    # Drugs Tested: +5 points
    if metadata.get('drugs_tested'):
        points += 5
        breakdown['drugs_tested'] = 5
    
    # Drug Results: +5 points per result
    drug_results = metadata.get('drug_results', [])
    if drug_results:
        result_points = len(drug_results) * 5
        points += result_points
        breakdown['drug_results'] = result_points
    
    # Cell Studies: +5 points
    if metadata.get('cell_studies'):
        points += 5
        breakdown['cell_studies'] = 5
    
    # Mice Studies: +10 points
    if metadata.get('mice_studies'):
        points += 10
        breakdown['mice_studies'] = 10
    
    # Case Report: +5 points
    if metadata.get('case_report'):
        points += 5
        breakdown['case_report'] = 5
    
    # Series of Case Reports: +10 points
    if metadata.get('series_of_case_reports'):
        points += 10
        breakdown['series_of_case_reports'] = 10
    
    # Clinical Study: +15 points
    if metadata.get('clinical_study'):
        points += 15
        breakdown['clinical_study'] = 15
    
    # Clinical Study on Children: +20 points
    if metadata.get('clinical_study_on_children'):
        points += 20
        breakdown['clinical_study_on_children'] = 20
    
    # Novelty: +10 points
    if metadata.get('novelty'):
        points += 10
        breakdown['novelty'] = 10
    
    return points, breakdown

def create_gemini_prompt(article_text, pmid, methodology_content=None):
    # Default methodology if none provided
    if not methodology_content:
        methodology_content = """You are an expert pediatric oncologist and you are the chair of the International Leukemia Tumor Board. Your goal is to evaluate full research articles related to oncology, especially those concerning pediatric leukemia, to identify potential advancements in treatment and understanding of the disease.

<Article>
{article}
</Article>

<Instructions>
Your task is to read the provided full article and extract key information, and then assess the article's relevance and potential impact. You will generate a JSON object containing metadata and analysis. Please use a consistent JSON structure.

Please analyze the article and provide a JSON response with the following structure:

{
  "article_metadata": {
    "title": "...",
    "year": "...",
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
    "novelty": true/false
  }
}

Important: The response must be valid JSON and follow this exact structure. Do not include any explanatory text, markdown formatting, or code blocks. Return only the raw JSON object."""

    # Log the article text format
    logger.info(f"Article text to be inserted:\n{article_text}")
    
    # Replace article placeholder with actual text
    prompt = methodology_content.replace("{article}", article_text)
    
    # Log the final prompt
    logger.info(f"Final prompt with article inserted:\n{prompt}")
    
    return prompt

def analyze_with_gemini(article_text, pmid, methodology_content=None):
    # Create prompt with JSON-only instruction
    prompt = create_gemini_prompt(article_text, pmid, methodology_content)
    prompt += "\n\nIMPORTANT: Return ONLY the raw JSON object. Do not include any explanatory text, markdown formatting, or code blocks. The response should start with '{' and end with '}' with no other characters before or after."
    
    # Configure Gemini
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
    
    # Create content with prompt
    contents = [types.Content(role="user", parts=[{"text": prompt}])]
    
    # Initialize retry parameters
    base_delay = 5  # Start with 5 seconds
    attempt = 0
    
    while True:  # Keep trying indefinitely
        try:
            response = client.models.generate_content(
                model=model,
                contents=contents,
                config=generate_content_config,
            )
            break  # If successful, break out of the retry loop
        except Exception as e:
            error_str = str(e)
            if "429 RESOURCE_EXHAUSTED" in error_str:
                attempt += 1
                # Calculate exponential backoff delay with a maximum of 5 minutes
                delay = min(base_delay * (2 ** (attempt - 1)), 300)  # Cap at 300 seconds (5 minutes)
                print(f"Received RESOURCE_EXHAUSTED error. Attempt {attempt}. Waiting {delay} seconds before retry...")
                time.sleep(delay)
            else:
                # If it's not a 429 error, raise immediately
                raise
    
    try:
        # Log Gemini's raw response with clear markers
        logger.info("========== RAW GEMINI RESPONSE START ==========")
        logger.info(response.text)
        logger.info("========== RAW GEMINI RESPONSE END ============")
        
        # Clean up response text
        text = response.text.strip()
        
        # Try to find JSON object
        try:
            # First try to find JSON between ```json and ``` markers
            if '```json' in text:
                text = text.split('```json')[1].split('```')[0].strip()
            # If that fails, try to find JSON between { and }
            elif '{' in text and '}' in text:
                start = text.find('{')
                end = text.rfind('}') + 1
                text = text[start:end]
            
            # Remove any non-JSON text before or after
            text = text.strip()
            
            # Log cleaned text before parsing
            logger.info("========== CLEANED TEXT START ==========")
            logger.info(text)
            logger.info("========== CLEANED TEXT END ============")
            
            # Try to parse as JSON
            try:
                analysis = json.loads(text)
                logger.info("Successfully parsed JSON")
            except json.JSONDecodeError as e:
                logger.error(f"JSON parse error at position {e.pos}: {e.msg}")
                logger.error(f"Error context: {text[max(0, e.pos-50):min(len(text), e.pos+50)]}")
                raise
            
            # Validate required fields
            if not isinstance(analysis, dict) or 'article_metadata' not in analysis:
                logger.error("Invalid JSON structure - missing article_metadata")
                return None
                
            metadata = analysis['article_metadata']
            required_fields = ['title', 'cancer_focus', 'type_of_cancer', 'paper_type', 'actionable_events']
            for field in required_fields:
                if field not in metadata:
                    logger.error(f"Invalid JSON structure - missing {field}")
                    return None
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {str(e)}")
            logger.error(f"Cleaned response was: {text}")
            return None
        
        # Process metadata and calculate points
        if 'article_metadata' in analysis:
            metadata = analysis['article_metadata']
            # Add PMID and generate link
            metadata['PMID'] = pmid
            metadata['link'] = f'https://pubmed.ncbi.nlm.nih.gov/{pmid}/'
            
            # Calculate points
            points, point_breakdown = calculate_points(metadata)
            metadata['overall_points'] = points
            metadata['point_breakdown'] = point_breakdown
            
            # Store full article text at top level
            analysis['full_article_text'] = article_text
            logger.info("Added full article text and calculated points")
        
        return analysis
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

def stream_response(events_text, methodology_content=None):
    try:
        # Execute BigQuery
        # Execute BigQuery and log results
        query = create_bq_query(events_text)
        query_job = bq_client.query(query)
        results = list(query_job.result())
        total_articles = len(results)
        
        # Print array of PMIDs from BigQuery results
        pmids = [row['name'] for row in results]
        print(f"Retrieved PMIDs: {pmids}")

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
            
            # Log article details before analysis
            logger.info(f"Processing article:\nPMID: {pmid}\nContent length: {len(content)}\nFirst 200 chars: {content[:200]}")
            
            # Add delay between articles
            if idx > 1:  # Don't delay for first article
                logger.info("Waiting 5 seconds before next analysis...")
                time.sleep(5)
            
            # Analyze with Gemini and prepare complete response object
            try:
                analysis = analyze_with_gemini(content, pmid, methodology_content)
                if analysis:
                    # Create complete response object
                    response_obj = {
                        "type": "article_analysis",
                        "data": {
                            "progress": {
                                "article_number": idx,
                                "total_articles": total_articles
                            },
                            "analysis": analysis
                        }
                    }
                    # Send complete JSON object with newline
                    yield json.dumps(response_obj) + "\n"
                else:
                    logger.error(f"Failed to analyze article {pmid}")
                    error_obj = {
                        "type": "error",
                        "data": {
                            "message": f"Failed to analyze article {pmid}",
                            "article_number": idx,
                            "total_articles": total_articles
                        }
                    }
                    yield json.dumps(error_obj) + "\n"
            except Exception as e:
                logger.error(f"Error processing article {pmid}: {str(e)}")
                yield json.dumps({
                    "type": "error",
                    "data": {
                        "message": f"Error processing article {pmid}: {str(e)}",
                        "article_number": idx,
                        "total_articles": total_articles
                    }
                }) + "\n"

        # Send completion message as complete JSON object
        completion_obj = {
            "type": "metadata",
            "data": {
                "total_articles": total_articles,
                "current_article": total_articles,
                "status": "complete"
            }
        }
        yield json.dumps(completion_obj) + "\n"

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

        # Get methodology content if provided
        methodology_content = request_json.get('methodology_content')

        return Response(
            stream_response(events_text, methodology_content),
            headers=headers,
            mimetype='text/event-stream'
        )

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return jsonify({"error": str(e)}), 500, headers

if __name__ == "__main__":
    app = functions_framework.create_app(target="analyze_articles")
    app.run(host="0.0.0.0", port=8080, debug=True)
