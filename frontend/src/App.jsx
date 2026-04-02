import { useState } from 'react'
import axios from 'axios'
import './App.css'

// COLOQUE SUA URL AQUI (Não esqueça de tirar a barra / no final, se houver)
// Exemplo: 'https://cautious-space-fiesta-xxx-8000.app.github.dev'
const API_URL = 'https://zany-happiness-v6qrjxw4qr6p3r75-8000.app.github.dev';

function App() {
  const [token, setToken] = useState(null);
  const [users, setUsers] = useState([]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: 'operador@escola.com',
        password: 'senha123'
      });
      setToken(response.data.access_token);
      alert('Login feito com sucesso! Acesso liberado para: ' + response.data.role);
    } catch (error) {
      console.error(error);
      alert('Erro no login. Verifique se colou a URL correta e se a porta 8000 está como Pública.');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` } // Simula o envio do token
      });
      setUsers(response.data);
    } catch (error) {
      console.error(error);
      alert('Não autorizado ou erro na conexão.');
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1>SCAVRE</h1>
      <p>Sistema de Controle de Acesso e Voucher de Refeição Escolar</p>
      
      {!token ? (
        <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3>Acesso do Operador</h3>
            <input 
              type="email" 
              defaultValue="operador@escola.com" 
              style={{ padding: '10px' }}
            />
            <input 
              type="password" 
              defaultValue="senha123" 
              style={{ padding: '10px' }}
            />
            <button type="submit" style={{ padding: '10px', background: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Entrar no Sistema
            </button>
          </form>
        </div>
      ) : (
        <div style={{ background: '#e6f4ea', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
          <h2>✅ Área Protegida</h2>
          <p>Você está autenticado no sistema.</p>
          <button 
            onClick={fetchUsers}
            style={{ padding: '10px', background: '#0f9d58', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '15px' }}
          >
            Testar Rota Protegida (Buscar Usuários)
          </button>
          
          <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', background: 'white', borderRadius: '4px' }}>
            {users.map(u => (
              <li key={u.id} style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                👤 <strong>{u.nome}</strong> (Perfil: {u.role})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;

