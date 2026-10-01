@echo off
title BIOTrace Platform Launcher
echo =======================================================
echo   Starting BioTrace Full-Stack Platform
echo - Backend REST API ^& Socket.IO (Port 5000)
echo   - Frontend React PWA (Port 5173)
echo =======================================================
echo Opening browser at http://localhost:5173 ...
start "" "http://localhost:5173"
npm run dev
