# Narrative Forge

## Project Description

Narrative Forge is an interactive web application that empowers users to create their own personalized comic book narratives. By leveraging your webcam and the power of generative AI, you can cast yourself as the hero of a unique, visually-rich story. Define your character's persona, write the plot, and watch as the application forges your narrative into a series of comic book-style frames.

## How It Works

1.  **Capture Your Identity:** The app starts by requesting access to your webcam. You can capture a photo of yourself, which will serve as the base image for your character.
2.  **Forge Your Narrative:** Once your image is captured, you define your character's persona (e.g., "A grizzled space detective") and write a simple story, with each line representing a new panel in your comic.
3.  **Generate Story:** With a click of a button, Narrative Forge sends your image, persona, and story prompts to a generative AI model.
4.  **View Your Comic:** The AI generates a unique, comic book-style image for each line of your narrative, maintaining your likeness across the panels. The resulting storyboard is displayed at the bottom of the screen.

## Setup and Running Locally

### Prerequisites
*   A Google Gemini API key.
*   A local web server. [Node.js](https://nodejs.org/) users can easily install `serve` via `npm`.

### Installation & Setup

1.  **Clone or download the project files.**

2.  **Set up your API Key:**
    The application loads the Gemini API key from the server's environment variables. You will need to configure this on the server you use to host the files. For local development, you can use a tool that loads `.env` files.

3.  **Start a local server:**
    This project uses modern browser features like import maps and can be run without a complex build step. Simply serve the project's root directory with any static file server.

    If you have Node.js installed, you can use the `serve` package for a quick setup:
    ```bash
    # Install serve globally
    npm install -g serve

    # Run the server from the project's root directory
    serve
    ```

4.  **Open the application:**
    Once the server is running, open your web browser and navigate to the local address it provides (e.g., `http://localhost:3000`).

---

## Development Changelog

This log is maintained to track significant changes, architectural decisions, and bug fixes to avoid regressions and repetitive work.

### UI Layout Refinement & GIF Export Enhancements

*   **Fixed Result Panel Overflow:** Resolved a UI bug where the export buttons could overlap with the generated comic strip.
    *   **Action:** The results panel was re-architected using a horizontal flexbox layout. The "Export" buttons have been moved to a dedicated sidebar on the right, providing a cleaner, more organized interface and preventing any future layout conflicts. The comic strip is now horizontally scrollable to accommodate a large number of frames.
*   **Improved GIF Export Quality:** The GIF export functionality was significantly upgraded to produce more professional and consistent animations.
    *   **Action:** All frames are now normalized to a 512x512 pixel canvas. A letterboxing technique has been implemented to ensure that images of varying aspect ratios are contained within the frame without being cropped, filling the excess space with a white background. This results in a smoother viewing experience without jarring size changes.

### Prompt Engineering & Default Story Update

*   **Resolved Content Blocking:** Addressed an issue where action-oriented prompts (e.g., "Fights off a lurking alien creature") were being blocked by the generative model's safety filters.
    *   **Action:** The prompt sent to the model in `src/lib/actions.js` was enhanced to provide stronger artistic context. It now explicitly asks the model to "Illustrate a scene for a science fiction comic book," which helps the model understand the request is for fictional content and reduces the likelihood of triggering safety blocks.
    *   **Bug Fix:** Corrected a minor grammatical error in the dynamic prompt construction.
*   **Improved Default Experience:** The default example story in `src/lib/store.js` was updated to be more safety-filter-friendly.
    *   **Action:** Changed the line "Fights off a lurking alien creature" to "Outsmarts a lurking alien creature." This ensures a smoother first-run experience for new users.

### Branding Solidification

*   **Project Name:** Officially adopted "Narrative Forge" as the project name.
*   **Metadata Update:** The `metadata.json` file was updated with the new project name and a more descriptive summary of the application's purpose.
*   **HTML Title:** The `index.html` file was updated to set the browser tab title to "Narrative Forge", reinforcing the brand identity.

### Initial Version

*   **Core Functionality:** Initial implementation of the application, including webcam capture, persona and narrative input, and communication with the generative AI model to produce a storyboard.
