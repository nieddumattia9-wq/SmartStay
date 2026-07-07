# SmartStay

SmartStay is a travel web app that helps users find smarter accommodation options by comparing destination, dates, guests, budget, comfort, and value.

The app currently connects a React frontend to a Node.js backend. The backend communicates with RouteStack to search real hotel stays and manage asynchronous search results.

---

## Project structure

SmartStay is divided into two main parts:

- `src` — frontend React app
- `server` — backend Node.js API

---

## Frontend

The frontend includes:

- destination autocomplete
- date picker
- guest selector
- smart preference slider
- loading screen
- results page
- hotel cards

The frontend runs on:

```text

[http://localhost:5173](http://localhost:5173)







To start the frontend from the project root:

```

```

```

npm run dev

```





## Backend

The backend includes:

- RouteStack authentication
- destination search
- hotel search
- polling for incomplete searches
- server-side search sessions
- search status endpoint
- results session endpoint

The backend runs on:

```

```

```

[http://localhost:3001](http://localhost:3001)

```

To start the backend:

```

```

```

cd server
npm run dev

```





## Environment variables

The backend uses a `.env` file inside the `server` folder.

Example:

```

```

```

PORT=3001
CLIENT_ORIGIN=[http://localhost:5173](http://localhost:5173)
ROUTESTACK_BASE_URL=[https://evolvemcp.routestack.ai](https://evolvemcp.routestack.ai)
ROUTESTACK_API_KEY=your_api_key_here
ROUTESTACK_API_SECRET=your_api_secret_here

```

Never commit real API keys or secrets.





## Useful commands

Frontend type check:

```

```

```

npm run typecheck

```

Frontend build:

```

```

```

npm run build

```

Frontend lint:

```

```

```

npm run lint

```





## Current status

SmartStay currently supports this real search flow:

```

```

```

Home
→ search setup
→ loading screen
→ RouteStack hotel search
→ polling
→ results page

```

The project is still under active development.

```

```

```

Questa è più pulita.  
Quando hai fatto, scrivimi **fatto** e passiamo a `server\.gitignore`.

```

```

