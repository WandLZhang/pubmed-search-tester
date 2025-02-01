import React, { useState } from 'react';
import ArticleModal from './modals/ArticleModal';

const TestTable = () => {
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
                  <div class="text-4xl font-bold text-blue-600">${points} Points</div>
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
  const articles = [
    {
      title: "KMT2A-rearranged AML Study",
      fullText: "Background: KMT2A-rearranged AML has poor prognosis in pediatric patients. Methods: We conducted a phase 2 trial of menin inhibitor revumenib. Results: The study showed ORR of 59% and CR of 33% in newly diagnosed and R/R AML",
      points: 190,
      pointsBreakdown: "Clinical Study: +15"
    },
    {
      title: "Venetoclax Treatment Case",
      fullText: "Case Report: A 4-year-old patient with refractory AML was treated with venetoclax combination therapy. The patient achieved complete remission but relapsed after 6 months",
      points: 65,
      pointsBreakdown: "Case Report: +5"
    }
  ];

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Test Table with Tooltips</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="px-4 py-2 text-sm border-t font-semibold text-gray-600 uppercase tracking-wider bg-gray-100">
                Title
              </th>
              <th className="px-4 py-2 text-sm border-t font-semibold text-gray-600 uppercase tracking-wider bg-gray-100">
                Full Article
              </th>
              <th className="px-4 py-2 text-sm border-t font-semibold text-gray-600 uppercase tracking-wider bg-gray-100">
                Points
              </th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article, index) => (
              <tr key={index}>
                <td className="px-4 py-2 text-sm border-t text-gray-500">
                  {article.title}
                </td>
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
                    onClick={() => openInNewWindow([article.points, article.pointsBreakdown], 'points')}
                    className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
                  >
                    {article.points} <span className="text-blue-500">ℹ️</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TestTable;
