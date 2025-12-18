import { Toaster } from 'sonner'
import { HomeScreen } from './screens/HomeScreen'

function App(): React.JSX.Element {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155'
          }
        }}
      />
      <HomeScreen />
    </>
  )
}

export default App
