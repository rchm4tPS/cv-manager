# 🚀 CV Manager & AI Tailor

An advanced, full-stack web application designed to help job seekers build, manage, and AI-tailor their resumes for specific job applications. 

This project serves as a showcase of modern web architecture, demonstrating expertise in building scalable, AI-integrated applications with excellent UI/UX.

This is the first version (MVP) and I still working through it for improving and adding many features on it.

---

## 👨‍💻 About the Developer & Availability

Hi! I built this project to demonstrate my ability to architect and deliver production-ready, full-stack applications. 

**I am currently available for freelance projects and full-time opportunities.** 
If you are looking for a developer who can:
- Architect complex frontends using **Next.js** and **React**
- Integrate complex **AI APIs** (like OpenAI or Google Gemini) into seamless user workflows
- Design beautiful, accessible, and responsive UIs with **Tailwind CSS** and **shadcn/ui**
- Architect secure, scalable backends using **Supabase** or traditional Node.js environments

**Let's talk!** Feel free to reach out to me directly via my GitHub profile or connect with me on LinkedIn.

---

## ✨ Key Features

- 🧠 **AI-Powered Resume Tailoring:** Integrates with the Google Gemini API to analyze job descriptions and automatically suggest tailored improvements to your resume.
- 💡 **Interactive AI Chat & Query Suggestions:** Engage with the AI via a built-in chat pane, featuring ATS-focused query suggestions for quick and effective resume refinement.
- 🎨 **Interactive Resume Builder:** A fully reactive editor using Zustand for state management, allowing users to drag, drop, and edit resume sections in real-time with a live preview.
- 📄 **PDF Parsing (coming soon):** Upload existing resumes (PDFs) and automatically parse the data into editable digital formats.
- 💼 **Job Application Tracker:** A built-in CRM for your job hunt. Track positions, companies, statuses (Applied, Interviewing, Offered), and link them directly to specific resume versions.
- ⚡ **Serverless Backend Architecture:** Powered by Supabase for instantaneous, secure data syncing across devices using Row Level Security (RLS).

## 🛠️ Tech Stack

- **Framework:** [Next.js 14+](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/) (Radix Primitives)
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL)
- **AI Integration:** Google Gemini API (`@google/genai`)
- **PDF Processing:** `pdf-parse`

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js (v18+) and npm installed.

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/cv-manager.git
cd cv-manager
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root of your project and add your API keys:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Database Setup
You can find the database schema in `supabase_schema.sql`. Run this SQL in your Supabase SQL Editor to generate the `resumes` and `jobs` tables with the correct schemas.

### 5. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application running.

---

## 🏗️ Architecture Highlights

- **BFF (Backend-For-Frontend):** Next.js App Router allows server-side secure processing (like PDF parsing and AI communication) while maintaining a snappy client-side experience.
- **Client-Side Database SDK:** Leveraging Supabase's client libraries allows for rapid CRUD operations directly from React components without building middleman API endpoints, secured strictly by Postgres Row Level Security.
- **Optimized Rendering:** Complex components like the live resume preview pane are optimized to prevent cascading re-renders, ensuring a smooth typing experience even with large documents.

---

*If you find this project interesting, don't forget to ⭐ star the repository!*
