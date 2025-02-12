const API_BASE_URL = 'https://us-central1-gemini-med-lit-review.cloudfunctions.net';

export const extractDisease = async (text) => {
  try {
    const response = await fetch(`${API_BASE_URL}/pubmed-search-tester-extract-disease`, {
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
    return data.trim();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

export const extractEvents = async (text, promptContent) => {
  try {
    const response = await fetch(`${API_BASE_URL}/pubmed-search-tester-extract-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: `${promptContent}\n\nCase input:\n${text}` }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.text();
    return data.split('"').filter(event => event.trim() && event !== ' ');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

export const retrieveAndRankArticles = async (eventsText, methodologyContent, disease, onProgress) => {
  try {
    const response = await fetch(`${API_BASE_URL}/pubmed-search-tester-analyze-articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        events_text: eventsText,
        methodology_content: methodologyContent,
        disease: disease
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value);

      while (buffer.includes('\n')) {
        const newlineIndex = buffer.indexOf('\n');
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        if (!line.trim()) continue;

        try {
          const data = JSON.parse(line);
          onProgress(data);
        } catch (e) {
          console.error('Error processing stream chunk:', e);
          console.error('Line that caused error:', line);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
