# 🚀 CrewFlow

**CrewFlow** is a modern personnel service and leave management system, designed for teams that require flexibility, accountability, and efficient approval workflows. Built with React + Supabase, it supports multi-level leave approvals, service record tracking, and HR-controlled approver mappings.

---

## ✨ Features

- 📝 Flexible leave request form with hour-level precision
- 🔁 Multi-approver review logic (status updates only when all approved)
- 👥 HR panel for mapping employees to approvers
- 📋 Personal leave history tracking
- 🗃️ Service record form and client signature support (planned)
- 📬 Approvers dashboard to handle their pending reviews
- ✅ Auto-update leave status to "approved" only after all reviewers approve

---

## 🛠️ Tech Stack

| Tech       | Description                   |
|------------|-------------------------------|
| React + Vite + TypeScript | Frontend stack               |
| Supabase   | Auth, Database, RLS            |
| Firebase Hosting / Vercel | Optional deployment targets |

---

## 🧪 Local Development

```bash
git clone https://github.com/yourname/crewflow
cd crewflow
npm install
npm run dev
