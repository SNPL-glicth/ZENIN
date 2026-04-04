import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth';
import { Layout } from './components/layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Consultar from './pages/Consultar';
import Uploads from './pages/Uploads';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Query from './pages/Query';
import Documents from './pages/Documents';
import Predictions from './pages/Predictions';
import Anomalies from './pages/Anomalies';
import Explainability from './pages/Explainability';


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/consultar"
            element={
              <ProtectedRoute>
                <Layout>
                  <Consultar />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/uploads"
            element={
              <ProtectedRoute>
                <Layout>
                  <Uploads />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/query"
            element={
              <ProtectedRoute>
                <Layout>
                  <Query />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <Layout>
                  <Documents />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/predictions"
            element={
              <ProtectedRoute>
                <Layout>
                  <Predictions />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/anomalies"
            element={
              <ProtectedRoute>
                <Layout>
                  <Anomalies />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/explainability"
            element={
              <ProtectedRoute>
                <Layout>
                  <Explainability />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
