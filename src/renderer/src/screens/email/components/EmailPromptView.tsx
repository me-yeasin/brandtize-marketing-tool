import { useState } from 'react'
import { FiSearch, FiGlobe, FiMail, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { LeadGenerationView } from './LeadGenerationView'

interface EmailPromptViewProps {
  activeTabId: string
}

const SEARCH_FORMULAS = [
  {
    id: 'direct_emails',
    label: 'Direct Emails',
    icon: FiMail,
    formula:
      '"send your resume to" OR "email us at" OR "reply to" AND [Industry] AND [City] -site:indeed.com -site:linkedin.com -site:craigslist.org'
  },
  {
    id: 'outdated_websites',
    label: 'Outdated Sites',
    icon: FiGlobe,
    formula:
      '"copyright" AND [Industry] AND [City] -site:yelp.com -site:yellowpages.com -site:facebook.com -site:tripadvisor.com -site:linkedin.com'
  }
]

function EmailPromptView({ activeTabId }: EmailPromptViewProps): React.JSX.Element {
  const [niche, setNiche] = useState('')
  const [location, setLocation] = useState('')
  const [selectedFormula, setSelectedFormula] = useState<string>('direct_emails')
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editableQuery, setEditableQuery] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const updateQuery = (formulaId: string, nicheVal: string, locVal: string) => {
    if (formulaId && nicheVal.trim() && locVal.trim()) {
      const formula = SEARCH_FORMULAS.find((f) => f.id === formulaId)
      if (formula) {
        const query = formula.formula
          .replace('[Industry]', nicheVal.trim())
          .replace('[City]', locVal.trim())
        setEditableQuery(query)
      }
    } else {
      setEditableQuery('')
    }
  }

  const selectFormula = (id: string): void => {
    setSelectedFormula(id)
    updateQuery(id, niche, location)
  }

  const handleNicheChange = (value: string): void => {
    setNiche(value)
    updateQuery(selectedFormula, value, location)
  }

  const handleLocationChange = (value: string): void => {
    setLocation(value)
    updateQuery(selectedFormula, niche, value)
  }

  const isFormValid = niche.trim() && location.trim() && selectedFormula

  const handleStartProcess = (): void => {
    if (!isFormValid || !editableQuery.trim()) return
    setSearchQuery(editableQuery.trim())
    setIsProcessing(true)
  }

  if (isProcessing && searchQuery) {
    return (
      <LeadGenerationView
        searchQuery={searchQuery}
        niche={niche.trim()}
        location={location.trim()}
      />
    )
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-6 overflow-y-auto bg-gradient-to-b from-background to-background/50">
      <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Header Section */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-light text-white mb-3 tracking-tight">
            Find Your Next <span className="font-medium text-primary">Leads</span>
          </h1>
          <p className="text-white/40 text-sm md:text-base font-light">
            Enter your target market details to generate highly qualified leads.
          </p>
        </div>

        {/* Main Glass Card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col gap-6">

            {/* Input Group */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="group relative">
                <label
                  htmlFor={`niche-${activeTabId}`}
                  className="absolute -top-2.5 left-3 bg-slate-900 px-2 text-xs font-medium text-primary transition-colors group-focus-within:text-primary"
                >
                  Target Niche
                </label>
                <input
                  type="text"
                  id={`niche-${activeTabId}`}
                  value={niche}
                  onChange={(e) => handleNicheChange(e.target.value)}
                  className="w-full bg-transparent border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-white/20"
                  placeholder="e.g. Real Estate Agents"
                />
              </div>

              <div className="group relative">
                <label
                  htmlFor={`location-${activeTabId}`}
                  className="absolute -top-2.5 left-3 bg-slate-900 px-2 text-xs font-medium text-primary transition-colors group-focus-within:text-primary"
                >
                  Location
                </label>
                <input
                  type="text"
                  id={`location-${activeTabId}`}
                  value={location}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  className="w-full bg-transparent border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-white/20"
                  placeholder="e.g. New York, NY"
                />
              </div>
            </div>

            {/* Strategy Selector (Segmented Control) */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider ml-1">Search Strategy</label>
              <div className="flex p-1 bg-black/20 rounded-xl border border-white/5">
                {SEARCH_FORMULAS.map((formula) => {
                  const Icon = formula.icon
                  const isSelected = selectedFormula === formula.id
                  return (
                    <button
                      key={formula.id}
                      onClick={() => selectFormula(formula.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isSelected
                          ? 'bg-primary/20 text-white shadow-sm border border-primary/20'
                          : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                      }`}
                    >
                      <Icon size={16} className={isSelected ? 'text-primary' : ''} />
                      {formula.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Advanced / Query Preview */}
            <div className="border-t border-white/5 pt-4">
               <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors mb-3"
               >
                 {showAdvanced ? <FiChevronUp /> : <FiChevronDown />}
                 {showAdvanced ? 'Hide Search Query' : 'Edit Search Query (Advanced)'}
               </button>

               {showAdvanced && (
                 <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <textarea
                      value={editableQuery}
                      onChange={(e) => setEditableQuery(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-white/70 font-mono focus:outline-none focus:border-white/20 resize-none"
                      rows={3}
                      placeholder="Enter target details to generate query..."
                    />
                 </div>
               )}
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={handleStartProcess}
              disabled={!isFormValid}
              className={`group relative w-full py-4 rounded-xl font-medium text-lg shadow-lg overflow-hidden transition-all duration-300 ${
                isFormValid
                  ? 'text-white shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.01]'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              {isFormValid && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-primary to-purple-600 opacity-90 group-hover:opacity-100 transition-opacity" />
              )}
              <div className="relative flex items-center justify-center gap-2">
                <FiSearch className={isFormValid ? "animate-pulse" : ""} />
                <span>Start Lead Generation</span>
              </div>
            </button>

          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center">
            <p className="text-white/20 text-xs">
              Powered by Google Search Operators • Optimized for Direct Clients
            </p>
        </div>

      </div>
    </div>
  )
}

export { EmailPromptView }
