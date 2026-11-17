@echo off
title TRSA Studio - Enterprise Agreement Application
echo =======================================================
echo  Launching TRSA Studio Enterprise Application...
echo =======================================================
start http://localhost:3000/index.html
bun run server.js
pause
