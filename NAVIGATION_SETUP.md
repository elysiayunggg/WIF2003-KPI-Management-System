# Navigation Setup Guide

This document explains the navigation architecture introduced in this branch and the exact steps teammates need to follow to get their own pages working within it.

---

## What Changed and Why

The original project had each page as a **separate full HTML file** (`dashboard.html`, `manager.html`, `staff.html`). Every time you clicked a nav link, the entire browser tab reloaded — the sidebar, topbar, and all scripts loaded from scratch on every navigation. This is the traditional multi-page approach.

This branch replaces that with a **Single Page Application (SPA)** pattern using vanilla JavaScript. The core idea is:

- There is **one HTML file** — `shell.html` — that the browser loads once and never leaves.
- The sidebar and topbar are injected into `shell.html` once and **never reload**.
- When you click a nav link, only the **middle content area** gets swapped out, with a fade transition.
- Each page's content lives in a separate **fragment file** under `frontend/views/`.

The result is faster navigation, no jarring full-page reloads, and the sidebar active state is always correct.

---

## Folder Structure

```
frontend/
├── components/
│   ├── navbar.html          ← topbar HTML snippet (injected once by layout.js)
│   └── sidebar.html         ← sidebar shell HTML snippet (injected once by layout.js)
│
├── css/
│   └── style.css            ← global styles shared by all pages
│
├── modules/
│   ├── navbar/
│   │   ├── layout.js        ← injects sidebar + topbar, loads the initial view
│   │   └── sidebar.js       ← renders nav links, handles changePage(), setActiveLink()
│   │
│   └── your-module/         ← create a folder for your module here
│       ├── your-module.js   ← your module's JavaScript
│       └── your-module.css  ← your module's CSS
│
├── pages/
│   └── shell.html           ← THE ONLY HTML PAGE. Open this in Live Server.
│
└── views/                   ← content fragments, one per page
    ├── assignment.html
    ├── review.html
    ├── dashboard.html        ← add your fragment here
    └── your-page.html        ← add your fragment here
```

---

## How shell.html Works

`shell.html` is the only real HTML page in the project. You never open any other HTML file directly. Its structure is:

```html
<body>

  <!-- Sidebar injected here once by layout.js -->
  <div id="sidebar-container"></div>

  <main class="main-content">

    <!-- Topbar injected here once by layout.js -->
    <div id="navbar-container"></div>

    <!-- Only THIS div gets swapped when navigating -->
    <div id="page-content"></div>

  </main>

  <!-- Scripts loaded here -->
</body>
```

**The two things you must add to `shell.html` for your module:**

### 1. Link your CSS file in the `<head>`

```html
<!-- Add this line alongside the existing module CSS links -->
<link rel="stylesheet" href="../modules/your-module/your-module.css">
```

### 2. Load your JS file before `sidebar.js`

```html
<!-- Add this line before sidebar.js -->
<script src="../modules/your-module/your-module.js"></script>
<script src="../modules/navbar/sidebar.js"></script>
<script src="../modules/navbar/layout.js"></script>
```

The load order matters. Your module script must come **before** `sidebar.js`, which must come **before** `layout.js`. This is because `layout.js` calls functions from `sidebar.js`, and `sidebar.js` may reference functions from your module.

> **Important:** Never put `<script src="...">` or `<link rel="stylesheet">` tags inside your fragment files under `views/`. They will be silently ignored by the browser when injected via `innerHTML`. All scripts and styles must go in `shell.html`.

---

## How to Create a View Fragment

A view fragment is a **partial HTML file** — it contains only the page content, with no `<html>`, `<head>`, `<body>`, or `<script>` tags.

**Correct format** (`frontend/views/your-page.html`):

```html
<section class="p-4">

  <!-- Breadcrumb -->
  <nav aria-label="breadcrumb" class="mb-3">
    <ol class="breadcrumb">
      <li class="breadcrumb-item">Your Module Name</li>
      <li class="breadcrumb-item active" aria-current="page">Your Page Name</li>
    </ol>
  </nav>

  <!-- Title -->
  <div class="mb-4">
    <h1 class="fw-bold mb-2">Your Page Title</h1>
    <p class="text-muted">Brief description of what this page does.</p>
  </div>

  <!-- Your page content here -->

</section>
```

**Wrong — do not do this:**

```html
<!DOCTYPE html>          ← DO NOT include
<html>                   ← DO NOT include
<head>                   ← DO NOT include
  <link ...>             ← DO NOT include, put in shell.html instead
</head>
<body>                   ← DO NOT include
  <script src="...">     ← DO NOT include, put in shell.html instead
</body>
</html>
```

### Naming Convention

Name your file to match the page name in `sidebar.js`, lowercased with hyphens:

| Nav link name | File name |
|---|---|
| `"Dashboard"` | `dashboard.html` |
| `"Create KPI"` | `create-kpi.html` |
| `"View KPI List"` | `kpi-list.html` |
| `"Review Submission"` | `review.html` |

The file name itself does not technically matter as long as it matches what you register in `pageRoutes` — but following this convention keeps things consistent.

---

## How to Register Your Page in sidebar.js

`sidebar.js` contains a `pageRoutes` object at the top that maps every page name to its fragment file path. Add your page here:

```javascript
const pageRoutes = {
  "Dashboard":         "../views/dashboard.html",
  "Assign KPI":        "../views/assignment.html",
  "Review Submission": "../views/review.html",

  // Add your page here:
  "Your Page Name":    "../views/your-page.html",
};
```

The page name string must **exactly match** what is written in the nav link's `onclick` in `renderSidebar()`. For example if the nav link says:

```html
<a href="#" class="nav-link" onclick="changePage(event, 'Create KPI')">
```

Then your `pageRoutes` key must be `"Create KPI"` — same capitalisation, same spacing.

---

## How to Run a Function When Your Page Loads

Because `<script>` tags in fragments don't execute, you cannot call a setup function from inside your fragment file. Instead, register an init function in the `pageInits` map in `sidebar.js`:

**In `sidebar.js`**, add your init function to the map at the bottom:

```javascript
const pageInits = {
  "Assign KPI":        initAssignmentView,
  "KPI Assignment":    initAssignmentView,

  // Add your init function here:
  "Your Page Name":    initYourPageView,
};
```

**In your module's JS file**, define the init function:

```javascript
function initYourPageView() {
  // This runs every time your page is navigated to
  // Use this to populate dynamic content, attach event listeners, etc.
}
```

The init function is called automatically by `changePage()` whenever your page is loaded via a nav click, and also by `layout.js` on the initial page load if your page is the active one.

If your page has no dynamic content that needs setup, you don't need to add anything to `pageInits` — just skip this step.

---

## How the Navigation Flow Works (End to End)

Here is the full sequence of what happens when a user opens the app and clicks a nav link, so you understand how all the pieces connect:

**On first load (`shell.html` opens):**

1. Browser loads `shell.html` — sidebar and topbar containers are empty, `#page-content` is empty.
2. Scripts at the bottom of `shell.html` execute in order: your module JS → `sidebar.js` → `layout.js`.
3. `layout.js` calls `loadComponent()` twice to fetch `sidebar.html` and `navbar.html` and inject them into their containers.
4. `layout.js` calls `renderSidebar(role)` — `sidebar.js` populates the nav links based on the role from `localStorage`.
5. `layout.js` reads `activePage` from `localStorage` (defaults to `"Assign KPI"` if nothing is stored), looks up its route in `pageRoutes`, fetches the fragment, and injects it into `#page-content`.
6. If an init function is registered for that page in `pageInits`, it runs.

**When a nav link is clicked:**

1. `changePage(event, 'Page Name')` fires.
2. `localStorage.setItem("activePage", pageName)` saves the active page.
3. `setActiveLink()` reads the active page from `localStorage` and updates the `active` CSS class on the correct nav link.
4. `#page-content` fades out (opacity 0, 150ms CSS transition).
5. The fragment file is fetched.
6. After 150ms, `#page-content.innerHTML` is replaced with the new fragment and faded back in.
7. If an init function is registered for the new page, it runs.

The sidebar and topbar never touch — only `#page-content` changes.

---

## Summary Checklist

When adding your pages to the project:

- [ ] Create your fragment file(s) in `frontend/views/` — content only, no `<html>`/`<head>`/`<body>` tags
- [ ] Add your page(s) to `pageRoutes` in `sidebar.js`
- [ ] Add your CSS `<link>` to `shell.html`'s `<head>`
- [ ] Add your JS `<script>` to `shell.html`'s body, before `sidebar.js`
- [ ] If your page needs a setup function, define it in your JS file and register it in `pageInits` in `sidebar.js`
- [ ] Open `shell.html` via **Live Server (install Live Server Extension in VSCode)** — never open fragment files directly
- [ ] All Javascript and CSS Files loaded at once together in "shell.html" and share global scope, so all functions, variables, etc. **must not share the same name**. If two files define a function with the same name, the second file to load silently overwrites the first, causing unexpected behaviour with no obvious error.
