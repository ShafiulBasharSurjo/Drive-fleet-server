# 🛠️ DriveFleet API Engine

[![Express Engine](https://img.shields.io/badge/Express-4.21-lightgrey?style=flat-square&logo=express)](https://expressjs.com/)
[![MongoDB Cloud](https://img.shields.io/badge/MongoDB-🧬-green?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![JSON Web Tokens](https://img.shields.io/badge/Authentication-JWT_Cookies-blueviolet?style=flat-square&logo=json-web-tokens)](https://jwt.io/)
[![Node Version](https://img.shields.io/badge/Node.js->=18.x-339933?style=flat-square&logo=node.js)](https://nodejs.org/)

This is the full-stack, high-performance RESTful API engine powering **DriveFleet**, built using Node.js, Express, and MongoDB. It implements secure JWT lifecycle handshakes across HTTP-only cookies, automated MongoDB optimization aggregation parameters, and social auth parsing.

---

## 🏗️ System Pipeline Architecture

```mermaid
graph TD
    Client[Next.js Frontend Client] -->|Secure Requests with Credentials| CORS{CORS Origin Guard}
    CORS -->|Authorized Route Check| JWT[JWT Cookie Verification Layer]
    JWT -->|Valid Session Token| Core[Express Route Handlers]
    JWT -->|Invalid / Missing| Err[401 Unauthorized Response]
    Core <-->|Atomic Transactions / Mongoose| DB[(MongoDB Atlas Cloud)]
```
