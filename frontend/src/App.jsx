import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

// COLOQUE SUA URL AQUI (A da porta 8000)
const API_URL = 'https://zany-happiness-v6qrjxw4qr6p3r75-8000.app.github.dev';

function App() {
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('estudantes'); // Aba inicial após login

  // Estados de Usuários
  const [users, setUsers] = useState([]);

  // Estados de Estudantes
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  
  // Estado do formulário de novo estudante
  const [studentForm, setStudentForm] = useState({
    nome: '', matricula: '', curso: '', turma: '', foto: null
  });

  // --- FUNÇÕES DE AUTENTICAÇÃO E USUÁRIOS ---
  const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    const { access_token } = response.data;
    setToken(access_token);
    // Salva no cabeçalho padrão de todas as requisições futuras do Axios
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    alert('Logado com segurança!');
  } catch (error) {
    alert('Erro no login!');
  }
};

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  // --- FUNÇÕES DE ESTUDANTES ---
  const fetchStudents = async () => {
    try {
      // Passando a busca como parâmetro na URL (Query String)
      const response = await axios.get(`${API_URL}/students?search=${search}`);
      setStudents(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  // Carrega os dados sempre que a aba muda ou a busca muda
  useEffect(() => {
    if (token) {
      if (activeTab === 'usuarios') fetchUsers();
      if (activeTab === 'estudantes') fetchStudents();
    }
  }, [activeTab, search, token]);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    
    // MÁGICA DO UPLOAD: Criando o FormData (Necessário para arquivos)
    const formData = new FormData();
    formData.append('nome', studentForm.nome);
    formData.append('matricula', studentForm.matricula);
    formData.append('curso', studentForm.curso);
    formData.append('turma', studentForm.turma);
    formData.append('foto', studentForm.foto); // Anexando o arquivo

    try {
      await axios.post(`${API_URL}/students`, formData);
      alert('Estudante cadastrado com sucesso!');
      fetchStudents(); // Atualiza a lista
      setStudentForm({ nome: '', matricula: '', curso: '', turma: '', foto: null }); // Limpa form
    } catch (error) {
      alert(error.response?.data?.detail || 'Erro ao cadastrar estudante');
    }
  };

  // --- RENDERIZAÇÃO DA TELA ---
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>SCAVRE</h1>
      
      {!token ? (
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px', margin: '0 auto' }}>
          <h3>Acesso Restrito</h3>
          <button type="submit" style={{ padding: '10px', background: '#0056b3', color: 'white', border: 'none' }}>
            Entrar como Operador
          </button>
        </form>
      ) : (
        <div>
          {/* MENU DE ABAS */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button onClick={() => setActiveTab('estudantes')} style={{ padding: '10px', background: activeTab === 'estudantes' ? '#0f9d58' : '#ddd' }}>🎓 Estudantes</button>
            <button onClick={() => setActiveTab('usuarios')} style={{ padding: '10px', background: activeTab === 'usuarios' ? '#0f9d58' : '#ddd' }}>👥 Usuários</button>
          </div>

          {/* ABA ESTUDANTES */}
          {activeTab === 'estudantes' && (
            <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
              <h2>Gestão de Estudantes</h2>
              
              {/* Formulário de Cadastro */}
              <form onSubmit={handleCreateStudent} style={{ display: 'grid', gap: '10px', gridTemplateColumns: '1fr 1fr', background: 'white', padding: '15px', border: '1px solid #ddd' }}>
                <input required placeholder="Nome Completo" value={studentForm.nome} onChange={e => setStudentForm({...studentForm, nome: e.target.value})} />
                <input required placeholder="Matrícula" value={studentForm.matricula} onChange={e => setStudentForm({...studentForm, matricula: e.target.value})} />
                <select required value={studentForm.curso} onChange={e => setStudentForm({...studentForm, curso: e.target.value})}>
                  <option value="">Selecione o Curso</option>
                  <option value="Ciência da Computação">Ciência da Computação</option>
                  <option value="Engenharia de Software">Engenharia de Software</option>
                </select>
                <input required placeholder="Turma (Ex: 1A)" value={studentForm.turma} onChange={e => setStudentForm({...studentForm, turma: e.target.value})} />
                
                {/* Input de Arquivo */}
                <input required type="file" accept="image/*" onChange={e => setStudentForm({...studentForm, foto: e.target.files[0]})} style={{ gridColumn: 'span 2' }} />
                
                <button type="submit" style={{ gridColumn: 'span 2', padding: '10px', background: '#0056b3', color: 'white' }}>Cadastrar Estudante</button>
              </form>

              <hr style={{ margin: '20px 0' }}/>

              {/* Lista e Busca */}
              <input 
                placeholder="🔍 Buscar por nome ou matrícula..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '10px', marginBottom: '15px' }}
              />

              <div style={{ display: 'grid', gap: '10px' }}>
                {students.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'white', padding: '10px', border: '1px solid #ddd' }}>
                    {/* Renderiza a foto buscando da pasta static do backend */}
                    <img src={`${API_URL}${s.foto_url}`} alt="Foto" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', background: '#eee' }} />
                    <div>
                      <strong>{s.nome}</strong> - Matrícula: {s.matricula} <br/>
                      <small>{s.curso} (Turma {s.turma})</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA USUÁRIOS */}
          {activeTab === 'usuarios' && (
            <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
              <h2>Operadores e Gestores</h2>
              <ul>
                {users.map(u => <li key={u.id}>{u.nome} ({u.role})</li>)}
              </ul>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default App;

