/**
 * Tools Module - Scalable Tool System for Agentic AI
 *
 * This module exports all tools and the registry for dynamic tool use.
 * To add a new tool:
 * 1. Create a new file in this directory (e.g., my-tool.ts)
 * 2. Implement the AgentTool interface
 * 3. Export it from this index file
 * 4. Register it in the registry
 */

export * from './types'
export * from './registry'

// MVP Tools
export * from './web-search'
export * from './fetch-page'
export * from './extract-emails'

// Safety Tools
export * from './url-policy'
export * from './rate-limiter'

// Utility Tools
export * from './domain-classifier'
export * from './contact-classifier'
export * from './company-extractor'
export * from './emit-lead'
