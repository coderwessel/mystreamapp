# mystreamapp
Caches tracks as m4a
# Usage
## to start the server
npm start (linux)
npm run start_win (windows)
## to use the server
//eg. http://localhost:3000/?play=waylon+outlaw
//eg. http://localhost:3000/?play=waylon outlaw
//eg. http://localhost:3000/?play=waylon%20outlaw
//eg. http://localhost:3000/?play=gareth bale goal vs liverpool

## cache folder
Set cache folder in .env
example .env file:

```text
MYSTREAMAPP_WEBSITE=https://www.youtube.com/
MYSTREAMAPP_WEBPATH=results?search_query=
MYSTREAMAPP_CACHEPATH=cached/
MYSTREAMAPP_DATAFILEEXT=.m4a
MYSTREAMAPP_STATUSFILEEXT=.downloading
MYSTREAMAPP_PORT=3000
```
