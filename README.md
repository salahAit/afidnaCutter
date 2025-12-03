# Afidna Cutter

A professional video cutter application built with Electron, Svelte 5, and TailwindCSS 4.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/salahAit/afidnaCutter.git
    cd afidnaCutter
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

## Running the Application

### Development Mode
To run the application in development mode with hot reloading:

```bash
npm run dev
```
This will start the Vite development server and launch the Electron window.

### Production Build
To build the application for production:

```bash
npm run build
```

npm start
```

### Windows Build (Cross-compilation from Linux)

To build the Windows installer (`.exe`) from Linux:

1.  **Prerequisites**:
    *   Download `ffmpeg.exe` and `ffprobe.exe` (static binaries for Windows x64).
    *   Place them in `resources/bin/win/` (create the directory if it doesn't exist).

2.  **Build**:
    ```bash
    npm run dist -- --win
    ```
    Or if using yarn:
    ```bash
    yarn run dist --win
    ```

    The installer will be generated in `release/Afidna Cutter Setup <version>.exe`.

## Troubleshooting

### Electron Installation Issues
If you encounter issues installing Electron (e.g., network errors), try installing it explicitly:

```bash
npm install -D electron@latest
```

### Vite Build Errors
If you see errors related to `@tailwindcss/vite` or dependencies, try clearing `node_modules` and reinstalling:

```bash
rm -rf node_modules package-lock.json
npm install
```
