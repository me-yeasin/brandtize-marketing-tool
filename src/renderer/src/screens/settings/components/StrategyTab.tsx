import { useEffect, useState } from 'react'
import {
  FiAward,
  FiBriefcase,
  FiCpu,
  FiEdit2,
  FiSave,
  FiSearch,
  FiSend,
  FiTarget,
  FiUser
} from 'react-icons/fi'
import { toast } from 'sonner'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { ThinkingBlock } from '../../../components/ui/ThinkingBlock'
interface NicheStrategy {
  niche: string
  targetAudience: string
  serviceAnalysis: {
    painPoints: string[]
    valuePropositions: string[]
    industryJargon: string[]
  }
  personaAnalysis: {
    dailyFears: string[]
    secretDesires: string[]
    commonObjections: string[]
  }
  offerStrategy: {
    grandSlamHooks: string[]
    riskReversals: string[]
    bonuses: string[]
  }
  outreachTactics: {
    winningSubjectLines: string[]
    bestOpeners: string[]
    valueDropMethods: string[]
    structureRules: string[]
  }
  marketingAngles: string[]
  winningFrameworks: string[]
}

type StrategySection = 'service' | 'persona' | 'offer' | 'tactics'

export function StrategyTab(): React.JSX.Element {
  const [loading, setLoading] = useState(false)
  const [strategy, setStrategy] = useState<NicheStrategy | null>(null)
  const [nicheInput, setNicheInput] = useState('')
  const [audienceInput, setAudienceInput] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [activeSection, setActiveSection] = useState<StrategySection>('service')

  // Load existing strategy on mount
  useEffect(() => {
    loadStrategy()
  }, [])

  const loadStrategy = async (): Promise<void> => {
    try {
      const data = await window.api.getNicheStrategy()
      if (data) {
        setStrategy(data)
        setNicheInput(data.niche)
        setAudienceInput(data.targetAudience)
      }
    } catch (error) {
      console.error('Failed to load strategy:', error)
    }
  }

  const handleResearch = async (): Promise<void> => {
    if (!nicheInput.trim() || !audienceInput.trim()) {
      toast.error('Please enter both Niche and Target Audience')
      return
    }

    setLoading(true)
    try {
      const result = await window.api.researchNicheStrategy(nicheInput, audienceInput)
      if (result.success && result.data) {
        setStrategy(result.data)
        toast.success('Grand Slam Strategy Generated!')
      } else {
        toast.error(result.error || 'Failed to research strategy')
      }
    } catch (error) {
      console.error(error)
      toast.error('An error occurred during research')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!strategy) return

    try {
      const success = await window.api.saveNicheStrategy(strategy)
      if (success) {
        toast.success('Strategy saved successfully')
        setIsEditing(false)
      } else {
        toast.error('Failed to save strategy')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error saving strategy')
    }
  }

  const updateNestedField = (
    section: 'serviceAnalysis' | 'personaAnalysis' | 'offerStrategy' | 'outreachTactics' | 'root',
    field: string,
    value: string | string[],
    index?: number
  ): void => {
    if (!strategy) return
    const newStrategy = { ...strategy }

    if (section === 'root') {
      // @ts-ignore - dynamic key assignment
      newStrategy[field] = value
      return setStrategy(newStrategy)
    }

    // @ts-ignore - dynamic access
    const sectionData = { ...newStrategy[section] }

    if (index !== undefined && Array.isArray(sectionData[field])) {
      const arr = [...sectionData[field]]
      arr[index] = value
      sectionData[field] = arr
    } else {
      sectionData[field] = value
    }

    // @ts-ignore - dynamic assignment
    newStrategy[section] = sectionData
    setStrategy(newStrategy)
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 space-y-6 animate-fade-in">
        <ThinkingBlock
          thinking="Analyzing Persona Psychology, Service Hooks, and Grand Slam Offers..."
          defaultExpanded={true}
        />
        <p className="text-white/60 animate-pulse">
          Constructing the perfect pitch for &quot;{audienceInput}&quot;...
        </p>
      </div>
    )
  }

  // Render the input form if no strategy exists
  if (!strategy) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <Card className="p-8 text-center space-y-6 border-white/10 bg-surface/50 backdrop-blur-sm">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary mb-4">
            <FiTarget size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white">Build Your Grand Slam Strategy</h2>
          <p className="text-white/60">
            Tell us WHAT you sell and WHO you sell to.
            <br />
            Our AI will build a 4-Pillar Strategy: Service Expertise, Persona Psychology, Grand Slam
            Offer, and Outreach Tactics.
          </p>

          <div className="space-y-4 max-w-md mx-auto text-left">
            <div>
              <label className="text-xs text-text-muted ml-1 mb-1 block">
                Your Service / Niche
              </label>
              <Input
                placeholder="e.g. Web Development, SEO, Lead Gen"
                value={nicheInput}
                onChange={(e) => setNicheInput(e.target.value)}
                className="bg-slate-900 border-white/10"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted ml-1 mb-1 block">Target Audience</label>
              <Input
                placeholder="e.g. Restaurant Owners, SaaS Founders"
                value={audienceInput}
                onChange={(e) => setAudienceInput(e.target.value)}
                className="bg-slate-900 border-white/10"
              />
            </div>
            <Button
              onClick={handleResearch}
              disabled={!nicheInput.trim() || !audienceInput.trim()}
              className="w-full"
            >
              <FiSearch className="mr-2" />
              Generate Strategy Playbook
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // ... render loading and input card ...

  const renderList = (
    section: 'serviceAnalysis' | 'personaAnalysis' | 'offerStrategy' | 'outreachTactics' | 'root',
    // ... rest of args

    field: string,
    items: string[],
    icon: React.ReactNode,
    title: string,
    colorClass: string
  ): React.JSX.Element => (
    <Card className="p-5 border-white/10 h-full bg-surface/30">
      <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${colorClass}`}>
        {icon} {title}
      </h3>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-white/20 font-mono text-sm">{i + 1}.</span>
            {isEditing ? (
              <Input
                value={item}
                onChange={(e) => updateNestedField(section, field, e.target.value, i)}
                className="h-8 text-sm"
              />
            ) : (
              <p className="text-white/80 text-sm">{item}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  )

  // Render the Strategy Playbook with Tabs
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-primary">Strategy:</span> {strategy.niche}
          </h2>
          <p className="text-text-muted text-sm flex items-center gap-2 mt-1">
            Targeting: <span className="text-white">{strategy.targetAudience}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <Button onClick={handleSave} variant="primary">
              <FiSave className="mr-2" /> Save
            </Button>
          ) : (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <FiEdit2 className="mr-2" /> Edit
            </Button>
          )}
          <Button onClick={() => setStrategy(null)} variant="ghost" className="text-red-400">
            Reset
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-white/10 overflow-x-auto pb-1">
        {[
          { id: 'service', label: '1. Service Expertise', icon: <FiBriefcase /> },
          { id: 'persona', label: '2. Persona Psychology', icon: <FiUser /> },
          { id: 'offer', label: '3. Grand Slam Offer', icon: <FiAward /> },
          { id: 'tactics', label: '4. Outreach Tactics', icon: <FiSend /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as StrategySection)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeSection === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-white'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {activeSection === 'service' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {renderList(
              'serviceAnalysis',
              'painPoints',
              strategy.serviceAnalysis.painPoints,
              '🔥',
              'Technical Pain Points',
              'text-red-400'
            )}
            {renderList(
              'serviceAnalysis',
              'valuePropositions',
              strategy.serviceAnalysis.valuePropositions,
              '💎',
              'Value Propositions',
              'text-green-400'
            )}
            <div className="md:col-span-2">
              {renderList(
                'serviceAnalysis',
                'industryJargon',
                strategy.serviceAnalysis.industryJargon,
                '🗣️',
                'Insider Jargon',
                'text-purple-400'
              )}
            </div>
          </div>
        )}

        {activeSection === 'persona' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {renderList(
              'personaAnalysis',
              'dailyFears',
              strategy.personaAnalysis.dailyFears,
              '😨',
              'Daily Fears (The "Why")',
              'text-orange-400'
            )}
            {renderList(
              'personaAnalysis',
              'secretDesires',
              strategy.personaAnalysis.secretDesires,
              '🌟',
              'Secret Desires',
              'text-yellow-400'
            )}
            <div className="md:col-span-2">
              {renderList(
                'personaAnalysis',
                'commonObjections',
                strategy.personaAnalysis.commonObjections,
                '🛡️',
                'Common Objections to Kill',
                'text-blue-400'
              )}
            </div>
          </div>
        )}

        {activeSection === 'offer' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {renderList(
              'offerStrategy',
              'grandSlamHooks',
              strategy.offerStrategy.grandSlamHooks,
              '🎣',
              'Grand Slam Headers',
              'text-pink-400'
            )}
            {renderList(
              'offerStrategy',
              'riskReversals',
              strategy.offerStrategy.riskReversals,
              '🤝',
              'Risk Reversal / Guarantees',
              'text-cyan-400'
            )}
            {/* <div className="md:col-span-2">
              {renderList(
                'offerStrategy',
                'bonuses',
                strategy.offerStrategy.bonuses,
                '🎁',
                'High-Value Bonuses',
                'text-emerald-400'
              )}
            </div> */}
            <div className="md:col-span-2">
              {renderList(
                'offerStrategy',
                'bonuses',
                strategy.offerStrategy.bonuses,
                '🎁',
                'High-Value Bonuses',
                'text-emerald-400'
              )}
            </div>
          </div>
        )}

        {activeSection === 'tactics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {renderList(
              'outreachTactics',
              'winningSubjectLines',
              strategy.outreachTactics.winningSubjectLines,
              '📧',
              'Winning Subject Lines',
              'text-indigo-400'
            )}
            {renderList(
              'outreachTactics',
              'bestOpeners',
              strategy.outreachTactics.bestOpeners,
              '🎣',
              'Killer Openers',
              'text-teal-400'
            )}
            {renderList(
              'outreachTactics',
              'structureRules',
              strategy.outreachTactics.structureRules,
              '📏',
              'Structure & Formatting Rules',
              'text-gray-400'
            )}
            {renderList(
              'outreachTactics',
              'valueDropMethods',
              strategy.outreachTactics.valueDropMethods,
              '🎁',
              'Best Value Drops (Freebies)',
              'text-amber-400'
            )}
          </div>
        )}
      </div>

      <Card className="p-6 border-primary/20 bg-primary/5 mt-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/20 rounded-lg text-primary">
            <FiCpu size={24} />
          </div>
          <div>
            <h4 className="font-bold text-white">Full Strategy Active</h4>
            <p className="text-white/60 text-sm">
              The AI will now combine your <b>Service Expertise</b>, <b>Persona Psychology</b>,{' '}
              <b>Grand Slam Offer</b>, and <b>Outreach Tactics</b> to generate hyper-personalized
              pitches.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
