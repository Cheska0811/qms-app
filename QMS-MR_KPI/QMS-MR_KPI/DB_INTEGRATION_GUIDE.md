# MySQL Backend Integration Summary

## ✅ What's Been Created

### 1. Backend Server (`/server`)
- Express.js server with CORS support
- MySQL connection pooling
- Automatic database initialization
- Seed data for admin user and departments

### 2. Database Setup
- `server/utils/initDb.js` - Automatically creates tables on startup
- `server/config/database.js` - MySQL connection management
- Seed data: Admin user + 3 departments

### 3. API Routes
- `/api/auth` - Login, register, user management
- `/api/departments` - Full CRUD for departments
- `/api/kpi-tables` - Full CRUD for KPI tables

### 4. API Client
- `src/api/serverClient.js` - Frontend API client for MySQL backend
- Drop-in replacement for `localClient.js`

### 5. Configuration Files
- `server/.env` - MySQL database credentials
- `.env.local` - Frontend API URL configuration
- `MYSQL_SETUP.md` - Comprehensive setup guide

## 🚀 Quick Start Steps

### 1. Install MySQL Server
See `MYSQL_SETUP.md` for instructions

### 2. Create Database
```bash
mysql -u root -p
CREATE DATABASE qms_kpi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Setup Backend
```bash
cd server
npm install
# Edit .env with your MySQL password
npm run dev
```

### 4. Test Connection
```bash
curl http://localhost:3001/health
# Should return: {"status":"Server is running"}
```

### 5. Switch Frontend to MySQL

**Option A: Update existing code**

In files like `DataEntry.jsx`, `Departments.jsx`, etc:

```javascript
// Replace this:
import { localApi } from '@/api/localClient';

// With this:
import { serverApi as localApi } from '@/api/serverClient';
```

**Option B: Update localAuth.js**

Replace database calls to use server API:

```javascript
// Before:
await localApi.entities.users.list()

// After:
await serverApi.auth.getUsers()
```

## 📊 API Endpoints Ready to Use

### Departments
```javascript
// Get all departments
GET /api/departments

// Create department
POST /api/departments
{ name, code, description, head }

// Update department
PUT /api/departments/:id
{ name, code, description, head, status }

// Delete department
DELETE /api/departments/:id
```

### KPI Tables
```javascript
// Get KPI tables with filters
GET /api/kpi-tables?department_id=xxx&period=2026-04

// Create KPI table
POST /api/kpi-tables
{ department_id, period, year, month, title, columns, rows }

// Update KPI table
PUT /api/kpi-tables/:id
{ ...same fields as create }

// Delete KPI table
DELETE /api/kpi-tables/:id
```

### Authentication
```javascript
// Login
POST /api/auth/login
{ email, password }

// Register
POST /api/auth/register
{ email, password, department_name, department_head }

// Get all users
GET /api/auth
```

## 🔄 Data Migration Strategy

### Option 1: Export & Import (Recommended)
1. Export current data from browser's IndexedDB/localStorage
2. Create import API endpoint
3. Migrate data via API

### Option 2: Dual Running
1. Keep local storage during development
2. Push new data to MySQL in parallel
3. Once confident, switch fully

### Option 3: Fresh Start
1. Start with MySQL database
2. Re-enter small datasets manually
3. Deploy gradually to production

## ⚙️ Environment Variables

### Backend (`server/.env`)
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=qms_kpi_db
PORT=3001
JWT_SECRET=your_secret
```

### Frontend (`.env.local`)
```env
VITE_API_URL=http://localhost:3001/api
```

For production:
```env
VITE_API_URL=https://api.yourdomain.com/api
```

## 🔐 Security Tasks (Before Production)

- [ ] Hash passwords with bcrypt
- [ ] Implement JWT authentication
- [ ] Add input validation
- [ ] Configure CORS restrictions
- [ ] Use HTTPS for API
- [ ] Add rate limiting
- [ ] Implement proper error handling
- [ ] Add API authentication headers
- [ ] Secure sensitive environment variables
- [ ] Regular database backups

## 📝 Testing the Backend

```bash
# Test API health
curl http://localhost:3001/health

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@local.app","password":"admin123"}'

# Get departments
curl http://localhost:3001/api/departments
```

## 💾 Backup & Recovery

### Backup MySQL database
```bash
mysqldump -u root -p qms_kpi_db > backup.sql
```

### Restore MySQL database
```bash
mysql -u root -p qms_kpi_db < backup.sql
```

## 🚀 Next Steps

1. **Setup MySQL** - Follow `MYSQL_SETUP.md`
2. **Start Backend** - `cd server && npm run dev`
3. **Update Frontend** - Replace `localClient` with `serverClient`
4. **Test APIs** - Verify endpoints work
5. **Deploy** - Push to production when ready

## 📧 Support

Check `server/README.md` for more detailed documentation and troubleshooting.

---

**Your MySQL backend is ready!** 🎉
