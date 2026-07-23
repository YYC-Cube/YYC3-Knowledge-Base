'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

interface InstallationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InstallationModal({ open, onOpenChange }: InstallationModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  
  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }
  
  const installCommands = {
    allUser: {
      mac: `git clone https://github.com/davepoon/buildwithclaude.git
find buildwithclaude/subagents -name "*.md" -exec cp {} ~/.claude/agents/ \\;`,
      windows: `git clone https://github.com/davepoon/buildwithclaude.git
for %f in (buildwithclaude\\subagents\\*.md) do copy "%f" %USERPROFILE%\\.claude\\agents\\`
    },
    allProject: {
      mac: `mkdir -p .claude/agents
find /path/to/buildwithclaude/subagents -name "*.md" -exec cp {} .claude/agents/ \\;`,
      windows: `mkdir .claude\\agents 2>nul
for %f in (\\path\\to\\buildwithclaude\\subagents\\*.md) do copy "%f" .claude\\agents\\`
    },
    singleUser: {
      mac: `cp subagent-name.md ~/.claude/agents/`,
      windows: `copy subagent-name.md %USERPROFILE%\\.claude\\agents\\`
    },
    singleProject: {
      mac: `mkdir -p .claude/agents && cp subagent-name.md .claude/agents/`,
      windows: `mkdir .claude\\agents 2>nul && copy subagent-name.md .claude\\agents\\`
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Installation Guide</DialogTitle>
          <DialogDescription>
            Choose how you want to install the Claude Code Subagents
          </DialogDescription>
        </DialogHeader>
        
        <div className="mb-4 p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">💡 Quick Tip: Easy Installation</p>
          <p className="text-sm text-muted-foreground">
            You can also copy or download individual subagents directly from the browse page!
            Look for the copy and download buttons on each subagent card when you hover over them.
          </p>
        </div>
        
        <Tabs defaultValue="all-subagents" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all-subagents">All Subagents</TabsTrigger>
            <TabsTrigger value="single-subagent">Single Subagent</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all-subagents" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Install All Subagents</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Install the complete collection of subagents for comprehensive coverage
              </p>
            </div>
            
            <Tabs defaultValue="user" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="user">User Installation</TabsTrigger>
                <TabsTrigger value="project">Project Installation</TabsTrigger>
              </TabsList>
              
              <TabsContent value="user" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Available in all your projects
                </p>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">macOS/Linux</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(installCommands.allUser.mac, 0)}
                      >
                        {copiedIndex === 0 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                      <code>{installCommands.allUser.mac}</code>
                    </pre>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Windows</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(installCommands.allUser.windows, 1)}
                      >
                        {copiedIndex === 1 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                      <code>{installCommands.allUser.windows}</code>
                    </pre>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="project" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Only for the current project
                </p>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">macOS/Linux</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(installCommands.allProject.mac, 2)}
                      >
                        {copiedIndex === 2 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                      <code>{installCommands.allProject.mac}</code>
                    </pre>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Windows</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(installCommands.allProject.windows, 3)}
                      >
                        {copiedIndex === 3 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                      <code>{installCommands.allProject.windows}</code>
                    </pre>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
          
          <TabsContent value="single-subagent" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Install Single Subagent</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Install specific subagents based on your needs
              </p>
            </div>
            
            <Tabs defaultValue="user" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="user">User Installation</TabsTrigger>
                <TabsTrigger value="project">Project Installation</TabsTrigger>
              </TabsList>
              
              <TabsContent value="user" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Replace `subagent-name.md` with the actual subagent filename.
                  <br />
                  <strong>Tip:</strong> You can copy the content directly from the browse page instead!
                </p>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">macOS/Linux</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(installCommands.singleUser.mac, 4)}
                      >
                        {copiedIndex === 4 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                      <code>{installCommands.singleUser.mac}</code>
                    </pre>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Windows</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(installCommands.singleUser.windows, 5)}
                      >
                        {copiedIndex === 5 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                      <code>{installCommands.singleUser.windows}</code>
                    </pre>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="project" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Replace `subagent-name.md` with the actual subagent filename.
                  <br />
                  <strong>Tip:</strong> You can download the file directly from the browse page instead!
                </p>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">macOS/Linux</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(installCommands.singleProject.mac, 6)}
                      >
                        {copiedIndex === 6 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                      <code>{installCommands.singleProject.mac}</code>
                    </pre>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Windows</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(installCommands.singleProject.windows, 7)}
                      >
                        {copiedIndex === 7 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                      <code>{installCommands.singleProject.windows}</code>
                    </pre>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-medium mb-2">After Installation:</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Restart Claude Code to load the new subagents</li>
            <li>Subagents will be automatically invoked based on context</li>
            <li>You can also explicitly call them using @ mentions or natural language</li>
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  )
}