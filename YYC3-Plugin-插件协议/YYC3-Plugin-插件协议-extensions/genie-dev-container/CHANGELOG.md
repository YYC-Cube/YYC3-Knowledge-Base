# Change Log

All notable changes to the "codebuddy-dev-containers" extension will be documented in this file.

## [0.0.1] - 2025-10-29

### Added

#### Core Features

- **Dev Container Support**: Full implementation of VS Code Dev Containers functionality
    - Open folder in container from local, SSH, and WSL environments
    - Reopen current workspace in container
    - Attach to running Docker containers
    - Reopen folder locally from container environment
- **Multi-Environment Support**: Works seamlessly across local, SSH remote, and WSL environments
- **Container Management**:
    - Tree view showing containers grouped by location (Local, SSH hosts, WSL)
    - Delete containers directly from the tree view
    - Open containers from history
    - Refresh container list
- **Remote Execution Server**: Support for executing commands on remote hosts
    - SSH remote support via `getRemoteExecServer` API
    - Local execution fallback for non-remote environments
    - Timeout protection and error handling

#### Developer Experience

- **Multi-language Support**: i18n implementation with English, Simplified Chinese, and Traditional Chinese
- **Unified Logging System**: Centralized logging with output channel integration
- **Configuration Validation**:
    - JSON schema validation for `devcontainer.json` files
    - Schema support for devcontainer features and attach configurations
    - Real-time validation feedback

#### DevContainer CLI Integration

- Integration with `@devcontainers/cli` (v0.80.1)
- Support for reading and parsing devcontainer configurations
- VS Code server installation and management in containers
- Port forwarding support between host and container
- SSH agent forwarding in dev containers

#### Technical Infrastructure

- **VS Code Server Management**:
    - Automatic server installation in containers
    - Server version matching with host VS Code
    - Custom server download URL template support
    - Connection establishment and lifecycle management
- **Port Forwarding**: Automatic port forwarding setup for dev containers
- **Process Management**: Background process handling and termination scripts
- **File System Operations**: Remote file system support via ExecServer API

### Fixed

- **Remote Execution**: Fixed missing `await` keyword in `reopen-in-container-command.ts` that could cause VS Code crashes
- **Extension Host**: Added `workspace` extension kind to support running in remote environments
- **Docker Detection**: Improved Docker path detection across different platforms
- **Environment Detection**: Better handling of remote authority parsing and environment context

### Changed

- **Persistence Format**: Updated container data persistence structure for better organization
- **Command Organization**: Refactored commands into separate files for better maintainability
- **Tree View Display**: Improved grouping and display of containers by location
- **Error Handling**: Enhanced error messages with actionable suggestions
- **Webpack Configuration**: Optimized build process with proper source maps and external dependencies

### Technical Details

#### Commands Implemented

- `codebuddy-dev-containers.openFolderInContainer` - Open a folder in a new dev container
- `codebuddy-dev-containers.reopenInContainer` - Reopen current folder in container
- `codebuddy-dev-containers.attachToRunningContainer` - Attach to existing container
- `codebuddy-dev-containers.reopenFolderLocally` - Exit container and reopen locally
- `codebuddy-dev-containers.openFromHistory` - Open previously used container
- `codebuddy-dev-containers.explorer.deleteContainer` - Remove container from history
- `codebuddy-dev-containers.explorer.refresh` - Refresh container tree view
- `codebuddy-dev-containers.showLog` - Show extension output logs

#### Configuration Options

- `remote.codebuddyDevContainers.serverDownloadUrlTemplate` - Custom VS Code server download URL
- `remote.codebuddyDevContainers.enableSSHAgentForwarding` - Enable SSH agent forwarding (default: true)

#### API Usage

- VS Code Proposed APIs: `contribViewsRemote`, `resolvers`
- Remote Authority Resolver implementation
- ExecServer API for cross-platform command execution
- Resource Label Formatters for container workspace display

### Dependencies

- `@devcontainers/cli`: ^0.80.1
- VS Code Engine: ^1.80.0
- Node.js: 22.x
- TypeScript: ^5.9.3
- Webpack: ^5.102.0

### Known Issues

- `getRemoteExecServer` API may cause crashes in certain VS Code versions when called from UI extension host
- Timeout protection added as workaround (5 second timeout)
- Fallback to LocalExecServer if remote exec server unavailable

### Development

- ESLint and Prettier integration for code quality
- TypeScript strict mode enabled
- Comprehensive webpack bundling with schema copying
- Debug configuration for extension development

---

## [0.1.0] - 2025-12-19

### Added

#### Enhanced Container Management

- **Running Container View** - Added support for displaying and managing running containers in the tree view
- **Docker Compose Support** - Implemented docker compose subtree rendering for multi-container projects
- **Container Detection** - Automatic detection of `devcontainer.json` when opening folders with notification prompt to reopen in container
- **Interactive postAttachCommand** - Support for interactive terminal execution in postAttachCommand lifecycle hook

#### Terminal and Command Execution

- **Terminal-based Container Commands** - Support for executing container commands via terminal with real-time log output
- **Enhanced Logging** - Improved logging system with detailed port forwarding error messages
- **Interactive Command Support** - Full support for interactive commands during container lifecycle

#### Configuration Enhancements

- **Skip Post Commands Option** - Added `remote.codebuddyDevContainers.skipPostCreate` configuration to control execution of `postCreateCommand` and `postStartCommand`
  - Default: `true` for faster startup
  - Provides significant performance improvement in container connection time
  - Only `postAttachCommand` runs after VS Code Server installation when enabled

### Fixed

- **Server Path Resolution** - Fixed incorrect server node path retrieval when launching containers locally ([#13455](https://cnb.woa.com/genie/genie/-/issues/13455))
- **CLI Hang Issue** - Resolved dev-container-cli hanging and error issues during container operations
- **Script Compatibility** - Fixed container installation script to handle missing `grep` command in minimal container images
- **Port Forwarding Errors** - Improved error handling and logging for port forwarding failures

### Changed

- **Container Display** - Enhanced container tree view to show running containers separately from configured containers
- **Attach Workflow** - Improved attach to running container workflow with better UI feedback
- **Label Display** - Optimized dev-container label presentation in the UI

### Technical Improvements

- Better error recovery for container operations
- Improved command execution reliability
- Enhanced terminal integration
- More robust container lifecycle management

---

## [0.2.0] - 2025-12-26

### Added

#### Container Management Enhancements

- **Rebuild and Reopen** - Added support for rebuilding container images and reopening workspace
  - New command: `Dev Containers: Rebuild and Reopen in Container`
  - Useful for applying Dockerfile or configuration changes
  - Ensures fresh container state with latest dependencies

#### Port Forwarding Improvements

- **Enhanced Port Management** - Improved port forwarding capabilities with better UI integration
  - Integration with VS Code Ports panel
  - Automatic port detection and forwarding from `devcontainer.json`
  - Real-time port status updates
  - Better error handling and user notifications for port conflicts

#### Logging and Debugging

- **Enhanced Logging System** - Improved logging for better debugging and troubleshooting
  - Detailed port forwarding logs
  - Terminal execution output logging
  - Better error messages with context
  - Command execution tracking

### Fixed

- **Root User Execution** - Fixed script execution errors when running as root user in containers
  - Improved permission handling
  - Better detection of user context
  - Fixed `grep` command availability checks in minimal containers

### Changed

- **Terminal Integration** - Enhanced terminal-based command execution
  - Better support for interactive commands in `postAttachCommand`
  - Real-time output display in terminals
  - Improved process management

### Technical Improvements

- Improved container lifecycle management
- Better error recovery mechanisms
- Enhanced script compatibility with minimal container images
- More robust port forwarding implementation

---

## [Unreleased]

### Planned

- Enhanced container configuration templates
- Container resource monitoring
- Multi-container workspace support
- Performance optimizations for large projects
