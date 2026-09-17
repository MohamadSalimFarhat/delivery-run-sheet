import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Deliveries from './pages/Deliveries'
import DeliveryDetail from './pages/DeliveryDetail'
import Login from './pages/Login'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Pages that sit inside the header/nav shell. */}
      <Route element={<Layout />}>
        <Route path="/deliveries" element={<Deliveries />} />
        <Route path="/deliveries/:id" element={<DeliveryDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Anything else, including "/", goes to the run sheet. */}
      <Route path="*" element={<Navigate to="/deliveries" replace />} />
    </Routes>
  )
}
