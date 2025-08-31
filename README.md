# Trauma Board Frontend

A modern, responsive React.js frontend for the Trauma Board API, built with Next.js 14 and featuring a single-page design with drag-and-drop functionality.

## Features

### 🎯 **Single-Page Design**
- **Unified Interface**: All functionality in one comprehensive view
- **Status-Based Organization**: Cases automatically sorted by workflow status (New Referrals, Awaiting Surgery, On List, Completed)
- **Subspecialty Tracking**: Separate tracking of anatomical subspecialty (Hip & Knee, Foot & Ankle, Shoulder & Elbow, Hand)
- **Real-time Updates**: Live synchronization with the backend API

### 📊 **Smart Case Management**
- **Inline Editing**: Edit any case field directly in the table
- **Drag & Drop**: Drag cases from the table to the calendar to schedule surgeries
- **Status & Subspecialty**: Separate tracking of workflow status and anatomical subspecialty
- **Flexible Schema**: Supports additional columns when you extend the API

### 📅 **Horizontal Calendar**
- **Week View**: Horizontal layout showing 7 days (Saturday to Friday)
- **Visual Indicators**: Today highlighted, past dates dimmed
- **Drop Zones**: Drag cases to any date to schedule surgery
- **Navigation**: Previous/Next week, jump to today
- **Color Coding**: Different colors for different case sections

### 🔧 **Advanced Features**
- **JWT Authentication**: Secure login with token-based auth
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Toast Notifications**: Real-time feedback for all actions
- **Loading States**: Smooth user experience with loading indicators
- **Error Handling**: Graceful error handling with user-friendly messages

## 🔒 **Security Features**

### **Frontend Security**
- **JWT Token Validation**: Client-side token structure and expiration validation
- **Automatic Token Management**: Secure token storage and automatic cleanup
- **Session Management**: 24-hour session timeout with automatic logout
- **Enhanced Error Handling**: Proper handling of authentication failures
- **Request Timeouts**: 10-second timeout on all API requests
- **WebSocket Security**: Authenticated WebSocket connections with reconnection logic

### **Backend Security Requirements**
The frontend expects the following security measures on your API:
- ✅ **JWT Token Validation**: Validate tokens on every protected endpoint
- ✅ **CORS Configuration**: Properly configured for your domain
- ✅ **Rate Limiting**: Prevent abuse and brute force attacks
- ✅ **Input Validation**: Validate and sanitize all inputs
- ✅ **HTTPS**: Secure communication over TLS

### **Environment Configuration**
```env
# Required
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_WS_URL=wss://your-api-domain.com/ws

# Optional
NEXT_PUBLIC_API_KEY=your_api_key_here
```

## Tech Stack

- **Framework**: Next.js 14 (App Router, CSR)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Access to the Trauma Board API

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd tboardapp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_API_URL=https://trauma-board-api.onrender.com
   NEXT_PUBLIC_WS_URL=wss://trauma-board-api.onrender.com/ws
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to `http://localhost:3000`

## Usage

### Authentication
- Login with your credentials
- JWT tokens are automatically managed
- Logout button in the top-right corner

### Managing Cases

#### Adding New Cases
1. Click the **"Add Case"** button at the top of the table
2. Fill in the required fields (Name, Diagnosis)
3. Optionally set Outcome and Surgery Date
4. Click **"Save Case"** - new cases are added to "New Referrals"

#### Editing Cases
1. Click the **Edit** icon (pencil) next to any case
2. Modify the fields inline
3. Click **Save** to confirm changes

#### Scheduling Surgeries
1. **Drag** any case from the table (except "Scheduled" cases)
2. **Drop** it onto a date in the horizontal calendar
3. The case will automatically:
   - Get assigned the surgery date
   - Move to "On List" section
   - Appear in the calendar view

#### Deleting Cases
1. Click the **Delete** icon (trash) next to any case
2. Confirm the deletion in the popup

### Calendar Navigation
- **Previous/Next Week**: Use the navigation buttons
- **Today**: Click "Today" to jump to current week
- **Week Display**: Shows Saturday to Friday by default

## Project Structure

```
tboardapp/
├── app/                    # Next.js App Router pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── login/             # Login page
│   └── page.tsx           # Main trauma board page
├── components/            # React components
│   ├── TraumaBoard.tsx    # Main board component
│   ├── CasesTable.tsx     # Sortable table by section
│   ├── HorizontalCalendar.tsx # Drag-drop calendar
│   ├── InlineCaseEditor.tsx   # Add new cases
│   └── LoginForm.tsx      # Authentication form
├── lib/                   # Utilities and configurations
│   ├── api.ts            # API client and endpoints
│   ├── auth.ts           # Authentication utilities
│   ├── types.ts          # TypeScript interfaces
│   └── websocket.ts      # WebSocket client
├── public/               # Static assets
└── package.json          # Dependencies and scripts
```

## API Integration

The frontend integrates with the Trauma Board API through:

### Authentication Endpoints
- `POST /users/login` - User authentication
- `POST /users/register` - User registration

### Case Management Endpoints
- `GET /cases/` - Fetch all cases with optional filters
- `POST /cases/` - Create new case
- `PATCH /cases/{id}` - Update existing case
- `DELETE /cases/{id}` - Delete case

### WebSocket Events
- Real-time updates for case creation, updates, and deletion
- Automatic UI synchronization

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `https://trauma-board-api.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | WebSocket connection URL | `wss://trauma-board-api.onrender.com/ws` |

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Adding New Fields

The application is designed to handle additional case fields when you extend the API:

1. **Update Types**: Add new fields to `lib/types.ts`
2. **Update Forms**: Modify `InlineCaseEditor.tsx` to include new fields
3. **Update Table**: Add new columns to `CasesTable.tsx`
4. **Update API**: Ensure new fields are handled in `lib/api.ts`

### Styling

The app uses Tailwind CSS with custom components defined in `app/globals.css`:
- `.btn-primary` - Primary button styling
- `.input-field` - Form input styling
- `.table-header` - Table header styling
- `.table-cell` - Table cell styling

## Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
1. Build the project: `npm run build`
2. Deploy the `.next` folder to your hosting platform
3. Set environment variables on your hosting platform

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
