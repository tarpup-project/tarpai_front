import { useState, useEffect } from 'react';
import Image from 'next/image';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface EditRepostModalProps {
  isOpen: boolean;
  status: any;
  onClose: () => void;
  onSuccess?: () => void;
  initialContent?: string;
  theme?: string;
}

export default function EditRepostModal({
  isOpen,
  status,
  onClose,
  onSuccess,
  initialContent,
  theme = 'light',
}: EditRepostModalProps) {
  const [repostContent, setRepostContent] = useState('');
  const [isReposting, setIsReposting] = useState(false);

  // Helper function to count words
  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Update content when modal opens or status changes
  useEffect(() => {
    if (isOpen && status) {
      setRepostContent(initialContent || status?.content || '');
    }
  }, [isOpen, status, initialContent]);

  const handleConfirmRepost = async () => {
    if (!status) return;

    // Check word limit when images are present
    if (status?.images && status.images.length > 0 && !!repostContent.trim()) {
      const wordCount = countWords(repostContent);
      if (wordCount > 30) {
        toast.error('Caption must be 30 words or less when images are uploaded');
        return;
      }
    }

    setIsReposting(true);
    try {
      const formData = new FormData();
      formData.append('content', repostContent?.trim() || '');

      await api.post(`/status/${status.id}/edit-repost`, formData);
      toast.success('Reposted with edits successfully!');
      onClose();
      setRepostContent('');
      onSuccess?.();
    } catch (error) {
      console.error('Failed to repost:', error);
      toast.error('Failed to repost');
    } finally {
      setIsReposting(false);
    }
  };

  const handleClose = () => {
    setRepostContent('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Edit & Repost</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content Editor */}
        <div className="mb-6">
          <textarea
            value={repostContent}
            onChange={(e) => setRepostContent(e.target.value)}
            className="w-full bg-gray-100 text-gray-700 rounded-2xl p-4 min-h-[160px] focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none text-base placeholder-gray-500"
            placeholder="Add your thoughts..."
          />
          {/* Word count indicator when images are present */}
          {status?.images && status.images.length > 0 && !!repostContent.trim() && (
            <div className="flex justify-between items-center mt-2 px-2">
              <span className={`text-sm ${
                countWords(repostContent) > 30 ? 'text-red-500' : 'text-gray-500'
              }`}>
                {countWords(repostContent)}/30 words
              </span>
              {countWords(repostContent) > 30 && (
                <span className="text-red-500 text-sm">Caption too long for images</span>
              )}
            </div>
          )}
        </div>

        {/* Attachments Section */}
        {status?.images && status.images.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-600 mb-3">ATTACHMENTS</p>
            <div className="grid grid-cols-4 gap-3">
              {status.images.map((img: string, idx: number) => (
                <div key={idx} className="relative">
                  <Image
                    src={img}
                    alt={`Attachment ${idx + 1}`}
                    width={100}
                    height={100}
                    className="w-full h-24 object-cover rounded-2xl"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirm Button */}
        <button
          onClick={handleConfirmRepost}
          disabled={
            isReposting || 
            (status?.images && status.images.length > 0 && !!repostContent.trim() && countWords(repostContent) > 30)
          }
          className="w-full bg-black text-white py-3 rounded-2xl font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isReposting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Reposting...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4"
                />
              </svg>
              Confirm Repost
            </>
          )}
        </button>
      </div>
    </div>
  );
}
