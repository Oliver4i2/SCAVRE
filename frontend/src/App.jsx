import { useState, useEffect } from 'react';
import axios from 'axios';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import './App.css';

// ⚠️ CONFIRA SE ESTA URL É A DA SUA PORTA 8000 ATUAL
const API_URL = 'https://zany-happiness-v6qrjxw4qr6p3r75-8000.app.github.dev';
const GOOGLE_CLIENT_ID = "879431588451-320u19m4iff56p1i1r0488a0m82u2mic.apps.googleusercontent.com";

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [students, setStudents] = useState([]);
  
  // Estados do Cadastro de Alunos
  const [nome, setNome] = useState('');
  const [matricula, setMatricula] = useState('');
  const [curso, setCurso] = useState('');
  const [turma, setTurma] = useState('');
  const [foto, setFoto] = useState(null);

  // Sincroniza o Token com o Axios
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchStudents();
    }
  }, [token]);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_URL}/students`);
      setStudents(res.data);
    } catch (err) { console.error("Erro ao buscar alunos", err); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      const newToken = res.data.access_token;
      setToken(newToken);
      localStorage.setItem('token', newToken);
    } catch (err) { alert("E-mail ou senha incorretos!"); }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('nome', nome);
    formData.append('matricula', matricula);
    formData.append('curso', curso);
    formData.append('turma', turma);
    formData.append('foto', foto);

    try {
      await axios.post(`${API_URL}/students`, formData);
      alert("Aluno cadastrado com sucesso! 🎉");
      // Limpa os campos após o sucesso
      setNome(''); setMatricula(''); setCurso(''); setTurma(''); setFoto(null);
      fetchStudents();
    } catch (err) {
      alert("Erro ao cadastrar. Verifique se você é Admin ou se a foto foi enviada.");
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  // --- TELA DE LOGIN ---
  if (!token) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <div style={{ padding: '50px', textAlign: 'center', backgroundColor: '#1a1a1a', color: 'white', minHeight: '100vh' }}>
          <h1>SCAVRE - Acesso</h1>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
            <GoogleLogin 
              onSuccess={async (res) => {
                const backRes = await axios.post(`${API_URL}/auth/google`, { token: res.credential });
                const t = backRes.data.access_token;
                setToken(t);
                localStorage.setItem('token', t);
              }}
            />
          </div>
          <div style={{ border: '1px solid #333', padding: '20px', borderRadius: '10px', display: 'inline-block', backgroundColor: '#2a2a2a' }}>
            <h3>Login de Operador</h3>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '300px' }}>
              <input placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '10px' }} />
              <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '10px' }} />
              <button type="submit" style={{ padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>Entrar</button>
            </form>
          </div>
        </div>
      </GoogleOAuthProvider>
    );
  }

  // --- DASHBOARD PRINCIPAL ---
  return (
    <div style={{ padding: '20px', backgroundColor: '#f4f4f4', minHeight: '100vh', color: '#333' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#333', color: 'white', padding: '10px 30px', borderRadius: '10px' }}>
        <h2>SCAVRE Dashboard</h2>
        <button onClick={handleLogout} style={{ background: '#ff4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>Sair</button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', marginTop: '30px' }}>
        
        {/* ÁREA DE CADASTRO */}
        <section style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#007bff', marginTop: 0 }}>🆕 Novo Estudante</h3>
          <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} required />
            <input placeholder="Matrícula" value={matricula} onChange={e => setMatricula(e.target.value)} required />
            <input placeholder="Curso" value={curso} onChange={e => setCurso(e.target.value)} required />
            <input placeholder="Turma" value={turma} onChange={e => setTurma(e.target.value)} required />
            <label style={{ fontSize: '12px' }}>Foto do Aluno:</label>
            <input type="file" onChange={e => setFoto(e.target.files[0])} required />
            <button type="submit" style={{ background: '#28a745', color: 'white', padding: '12px', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>SALVAR ESTUDANTE</button>
          </form>
        </section>

        {/* LISTA DE ESTUDANTES */}
        <section style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h3 style={{ marginTop: 0 }}>🎓 Alunos no Sistema</h3>
             <button onClick={fetchStudents} style={{ fontSize: '12px' }}>🔄 Atualizar</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            {students.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '8px' }}>
                <img src={`${API_URL}${s.foto_url}`} alt="foto" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', background: '#eee' }} />
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{s.nome}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{s.matricula} | {s.curso}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

export default App;