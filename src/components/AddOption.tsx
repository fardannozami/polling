import { useState } from 'react';
import { PlusCircle, X, MapPin, Coffee } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Props = {
  onOptionAdded: () => void;
  onRequireAuth: () => void;
};

export function AddOption({ onOptionAdded, onRequireAuth }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      onRequireAuth();
      return;
    }

    if (!mapUrl.trim()) {
      setError('Link Google Maps wajib diisi');
      return;
    }

    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from('poll_options')
        .insert({
          name,
          location,
          map_url: mapUrl || null,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      setName('');
      setLocation('');
      setMapUrl('');
      setIsOpen(false);
      onOptionAdded();
    } catch (err: any) {
      setError(err.message || 'Gagal menambahkan opsi');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    const handleOpen = () => {
      if (!user) {
        onRequireAuth();
        return;
      }
      setIsOpen(true);
    };

    return (
      <button
        onClick={handleOpen}
        className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-4 rounded-xl font-semibold hover:from-amber-600 hover:to-orange-700 transition flex items-center justify-center gap-2 shadow-md"
      >
        <PlusCircle className="w-5 h-5" />
        {user ? 'Usulkan Tempat Baru' : 'Login untuk usulkan tempat'}
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border-2 border-amber-300 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Coffee className="w-6 h-6 text-amber-600" />
          Usulkan Tempat Baru
        </h3>
        <button
          onClick={() => {
            setIsOpen(false);
            setError('');
          }}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nama Tempat <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
            placeholder="Contoh: Kopi Kenangan Gandaria"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lokasi <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
              placeholder="Contoh: Jl. Sultan Iskandar Muda No. 8, Kebayoran Lama"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Link Google Maps <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={mapUrl}
            onChange={(e) => setMapUrl(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
            placeholder="https://maps.google.com/..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Paste link dari Google Maps untuk memudahkan orang lain menemukan lokasinya
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setError('');
            }}
            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3 rounded-lg font-semibold hover:from-amber-600 hover:to-orange-700 transition disabled:opacity-50"
          >
            {loading ? 'Menambahkan...' : 'Tambahkan'}
          </button>
        </div>
      </form>
    </div>
  );
}
