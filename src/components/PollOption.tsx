import { useState } from 'react';
import { MapPin, Vote, Check, Trash2 } from 'lucide-react';
import { PollOption as PollOptionType } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Props = {
  option: PollOptionType;
  hasVoted: boolean;
  onVote: (optionId: string) => Promise<void>;
  onUnvote: (optionId: string) => Promise<void>;
  onDelete?: (optionId: string) => Promise<void>;
  canDelete: boolean;
};

export function PollOption({ option, hasVoted, onVote, onUnvote, onDelete, canDelete }: Props) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleVoteToggle = async () => {
    setLoading(true);
    try {
      if (hasVoted) {
        await onUnvote(option.id);
      } else {
        await onVote(option.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (onDelete && confirm('Hapus opsi ini?')) {
      setLoading(true);
      try {
        await onDelete(option.id);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className={`bg-white rounded-xl p-5 border-2 transition-all ${
      hasVoted
        ? 'border-amber-500 shadow-md'
        : 'border-gray-200 hover:border-amber-300 hover:shadow-sm'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-gray-800 mb-2 truncate">
            {option.name}
          </h3>
          <div className="flex items-start gap-2 text-gray-600 mb-3">
            <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
            <p className="text-sm break-words">{option.location}</p>
          </div>
          {option.map_url && (
            <a
              href={option.map_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 underline inline-block mb-3"
            >
              Lihat di Maps
            </a>
          )}
          <div className="flex items-center gap-2">
            <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
              {option.vote_count} vote{option.vote_count !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleVoteToggle}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
              hasVoted
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } disabled:opacity-50`}
          >
            {hasVoted ? (
              <>
                <Check className="w-4 h-4" />
                Voted
              </>
            ) : (
              <>
                <Vote className="w-4 h-4" />
                Vote
              </>
            )}
          </button>

          {canDelete && onDelete && (
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
