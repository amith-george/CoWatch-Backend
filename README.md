# 🎬 CoWatch - Backend

A Node.js + Express backend powering **CoWatch**, a synchronized media viewing and collaboration platform. Handles **room management, chat, video sync events, and screen sharing signaling** with **Socket.IO**.

Live API: https://cowatch-backend.onrender.com/ (to be updated after deployment)

---

## 📌 Description

The backend provides APIs and real-time WebSocket communication for managing CoWatch rooms. Key responsibilities include:

- Room creation with configurable session duration  
- Automatic room cleanup after expiration  
- Role-based access control (host, moderator, viewer)  
- Synchronization of video playback actions across clients  
- Real-time chat and screen sharing signaling  

All rooms and messages are **temporary** for privacy and efficient resource usage.

---

## ⚙️ Technologies Used

- **Node.js** & **Express.js** – Backend server  
- **MongoDB Atlas** & **Mongoose** – Database and schema modeling  
- **Socket.IO** – Real-time sync for chat + playback  
- **JWT** – Optional authentication for enhanced features  
- **WebRTC** – Peer-to-peer screen sharing  
- **Render** – Deployment and hosting  

---

## 📫 Contact

For questions, issues, or feature requests, feel free to reach out:

- 💻 GitHub: [github.com/amith-george](https://github.com/amith-george)  
- 📧 Email: [amithgeorge130@gmail.com](mailto:amithgeorge130@gmail.com)  
- 🌐 [LinkedIn](https://www.linkedin.com/in/amith-george/)  
