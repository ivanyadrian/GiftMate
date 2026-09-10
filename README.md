<div align="center">

# GiftMate

**A modern, full-stack, real-time Secret Santa platform.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-giftmate--sooty.vercel.app-blueviolet?style=for-the-badge)](https://giftmate-sooty.vercel.app/)

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel&logoColor=white)](https://giftmate-sooty.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**English** | [Magyar](README.hu.md)

</div>

**GiftMate** is a full-stack, real-time Secret Santa web application engineered with **React 19**, **TypeScript**, **Tailwind CSS v4**, and **Supabase (PostgreSQL)**.

Built with **Row Level Security (RLS)**, atomic **PostgreSQL Stored Procedures (RPCs)**, and **real-time WebSocket subscriptions**, GiftMate ensures fair, secret pairings with zero client-side cheating potential.

>
> ### Live Demo Account (Try Instantly Without Registration)
>
> You can explore all features of GiftMate immediately using the public showcase account:
>
> - **Email:** `demo@giftmate.app`
> - **Password:** `DemoPassword`
>
> The demo account comes pre-loaded with an active, **protected showcase room** populated with fictional participants. To preserve room continuity for all visitors, destructive operations (deleting the room, kicking members, leaving, or joining) are prevented at both UI and database RPC levels. **All other features remain 100% interactive**: customize room metadata (name, budget, dates), trigger or reset draws, reveal assigned pairings, and create unlimited custom rooms!

---

## Application Showcase

### Dashboard & Room Creation

|           Active Dashboard with Themed Rooms            |         Multi-Step Room Creation Wizard          |
| :-----------------------------------------------------: | :----------------------------------------------: |
| ![Dashboard](docs/screenshots/dashboard-with-rooms.png) | ![Create Room](docs/screenshots/create-room.png) |

### Room Hub & Realtime Countdown

|          Room details & Participant Roster          |             Automated Draw Schedule & Countdown             |
| :-------------------------------------------------: | :---------------------------------------------------------: |
| ![Room Details](docs/screenshots/room_detailed.png) | ![Countdown](docs/screenshots/automatic-draw-countdown.png) |

### Anti-Cheat Draw & Scratch-to-Reveal

|                    Sealed Draw State                     |            Scratch-to-Reveal Partner Card            |
| :------------------------------------------------------: | :--------------------------------------------------: |
| ![Unrevealed Draw](docs/screenshots/draw-unrevealed.png) | ![Revealed Draw](docs/screenshots/draw-revealed.png) |

### Profile & Avatar Ecosystem

|     User Profile & Account Settings      |              20 Custom High-Res Animal Avatars              |
| :--------------------------------------: | :---------------------------------------------------------: |
| ![Profile](docs/screenshots/profile.png) | ![Avatar Selector](docs/screenshots/profile-pic-change.png) |

<details>
<summary> <strong>View Authentication Screen (Google OAuth + Email)</strong></summary>

<br />

<p align="center">
  <img src="docs/screenshots/login.png" alt="Login Screen" width="600" />
</p>

</details>

---

## Key Highlights & Architectural Features

### Zero-Trust Security & Anti-Cheat Pairing

- **Symmetric Secret Isolation**: All pairing draws are executed inside PostgreSQL `SECURITY DEFINER` RPCs (`perform_draw`). No participant can uncover who drew whom by inspecting network payloads or querying the database.
- **Strict Row Level Security (RLS)**: Client roles have `0` direct `INSERT`, `UPDATE`, or `DELETE` permissions on sensitive tables (`rooms`, `room_members`, `draws`). Mutations are encapsulated in strictly authorized stored procedures.
- **Selective Data Exposure**: The `draws` RLS policy explicitly evaluates `drawer_id = auth.uid()`. Even automated inspection of the `draws` relation returns only the caller's assigned partner—never the broader derangement ring.
- **Room-Scoped Member Privacy**: Profiling and scraping protections restrict `profiles` visibility strictly to co-members sharing active rooms.

### Single-Roundtrip Hydration & Low-Latency UX

- **Consolidated State Hydration (`get_room_full_details`)**: Rather than sequentially chaining requests (`rooms.select` $\rightarrow$ `get_room_members` $\rightarrow$ `get_my_draw`), a unified JSONB RPC hydrates room metadata, participant rosters, and partner assignment in a single network roundtrip.
- **Realtime WebSockets**: Instant synchronization across clients via Supabase Realtime Channels (`room_hub_${id}`). Automatically updates joined participants, online draw readiness, and partner reveal states.
- **Timezone-Aware Countdown Engine**: Supports automated draw schedules with localized timezone offsets, grace periods, and optimistic status changes.

### Interactive Demo Sandbox & Protected Showcase

- **Public Showcase Account Guarding**: The public demo profile (`demo@giftmate.app`) is protected from email modifications, password resets, and account deletion at both UI and PostgreSQL RPC levels.
- **Protected Showcase Room**: Features a pre-configured, populated room where destructive mutations (room deletion, participant kicking, leaving, or joining) are prevented via database checks, while room customization and draw testing remain fully functional.
- **Visual Status Badges**: Features a distinctive `VÉDETT` badge with a `Lock` icon on the dashboard card and room title.

### UX Optimizations & Dynamic Roster Prioritization

- **Intelligent Roster Ordering**: The room organizer is always placed at the very top of the participant list (`#1`), followed immediately by the current user (`#2` - "Te"), providing instant self-orientation regardless of group size.
- **Chronological Dashboard Sorting**: Rooms are retrieved in chronological membership order (`my_rm.joined_at ASC`), ensuring that the user's primary/earliest rooms remain anchored at the front.

### Design System & Festive Micro-Interactions

- **Tailwind CSS v4 Architecture**: Custom responsive breakpoints (`xs: 380px`) tailored for ultra-compact mobile viewports.
- **Lottie Vector Animations**: Seamless, lightweight micro-interactions for festive wind chimes, gift unboxing, celebrate confetti, and state loaders.
- **Unified Avatar Ecosystem**: 20 custom WebP animal avatars, synchronous Google OAuth avatar ingestion, and direct Supabase Storage integration with automatic orphan asset cleanup.

---

## Technology Stack

| Layer                    | Technologies & Tools                                                             |
| :----------------------- | :------------------------------------------------------------------------------- |
| **Frontend Framework**   | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)   |
| **Build & Tooling**      | [Vite 6](https://vitejs.dev/), [Oxlint](https://oxc.rs/)                         |
| **Styling & Layout**     | [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) |
| **Animations**           | [@lottiefiles/dotlottie-react](https://lottiefiles.com/)                         |
| **Backend as a Service** | [Supabase](https://supabase.com/)                                                |
| **Database & Security**  | [PostgreSQL 15](https://www.postgresql.org/), PL/pgSQL, Row Level Security (RLS) |
| **Realtime Engine**      | Supabase Realtime Channels                                                       |
| **Object Storage**       | Supabase Storage                                                                 |
| **Hosting & Deployment** | [Vercel](https://vercel.com/)                                                    |

---

## Repository Structure

```text
GiftMate/
├── public/
│   ├── avatars/             # 20 custom high-resolution WebP avatars
│   ├── banners/             # Festive theme preview graphics
├── src/
│   ├── assets/
│   │   └── animations/      # Lottie motion JSON/DotLottie assets
│   ├── components/
│   │   ├── ui/              # Modals, Toast notifications, RoomCards
│   │   ├── LottieLoader.tsx # Lottie wrapper with fallbacks
│   │   ├── Navbar.tsx       # Responsive navigation with auth sync
│   │   ├── RoomDrawResult.tsx # Scratch-to-reveal partner card
│   │   ├── RoomInfo.tsx     # Room details & settings manager
│   │   └── RoomMembers.tsx  # Participant management & kick controls
│   ├── hooks/
│   │   ├── useClipboard.ts  # Copy-to-clipboard feedback hook
│   │   └── useRoomDetails.ts # Central room state, realtime hub & RPC caller
│   ├── pages/
│   │   ├── CreateRoom.tsx   # Multi-step room creator wizard
│   │   ├── Dashboard.tsx    # User rooms hub & invitation code entry
│   │   ├── Login.tsx        # Sign-in with Google OAuth & password toggle
│   │   ├── Profile.tsx      # User profile, display name & avatar settings
│   │   ├── Register.tsx     # Account registration form
│   │   ├── RoomDetails.tsx  # Main Secret Santa room dashboard
│   │   └── UpdatePassword.tsx # Password recovery and reset screen
│   ├── utils/
│   │   └── avatar.ts        # Storage path extractors & avatar helpers
│   ├── App.tsx              # React Router v7 root routes & modal portal
│   ├── index.css            # Tailwind v4 theme, keyframes & components
│   ├── main.tsx             # Application entry point
│   └── supabaseClient.ts    # Supabase SDK singleton instance
├── supabase/
│   └── functions/           # PostgreSQL RPC definitions (PL/pgSQL source files)
├── .env.example             # Template for required environment variables
├── .gitignore               # Strict ignore rules for secrets and caches
├── package.json             # Scripts & dependency definitions
├── vercel.json              # Vercel SPA routing rewrite rules
└── vite.config.ts           # Vite bundler & Tailwind configuration
```

---

## Getting Started

Follow these steps to run GiftMate locally on your machine.

### 1. Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn** / **pnpm**
- A free **Supabase** account ([supabase.com](https://supabase.com))

### 2. Clone the Repository

```bash
git clone https://github.com/ivanyadrian/GiftMate.git
cd GiftMate
```

### 3. Configure Environment Variables

Create a local `.env` file in the root directory by copying the sample:

```bash
cp .env.example .env
```

Open `.env` and fill in your Supabase project credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Install Dependencies & Start Dev Server

```bash
npm install
npm run dev
```

The application will be running locally at `http://localhost:5173`.

### 5. Production Build & Verification

To test the production build locally:

```bash
npm run build
npm run preview
```

---

## Database Setup & Stored Procedures

The database schema and PostgreSQL functions used in GiftMate are organized in the `supabase/functions/` directory:

- **`create_room`**: Generates collision-resistant 6-character room codes and registers the organizer atomically.
- **`join_room_by_code`**: Validates room code, enforces display name uniqueness, and checks protected room constraints.
- **`leave_room`**: Allows participants to exit un-drawn rooms while preventing abandonment of protected demo rooms.
- **`delete_room`**: Ensures only organizers can delete un-drawn rooms while guarding the demo room against removal.
- **`kick_room_member`**: Grants organizers member moderation privileges while protecting demo room rosters.
- **`update_room_details`**: Updates room settings while locking draw parameters once pairing is active.
- **`get_room_full_details`**: Single-call hydration combining metadata, members, and personal draw pairing.
- **`get_my_rooms`**: Retrieves all rooms for the authenticated user in chronological order of membership.
- **`perform_draw`**: Executes a randomized derangement algorithm ensuring no participant draws themselves.
- **`delete_draw`**: Resets an active draw back to pre-draw status, clearing draw assignments and reveal records.
- **`reveal_my_draw`**: Tracks whether the participant has viewed their assigned partner.
- **`update_profile_username`**: Enforces room-wide unique display names to avoid participant confusion.
- **`delete_current_user`**: Safely deletes account data, converts active draws into ghost participants, and blocks removal of the public demo user.

---

## Acknowledgements & Assets

- **Vector Animations**: Lightweight Lottie animations powered by [@lottiefiles/dotlottie-react](https://lottiefiles.com/):
  - [Christmas Wind Chimes](https://lottiefiles.com/free-animation/christmas-wind-chimes-tB4neGTtaS) (LottieFiles Community)
  - [Referral Gift Unboxing](https://lottiefiles.com/free-animation/referral-gift-wrnR6uNcE4) (LottieFiles Community)
  - [Hourglass Timer Loader](https://lottiefiles.com/free-animation/time-hourglass-H3UkbK6hVS) (LottieFiles Community)
  - [Confetti Celebration](https://lottiefiles.com/free-animation/confetti-ixxUbTQ3Fn) (LottieFiles Community)
  - [Animated Checkmark](https://lottiefiles.com/free-animation/checkmark-EUqSK4A5c8) (LottieFiles Community)
- **Avatars & Graphics**:
  - 20 high-resolution animal avatars in `public/avatars/` generated with AI.
  - Room theme banner illustrations:
    - General: [Pinterest](https://hu.pinterest.com/pin/773282198541351807/)
    - Family: [Pinterest](https://hu.pinterest.com/pin/829788300128379428/)
    - School: [Pinterest](https://hu.pinterest.com/pin/3025924747032999/)
    - Workplace: [Pinterest](https://hu.pinterest.com/pin/11047961580956266/)
- **Icons**: [Lucide React](https://lucide.dev/) and [React Icons](https://react-icons.github.io/react-icons/).

---

## License

This project is open-source software licensed under the [MIT License](LICENSE).
