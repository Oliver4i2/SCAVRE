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
  fundo: '#F2F5F3', 
  branco: '#FFFFFF', 
  textoBase: '#333333', 
  borda: '#E0E0E0', 
  sombra: '0 4px 12px rgba(0,0,0,0.08)' 
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || '');
  const [loginPortal, setLoginPortal] = useState(null); 
  
  const [activeTab, setActiveTab] = useState(() => {
    const role = localStorage.getItem('userRole');
    if (role === 'fiscal') return 'relatorios';
    if (role === 'admin') return 'usuarios';
    if (role === 'gestor') return 'estatisticas';
    return 'alunos';
  });
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // ESTADOS ESTUDANTES E CATRACA
  const [students, setStudents] = useState([]);
  const [nome, setNome] = useState(''); 
  const [matricula, setMatricula] = useState(''); 
  const [curso, setCurso] = useState(''); 
  const [turma, setTurma] = useState(''); 
  const [foto, setFoto] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [leituraFisica, setLeituraFisica] = useState('');
  const [resultadoCatraca, setResultadoCatraca] = useState(null);
  const [matriculaManual, setMatriculaManual] = useState('');
  const [textoOcorrencia, setTextoOcorrencia] = useState('');
  const [gravandoOcorrencia, setGravandoOcorrencia] = useState(false);
  const [totalRefeicoes, setTotalRefeicoes] = useState(0);

  // ESTADOS DO DASHBOARD DA EMPRESA E GESTÃO
  const [dashData, setDashData] = useState(null);

  // ESTADOS DA ABA DE USUÁRIOS (ADMIN)
  const [usersList, setUsersList] = useState([]);
  const [uNome, setUNome] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uRole, setURole] = useState('fiscal');

  // CONEXÃO WEBSOCKET PARA OPERADOR E EMPRESA
  useEffect(() => {
    let ws;
    if (token && (userRole === 'empresa' || userRole === 'operador')) {
      const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws/refeicoes';
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          if (event.data) setTotalRefeicoes(event.data);
        };
        ws.onerror = (err) => console.warn("WebSocket aguardando conexão...");
      } catch (err) {
        console.error("Erro na inicialização do WebSocket", err);
      }
    }
    return () => { if (ws) ws.close(); };
  }, [token, userRole]);

  // BUSCA DADOS DE FATURAMENTO PARA A EMPRESA
  useEffect(() => {
    if (token && userRole === 'empresa') {
      axios.get(`${API_URL}/stats/dashboard`)
        .then(res => setDashData(res.data))
        .catch(err => console.error("Erro ao carregar dashboard", err));
    }
  }, [token, userRole, totalRefeicoes]);

  useEffect(() => {
    if (token && ['admin', 'fiscal', 'gestor'].includes(userRole)) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      if (['admin', 'gestor'].includes(userRole)) fetchStudents(); 
      if (userRole === 'admin') fetchUsers();
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token, userRole]);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${API_URL}/students?search=${searchTerm}`);
      setStudents(res.data || []);
    } catch (err) { console.error("Erro ao buscar estudantes", err); }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/users`);
      setUsersList(res.data || []);
    } catch (err) { console.error("Erro ao buscar usuários", err); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      if (res.data?.access_token) {
        setToken(res.data.access_token);
        const selectedRole = loginPortal; 
        setUserRole(selectedRole); 
        
        let targetTab = 'alunos';
        if (selectedRole === 'fiscal') targetTab = 'relatorios';
        if (selectedRole === 'admin') targetTab = 'usuarios';
        if (selectedRole === 'gestor') targetTab = 'estatisticas';
        setActiveTab(targetTab); 
        
        localStorage.setItem('token', res.data.access_token);
        localStorage.setItem('userRole', selectedRole);
      }
    } catch (err) { alert("E-mail ou senha incorretos!"); }
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
    } catch (err) { alert("Erro ao cadastrar. Verifique o tamanho do arquivo ou permissões."); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      // Cria um usuário. Se for conta google, o backend vincula quando ele logar.
      await axios.post(`${API_URL}/users`, { nome: uNome, email: uEmail, password: '123', role: uRole });
      alert("Usuário e permissões criadas com sucesso!");
      setUNome(''); setUEmail(''); setURole('fiscal');
      fetchUsers();
    } catch (err) { alert("Erro ao cadastrar permissão de usuário."); }
  };

  const handleLogout = () => { 
    setToken(null); 
    setUserRole(''); 
    setLoginPortal(null); 
    setDashData(null);
    localStorage.removeItem('token'); 
    localStorage.removeItem('userRole'); 
  };

  const verificarBiometria = async (hexCode) => {
    try {
      const res = await axios.post(`${API_URL}/catraca/verificar`, { hex_code: hexCode });
      setResultadoCatraca(res.data || { status: 'negado' }); setTimeout(() => setResultadoCatraca(null), 4000); 
    } catch (err) { setResultadoCatraca({ status: 'negado' }); setTimeout(() => setResultadoCatraca(null), 3000); }
  };

  const handleKeyDownLeitor = (e) => { if (e.key === 'Enter') { verificarBiometria(leituraFisica); setLeituraFisica(''); } };

  const handleLiberarManual = async (e) => {
    e.preventDefault();
    if (!matriculaManual.trim()) return;
    try {
      const res = await axios.post(`${API_URL}/catraca/verificar`, { matricula: matriculaManual });
      setResultadoCatraca(res.data || { status: 'negado' }); setMatriculaManual(''); setTimeout(() => setResultadoCatraca(null), 5000); 
    } catch (err) { setResultadoCatraca({ status: 'negado' }); setTimeout(() => setResultadoCatraca(null), 3000); } finally { document.getElementById('leitorInvisivel')?.focus(); }
  };

  const handleSalvarOcorrencia = async (e) => {
    e.preventDefault();
    if (!textoOcorrencia.trim() || !resultadoCatraca?.aluno?.id) return;
    setGravandoOcorrencia(true);
    try {
      await axios.post(`${API_URL}/students/${resultadoCatraca.aluno.id}/ocorrencias`, { descricao: textoOcorrencia });
      alert("Ocorrência registrada!"); setTextoOcorrencia('');
    } catch (err) { alert("Erro ao conectar com o servidor."); } finally { setGravandoOcorrencia(false); document.getElementById('leitorInvisivel')?.focus(); }
  };

  const inputStyle = { padding: '12px', borderRadius: '6px', border: `1px solid ${theme.borda}`, outline: 'none', width: '100%', boxSizing: 'border-box' };
  const cardStyle = { background: theme.branco, padding: '25px', borderRadius: '12px', boxShadow: theme.sombra, borderTop: `4px solid ${theme.verdeIF}` };
  
  // ==========================================
  // TELA 1: PORTAL DE LOGIN
  // ==========================================
  if (!token) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <div style={{ backgroundColor: theme.fundo, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ color: theme.verdeIF, margin: 0, fontSize: '2.5rem' }}>SCAVRE</h1>
            <p style={{ color: '#666', marginTop: '5px' }}>Sistema de Controle de Acesso e Voucher Escolar</p>
          </div>
          
          {!loginPortal ? (
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '800px' }}>
              {[
                { id: 'operador', icone: '📟', texto: 'Operador / Catraca', cor: theme.verdeIF },
                { id: 'empresa', icone: '🏢', texto: 'Empresa (Cantina)', cor: '#F57C00' },
                { id: 'fiscal', icone: '👮', texto: 'Fiscal (Google)', cor: '#1976D2' },
                { id: 'gestor', icone: '🧑‍🏫', texto: 'Gestor / Coord.', cor: '#9C27B0' },
                { id: 'admin', icone: '⚙️', texto: 'Administrador TI', cor: '#333333' }
              ].map(p => (
                <button 
                  key={p.id} 
                  onClick={() => setLoginPortal(p.id)} 
                  style={{ width: '220px', padding: '20px 30px', fontSize: '16px', borderRadius: '8px', border: 'none', backgroundColor: theme.branco, color: theme.textoBase, cursor: 'pointer', boxShadow: theme.sombra, fontWeight: 'bold', borderBottom: `4px solid ${p.cor}`, transition: '0.2s' }}
                >
                  <span style={{ fontSize: '20px', marginRight: '8px' }}>{p.icone}</span> {p.texto}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ ...cardStyle, width: '350px' }}>
              <button onClick={() => setLoginPortal(null)} style={{ background: 'transparent', color: '#888', border: 'none', cursor: 'pointer', marginBottom: '20px', padding: 0 }}>⬅️ Voltar aos perfis</button>
              
              {/* ADMIN E FISCAL AGORA FAZEM LOGIN PELO GOOGLE */}
              {['fiscal', 'admin'].includes(loginPortal) ? (
                <div style={{ textAlign: 'center' }}>
                  <h3>Acesso Institucional ({loginPortal.toUpperCase()})</h3>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                    <GoogleLogin onSuccess={async (res) => {
                      // O portal diz ao backend se estamos tentando entrar como Admin ou Fiscal
                      const backRes = await axios.post(`${API_URL}/auth/google`, { token: res.credential, portal: loginPortal });
                      if (backRes.data?.access_token) {
                        setToken(backRes.data.access_token); 
                        setUserRole(backRes.data.role); // Respeita a regra do banco de dados
                        
                        let targetTab = 'alunos';
                        if (backRes.data.role === 'fiscal') targetTab = 'relatorios';
                        if (backRes.data.role === 'admin') targetTab = 'usuarios';
                        setActiveTab(targetTab); 
                        
                        localStorage.setItem('token', backRes.data.access_token);
                        localStorage.setItem('userRole', backRes.data.role);
                      }
                    }} />
                  </div>
                </div>
              ) : (
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <h3 style={{ marginTop: 0, color: loginPortal === 'gestor' ? '#9C27B0' : theme.verdeIF }}>
                    Acesso {loginPortal.toUpperCase()}
                  </h3>
                  <input placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
                  <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} required />
                  <button type="submit" style={{ padding: '12px', backgroundColor: loginPortal === 'gestor' ? '#9C27B0' : theme.verdeIF, color: theme.branco, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Entrar</button>
                </form>
              )}
            </div>
          )}
        </div>
      </GoogleOAuthProvider>
    );
  }

  // ==========================================
  // TELA 2: SISTEMA LOGADO
  // ==========================================
  return (
    <div style={{ backgroundColor: theme.fundo, minHeight: '100vh', fontFamily: 'sans-serif', color: theme.textoBase }}>
      
      <header style={{ backgroundColor: userRole === 'gestor' ? '#9C27B0' : userRole === 'admin' ? '#333' : theme.verdeIF, color: theme.branco, padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: 0 }}>SCAVRE <span style={{fontSize: '14px', marginLeft: '10px', fontWeight: 'normal'}}>| Perfil: {userRole ? userRole.toUpperCase() : ''}</span></h2>
        <button onClick={handleLogout} style={{ backgroundColor: theme.vermelhoIF, color: theme.branco, border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Sair</button>
      </header>

      <div style={{ padding: '30px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* ========================================== */}
        {/* VISÃO 1: OPERADOR DA CATRACA               */}
        {/* ========================================== */}
        {userRole === 'operador' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
             <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginBottom: '-20px' }}>
              <div style={{ backgroundColor: theme.verdeIF, color: 'white', padding: '12px 25px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '30px' }}>🍽️</span>
                <div>
                  <div style={{ fontSize: '13px', textTransform: 'uppercase' }}>Refeições Servidas Hoje</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', textAlign: 'right' }}>{totalRefeicoes}</div>
                </div>
              </div>
            </div>

            <input id="leitorInvisivel" autoFocus type="text" value={leituraFisica} onChange={(e) => setLeituraFisica(e.target.value)} onKeyDown={handleKeyDownLeitor} onBlur={(e) => { if (e.relatedTarget && (e.relatedTarget.tagName === 'INPUT' || e.relatedTarget.tagName === 'TEXTAREA')) return; e.target.focus(); }} style={{ opacity: 0, position: 'absolute', zIndex: -1 }} />
            
            <section style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '25px' }}>
              <div><h2 style={{ color: theme.verdeIF, margin: 0 }}>Terminal da Catraca</h2></div>
              <div style={{ padding: '20px', backgroundColor: '#F0F4F1', borderRadius: '8px', textAlign: 'center', borderLeft: `5px solid ${theme.verdeIF}` }}>📟 <strong style={{ color: theme.verdeIF }}>Leitor Biométrico Ativo</strong></div>
              <form onSubmit={handleLiberarManual} style={{ marginTop: '10px' }}>
                <h3>Liberação Manual (Matrícula)</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="text" placeholder="Matrícula" value={matriculaManual} onChange={(e) => setMatriculaManual(e.target.value)} style={inputStyle} />
                  <button type="submit" style={{ padding: '0 20px', backgroundColor: theme.verdeIF, color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Liberar</button>
                </div>
              </form>
            </section>

            <section style={{ ...cardStyle, borderTopColor: '#333', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {!resultadoCatraca && (<div style={{ textAlign: 'center', color: '#888', padding: '40px 0' }}><span style={{ fontSize: '70px', animation: 'pulse 2s infinite' }}>☝️</span><h3>Aguardando digital...</h3></div>)}
              
              {resultadoCatraca?.status === 'liberado' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '15px', backgroundColor: '#E8F5E9', borderRadius: '8px', border: `2px solid ${theme.verdeIF}` }}>
                    <img src={`${API_URL}${resultadoCatraca?.aluno?.foto_url}`} alt="Aluno" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div>
                      <span style={{ backgroundColor: theme.verdeIF, color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>ACESSO LIBERADO</span>
                      <h3 style={{ margin: '5px 0 2px 0' }}>{resultadoCatraca?.aluno?.nome}</h3>
                      <p style={{ margin: 0, color: '#555' }}>Matrícula: {resultadoCatraca?.aluno?.matricula}</p>
                    </div>
                  </div>
                  <form onSubmit={handleSalvarOcorrencia} style={{ borderTop: '1px solid #E0E0E0', paddingTop: '15px' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: theme.vermelhoIF }}>🚨 Ocorrência</h4>
                    <textarea placeholder="Ex: Esqueceu crachá..." value={textoOcorrencia} onChange={(e) => setTextoOcorrencia(e.target.value)} required rows={2} style={inputStyle} />
                    <button type="submit" disabled={gravandoOcorrencia} style={{ marginTop: '8px', padding: '10px', backgroundColor: theme.vermelhoIF, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '100%' }}>Gravar Ocorrência</button>
                  </form>
                </div>
              )}
              
              {resultadoCatraca?.status === 'ja_almocou' && (
                <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#FFF3E0', borderRadius: '8px', border: '2px solid #F57C00' }}>
                  <span style={{ fontSize: '50px' }}>🍽️</span>
                  <h3 style={{ color: '#F57C00' }}>REFEIÇÃO JÁ REALIZADA</h3>
                  <p><strong>{resultadoCatraca?.aluno?.nome}</strong> já consumiu o almoço hoje.</p>
                </div>
              )}
              
              {resultadoCatraca?.status === 'negado' && (
                <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#FFEBEE', borderRadius: '8px', border: '2px solid #CD191E' }}>
                  <span style={{ fontSize: '50px' }}>❌</span>
                  <h3 style={{ color: '#CD191E' }}>ACESSO NEGADO</h3>
                  <p style={{ margin: 0, color: '#666' }}>Identificação não localizada ou inválida.</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ========================================== */}
        {/* VISÃO 2: GESTÃO DA EMPRESA / CANTINA       */}
        {/* ========================================== */}
        {userRole === 'empresa' && (
          !dashData ? (
            <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '8px' }}>
              <h3>Carregando métricas e dados financeiros...</h3>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                <div style={{ flex: 1, backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: theme.sombra, borderLeft: `5px solid ${theme.verdeIF}` }}>
                  <div style={{ color: '#666', fontSize: '14px', fontWeight: 'bold' }}>🍽️ REFEIÇÕES HOJE (AO VIVO)</div>
                  <div style={{ fontSize: '45px', fontWeight: 'bold', color: theme.verdeIF, marginTop: '10px' }}>{totalRefeicoes}</div>
                </div>
                <div style={{ flex: 1, backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: theme.sombra, borderLeft: '5px solid #F57C00' }}>
                  <div style={{ color: '#666', fontSize: '14px', fontWeight: 'bold' }}>💰 FATURAMENTO ESTIMADO (SEMANA)</div>
                  <div style={{ fontSize: '45px', fontWeight: 'bold', color: '#F57C00', marginTop: '10px' }}>R$ {dashData?.faturamento_semana?.toFixed(2).replace('.', ',')}</div>
                  <div style={{ fontSize: '12px', color: '#999' }}>Base: R$ {dashData?.valor_prato?.toFixed(2).replace('.', ',')} / aluno</div>
                </div>
                <div style={{ flex: 1, backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: theme.sombra, borderLeft: '5px solid #1976D2' }}>
                  <div style={{ color: '#666', fontSize: '14px', fontWeight: 'bold' }}>📊 MÉDIA DIÁRIA</div>
                  <div style={{ fontSize: '45px', fontWeight: 'bold', color: '#1976D2', marginTop: '10px' }}>{dashData?.media_diaria}</div>
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, color: theme.textoBase }}>Evolução de Consumo na Semana</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '250px', gap: '20px', marginTop: '30px', paddingBottom: '10px', borderBottom: '2px solid #E0E0E0' }}>
                  {dashData?.grafico_semanal?.map((g, idx) => {
                    const maxVal = Math.max(...(dashData?.grafico_semanal?.map(d => d.refeicoes) || [1]));
                    const height = `${((g.refeicoes || 0) / maxVal) * 100}%`;
                    const isHoje = idx === (dashData?.grafico_semanal?.length - 1);
                    return (
                      <div key={g.dia} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px', color: isHoje ? theme.verdeIF : '#666' }}>{g.refeicoes}</span>
                        <div style={{ width: '100%', maxWidth: '60px', height: height, backgroundColor: isHoje ? theme.verdeIF : '#90CAF9', borderRadius: '6px 6px 0 0', transition: 'height 0.5s' }}></div>
                        <span style={{ marginTop: '10px', fontWeight: 'bold', color: '#666' }}>{g.dia} {isHoje && '(Hoje)'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        )}

        {/* ========================================== */}
        {/* VISÃO 3: ADMIN, GESTOR E FISCAL            */}
        {/* ========================================== */}
        {['admin', 'fiscal', 'gestor'].includes(userRole) && (
          <>
            <nav style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
              
              {/* O Admin vê TODAS as abas. O Gestor vê Alunos e Estatísticas. */}
              {['admin', 'gestor'].includes(userRole) && (
                <button onClick={() => setActiveTab('alunos')} style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '6px', fontWeight: 'bold', backgroundColor: activeTab === 'alunos' ? (userRole === 'gestor' ? '#9C27B0' : theme.verdeIF) : '#E0E0E0', color: activeTab === 'alunos' ? theme.branco : theme.textoBase }}>🎓 Gestão de Alunos</button>
              )}
              
              {['admin', 'gestor'].includes(userRole) && (
                <button onClick={() => setActiveTab('estatisticas')} style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '6px', fontWeight: 'bold', backgroundColor: activeTab === 'estatisticas' ? (userRole === 'gestor' ? '#9C27B0' : theme.verdeIF) : '#E0E0E0', color: activeTab === 'estatisticas' ? theme.branco : theme.textoBase }}>📈 Dashboard Educacional</button>
              )}

              {/* O Admin gerencia os usuários */}
              {userRole === 'admin' && (
                <button onClick={() => setActiveTab('usuarios')} style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '6px', fontWeight: 'bold', backgroundColor: activeTab === 'usuarios' ? theme.verdeIF : '#E0E0E0', color: activeTab === 'usuarios' ? theme.branco : theme.textoBase }}>👥 Usuários e Permissões</button>
              )}

              {/* Admin e Fiscal veem relatórios e validação */}
              {['admin', 'fiscal'].includes(userRole) && (
                <>
                  <button onClick={() => setActiveTab('relatorios')} style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '6px', fontWeight: 'bold', backgroundColor: activeTab === 'relatorios' ? (userRole === 'fiscal' ? '#1976D2' : theme.verdeIF) : '#E0E0E0', color: activeTab === 'relatorios' ? theme.branco : theme.textoBase }}>📊 Relatórios Consolidados</button>
                  <button onClick={() => setActiveTab('validacao')} style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '6px', fontWeight: 'bold', backgroundColor: activeTab === 'validacao' ? (userRole === 'fiscal' ? '#1976D2' : theme.verdeIF) : '#E0E0E0', color: activeTab === 'validacao' ? theme.branco : theme.textoBase }}>✅ Validar Período</button>
                </>
              )}
            </nav>

            {/* ABA: ESTATÍSTICAS EDUCACIONAIS (ADMIN E GESTOR) */}
            {activeTab === 'estatisticas' && ['admin', 'gestor'].includes(userRole) && (
              <div style={{ ...cardStyle, borderTopColor: userRole === 'gestor' ? '#9C27B0' : theme.verdeIF }}>
                <h3 style={{ color: userRole === 'gestor' ? '#9C27B0' : theme.verdeIF, marginTop: 0 }}>📈 Dashboard Educacional e Estatísticas</h3>
                <p style={{ color: '#666' }}>Acompanhe os índices de frequência, utilização de benefícios e dados institucionais.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '20px' }}>
                   <div style={{ padding: '20px', border: `1px solid ${theme.borda}`, borderRadius: '8px', textAlign: 'center', backgroundColor: '#FAFAFA' }}>
                      <div style={{ fontSize: '14px', color: '#666' }}>Alunos Ativos com Biometria</div>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: userRole === 'gestor' ? '#9C27B0' : theme.verdeIF }}>{students.length || 0}</div>
                   </div>
                   <div style={{ padding: '20px', border: `1px solid ${theme.borda}`, borderRadius: '8px', textAlign: 'center', backgroundColor: '#FAFAFA' }}>
                      <div style={{ fontSize: '14px', color: '#666' }}>Frequência Média (Semana)</div>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: theme.verdeIF }}>87%</div>
                   </div>
                   <div style={{ padding: '20px', border: `1px solid ${theme.borda}`, borderRadius: '8px', textAlign: 'center', backgroundColor: '#FAFAFA' }}>
                      <div style={{ fontSize: '14px', color: '#666' }}>Taxa de Evasão do Benefício</div>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: theme.vermelhoIF }}>13%</div>
                   </div>
                </div>
              </div>
            )}

            {/* ABA: ALUNOS (ADMIN E GESTOR) */}
            {activeTab === 'alunos' && ['admin', 'gestor'].includes(userRole) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
                <section style={{ ...cardStyle, borderTopColor: userRole === 'gestor' ? '#9C27B0' : theme.verdeIF }}>
                  <h3 style={{ color: userRole === 'gestor' ? '#9C27B0' : theme.verdeIF, marginTop: 0, borderBottom: `2px solid ${theme.borda}`, paddingBottom: '10px' }}>Cadastrar Estudante</h3>
                  <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
                    <input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} required style={inputStyle}/>
                    <input placeholder="Matrícula" value={matricula} onChange={e => setMatricula(e.target.value)} required style={inputStyle}/>
                    <input placeholder="Curso" value={curso} onChange={e => setCurso(e.target.value)} required style={inputStyle}/>
                    <input placeholder="Turma" value={turma} onChange={e => setTurma(e.target.value)} required style={inputStyle}/>
                    <input type="file" onChange={e => setFoto(e.target.files[0])} required style={{ ...inputStyle, padding: '8px' }} />
                    <button type="submit" style={{ backgroundColor: userRole === 'gestor' ? '#9C27B0' : theme.verdeIF, color: theme.branco, padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Salvar</button>
                  </form>
                </section>

                <section style={{ ...cardStyle, borderTopColor: '#007bff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}><h3 style={{ margin: 0 }}>Matriculados</h3><button onClick={fetchStudents} style={{ padding: '6px 12px' }}>🔄</button></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    {students.map(s => (
                      <div key={s?.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', border: `1px solid ${theme.borda}`, borderRadius: '8px' }}>
                        <img src={`${API_URL}${s?.foto_url}`} alt="foto" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div><strong>{s?.nome}</strong><div style={{ fontSize: '13px', color: '#666' }}>{s?.matricula}</div></div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* ABA: USUARIOS (SÓ ADMIN) - AQUI O ADMIN CADASTRA A CONTA DO GOOGLE DO FISCAL */}
            {activeTab === 'usuarios' && userRole === 'admin' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
                <section style={{ ...cardStyle, borderTopColor: '#333' }}>
                  <h3 style={{ color: '#333', marginTop: 0, borderBottom: `2px solid ${theme.borda}`, paddingBottom: '10px' }}>Atribuir Permissão de Acesso</h3>
                  <p style={{ fontSize: '13px', color: '#666' }}>Cadastre o e-mail do Google do servidor para que ele possa acessar como Fiscal.</p>
                  <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
                    <input placeholder="Nome Completo do Servidor" value={uNome} onChange={e => setUNome(e.target.value)} required style={inputStyle}/>
                    <input type="email" placeholder="E-mail (Ex: servidor@ifb.edu.br)" value={uEmail} onChange={e => setUEmail(e.target.value)} required style={inputStyle}/>
                    
                    <select value={uRole} onChange={e => setURole(e.target.value)} style={inputStyle}>
                      <option value="fiscal">👮 Fiscal de Contrato</option>
                      <option value="gestor">🧑‍🏫 Gestor Educacional</option>
                      <option value="admin">⚙️ Administrador TI</option>
                    </select>

                    <button type="submit" style={{ backgroundColor: '#333', color: theme.branco, padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>Vincular Conta</button>
                  </form>
                </section>

                <section style={{ ...cardStyle, borderTopColor: '#1976D2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}><h3 style={{ margin: 0, color: '#1976D2' }}>Usuários com Acesso ao Sistema</h3><button onClick={fetchUsers} style={{ padding: '6px 12px' }}>🔄</button></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {usersList.map(u => (
                      <div key={u?.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: `1px solid ${theme.borda}`, borderRadius: '8px', backgroundColor: '#FAFAFA' }}>
                        <div>
                          <strong style={{ display: 'block', fontSize: '16px' }}>{u?.nome}</strong>
                          <span style={{ fontSize: '13px', color: '#666' }}>{u?.email}</span>
                        </div>
                        <span style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: u?.role === 'admin' ? '#E0E0E0' : u?.role === 'gestor' ? '#F3E5F5' : '#E3F2FD', color: u?.role === 'admin' ? '#333' : u?.role === 'gestor' ? '#9C27B0' : '#1976D2' }}>
                          {u?.role?.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* ABA: RELATORIOS (ADMIN, FISCAL) */}
            {activeTab === 'relatorios' && ['admin', 'fiscal'].includes(userRole) && (
              <div style={cardStyle}>
                <h3 style={{ color: userRole === 'fiscal' ? '#1976D2' : theme.verdeIF, marginTop: 0 }}>📊 Relatórios de Consumo e Ocorrências</h3>
                <p style={{ color: '#666' }}>Selecione o período para extrair os dados da catraca eletrônica e o resumo de atividades.</p>
                <div style={{ display: 'flex', gap: '15px', marginTop: '20px', alignItems: 'center' }}>
                  <input type="month" style={{ ...inputStyle, width: '200px' }} defaultValue="2026-05" />
                  <button style={{ padding: '12px 20px', backgroundColor: '#1976D2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Gerar PDF</button>
                  <button style={{ padding: '12px 20px', backgroundColor: theme.verdeIF, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Exportar Excel</button>
                </div>
              </div>
            )}

            {/* ABA: VALIDAÇÃO (ADMIN, FISCAL) */}
            {activeTab === 'validacao' && ['admin', 'fiscal'].includes(userRole) && (
              <div style={{ ...cardStyle, borderTopColor: '#1976D2' }}>
                <h3 style={{ color: '#1976D2', marginTop: 0 }}>✅ Validação de Período (Dar Baixa)</h3>
                <p style={{ color: '#666' }}>Audite os números reportados pela cantina, verifique ocorrências e valide a fatura do mês.</p>
                <div style={{ border: `1px solid ${theme.borda}`, borderRadius: '8px', padding: '25px', marginTop: '20px', backgroundColor: '#F9FAFB' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${theme.borda}`, paddingBottom: '15px', marginBottom: '20px' }}>
                    <h4 style={{ margin: 0, fontSize: '18px' }}>Período Corrente: Maio / 2026</h4>
                    <span style={{ backgroundColor: '#FFF3E0', color: '#F57C00', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '12px' }}>Pendente de Validação</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                    <div style={{ padding: '20px', backgroundColor: 'white', border: `1px solid ${theme.borda}`, borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Total de Refeições (Catraca)</div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: theme.textoBase, marginTop: '5px' }}>4.250</div>
                    </div>
                    <div style={{ padding: '20px', backgroundColor: 'white', border: `1px solid ${theme.borda}`, borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '13px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Valor Total a Repassar</div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#F57C00', marginTop: '5px' }}>R$ 27.625,00</div>
                    </div>
                  </div>
                  <button onClick={() => alert('Assinatura Eletrônica registrada!\n\nPeríodo de Maio/2026 validado e fechado com sucesso. Repasse autorizado à empresa prestadora.')} style={{ width: '100%', padding: '18px', backgroundColor: '#1976D2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: '0.2s' }}>
                    Assinar Eletronicamente e Dar Baixa no Mês
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;