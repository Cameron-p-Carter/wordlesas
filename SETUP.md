# Wordle Clone - Setup Instructions

## Database Setup

### Step 1: Run SQL Schema in Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/nlvtqayoutuihdiwhdzu
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the SQL from the root `supabase-schema.sql` file
5. Paste it into the SQL editor
6. Click "Run" or press Ctrl/Cmd + Enter

This will create:
- `users` table - stores user accounts
- `games` table - stores wordle games and words
- `scores` table - stores user scores for each game
- Indexes for better performance
- Row Level Security policies
- A default admin user (username: "admin")

### Step 2: Verify Tables Were Created

In your Supabase dashboard:
1. Click on "Table Editor" in the left sidebar
2. You should see three tables: users, games, scores

## Running the Application

### Install Dependencies

```bash
cd wordlesas
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will be available at http://localhost:3000

## Using the Application

### For Regular Users:

1. **Register/Login**
   - Go to home page
   - Enter your name
   - Click "Register" (first time) or "Login" (returning user)

2. **Play Wordle**
   - Click "Play Wordle" from the home page
   - Type your 5-letter guesses
   - Press Enter to submit
   - You get 6 attempts to guess the word

3. **View Leaderboard**
   - Click "Leaderboard" from the home page
   - See rankings by total points
   - View win rates and stats

### For Admin Users:

Login with username "admin" (created by default in the SQL schema)

1. **Create New Games**
   - Click "Admin" button in navigation
   - Go to "Games" tab
   - Enter a 5-letter word
   - Click "Create Game"

2. **Activate/Deactivate Games**
   - Only ONE game can be active at a time
   - Click "Activate" to make a game playable
   - Click "Deactivate" to end a game
   - Players can only play the currently active game

3. **Manage Users**
   - Go to "Users" tab
   - Make users admins or remove admin privileges
   - Delete users if needed

## Scoring System

- 1 guess = 5 points
- 2 guesses = 4 points
- 3 guesses = 3 points
- 4 guesses = 2 points
- 5 guesses = 1 point
- 6 guesses = 1 point
- Failed = 0 points

## Deploying to Vercel

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = https://nlvtqayoutuihdiwhdzu.supabase.co
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your anon key from .env.local)
5. Click "Deploy"

Your app will be live at a Vercel URL!

## Troubleshooting

### Can't Login
- Make sure you ran the SQL schema in Supabase
- Check browser console for errors
- Verify Supabase credentials in .env.local

### No Active Game
- Login as admin
- Create a game in the admin panel
- Activate it by clicking "Activate"

### Scores Not Saving
- Check Supabase table editor to see if scores table exists
- Look at browser console for errors
- Verify Row Level Security policies were created

## Features

- ✅ User registration/login (name-based, no password)
- ✅ Wordle game with color-coded feedback
- ✅ Score tracking (1-5 points based on guesses)
- ✅ Leaderboard with rankings
- ✅ Admin panel to create/manage games
- ✅ Admin panel to manage users
- ✅ One active game at a time
- ✅ Users can only play each game once
- ✅ Responsive design with Tailwind CSS
- ✅ Real-time data from Supabase
