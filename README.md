# LaundryLink – Full Stack Campus Resource Booking System
**🌐 Live Application:** https://washbook-one.vercel.app/login

A full-stack web application that streamlines shared resource management in residential campuses by enabling students to book washing machines in real time while providing administrators with centralized monitoring and management tools.

Built as a production-ready application using Next.js, Supabase, and PostgreSQL, the platform eliminates scheduling conflicts, improves resource utilization, and provides live machine availability through real-time synchronization.

---

## Features

### Student Portal

- Secure authentication
- Browse machine availability across multiple floors
- Real-time machine status updates
- Reserve washing machines in advance
- View upcoming and past bookings
- Cancel upcoming reservations
- Active session tracking
- Push notification support

### Admin Dashboard

- Monitor all active washing machines
- Track ongoing user sessions
- Add and manage machines
- Mark machines under maintenance
- View system-wide usage statistics
- Manage resource availability in real time

---

## Tech Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Zustand

### Backend

- Supabase
- PostgreSQL
- Server Components
- REST APIs

### Authentication

- Supabase Authentication

### Real-Time

- Supabase Realtime
- Live synchronization of machine availability

### Deployment

- Vercel
- Progressive Web App (PWA)

---

## System Architecture

```
Student
     │
     ▼
 Next.js Frontend
     │
     ▼
 Supabase Authentication
     │
     ▼
 PostgreSQL Database
     │
     ▼
Realtime Updates
     │
     ▼
Admin Dashboard
```

---

## Key Functionalities

- Multi-floor machine management
- Live booking system
- Conflict-free reservation handling
- Active session monitoring
- Booking history
- Admin analytics dashboard
- Machine maintenance management
- Push notifications
- Responsive mobile-first interface

---

## Impact

- Supports **200+ residents**
- Manages **16 shared washing machines**
- Reduced scheduling conflicts by **~80%**
- Provides real-time synchronization without manual page refreshes

---

## Project Structure

```
src/
 ├── app/
 ├── components/
 ├── utils/
 ├── types/

public/

supabase/

worker/
```

---

## Installation

```bash
git clone https://github.com/yourusername/laundrylink.git

cd laundrylink

npm install
```

Create a `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=

NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Run the project

```bash
npm run dev
```

---

## Screenshots

Add screenshots of:

- Login
- Dashboard
- Booking Page
- Admin Dashboard
- Machine Details
- Mobile View

---

## Future Improvements

- QR code based machine check-in
- Payment gateway integration
- Predictive machine availability
- AI-based usage analytics
- Mobile application
- Email & SMS notifications
