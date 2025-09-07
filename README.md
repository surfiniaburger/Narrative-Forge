# Narrative Forge

## Project Description

Narrative Forge is an interactive web application that empowers users to create their own personalized comic book narratives. By leveraging your webcam and the power of generative AI, you can cast yourself as the hero of a unique, visually-rich story. Define your character's persona, write the plot, and watch as the application forges your narrative into a series of comic book-style frames.

## How It Works

1.  **Capture Your Identity:** The app starts by requesting access to your webcam. You can capture a photo of yourself, which will serve as the base image for your character.
2.  **Forge Your Narrative:** Once your image is captured, you define your character's persona (e.g., "A grizzled space detective") and write a simple story, with each line representing a new panel in your comic.
3.  **Generate Story:** With a click of a button, Narrative Forge sends your image, persona, and story prompts to a generative AI model.
4.  **View Your Comic:** The AI generates a unique, comic book-style image for each line of your narrative, maintaining your likeness across the panels. The resulting storyboard is displayed at the bottom of the screen.

---

## Development Changelog

This log is maintained to track significant changes, architectural decisions, and bug fixes to avoid regressions and repetitive work.

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
