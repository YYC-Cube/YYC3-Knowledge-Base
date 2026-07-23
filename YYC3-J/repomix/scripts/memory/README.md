# Memory Benchmarks

Memory usage monitoring tools for repomix.

## Setup

```bash
cd scripts/memory
npm install
```

## Quick Start

```bash
# Quick memory leak check
npm run leak:quick

# Detailed analysis
npm run leak:analyze
```

## Available Scripts

- `npm run leak:quick` - Fast leak detection (20 iterations)
- `npm run leak:watch` - Continuous monitoring  
- `npm run leak:analyze` - Comprehensive analysis with reports

## Understanding Results

- **Heap Memory**: JavaScript objects (should stabilize)
- **RSS Memory**: Total process memory (watch for growth > 100%)

Look for consistent upward trends that indicate memory leaks.
