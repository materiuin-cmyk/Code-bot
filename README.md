# 🪲 Mushi

Mushi is a simple and lightweight WhatsApp bot written in javascript using [Baileys](github.com/WhiskeySockets/Baileys) library.

> Note: This project is still in development and may not work as expected.

## Example `.env` configuration
```sh
# Your WhatsApp account phone number include country code
PHONE="628xxxxxx"

# METHOD can be 'otp' or 'qr'
METHOD="otp"

# SESSION for folder storage
# SESSION="/path/to/session/folder"

# SESSION for sqlite database
SESSION="path/to/sqlite.db"

# BROWSER can be 'Chrome', 'Safari' or 'Firefox'
BROWSER="Safari"

# PLUGIN_DIR for custom plugins
PLUGIN_DIR="/path/to/plugins/folder"

# Gemini API key and model
GEMINI_API_KEY="<your_gemini_api_key>"

# Example: gemini-2.0-pro
GEMINI_MODEL="<your_gemini_model>" 
```


