import React from 'react';
import { Link } from 'react-router-dom';

const categoryEmoji = {
  Tools: '🔧', Books: '📚', Electronics: '💻', Sports: '⚽',
  'Lab Equipment': '🔬', Kitchen: '🍳', Garden: '🌱', Clothing: '👕', Other: '📦'
};

const statusColor = {
  available: 'bg-green-100 text-green-700',
  borrowed: 'bg-orange-100 text-orange-700',
  unavailable: 'bg-gray-100 text-gray-500'
};

export default function ItemCard({ item }) {
  const stars = Math.round(item.owner?.rating || 0);

  return (
    <Link to={`/items/${item._id}`} className="card hover:shadow-card-hover transition-all duration-200 group overflow-hidden block">
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {item.images?.[0] ? (
         <img src={item.images[0]} alt={item.title}className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
/>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {categoryEmoji[item.category] || '📦'}
          </div>
        )}
        <span className={`absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-full ${statusColor[item.status]}`}>
          {item.status}
        </span>
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded-full text-gray-600">
          {categoryEmoji[item.category]} {item.category}
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-base mb-1 truncate group-hover:text-primary-600 transition-colors">{item.title}</h3>
        <p className="text-gray-500 text-sm line-clamp-2 mb-3">{item.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
              {item.owner?.avatar
                ?<img src={item.owner.avatar} alt="" className="w-7 h-7 rounded-full object-cover"/>
                : item.owner?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700">{item.owner?.name}</p>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className={`text-xs ${i < stars ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                ))}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">📍 {item.neighborhood || 'Nearby'}</p>
            <p className="text-xs text-gray-400">{item.condition}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
