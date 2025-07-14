import PrOverviewList from './components/PrOverviewList'
import './App.css'

function App() {
  return (
    <div style={{ padding: '10px', textAlign: 'left' }}>
      <h1 style={{ fontSize: '24px', margin: '0 0 20px 0', fontWeight: '600' }}>GitHub PR Review Dashboard</h1>
      <PrOverviewList />
    </div>
  )
}

export default App
