import { useEffect, useState } from 'react';
import { Coffee, LogOut, TrendingUp, Users } from 'lucide-react';
import { supabase, PollOption as PollOptionType, Vote } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PollOption } from './PollOption';
import { AddOption } from './AddOption';

export function Poll() {
  const [options, setOptions] = useState<PollOptionType[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, signOut } = useAuth();

  const loadData = async () => {
    try {
      const [optionsResult, votesResult] = await Promise.all([
        supabase
          .from('poll_options')
          .select('*')
          .order('vote_count', { ascending: false }),
        supabase
          .from('votes')
          .select('*'),
      ]);

      if (optionsResult.data) setOptions(optionsResult.data);
      if (votesResult.data) setVotes(votesResult.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const optionsChannel = supabase
      .channel('poll_options_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poll_options' },
        () => {
          loadData();
        }
      )
      .subscribe();

    const votesChannel = supabase
      .channel('votes_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      optionsChannel.unsubscribe();
      votesChannel.unsubscribe();
    };
  }, []);

  const handleVote = async (optionId: string) => {
    try {
      await supabase.from('votes').insert({
        option_id: optionId,
        user_id: user!.id,
      });
      await loadData();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleUnvote = async (optionId: string) => {
    try {
      await supabase
        .from('votes')
        .delete()
        .eq('option_id', optionId)
        .eq('user_id', user!.id);
      await loadData();
    } catch (error) {
      console.error('Error unvoting:', error);
    }
  };

  const handleDelete = async (optionId: string) => {
    try {
      await supabase.from('poll_options').delete().eq('id', optionId);
      await loadData();
    } catch (error) {
      console.error('Error deleting option:', error);
    }
  };

  const getUserVotes = () => {
    return votes.filter(v => v.user_id === user!.id).map(v => v.option_id);
  };

  const getTotalVotes = () => {
    return votes.length;
  };

  const getUniqueVoters = () => {
    return new Set(votes.map(v => v.user_id)).size;
  };

  const topOption = options[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center">
        <div className="text-center">
          <Coffee className="w-12 h-12 text-amber-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-xl">
                <Coffee className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                  Coffee Meetup Poll
                </h1>
                <p className="text-gray-600 text-sm md:text-base">
                  24 Desember 2025 • 18:00 WIB
                </p>
                <p className="text-xs md:text-sm text-gray-500">till drop</p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="text-gray-600 hover:text-gray-800 transition p-2"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-800 mb-1">
                <Coffee className="w-4 h-4" />
                <span className="text-sm font-medium">Total Opsi</span>
              </div>
              <p className="text-2xl font-bold text-amber-900">{options.length}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-800 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Voters</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{getUniqueVoters()}</p>
            </div>
            <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-xl p-4 col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 text-green-800 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Total Votes</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{getTotalVotes()}</p>
            </div>
          </div>

          {topOption && topOption.vote_count > 0 && (
            <div className="mt-6 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="font-semibold">Leading Option</span>
              </div>
              <p className="text-xl font-bold">{topOption.name}</p>
              <p className="text-sm opacity-90">{topOption.location}</p>
              <p className="text-sm mt-2 font-medium">
                {topOption.vote_count} vote{topOption.vote_count !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        <div className="mb-6">
          <AddOption onOptionAdded={loadData} />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 px-2">
            Pilih Tempat Favorit Kamu ({options.length} opsi)
          </h2>

          {options.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <Coffee className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Belum ada opsi. Jadi yang pertama usulkan tempat!
              </p>
            </div>
          ) : (
            options.map((option) => (
              <PollOption
                key={option.id}
                option={option}
                hasVoted={getUserVotes().includes(option.id)}
                onVote={handleVote}
                onUnvote={handleUnvote}
                onDelete={handleDelete}
                canDelete={option.created_by === user!.id}
              />
            ))
          )}
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Logged in as: {user?.email}</p>
        </div>
      </div>
    </div>
  );
}
