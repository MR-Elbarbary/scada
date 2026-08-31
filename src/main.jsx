import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@siemens/ix/dist/siemens-ix/siemens-ix.css'
import '@siemens/ix/dist/siemens-ix/theme/classic-dark.css'
import { defineCustomElements } from '@siemens/ix/loader'
import './index.css'
import WaterTreatmentScada from './WaterTreatmentScada.jsx'
import PumpNode from './PumpNode.jsx'
import App from './App.jsx'


defineCustomElements()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
