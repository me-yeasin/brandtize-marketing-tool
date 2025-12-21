import { useEffect, useState } from 'react'
import {
  FiCheck,
  FiEdit2,
  FiInfo,
  FiMic,
  FiPlus,
  FiSave,
  FiTrash2,
  FiX,
  FiZap
} from 'react-icons/fi'
import { toast } from 'sonner'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'

interface VoiceProfile {
  toneDescription: string
  wordsToUse: string[]
  wordsToAvoid: string[]
  sampleEmails: string[]
  emailLength: 'short' | 'medium' | 'long'
  greetingStyle: string
  signOff: string
  ctaStyle: 'soft' | 'direct' | 'question'
}

const DEFAULT_VOICE: VoiceProfile = {
  toneDescription: '',
  wordsToUse: [],
  wordsToAvoid: [],
  sampleEmails: [],
  emailLength: 'medium',
  greetingStyle: '',
  signOff: '',
  ctaStyle: 'soft'
}

// Common AI/corporate words to avoid
const SUGGESTED_WORDS_TO_AVOID = [
  'synergy',
  'leverage',
  'touch base',
  'circle back',
  'deep dive',
  'move the needle',
  'low-hanging fruit',
  'paradigm shift',
  'bandwidth',
  'pivot',
  'I hope this email finds you well'
]

export function VoiceTab(): React.JSX.Element {
  const [voice, setVoice] = useState<VoiceProfile>(DEFAULT_VOICE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Input states for adding new items
  const [newWordToUse, setNewWordToUse] = useState('')
  const [newWordToAvoid, setNewWordToAvoid] = useState('')
  const [newSampleEmail, setNewSampleEmail] = useState('')
  const [showSampleInput, setShowSampleInput] = useState(false)

  // Load voice profile on mount
  useEffect(() => {
    const loadVoice = async (): Promise<void> => {
      try {
        const profile = await window.api.getVoiceProfile()
        setVoice(profile)
      } catch (error) {
        console.error('Failed to load voice profile:', error)
      } finally {
        setLoading(false)
      }
    }
    loadVoice()
  }, [])

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    try {
      await window.api.setVoiceProfile(voice)
      toast.success('Voice profile saved!', {
        description: 'Your writing voice has been updated.'
      })
      setHasChanges(false)
    } catch (error) {
      toast.error('Failed to save voice profile')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const updateVoice = <K extends keyof VoiceProfile>(key: K, value: VoiceProfile[K]): void => {
    setVoice((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const addWordToUse = (): void => {
    if (newWordToUse.trim() && !voice.wordsToUse.includes(newWordToUse.trim())) {
      updateVoice('wordsToUse', [...voice.wordsToUse, newWordToUse.trim()])
      setNewWordToUse('')
    }
  }

  const removeWordToUse = (word: string): void => {
    updateVoice(
      'wordsToUse',
      voice.wordsToUse.filter((w) => w !== word)
    )
  }

  const addWordToAvoid = (): void => {
    if (newWordToAvoid.trim() && !voice.wordsToAvoid.includes(newWordToAvoid.trim())) {
      updateVoice('wordsToAvoid', [...voice.wordsToAvoid, newWordToAvoid.trim()])
      setNewWordToAvoid('')
    }
  }

  const removeWordToAvoid = (word: string): void => {
    updateVoice(
      'wordsToAvoid',
      voice.wordsToAvoid.filter((w) => w !== word)
    )
  }

  const addSuggestedAvoid = (word: string): void => {
    if (!voice.wordsToAvoid.includes(word)) {
      updateVoice('wordsToAvoid', [...voice.wordsToAvoid, word])
    }
  }

  const addSampleEmail = (): void => {
    if (newSampleEmail.trim() && voice.sampleEmails.length < 3) {
      updateVoice('sampleEmails', [...voice.sampleEmails, newSampleEmail.trim()])
      setNewSampleEmail('')
      setShowSampleInput(false)
    }
  }

  const removeSampleEmail = (index: number): void => {
    updateVoice(
      'sampleEmails',
      voice.sampleEmails.filter((_, i) => i !== index)
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FiMic className="text-primary" />
            My Writing Voice
          </h2>
          <p className="text-sm text-white/60 mt-1">
            Teach the AI to write exactly like you. Your emails will sound authentically human.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Saving...
            </>
          ) : (
            <>
              <FiSave />
              Save Voice
            </>
          )}
        </Button>
      </div>

      {/* Tone Description */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
          <FiEdit2 className="text-primary" />
          Tone & Personality
        </h3>
        <p className="text-sm text-white/50 mb-4">
          Describe how you write. Be specific about your style, personality, and approach.
        </p>
        <textarea
          value={voice.toneDescription}
          onChange={(e) => updateVoice('toneDescription', e.target.value)}
          placeholder="E.g., Casual and direct. I use short sentences. I avoid corporate buzzwords. I sound like a friendly expert, not a salesperson. I occasionally use humor. I'm confident but not arrogant."
          className="w-full h-32 bg-slate-800 text-white p-4 rounded-lg border border-white/10 focus:border-primary/50 focus:outline-none resize-none"
        />
        <div className="mt-2 text-xs text-white/40 flex items-center gap-1">
          <FiInfo size={12} />
          The more detail you provide, the better the AI will mimic your voice.
        </div>
      </Card>

      {/* Words/Phrases I Use */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
          <FiCheck className="text-green-400" />
          Words & Phrases I Use
        </h3>
        <p className="text-sm text-white/50 mb-4">
          Add your signature phrases. The AI will incorporate these into your emails.
        </p>

        {/* Existing words */}
        <div className="flex flex-wrap gap-2 mb-4">
          {voice.wordsToUse.map((word) => (
            <span
              key={word}
              className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm flex items-center gap-2"
            >
              {word}
              <button
                onClick={() => removeWordToUse(word)}
                className="hover:text-white transition-colors"
              >
                <FiX size={14} />
              </button>
            </span>
          ))}
          {voice.wordsToUse.length === 0 && (
            <span className="text-white/40 text-sm">No phrases added yet</span>
          )}
        </div>

        {/* Add new word */}
        <div className="flex gap-2">
          <Input
            value={newWordToUse}
            onChange={(e) => setNewWordToUse(e.target.value)}
            placeholder="e.g., 'quick question', 'real talk', 'no fluff'"
            onKeyDown={(e) => e.key === 'Enter' && addWordToUse()}
            className="flex-1"
          />
          <Button onClick={addWordToUse} disabled={!newWordToUse.trim()}>
            <FiPlus />
          </Button>
        </div>
      </Card>

      {/* Words to Avoid */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
          <FiX className="text-red-400" />
          Words & Phrases to AVOID
        </h3>
        <p className="text-sm text-white/50 mb-4">
          The AI will NEVER use these words in your emails. Great for avoiding AI-sounding language.
        </p>

        {/* Existing words */}
        <div className="flex flex-wrap gap-2 mb-4">
          {voice.wordsToAvoid.map((word) => (
            <span
              key={word}
              className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm flex items-center gap-2"
            >
              {word}
              <button
                onClick={() => removeWordToAvoid(word)}
                className="hover:text-white transition-colors"
              >
                <FiX size={14} />
              </button>
            </span>
          ))}
          {voice.wordsToAvoid.length === 0 && (
            <span className="text-white/40 text-sm">No words blocked yet</span>
          )}
        </div>

        {/* Add new word */}
        <div className="flex gap-2 mb-4">
          <Input
            value={newWordToAvoid}
            onChange={(e) => setNewWordToAvoid(e.target.value)}
            placeholder="e.g., 'synergy', 'leverage', 'circle back'"
            onKeyDown={(e) => e.key === 'Enter' && addWordToAvoid()}
            className="flex-1"
          />
          <Button onClick={addWordToAvoid} disabled={!newWordToAvoid.trim()} variant="outline">
            <FiPlus />
          </Button>
        </div>

        {/* Suggested words */}
        <div className="border-t border-white/10 pt-4">
          <p className="text-xs text-white/40 mb-2">Quick add common AI/corporate words:</p>
          <div className="flex flex-wrap gap-1">
            {SUGGESTED_WORDS_TO_AVOID.filter((w) => !voice.wordsToAvoid.includes(w)).map((word) => (
              <button
                key={word}
                onClick={() => addSuggestedAvoid(word)}
                className="px-2 py-0.5 bg-slate-700 text-white/60 rounded text-xs hover:bg-slate-600 hover:text-white transition-colors"
              >
                + {word}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Sample Emails */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
          <FiZap className="text-purple-400" />
          Sample Emails (Train the AI)
        </h3>
        <p className="text-sm text-white/50 mb-4">
          Paste 2-3 real emails youve written. The AI will learn your exact style from these
          examples.
        </p>

        {/* Existing samples */}
        <div className="space-y-4 mb-4">
          {voice.sampleEmails.map((email, index) => (
            <div key={index} className="relative">
              <div className="bg-slate-800 p-4 rounded-lg border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/40">Sample Email #{index + 1}</span>
                  <button
                    onClick={() => removeSampleEmail(index)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
                <p className="text-white/80 text-sm whitespace-pre-wrap">{email}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Add sample */}
        {voice.sampleEmails.length < 3 && (
          <>
            {showSampleInput ? (
              <div className="space-y-3">
                <textarea
                  value={newSampleEmail}
                  onChange={(e) => setNewSampleEmail(e.target.value)}
                  placeholder="Paste one of your real cold emails here. Include the subject line if you want..."
                  className="w-full h-40 bg-slate-800 text-white p-4 rounded-lg border border-white/10 focus:border-primary/50 focus:outline-none resize-none font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={addSampleEmail}
                    disabled={!newSampleEmail.trim()}
                    className="flex-1"
                  >
                    <FiPlus className="mr-2" />
                    Add Sample
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSampleInput(false)
                      setNewSampleEmail('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setShowSampleInput(true)} className="w-full">
                <FiPlus className="mr-2" />
                Add Sample Email ({voice.sampleEmails.length}/3)
              </Button>
            )}
          </>
        )}
      </Card>

      {/* Email Style Preferences */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-white mb-4">Email Style Preferences</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Email Length */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Preferred Email Length</label>
            <div className="flex gap-2">
              {(['short', 'medium', 'long'] as const).map((length) => (
                <button
                  key={length}
                  onClick={() => updateVoice('emailLength', length)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    voice.emailLength === length
                      ? 'bg-primary text-white'
                      : 'bg-slate-700 text-white/60 hover:bg-slate-600'
                  }`}
                >
                  {length === 'short' && '~50 words'}
                  {length === 'medium' && '~100 words'}
                  {length === 'long' && '150+ words'}
                </button>
              ))}
            </div>
          </div>

          {/* CTA Style */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Call-to-Action Style</label>
            <div className="flex gap-2">
              {(['soft', 'direct', 'question'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => updateVoice('ctaStyle', style)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    voice.ctaStyle === style
                      ? 'bg-primary text-white'
                      : 'bg-slate-700 text-white/60 hover:bg-slate-600'
                  }`}
                >
                  {style === 'soft' && 'Soft'}
                  {style === 'direct' && 'Direct'}
                  {style === 'question' && 'Question'}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/40 mt-1">
              {voice.ctaStyle === 'soft' && 'e.g., "Worth a quick look?"'}
              {voice.ctaStyle === 'direct' && 'e.g., "Let\'s chat Tuesday."'}
              {voice.ctaStyle === 'question' && 'e.g., "Open to a 15-min call?"'}
            </p>
          </div>

          {/* Greeting Style */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Greeting Style</label>
            <Input
              value={voice.greetingStyle}
              onChange={(e) => updateVoice('greetingStyle', e.target.value)}
              placeholder="e.g., 'Hey [Name]', 'Hi there', or leave blank for none"
            />
          </div>

          {/* Sign Off */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Sign-Off</label>
            <Input
              value={voice.signOff}
              onChange={(e) => updateVoice('signOff', e.target.value)}
              placeholder="e.g., 'Cheers', 'Best', 'Talk soon', or your name"
            />
          </div>
        </div>
      </Card>

      {/* Save Button (Floating) */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="shadow-xl flex items-center gap-2 px-6 py-3"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Saving...
              </>
            ) : (
              <>
                <FiSave />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
