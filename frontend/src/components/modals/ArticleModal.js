import React from 'react';
import { X } from 'lucide-react';

const ArticleModal = ({ isOpen, onClose, article }) => {
  if (!isOpen || !article) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-11/12 max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-end p-4 border-b">
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap">{article.fullText}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleModal;
