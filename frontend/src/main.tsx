import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing app root')

if (document.documentElement.hasAttribute('data-compatible')) {
  createRoot(root).render(<StrictMode><App /></StrictMode>)
  document.getElementById('compatibility')?.remove()
}
