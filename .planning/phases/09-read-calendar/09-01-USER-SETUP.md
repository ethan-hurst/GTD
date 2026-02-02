# User Setup Required - Plan 09-01

## Microsoft Entra ID (Azure AD) Configuration

**Why:** OAuth 2.0 authentication for Microsoft Graph API (Outlook calendar access)

### 1. Register Application in Azure Portal

**Location:** Azure Portal → Microsoft Entra ID → App registrations → New registration

**Steps:**

1. Navigate to https://portal.azure.com
2. Go to Microsoft Entra ID (formerly Azure Active Directory)
3. Click "App registrations" in the left sidebar
4. Click "+ New registration"
5. Fill in the registration form:
   - **Name:** GTD App (or any name you prefer)
   - **Supported account types:** "Accounts in any organizational directory and personal Microsoft accounts"
   - **Redirect URI:** Leave blank for now (we'll add it next)
6. Click "Register"
7. **Save the Application (client) ID** — you'll need this for `PUBLIC_MSAL_CLIENT_ID`

### 2. Configure Redirect URI

**Location:** Azure Portal → App registrations → [your app] → Authentication → Add a platform

**Steps:**

1. In your newly registered app, click "Authentication" in the left sidebar
2. Click "+ Add a platform"
3. Select "Single-page application"
4. Add redirect URIs:
   - For development: `http://localhost:5173`
   - For production: `https://your-production-domain.com`
5. Click "Configure"

### 3. Add API Permissions

**Location:** Azure Portal → App registrations → [your app] → API permissions → Add a permission

**Steps:**

1. Click "API permissions" in the left sidebar
2. Click "+ Add a permission"
3. Select "Microsoft Graph"
4. Select "Delegated permissions"
5. Search for and add these permissions:
   - `Calendars.ReadWrite` — Read and write access to user calendars
   - `User.Read` — Sign in and read user profile
6. Click "Add permissions"

**Note:** These permissions do not require admin consent for personal Microsoft accounts. Corporate/organizational accounts may require admin consent depending on tenant policies.

### 4. Configure Environment Variables

Add the following to your `.env` file (create if it doesn't exist):

```env
# Microsoft Entra ID (MSAL) Configuration
PUBLIC_MSAL_CLIENT_ID=<your-application-client-id>
PUBLIC_MSAL_AUTHORITY=https://login.microsoftonline.com/common
```

**Where to find these values:**

- `PUBLIC_MSAL_CLIENT_ID`: Azure Portal → App registrations → [your app] → Overview → Application (client) ID
- `PUBLIC_MSAL_AUTHORITY`: Azure Portal → App registrations → [your app] → Endpoints → OAuth 2.0 authorization endpoint (v2)
  - For multi-tenant apps (personal + work accounts), use: `https://login.microsoftonline.com/common`
  - For single-tenant apps, use: `https://login.microsoftonline.com/<your-tenant-id>`

### 5. Verify Configuration

After setting environment variables, restart your dev server:

```bash
npm run dev
```

The MSAL authentication service will now be able to:

- Redirect users to Microsoft login
- Acquire access tokens for Graph API calls
- Handle token refresh automatically

### Troubleshooting

**Error: "AADSTS50011: The redirect URI specified in the request does not match"**
- Check that your redirect URI in Azure matches `window.location.origin` exactly
- For localhost, use `http://localhost:5173` (not `http://127.0.0.1:5173`)

**Error: "AADSTS65001: The user or administrator has not consented"**
- Permissions require user consent on first login
- Corporate accounts may require admin consent (contact your IT administrator)

**Error: "MSAL can only be initialized in the browser"**
- This is expected during SSR build steps
- MSAL is SSR-safe and will only initialize in the browser

### Next Steps

Once configuration is complete, the Graph API client (Plan 09-02) and calendar sync service (Plan 09-03) will be able to authenticate and sync Outlook calendar events.
