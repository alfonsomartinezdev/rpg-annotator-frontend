import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import DocumentList from './components/DocumentList'
import DocumentViewer from './components/DocumentViewer'

function App() {

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<DocumentList />} />
          <Route path="/document/:documentId" element={<DocumentViewer />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
