# 🤝 BorrowLocal — Neighborhood Borrow App

A full-stack community sharing app where neighbors can lend and borrow items instead of buying things they'll only use once.

## 🌟 Features

- 📦 **Browse & Search Items** — Drill, books, projectors, lab tools, sports gear and more
- 📝 **Post Items to Lend** — Upload photos, set category, condition, duration
- 📋 **Borrow Requests** — Send/approve/reject requests with date ranges
- 💬 **Real-time Chat** — Socket.IO powered messaging between neighbors
- 🗺️ **Map View** — See available items near you on an interactive map
- 👤 **User Profiles** — Ratings, reviews, borrow history
- 🔐 **Phone + Password Auth** — JWT-based secure authentication

---

## 🚀 Quick Setup

### Prerequisites
- Node.js v18+
- MongoDB (local or [MongoDB Atlas](https://cloud.mongodb.com))

---

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and set your MONGO_URI and JWT_SECRET
npm run dev
```

Backend runs on: `http://localhost:5000`

---

### 2. Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on: `http://localhost:3000`

---

## 📁 Project Structure

```
borrow-app/
├── backend/
│   ├── models/
│   │   ├── User.js          # Phone + password auth
│   │   ├── Item.js          # Borrow items
│   │   ├── BorrowRequest.js # Request management
│   │   └── Message.js       # Chat messages
│   ├── routes/
│   │   ├── auth.js          # Register/Login with phone
│   │   ├── items.js         # CRUD + search + upload
│   │   ├── requests.js      # Borrow request flow
│   │   ├── users.js         # Profile management
│   │   └── messages.js      # Chat API
│   ├── middleware/
│   │   └── auth.js          # JWT protect middleware
│   ├── uploads/             # Uploaded images (auto-created)
│   ├── server.js            # Express + Socket.IO
│   └── .env.example
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── Home.jsx         # Browse + search
        │   ├── Login.jsx        # Phone login
        │   ├── Register.jsx     # Phone registration
        │   ├── ItemDetail.jsx   # Item + borrow request
        │   ├── PostItem.jsx     # List an item
        │   ├── Dashboard.jsx    # Manage items + requests
        │   ├── Messages.jsx     # Real-time chat
        │   ├── MapView.jsx      # Leaflet map
        │   └── Profile.jsx      # User profile
        ├── components/
        │   ├── layout/Navbar.jsx
        │   └── common/ItemCard.jsx
        ├── context/AuthContext.jsx
        └── utils/api.js
```

---

## 🔧 Environment Variables

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/borrowapp
JWT_SECRET=change_this_to_a_secure_random_string
CLIENT_URL=http://localhost:3000
```

---

## 📱 Pages

| Route | Description |
|-------|-------------|
| `/` | Browse & search all items |
| `/map` | Map view of nearby items |
| `/items/:id` | Item detail + borrow request |
| `/post-item` | List a new item (auth required) |
| `/dashboard` | Manage your items & requests (auth required) |
| `/messages` | Real-time chat (auth required) |
| `/profile` | Your profile (auth required) |
| `/users/:id` | Public user profile |

---

## 🛡️ API Endpoints

### Auth
- `POST /api/auth/register` — Register with phone + password
- `POST /api/auth/login` — Login with phone + password
- `GET /api/auth/me` — Get current user

### Items
- `GET /api/items` — Get all items (supports search, category, nearby filters)
- `GET /api/items/:id` — Get single item
- `POST /api/items` — Create item (auth + multipart)
- `PUT /api/items/:id` — Update item (auth)
- `DELETE /api/items/:id` — Delete item (auth)

### Requests
- `POST /api/requests` — Create borrow request
- `GET /api/requests/my` — My outgoing requests
- `GET /api/requests/incoming` — Incoming requests
- `PUT /api/requests/:id/status` — Approve/reject/return/cancel
- `PUT /api/requests/:id/rate` — Rate after return

### Messages
- `GET /api/messages/conversations` — All conversations
- `GET /api/messages/:conversationId` — Get messages
- `POST /api/messages` — Send message

---

Built with ❤️ for local communities
