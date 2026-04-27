import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Council from './pages/Council'
import Replay from './pages/Replay'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/council/:sessionId" element={<Council />} />
      <Route path="/session/:sessionId" element={<Replay />} />
    </Routes>
  )
}
