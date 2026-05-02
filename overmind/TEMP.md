Typescript

cli - human interface
- only parse commands, and print output. 
- Directly invokes core functions with parsed input.
- commander argument parser
- chalk formatter
UI - electron vite app
- adapt app architecture and guidelines from "D:\Dan\Source\GitHub\Dangerdan9631\Vayeate\.agentconfig\instructions"

mcp - agent interface

core - library. API for interacting with service. referenced by all 3 of above.

service - main process.
- Runs as separate process.
- cli/ui/mcp all communicate with it via IPC.
- robot3 state machine
- runs multiple agent state machines.
    - start with simple loop (init, idle, process message, terminate)

---

Commands
- start/stop - CLI/UI only
- send message to agent
- list running agents
- attach to agent input/output stream (read only)

UI
- create multiple windows that can attach to different agents.
- can send agents messages from agent window.
- can see agent stream in real time in window.
- Can see agent state and other stats.
- create new agents
- see service runtime stats

---

agent interfaces
- cursor sdk
- gemini cli
- codex cli
- claude cli
- copilot cli
- windsurf cli