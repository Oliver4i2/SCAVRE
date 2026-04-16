import { useState, useEffect } from 'react';
import axios from 'axios';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import './App.css';

// TROQUE PELA SUA URL DO CODESPACES (Porta 8000)
const API_URL = 'https://zany-happiness-v6qrjxw4qr6p3r75-8000.app.github.dev';
const GOOGLE_CLIENT_ID = "879431588451-320u19m4iff56p1i1r0488a0m82u2mic.apps.googleusercontent.com";

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [students, setStudents] = useState([]);

  // Configura o Axios
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  const handleManualLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return alert("Preencha e-mail e senha!");
    
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      const newToken = res.data.access_token;
      setToken(newToken);
      localStorage.setItem('token', newToken);
      alert("Login realizado!");
    } catch (err) {
      console.error(err);
      alert("Erro no login! Verifique o console ou a URL da API.");
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  // Tela de Login
  if (!token) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <div style={{ padding: '50px', textAlign: 'center', backgroundColor: '#222', color: 'white', minHeight: '100vh' }}>
          <h1>SCAVRE - Acesso</h1>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
            <GoogleLogin 
              onSuccess={async (res) => {
                const backRes = await axios.post(`${API_URL}/auth/google`, { token: res.credential });
                setToken(backRes.data.access_token);
                localStorage.setItem('token', backRes.data.access_token);
              }}
            />
          </div>

          <div style={{ border: '1px solid #444', padding: '20px', borderRadius: '10px', display: 'inline-block' }}>
            <h3>Login Operador</h3>
            <form onSubmit={handleManualLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '300px' }}>
              <input 
                type="email" 
                placeholder="Seu e-mail" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ padding: '10px', borderRadius: '5px', border: 'none' }}
              />
              <input 
                type="password" 
                placeholder="Sua senha" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: '10px', borderRadius: '5px', border: 'none' }}
              />
              <button type="submit" style={{ padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                Entrar como Operador
              </button>
            </form>
          </div>
          <p style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}>Conectando em: {API_URL}</p>
        </div>
      </GoogleOAuthProvider>
    );
  }

  // Tela do Dashboard (Simplificada para teste)
  return (
    <div style={{ padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>SCAVRE Dashboard</h2>
        <button onClick={handleLogout}>Sair</button>
      </header>
      <p>Você está logado! 🎉</p>
      <button onClick={async () => {
        const res = await axios.get(`${API_URL}/students`);
        setStudents(res.data);
      }}>Listar Alunos</button>
      
      <ul>
        {students.map(s => <li key={s.id}>{s.nome} - {s.matricula}</li>)}
      </ul>
    </div>
  );
}

export default App;