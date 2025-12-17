import { useState } from 'react'
import { FiSearch } from 'react-icons/fi'

interface EmailPromptViewProps {
  activeTabId: string
  prompt: string
  onPromptChange: (nextPrompt: string) => void
  onSubmit: () => void
}

const SEARCH_FORMULAS = [
  {
    id: 'direct_emails',
    label: 'Get Direct Emails',
    formula:
      '"send your resume to" OR "email us at" OR "reply to" AND [Industry] AND [City] -site:indeed.com -site:linkedin.com -site:craigslist.org'
  },
  {
    id: 'outdated_websites',
    label: 'Outdated Websites',
    formula:
      '"copyright 2019..2021" AND [Industry] AND [City] -site:yelp.com -site:yellowpages.com -site:facebook.com -site:tripadvisor.com -site:linkedin.com'
  }
]

function EmailPromptView({ activeTabId }: EmailPromptViewProps): React.JSX.Element {
  const [niche, setNiche] = useState('')
  const [location, setLocation] = useState('')
  const [selectedFormulas, setSelectedFormulas] = useState<string[]>([])

  const toggleFormula = (id: string): void => {
    setSelectedFormulas((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  const handleStartProcess = (): void => {
    // For now, do nothing - just design
    console.log('Start Process clicked', { niche, location, selectedFormulas })
  }

  return (
    <div className="h-full w-full flex flex-col p-6 items-center overflow-y-auto">
      <h1 className="text-4xl font-medium mb-10 pb-1 bg-linear-to-r from-purple-400 via-primary to-indigo-400 bg-clip-text text-transparent">
        Lets start generating the leads
      </h1>

      <div className="w-full max-w-[500px] space-y-4">
        {/* Niche Input */}
        <div className="bg-slate-800 rounded-xl p-4">
          <label htmlFor={`niche-${activeTabId}`} className="text-white/60 text-sm mb-2 block">
            Niche
          </label>
          <input
            type="text"
            id={`niche-${activeTabId}`}
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="bg-transparent text-white placeholder-white/40 text-lg focus:outline-none w-full"
            placeholder="e.g. Gym, Dental Clinic, Restaurant"
          />
        </div>

        {/* Location Input */}
        <div className="bg-slate-800 rounded-xl p-4">
          <label htmlFor={`location-${activeTabId}`} className="text-white/60 text-sm mb-2 block">
            City or Country
          </label>
          <input
            type="text"
            id={`location-${activeTabId}`}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="bg-transparent text-white placeholder-white/40 text-lg focus:outline-none w-full"
            placeholder="e.g. Los Angeles, USA"
          />
        </div>

        {/* Search Formulas List */}
        <div className="bg-slate-800 rounded-xl p-4">
          <label className="text-white/60 text-sm mb-3 block">Search Formulas</label>
          <div className="space-y-2">
            {SEARCH_FORMULAS.map((formula) => (
              <div
                key={formula.id}
                onClick={() => toggleFormula(formula.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedFormulas.includes(formula.id)
                    ? 'bg-primary/20 border border-primary'
                    : 'bg-slate-700/50 border border-transparent hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedFormulas.includes(formula.id)
                        ? 'bg-primary border-primary'
                        : 'border-white/40'
                    }`}
                  >
                    {selectedFormulas.includes(formula.id) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="text-white font-medium">{formula.label}</div>
                    <div className="text-white/50 text-xs break-all">{formula.formula}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Start Process Button */}
        <button
          type="button"
          onClick={handleStartProcess}
          className="w-full bg-primary hover:bg-primary/80 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <FiSearch size={20} />
          Start Process
        </button>
      </div>
    </div>
  )
}

export { EmailPromptView }
