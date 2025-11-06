# Screen Capture Capability

Comprehensive screen capture system with image processing, storage, and multi-monitor support.

## Folder Structure

```
screen-capture/
├── index.ts                          # Main exports
├── screen-capture-manager.ts         # Main API manager
├── screen-capture-capability.ts     # Capability wrapper
├── README.md                         # Documentation
│
├── types/                            # Type definitions
│   └── index.ts                      # All types
│
├── backends/                         # Platform-specific backends
│   ├── index.ts
│   ├── screen-capture-backend.ts     # Backend interface
│   ├── screenshot-backend.ts         # Screenshot implementation
│   └── mock-backend.ts               # Mock for testing
│
├── managers/                          # Manager components
│   ├── index.ts
│   └── screen-manager.ts             # Screen management
│
├── processors/                        # Image processing
│   ├── index.ts
│   └── image-processor.ts            # Image processing
│
├── storage/                           # Storage management
│   ├── index.ts
│   └── capture-storage.ts            # Capture storage
│
└── utils/                             # Utilities
    ├── index.ts
    └── capture-utils.ts               # Utility functions
```

## Components

### Main Components
- **ScreenCaptureManager** - Main API for screen capture operations
- **ScreenCaptureCapability** - Capability interface wrapper

### Types
- **CaptureFormat** - Image format types (png, jpeg, webp, bmp)
- **CaptureRegion** - Region coordinates
- **ScreenInfo** - Screen information
- **CaptureOptions** - Capture configuration
- **CaptureResult** - Capture result with metadata

### Backends
- **ScreenCaptureBackend** - Abstract backend interface
- **ScreenshotBackend** - Platform-specific implementation
- **MockScreenCaptureBackend** - Mock backend for testing

### Managers
- **ScreenManager** - Multi-monitor and screen management

### Processors
- **ImageProcessor** - Image processing (format conversion, resizing, optimization)

### Storage
- **CaptureStorage** - Storage management with auto-cleanup

### Utils
- **CaptureUtils** - Utility functions (validation, normalization, filename generation)

## Usage

```typescript
import { 
  ScreenCaptureManager, 
  ScreenshotBackend, 
  CaptureStorage,
  ImageProcessor 
} from '@aura/agent';

// Initialize components
const backend = new ScreenshotBackend();
const storage = new CaptureStorage(localStorage);
const processor = new ImageProcessor();

const manager = new ScreenCaptureManager({
  backend,
  storage,
  processor,
});

await manager.init();
await manager.enable();

// Capture screen
const result = await manager.captureScreen({
  format: 'png',
  quality: 90,
  saveToFile: true,
});

// Capture region
const regionResult = await manager.captureRegion(
  { x: 100, y: 100, width: 800, height: 600 },
  { format: 'jpeg', quality: 85 }
);
```

