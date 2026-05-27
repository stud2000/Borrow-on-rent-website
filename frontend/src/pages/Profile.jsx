import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import ItemCard from '../components/common/ItemCard';
import toast from 'react-hot-toast';

export default function Profile() {
  const { id } = useParams();
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const isMe = !id || id === user?._id;
  const userId = id || user?._id;

  useEffect(() => {
    API.get(`/users/${userId}`).then(res => {
      setProfile(res.data.user);
      setItems(res.data.items);
      setForm({ name: res.data.user.name, bio: res.data.user.bio, neighborhood: res.data.user.neighborhood });
    }).catch(() => toast.error('User not found')).finally(() => setLoading(false));
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await API.put('/users/profile/update', form);
      setProfile(res.data);
      updateUser(res.data);
      setEditing(false);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin text-4xl">⏳</div></div>;
  if (!profile) return <div className="text-center py-20 text-gray-500">User not found</div>;

  const stars = Math.round(profile.rating || 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-700 text-3xl font-bold flex-shrink-0 overflow-hidden">
            {profile.avatar ? <img src={profile.avatar} alt="" className="w-full h-full object-cover" /> : profile.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="space-y-3">
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="input-field text-lg font-bold" placeholder="Your name" />
                <input value={form.neighborhood} onChange={e => setForm({...form, neighborhood: e.target.value})}
                  className="input-field" placeholder="Your neighborhood" />
                <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})}
                  className="input-field h-20 resize-none" placeholder="Tell neighbors about yourself..." />
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving} className="btn-primary py-2 px-4 text-sm">{saving ? 'Saving...' : 'Save'}</button>
                  <button onClick={() => setEditing(false)} className="btn-secondary py-2 px-4 text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
                  {isMe && <button onClick={() => setEditing(true)} className="btn-secondary text-sm py-1.5 px-3">✏️ Edit</button>}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`text-lg ${i < stars ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                  ))}
                  <span className="text-sm text-gray-400 ml-1">{profile.rating?.toFixed(1) || '0.0'} ({profile.ratingCount || 0} reviews)</span>
                </div>
                {profile.neighborhood && <p className="text-gray-500 text-sm mt-1">📍 {profile.neighborhood}</p>}
                {profile.bio && <p className="text-gray-600 text-sm mt-2">{profile.bio}</p>}
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100">
          {[
            { label: 'Items Listed', value: items.length },
            { label: 'Items Lent', value: profile.itemsLent || 0 },
            { label: 'Items Borrowed', value: profile.itemsBorrowed || 0 },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <h2 className="text-lg font-bold text-gray-900 mb-4">Available Items ({items.length})</h2>
      {items.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-2">📦</div>
          <p>{isMe ? "You haven't listed any items yet." : "No items listed."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map(item => <ItemCard key={item._id} item={item} />)}
        </div>
      )}
    </div>
  );
}
