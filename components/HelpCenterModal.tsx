'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import publicApi from '@/lib/publicApi';
import toast from 'react-hot-toast';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
}

interface HelpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpCenterModal({ isOpen, onClose }: HelpCenterModalProps) {
  const { theme } = useTheme();
  const [articles, setArticles] = useState<{ [category: string]: HelpArticle[] }>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHelpArticles();
    }
  }, [isOpen]);

  const fetchHelpArticles = async () => {
    setLoading(true);
    try {
      const response = await publicApi.get('/support/help');
      setArticles(response.data.articles);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch help articles:', error);
      toast.error('Failed to load help articles');
    } finally {
      setLoading(false);
    }
  };

  const handleArticleClick = (article: HelpArticle) => {
    setSelectedArticle(article);
  };

  const handleBack = () => {
    setSelectedArticle(null);
  };

  const handleContactSupport = () => {
    // Get the first admin email from environment or use a default
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'support@tarpup.com';
    const subject = encodeURIComponent('Support Request - TarpUp');
    const body = encodeURIComponent('Hello,\n\nI need help with...\n\nThank you!');
    
    // Open the default email client
    window.location.href = `mailto:${adminEmail}?subject=${subject}&body=${body}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {selectedArticle && (
              <button
                onClick={handleBack}
                className="w-8 h-8 rounded-full flex items-center justify-center transition hover:bg-gray-100 text-gray-500"
              >
                ←
              </button>
            )}
            <h2 className="text-xl font-bold text-black">
              {selectedArticle ? selectedArticle.title : 'Help Center'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition hover:bg-gray-100 text-gray-500"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          ) : selectedArticle ? (
            /* Article Content */
            <div className="space-y-4">
              <div className="text-sm leading-relaxed text-gray-700">
                {selectedArticle.content.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            /* Articles List */
            <div className="space-y-6">
              {categories.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">
                    No help articles available
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-black">
                      Common Questions
                    </h3>
                    <div className="space-y-2">
                      {categories.map((category) => 
                        articles[category]?.map((article) => (
                          <button
                            key={article.id}
                            onClick={() => handleArticleClick(article)}
                            className="w-full text-left p-4 rounded-xl transition flex items-center justify-between hover:bg-gray-50 text-gray-700"
                          >
                            <span>{article.title}</span>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Contact Support Section */}
                  <div className="rounded-2xl p-6 bg-blue-50">
                    <h4 className="text-lg font-semibold mb-2 text-blue-900">
                      Need more help?
                    </h4>
                    <p className="text-sm mb-4 text-blue-700">
                      Our support team is available 24/7.
                    </p>
                    <button 
                      onClick={handleContactSupport}
                      className="bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-600 transition"
                    >
                      Contact Support
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}