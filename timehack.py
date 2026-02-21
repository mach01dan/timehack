import streamlit as st
import requests
import time
from datetime import datetime, timedelta
import math

# Page configuration
st.set_page_config(
    page_title="Time Hack",
    page_icon="⏱️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Hide all Streamlit elements
st.markdown(
    """
    <style>
    #MainMenu {display: none;}
    footer {display: none;}
    header {display: none;}
    [data-testid="collapsibleSession"] {display: none;}
    .stAppViewContainer {padding: 0; margin: 0;}
    .main {padding: 0; margin: 0;}
    .stApp {background-color: #000000;}
    body {background-color: #000000; margin: 0; padding: 0;}
    </style>
    """,
    unsafe_allow_html=True
)

# Initialize session state for drift tracking
if "offset" not in st.session_state:
    st.session_state.offset = 0
if "last_sync" not in st.session_state:
    st.session_state.last_sync = 0
if "flash_state" not in st.session_state:
    st.session_state.flash_state = False
if "countdown_active" not in st.session_state:
    st.session_state.countdown_active = False
if "countdown_value" not in st.session_state:
    st.session_state.countdown_value = 0


def get_usno_time():
    """Fetch current UTC time from USNO via worldtimeapi.org"""
    try:
        response = requests.get("https://worldtimeapi.org/api/timezone/Etc/UTC", timeout=5)
        if response.status_code == 200:
            data = response.json()
            # Get datetime from ISO string
            iso_time = data["datetime"]
            # Parse ISO format
            dt = datetime.fromisoformat(iso_time.replace("Z", "+00:00"))
            return dt.timestamp()
    except Exception:
        pass
    return None


def get_current_time():
    """Get current time with drift compensation"""
    current_timestamp = time.time()
    elapsed = current_timestamp - st.session_state.last_sync
    return current_timestamp + st.session_state.offset, elapsed


def sync_time():
    """Sync to USNO and update drift offset"""
    server_time = get_usno_time()
    if server_time is not None:
        local_time = time.time()
        st.session_state.offset = server_time - local_time
        st.session_state.last_sync = local_time
        return True
    return False


def get_formatted_time(timestamp):
    """Convert timestamp to HH:MM:SS string"""
    dt = datetime.utcfromtimestamp(timestamp)
    return dt.strftime("%H:%M:%S")


def get_seconds_from_midnight(timestamp):
    """Get seconds elapsed in current UTC day"""
    dt = datetime.utcfromtimestamp(timestamp)
    return dt.hour * 3600 + dt.minute * 60 + dt.second


def get_local_time_string(timestamp):
    """Get local time string for display (assuming pilot uses local time)"""
    # For USAF pilots, typically display in local time zone
    # We'll show UTC but label it appropriately
    dt = datetime.utcfromtimestamp(timestamp)
    return dt.strftime("%H:%M")


def should_flash(current_timestamp):
    """Determine if screen should flash now"""
    seconds = get_seconds_from_midnight(current_timestamp)
    # Flash at :00 and :30 of each minute
    return (seconds % 60 == 0) or (seconds % 60 == 30)


def should_countdown(current_timestamp):
    """Determine if countdown should be active"""
    seconds = get_seconds_from_midnight(current_timestamp)
    seconds_in_minute = seconds % 60
    # Countdown starts at :50 (10 seconds before next minute)
    return seconds_in_minute >= 50


def get_countdown_value(current_timestamp):
    """Get countdown value (10, 9, 8, ... 1, 0)"""
    seconds = get_seconds_from_midnight(current_timestamp)
    seconds_in_minute = seconds % 60
    if seconds_in_minute >= 50:
        return max(0, 60 - seconds_in_minute)
    return 0


def get_next_minute_time(current_timestamp):
    """Get the time of the next minute mark"""
    dt = datetime.utcfromtimestamp(current_timestamp)
    next_minute = dt.replace(second=0, microsecond=0) + timedelta(minutes=1)
    return next_minute.strftime("%H:%M")


# Sync time periodically
if time.time() - st.session_state.last_sync > 5:
    sync_time()

# Get current time
current_time, _ = get_current_time()
formatted_time = get_formatted_time(current_time)
seconds_in_minute = get_seconds_from_midnight(current_time) % 60

# Determine display state
is_flashing = should_flash(current_time)
is_countdown = should_countdown(current_time)
countdown_val = get_countdown_value(current_time)
next_minute_str = get_next_minute_time(current_time)

# Determine seconds until next minute
if seconds_in_minute <= 30:
    message = f"In one minute, the time will be {next_minute_str} UTC."
else:
    message = f"In 30 seconds, the time will be {get_next_minute_time(current_time + 30)} UTC."

# Create main container for time display and countdown
col1, col2, col3 = st.columns([1, 10, 1])

with col2:
    # Flash effect container
    if is_flashing:
        flash_placeholder = st.empty()
        with flash_placeholder.container():
            st.markdown(
                f"""
                <div style="
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    background-color: #ffffff;
                    position: relative;
                ">
                    <div style="
                        font-size: 200px;
                        font-weight: bold;
                        font-family: 'Courier New', monospace;
                        color: #000000;
                        text-align: center;
                        line-height: 1;
                        letter-spacing: 10px;
                    ">{formatted_time}</div>
                </div>
                """,
                unsafe_allow_html=True
            )
    else:
        # Normal time display
        st.markdown(
            f"""
            <div style="
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background-color: #000000;
                position: relative;
            ">
                <div style="
                    font-size: 200px;
                    font-weight: bold;
                    font-family: 'Courier New', monospace;
                    color: #ffffff;
                    text-align: center;
                    line-height: 1;
                    letter-spacing: 10px;
                ">{formatted_time}</div>
                
                {'<div style="font-size: 150px; color: #00ff00; margin-top: 40px; font-family: Courier New, monospace; font-weight: bold;">' + str(countdown_val) + '</div>' if is_countdown else ''}
            </div>
            """,
            unsafe_allow_html=True
        )

# Bottom text display
st.markdown(
    f"""
    <div style="
        position: fixed;
        bottom: 20px;
        left: 0;
        right: 0;
        text-align: center;
        color: #888888;
        font-family: 'Courier New', monospace;
        font-size: 16px;
    ">
        {message}
    </div>
    """,
    unsafe_allow_html=True
)

# Force refresh for smooth animation
st.markdown(
    """
    <script>
    setTimeout(function() {
        location.reload();
    }, 100);
    </script>
    """,
    unsafe_allow_html=True
)
