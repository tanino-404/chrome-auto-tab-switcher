# Auto Tab Switcher

A Chrome extension for automatic tab switching, perfect for digital signage applications.

<img src="https://raw.githubusercontent.com/tanino-404/chrome-auto-tab-switcher/refs/heads/image/Chrome_AutoTabSwitcher.png" alt="Screenshot" title="Auto Tab Switcher - Screenshot">

## Features

- **Dynamic Tab Management**: Add/remove tabs as needed (list format)
- **Individual Display Time Settings** for each tab (in seconds)
- **Per-Tab Reload Settings**: Enable/disable reload functionality for each tab individually
- **Auto-Start on Chrome Launch** (modern toggle button)
- **Existing Tab Reuse**: Detects and reuses existing tabs on Chrome startup to prevent duplicates
- **Status Display Icons**: Dedicated icons to show running/stopped status at a glance
- **Dark Mode Support**: Automatically adapts to system theme
- **Beautiful M+ 1p Font**: Readable Japanese font with optimized weights
- **Support for Both Web Pages and Local Files** (file://)
- **Enhanced Error Handling**: Stable long-term operation
- **Persistent Settings**

## Installation

### 1. Developer Mode Installation

1. Open Chrome
2. Enter `chrome://extensions/` in the address bar
3. Turn ON "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the `extension` folder

### 2. Required Permissions Setup

For accessing local files (`file://`):

1. Find "Auto Tab Switcher" in `chrome://extensions/`
2. Click "Details"
3. Turn ON "Allow access to file URLs"

## Usage

### 1. Basic Setup

1. Click the extension icon in Chrome toolbar
2. Add tabs using the **"+" button**
3. For each tab, enter:
   - **URL/Path**: Web page URL or local file path starting with `file://`
   - **Time**: Display duration in seconds (1-3600 seconds)
4. Remove unwanted tabs with the **🗑️ button**

### 2. Starting Tab Switching

1. Configure the required tabs
2. Click "Save Settings" button
3. Click "Start" button

### 3. Auto-Start Configuration

- Enable "Auto-start on Chrome launch" with the **toggle button** to automatically start tab switching when Chrome starts
- **Status Icons**: Check running status with the toolbar icon
  - 🟢 Running Icon: Tab switching is active
  - 🔴 Stopped Icon: Tab switching is stopped

## Configuration Examples

### For Web Pages
```
URL: https://www.google.com
Time: 30 seconds
```

### For Local Files
```
URL: file:///C:/signage/video.html
Time: 60 seconds
```

### For Local Video Files
Create an HTML file to embed videos:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Video Display</title>
    <style>
        body { margin: 0; background: black; }
        video { width: 100vw; height: 100vh; object-fit: cover; }
    </style>
</head>
<body>
    <video autoplay loop muted>
        <source src="video.mp4" type="video/mp4">
    </video>
</body>
</html>
```

## Testing

### Basic Test

1. Configure 2-3 web pages (e.g., Google, YouTube, Wikipedia)
2. Set display time to 10 seconds for each tab
3. Verify switching works correctly

### Local File Test

1. Create a simple HTML file and save locally
2. Configure with `file://` URL
3. Verify switching works correctly

### Long-Term Operation Test

1. After configuration, test continuous operation for 1+ hours
2. Verify no memory leaks occur
3. Check error logs

## Troubleshooting

### Common Issues

1. **Tabs Won't Open**
   - Verify URL is correct
   - Check network connection
   - For local files, verify path and file existence

2. **Local Files Won't Open**
   - Check if "Allow access to file URLs" is enabled in extension details
   - Verify file path is correct (e.g., `file:///C:/path/to/file.html`)

3. **Auto-Switching Stops**
   - Switching automatically stops if tabs are manually closed
   - Check logs to identify error causes

### Log Checking

1. Open the extension popup
2. Check errors and operation status in the "Logs" section at the bottom
3. If issues occur, use "Clear Logs" and retest

### Debugging with Chrome DevTools

1. Click "Service Worker" in `chrome://extensions/`
2. DevTools opens - check console for errors

## File Structure

```
extension/
├── manifest.json      # Extension configuration file
├── background.js      # Background script (main logic)
├── popup.html        # Popup UI
├── popup.js          # Popup logic
├── popup.css         # Stylesheet (M+ 1p font applied)
└── icons/            # Icon files
    ├── icon-xx.png         # Base icon
    ├── icon-running-xx.png  # Running icon (green)
    ├── icon-stopped-xx.png  # Stopped icon (red)
```

## Limitations

- Local file access requires additional permissions
- Operation may be limited while Chrome is minimized
- Some websites may interfere with auto-switching
- Icon files must be placed in the extension folder

## Development Information

- **Manifest Version**: 3
- **Supported Browser**: Chrome (latest version)
- **APIs Used**: tabs, storage, alarms, windows
- **License**: MIT

## Release History

### v1.3.0
- 🔄 **Per-Tab Reload Settings**: Enable/disable reload functionality for each tab individually
- 🎨 **Improved 2-Row Layout**: Row 1 (URL・Time), Row 2 (Reload・Delete) for better organization
- 🎛️ **Unified Toggle Switch**: Reload settings managed with same design as auto-start
- ✨ **Enhanced Visibility**: Delete button changed to simple white "×" icon
- 🧹 **Debug Log Cleanup**: Commented out unnecessary logs for production use
- 🎯 **UX Improvements**: More intuitive and user-friendly tab management interface

### v1.2.0
- 🎨 **M+ 1p Font Applied**: Unified with beautiful, readable Japanese font
- 🔧 **Font Weight Optimization**: Proper weight settings for titles, body text, and labels
- 🎯 **Status Icons Restored**: Dedicated icons for clear running/stopped status
- 🐛 **Auto-Start Bug Fix**: Resolved icon status inconsistency on Chrome restart
- ⚡ **Improved Initialization Process**: More stable startup handling
- 🚀 **Enhanced UI State Management**: Consistent user experience

### v1.1.0
- 📱 **List-Style Tab Management**: Dynamic add/remove functionality
- 🎨 **Dark Mode Support**: Automatic adaptation to system theme
- 🔄 **Existing Tab Reuse**: Prevents duplicate tabs on Chrome startup
- 🎛️ **Modern Toggle Button**: More intuitive auto-start settings
- 🎯 **Improved Layout**: UI elements arranged in user-friendly order

### v1.0.0
- Initial release
- Basic tab switching functionality
- Persistent settings
- Auto-start functionality
- Error handling
- Log functionality

---

## 日本語版 / Japanese Version

日本語での詳細な説明は [README_ja.md](README_ja.md) をご覧ください。

For detailed instructions in Japanese, please see [README_ja.md](README_ja.md).