# Vouch Monitor

A GitHub user trust monitoring system that indexes repositories for `.td` files to identify vouched (safe) users and denounced (AI/danger) users.

## Features

- 🔍 **Repository Indexing** - Scan GitHub repositories for `.td` files
- ✅ **User Vouching** - Identify safe, verified users marked as "vouch"
- ⚠️ **Threat Detection** - Flag AI bots and dangerous users marked as "denounced"
- 📊 **Dashboard** - Real-time statistics and user listing
- 🎨 **Modern UI** - Beautiful interface with shadcn/ui components and smooth animations
- 🔄 **Live Updates** - Automatically refresh user status

## How It Works

1. **Index Repository**: Enter a GitHub repository URL
2. **Scan for .td Files**: The system recursively searches for all `.td` files
3. **Parse User Data**: Extracts username and status (vouch/denounced) from each file
4. **Display Results**: Shows users in a filterable table with their trust status

## .td File Format

The system looks for `.td` files with the following format:

```
username: john_doe
status: vouch
```

or

```
username: ai_bot_2024
status: denounced
```

**Status Types:**
- `vouch` - Safe, verified user (shown with green badge)
- `denounced` - AI bot or dangerous user (shown with red badge)

## Tech Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript
- **UI Components:** shadcn/ui
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **API:** GitHub REST API v3

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd vouch-monitor
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Add GitHub Personal Access Token for higher API rate limits:
Create a `.env.local` file:
```env
GITHUB_TOKEN=your_github_token_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Usage

### Indexing a Repository

1. Navigate to the main page
2. Enter a GitHub repository URL in the format:
   - `https://github.com/username/repository`
   - `https://github.com/username/repository.git`
3. Click "Index Repository"
4. Wait for the system to scan and extract user data
5. View results in the table below

### Filtering Users

Use the filter buttons to view:
- **All Users** - Show everyone
- **Vouched** - Only safe, verified users
- **Denounced** - Only flagged AI/dangerous users

## Project Structure

```
vouch-monitor/
├── app/
│   ├── api/
│   │   └── index-repo/
│   │       └── route.ts         # API endpoint for repository indexing
│   ├── page.tsx                 # Main page
│   └── globals.css              # Global styles
├── components/
│   ├── ui/                      # shadcn/ui components
│   └── vouch-monitor.tsx        # Main monitor component
└── lib/
    ├── github.ts                # GitHub API integration
    ├── types.ts                 # TypeScript type definitions
    └── utils.ts                 # Utility functions
```

## API Reference

### POST /api/index-repo

Index a GitHub repository and extract users from `.td` files.

**Request Body:**
```json
{
  "repoUrl": "https://github.com/username/repository"
}
```

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "username": "john_doe",
      "status": "vouch",
      "repo": "username/repository",
      "filePath": "users/john_doe.td",
      "addedAt": "2024-02-10T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

## Features in Detail

### Button Interactions
- **Hover Effects** - Smooth scale animations on hover
- **Click Effects** - Active scale-down animation on click
- **Gradient Backgrounds** - Beautiful gradient colors with shadow effects
- **Loading States** - Animated spinner during operations

### User Status Badges
- **Vouch Badge** - Green gradient with Shield icon
- **Denounced Badge** - Red gradient with Alert Triangle icon
- **Animated Indicators** - Pulsing dot indicators for quick status identification

### Statistics Dashboard
- **Total Users** - Count of all indexed users
- **Vouched Users** - Count of safe users
- **Denounced Users** - Count of flagged users
- **Auto-Update** - Statistics update as new users are added

## Rate Limits

GitHub API has rate limits:
- **Unauthenticated**: 60 requests/hour
- **Authenticated**: 5,000 requests/hour

To increase limits, add a GitHub Personal Access Token to `.env.local`.

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
