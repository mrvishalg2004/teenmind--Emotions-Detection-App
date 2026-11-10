# TeenMind — Readme Visual Asset Index

This index documents all visual assets generated for the **TeenMind** GitHub README. All assets are categorized, dimensioned, and verified for high-resolution mobile-first presentation.

---

## 📱 1. Authentic React Native Mobile Screenshots (`mobile-screenshots/`)

Every screenshot in this directory is a 100% authentic capture of the live running React Native Expo application, rendered at high-DPI 2× Retina resolution (matching standard flagship mobile viewports 393×852 px / 412×920 px) with live backend API data and local database records.

| Filename | Dimensions | Type | Screen / Section | Description |
| :--- | :--- | :--- | :--- | :--- |
| [`01-login-screen.png`](./mobile-screenshots/01-login-screen.png) | 824 × 1840 px | Actual Screenshot | Auth (`/(auth)/login`) | Full mobile login card featuring the TeenMind brain emblem, credentials input (Email / Student ID and Password with visibility toggle), Forgot Password link, Sign In action, Sign Up invitation, AES-256 data encryption badge, and 988 Suicide & Crisis Lifeline button without edge clipping. |
| [`02-signup-screen.png`](./mobile-screenshots/02-signup-screen.png) | 786 × 1704 px | Actual Screenshot | Auth (`/(auth)/register`) | Two-step user registration screen featuring role selection cards ("Student" vs "Parent"), user profile name inputs, email address, and privacy disclaimer. |
| [`03-dashboard-screen.png`](./mobile-screenshots/03-dashboard-screen.png) | 786 × 1704 px | Actual Screenshot | Student Portal (`/(main)/dashboard`) | Main student wellness dashboard displaying student profile (Aarav Sharma, ID `STU94201`), real-time Mental Health Score (`76/100 · Good`), Today's Mood (`HAPPY 8/10`), ANN Questionnaire Inferences (`Normal · 94% Confidence`), recent journal entry shortcuts, AI suggestions, and bottom tab navigation. |
| [`04-mood-tracker-screen.png`](./mobile-screenshots/04-mood-tracker-screen.png) | 786 × 1704 px | Actual Screenshot | Wellness (`/(main)/mood-tracker`) | Daily mood check-in interface with 10 color-coded emotional states (Happy, Excited, Hopeful, Neutral, Sad, Anxious, Stressed, Angry, Overwhelmed, Fearful) with emojis, intensity picker, and history toggle. |
| [`05-journal-screen.png`](./mobile-screenshots/05-journal-screen.png) | 786 × 1704 px | Actual Screenshot | Wellness (`/(main)/journal`) | Confidential daily emotional journal list featuring encrypted student entries (Physics Olympiad anxiety, robotics teamwork, mindful walks), mood tags, and automated sentiment polarity indicators. |
| [`06-chatbot-screen.png`](./mobile-screenshots/06-chatbot-screen.png) | 786 × 1704 px | Actual Screenshot | AI Companion (`/(main)/chatbot`) | MindBot conversational support interface displaying emotional topic chips (Stress, Anxiety, Loneliness, Study Pressure), real student interaction on exam stress, and compassionate cognitive coping strategies. |
| [`07-assessment-screen.png`](./mobile-screenshots/07-assessment-screen.png) | 786 × 1704 px | Actual Screenshot | Clinical Screening (`/(main)/assessment`) | Standardized 10-question adolescent mental health assessment wizard with 4-point Likert options, progress indicator, and category weights. |
| [`08-parent-dashboard-screen.png`](./mobile-screenshots/08-parent-dashboard-screen.png) | 786 × 1704 px | Actual Screenshot | Parent Portal (`/(parent)/dashboard`) | Comprehensive parental supervision dashboard showing linked student (Aarav Sharma), current risk level (`LOW`), dominant emotional health summary, longitudinal mood trend bars, and wellness warnings. |
| [`09-parent-alerts-screen.png`](./mobile-screenshots/09-parent-alerts-screen.png) | 786 × 1704 px | Actual Screenshot | Parent Portal (`/(parent)/alerts`) | Safety notification overview screen for guardian alerts and emergency warning protocols. |

> [!NOTE]
> **Profile Screen Note**: In the current application architecture, user profile details (Student ID, full name, school, grade, and emergency contacts) are integrated directly into the Student and Parent Dashboards. A dedicated `/profile` route is not present in the codebase.

---

## 🖼️ 2. Professional Smartphone Device Mockups (`device-mockups/`)

These mockups frame the actual mobile application screenshots inside modern, realistic flagship smartphone frames (featuring ultra-thin titanium/midnight bezels, Dynamic Island with front camera glint, native iOS status bar telemetry, and multi-layer realistic drop shadows) set against studio-grade presentation backdrops.

| Filename | Dimensions | Type | Screen Showcased | Description |
| :--- | :--- | :--- | :--- | :--- |
| [`login-device-mockup.png`](./device-mockups/login-device-mockup.png) | 1920 × 1140 px | Device Mockup | `01-login-screen.png` | Centered modern smartphone mockup showcasing the complete mobile authentication screen, badge pill, typography, and feature summary (AES-256 Encrypted, Instant JWT Session, 24/7 Crisis Support). |
| [`dashboard-device-mockup.png`](./device-mockups/dashboard-device-mockup.png) | 1920 × 1140 px | Device Mockup | `03-dashboard-screen.png` | Hero smartphone presentation of the live Student Mental Health Dashboard with score badges, telemetry cards, and clean studio lighting. |
| [`application-showcase.png`](./device-mockups/application-showcase.png) | 2400 × 1380 px | Multi-Device Mockup | Multi-Screen Suite (`04`, `03`, `06`) | Premium 3-device portfolio composition featuring the Student Dashboard prominently in the center, flanked by the Daily Mood Tracker on the left and MindBot AI Chat on the right. |

---

## 🎨 3. Project Hero & Architectural Visuals (`generated-visuals/`)

High-impact graphics created for top-level GitHub README presentation, designed to communicate TeenMind's machine learning capabilities, technical architecture, and adolescent wellness mission.

| Filename | Dimensions | Type | Section | Description |
| :--- | :--- | :--- | :--- | :--- |
| [`project-hero.png`](./generated-visuals/project-hero.png) | 1920 × 640 px | Hero Banner | README Header | Ultra-wide dark luxury banner featuring the stylized TeenMind brain emblem, title typography, tech stack badges (React Native, Expo, FastAPI, PyTorch, MongoDB), and a live holographic telemetry card showcasing the 6 behavioral vectors. |
| [`supporting-illustration.png`](./generated-visuals/supporting-illustration.png) | 1600 × 960 px | Architecture Diagram | System Overview | Clean 3-pillar architectural pipeline illustration mapping: **1. Input Telemetry (Student App)** ➔ **2. Intelligence Engine (MLP Neural Network)** ➔ **3. Proactive Intervention (Parent & Crisis Network)** with vector icons and directional flow arrows. |

---

## 🧪 Local Test Accounts & Dummy Data Reference

All captured screenshots utilize realistic, non-production test accounts seeded into the local MongoDB instance:

- **Student Account**:
  - Name: Aarav Sharma
  - Email: `aarav.sharma@teenmind.edu`
  - Student ID: `STU94201`
  - School: Delhi Public School, R.K. Puram (11th Grade Science, GPA 3.85)
  - Mental Health Score: 76/100 (Good Standing, Low Risk)
  - Logged Mood: Happy (8/10) with 9 days of active historical check-ins
  - Journals: 4 realistic entries with automated sentiment analysis
- **Parent Account**:
  - Name: Rajesh Sharma
  - Email: `rajesh.sharma@teenmind.edu`
  - Relation: Father (Linked to Student `STU94201`)
  - Active Alerts: Weekly Wellness Summary (Active) & Assessment Review (Read)

