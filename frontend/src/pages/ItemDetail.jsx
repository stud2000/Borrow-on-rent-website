import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import toast from 'react-hot-toast';
const IMAGE_BASE_URL = 'https://borrow-on-rent-website.onrender.com/';

export default function ItemDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [requestForm, setRequestForm] = useState({ message: '', startDate: '', endDate: '' });
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    API.get(`/items/${id}`).then(res => setItem(res.data)).catch(() => toast.error('Item not found')).finally(() => setLoading(false));
  }, [id]);

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setRequesting(true);
    try {
      await API.post('/requests', { itemId: id, ...requestForm });
      toast.success('Request sent! 🎉 The owner will contact you.');
      setShowRequest(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send request');
    } finally {
      setRequesting(false);
    }
  };

  const handleMessage = () => {
    if (!user) { navigate('/login'); return; }
    navigate(`/messages?userId=${item.owner._id}&itemId=${id}`);
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin text-4xl">⏳</div></div>;
  if (!item) return <div className="text-center py-20 text-gray-500">Item not found</div>;

  const isOwner = user?._id === item.owner._id;
  const stars = Math.round(item.owner?.rating || 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1">
        ← Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="rounded-2xl overflow-hidden bg-gray-100 h-80">
            {item.images?.length > 0 ? (
              <img src={`${IMAGE_BASE_URL}${item.images[imgIdx]}`} alt={item.title}className="w-full h-full object-cover"/>
      
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl">📦</div>
            )}
          </div>
          {item.images?.length > 1 && (
            <div className="flex gap-2 mt-3">
              {item.images.map((img, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${i === imgIdx ? 'border-primary-500' : 'border-transparent'}`}>
                 <img src={`${IMAGE_BASE_URL}${img}`}  alt=""  className="w-full h-full object-cover"/>
                  
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-full">{item.category}</span>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">{item.title}</h1>
            </div>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
              item.status === 'available' ? 'bg-green-100 text-green-700' :
              item.status === 'borrowed' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
            }`}>{item.status}</span>
          </div>

          <p className="text-gray-600 mb-4">{item.description}</p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label: 'Condition', value: item.condition },
              { label: 'Borrow Duration', value: item.borrowDuration },
              { label: 'Location', value: item.neighborhood || 'Nearby' },
              { label: 'Total Borrows', value: item.totalBorrows || 0 },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="text-sm font-medium text-gray-800">{value}</p>
              </div>
            ))}
          </div>

          {/* Owner */}
          <div className="card p-4 mb-5">
            <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Owner</p>
            <Link to={`/users/${item.owner._id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                {item.owner.avatar ? <img src={`${IMAGE_BASE_URL}${item.owner.avatar}`} alt=""className="w-11 h-11 rounded-full object-cover"
/> : item.owner.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{item.owner.name}</p>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`text-sm ${i < stars ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                  ))}
                  <span className="text-xs text-gray-400 ml-1">({item.owner.ratingCount || 0} reviews)</span>
                </div>
                <p className="text-xs text-gray-400">📍 {item.owner.neighborhood || 'Nearby'}</p>
              </div>
            </Link>
          </div>

          {!isOwner && item.status === 'available' && (
            <div className="space-y-3">
              <button onClick={() => setShowRequest(!showRequest)} className="btn-primary w-full py-3 text-base">
                📋 Request to Borrow
              </button>
              <button onClick={handleMessage} className="btn-secondary w-full py-3 text-base">
                💬 Message Owner
              </button>
            </div>
          )}

          {isOwner && (
            <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700 text-center">
              This is your item. <Link to="/dashboard" className="font-medium underline">Manage it →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Borrow Request Modal */}
      {showRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Request to Borrow</h2>
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" value={requestForm.startDate} onChange={e => setRequestForm({...requestForm, startDate: e.target.value})}
                  className="input-field" required min={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input type="date" value={requestForm.endDate} onChange={e => setRequestForm({...requestForm, endDate: e.target.value})}
                  className="input-field" required min={requestForm.startDate} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message to owner</label>
                <textarea value={requestForm.message} onChange={e => setRequestForm({...requestForm, message: e.target.value})}
                  className="input-field h-24 resize-none" placeholder="Hi! I need this for..." />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowRequest(false)} className="btn-secondary flex-1 py-2.5">Cancel</button>
                <button type="submit" disabled={requesting} className="btn-primary flex-1 py-2.5">
                  {requesting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
