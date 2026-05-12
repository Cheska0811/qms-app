# QMS KPI SQLite3 Server Setup

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

That's it! No database setup needed - SQLite3 is included.

## Installation & Setup

### 1. Server Installation

```bash
cd server
npm install
```

### 2. Configure Environment (Optional)

Edit `.env` file in the server directory (optional):

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key_change_this
```

### 3. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will:
- ✓ Create SQLite database at `./data/qms_kpi.db`
- ✓ Create all necessary tables
- ✓ Insert seed data (admin user & departments)
- ✓ Start listening on `http://localhost:3001`

## Database File

The SQLite database is stored at: `server/data/qms_kpi.db`

You can view/edit it with tools like:
- SQLite Browser: https://sqlitebrowser.org/
- VS Code Extension: SQLite Viewer
- Command line: `sqlite3 server/data/qms_kpi.db`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user
- `GET /api/auth` - Get all users (admin)

### Departments
- `GET /api/departments` - Get all departments
- `GET /api/departments/:id` - Get single department
- `POST /api/departments` - Create department
- `PUT /api/departments/:id` - Update department
- `DELETE /api/departments/:id` - Delete department

### KPI Tables
- `GET /api/kpi-tables` - Get all KPI tables (with filters)
- `GET /api/kpi-tables/:id` - Get single KPI table
- `POST /api/kpi-tables` - Create KPI table
- `PUT /api/kpi-tables/:id` - Update KPI table
- `DELETE /api/kpi-tables/:id` - Delete KPI table

## Troubleshooting

### Port Already in Use
Change `PORT` in `.env` to a different port (e.g., 3002)

### Permission Errors
Ensure `server/data/` directory exists and is writable

### Database Lock
Close any SQLite browser sessions and restart server

## Features

✓ File-based database (no server needed)
✓ Automatically initializes on first run
✓ Supports all operations (CRUD)
✓ Foreign key constraints enabled
✓ JSON support for complex data
✓ CORS enabled for frontend
✓ Zero configuration needed

## Backup & Recovery

### Backup database
```bash
cp server/data/qms_kpi.db server/data/qms_kpi.db.backup
```

### Restore database
```bash
cp server/data/qms_kpi.db.backup server/data/qms_kpi.db
```

## Next Steps

1. Start the server: `npm run dev`
2. Test it: `curl http://localhost:3001/health`
3. Update frontend to use this API
4. Deploy to production when ready

password ng postgreg sql
TDS123
