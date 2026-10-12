import { useState } from 'react'
import { HealthStatus } from './components/HealthStatus'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <main>
        <h1>Porch</h1>
        <HealthStatus />
      </main>
      </div>
  )
}

export default App
