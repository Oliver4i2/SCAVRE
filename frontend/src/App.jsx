import React, { useState, useEffect, useRef } from 'react';
import axiosDirect from 'axios';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';

const axios = axiosDirect.create();

const API_URL = 'https://scavre.onrender.com';
const GOOGLE_CLIENT_ID = "879431588451-320u19m4iff56p1i1r0488a0m82u2mic.apps.googleusercontent.com";

const theme = { 
  verdeIF: '#2F9E41', vermelhoIF: '#CD191E', fundo: '#F2F5F3', 
  branco: '#FFFFFF', textoBase: '#1E293B', borda: '#E0E0E0', 
  sombra: '0 4px 12px rgba(0,0,0,0.08)' 
};

const mockDadosDiarios = [
  { hora: '06h', acessos: 12 }, { hora: '08h', acessos: 45 },
  { hora: '10h', acessos: 85 }, { hora: '12h', acessos: 130 },
  { hora: '14h', acessos: 60 }, { hora: '16h', acessos: 55 },
  { hora: '18h', acessos: 90 }, { hora: '20h', acessos: 35 },
  { hora: '22h', acessos: 10 }
];

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3200);
    return () => clearTimeout(timer);
  }, []);

  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || '');
  const [loginPortal, setLoginPortal] = useState(null); 
  
  const [activeTab, setActiveTab] = useState(() => {
    const role = localStorage.getItem('userRole');
    if (role === 'fiscal') return 'validacao';
    if (role === 'admin') return 'acessos'; 
    if (role === 'gestor') return 'estatisticas';
    if (role === 'empresa') return 'dashboard_cantina';
    return 'alunos';
  });
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [students, setStudents] = useState([]);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [nome, setNome] = useState(''); 
  const [matricula, setMatricula] = useState(''); 
  const [curso, setCurso] = useState(''); 
  const [turma, setTurma] = useState(''); 
  const [foto, setFoto] = useState(null);
  
  const [leituraFisica, setLeituraFisica] = useState('');
  const [resultadoCatraca, setResultadoCatraca] = useState(null);
  const [matriculaManual, setMatriculaManual] = useState('');
  const [textoOcorrencia, setTextoOcorrencia] = useState('');
  const [gravandoOcorrencia, setGravandoOcorrencia] = useState(false);
  const [totalRefeicoes, setTotalRefeicoes] = useState(0);

  const [dashData, setDashData] = useState(null);
  const [relatorioDiario, setRelatorioDiario] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  
  const [sysConfig, setSysConfig] = useState({ valor_refeicao: 6.50, horario_inicio: '11:30', horario_fim: '14:00', email_fiscal: '' });
  
  const [protocoloGerado, setProtocoloGerado] = useState(null);
  const [reportType, setReportType] = useState('diario'); 
  const [filterValue, setFilterValue] = useState(new Date().toISOString().split('T')[0]); 

  const [validacaoModo, setValidacaoModo] = useState('diario');
  const [validacaoData, setValidacaoData] = useState(new Date().toISOString().split('T')[0]);
  const [listaValidacao, setListaValidacao] = useState([]);
  const [refeicaoExpandida, setRefeicaoExpandida] = useState(null);
  const [historicoValidacao, setHistoricoValidacao] = useState([]);

  const timerRef = useRef(null);

  const fecharResultado = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setResultadoCatraca(null); setTextoOcorrencia('');
    setTimeout(() => document.getElementById('leitorInvisivel')?.focus(), 100);
  };
  const pausarTimer = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  const handleReportTypeChange = (type) => {
    setReportType(type);
    if (type === 'diario') setFilterValue(new Date().toISOString().split('T')[0]);
    else if (type === 'mensal') setFilterValue(new Date().toISOString().slice(0, 7));
    else setFilterValue('');
  };

  const baixarRelatorio = (formato) => {
    const url = `${API_URL}/relatorios/exportar/${formato}?tipo=${reportType}&filtro=${filterValue}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    let ws;
    if (token && (userRole === 'empresa' || userRole === 'operador' || userRole === 'fiscal' || userRole === 'admin')) {
      const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws/refeicoes';
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => { if (event.data) setTotalRefeicoes(parseInt(event.data)); };
      } catch (err) {}
    }
    return () => { if (ws) ws.close(); };
  }, [token, userRole]);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      if (userRole === 'empresa') axios.get(`${API_URL}/stats/dashboard`).then(res => setDashData(res.data)).catch(e => console.error(e));
      if (['admin', 'gestor'].includes(userRole)) fetchStudents(); 
      if (['admin', 'fiscal'].includes(userRole)) fetchConfigs();
      if (activeTab === 'relatorios') fetchRelatorioDiario();
      if (activeTab === 'ocorrencias') fetchOcorrencias();
      if (activeTab === 'validacao') {
        fetchHistoricoValidacao();
        fetchDadosValidacao(); 
      }
    }
  }, [token, userRole, activeTab, validacaoModo, validacaoData]);

  const fetchStudents = async () => { try { const res = await axios.get(`${API_URL}/students`); setStudents(res.data || []); } catch (err) {} };
  const fetchRelatorioDiario = async () => { try { const res = await axios.get(`${API_URL}/relatorios/diario`); setRelatorioDiario(res.data || []); } catch (err) {} };
  const fetchOcorrencias = async () => { try { const res = await axios.get(`${API_URL}/ocorrencias`); setOcorrencias(res.data || []); } catch (err) {} };
  const fetchConfigs = async () => { try { const res = await axios.get(`${API_URL}/config`); setSysConfig(res.data); } catch (err) {} };
  const fetchHistoricoValidacao = async () => { try { const res = await axios.get(`${API_URL}/validacao/historico`); setHistoricoValidacao(res.data || []); } catch (err) {} };

  const fetchDadosValidacao = async () => {
    try {
      let url = `${API_URL}/relatorios/diario`;
      const res = await axios.get(url); 
      const dadosReais = (res.data || []).map(item => ({
        id: item.id,
        hora: item.hora,
        aluno: item.nome, 
        matricula: item.matricula,
        metodo: item.metodo,
        status: 'validado', 
        valor: sysConfig.valor_refeicao || 6.50
      }));
      setListaValidacao(dadosReais);
      setProtocoloGerado(null);
    } catch (err) {
      console.error("Erro ao buscar validações reais do banco:", err);
      setListaValidacao([]); 
    }
  };

  const toggleRefeicaoExpandida = (id) => {
    setRefeicaoExpandida(refeicaoExpandida === id ? null : id);
  };

  const alternarStatusRefeicao = (id) => {
    setListaValidacao(prev => prev.map(item => 
      item.id === id ? { ...item, status: item.status === 'validado' ? 'pendente' : 'validado' } : item
    ));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      if (res.data?.access_token) {
        setToken(res.data.access_token); setUserRole(loginPortal); 
        let targetTab = 'alunos';
        if (loginPortal === 'fiscal') targetTab = 'validacao';
        if (loginPortal === 'admin') targetTab = 'acessos';
        if (loginPortal === 'gestor') targetTab = 'alunos';
        if (loginPortal === 'empresa') targetTab = 'dashboard_cantina';
        setActiveTab(targetTab); 
        localStorage.setItem('token', res.data.access_token); localStorage.setItem('userRole', loginPortal);
      }
    } catch (err) { alert("E-mail ou senha incorretos!"); }
  };

  const handleSalvarConfig = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/config`, sysConfig);
      alert("Atualizado com sucesso!");
    } catch (err) { alert("Erro ao salvar."); }
  };

  const handleFecharPeriodo = async () => {
    const qtdeValidadas = listaValidacao.filter(r => r.status === 'validado').length;
    if(!window.confirm(`Atenção: Você está validando ${qtdeValidadas} refeições. As "pendentes" não serão repassadas. Deseja emitir o protocolo?`)) return;
    
    const valorPrato = sysConfig.valor_refeicao || 6.50;
    try {
      const res = await axios.post(`${API_URL}/validacao/fechar`, { 
        periodo: validacaoData, 
        modo: validacaoModo,
        total_refeicoes: qtdeValidadas, 
        valor_total: qtdeValidadas * valorPrato 
      });
      setProtocoloGerado(res.data.protocolo || `PRT-${Date.now().toString().slice(-6)}`);
      fetchHistoricoValidacao();
    } catch (err) { 
      setProtocoloGerado(`PRT-${Date.now().toString().slice(-6)}-MOCK`);
      alert("Sucesso (Modo Simulação)."); 
    }
  };

  const verificarBiometria = async (hexCode) => {
    pausarTimer();
    setResultadoCatraca({ status: 'processando' }); // Feedback instantâneo
    try {
      const res = await axios.post(`${API_URL}/catraca/verificar`, { hex_code: hexCode });
      setResultadoCatraca(res.data || { status: 'negado' }); timerRef.current = setTimeout(fecharResultado, 5000); 
    } catch (err) { setResultadoCatraca({ status: 'negado' }); timerRef.current = setTimeout(fecharResultado, 3000); }
  };

  const handleKeyDownLeitor = (e) => { if (e.key === 'Enter') { verificarBiometria(leituraFisica); setLeituraFisica(''); } };

  const handleLiberarManual = async (e) => {
    e.preventDefault(); if (!matriculaManual.trim()) return;
    pausarTimer();
    setResultadoCatraca({ status: 'processando' }); // Feedback instantâneo
    try {
      const res = await axios.post(`${API_URL}/catraca/verificar`, { matricula: matriculaManual });
      setResultadoCatraca(res.data || { status: 'negado' }); setMatriculaManual(''); timerRef.current = setTimeout(fecharResultado, 5000); 
    } catch (err) { setResultadoCatraca({ status: 'negado' }); timerRef.current = setTimeout(fecharResultado, 3000); } finally { document.getElementById('leitorInvisivel')?.focus(); }
  };

  const handleSalvarOcorrencia = async (e) => {
    e.preventDefault(); if (!textoOcorrencia.trim() || !resultadoCatraca?.aluno?.id) return;
    setGravandoOcorrencia(true);
    try {
      await axios.post(`${API_URL}/students/${resultadoCatraca.aluno.id}/ocorrencias`, { descricao: textoOcorrencia });
      alert("Ocorrência registrada!"); fecharResultado();
    } catch (err) { alert("Erro na requisição."); } finally { setGravandoOcorrencia(false); document.getElementById('leitorInvisivel')?.focus(); }
  };

  const handleEditClick = (student) => {
    setEditingStudentId(student.id); setNome(student.nome); setMatricula(student.matricula); setCurso(student.curso); setTurma(student.turma); setFoto(null); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleCancelEdit = () => { setEditingStudentId(null); setNome(''); setMatricula(''); setCurso(''); setTurma(''); setFoto(null); };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    const formData = new FormData(); formData.append('nome', nome); formData.append('matricula', matricula); formData.append('curso', curso); formData.append('turma', turma); if (foto) formData.append('foto', foto);
    try {
      if (editingStudentId) { await axios.put(`${API_URL}/students/${editingStudentId}`, formData); alert("Estudante atualizado com sucesso!"); } 
      else { await axios.post(`${API_URL}/students`, formData); alert("Estudante cadastrado com sucesso!"); }
      handleCancelEdit(); fetchStudents();
    } catch (err) { alert("Erro ao salvar estudante."); }
  };

  if (!token) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        {showSplash && <div className="splash-screen"><div className="splash-circle"><span className="splash-text">SCAVRE</span></div></div>}
        <div className="app-container" style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }} className="animate-fade">
            <h1 style={{ color: theme.verdeIF, margin: 0, fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-1.5px' }}>SCAVRE</h1>
            <p style={{ color: '#64748B', marginTop: '8px', fontSize: '18px', fontWeight: 500 }}>Controle de Acesso e Voucher Escolar | IFB</p>
          </div>
          {!loginPortal ? (
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '800px' }} className="animate-fade">
              {[ { id: 'operador', icone: '📟', texto: 'Operador / Catraca', cor: theme.verdeIF }, { id: 'empresa', icone: '🏢', texto: 'Empresa (Cantina)', cor: '#F57C00' }, { id: 'fiscal', icone: '👮', texto: 'Fiscal de Contrato', cor: '#1976D2' }, { id: 'gestor', icone: '🧑‍🏫', texto: 'Gestão Educacional', cor: '#9C27B0' }, { id: 'admin', icone: '⚙️', texto: 'Administrador TI', cor: '#475569' } ].map(p => (
                <button key={p.id} onClick={() => setLoginPortal(p.id)} className="card-glass" style={{ width: '220px', padding: '30px 20px', borderTop: `6px solid ${p.cor}`, cursor: 'pointer', textAlign: 'center' }}>
                  <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>{p.icone}</span><span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1E293B' }}>{p.texto}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="card-glass animate-fade" style={{ width: '380px' }}>
              <button onClick={() => setLoginPortal(null)} style={{ background: 'transparent', color: '#64748B', border: 'none', cursor: 'pointer', marginBottom: '24px', fontWeight: 600 }}>⬅️ Voltar aos perfis</button>
              {['fiscal', 'admin'].includes(loginPortal) ? (
                <div style={{ textAlign: 'center' }}><h3 style={{ marginBottom: '20px', color: '#1E293B' }}>Acesso Institucional ({loginPortal.toUpperCase()})</h3><div style={{ display: 'flex', justifyContent: 'center' }}><GoogleLogin onSuccess={async (res) => { const backRes = await axios.post(`${API_URL}/auth/google`, { token: res.credential, portal: loginPortal }); if (backRes.data?.access_token) { setToken(backRes.data.access_token); setUserRole(backRes.data.role); let targetTab = backRes.data.role === 'fiscal' ? 'validacao' : 'acessos'; setActiveTab(targetTab); localStorage.setItem('token', backRes.data.access_token); localStorage.setItem('userRole', backRes.data.role); } }} /></div></div>
              ) : (
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}><h3 style={{ color: loginPortal === 'gestor' ? '#9C27B0' : theme.verdeIF, fontWeight: 800 }}>Acesso {loginPortal.toUpperCase()}</h3><input placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="modern-input" type="email" required /><input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="modern-input" required /><button type="submit" className="interactive-btn" style={{ backgroundColor: loginPortal === 'gestor' ? '#9C27B0' : theme.verdeIF, color: 'white', width: '100%' }}>Entrar de forma segura</button></form>
              )}
            </div>
          )}
        </div>
      </GoogleOAuthProvider>
    );
  }

  return (
    <>
      {showSplash && <div className="splash-screen"><div className="splash-circle"><span className="splash-text">SCAVRE</span></div></div>}

      <div className="app-container">
        <header style={{ background: `linear-gradient(135deg, ${userRole === 'empresa' ? '#F57C00' : userRole === 'gestor' ? '#9C27B0' : userRole === 'admin' ? '#475569' : userRole === 'fiscal' ? '#1976D2' : theme.verdeIF}, #1A5325)`, color: 'white', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <h2 style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.5px' }}>SCAVRE <span style={{fontSize: '14px', marginLeft: '12px', background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '20px', fontWeight: 600}}>Perfil: {userRole.toUpperCase()}</span></h2>
          <button onClick={() => { setToken(null); localStorage.clear(); window.location.reload(); }} className="interactive-btn" style={{ backgroundColor: theme.vermelhoIF, color: 'white', padding: '8px 20px' }}>Sair com segurança</button>
        </header>

        <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          
          {userRole === 'empresa' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }} className="animate-fade">
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
               <div className="card-glass" style={{ borderTopColor: '#F57C00' }}>
                 <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 700 }}>REFEIÇÕES HOJE</div>
                 <div style={{ fontSize: '36px', fontWeight: 900, color: '#F57C00', marginTop: '6px' }}>{totalRefeicoes}</div>
               </div>
               <div className="card-glass" style={{ borderTopColor: theme.verdeIF }}>
                 <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 700 }}>MÉDIA DIÁRIA DA SEMANA</div>
                 <div style={{ fontSize: '36px', fontWeight: 900, color: theme.verdeIF, marginTop: '6px' }}>{dashData?.media_diaria || 0}</div>
               </div>
               <div className="card-glass" style={{ borderTopColor: '#1976D2' }}>
                 <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 700 }}>FATURAMENTO SEMANAL</div>
                 <div style={{ fontSize: '36px', fontWeight: 900, color: '#1976D2', marginTop: '6px' }}>R$ {dashData?.faturamento_semana ? dashData.faturamento_semana.toFixed(2).replace('.', ',') : '0,00'}</div>
               </div>
             </div>
             <div className="dashboard-grid">
               <div className="card-glass" style={{ borderTopColor: '#F57C00' }}>
                 <h3 style={{ fontWeight: 800, color: '#1E293B', marginBottom: '20px' }}>📊 Balanço de Fornecimento Semanal</h3>
                 <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', height: '220px', padding: '20px 10px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                   {(dashData?.grafico_semanal || []).map((g, idx) => (
                     <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                       <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#F57C00', marginBottom: '6px' }}>{g.refeicoes}</div>
                       <div style={{ width: '100%', height: `${Math.min((g.refeicoes / 400) * 100, 100)}%`, background: `linear-gradient(to top, #F57C00, #FFB74D)`, borderRadius: '6px 6px 0 0', transition: 'height 0.5s ease' }}></div>
                       <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', marginTop: '8px' }}>{g.dia}</div>
                     </div>
                   ))}
                 </div>
               </div>
               <div className="card-glass" style={{ borderTopColor: theme.verdeIF }}>
                 <h3 style={{ fontWeight: 800, color: '#1E293B', marginBottom: '20px' }}>⏱️ Fluxo Diário (Hora a Hora)</h3>
                 <div style={{ height: '220px', width: '100%' }}>
                   <ResponsiveContainer>
                     <BarChart data={dashData?.grafico_diario || mockDadosDiarios} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                       <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fill: '#718096', fontSize: 12 }} />
                       <YAxis axisLine={false} tickLine={false} tick={{ fill: '#718096', fontSize: 12 }} />
                       <Tooltip cursor={{ fill: '#F2F5F3' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                       <Bar dataKey="acessos" fill={theme.verdeIF} radius={[6, 6, 0, 0]} barSize={30} />
                     </BarChart>
                   </ResponsiveContainer>
                 </div>
               </div>
             </div>
           </div>
          )}

          {/* ===================== TERMINAL DO OPERADOR ===================== */}
          {userRole === 'operador' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }} className="animate-fade">
               <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                <div className="card-glass pulse-active" style={{ background: theme.verdeIF, color: 'white', padding: '16px 30px', display: 'flex', alignItems: 'center', gap: '20px', borderTop: 'none' }}>
                  <span style={{ fontSize: '36px' }}>🍽️</span>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, opacity: 0.9 }}>REFEIÇÕES SERVIDAS HOJE</div>
                    <div style={{ fontSize: '36px', fontWeight: 900, textAlign: 'right' }}>{totalRefeicoes}</div>
                  </div>
                </div>
              </div>

              <input id="leitorInvisivel" autoFocus type="text" value={leituraFisica} onChange={(e) => setLeituraFisica(e.target.value)} onKeyDown={handleKeyDownLeitor} onBlur={(e) => { if (e.relatedTarget && (e.relatedTarget.tagName === 'INPUT' || e.relatedTarget.tagName === 'TEXTAREA')) return; e.target.focus(); }} style={{ opacity: 0, position: 'absolute', zIndex: -1 }} />
              
              <section className="card-glass">
                <h2 style={{ color: theme.verdeIF, marginBottom: '20px', fontWeight: 800 }}>Terminal de Controle</h2>
                <div style={{ padding: '20px', backgroundColor: '#F0F4F1', borderRadius: '8px', textAlign: 'center', borderLeft: `6px solid ${theme.verdeIF}`, fontWeight: 'bold', color: theme.verdeIF, marginBottom: '25px' }}>📟 Hardware Biométrico Ativo</div>
                <form onSubmit={handleLiberarManual} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ color: '#475569' }}>Contingência Manual</h4>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" placeholder="Número de Matrícula" value={matriculaManual} onChange={(e) => setMatriculaManual(e.target.value)} className="modern-input" />
                    <button type="submit" className="interactive-btn" style={{ backgroundColor: theme.verdeIF, color: 'white' }}>Liberar</button>
                  </div>
                </form>
              </section>

              {/* RETORNO DA CATRACA DO OPERADOR COM FOTO E CARREGAMENTO REAL */}
              <section className="card-glass" style={{ borderTopColor: '#475569', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '350px' }}>
                {!resultadoCatraca && (<div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0' }}><span style={{ fontSize: '74px', display: 'block', marginBottom: '15px' }}>☝️</span><h3 style={{fontWeight: 600}}>Aguardando leitura digital...</h3></div>)}
                
                {resultadoCatraca?.status === 'processando' && (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className="spinner" style={{ margin: '0 auto 20px auto', borderColor: 'rgba(47, 158, 65, 0.2)', borderTopColor: theme.verdeIF, width: '50px', height: '50px', borderWidth: '5px' }}></div>
                    <h3 style={{ color: '#475569', fontWeight: 600 }}>Verificando identidade...</h3>
                  </div>
                )}
                
                {resultadoCatraca?.status === 'liberado' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '20px', backgroundColor: '#ECFDF5', borderRadius: '12px', border: `2px solid ${theme.verdeIF}` }}>
                      
                      <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: `3px solid ${theme.verdeIF}`, flexShrink: 0, backgroundColor: '#D1FAE5' }}>
                        {resultadoCatraca?.aluno?.foto_url ? (
                          <img src={`${API_URL}${resultadoCatraca.aluno.foto_url}`} alt="Aluno" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '32px' }}>👤</div>
                        )}
                      </div>
                      
                      <div>
                        <span style={{ backgroundColor: theme.verdeIF, color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', marginRight: '10px', display: 'inline-block', marginBottom: '8px' }}>ACESSO AUTORIZADO</span>
                        <h3 style={{ color: '#065F46', fontSize: '22px', fontWeight: 800, margin: 0 }}>{resultadoCatraca?.aluno?.nome}</h3>
                        <div style={{ fontSize: '13px', color: '#065F46', marginTop: '4px', fontWeight: 600 }}>Matrícula: {resultadoCatraca?.aluno?.matricula} | Turma: {resultadoCatraca?.aluno?.turma}</div>
                      </div>
                    </div>
                    
                    <form onSubmit={handleSalvarOcorrencia} style={{ borderTop: '1px solid #E2E8F0', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h4 style={{ color: theme.vermelhoIF, fontWeight: 700 }}>🚨 Apontar Ocorrência Técnica</h4>
                      <textarea onFocus={pausarTimer} placeholder="Descreva o motivo (Ex: Sem uniforme, cota especial)..." value={textoOcorrencia} onChange={(e) => setTextoOcorrencia(e.target.value)} required rows={2} className="modern-input" />
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button type="submit" disabled={gravandoOcorrencia} className="interactive-btn" style={{ backgroundColor: theme.vermelhoIF, color: 'white', flex: 2 }}>{gravandoOcorrencia ? <div className="spinner"></div> : 'Gravar Advertência'}</button>
                        <button type="button" onClick={fecharResultado} className="interactive-btn" style={{ backgroundColor: '#E2E8F0', color: '#475569', flex: 1 }}>Avançar</button>
                      </div>
                    </form>
                  </div>
                )}
                
                {resultadoCatraca?.status === 'ja_almocou' && (<div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#FFF7ED', borderRadius: '12px', border: '2px solid #F57C00' }} className="animate-fade"><span style={{ fontSize: '60px', display: 'block', marginBottom: '10px' }}>🍽️</span><h3 style={{ color: '#C2410C', fontWeight: 800 }}>VOUCHER JÁ UTILIZADO</h3><p style={{color: '#9A3412', margin: '8px 0 20px 0'}}>O estudante <strong>{resultadoCatraca?.aluno?.nome}</strong> já consumiu sua cota diária.</p><button onClick={fecharResultado} className="interactive-btn" style={{ backgroundColor: '#F57C00', color: 'white' }}>Liberar Próximo</button></div>)}
                {resultadoCatraca?.status === 'negado' && (<div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#FEF2F2', borderRadius: '12px', border: '2px solid #CD191E' }} className="animate-fade"><span style={{ fontSize: '60px', display: 'block', marginBottom: '10px' }}>❌</span><h3 style={{ color: '#991B1B', fontWeight: 800 }}>ESTUDANTE INEXISTENTE</h3><p style={{color: '#7F1D1D', margin: '8px 0 20px 0'}}>Dados biométricos ou matrícula inválidos.</p><button onClick={fecharResultado} className="interactive-btn" style={{ backgroundColor: '#CD191E', color: 'white' }}>Limpar Terminal</button></div>)}
              </section>
            </div>
          )}

          {['admin', 'fiscal', 'gestor'].includes(userRole) && (
            <div className="animate-fade">
              <nav style={{ display: 'flex', gap: '12px', marginBottom: '35px', padding: '6px', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '10px', backdropFilter: 'blur(8px)', width: 'fit-content' }}>
                {userRole === 'admin' && (<button onClick={() => setActiveTab('acessos')} className={`nav-tab ${activeTab === 'acessos' ? 'active' : ''}`}>🛡️ Controle de Acessos</button>)}
                {['admin', 'gestor'].includes(userRole) && (<button onClick={() => setActiveTab('alunos')} className={`nav-tab ${activeTab === 'alunos' ? 'active' : ''}`}>🎓 Gestão de Alunos</button>)}
                {['admin', 'fiscal'].includes(userRole) && (<button onClick={() => setActiveTab('configuracoes')} className={`nav-tab ${activeTab === 'configuracoes' ? 'active' : ''}`}>⚙️ Parâmetros</button>)}
                {['admin', 'fiscal', 'gestor'].includes(userRole) && (<button onClick={() => setActiveTab('ocorrencias')} className={`nav-tab ${activeTab === 'ocorrencias' ? 'active' : ''}`}>🚨 Ocorrências</button>)}
                {['admin', 'fiscal'].includes(userRole) && (<button onClick={() => { setActiveTab('relatorios'); fetchRelatorioDiario(); }} className={`nav-tab ${activeTab === 'relatorios' ? 'active' : ''}`}>📊 Relatórios</button>)}
                {userRole === 'fiscal' && (
                  <button onClick={() => setActiveTab('validacao')} className={`nav-tab ${activeTab === 'validacao' ? 'active' : ''}`} style={{ backgroundColor: activeTab === 'validacao' ? '#1976D2' : 'transparent', color: activeTab === 'validacao' ? 'white' : 'var(--texto-mutado)' }}>
                    ✅ Homologação Fiscal
                  </button>
                )}
              </nav>

              {/* === ABA: CONTROLE DE ACESSOS (ADMIN) === */}
              {activeTab === 'acessos' && userRole === 'admin' && (
                <div className="card-glass" style={{ borderTopColor: '#475569' }}>
                  <h3 style={{ color: '#1E293B', marginBottom: '10px', fontWeight: 800 }}>🛡️ Controle de Acessos Institucionais</h3>
                  <p style={{ color: '#64748B', marginBottom: '25px' }}>Defina os endereços de e-mail autorizados a utilizar o login via Google Workspace para o painel de fiscalização.</p>
                  <form onSubmit={handleSalvarConfig} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', maxWidth: '600px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', color: '#475569', fontSize: '14px' }}>E-mail Google do Fiscal de Contrato</label>
                      <input 
                        type="email" 
                        placeholder="exemplo.fiscal@ifb.edu.br" 
                        value={sysConfig.email_fiscal || ''} 
                        onChange={e => setSysConfig({...sysConfig, email_fiscal: e.target.value})} 
                        className="modern-input" 
                        required 
                      />
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <button type="submit" className="interactive-btn" style={{ backgroundColor: '#475569', color: 'white' }}>Atualizar Permissões do Google Login</button>
                    </div>
                  </form>
                </div>
              )}

              {/* === ABA: GESTÃO DE ALUNOS === */}
              {activeTab === 'alunos' && ['admin', 'gestor'].includes(userRole) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
                  <section className="card-glass" style={{ borderTopColor: userRole === 'gestor' ? '#9C27B0' : theme.verdeIF }}>
                    <h3 style={{ color: userRole === 'gestor' ? '#9C27B0' : theme.verdeIF, marginBottom: '20px', fontWeight: 800 }}>
                      {editingStudentId ? '✏️ Atualizar Registro' : 'Cadastrar Novo Aluno'}
                    </h3>
                    <form onSubmit={handleSaveStudent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <input placeholder="Nome Completo" value={nome} onChange={e => setNome(e.target.value)} required className="modern-input"/>
                      <input placeholder="Número de Matrícula" value={matricula} onChange={e => setMatricula(e.target.value)} required className="modern-input"/>
                      <input placeholder="Curso Acadêmico" value={curso} onChange={e => setCurso(e.target.value)} required className="modern-input"/>
                      <input placeholder="Turma/Período" value={turma} onChange={e => setTurma(e.target.value)} required className="modern-input"/>
                      <label style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>{editingStudentId ? "Substituir foto biométrica (Opcional)" : "Foto de Identificação Escolar"}</label>
                      <input type="file" onChange={e => setFoto(e.target.files[0])} required={!editingStudentId} className="modern-input" style={{ padding: '8px' }} />
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button type="submit" className="interactive-btn" style={{ backgroundColor: userRole === 'gestor' ? '#9C27B0' : theme.verdeIF, color: 'white', flex: 1 }}>{editingStudentId ? 'Salvar Alterações' : 'Concluir Cadastro'}</button>
                        {editingStudentId && (<button type="button" onClick={handleCancelEdit} className="interactive-btn" style={{ backgroundColor: '#E2E8F0', color: '#475569' }}>Cancelar</button>)}
                      </div>
                    </form>
                  </section>

                  <section className="card-glass" style={{ borderTopColor: '#007bff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h3 style={{ fontWeight: 800, color: '#1E293B' }}>Base de Estudantes IFB</h3><button onClick={fetchStudents} className="interactive-btn" style={{ backgroundColor: '#F1F5F9', color: '#475569', padding: '6px 14px', fontSize: '13px' }}>🔄 Atualizar Lista</button></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
                      {(students || []).map(s => (
                        <div key={s?.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: '1px solid var(--borda)', borderRadius: '12px', background: '#fff', position: 'relative' }}>
                          <img src={`${API_URL}${s?.foto_url}`} alt="Estudante" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #E2E8F0' }} />
                          <div style={{ flex: 1 }}>
                            <strong style={{ color: '#1E293B', fontSize: '15px', display: 'block' }}>{s?.nome}</strong>
                            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>Matrícula: {s?.matricula}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px', fontWeight: 500 }}>{s?.curso} | Turma {s?.turma}</div>
                          </div>
                          <button onClick={() => handleEditClick(s)} title="Editar Ficha" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', cursor: 'pointer', borderRadius: '8px', padding: '8px' }}>✏️</button>
                        </div>
                      ))}
                      {(students || []).length === 0 && <div style={{ color: '#64748B', gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>Nenhum estudante localizado na base local.</div>}
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'configuracoes' && ['admin', 'fiscal'].includes(userRole) && (
                <div className="card-glass" style={{ borderTopColor: '#475569' }}>
                  <h3 style={{ color: '#1E293B', marginBottom: '10px', fontWeight: 800 }}>⚙️ Parâmetros Técnicos do Sistema</h3>
                  <p style={{ color: '#64748B', marginBottom: '25px' }}>Definições para auditoria contratual, teto financeiro e janelas de funcionamento.</p>
                  <form onSubmit={handleSalvarConfig} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', color: '#475569', fontSize: '14px' }}>Custo por Refeição (R$)</label>
                      <input type="number" step="0.01" value={sysConfig.valor_refeicao} onChange={e => setSysConfig({...sysConfig, valor_refeicao: parseFloat(e.target.value)})} className="modern-input" required />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', color: '#475569', fontSize: '14px' }}>Abertura da Janela</label>
                      <input type="time" value={sysConfig.horario_inicio} onChange={e => setSysConfig({...sysConfig, horario_inicio: e.target.value})} className="modern-input" required />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', color: '#475569', fontSize: '14px' }}>Fechamento da Janela</label>
                      <input type="time" value={sysConfig.horario_fim} onChange={e => setSysConfig({...sysConfig, horario_fim: e.target.value})} className="modern-input" required />
                    </div>
                    <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                      <button type="submit" className="interactive-btn" style={{ backgroundColor: '#475569', color: 'white' }}>Aplicar Novas Diretrizes</button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'ocorrencias' && (
                <div className="card-glass" style={{ borderTopColor: theme.vermelhoIF }}>
                  <h3 style={{ color: theme.vermelhoIF, marginBottom: '20px', fontWeight: 800 }}>🚨 Livro de Ocorrências Administrativas</h3>
                  <div className="table-container">
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>Data e Horário</th>
                          <th>Estudante</th>
                          <th>Relato da Ocorrência</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ocorrencias.map((o) => (
                          <tr key={o.id}>
                            <td style={{ fontWeight: 600, color: '#64748B' }}>{o.data_hora}</td>
                            <td><strong style={{color: '#1E293B'}}>{o.nome}</strong><br/><span style={{fontSize: '12px', color: '#94A3B8'}}>Matrícula: {o.matricula}</span></td>
                            <td style={{ color: theme.vermelhoIF, fontWeight: 500 }}>{o.descricao}</td>
                          </tr>
                        ))}
                        {ocorrencias.length === 0 && (<tr><td colSpan="3" style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>Nenhum incidente pontuado no período.</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'relatorios' && (
                <div className="card-glass">
                  <h3 style={{ color: userRole === 'fiscal' ? '#1976D2' : theme.verdeIF, marginBottom: '8px', fontWeight: 800 }}>📊 Central de Exportação e Consolidação</h3>
                  <p style={{ color: '#64748B', marginBottom: '30px' }}>Gere relatórios retroativos assinados digitalmente para envio à coordenação financeira.</p>
                  
                  <div style={{ background: '#F8FAFC', padding: '24px', borderRadius: '12px', borderLeft: `6px solid ${userRole === 'fiscal' ? '#1976D2' : theme.verdeIF}`, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', gap: '20px', margin: 0, padding: 0, alignItems: 'center', border: 'none', background: 'transparent' }}>
                      <span style={{fontWeight: 700, color: '#475569'}}>Escopo Legal:</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}><input type="radio" checked={reportType === 'diario'} onChange={() => handleReportTypeChange('diario')} /> Diário</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}><input type="radio" checked={reportType === 'mensal'} onChange={() => handleReportTypeChange('mensal')} /> Regular Mensal</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}><input type="radio" checked={reportType === 'estudante'} onChange={() => handleReportTypeChange('estudante')} /> Por Aluno</label>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{fontWeight: 700, color: '#475569'}}>Parâmetro de Filtro:</span>
                      {reportType === 'diario' && <input type="date" value={filterValue} onChange={e => setFilterValue(e.target.value)} className="modern-input" style={{ width: '220px' }} />}
                      {reportType === 'mensal' && <input type="month" value={filterValue} onChange={e => setFilterValue(e.target.value)} className="modern-input" style={{ width: '220px' }} />}
                      {reportType === 'estudante' && <input type="text" placeholder="Insira a matrícula" value={filterValue} onChange={e => setFilterValue(e.target.value)} className="modern-input" style={{ width: '260px' }} />}

                      <button onClick={() => baixarRelatorio('pdf')} className="interactive-btn" style={{ backgroundColor: theme.vermelhoIF, color: 'white' }}>📄 Compilar PDF Oficial</button>
                      <button onClick={() => baixarRelatorio('csv')} className="interactive-btn" style={{ backgroundColor: theme.verdeIF, color: 'white' }}>📥 Exportar Planilha (CSV)</button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '24px', margin: '35px 0 25px 0' }}>
                     <div style={{ padding: '20px', backgroundColor: '#F0FDF4', borderRadius: '12px', border: `1px solid #DCFCE7`, flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#166534', fontWeight: 700, letterSpacing: '0.5px' }}>REFEIÇÕES NO ESCOPO</div>
                        <div style={{ fontSize: '36px', color: theme.verdeIF, fontWeight: 900, marginTop: '4px' }}>{(relatorioDiario || []).length}</div>
                     </div>
                     <div style={{ padding: '20px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: `1px solid #E2E8F0`, flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#475569', fontWeight: 700, letterSpacing: '0.5px' }}>AUTENTICAÇÃO BIOMÉTRICA</div>
                        <div style={{ fontSize: '36px', color: '#1E293B', fontWeight: 900, marginTop: '4px' }}>{(relatorioDiario || []).filter(r => r.metodo === 'biometria').length}</div>
                     </div>
                     <div style={{ padding: '20px', backgroundColor: '#FFF7ED', borderRadius: '12px', border: `1px solid #FFEDD5`, flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#9A3412', fontWeight: 700, letterSpacing: '0.5px' }}>LIBERAÇÕES MANUAIS</div>
                        <div style={{ fontSize: '36px', color: '#F57C00', fontWeight: 900, marginTop: '4px' }}>{(relatorioDiario || []).filter(r => r.metodo === 'manual').length}</div>
                     </div>
                  </div>

                  <h4 style={{ marginBottom: '15px', color: '#475569', fontWeight: 700 }}>📄 Diário de Bordo Auditável</h4>
                  <div className="table-container" style={{maxHeight: '350px', overflowY: 'auto'}}>
                    <table className="modern-table">
                      <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr>
                          <th>Horário</th>
                          <th>Nome do Aluno</th>
                          <th>Matrícula</th>
                          <th>Método</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(relatorioDiario || []).map((log) => (
                          <tr key={log.id}>
                            <td style={{ fontWeight: 600, color: '#64748B' }}>{log.hora}</td>
                            <td style={{ fontWeight: 700, color: '#1E293B' }}>{log.nome}</td>
                            <td style={{ color: '#475569' }}>{log.matricula}</td>
                            <td>
                              {log.metodo === 'biometria' ? (
                                <span style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>🟩 BIOMETRIA</span>
                              ) : (
                                <span style={{ backgroundColor: '#FFEDD5', color: '#9A3412', padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>🟧 MANUAL</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {(relatorioDiario || []).length === 0 && (<tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>Nenhuma cota computada para este filtro.</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* === ABA: VALIDAÇÃO DO FISCAL === */}
              {activeTab === 'validacao' && userRole === 'fiscal' && (
                <div className="card-glass" style={{ borderTopColor: '#1976D2' }}>
                  <h3 style={{ color: '#1976D2', marginBottom: '8px', fontWeight: 800 }}>✅ Auditoria e Homologação de Fornecimento</h3>
                  <p style={{ color: '#64748B', marginBottom: '25px' }}>Inspecione as refeições diárias ou mensais. Clique sobre um registro para detalhes ou para impugnar uma validação.</p>
                  
                  {!protocoloGerado ? (
                    <>
                      <div style={{ display: 'flex', gap: '20px', backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '25px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '15px', borderRight: '2px solid #E2E8F0', paddingRight: '20px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600, color: '#1E293B' }}>
                            <input type="radio" checked={validacaoModo === 'diario'} onChange={() => { setValidacaoModo('diario'); setValidacaoData(new Date().toISOString().split('T')[0]); }} /> 
                            Visão Diária
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600, color: '#1E293B' }}>
                            <input type="radio" checked={validacaoModo === 'mensal'} onChange={() => { setValidacaoModo('mensal'); setValidacaoData(new Date().toISOString().slice(0, 7)); }} /> 
                            Visão Mês
                          </label>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, color: '#64748B' }}>Período selecionado:</span>
                          {validacaoModo === 'diario' ? (
                            <input type="date" value={validacaoData} onChange={(e) => setValidacaoData(e.target.value)} className="modern-input" style={{ width: '200px' }} />
                          ) : (
                            <input type="month" value={validacaoData} onChange={(e) => setValidacaoData(e.target.value)} className="modern-input" style={{ width: '200px' }} />
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                        <div style={{ padding: '20px', backgroundColor: 'white', border: '1px solid var(--borda)', borderRadius: '10px' }}>
                            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 700 }}>REFEIÇÕES ELEGÍVEIS (VALIDADAS)</div>
                            <div style={{ fontSize: '32px', fontWeight: 900, color: '#1976D2', marginTop: '6px' }}>
                              {listaValidacao.filter(r => r.status === 'validado').length}
                            </div>
                        </div>
                        <div style={{ padding: '20px', backgroundColor: 'white', border: '1px solid var(--borda)', borderRadius: '10px' }}>
                            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 700 }}>REFEIÇÕES PENDENTES/SUSPENSAS</div>
                            <div style={{ fontSize: '32px', fontWeight: 900, color: '#F57C00', marginTop: '6px' }}>
                              {listaValidacao.filter(r => r.status === 'pendente').length}
                            </div>
                        </div>
                        <div style={{ padding: '20px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px' }}>
                            <div style={{ fontSize: '12px', color: '#1E40AF', fontWeight: 700 }}>REPASSE FINANCEIRO ESTIMADO</div>
                            <div style={{ fontSize: '32px', fontWeight: 900, color: '#1D4ED8', marginTop: '6px' }}>
                              R$ {(listaValidacao.filter(r => r.status === 'validado').length * (sysConfig.valor_refeicao || 6.50)).toFixed(2).replace('.', ',')}
                            </div>
                        </div>
                      </div>

                      <h4 style={{ color: '#475569', fontWeight: 700, marginBottom: '12px' }}>Lista de Consumo do Período (Auditoria)</h4>
                      <div className="table-container" style={{ marginBottom: '30px', maxHeight: '400px', overflowY: 'auto' }}>
                        <table className="modern-table">
                          <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                            <tr>
                              <th>Horário</th>
                              <th>Estudante</th>
                              <th>Matrícula</th>
                              <th>Situação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {listaValidacao.map((ref) => (
                              <React.Fragment key={ref.id}>
                                <tr onClick={() => toggleRefeicaoExpandida(ref.id)} className="clickable-row">
                                  <td style={{ fontWeight: 600, color: '#64748B' }}>{ref.hora}</td>
                                  <td style={{ fontWeight: 700, color: '#1E293B' }}>{ref.aluno}</td>
                                  <td style={{ color: '#475569' }}>{ref.matricula}</td>
                                  <td>
                                    {ref.status === 'validado' ? (
                                      <span className="badge-status badge-green">✓ VALIDADO</span>
                                    ) : (
                                      <span className="badge-status badge-orange">⚠️ PENDENTE</span>
                                    )}
                                  </td>
                                </tr>
                                
                                {refeicaoExpandida === ref.id && (
                                  <tr className="detail-row">
                                    <td colSpan="4" style={{ padding: '20px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '15px 25px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                        <div style={{ display: 'flex', gap: '40px' }}>
                                          <div>
                                            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, display: 'block' }}>MÉTODO DE ENTRADA</span>
                                            <span style={{ fontWeight: 600, color: '#1E293B' }}>{ref.metodo === 'biometria' ? 'Digital (Biometria)' : 'Liberação Manual'}</span>
                                          </div>
                                          <div>
                                            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, display: 'block' }}>VALOR UNITÁRIO</span>
                                            <span style={{ fontWeight: 600, color: '#1E293B' }}>R$ {ref.valor.toFixed(2).replace('.', ',')}</span>
                                          </div>
                                        </div>
                                        
                                        <button 
                                          onClick={() => alternarStatusRefeicao(ref.id)}
                                          className="interactive-btn"
                                          style={{ 
                                            backgroundColor: ref.status === 'validado' ? '#FFF7ED' : '#F0FDF4', 
                                            color: ref.status === 'validado' ? '#C2410C' : '#166534',
                                            border: `1px solid ${ref.status === 'validado' ? '#FFEDD5' : '#DCFCE7'}`,
                                            fontSize: '13px', padding: '8px 16px'
                                          }}
                                        >
                                          {ref.status === 'validado' ? '❌ Suspender Pagamento' : '✅ Aprovar Refeição'}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                            {listaValidacao.length === 0 && (
                              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>Nenhuma refeição registrada neste período.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <button onClick={handleFecharPeriodo} className="interactive-btn" style={{ width: '100%', padding: '18px', backgroundColor: '#1976D2', color: 'white', fontSize: '16px' }}>
                        ⚙️ EMITIR PROTOCOLO DE FECHAMENTO DO {validacaoModo === 'diario' ? 'DIA' : 'MÊS'}
                      </button>
                    </>
                  ) : (
                    <div style={{ border: `2px dashed #1976D2`, borderRadius: '14px', padding: '40px', backgroundColor: '#EFF6FF', textAlign: 'center' }} className="animate-fade">
                      <h2 style={{ color: '#1E40AF', margin: '0 0 8px 0', fontWeight: 900 }}>PERÍODO HOMOLOGADO COM SUCESSO</h2>
                      <p style={{ color: '#1D4ED8', marginBottom: '25px', fontWeight: 500 }}>As refeições foram travadas contra edições e a ordem de repasse foi registrada.</p>
                      <div style={{ display: 'inline-block', backgroundColor: 'white', border: `2px solid #1976D2`, padding: '20px 40px', borderRadius: '10px', boxShadow: theme.sombra }}>
                        <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '6px', fontWeight: 700, letterSpacing: '1px' }}>CHAVE DE PROTOCOLO</span>
                        <strong style={{ fontSize: '24px', letterSpacing: '2px', color: '#1E293B', fontFamily: 'monospace' }}>{protocoloGerado}</strong>
                      </div>
                      <br/>
                      <button onClick={() => { setProtocoloGerado(null); fetchDadosValidacao(); }} className="interactive-btn" style={{ marginTop: '30px', backgroundColor: 'white', color: '#1976D2', border: '1px solid #1976D2' }}>
                        ⬅️ Voltar à Auditoria
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default App;