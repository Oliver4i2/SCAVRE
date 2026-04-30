import { useState, useEffect } from 'react';
import axios from 'axios';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import './App.css';

// --- CONFIGURAÇÕES ---
const API_URL = 'https://zany-happiness-v6qrjxw4qr6p3r75-8000.app.github.dev';
const GOOGLE_CLIENT_ID = "879431588451-320u19m4iff56p1i1r0488a0m82u2mic.apps.googleusercontent.com";

// --- PALETA DE CORES IFB ---
const theme = {
  verdeIF: '#2F9E41',
  vermelhoIF: '#CD191E',
  fundo: '#F2F5F3', // Cinza bem claro, quase branco, para dar contraste com os cards
  branco: '#FFFFFF',
  textoBase: '#333333',
  borda: '#E0E0E0',
  sombra: '0 4px 12px rgba(0,0,0,0.08)'
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || '');
  const [loginPortal, setLoginPortal] = useState(null); 
  
  const [activeTab, setActiveTab] = useState('alunos');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [students, setStudents] = useState([]);
  const [nome, setNome] = useState('');
  const [matricula, setMatricula] = useState('');
  const [curso, setCurso] = useState('');
  const [turma, setTurma] = useState('');
  const [foto, setFoto] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [leituraFisica, setLeituraFisica] = useState('');
  const [resultadoCatraca, setResultadoCatraca] = useState(null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchStudents();
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const fetchStudents = async () => {
  try {
    // Agora ele passa o filtro na URL!
    const res = await axios.get(`${API_URL}/students?search=${searchTerm}`);
    setStudents(res.data);
  } catch (err) { console.error("Erro ao buscar alunos", err); }
};

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      setToken(res.data.access_token);
      setUserRole(res.data.role);
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('userRole', res.data.role);
    } catch (err) {
      alert("E-mail ou senha incorretos!");
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('nome', nome);
    formData.append('matricula', matricula);
    formData.append('curso', curso);
    formData.append('turma', turma);
    if (foto) formData.append('foto', foto);

    try {
      await axios.post(`${API_URL}/students`, formData);
      alert("Aluno cadastrado com sucesso!");
      setNome(''); setMatricula(''); setCurso(''); setTurma(''); setFoto(null);
      fetchStudents();
    } catch (err) {
      alert("Erro ao cadastrar. Verifique suas permissões.");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUserRole('');
    setLoginPortal(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
  };

  const verificarBiometria = async (hexCode) => {
    try {
      const res = await axios.post(`${API_URL}/catraca/verificar`, { hex_code: hexCode });
      
      // O backend agora gerencia o status: liberado, inativo ou ja_almocou
      setResultadoCatraca(res.data); 
      
      setTimeout(() => setResultadoCatraca(null), 4000); 
    } catch (err) {
      setResultadoCatraca({ status: 'negado' }); // Erro 404 cai aqui
      setTimeout(() => setResultadoCatraca(null), 3000);
    }
  };

// O leitor físico digita muito rápido e aperta "Enter"
const handleKeyDownLeitor = (e) => {
  if (e.key === 'Enter') {
    verificarBiometria(leituraFisica);
    setLeituraFisica(''); // Zera o campo invisível
  }
};

  // --- ESTILOS REUTILIZÁVEIS ---
  const inputStyle = { padding: '12px', borderRadius: '6px', border: `1px solid ${theme.borda}`, outline: 'none', width: '100%', boxSizing: 'border-box' };
  const cardStyle = { background: theme.branco, padding: '25px', borderRadius: '12px', boxShadow: theme.sombra, borderTop: `4px solid ${theme.verdeIF}` };
  
  // ==========================================
  // TELA 1: PORTAL DE LOGIN
  // ==========================================
  if (!token) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <div style={{ backgroundColor: theme.fundo, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', color: theme.textoBase }}>
          
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ color: theme.verdeIF, margin: 0, fontSize: '2.5rem' }}>SCAVRE</h1>
            <p style={{ color: '#666', marginTop: '5px' }}>Sistema de Controle de Acesso e Voucher para refeição Escolar </p>
          </div>
          
          {!loginPortal ? (
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {['empresa', 'fiscal', 'gestao'].map(p => (
                <button 
                  key={p} 
                  onClick={() => setLoginPortal(p)} 
                  style={{ padding: '20px 30px', fontSize: '16px', borderRadius: '8px', border: 'none', backgroundColor: theme.branco, color: theme.textoBase, cursor: 'pointer', boxShadow: theme.sombra, fontWeight: 'bold', borderBottom: `4px solid ${theme.verdeIF}`, transition: '0.2s', width: '220px' }}
                >
                  {p === 'empresa' ? '🏢 Operador / Catraca' : p === 'fiscal' ? '👮 Fiscal (Google)' : '⚙️ Gestão / Admin'}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ ...cardStyle, width: '350px' }}>
              <button onClick={() => setLoginPortal(null)} style={{ background: 'transparent', color: '#888', border: 'none', cursor: 'pointer', marginBottom: '20px', padding: 0 }}>⬅️ Voltar aos perfis</button>
              
              {loginPortal === 'fiscal' ? (
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ marginTop: 0 }}>Acesso Institucional</h3>
                  <p style={{ fontSize: '14px', color: '#666' }}>Utilize seu e-mail Google para entrar.</p>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                    <GoogleLogin onSuccess={async (res) => {
                      try {
                        const backRes = await axios.post(`${API_URL}/auth/google`, { token: res.credential });
                        setToken(backRes.data.access_token);
                        setUserRole(backRes.data.role);
                        localStorage.setItem('token', backRes.data.access_token);
                        localStorage.setItem('userRole', backRes.data.role);
                      } catch (err) { alert("Falha na autenticação Google"); }
                    }} />
                  </div>
                </div>
              ) : (
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <h3 style={{ marginTop: 0, color: theme.verdeIF }}>Acesso {loginPortal === 'gestao' ? 'Admin' : 'Operador'}</h3>
                  <input placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
                  <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} required />
                  <button type="submit" style={{ padding: '12px', backgroundColor: theme.verdeIF, color: theme.branco, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>Entrar no Sistema</button>
                </form>
              )}
            </div>
          )}
        </div>
      </GoogleOAuthProvider>
    );
  }

  // ==========================================
  // TELA 2: DASHBOARD (LOGADO)
  // ==========================================
  return (
    <div style={{ backgroundColor: theme.fundo, minHeight: '100vh', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', color: theme.textoBase }}>
      
      {/* CABEÇALHO */}
      <header style={{ backgroundColor: theme.verdeIF, color: theme.branco, padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2 style={{ margin: 0, letterSpacing: '1px' }}>SCAVRE</h2>
          <span style={{ fontSize: '14px', background: 'rgba(255,255,255,0.2)', padding: '5px 12px', borderRadius: '20px' }}>Perfil: {userRole.toUpperCase()}</span>
        </div>
        <button onClick={handleLogout} style={{ backgroundColor: theme.vermelhoIF, color: theme.branco, border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>Sair do Sistema</button>
      </header>

      <div style={{ padding: '30px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* MENU DE NAVEGAÇÃO CONDICIONAL */}
        <nav style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
          <button onClick={() => setActiveTab('alunos')} style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '6px', fontWeight: 'bold', backgroundColor: activeTab === 'alunos' ? theme.verdeIF : '#E0E0E0', color: activeTab === 'alunos' ? theme.branco : theme.textoBase }}>
            🎓 Gestão de Alunos
          </button>
          {userRole === 'admin' && (
            <button onClick={() => setActiveTab('usuarios')} style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '6px', fontWeight: 'bold', backgroundColor: activeTab === 'usuarios' ? theme.verdeIF : '#E0E0E0', color: activeTab === 'usuarios' ? theme.branco : theme.textoBase }}>
              👥 Usuários
            </button>
          )}
          {(userRole === 'admin' || userRole === 'fiscal') && (
            <button onClick={() => setActiveTab('relatorios')} style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '6px', fontWeight: 'bold', backgroundColor: activeTab === 'relatorios' ? theme.verdeIF : '#E0E0E0', color: activeTab === 'relatorios' ? theme.branco : theme.textoBase }}>
              📊 Relatórios da Catraca
            </button>
          )}
        </nav>

{/* ========================================== */}
        {/* MODO QUIOSQUE: TELA EXCLUSIVA DO OPERADOR  */}
        {/* ========================================== */}
        {userRole === 'operador' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
            
            {/* CAMPO OCULTO: É aqui que o leitor USB "digita" */}
            <input 
              autoFocus
              type="text" 
              value={leituraFisica}
              onChange={(e) => setLeituraFisica(e.target.value)}
              onKeyDown={handleKeyDownLeitor}
              onBlur={(e) => e.target.focus()} // Truque de mestre: Força o cursor a nunca sair daqui!
              style={{ opacity: 0, position: 'absolute', zIndex: -1 }} // Fica invisível
            />

            <div style={{ ...cardStyle, width: '600px', textAlign: 'center', padding: '40px' }}>
              <h2 style={{ color: theme.verdeIF, margin: '0 0 20px 0' }}>SCAVRE - Terminal da Catraca</h2>
              <p style={{ color: '#666', marginBottom: '30px' }}>O sistema está aguardando a leitura biométrica...</p>
              
              {/* TELA DE RESULTADO (Aparece a foto gigante do aluno) */}
              <div style={{ height: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRadius: '15px', backgroundColor: resultadoCatraca?.status === 'liberado' ? '#e8f5e9' : resultadoCatraca?.status === 'negado' ? '#ffebee' : '#f5f5f5', border: `4px solid ${resultadoCatraca?.status === 'liberado' ? theme.verdeIF : resultadoCatraca?.status === 'negado' ? theme.vermelhoIF : theme.borda}` }}>
                
                {!resultadoCatraca && (
                  <span style={{ fontSize: '60px', animation: 'pulse 2s infinite' }}>☝️</span>
                )}

                {resultadoCatraca?.status === 'liberado' && (
                  <>
                    <img src={`${API_URL}${resultadoCatraca.aluno.foto_url}`} alt="Aluno" style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: `4px solid ${theme.verdeIF}`, marginBottom: '15px' }} />
                    <h2 style={{ color: theme.verdeIF, margin: '0' }}>ACESSO LIBERADO</h2>
                    <h3 style={{ margin: '5px 0' }}>{resultadoCatraca.aluno.nome}</h3>
                    <p style={{ margin: '0', color: '#666' }}>Matrícula: {resultadoCatraca.aluno.matricula}</p>
                  </>
                )}

                {resultadoCatraca?.status === 'negado' && (
                  <>
                    <span style={{ fontSize: '80px', marginBottom: '10px' }}>❌</span>
                    <h2 style={{ color: theme.vermelhoIF, margin: '0' }}>ACESSO NEGADO</h2>
                    <p style={{ color: '#666' }}>Biometria não cadastrada.</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STATUS: JÁ ALMOÇOU */}
                {resultadoCatraca?.status === 'ja_almocou' && (
                  <>
                    <span style={{ fontSize: '80px', marginBottom: '10px' }}>🍽️</span>
                    <h2 style={{ color: '#F57C00', margin: '0' }}>REFEIÇÃO JÁ REALIZADA</h2>
                    <p style={{ color: '#666', marginBottom: '10px' }}>Este aluno já consumiu o almoço hoje.</p>
                    <h3 style={{ margin: '0' }}>{resultadoCatraca.aluno.nome}</h3>
                  </>
                )}

                {/* STATUS: INATIVO/BLOQUEADO */}
                {resultadoCatraca?.status === 'inativo' && (
                  <>
                    <span style={{ fontSize: '80px', marginBottom: '10px' }}>⚠️</span>
                    <h2 style={{ color: '#F57C00', margin: '0' }}>ACESSO BLOQUEADO</h2>
                    <p style={{ color: '#666', marginBottom: '10px' }}>Matrícula Inativa no Sistema.</p>
                    <h3 style={{ margin: '0' }}>{resultadoCatraca.aluno.nome}</h3>
                  </>
                )}

        {/* CONTEÚDO DAS ABAS */}
        {activeTab === 'alunos' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
            
            {/* ÁREA DE CADASTRO */}
            <section style={cardStyle}>
              <h3 style={{ color: theme.verdeIF, marginTop: 0, borderBottom: `2px solid ${theme.borda}`, paddingBottom: '10px' }}>Cadastrar Estudante</h3>
              <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
                <input placeholder="Nome Completo" value={nome} onChange={e => setNome(e.target.value)} required style={inputStyle}/>
                <input placeholder="Matrícula" value={matricula} onChange={e => setMatricula(e.target.value)} required style={inputStyle}/>
                <input placeholder="Curso (ex: Informática)" value={curso} onChange={e => setCurso(e.target.value)} required style={inputStyle}/>
                <input placeholder="Turma (ex: 3º Ano)" value={turma} onChange={e => setTurma(e.target.value)} required style={inputStyle}/>
                
                <div style={{ marginTop: '5px' }}>
                  <label style={{ fontSize: '13px', color: '#666', fontWeight: 'bold' }}>Foto do Aluno:</label>
                  <input type="file" onChange={e => setFoto(e.target.files[0])} required style={{ ...inputStyle, padding: '8px', marginTop: '5px' }} />
                </div>

                <button type="submit" style={{ backgroundColor: theme.verdeIF, color: theme.branco, padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', fontSize: '15px' }}>
                  Salvar Registro
                </button>
              </form>
            </section>

            {/* LISTA DE ESTUDANTES */}
            <section style={{ ...cardStyle, borderTopColor: '#007bff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${theme.borda}`, paddingBottom: '10px', marginBottom: '15px' }}>
                 <h3 style={{ margin: 0, color: '#007bff' }}>Alunos Matriculados</h3>
                 <button onClick={fetchStudents} style={{ padding: '6px 12px', cursor: 'pointer', backgroundColor: '#f0f0f0', border: `1px solid ${theme.borda}`, borderRadius: '4px' }}>🔄 Atualizar Lista</button>
              </div>

              <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <input 
                  placeholder="Buscar por nome ou matrícula..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />

  <button onClick={fetchStudents} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
    🔍 Buscar
  </button>
</div>
              

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                {students.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', border: `1px solid ${theme.borda}`, borderRadius: '8px', backgroundColor: '#FAFAFA' }}>
                    <img src={`${API_URL}${s.foto_url}`} alt="foto" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${theme.verdeIF}` }} />
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '15px', color: theme.textoBase }}>{s.nome}</div>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '3px' }}>{s.curso} - {s.turma}</div>
                      <div style={{ fontSize: '12px', color: theme.verdeIF, fontWeight: 'bold', marginTop: '3px' }}>Mat: {s.matricula}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'usuarios' && (
          <div style={cardStyle}>
            <h3 style={{ color: theme.verdeIF }}>Gestão de Usuários e Fiscais</h3>
            <p>Módulo de administração do sistema (Em desenvolvimento).</p>
          </div>
        )}

        {activeTab === 'relatorios' && (
          <div style={cardStyle}>
            <h3 style={{ color: theme.verdeIF }}>Relatórios da Catraca Eletrônica</h3>
            <p>Dashboard de acesso e consumo de refeições (Em desenvolvimento).</p>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;