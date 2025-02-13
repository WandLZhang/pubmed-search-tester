import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ArticleTable = ({ articles, currentArticle, totalArticles }) => {
  const openInNewWindow = (content, type) => {
    const width = 800;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const newWindow = window.open('', '_blank', 
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    );
    
    if (type === 'article') {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Full Article</title>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body>
            <div class="min-h-screen bg-gray-50 py-8 px-4">
              <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
                <button onclick="window.close()" class="mb-4 text-blue-500 hover:text-blue-700">← Back to Table</button>
                <div class="prose max-w-none">
                  <p class="whitespace-pre-wrap text-gray-700 text-lg leading-relaxed">${content}</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
    } else {
      const [points, breakdown] = content;
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Points Details</title>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body>
            <div class="min-h-screen bg-gray-50 py-8 px-4">
              <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
                <button onclick="window.close()" class="mb-4 text-blue-500 hover:text-blue-700">← Back to Table</button>
                <div class="space-y-4">
                  <h2 class="text-2xl font-bold text-gray-800">Points Details</h2>
                  <div class="text-4xl font-bold text-blue-600">${Math.round(points)} Points</div>
                  <div class="space-y-2">
                    ${breakdown.split(' | ').map(item => {
                      const [label, value] = item.split(': ');
                      return `
                        <div class="flex justify-between items-center py-2 border-b">
                          <span class="text-gray-600">${label}</span>
                          <span class="font-semibold ${value.startsWith('+') ? 'text-green-600' : 'text-red-600'}">${value}</span>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
    }
    newWindow.document.close();
  };

  const sortedArticles = articles.sort((a, b) => b.points - a.points);

  return (
    <div className="overflow-x-scroll" style={{ maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      {currentArticle && (
        <div className="mb-4">
          Processing article {currentArticle} of {totalArticles}
        </div>
      )}
      <table className="min-w-max bg-white border border-gray-300" style={{ minWidth: '150%' }}>
        <thead>
          <tr>
            <th className="px-4 py-2 text-sm border-t font-semibold text-gray-600 uppercase tracking-wider bg-gray-100">PMID</th>
            <th className="px-4 py-2 text-sm border-t font-semibold text-gray-600 uppercase tracking-wider bg-gray-100">Title</th>
            <th className="px-4 py-2 text-sm border-t font-semibold text-gray-600 uppercase tracking-wider bg-gray-100">Year</th>
            <th className="px-4 py-2 text-sm border-t font-semibold text-gray-600 uppercase tracking-wider bg-gray-100">Type of Cancer</th>
            <th className="px-4 py-2 text-sm border-t font-semibold text-gray-600 uppercase tracking-wider bg-gray-100">Paper Type</th>
            <th className="px-4 py-2 text-sm border-t font-semibold text-gray-600 uppercase tracking-wider bg-gray-100">Actionable Events</th>
            <th className="px-4 py-2 text-sm border-t font-semibold text-gray-600 uppercase tracking-wider bg-gray-100">Drugs Tested</th>
            <th className="px-4 py-2 text-sm border-t font-semibold text-gray-600 uppercase tracking-wider bg-gray-100">Drug Results</th>
            <th className="px-4 py-2 text-sm border-t font-semibold text-gray-600 uppercase tracking-wider bg-gray-100">Full Article</th>
            <th className="px-4 py-2 text-sm border-t font-semibold text-gray-600 uppercase tracking-wider bg-gray-100">Points</th>
          </tr>
        </thead>
        <tbody>
          {sortedArticles.map((article, index) => {
            const pointsBreakdown = Object.entries(article.point_breakdown || {})
              .map(([k,v]) => `${k.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}: ${v > 0 ? '+' : ''}${v}`)
              .join(' | ');

            return (
              <tr key={index}>
                <td className="px-4 py-2 text-sm border-t text-gray-500">
                  <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    {article.pmid}
                  </a>
                </td>
                <td className="px-4 py-2 text-sm border-t text-gray-500">{article.title}</td>
                <td className="px-4 py-2 text-sm border-t text-gray-500">{article.year}</td>
                <td className="px-4 py-2 text-sm border-t text-gray-500">{article.cancer}</td>
                <td className="px-4 py-2 text-sm border-t text-gray-500">{article.type}</td>
                <td className="px-4 py-2 text-sm border-t text-gray-500">
                  {article.events.map((event, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && ', '}
                      <span className={event.matches_query ? 'font-bold text-green-600' : ''}>
                        {event.event}
                      </span>
                    </React.Fragment>
                  ))}
                </td>
                <td className="px-4 py-2 text-sm border-t text-gray-500">{article.drugs_tested ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-sm border-t text-gray-500">{article.drug_results?.join(', ') || 'None'}</td>
                <td className="px-4 py-2 text-sm border-t text-gray-500">
                  <button
                    onClick={() => openInNewWindow(article.fullText, 'article')}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    View Article
                  </button>
                </td>
                <td className="px-4 py-2 text-sm border-t text-gray-500">
                  <button
                    onClick={() => openInNewWindow([article.points, pointsBreakdown], 'points')}
                    className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
                  >
                    <span className="font-bold">{Math.round(article.points)}</span>
                    <span className="text-blue-500">ℹ️</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ArticleTable;
