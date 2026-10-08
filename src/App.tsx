/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { View } from './pages/View';
import { Admin } from './pages/Admin';

export default function App() {
  return (
    <AppProvider>
      <Router>
        <div className="min-h-screen bg-brand-bg text-gray-200">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/view/:id" element={<View />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AppProvider>
  );
}

