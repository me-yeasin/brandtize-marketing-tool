import { StateGraph, START, END, Annotation, messagesStateReducer } from '@langchain/langgraph'
import { ChatGroq } from '@langchain/groq'
import { ChatMistralAI } from '@langchain/mistralai'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatVertexAI } from '@langchain/google-vertexai'
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  type BaseMessage,
  isAIMessageChunk
} from '@langchain/core/messages'

import {
  getApiKeys,
  getSelectedModel,
  getSelectedAiProvider,
  getSelectedGoogleMode,
  getGoogleProjectId,
  getGoogleLocation
} from '../store'
import { getSystemPrompt } from '../agents/lead-discovery'
import type { ChatMessage, StreamCallbacks } from './ai-service'

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => []
  })
})

type AgentStateType = typeof AgentState.State

type ChatModel = ChatGroq | ChatMistralAI | ChatGoogleGenerativeAI | ChatVertexAI

function createModel(): ChatModel | null {
  const provider = getSelectedAiProvider()
  const selectedModel = getSelectedModel()
  const { groqApiKey, mistralApiKey, googleApiKey } = getApiKeys()

  if (provider === 'groq') {
    if (!groqApiKey) return null
    return new ChatGroq({
      apiKey: groqApiKey,
      model: selectedModel,
      temperature: 0.7,
      streaming: true
    })
  }

  if (provider === 'mistral') {
    if (!mistralApiKey) return null
    return new ChatMistralAI({
      apiKey: mistralApiKey,
      model: selectedModel,
      temperature: 0.7,
      streaming: true
    })
  }

  if (provider === 'google') {
    if (!googleApiKey) return null
    const googleMode = getSelectedGoogleMode()

    if (googleMode === 'vertexApiKey') {
      const projectId = getGoogleProjectId()
      const location = getGoogleLocation()
      return new ChatVertexAI({
        model: selectedModel,
        temperature: 0.7,
        streaming: true,
        authOptions: { apiKey: googleApiKey },
        ...(projectId && { projectId }),
        ...(location && { location })
      })
    }

    return new ChatGoogleGenerativeAI({
      apiKey: googleApiKey,
      model: selectedModel,
      temperature: 0.7,
      streaming: true
    })
  }

  return null
}

async function callModel(state: AgentStateType): Promise<Partial<AgentStateType>> {
  const model = createModel()
  if (!model) {
    throw new Error('No AI model configured. Please set API key in Settings.')
  }

  const response = await model.invoke(state.messages)
  return { messages: [response] }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createEmailAgent() {
  const workflow = new StateGraph(AgentState)
    .addNode('agent', callModel)
    .addEdge(START, 'agent')
    .addEdge('agent', END)

  return workflow.compile()
}

function convertToLangChainMessages(messages: ChatMessage[]): BaseMessage[] {
  const systemPrompt = getSystemPrompt()
  const systemMessage = new SystemMessage(systemPrompt)

  const chatMessages = messages.map((msg) => {
    if (msg.role === 'user') {
      return new HumanMessage(msg.text)
    }
    return new AIMessage(msg.text)
  })

  return [systemMessage, ...chatMessages]
}

export async function streamAgentResponse(
  messages: ChatMessage[],
  callbacks: StreamCallbacks
): Promise<void> {
  const provider = getSelectedAiProvider()
  const { groqApiKey, mistralApiKey, googleApiKey } = getApiKeys()

  if (provider === 'groq' && !groqApiKey) {
    callbacks.onError('Groq API key not configured. Please set it in Settings.')
    return
  }

  if (provider === 'mistral' && !mistralApiKey) {
    callbacks.onError('Mistral API key not configured. Please set it in Settings.')
    return
  }

  if (provider === 'google' && !googleApiKey) {
    callbacks.onError('Google API key not configured. Please set it in Settings.')
    return
  }

  try {
    const agent = createEmailAgent()
    const langChainMessages = convertToLangChainMessages(messages)

    let fullText = ''

    const eventStream = agent.streamEvents({ messages: langChainMessages }, { version: 'v2' })

    for await (const event of eventStream) {
      if (event.event === 'on_chat_model_stream') {
        const chunk = event.data?.chunk
        if (chunk && isAIMessageChunk(chunk)) {
          const token = typeof chunk.content === 'string' ? chunk.content : ''
          if (token) {
            fullText += token
            callbacks.onToken(token)
          }
        }
      }
    }

    callbacks.onComplete(fullText)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('[LangGraph Agent] Error:', error)
    callbacks.onError(errorMessage)
  }
}
