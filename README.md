
## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy on Render

1. Push this project to a GitHub repository.
2. In Render, select **New +** > **Blueprint**, then connect the repository.
3. Render will read `render.yaml` and create the web service with the correct build and start commands.
4. Enter a value for `GEMINI_API_KEY` in the Render environment-variable prompt, then deploy.

The deployed service includes a health endpoint at `/api/health`. Do not commit your real Gemini API key; keep it only in Render's environment settings.
