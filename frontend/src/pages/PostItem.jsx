import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import toast from 'react-hot-toast';

const categories = ['Tools', 'Books', 'Electronics', 'Sports', 'Lab Equipment', 'Kitchen', 'Garden', 'Clothing', 'Other'];
const conditions = ['New', 'Like New', 'Good', 'Fair'];

export default function PostItem() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', category: '', condition: 'Good',
    borrowDuration: 'Flexible', neighborhood: user?.neighborhood || '', tags: ''
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [coords, setCoords] = useState(null);

  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setUseMyLocation(true); toast.success('Location captured!'); },
      () => toast.error('Could not get location')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) return toast.error('Please select a category');
    setLoading(true);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k === 'tags' ? 'tags' : k, k === 'tags' ? JSON.stringify(v.split(',').map(t => t.trim()).filter(Boolean)) : v));
      images.forEach(img => data.append('images', img));
      if (coords) { data.append('lat', coords.lat); data.append('lng', coords.lng); }

      await API.post('/items', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Item posted! Your neighbors can now borrow it 🎉');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lend an Item</h1>
        <p className="text-gray-500 text-sm mt-1">Share something with your community</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Images */}
        <div className="card p-5">
          <label className="block text-sm font-medium text-gray-700 mb-3">Photos (up to 5)</label>
          <div className="flex gap-3 flex-wrap">
            {previews.map((p, i) => (
              <div key={i} className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                <img src={p} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 transition-colors">
              <span className="text-2xl">📷</span>
              <span className="text-xs text-gray-400 mt-1">Add</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
            </label>
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              className="input-field" placeholder="e.g. Bosch Drill Machine" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              className="input-field h-24 resize-none" placeholder="Describe your item, its condition, and any instructions..." required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="input-field" required>
                <option value="">Select...</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
              <select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}
                className="input-field">
                {conditions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Borrow Duration</label>
            <input type="text" value={form.borrowDuration} onChange={e => setForm({...form, borrowDuration: e.target.value})}
              className="input-field" placeholder="e.g. 1-3 days, 1 week, Flexible" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
            <input type="text" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})}
              className="input-field" placeholder="drill, power tool, DIY" />
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <label className="block text-sm font-medium text-gray-700">Location</label>
          <input type="text" value={form.neighborhood} onChange={e => setForm({...form, neighborhood: e.target.value})}
            className="input-field" placeholder="Your neighborhood or area" />
          <button type="button" onClick={getLocation}
            className={`text-sm px-4 py-2 rounded-lg border transition-colors ${useMyLocation ? 'border-primary-500 text-primary-600 bg-primary-50' : 'border-gray-200 text-gray-600 hover:border-primary-300'}`}>
            {useMyLocation ? '✅ Location captured' : '📍 Use my GPS location'}
          </button>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base">
          {loading ? 'Posting...' : '🎉 Post Item for Lending'}
        </button>
      </form>
    </div>
  );
}
