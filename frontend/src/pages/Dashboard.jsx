import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const tabs = ['My Items', 'My Requests', 'Incoming Requests'];

function RatingModal({ request, currentUserId, onClose, onRated }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isOwner = request.owner?._id === currentUserId || request.owner === currentUserId;
  const targetName = isOwner ? request.requester?.name : request.owner?.name;

  const handleSubmit = async () => {
    if (rating === 0) return toast.error('Please select a star rating');
    setSubmitting(true);
    try {
      await API.put(`/requests/${request._id}/rate`, { rating, review });
      toast.success('Rating submitted! ⭐');
      onRated(request._id);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">⭐</div>
          <h2 className="text-xl font-bold text-gray-900">Rate your experience</h2>
          <p className="text-gray-500 text-sm mt-1">How was it with <span className="font-medium text-gray-700">{targetName}</span>?</p>
        </div>

        <div className="flex justify-center gap-2 mb-5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)}
              className="text-4xl transition-transform hover:scale-110">
              <span className={star <= (hover || rating) ? 'text-yellow-400' : 'text-gray-200'}>★</span>
            </button>
          ))}
        </div>

        {rating > 0 && (
          <p className="text-center text-sm font-medium text-gray-600 mb-4">
            {['', 'Poor 😕', 'Fair 😐', 'Good 🙂', 'Great 😊', 'Excellent! 🌟'][rating]}
          </p>
        )}

        <textarea value={review} onChange={e => setReview(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none mb-4"
          rows={3} placeholder="Write a review (optional)..." />

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting || rating === 0}
            className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [myItems, setMyItems] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingModal, setRatingModal] = useState(null);
  const [ratedIds, setRatedIds] = useState(new Set());

  useEffect(() => {
    Promise.all([
      API.get('/items/user/my'),
      API.get('/requests/my'),
      API.get('/requests/incoming')
    ]).then(([items, reqs, inc]) => {
      setMyItems(items.data);
      setMyRequests(reqs.data);
      setIncoming(inc.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const updateRequestStatus = async (id, status) => {
    try {
      const res = await API.put(`/requests/${id}/status`, { status });
      setIncoming(prev => prev.map(r => r._id === id ? res.data : r));
      setMyRequests(prev => prev.map(r => r._id === id ? res.data : r));
      toast.success(`Request ${status}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await API.delete(`/items/${id}`);
      setMyItems(prev => prev.filter(i => i._id !== id));
      toast.success('Item deleted');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleRated = (requestId) => setRatedIds(prev => new Set([...prev, requestId]));

  const canRate = (req) => {
    if (ratedIds.has(req._id)) return false;
    if (req.status !== 'returned') return false;
    const isOwner = req.owner?._id === user?._id || req.owner === user?._id;
    const isRequester = req.requester?._id === user?._id || req.requester === user?._id;
    if (isOwner && req.borrowerRating) return false;
    if (isRequester && req.ownerRating) return false;
    return true;
  };

  const statusBadge = (status) => {
    const map = { pending:'bg-yellow-100 text-yellow-700', approved:'bg-green-100 text-green-700',
      rejected:'bg-red-100 text-red-700', returned:'bg-blue-100 text-blue-700', cancelled:'bg-gray-100 text-gray-500' };
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status]}`}>{status}</span>;
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin text-4xl">⏳</div></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Welcome back, {user?.name}!</p>
        </div>
        <Link to="/post-item" className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-xl text-sm transition-colors">+ Lend Item</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Items Listed', value: myItems.length, emoji: '📦' },
          { label: 'My Requests', value: myRequests.length, emoji: '📋' },
          { label: 'Pending', value: incoming.filter(r => r.status === 'pending').length, emoji: '🔔' },
        ].map(({ label, value, emoji }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <div className="text-2xl mb-1">{emoji}</div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-400">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === i ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
            {i === 2 && incoming.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 inline-flex items-center justify-center">
                {incoming.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* My Items */}
      {tab === 0 && (
        <div className="space-y-3">
          {myItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📦</div>
              <p>You haven't listed any items yet.</p>
              <Link to="/post-item" className="bg-green-600 text-white text-sm font-medium py-2 px-4 rounded-xl inline-block mt-3">List Your First Item</Link>
            </div>
          ) : myItems.map(item => (
            <div key={item._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                {item.images?.[0] ? <img src={item.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{item.title}</p>
                <p className="text-xs text-gray-400">{item.category} · {item.condition}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${item.status === 'available' ? 'bg-green-100 text-green-700' : item.status === 'borrowed' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                {item.status}
              </span>
              <div className="flex gap-2">
                <Link to={`/items/${item._id}`} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">View</Link>
                <button onClick={() => deleteItem(item._id)} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My Requests */}
      {tab === 1 && (
        <div className="space-y-3">
          {myRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📋</div>
              <p>No borrow requests yet.</p>
              <Link to="/" className="bg-green-600 text-white text-sm font-medium py-2 px-4 rounded-xl inline-block mt-3">Browse Items</Link>
            </div>
          ) : myRequests.map(req => (
            <div key={req._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {req.item?.images?.[0] ? <img src={req.item.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{req.item?.title}</p>
                  <p className="text-xs text-gray-400">Owner: {req.owner?.name}</p>
                </div>
                {statusBadge(req.status)}
              </div>
              <p className="text-xs text-gray-500 mb-3">📅 {format(new Date(req.startDate), 'dd MMM')} → {format(new Date(req.endDate), 'dd MMM yyyy')}</p>
              <div className="flex gap-2 flex-wrap">
                {req.status === 'pending' && (
                  <button onClick={() => updateRequestStatus(req._id, 'cancelled')}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                    Cancel Request
                  </button>
                )}
                {canRate(req) && (
                  <button onClick={() => setRatingModal(req)}
                    className="text-xs px-4 py-1.5 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 hover:bg-yellow-100 font-medium transition-colors">
                    ⭐ Rate Experience
                  </button>
                )}
                {req.status === 'returned' && !canRate(req) && (
                  <span className="text-xs text-gray-400 py-1.5">✅ Rated</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Incoming Requests */}
      {tab === 2 && (
        <div className="space-y-3">
          {incoming.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">🔔</div>
              <p>No incoming requests yet.</p>
            </div>
          ) : incoming.map(req => (
            <div key={req._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold flex-shrink-0">
                  {req.requester?.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{req.requester?.name}</p>
                  <p className="text-xs text-gray-500">wants to borrow <span className="font-medium text-gray-700">{req.item?.title}</span></p>
                  <p className="text-xs text-gray-400">📅 {format(new Date(req.startDate), 'dd MMM')} → {format(new Date(req.endDate), 'dd MMM yyyy')}</p>
                </div>
                {statusBadge(req.status)}
              </div>
              {req.message && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-3 italic">"{req.message}"</p>}
              <p className="text-xs text-gray-400 mb-3">📱 {req.requester?.phone}</p>
              <div className="flex gap-2 flex-wrap">
                {req.status === 'pending' && (
                  <>
                    <button onClick={() => updateRequestStatus(req._id, 'approved')} className="flex-1 py-2 text-sm rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition-colors">✅ Approve</button>
                    <button onClick={() => updateRequestStatus(req._id, 'rejected')} className="flex-1 py-2 text-sm rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors">❌ Decline</button>
                  </>
                )}
                {req.status === 'approved' && (
                  <button onClick={() => updateRequestStatus(req._id, 'returned')} className="w-full py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">📦 Mark as Returned</button>
                )}
                {canRate(req) && (
                  <button onClick={() => setRatingModal(req)}
                    className="w-full py-2 text-sm rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-700 hover:bg-yellow-100 font-medium transition-colors">
                    ⭐ Rate Borrower
                  </button>
                )}
                {req.status === 'returned' && !canRate(req) && (
                  <span className="text-xs text-gray-400 py-1.5">✅ Rated</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {ratingModal && (
        <RatingModal
          request={ratingModal}
          currentUserId={user?._id}
          onClose={() => setRatingModal(null)}
          onRated={handleRated}
        />
      )}
    </div>
  );
}
