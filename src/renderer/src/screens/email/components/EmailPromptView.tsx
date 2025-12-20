import { useState } from 'react'
import { FiSearch, FiEdit2 } from 'react-icons/fi'
import { LeadGenerationView } from './LeadGenerationView'

interface EmailPromptViewProps {
  tabId: string
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
      '"copyright" AND [Industry] AND [City] -site:yelp.com -site:yellowpages.com -site:facebook.com -site:tripadvisor.com -site:linkedin.com'
  }
]

function EmailPromptView({ tabId }: EmailPromptViewProps): React.JSX.Element {
  const [niche, setNiche] = useState('')
  const [location, setLocation] = useState('')
  const [selectedFormula, setSelectedFormula] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editableQuery, setEditableQuery] = useState('')

  const selectFormula = (id: string): void => {
    const newId = selectedFormula === id ? '' : id
    setSelectedFormula(newId)
    // Auto-generate query when selecting a formula
    if (newId && niche.trim() && location.trim()) {
      const formula = SEARCH_FORMULAS.find((f) => f.id === newId)
      if (formula) {
        const query = formula.formula
          .replace('[Industry]', niche.trim())
          .replace('[City]', location.trim())
        setEditableQuery(query)
      }
    } else {
      setEditableQuery('')
    }
  }

  // Generate query when niche or location changes (if formula is selected)
  const handleNicheChange = (value: string): void => {
    setNiche(value)
    if (selectedFormula && value.trim() && location.trim()) {
      const formula = SEARCH_FORMULAS.find((f) => f.id === selectedFormula)
      if (formula) {
        const query = formula.formula
          .replace('[Industry]', value.trim())
          .replace('[City]', location.trim())
        setEditableQuery(query)
      }
    }
  }

  const handleLocationChange = (value: string): void => {
    setLocation(value)
    if (selectedFormula && niche.trim() && value.trim()) {
      const formula = SEARCH_FORMULAS.find((f) => f.id === selectedFormula)
      if (formula) {
        const query = formula.formula
          .replace('[Industry]', niche.trim())
          .replace('[City]', value.trim())
        setEditableQuery(query)
      }
    }
  }

  const isFormValid = niche.trim() && location.trim() && selectedFormula

  const handleStartProcess = (): void => {
    if (!isFormValid || !editableQuery.trim()) return
    setSearchQuery(editableQuery.trim())
    setIsProcessing(true)
  }

  // Show lead generation view when processing
  if (isProcessing && searchQuery) {
    return (
      <LeadGenerationView
        tabId={tabId}
        searchQuery={searchQuery}
        niche={niche.trim()}
        location={location.trim()}
      />
    )
  }

  return (
    <div className="h-full w-full flex flex-col p-6 items-center overflow-y-auto">
      <h1 className="text-4xl font-medium mb-10 pb-1 bg-linear-to-r from-purple-400 via-primary to-indigo-400 bg-clip-text text-transparent">
        Lets start generating the leads
      </h1>

      <div className="w-full max-w-[500px] space-y-4">
        {/* Niche Input */}
        <div className="bg-slate-800 rounded-xl p-4">
          <label htmlFor={`niche-${tabId}`} className="text-white/60 text-sm mb-2 block">
            Niche
          </label>
          <input
            type="text"
            id={`niche-${tabId}`}
            value={niche}
            onChange={(e) => handleNicheChange(e.target.value)}
            className="bg-transparent text-white placeholder-white/40 text-lg focus:outline-none w-full"
            placeholder="e.g. Gym, Dental Clinic, Restaurant"
          />
        </div>

        {/* Location Input */}
        <div className="bg-slate-800 rounded-xl p-4">
          <label htmlFor={`location-${tabId}`} className="text-white/60 text-sm mb-2 block">
            City or Country
          </label>
          <input
            type="text"
            id={`location-${tabId}`}
            value={location}
            onChange={(e) => handleLocationChange(e.target.value)}
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
                onClick={() => selectFormula(formula.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedFormula === formula.id
                    ? 'bg-primary/20 border border-primary'
                    : 'bg-slate-700/50 border border-transparent hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedFormula === formula.id
                        ? 'bg-primary border-primary'
                        : 'border-white/40'
                    }`}
                  >
                    {selectedFormula === formula.id && (
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

        {/* Editable Search Query */}
        {selectedFormula && niche.trim() && location.trim() && (
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FiEdit2 className="text-primary" size={16} />
              <label className="text-white/60 text-sm">Edit Search Query</label>
            </div>
            <textarea
              value={editableQuery}
              onChange={(e) => setEditableQuery(e.target.value)}
              className="w-full bg-slate-700/50 text-white text-sm p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              rows={4}
              placeholder="Your search query will appear here..."
            />
            <p className="text-white/40 text-xs mt-2">
              You can edit the query above before starting the process
            </p>
          </div>
        )}

        {/* Start Process Button */}
        <button
          type="button"
          onClick={handleStartProcess}
          disabled={!isFormValid}
          className={`w-full font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 ${
            isFormValid
              ? 'bg-primary hover:bg-primary/80 text-white'
              : 'bg-slate-700 text-white/40 cursor-not-allowed'
          }`}
        >
          <FiSearch size={20} />
          Start Process
        </button>
      </div>
    </div>
  )
}

export { EmailPromptView }
