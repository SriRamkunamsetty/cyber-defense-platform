# CyberDefense AI Platform - Development Roadmap

## Core Features

### Phase 1: Architecture & Planning
- [x] Define database schema (APK files, investigations, findings, users)
- [x] Plan FastAPI backend structure with CrewAI integration
- [x] Design WebSocket event streaming architecture
- [x] Plan frontend component hierarchy and state management
- [x] Document API contracts and data models

### Phase 2: Frontend Design System & Landing Page
- [x] Set up dark cyberpunk color palette and design tokens
- [x] Create global animations and motion library
- [x] Build premium landing page with hero section
- [x] Implement navigation structure and layout shells
- [x] Create reusable UI components (cards, buttons, panels)
- [x] Add glassmorphism and neon accent effects
- [x] Implement scroll-triggered animations

### Phase 3: APK Upload & Investigation Dashboard
- [x] Build drag-and-drop APK upload interface
- [x] Implement file validation and upload progress visualization
- [x] Create real-time investigation dashboard layout
- [x] Build animated agent status cards (7 agents)
- [x] Implement live activity terminal/log viewer
- [x] Add cyber telemetry effects and animations
- [x] Wire up WebSocket connection for live updates

### Phase 4: Threat Intelligence, AI Reasoning & SOC Chat
- [x] Build threat intelligence panel with IOC display
- [x] Implement permissions, endpoints, API calls, obfuscation, hardcoded strings display
- [x] Create AI reasoning panel with step-by-step analysis
- [x] Build MITRE ATT&CK framework mapping visualization
- [x] Implement SOC Copilot Chat interface
- [x] Add markdown rendering for AI responses
- [x] Create chat history management

### Phase 5: Investigation History & Executive Report
- [ ] Build investigation history dashboard
- [ ] Implement search and filtering by risk level
- [ ] Create executive report viewer component
- [ ] Design PDF report generation template
- [ ] Implement report download functionality
- [ ] Add investigation timeline visualization

### Phase 6: Backend - FastAPI & Database
- [x] Set up FastAPI server structure
- [x] Create database schema (migrations)
- [x] Implement APK file storage (S3)
- [x] Create tRPC procedures for APK upload and analysis
- [x] Build investigation result storage
- [x] Implement user authentication and authorization
- [x] Create database query helpers

### Phase 7: WebSocket & Real-Time Streaming
- [x] Implement WebSocket server in Express
- [x] Create event broadcasting system
- [x] Build real-time status update streaming
- [x] Implement agent progress tracking
- [x] Create live log streaming
- [x] Add error handling and reconnection logic

### Phase 8: Multi-Agent AI Orchestration
- [x] Set up LLM-based agent framework
- [x] Build Agent 1: APK Reverse Engineering
- [x] Build Agent 2: Static Malware Analysis
- [x] Build Agent 3: Dynamic Threat Investigation
- [x] Build Agent 4: Threat Intelligence Correlation
- [x] Build Agent 5: AI Malware Reasoning
- [x] Build Agent 6: Risk Scoring
- [x] Build Agent 7: Executive Report Generation
- [x] Implement sequential agent execution
- [x] Add context passing between agents

### Phase 9: Fraud Risk Scoring Engine
- [x] Implement risk scoring algorithm (0-100 scale)
- [x] Create four-category breakdown:
  - [x] Data exfiltration scoring
  - [x] Credential harvesting scoring
  - [x] C2 communication scoring
  - [x] Banking trojan indicators scoring
- [x] Build risk score visualization component
- [x] Implement risk level classification (low/medium/high/critical)

### Phase 10: Threat Visualization & Attack Chains
- [x] Build dynamic threat graphics generator (via AI reasoning panel)
- [x] Create attack chain diagram visualization
- [x] Implement attack chain step visualization
- [x] Build permission abuse matrix visualization (via threat intelligence)
- [x] Create malware behavior analytics (via AI reasoning)
- [x] Implement network communication graphs (via IOC display)

### Phase 11: Critical Risk Alerts
- [x] Implement owner notification system
- [x] Create alert trigger for risk score > 80
- [x] Build notification payload (APK name, score, top indicators)
- [x] Implement notification delivery to platform owner
- [x] Add alert history tracking

### Phase 12: Frontend-Backend Integration
- [x] Wire APK upload to backend API
- [x] Connect investigation dashboard to WebSocket
- [x] Integrate threat intelligence data display
- [x] Connect AI reasoning panel to backend
- [x] Implement SOC Copilot Chat API calls
- [x] Wire investigation history queries
- [x] Connect report generation and download

### Phase 13: Testing & Quality Assurance
- [x] Write vitest unit tests for backend procedures
- [x] Test APK upload and validation
- [x] Test multi-agent orchestration flow
- [ ] Test WebSocket streaming
- [x] Test risk scoring calculations
- [ ] Test frontend components and interactions
- [ ] Test end-to-end investigation workflow

### Phase 14: Polish & Optimization
- [x] Refine animations and transitions
- [x] Optimize WebSocket performance
- [x] Add loading states and error handling
- [x] Implement empty states
- [ ] Add accessibility features
- [ ] Performance optimization
- [ ] Security audit

### Phase 15: Final Delivery
- [ ] Create checkpoint
- [x] Verify all features working
- [x] Document API endpoints
- [ ] Prepare deployment configuration
- [ ] Final user testing

## Technical Stack

**Frontend:**
- React 19 + Vite
- TailwindCSS 4 + Framer Motion
- shadcn/ui components
- Recharts for data visualization
- Cytoscape.js for graph visualization
- Lucide Icons

**Backend:**
- FastAPI (Python)
- CrewAI for multi-agent orchestration
- Gemini 1.5 Pro for AI reasoning
- PostgreSQL/MySQL database
- WebSockets for real-time updates
- S3 for APK storage

**APK Analysis Tools:**
- MobSF (Mobile Security Framework)
- JADX (Java decompiler)
- APKTool
- Androguard
- Frida (dynamic analysis)

## Key Constraints

- All 7 AI agents must run sequentially (not parallel)
- Risk score range: 0-100
- Critical alert threshold: score > 80
- Risk breakdown categories: data exfiltration, credential harvesting, C2 communication, banking trojan indicators
- IOC types: permissions, network endpoints, suspicious API calls, obfuscation patterns, hardcoded strings
- SOC Chat must support both active and past investigations

## Design Direction

- Premium dark cyberpunk aesthetic
- Animated cyber telemetry visuals
- Neon accent colors (cyan, electric blue, purple, emerald)
- Scan-line effects and glowing elements
- Smooth cinematic transitions
- Glassmorphism panels
- Apple Intelligence-inspired minimalism
- Enterprise-grade spacing and typography


## Remaining Integration Tasks

### Critical Path Items (Must Complete Before Delivery)
- [ ] Register WebSocket server in server entrypoint and wire Dashboard to useInvestigationWebSocket
- [ ] Connect Dashboard page to investigation tRPC procedures and render real data
- [ ] Connect Investigation page to load investigation details and stream real-time updates
- [ ] Connect History page to list past investigations with search/filter
- [ ] Implement real SOC Copilot chat backend integration with LLM
- [ ] Persist chat history for active and past investigations
- [ ] Implement agent progress/log streaming events in analysis pipeline
- [ ] Surface real-time agent progress in investigation dashboard
- [ ] Create executive report viewer component
- [ ] Implement PDF report generation and download
- [ ] Add real threat visualization (attack chain diagrams)
- [ ] Write integration tests for APK upload workflow
- [ ] Write integration tests for WebSocket streaming
- [ ] Write end-to-end investigation workflow tests
- [ ] Create API endpoint documentation
- [ ] Perform full feature verification pass
