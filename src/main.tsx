import React from 'react'
import ReactDOM from 'react-dom/client'
import { Helmet } from 'react-helmet'
import './style.css'

import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'

import "../node_modules/bootstrap-icons/font/bootstrap-icons.css"

const App = React.lazy(() => import('./App'))
export const isBlink = navigator.userAgent.includes("Chrome")
const baseName = import.meta.env.BASE_URL;
const browserSpecificFullScreenClass = isBlink ? 'h-screen' : 'fullbody';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <>
    <Helmet>
      <title>CG1 Practical Course</title>
    </Helmet>
    <div className={'overflow-hidden ' + browserSpecificFullScreenClass}>
      {/** gitlab pages specific routing */}
      <Router basename={baseName == "/" ? "/" : ("/" + baseName.split("/").slice(3).join("/"))}> 
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/*" element={<h1>404</h1>} />
        </Routes>
      </Router>
    </div>
  </>,
)
