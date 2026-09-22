'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/provider';
import { useToast } from '@/components/ui/toast';
import { Button, Card, ErrorNote, Textarea } from '@/components/ui';
import { cn, errorMessage } from '@/lib/utils';

export function ReviewForm({
  jobId,
  reviewerId,
  revieweeId,
  revieweeName,
  onSubmitted,
}: {
  jobId: string;
  reviewerId: string;
  revieweeId: string;
  revieweeName: string;
  onSubmitted: () => void;
}) {
  const { dict, fill } = useI18n();
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setLoading(true);
    setError(null);

    const { error: writeError } = await createClient().from('reviews').insert({
      job_id: jobId,
      reviewer_id: reviewerId,
      reviewee_id: revieweeId,
      rating,
      comment: comment.trim() || null,
    });

    if (writeError) {
      setError(errorMessage(writeError, dict.common.error));
      setLoading(false);
      return;
    }

    toast.success(dict.review.submitted);
    onSubmitted();
  };

  return (
    <Card className="p-5">
      <h2 className="font-semibold">{dict.review.title}</h2>
      <p className="mt-1 text-sm text-muted">
        {fill(dict.review.ratePrompt, { name: revieweeName })}
      </p>

      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHovered(n)}
              aria-label={`${n}`}
              className="p-1"
            >
              <Star
                className={cn(
                  'size-7 transition-colors',
                  n <= (hovered || rating)
                    ? 'fill-urgent text-urgent'
                    : 'text-muted/40',
                )}
              />
            </button>
          ))}
        </div>

        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={dict.review.commentPlaceholder}
          maxLength={600}
          className="min-h-20"
          aria-label={dict.review.comment}
        />

        <ErrorNote>{error}</ErrorNote>

        <Button type="submit" disabled={rating === 0} loading={loading} fullWidth>
          {dict.review.submit}
        </Button>
      </form>
    </Card>
  );
}
