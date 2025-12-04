import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Coffee, LogIn, LogOut, TrendingUp, Users } from 'lucide-react';
import { supabase, PollOption as PollOptionType, Vote } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PollOption } from './PollOption';
import { AddOption } from './AddOption';

type PollProps = {
  onRequireAuth: () => void;
};

export function Poll({ onRequireAuth }: PollProps) {
  const [options, setOptions] = useState<PollOptionType[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const { user, signOut } = useAuth();
  const VOTING_DEADLINE = '2025-12-24T16:30:00+07:00';
  const votingDeadline = useMemo(() => new Date(VOTING_DEADLINE), []);
  const isVotingClosed = now >= votingDeadline;

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

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const handleVote = async (optionId: string) => {
    if (isVotingClosed) {
      alert('Voting sudah ditutup.');
      return;
    }
    if (!user) {
      onRequireAuth();
      return;
    }

    try {
      await supabase.from('votes').insert({
        option_id: optionId,
        user_id: user.id,
        user_email: user.email,
        user_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      });
      await loadData();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleUnvote = async (optionId: string) => {
    if (isVotingClosed) {
      alert('Voting sudah ditutup.');
      return;
    }
    if (!user) {
      onRequireAuth();
      return;
    }

    try {
      await supabase
        .from('votes')
        .delete()
        .eq('option_id', optionId)
        .eq('user_id', user.id);
      await loadData();
    } catch (error) {
      console.error('Error unvoting:', error);
    }
  };

  const getUserVotes = () => {
    if (!user) return [];
    return votes.filter(v => v.user_id === user.id).map(v => v.option_id);
  };

  const getUniqueVoters = () => {
    return new Set(votes.map(v => v.user_id)).size;
  };

  const voteCountByOption = useMemo(() => {
    const map = new Map<string, number>();
    if (votes.length > 0) {
      votes.forEach((vote) => {
        map.set(vote.option_id, (map.get(vote.option_id) || 0) + 1);
      });
    }
    options.forEach((opt) => {
      if (!map.has(opt.id)) {
        map.set(opt.id, opt.vote_count || 0);
      }
    });
    return map;
  }, [votes, options]);

  const totalVotes = useMemo(() => {
    let sum = 0;
    voteCountByOption.forEach((val) => {
      sum += val;
    });
    return sum;
  }, [voteCountByOption]);

  const topOption = useMemo(() => {
    if (options.length === 0) return null;
    return options.reduce<PollOptionType | null>((best, opt) => {
      const current = voteCountByOption.get(opt.id) || 0;
      const bestCount = best ? voteCountByOption.get(best.id) || 0 : -1;
      return current > bestCount ? opt : best;
    }, null);
  }, [options, voteCountByOption]);

  const votesWithOptionNames = useMemo(() => {
    const optionNameMap = new Map(options.map((opt) => [opt.id, opt.name]));
    return votes
      .map((vote) => ({
        ...vote,
        optionName: optionNameMap.get(vote.option_id) || 'Opsi tidak ditemukan',
        votedAt: new Date(vote.created_at),
        displayName:
          vote.user_name ||
          vote.user_email ||
          `User ${vote.user_id.slice(0, 6)}`,
      }))
      .sort((a, b) => b.votedAt.getTime() - a.votedAt.getTime());
  }, [votes, options]);

  const deadlineCountdown = useMemo(() => {
    const diff = votingDeadline.getTime() - now.getTime();
    if (diff <= 0) return 'Voting ditutup';
    const totalMinutes = Math.floor(diff / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return `Sisa ${days}h ${hours}m`;
    if (hours > 0) return `Sisa ${hours}h ${minutes}m`;
    return `Sisa ${minutes}m`;
  }, [now, votingDeadline]);

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
                  84 Coffee Meetup Poll
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <div className="flex items-center bg-orange-50 border border-orange-100 rounded-xl p-3 shadow-inner">
                    <div className="flex flex-col items-center justify-center px-3 py-2 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-lg">
                      <span className="text-[10px] uppercase tracking-[0.25em]">Rabu</span>
                      <span className="text-3xl font-black leading-none">24</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                        <CalendarDays className="w-4 h-4 text-amber-600" />
                        24 Desember 2025
                      </p>
                      <p className="text-sm text-orange-800 font-semibold">16:30 - till drop</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs md:text-sm text-gray-700">
                      Batas voting: 24 Desember 2025 • 16:30 WIB
                    </p>
                    <span className={`inline-flex w-fit px-3 py-1 rounded-full border text-xs md:text-sm ${
                      isVotingClosed
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {deadlineCountdown}
                    </span>
                  </div>
                </div>
                <p className="text-gray-700 text-sm md:text-base mt-3">
                  Kumpul-kumpul ngopi sore, ngobrol santai, dan berburu vibes cozy bareng. Save the date & jamnya biar nggak ketinggalan momen seru!
                </p>
              </div>
            </div>
            {user ? (
              <button
                onClick={() => signOut()}
                className="text-gray-600 hover:text-gray-800 transition p-2"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={onRequireAuth}
                className="flex items-center gap-2 text-amber-700 bg-amber-100 px-3 py-2 rounded-lg font-semibold hover:bg-amber-200 transition"
              >
                <LogIn className="w-4 h-4" />
                Login untuk vote
              </button>
            )}
          </div>

          <div>
             <div className="flex flex-wrap items-center gap-3 mt-2">
                  <div className="flex items-center bg-orange-50 border border-orange-100 rounded-xl p-3 shadow-inner">
                    <div className="flex flex-col items-center justify-center px-3 py-2 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-lg">
                      <span className="text-[10px] uppercase tracking-[0.25em]">Rabu</span>
                      <span className="text-3xl font-black leading-none">24</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                        <CalendarDays className="w-4 h-4 text-amber-600" />
                        24 Desember 2025
                      </p>
                      <p className="text-sm text-orange-800 font-semibold">16:30 - till drop</p>
                    </div>
                  </div>
                </div>
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
              <p className="text-2xl font-bold text-green-900">{totalVotes}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-white border border-amber-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                <span className="font-semibold text-gray-800">Grafik Hasil</span>
              </div>
              {options.length === 0 ? (
                <p className="text-sm text-gray-500">Belum ada data untuk ditampilkan.</p>
              ) : (
                <div className="space-y-3">
              {options.map((option) => {
                const voteCount = voteCountByOption.get(option.id) || 0;
                const percentage = totalVotes === 0
                  ? 0
                  : Math.round((voteCount / totalVotes) * 100);
                return (
                  <div key={option.id}>
                    <div className="flex justify-between text-sm text-gray-700 mb-1">
                      <span className="truncate pr-4">{option.name}</span>
                      <span className="font-semibold">
                        {voteCount} • {percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-amber-50 rounded-full h-3 overflow-hidden">
                      <div
                            className="h-3 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white border border-amber-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-amber-600" />
                <span className="font-semibold text-gray-800">Siapa saja yang vote</span>
              </div>
              {votesWithOptionNames.length === 0 ? (
                <p className="text-sm text-gray-500">Belum ada vote yang masuk.</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {votesWithOptionNames.map((vote) => (
                    <div
                      key={vote.id}
                      className="flex items-start justify-between bg-amber-50 border border-amber-100 rounded-lg p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{vote.displayName}</p>
                        {vote.user_email && (
                          <p className="text-xs text-gray-600 truncate">{vote.user_email}</p>
                        )}
                        <p className="text-sm text-amber-800 mt-1 truncate">
                          {vote.optionName}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 ml-3 whitespace-nowrap">
                        {vote.votedAt.toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
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
          <AddOption onOptionAdded={loadData} onRequireAuth={onRequireAuth} />
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
                voteCount={voteCountByOption.get(option.id) || 0}
                votingClosed={isVotingClosed}
                onVote={handleVote}
                onUnvote={handleUnvote}
              />
            ))
          )}
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          {user ? (
            <p>Logged in as: {user.email}</p>
          ) : (
            <p>Anda belum login. Klik tombol vote untuk mulai masuk.</p>
          )}
        </div>
      </div>
    </div>
  );
}
