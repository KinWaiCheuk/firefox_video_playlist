VIDEO PLAYLIST — Firefox prototype

INSTALL
1. Extract this ZIP.
2. In your normal Firefox, open about:debugging#/runtime/this-firefox
3. Click Load Temporary Add-on and choose manifest.json in the extracted folder.
4. Open Video Playlist from Firefox's Extensions (puzzle-piece) menu.
5. Paste one video-page URL per line and click Start playlist.

BEHAVIOR
Opens a new tab in your normal profile. Attempts playback of the first visible
HTML5 video meeting the minimum duration (120 seconds by default). Watches
nested web frames too. Advances when that video ends. Closes only that tab
when finished; if unchecked, replaces its page with about:blank to stop autoplay.
Stop also closes/blanks that tab. It does not quit Firefox.

AUTOPLAY
Firefox or the embedded player may require permission or a click. Allow Audio
and Video in the site's autoplay permission, including the embedded player
origin when relevant. If the site requires its own initial Play click, do so.
The extension then watches for the end. It does not click unknown buttons.

LIMITATIONS
This is an unsigned temporary add-on: reload after restarting Firefox. Mozilla
signing is required for normal permanent installation. The playlist is not
resumed automatically after a browser restart. It uses standard HTML5 video,
not a site-specific integration. Shadow-DOM-only players and nonstandard
players may not work. Long ads or multiple players can confuse selection.
If a site switches episodes before firing ended, detection may fail.
The supplied Anikoto page has NOT been verified in a live browser. This does
not guarantee that it resolves the homepage redirect.

PRIVACY / PERMISSIONS
Needs access to HTTP/HTTPS pages to watch videos in playlist sites and their
third-party player frames. Only acts on the dedicated playlist tab while
running. No network requests or analytics are made by the extension itself.
URLs and preferences are saved locally in Firefox extension storage.
