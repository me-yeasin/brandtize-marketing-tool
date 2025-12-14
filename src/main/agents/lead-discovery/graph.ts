import { StateGraph, START, END, Annotation, messagesStateReducer } from '@langchain/langgraph'
import { SystemMessage, type BaseMessage } from '@langchain/core/messages'

import { getSystemPrompt } from './prompts'
import type { AgentConfig } from '../types'

export const LeadDiscoveryState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => []
  })
})

export type LeadDiscoveryStateType = typeof LeadDiscoveryState.State

export const LEAD_DISCOVERY_CONFIG: AgentConfig = {
  name: 'Lead Discovery Strategist',
  description: 'Helps identify potential business leads and email discovery strategies',
  version: '1.0.0'
}

export function prependSystemPrompt(messages: BaseMessage[]): BaseMessage[] {
  const systemPrompt = getSystemPrompt()
  const systemMessage = new SystemMessage(systemPrompt)
  return [systemMessage, ...messages]
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function createLeadDiscoveryGraph() {
  const workflow = new StateGraph(LeadDiscoveryState)
    .addNode('agent', async (state: LeadDiscoveryStateType) => {
      return { messages: state.messages }
    })
    .addEdge(START, 'agent')
    .addEdge('agent', END)

  return workflow.compile()
}
