'use client';

import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import publicApi from '@/lib/publicApi';
import toast from 'react-hot-toast';

interface SendFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SendFeedbackModal({ isOpen, onClose }: SendFeedbackModalProps) {
  const { theme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleStarClick = (starRating: number) => {
    setRating(starRating);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!message.trim()) {
      toast.error('Please enter your feedback');
      return;
    }

    if (!user && !email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setSubmitting(true);
    try {
      await publicApi.post('/support/feedback', {
        rating,
        message: message.trim(),
        email: !user ? email.trim() : undefined,
      });

      toast.success('Feedback submitted successfully!');
      onClose();
      // Reset form
      setRating(0);
      setMessage('');
      setEmail('');
    } catch (error: any) {
      console.error('Failed to submit feedback:', error);
      toast.error(error.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setRating(0);
    setMessage('');
    setEmail('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="rounded-3xl w-full max-w-md overflow-hidden bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-black">
            Send Feedback
          </h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition hover:bg-gray-100 text-gray-500"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Star Rating */}
          <div className="text-center">
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleStarClick(star)}
                  className="text-4xl transition-colors duration-200"
                >
                  <span className={star <= rating ? 'text-yellow-400' : 'text-gray-300'}>
                    ★
                  </span>
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-gray-600">
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </p>
            )}
          </div>

          {/* Email Input (only for non-authenticated users) */}
          {!user && (
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Email (optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 border-gray-200 text-black"
              />
            </div>
          )}

          {/* Message Input */}
          <div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you think..."
              rows={6}
              className="w-full px-4 py-3 rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50 border-gray-200 text-black placeholder-gray-400"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={submitting || rating === 0 || !message.trim()}
            className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Sending...' : 'Send Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
}