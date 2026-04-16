# Juice Shop Scan — Input Reference

Copy-paste these values into the workbench forms.

---

## Create Engagement

| Field | Value |
|-------|-------|
| Engagement Name | `Juice Shop Test` |
| Client Name | `Sherlock` |
| Target URL | `http://host.docker.internal:3000/` |
| Repo Path | `/Users/sherlock/Projects/juice-shop` |

### Context

**Description:**
```
OWASP Juice Shop - intentionally vulnerable Node.js/Express e-commerce application. Single-page Angular frontend with REST API backend, SQLite database. Running locally on port 3000.
```

**Threat Model:**
```
Unauthenticated and authenticated user perspectives. Key areas: SQL injection via search and login, XSS via user input fields, broken authentication (weak JWT implementation), broken access control (horizontal privilege escalation between users), SSRF via product image URLs.
```

**Notes:**
```
This is a test engagement against a local intentionally vulnerable app. All findings are expected. Default admin credentials: admin@juice-sh.op / admin123.
```

---

## Config Wizard

### Step 1 — Context

No input needed. Review only.

### Step 2 — Auth

| Field | Value |
|-------|-------|
| Login Type | `form` |
| Login URL | `http://host.docker.internal:3000/` |
| Username | `admin@juice-sh.op` |
| Password | `admin123` |
| TOTP Secret | *(leave blank)* |

**Login Flow Steps:**

| # | Step |
|---|------|
| 1 | `Navigate to /#/login` |
| 2 | `Fill the email field with the username` |
| 3 | `Fill the password field` |
| 4 | `Click the "Log in" button` |

**Success Condition:**

| Field | Value |
|-------|-------|
| Type | `url_contains` |
| Value | `/#/search` |

### Step 3 — Scope

Skip. No focus or avoid rules needed.

### Step 4 — Pipeline

| Field | Value |
|-------|-------|
| Max Concurrent Pipelines | `2` |
| Retry Preset | `subscription` |

### Step 5 — Launch

Review YAML, click **Launch Run**.

---

## Prerequisites

- Juice Shop running: `docker run -p 3000:3000 bkimminich/juice-shop` or from source
- Shannon Temporal container running: `npx @keygraph/shannon setup` (one-time)
- Workbench dev server: `npm run dev`
