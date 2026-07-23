/**
 * @file multi-instance-store.test.ts
 * @description Tests for multi-instance store — instances, workspaces, sessions, IPC
 * @version v1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest'

// We test the actions module directly
describe('Multi-Instance Store Actions', () => {
  it('should export multiInstanceActions', async () => {
    const mod = await import('../multi-instance-store')
    expect(mod.multiInstanceActions).toBeDefined()
    expect(typeof mod.multiInstanceActions.createInstance).toBe('function')
    expect(typeof mod.multiInstanceActions.createWorkspace).toBe('function')
    expect(typeof mod.multiInstanceActions.createSession).toBe('function')
  })

  it('should export useMultiInstanceStore hook', async () => {
    const mod = await import('../multi-instance-store')
    expect(typeof mod.useMultiInstanceStore).toBe('function')
  })

  it('should export all type definitions', async () => {
    // Just verify the module loads without error
    const mod = await import('../multi-instance-store')
    expect(mod.multiInstanceActions.createInstance).toBeDefined()
    expect(mod.multiInstanceActions.closeInstance).toBeDefined()
    expect(mod.multiInstanceActions.activateInstance).toBeDefined()
    expect(mod.multiInstanceActions.minimizeInstance).toBeDefined()
    expect(mod.multiInstanceActions.moveInstance).toBeDefined()
    expect(mod.multiInstanceActions.resizeInstance).toBeDefined()
    expect(mod.multiInstanceActions.createWorkspace).toBeDefined()
    expect(mod.multiInstanceActions.activateWorkspace).toBeDefined()
    expect(mod.multiInstanceActions.updateWorkspace).toBeDefined()
    expect(mod.multiInstanceActions.deleteWorkspace).toBeDefined()
    expect(mod.multiInstanceActions.duplicateWorkspace).toBeDefined()
    expect(mod.multiInstanceActions.createSession).toBeDefined()
    expect(mod.multiInstanceActions.activateSession).toBeDefined()
    expect(mod.multiInstanceActions.suspendSession).toBeDefined()
    expect(mod.multiInstanceActions.resumeSession).toBeDefined()
    expect(mod.multiInstanceActions.closeSession).toBeDefined()
    expect(mod.multiInstanceActions.deleteSession).toBeDefined()
    expect(mod.multiInstanceActions.refreshResources).toBeDefined()
    expect(mod.multiInstanceActions.broadcastMessage).toBeDefined()
    expect(mod.multiInstanceActions.clearIPCLog).toBeDefined()
    expect(mod.multiInstanceActions.getActiveWorkspace).toBeDefined()
    expect(mod.multiInstanceActions.getWorkspaceSessions).toBeDefined()
    expect(mod.multiInstanceActions.getTotalMemoryMB).toBeDefined()
  })
})
