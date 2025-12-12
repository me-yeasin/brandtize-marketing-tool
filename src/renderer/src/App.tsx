import { DashboardLayout } from './layouts'
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from './components/ui'

function App(): React.JSX.Element {
  return (
    <DashboardLayout
      sidebar={
        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start">
            Dashboard
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            Projects
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            Settings
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-text-main">Design System</h1>
          <p className="mt-2 text-text-muted">Premium Linear-style components for AR Branding</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Button Variants</CardTitle>
            <CardDescription>Different button styles for various use cases</CardDescription>
          </CardHeader>
          <CardContent className="mt-4">
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">Primary Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Input Fields</CardTitle>
            <CardDescription>Dark-themed inputs with focus glow</CardDescription>
          </CardHeader>
          <CardContent className="mt-4 space-y-4 max-w-md">
            <Input label="Email" placeholder="Enter your email" type="email" />
            <Input label="Password" placeholder="Enter your password" type="password" />
            <Input label="With Error" placeholder="Invalid input" error="This field has an error" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Card Component</CardTitle>
            <CardDescription>Surface containers with subtle borders</CardDescription>
          </CardHeader>
          <CardContent className="mt-4">
            <p className="text-text-muted">
              Cards use the surface background color with a thin border for visual separation.
            </p>
          </CardContent>
          <CardFooter className="gap-2">
            <Button variant="primary">Save Changes</Button>
            <Button variant="outline">Cancel</Button>
          </CardFooter>
        </Card>

        <div className="glass-panel rounded-md p-6">
          <h3 className="text-lg font-semibold text-text-main">Glass Panel Effect</h3>
          <p className="mt-2 text-text-muted">
            This panel uses backdrop blur for a frosted glass effect.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default App
