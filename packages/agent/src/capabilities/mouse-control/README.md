# Mouse Control Capability

Comprehensive mouse control system with vision integration, recording, playback, and safety features.

## Folder Structure

```
mouse-control/
├── index.ts                          # Main exports
├── mouse-control-manager.ts          # Main API manager
├── mouse-control-capability.ts       # Capability wrapper
│
├── backends/                         # Platform-specific backends
│   ├── index.ts
│   ├── mouse-backend.ts              # Backend interface
│   ├── robotjs-backend.ts            # RobotJS implementation
│   └── mock-backend.ts               # Mock for testing
│
├── managers/                         # Manager components
│   ├── index.ts
│   ├── multi-monitor-manager.ts      # Multi-monitor & DPI management
│   └── window-focus-manager.ts       # Window focus management
│
├── safety/                           # Safety & policy
│   ├── index.ts
│   └── safety-policy-gate.ts         # Policy enforcement
│
├── vision/                           # Vision integration
│   ├── index.ts
│   └── vision-bridge.ts              # Element location
│
├── scheduling/                       # Action scheduling
│   ├── index.ts
│   └── action-scheduler.ts           # Queue & execution
│
├── audit/                            # Audit & telemetry
│   ├── index.ts
│   └── mouse-action-auditor.ts       # Action logging
│
├── recording/                        # Recording & playback
│   ├── index.ts
│   ├── recorder.ts                   # Action recorder
│   ├── playback-engine.ts            # Playback engine
│   └── recording-storage.ts           # Storage management
│
└── utils/                            # Utilities
    ├── index.ts
    └── humanizer.ts                  # Human-like movement
```

## Components

### Main Components
- **MouseControlManager** - Main API for mouse operations
- **MouseControlCapability** - Capability interface wrapper

### Backends
- **MouseBackend** - Abstract backend interface
- **RobotJSBackend** - RobotJS platform implementation
- **MockMouseBackend** - Mock backend for testing

### Managers
- **MultiMonitorManager** - Multi-monitor and DPI handling
- **WindowFocusManager** - Window focus operations

### Safety
- **SafetyPolicyGate** - Permission and policy enforcement

### Vision
- **VisionBridge** - Element location via vision models

### Scheduling
- **ActionScheduler** - Action queue and execution

### Audit
- **MouseActionAuditor** - Action logging and telemetry

### Recording
- **MouseActionRecorder** - Record mouse sequences
- **PlaybackEngine** - Replay recorded sequences
- **RecordingStorage** - Storage management

### Utils
- **Humanizer** - Natural movement generation

## Usage

```typescript
import { MouseControlManager } from '@aura/agent';

// Initialize manager with all components
const manager = new MouseControlManager({
  backend: new RobotJSBackend(),
  safetyGate: new SafetyPolicyGate(consentManager),
  humanizer: new Humanizer(),
  // ... other components
});

await manager.init();
await manager.enable();

// Use mouse control
await manager.moveTo(100, 200);
await manager.click('left');
await manager.findAndClick('submit-button');
```

