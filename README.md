# Time Hack - USAF Pilot Training Timer

A production-ready web application designed for U.S. Air Force pilot training environments, providing extremely precise synchronized time with visual countdown cues for running accurate time hacks.

## Features

- **Precision Time Sync**: Synchronizes with U.S. Naval Observatory (USNO) time via worldtimeapi.org
- **Large Display**: Full-screen digital clock (HH:MM:SS) optimized for visibility
- **Flash Cues**: Automatic screen flashes at 30-second intervals and top of minute
- **Countdown Overlay**: Visual 10-second countdown before minute marks
- **Bottom Text**: Dynamic display of upcoming minute time
- **Mobile Responsive**: Optimized for mobile browsers in portrait orientation
- **Zero User Input**: Runs automatically without requiring any interaction
- **Minimal UI**: Clean, distraction-free interface with no headers or sidebars

## Design Specifications

### Display
- White numbers on black background by default
- Bold monospace font (Courier New)
- Fills entire screen with no scrollbars
- No Streamlit sidebar, headers, or extra UI elements

### Flash Behavior
- Occurs at: `:00` (top of minute) and `:30` (half minute)
- Pattern: 3 rapid flashes (~150ms each)
- Color inversion: Black background ↔ White background

### Countdown
- Starts at 10 seconds before minute mark (XX:XX:50)
- Flashes once per second
- Shows countdown overlay (10, 9, 8, ... 1, 0)
- Green colored countdown numbers

### Bottom Text
- Displays 60 seconds: "In one minute, the time will be HH:MM UTC."
- Displays 30 seconds: "In 30 seconds, the time will be HH:MM UTC."
- Automatically updates based on time to next minute

## Tech Stack

- **Framework**: Streamlit
- **Language**: Python 3.8+
- **Time API**: worldtimeapi.org (USNO UTC time)
- **Styling**: Embedded HTML/CSS
- **Deployment**: Streamlit Community Cloud or Vercel

## Installation

### Local Development

```bash
# Clone or navigate to project
cd timehack

# Install dependencies
pip install -r requirements.txt

# Run the app
streamlit run timehack.py
```

The app will open at `http://localhost:8501`

### Deployment to Streamlit Community Cloud

1. Push your code to a GitHub repository
2. Go to [share.streamlit.io](https://share.streamlit.io)
3. Click "New app"
4. Select your repository, branch, and file (`timehack.py`)
5. Click "Deploy"

The app will be live at `https://share.streamlit.io/[username]/[repo]/timehack.py`

### Deployment to Vercel (Alternative)

For faster performance on Vercel, convert to FastAPI with frontend (advanced):

```bash
vercel deploy
```

## How It Works

### Time Synchronization
- Fetches current UTC time from worldtimeapi.org every 5 seconds
- Tracks drift offset internally
- Uses `time.time()` between syncs for precision

### Flash Detection
- Calculates seconds within current minute
- Triggers flash at `:00` and `:30` mark
- Uses rapid container re-renders for flash effect

### Countdown Activation
- Monitors seconds in minute
- Countdown begins at `:50` (10 seconds before next minute)
- Shows green overlay with current countdown value

## Performance Notes

- Streamlit reruns every ~100ms for smooth animation
- No external state management required
- Session state maintains sync offset and timing data
- Optimized CSS prevents layout shift

## Browser Compatibility

- Chrome/Edge: Full support
- Safari: Full support
- Firefox: Full support
- Mobile browsers: Full support (responsive design)

## USAF Pilot Training Guidelines

For use in official pilot training environments:
- Ensure reliable internet connection for USNO time sync
- Test on target devices before mission
- Verify time accuracy against reference clock before use
- Use in full-screen mode for maximum visibility

## Troubleshooting

### Time Appears Incorrect
- Check internet connection
- Verify worldtimeapi.org is accessible
- Reload page to force time sync

### Flashes Not Visible
- Adjust display brightness
- Ensure no screen filters or night mode enabled
- Test on different display

### Countdown Not Showing
- Check if currently past 10-second mark before minute
- Verify JavaScript is enabled in browser
- Refresh page

## Architecture

```
timehack.py
├── Page Configuration
├── Session State Management
├── USNO Time Sync Functions
├── Display Logic
│   ├── Flash detection
│   ├── Countdown logic
│   └── Text formatting
└── Streamlit UI Rendering
```

## License

This application is provided for USAF pilot training use.

## Support

For issues or questions, verify:
1. Python 3.8+ installed
2. Requirements installed: `pip install -r requirements.txt`
3. Internet connectivity for USNO time API
4. No firewall blocking worldtimeapi.org

