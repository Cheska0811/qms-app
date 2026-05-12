# QMS KPI - SQLite3 Database Setup Guide

## 🚀 Super Quick Start (2 Steps!)

### Step 1: Install Backend Dependencies
```bash
cd server
npm install
```

### Step 2: Start the Server
```bash
npm run dev
```

**That's it!** ✅

The server will:
- ✓ Create database at `server/data/qms_kpi.db`
- ✓ Set up all tables automatically
- ✓ Insert seed data (admin user + departments)
- ✓ Run on `http://localhost:3001`

## 📊 Why SQLite3?

✓ **No external database server needed**
✓ **File-based** - easy to backup
✓ **Zero configuration** - works out of the box
✓ **Perfect for local development& small teams**
✓ **Easy to deploy** - just copy the `.db` file

## 🔄 How It Works

SQLite3 stores everything in a single file: `server/data/qms_kpi.db`

No MySQL, no database server, no credentials needed!

## 💾 Database File Location

```
server/
├── data/
│   └── qms_kpi.db          ← Your database file
├── index.js
├── package.json
└── ...
```

## 🔍 Viewing the Database

### Option 1: SQLite Browser (GUI)
- Download: https://sqlitebrowser.org/
- Open: `server/data/qms_kpi.db`
- View/edit tables visually

### Option 2: VS Code Extension
- Install "SQLite Viewer" extension
- Right-click `.db` file > View
- Browse tables in explorer

### Option 3: Command Line
```bash
sqlite3 server/data/qms_kpi.db
# Then run SQL queries
SELECT * FROM departments;
SELECT * FROM users;
```

## 🛠️ Configuration

Edit `server/.env` (optional):

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your_super_secret_key
```

That's it! No database credentials needed.

## 📱 Frontend Connection

Update frontend `.env.local`:

```env
VITE_API_URL=http://localhost:3001/api
```

## 🧪 Test the Server

```bash
# Check if server is running
curl http://localhost:3001/health

# Should output:
# {"status":"Server is running"}
```

## 🔐 Default Admin Credentials

```
Email: admin@local.app
Password: admin123
```

**Change these in production!**

## 💾 Backup Your Database

```bash
# Backup
cp server/data/qms_kpi.db server/data/qms_kpi.db.backup

# Restore
cp server/data/qms_kpi.db.backup server/data/qms_kpi.db
```

## 📝 Database Tables

Automatically created:
- `users` - User accounts
- `departments` - Organization departments
- `kpi_tables` - KPI data
- `kpi_templates` - KPI templates
- `department_entries` - Department records

## 🚀 Next Steps

### 1. Start Backend
```bash
cd server
npm run dev
```

### 2. Update Frontend API Client
Replace uses of `localClient` with `serverClient`

### 3. Test APIs
```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@local.app","password":"admin123"}'

# Get departments
curl http://localhost:3001/api/departments
```

### 4. Deploy
Just copy `server/` folder with the `.db` file!

## 🎯 Key Advantages of SQLite3

| Feature | SQLite3 | MySQL |
|---------|---------|-------|
| Setup Time | 1 minute | 30 minutes |
| External Server | ❌ No | ✅ Yes |
| File Backup | ✅ Easy | 🟡 Complex |
| Local Development | ✅ Perfect | 🟡 Slower |
| Team Collaboration | ✅ Share .db file | ✅ Shared server |
| Production Ready | ✅ Yes | ✅ Yes |

## ⚠️ Before Production

- [ ] Enable foreign key constraints (enabled by default)
- [ ] Backup database strategy
- [ ] Password hashing for users
- [ ] API authentication with JWT
- [ ] HTTPS for server
- [ ] Regular backups

## 📖 Full API Documentation

See `server/README.md` for complete API endpoint documentation

## 💡 Tips

1. Keep `.db` file in version control or backup regularly
2. SQLite is great for teams up to ~100 concurrent users
3. For massive scale, migrate to PostgreSQL later
4. Database file grows with data - monitor size
5. Use SQLite Browser to debug data issues

---

**Ready to go!** 🎉 Just run `npm run dev` in the server directory!
