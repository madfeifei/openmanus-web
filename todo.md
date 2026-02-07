# Project TODO

## Completed Features

- [x] Upgrade project to web-db-user (database + backend + auth)
- [x] Design database schema for chat sessions and messages
- [x] Implement backend tRPC API endpoints for chat persistence
  - [x] createSession - Create new chat session
  - [x] getSessions - Get all user sessions
  - [x] getMessages - Get messages for a session
  - [x] addMessage - Add message to session
  - [x] updateSession - Update session title
  - [x] deleteSession - Delete session and messages
- [x] Update frontend ChatContext to use database APIs
- [x] Write comprehensive tests for database operations
- [x] Fix WebSocket message format (add type: 'task' field)
- [x] Fix WebSocket race condition with message queue

## Pending Features

- [ ] Deploy to production (Vercel frontend + Railway backend)
- [ ] Test end-to-end flow in production environment
- [ ] Optimize streaming response display (accumulate chunks into single message)
- [ ] Add message status indicators (sending/sent/failed)
- [ ] Implement auto-update session title based on first message
