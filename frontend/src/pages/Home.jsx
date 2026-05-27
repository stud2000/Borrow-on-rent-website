import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ItemCard from '../components/common/ItemCard';
import API from '../utils/api';

const categories = ['All', 'Tools', 'Books', 'Electronics', 'Sports', 'Lab Equipment', 'Kitchen', 'Garden', 'Clothing', 'Other'];
const categoryEmoji = { Tools:'🔧',Books:'📚',Electronics:'💻',Sports:'⚽','Lab Equipment':'🔬',Kitchen:'🍳',Garden:'🌱',Clothing:'👕',Other:'📦' };

export default function Home() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchItems();
  }, [category, page]);

  const fetchItems = async (s = search) => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (s) params.search = s;
      if (category !== 'All') params.category = category;
      const res = await API.get('/items', { params });
      setItems(res.data.items);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchItems(search);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Borrow from your<br />neighbors 🤝</h1>
          <p className="text-primary-100 text-lg mb-8">Drill, books, projector, sports gear — borrow it from someone nearby instead of buying.</p>
          <form onSubmit={handleSearch} className="flex gap-3 max-w-xl mx-auto">
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search for a drill, projector, book..."
              className="flex-1 px-5 py-3 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button type="submit" className="bg-white text-primary-700 font-semibold px-6 py-3 rounded-xl hover:bg-primary-50 transition-colors">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-6">
          {categories.map(cat => (
            <button key={cat}
              onClick={() => { setCategory(cat); setPage(1); }}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                category === cat ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:text-primary-600'
              }`}>
              {cat !== 'All' ? `${categoryEmoji[cat]} ` : ''}{cat}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">{total} items available</p>
          <Link to="/map" className="text-sm text-primary-600 hover:underline font-medium">📍 View on map</Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-2xl" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-500 text-lg">No items found</p>
            <p className="text-gray-400 text-sm mt-1">Try a different search or be the first to lend!</p>
            <Link to="/post-item" className="btn-primary inline-block mt-4">Post an Item</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map(item => <ItemCard key={item._id} item={item} />)}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="btn-secondary px-4 py-2 text-sm disabled:opacity-40">← Prev</button>
                <span className="px-4 py-2 text-sm text-gray-600">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="btn-secondary px-4 py-2 text-sm disabled:opacity-40">Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
